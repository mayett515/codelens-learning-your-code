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

public class ObjectBoxBridge {
    private static final String PREFS_NAME = "codelens_learning_vectors";
    private static final String EMBEDDINGS_KEY = "embeddings_json";
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
            embedding.model = payload.optString("model", "");
            embedding.api = payload.optString("api", "");
            embedding.signature = payload.optString("signature", "");
            embedding.updatedAt = payload.optString("updatedAt", "");
            if (TextUtils.isEmpty(embedding.updatedAt)) {
                embedding.updatedAt = String.valueOf(System.currentTimeMillis());
            }

            embeddings.put(id, embedding);
            persistLocked();

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
            if (removed) persistLocked();

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

            int limit = payload.optInt("limit", 3);
            if (limit < 1) limit = 1;
            if (limit > 200) limit = 200;

            Map<String, Boolean> idFilter = parseIdFilter(payload.optJSONArray("ids"));

            ensureLoadedLocked();
            List<MatchResult> matches = new ArrayList<>();
            for (Map.Entry<String, StoredEmbedding> entry : embeddings.entrySet()) {
                String id = entry.getKey();
                if (!idFilter.isEmpty() && !idFilter.containsKey(id)) continue;

                StoredEmbedding embedding = entry.getValue();
                if (embedding == null || embedding.vector == null) continue;

                double cosine = cosineSimilarity(queryVector, embedding.vector);
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

    private double cosineSimilarity(double[] left, double[] right) {
        if (left == null || right == null) return 0;

        int len = Math.min(left.length, right.length);
        if (len < MIN_VECTOR_LENGTH) return 0;

        double dot = 0;
        double normLeft = 0;
        double normRight = 0;
        for (int i = 0; i < len; i++) {
            double a = left[i];
            double b = right[i];
            if (!Double.isFinite(a) || !Double.isFinite(b)) continue;
            dot += a * b;
            normLeft += a * a;
            normRight += b * b;
        }

        if (normLeft <= 0 || normRight <= 0) return 0;
        return dot / (Math.sqrt(normLeft) * Math.sqrt(normRight));
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

        String raw = prefs.getString(EMBEDDINGS_KEY, "{}");
        if (TextUtils.isEmpty(raw)) return;

        try {
            JSONObject root = new JSONObject(raw);
            Iterator<String> keys = root.keys();
            while (keys.hasNext()) {
                String id = sanitizeId(keys.next());
                if (TextUtils.isEmpty(id)) continue;

                JSONObject item = root.optJSONObject(id);
                if (item == null) continue;

                StoredEmbedding embedding = StoredEmbedding.fromJson(id, item, this);
                if (embedding == null || embedding.vector.length < MIN_VECTOR_LENGTH) continue;
                embeddings.put(id, embedding);
            }
        } catch (Exception ignored) {
            embeddings.clear();
        }
    }

    private void persistLocked() {
        try {
            JSONObject root = new JSONObject();
            for (Map.Entry<String, StoredEmbedding> entry : embeddings.entrySet()) {
                if (entry.getValue() == null) continue;
                root.put(entry.getKey(), entry.getValue().toJson());
            }
            prefs.edit().putString(EMBEDDINGS_KEY, root.toString()).apply();
        } catch (Exception ignored) {
            // Best effort persistence.
        }
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
        String model = "";
        String api = "";
        String signature = "";
        String updatedAt = "";

        JSONObject toJson() throws JSONException {
            JSONObject obj = new JSONObject();
            obj.put("model", model);
            obj.put("api", api);
            obj.put("signature", signature);
            obj.put("updatedAt", updatedAt);

            JSONArray vectorArray = new JSONArray();
            for (double value : vector) {
                vectorArray.put(value);
            }
            obj.put("vector", vectorArray);
            return obj;
        }

        static StoredEmbedding fromJson(String id, JSONObject obj, ObjectBoxBridge parent) {
            if (obj == null || parent == null) return null;

            StoredEmbedding result = new StoredEmbedding();
            result.id = id;
            result.vector = parent.parseVector(obj.optJSONArray("vector"));
            result.model = obj.optString("model", "");
            result.api = obj.optString("api", "");
            result.signature = obj.optString("signature", "");
            result.updatedAt = obj.optString("updatedAt", "");
            return result;
        }
    }
}
