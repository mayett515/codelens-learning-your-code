package com.codelens.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.text.TextUtils;
import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

/**
 * JS-exposed native vector store for learning embeddings.
 *
 * Contract (see codelens-full/LEARNING_NATIVE_BRIDGE.md):
 *   - upsertEmbedding({ id, vector, model, api, signature, updatedAt })
 *   - deleteEmbedding({ id })
 *   - getTopMatches({ vector, ids, limit }) -> { ok, matches: [{id, score, cosine}] }
 *
 * Storage format (SharedPreferences file "codelens_learning_vectors"):
 *   - One entry per embedding under key prefix "vec.<id>", JSON-encoded:
 *       { "v": [..floats..], "m": model, "a": api, "s": signature, "u": updatedAt }
 *   - One-shot legacy import: the previous implementation stored every vector
 *     inside a single "embeddings_json" blob. On first load we migrate that
 *     blob to per-id entries and then clear the legacy key. This keeps the
 *     JS contract unchanged while making upserts and deletes write a single
 *     row instead of rewriting the entire map.
 *
 * In-memory model: each StoredEmbedding precomputes its L2 norm so cosine
 * similarity in getTopMatches is a single pass over the query vector with a
 * cached divisor per candidate — O(k*d) with tiny constants instead of
 * recomputing a square root per candidate per query.
 */
public class ObjectBoxBridge {
    private static final String PREFS_NAME = "codelens_learning_vectors";
    private static final String LEGACY_BLOB_KEY = "embeddings_json";
    private static final String PER_ID_KEY_PREFIX = "vec.";
    private static final int MAX_VECTOR_LENGTH = 256;
    private static final int MIN_VECTOR_LENGTH = 24;

    private final SharedPreferences prefs;
    private final Map<String, StoredEmbedding> embeddings = new HashMap<>();
    private boolean isLoaded = false;

    public ObjectBoxBridge(Context context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    @JavascriptInterface
    public synchronized String upsertEmbedding(String payloadJson) {
        try {
            JSONObject payload = parsePayloadObject(payloadJson);
            String id = sanitizeId(payload.optString("id", ""));
            if (TextUtils.isEmpty(id)) return errorResponse("missing_id");

            double[] vector = parseVector(payload.optJSONArray("vector"));
            if (vector.length < MIN_VECTOR_LENGTH) return errorResponse("invalid_vector");

            ensureLoadedLocked();

            StoredEmbedding embedding = new StoredEmbedding();
            embedding.id = id;
            embedding.vector = vector;
            embedding.norm = computeNorm(vector);
            embedding.model = payload.optString("model", "");
            embedding.api = payload.optString("api", "");
            embedding.signature = payload.optString("signature", "");
            embedding.updatedAt = payload.optString("updatedAt", "");
            if (TextUtils.isEmpty(embedding.updatedAt)) {
                embedding.updatedAt = String.valueOf(System.currentTimeMillis());
            }

            embeddings.put(id, embedding);
            persistSingleLocked(embedding);

            JSONObject response = new JSONObject();
            response.put("ok", true);
            response.put("id", id);
            response.put("dimensions", vector.length);
            response.put("updatedAt", embedding.updatedAt);
            return response.toString();
        } catch (Exception e) {
            return errorResponse("upsert_failed");
        }
    }

    @JavascriptInterface
    public synchronized String deleteEmbedding(String payloadJson) {
        try {
            JSONObject payload = parsePayloadObject(payloadJson);
            String id = sanitizeId(payload.optString("id", ""));
            if (TextUtils.isEmpty(id)) return errorResponse("missing_id");

            ensureLoadedLocked();
            boolean removed = embeddings.remove(id) != null;
            if (removed) deleteSingleLocked(id);

            JSONObject response = new JSONObject();
            response.put("ok", true);
            response.put("id", id);
            response.put("removed", removed);
            return response.toString();
        } catch (Exception e) {
            return errorResponse("delete_failed");
        }
    }

    @JavascriptInterface
    public synchronized String getTopMatches(String payloadJson) {
        try {
            JSONObject payload = parsePayloadObject(payloadJson);
            double[] queryVector = parseVector(payload.optJSONArray("vector"));
            if (queryVector.length < MIN_VECTOR_LENGTH) return errorResponse("invalid_query_vector");
            double queryNorm = computeNorm(queryVector);
            if (queryNorm <= 0) return errorResponse("invalid_query_vector");

            int limit = payload.optInt("limit", 3);
            if (limit < 1) limit = 1;
            if (limit > 200) limit = 200;

            Map<String, Boolean> idFilter = parseIdFilter(payload.optJSONArray("ids"));

            ensureLoadedLocked();
            List<MatchResult> matches = new ArrayList<>(embeddings.size());
            for (Map.Entry<String, StoredEmbedding> entry : embeddings.entrySet()) {
                String id = entry.getKey();
                if (!idFilter.isEmpty() && !idFilter.containsKey(id)) continue;

                StoredEmbedding embedding = entry.getValue();
                if (embedding == null || embedding.vector == null) continue;
                if (embedding.norm <= 0) continue;

                double cosine = cosineSimilarityWithCachedNorms(
                    queryVector, queryNorm, embedding.vector, embedding.norm
                );
                if (!Double.isFinite(cosine)) continue;

                double score = clamp01((cosine + 1.0) / 2.0);
                matches.add(new MatchResult(id, score, cosine));
            }

            matches.sort((left, right) -> Double.compare(right.score, left.score));

            JSONArray responseMatches = new JSONArray();
            int take = Math.min(limit, matches.size());
            for (int i = 0; i < take; i++) {
                MatchResult item = matches.get(i);
                JSONObject row = new JSONObject();
                row.put("id", item.id);
                row.put("score", item.score);
                row.put("cosine", item.cosine);
                responseMatches.put(row);
            }

            JSONObject response = new JSONObject();
            response.put("ok", true);
            response.put("matches", responseMatches);
            return response.toString();
        } catch (Exception e) {
            return errorResponse("match_failed");
        }
    }

    private JSONObject parsePayloadObject(String payloadJson) throws JSONException {
        String raw = String.valueOf(payloadJson == null ? "" : payloadJson).trim();
        if (TextUtils.isEmpty(raw)) return new JSONObject();

        if (raw.startsWith("{")) return new JSONObject(raw);

        // Accept raw id payloads for delete convenience.
        JSONObject payload = new JSONObject();
        payload.put("id", sanitizeId(raw));
        return payload;
    }

    private String sanitizeId(String value) {
        String id = String.valueOf(value == null ? "" : value).trim();
        if (id.startsWith("\"") && id.endsWith("\"") && id.length() > 1) {
            id = id.substring(1, id.length() - 1).trim();
        }
        return id;
    }

    private double[] parseVector(JSONArray array) {
        if (array == null) return new double[0];

        int maxLen = Math.min(MAX_VECTOR_LENGTH, array.length());
        double[] buffer = new double[maxLen];
        int count = 0;
        for (int i = 0; i < maxLen; i++) {
            double value = parseFiniteDouble(array.opt(i));
            if (!Double.isFinite(value)) continue;
            buffer[count++] = value;
        }
        if (count == 0) return new double[0];

        double[] vector = new double[count];
        System.arraycopy(buffer, 0, vector, 0, count);
        return vector;
    }

    private double parseFiniteDouble(Object value) {
        if (value == null) return Double.NaN;
        if (value instanceof Number) return ((Number) value).doubleValue();
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (Exception ignored) {
            return Double.NaN;
        }
    }

    private Map<String, Boolean> parseIdFilter(JSONArray ids) {
        Map<String, Boolean> filter = new HashMap<>();
        if (ids == null) return filter;

        int limit = Math.min(ids.length(), 5000);
        for (int i = 0; i < limit; i++) {
            String id = sanitizeId(String.valueOf(ids.opt(i)));
            if (TextUtils.isEmpty(id)) continue;
            filter.put(id, true);
        }
        return filter;
    }

    private double computeNorm(double[] vector) {
        if (vector == null || vector.length == 0) return 0;
        double sumSq = 0;
        for (double v : vector) {
            if (!Double.isFinite(v)) continue;
            sumSq += v * v;
        }
        if (sumSq <= 0) return 0;
        return Math.sqrt(sumSq);
    }

    private double cosineSimilarityWithCachedNorms(
        double[] left, double leftNorm,
        double[] right, double rightNorm
    ) {
        if (left == null || right == null) return 0;
        if (leftNorm <= 0 || rightNorm <= 0) return 0;

        int len = Math.min(left.length, right.length);
        if (len < MIN_VECTOR_LENGTH) return 0;

        double dot = 0;
        for (int i = 0; i < len; i++) {
            double a = left[i];
            double b = right[i];
            if (!Double.isFinite(a) || !Double.isFinite(b)) continue;
            dot += a * b;
        }

        return dot / (leftNorm * rightNorm);
    }

    private double clamp01(double value) {
        if (!Double.isFinite(value)) return 0;
        if (value <= 0) return 0;
        if (value >= 1) return 1;
        return value;
    }

    private void ensureLoadedLocked() {
        if (isLoaded) return;
        isLoaded = true;

        // One-shot legacy import: move the old single-blob format to per-id rows.
        migrateLegacyBlobLocked();

        // Fast path: iterate all prefs entries, pick up the vec.* rows.
        Map<String, ?> all = prefs.getAll();
        if (all == null || all.isEmpty()) return;

        for (Map.Entry<String, ?> entry : all.entrySet()) {
            String key = entry.getKey();
            if (key == null || !key.startsWith(PER_ID_KEY_PREFIX)) continue;

            String id = sanitizeId(key.substring(PER_ID_KEY_PREFIX.length()));
            if (TextUtils.isEmpty(id)) continue;

            Object value = entry.getValue();
            if (!(value instanceof String)) continue;
            String raw = (String) value;
            if (TextUtils.isEmpty(raw)) continue;

            try {
                JSONObject item = new JSONObject(raw);
                StoredEmbedding embedding = StoredEmbedding.fromJson(id, item, this);
                if (embedding == null || embedding.vector.length < MIN_VECTOR_LENGTH) continue;
                embedding.norm = computeNorm(embedding.vector);
                if (embedding.norm <= 0) continue;
                embeddings.put(id, embedding);
            } catch (Exception ignored) {
                // Skip unreadable rows — don't corrupt the whole store.
            }
        }
    }

    private void migrateLegacyBlobLocked() {
        String legacy = prefs.getString(LEGACY_BLOB_KEY, "");
        if (TextUtils.isEmpty(legacy)) return;

        try {
            JSONObject root = new JSONObject(legacy);
            Iterator<String> keys = root.keys();
            SharedPreferences.Editor editor = prefs.edit();
            while (keys.hasNext()) {
                String id = sanitizeId(keys.next());
                if (TextUtils.isEmpty(id)) continue;
                JSONObject item = root.optJSONObject(id);
                if (item == null) continue;

                StoredEmbedding e = StoredEmbedding.fromJson(id, item, this);
                if (e == null || e.vector.length < MIN_VECTOR_LENGTH) continue;
                editor.putString(PER_ID_KEY_PREFIX + id, e.toJson().toString());
            }
            editor.remove(LEGACY_BLOB_KEY);
            editor.apply();
        } catch (Exception ignored) {
            // If legacy blob is corrupt, drop it rather than retry forever.
            prefs.edit().remove(LEGACY_BLOB_KEY).apply();
        }
    }

    private void persistSingleLocked(StoredEmbedding embedding) {
        if (embedding == null || TextUtils.isEmpty(embedding.id)) return;
        try {
            prefs.edit()
                .putString(PER_ID_KEY_PREFIX + embedding.id, embedding.toJson().toString())
                .apply();
        } catch (Exception ignored) {
            // Best effort persistence.
        }
    }

    private void deleteSingleLocked(String id) {
        if (TextUtils.isEmpty(id)) return;
        prefs.edit().remove(PER_ID_KEY_PREFIX + id).apply();
    }

    private String errorResponse(String code) {
        try {
            JSONObject response = new JSONObject();
            response.put("ok", false);
            response.put("error", code);
            return response.toString();
        } catch (JSONException ignored) {
            return "{\"ok\":false}";
        }
    }

    private static class MatchResult {
        final String id;
        final double score;
        final double cosine;

        MatchResult(String id, double score, double cosine) {
            this.id = id;
            this.score = score;
            this.cosine = cosine;
        }
    }

    private static class StoredEmbedding {
        String id = "";
        double[] vector = new double[0];
        double norm = 0;
        String model = "";
        String api = "";
        String signature = "";
        String updatedAt = "";

        JSONObject toJson() throws JSONException {
            JSONObject obj = new JSONObject();
            // Short keys keep per-row prefs entries compact.
            obj.put("m", model);
            obj.put("a", api);
            obj.put("s", signature);
            obj.put("u", updatedAt);

            JSONArray vectorArray = new JSONArray();
            for (double value : vector) {
                vectorArray.put(value);
            }
            obj.put("v", vectorArray);
            return obj;
        }

        static StoredEmbedding fromJson(String id, JSONObject obj, ObjectBoxBridge parent) {
            if (obj == null || parent == null) return null;

            StoredEmbedding result = new StoredEmbedding();
            result.id = id;
            // Accept both the new short-key format and the legacy long-key
            // format so migrations can reuse this parser.
            JSONArray vectorArray = obj.optJSONArray("v");
            if (vectorArray == null) vectorArray = obj.optJSONArray("vector");
            result.vector = parent.parseVector(vectorArray);
            result.model = obj.optString("m", obj.optString("model", ""));
            result.api = obj.optString("a", obj.optString("api", ""));
            result.signature = obj.optString("s", obj.optString("signature", ""));
            result.updatedAt = obj.optString("u", obj.optString("updatedAt", ""));
            return result;
        }
    }
}
