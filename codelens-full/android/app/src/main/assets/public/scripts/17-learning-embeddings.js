// ============ LEARNING EMBEDDINGS (native bridge + vector store) ============
//
// This file is the single surface for the learning semantic-memory layer.
// It owns:
//
//   1. The `state.learningHub.embeddings[id]` METADATA map (signature, api,
//      model, updatedAt, nativeSyncedAt, nativeSignature). This is persisted
//      inside the main app state blob and is cheap to (de)serialize.
//
//   2. A separate VECTOR store (`learningVectorStore`) that holds the actual
//      number arrays. Vectors are persisted to their own localStorage key
//      (`codelens_learning_vectors_v1`) so the main state blob stays small
//      and fast to parse. Vectors are the bulk of learning memory.
//
//   3. The JS surface for the native vector bridge (`getTopMatches`,
//      `upsertEmbedding`, `deleteEmbedding`) described in
//      LEARNING_NATIVE_BRIDGE.md.
//
// Contract with `scripts/01-state.js`:
//   - `ensureStateShape()` calls `migrateInlineLearningVectors(store)` after
//     it finishes normalizing `state.learningHub.embeddings`. That migrates
//     any pre-v2 embedding records that still carry a `.vector` array inline
//     into the separate vector store, then strips the array from the record.

const LEARNING_VECTOR_MIN_LENGTH = 24;
const LEARNING_VECTOR_MAX_DIMENSIONS = 256;
const LEARNING_VECTOR_PREFETCH_LIMIT = 140;
const LEARNING_VECTOR_MAX_UPDATES_PER_QUERY = 10;
const LEARNING_QUERY_EMBED_CACHE_LIMIT = 24;
const LEARNING_VECTORS_STORAGE_KEY = 'codelens_learning_vectors_v1';

const learningEmbeddingJobs = new Map();
const learningQueryEmbeddingCache = new Map();

// Vector store: id -> number[] (already truncated to LEARNING_VECTOR_MAX_DIMENSIONS).
// Loaded lazily from localStorage on first access; written back via saveLearningVectorsSoon().
const learningVectorStore = new Map();
let learningVectorStoreLoaded = false;
let learningVectorStoreDirty = false;
let learningVectorsSaveTimer = null;

function loadLearningVectorsFromStorage() {
    if (learningVectorStoreLoaded) return;
    learningVectorStoreLoaded = true;
    try {
        const raw = localStorage.getItem(LEARNING_VECTORS_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return;
        Object.keys(parsed).forEach(id => {
            const vec = parsed[id];
            if (!Array.isArray(vec) || vec.length < LEARNING_VECTOR_MIN_LENGTH) return;
            const cleaned = vec
                .map(value => Number(value))
                .filter(value => Number.isFinite(value))
                .slice(0, LEARNING_VECTOR_MAX_DIMENSIONS);
            if (cleaned.length >= LEARNING_VECTOR_MIN_LENGTH) {
                learningVectorStore.set(String(id), cleaned);
            }
        });
    } catch (error) {
        console.warn('[learning-vector] failed to load vectors from storage:', error?.message || error);
    }
}

function saveLearningVectorsSoon() {
    learningVectorStoreDirty = true;
    if (learningVectorsSaveTimer) return;
    learningVectorsSaveTimer = setTimeout(() => {
        learningVectorsSaveTimer = null;
        if (!learningVectorStoreDirty) return;
        learningVectorStoreDirty = false;
        try {
            const serializable = {};
            learningVectorStore.forEach((vec, id) => { serializable[id] = vec; });
            localStorage.setItem(LEARNING_VECTORS_STORAGE_KEY, JSON.stringify(serializable));
        } catch (error) {
            console.warn('[learning-vector] failed to persist vectors:', error?.message || error);
        }
    }, 400);
}

function getLearningVector(id = '') {
    loadLearningVectorsFromStorage();
    const key = String(id || '').trim();
    if (!key) return null;
    return learningVectorStore.get(key) || null;
}

function setLearningVector(id = '', vector = []) {
    loadLearningVectorsFromStorage();
    const key = String(id || '').trim();
    if (!key) return null;
    if (!Array.isArray(vector)) return null;
    const cleaned = vector
        .map(value => Number(value))
        .filter(value => Number.isFinite(value))
        .slice(0, LEARNING_VECTOR_MAX_DIMENSIONS);
    if (cleaned.length < LEARNING_VECTOR_MIN_LENGTH) return null;
    learningVectorStore.set(key, cleaned);
    saveLearningVectorsSoon();
    return cleaned;
}

function deleteLearningVector(id = '') {
    loadLearningVectorsFromStorage();
    const key = String(id || '').trim();
    if (!key) return;
    if (learningVectorStore.delete(key)) saveLearningVectorsSoon();
}

// Called from ensureStateShape() in 01-state.js after it normalizes the
// embedding metadata map. Pre-v2 persisted states stored the vector INSIDE
// the embedding record; we move any such vectors into the dedicated store
// and strip them from the metadata record so the main state blob stays lean.
function migrateInlineLearningVectors(embeddingsMetadataMap = {}) {
    if (!embeddingsMetadataMap || typeof embeddingsMetadataMap !== 'object') return;
    loadLearningVectorsFromStorage();
    let migrated = false;
    Object.keys(embeddingsMetadataMap).forEach(id => {
        const record = embeddingsMetadataMap[id];
        if (!record || typeof record !== 'object') return;
        const inlineVector = record.vector;
        if (Array.isArray(inlineVector) && inlineVector.length >= LEARNING_VECTOR_MIN_LENGTH) {
            if (!learningVectorStore.has(id)) {
                const cleaned = inlineVector
                    .map(value => Number(value))
                    .filter(value => Number.isFinite(value))
                    .slice(0, LEARNING_VECTOR_MAX_DIMENSIONS);
                if (cleaned.length >= LEARNING_VECTOR_MIN_LENGTH) {
                    learningVectorStore.set(id, cleaned);
                    migrated = true;
                }
            }
        }
        // Always strip — whether migrated or the inline vector was bad.
        if ('vector' in record) {
            delete record.vector;
        }
    });
    if (migrated) saveLearningVectorsSoon();
}

function getLearningEmbeddingsStore() {
    ensureStateShape();
    if (!state.learningHub.embeddings || typeof state.learningHub.embeddings !== 'object') {
        state.learningHub.embeddings = {};
    }
    return state.learningHub.embeddings;
}

function buildLearningConceptSignature(concept = {}) {
    const parts = [
        cleanLearningText(concept.title || ''),
        cleanLearningText(concept.summary || concept.principle || ''),
        cleanLearningText(concept.coreConcept || ''),
        cleanLearningText(concept.architecturalPattern || ''),
        cleanLearningText(concept.programmingParadigm || ''),
        uniqueLearningStrings(concept.languageSyntax || []).join(','),
        uniqueLearningStrings(concept.keywords || []).join(',')
    ];
    return parts.join('|').toLowerCase();
}

function buildLearningConceptEmbeddingText(concept = {}) {
    const syntax = uniqueLearningStrings(concept.languageSyntax || []).slice(0, 10).join(', ');
    const keywords = uniqueLearningStrings(concept.keywords || []).slice(0, 12).join(', ');
    return [
        `Title: ${concept.title || 'Concept'}`,
        `Summary: ${concept.summary || concept.principle || ''}`,
        `Core concept: ${concept.coreConcept || ''}`,
        `Architectural pattern: ${concept.architecturalPattern || ''}`,
        `Programming paradigm: ${concept.programmingParadigm || ''}`,
        `Language syntax: ${syntax || 'n/a'}`,
        `Keywords: ${keywords || 'n/a'}`
    ].join('\n');
}

function pruneLearningEmbeddingsToKnownConcepts(concepts = []) {
    const store = getLearningEmbeddingsStore();
    const validIds = new Set(
        (Array.isArray(concepts) ? concepts : [])
            .map(item => String(item?.id || ''))
            .filter(Boolean)
    );
    Object.keys(store).forEach(conceptId => {
        if (!validIds.has(conceptId)) {
            deleteEmbedding({ id: conceptId });
            delete store[conceptId];
            deleteLearningVector(conceptId);
        }
    });
}

function getLearningCosineSimilarity(leftVector = [], rightVector = []) {
    if (!Array.isArray(leftVector) || !Array.isArray(rightVector)) return 0;
    const len = Math.min(leftVector.length, rightVector.length);
    if (len < LEARNING_VECTOR_MIN_LENGTH) return 0;

    let dot = 0;
    let normLeft = 0;
    let normRight = 0;
    for (let i = 0; i < len; i++) {
        const a = Number(leftVector[i]);
        const b = Number(rightVector[i]);
        if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
        dot += a * b;
        normLeft += a * a;
        normRight += b * b;
    }

    if (normLeft <= 0 || normRight <= 0) return 0;
    return dot / (Math.sqrt(normLeft) * Math.sqrt(normRight));
}

function resolveLearningPayloadObject(payload = null) {
    if (!payload) return null;
    if (typeof payload === 'object') return payload;

    const rawText = String(payload || '').trim();
    if (!rawText) return null;

    if (typeof parseAIPayload === 'function') {
        const parsed = parseAIPayload(rawText);
        if (parsed && typeof parsed === 'object') return parsed;
    }

    try {
        const parsed = JSON.parse(rawText);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) {
        return null;
    }
}

function getNativeVectorBridge() {
    const bridge = window?.ObjectBoxBridge;
    if (!bridge || typeof bridge !== 'object') return null;
    if (typeof bridge.getTopMatches !== 'function') return null;
    if (typeof bridge.upsertEmbedding !== 'function') return null;
    if (typeof bridge.deleteEmbedding !== 'function') return null;
    return bridge;
}

function callNativeVectorBridge(method = '', payload = {}) {
    const bridge = getNativeVectorBridge();
    if (!bridge || typeof bridge[method] !== 'function') return null;

    try {
        const raw = bridge[method](JSON.stringify(payload || {}));
        return resolveLearningPayloadObject(raw);
    } catch (error) {
        console.warn('[learning-vector] native bridge call failed:', error?.message || error);
        return null;
    }
}

// JS interface: native semantic retrieval
function getTopMatches(payload = {}) {
    return callNativeVectorBridge('getTopMatches', payload);
}

// JS interface: native vector upsert
function upsertEmbedding(payload = {}) {
    return callNativeVectorBridge('upsertEmbedding', payload);
}

// JS interface: native vector delete
function deleteEmbedding(payload = {}) {
    return callNativeVectorBridge('deleteEmbedding', payload);
}

function ensureNativeEmbeddingSynced(conceptId = '', embeddingRecord = null) {
    const id = String(conceptId || '').trim();
    if (!id || !embeddingRecord || typeof embeddingRecord !== 'object') return false;
    if (!getNativeVectorBridge()) return false;

    // Vectors now live in the separate vector store, not on the metadata record.
    const storedVector = getLearningVector(id);
    const vector = Array.isArray(storedVector)
        ? storedVector.slice(0, LEARNING_VECTOR_MAX_DIMENSIONS)
        : [];
    if (vector.length < LEARNING_VECTOR_MIN_LENGTH) return false;

    const currentSignature = String(embeddingRecord.signature || '');
    const alreadySynced = Boolean(
        embeddingRecord.nativeSyncedAt &&
        String(embeddingRecord.nativeSignature || '') === currentSignature
    );
    if (alreadySynced) return false;

    const response = upsertEmbedding({
        id,
        vector,
        model: String(embeddingRecord.model || ''),
        api: String(embeddingRecord.api || ''),
        signature: currentSignature,
        updatedAt: String(embeddingRecord.updatedAt || new Date().toISOString())
    });

    if (!response || response.ok === false) return false;
    embeddingRecord.nativeSyncedAt = new Date().toISOString();
    embeddingRecord.nativeSignature = currentSignature;
    return true;
}

function getLearningSemanticScoresFromNativeBridge(queryVector = [], concepts = []) {
    if (!getNativeVectorBridge()) return null;

    const conceptIds = (Array.isArray(concepts) ? concepts : [])
        .map(item => String(item?.id || '').trim())
        .filter(Boolean);
    if (!conceptIds.length) return {};

    const parsed = getTopMatches({
        vector: queryVector.slice(0, LEARNING_VECTOR_MAX_DIMENSIONS),
        ids: conceptIds,
        limit: conceptIds.length
    });
    if (!parsed || parsed.ok === false) return null;

    const matches = Array.isArray(parsed?.matches) ? parsed.matches : [];
    if (!matches.length) return {};

    const scoreMap = {};
    matches.forEach(match => {
        const id = String(match?.id || match?.conceptId || '').trim();
        if (!id) return;

        const rawScore = Number(match?.score ?? match?.similarity ?? match?.cosine ?? 0);
        if (!Number.isFinite(rawScore)) return;
        const normalized = rawScore >= 0 && rawScore <= 1
            ? rawScore
            : ((rawScore + 1) / 2);
        scoreMap[id] = Math.max(0, Math.min(1, normalized));
    });
    return scoreMap;
}

function computeLearningSemanticScoresLocally(queryVector = [], concepts = []) {
    const scoreMap = {};
    (Array.isArray(concepts) ? concepts : []).forEach(concept => {
        const conceptId = String(concept?.id || '').trim();
        if (!conceptId) return;

        // Vectors live in the separate vector store now — no need to consult
        // the metadata map for the number array.
        const vector = getLearningVector(conceptId);
        if (!Array.isArray(vector) || vector.length < LEARNING_VECTOR_MIN_LENGTH) return;

        const cosine = getLearningCosineSimilarity(queryVector, vector);
        const normalized = Math.max(0, (cosine + 1) / 2);
        scoreMap[conceptId] = normalized;
    });

    return scoreMap;
}

function getLearningSemanticScoreMap(queryVector = [], concepts = []) {
    if (!Array.isArray(queryVector) || queryVector.length < LEARNING_VECTOR_MIN_LENGTH) return null;
    const nativeMap = getLearningSemanticScoresFromNativeBridge(queryVector, concepts);
    if (nativeMap && typeof nativeMap === 'object' && Object.keys(nativeMap).length) return nativeMap;
    return computeLearningSemanticScoresLocally(queryVector, concepts);
}

function getLearningQueryEmbeddingCacheKey(queryText = '') {
    return cleanLearningText(queryText || '').toLowerCase().slice(0, 1800);
}

function getLearningQueryEmbeddingFromCache(queryText = '') {
    const key = getLearningQueryEmbeddingCacheKey(queryText);
    if (!key) return null;
    return learningQueryEmbeddingCache.get(key) || null;
}

function setLearningQueryEmbeddingCache(queryText = '', embeddingPayload = null) {
    const key = getLearningQueryEmbeddingCacheKey(queryText);
    if (!key || !embeddingPayload?.vector) return;

    if (learningQueryEmbeddingCache.size >= LEARNING_QUERY_EMBED_CACHE_LIMIT) {
        const oldestKey = learningQueryEmbeddingCache.keys().next().value;
        if (oldestKey) learningQueryEmbeddingCache.delete(oldestKey);
    }
    learningQueryEmbeddingCache.set(key, embeddingPayload);
}

async function embedTextForLearning(queryText = '', options = {}) {
    const text = cleanLearningText(queryText || '');
    if (!text) return null;
    if (typeof getBestEmbeddingForText !== 'function') return null;

    try {
        return await getBestEmbeddingForText(text, {
            provider: options.provider || ''
        });
    } catch (_) {
        return null;
    }
}

async function getLearningQueryEmbeddingPayload(queryText = '', options = {}) {
    const cached = getLearningQueryEmbeddingFromCache(queryText);
    if (cached?.vector?.length) return cached;

    const embedded = await embedTextForLearning(queryText, options);
    if (!embedded?.vector?.length) return null;

    setLearningQueryEmbeddingCache(queryText, embedded);
    return embedded;
}

async function ensureLearningEmbeddingForConcept(concept = {}, options = {}) {
    const conceptId = String(concept?.id || '').trim();
    if (!conceptId) return null;

    const signature = buildLearningConceptSignature(concept);
    const store = getLearningEmbeddingsStore();
    const existing = store[conceptId];
    const existingVector = getLearningVector(conceptId);
    const hasUsableExisting = Boolean(
        existing &&
        existing.signature === signature &&
        Array.isArray(existingVector) &&
        existingVector.length >= LEARNING_VECTOR_MIN_LENGTH
    );
    if (hasUsableExisting && !options.force) {
        ensureNativeEmbeddingSynced(conceptId, existing);
        return existing;
    }

    const jobKey = `${conceptId}:${signature}`;
    if (learningEmbeddingJobs.has(jobKey)) {
        return learningEmbeddingJobs.get(jobKey);
    }

    const job = (async () => {
        const payload = await embedTextForLearning(buildLearningConceptEmbeddingText(concept), options);
        if (!payload?.vector || payload.vector.length < LEARNING_VECTOR_MIN_LENGTH) return null;

        setLearningVector(conceptId, payload.vector);
        store[conceptId] = {
            model: String(payload.model || ''),
            api: String(payload.api || ''),
            updatedAt: new Date().toISOString(),
            signature,
            nativeSyncedAt: '',
            nativeSignature: ''
        };
        ensureNativeEmbeddingSynced(conceptId, store[conceptId]);
        return store[conceptId];
    })().catch(() => null).finally(() => {
        learningEmbeddingJobs.delete(jobKey);
    });

    learningEmbeddingJobs.set(jobKey, job);
    return job;
}

async function syncLearningConceptEmbeddings(concepts = [], options = {}) {
    const list = Array.isArray(concepts) ? concepts : [];
    if (!list.length) return false;

    const maxToUpdate = Math.max(1, Number(options.maxToUpdate) || LEARNING_VECTOR_MAX_UPDATES_PER_QUERY);
    let updated = false;
    let processed = 0;

    for (const concept of list) {
        if (processed >= maxToUpdate) break;
        const conceptId = String(concept?.id || '').trim();
        if (!conceptId) continue;

        const store = getLearningEmbeddingsStore();
        const signature = buildLearningConceptSignature(concept);
        const existing = store[conceptId];
        const existingVector = getLearningVector(conceptId);
        const needsUpdate = Boolean(
            options.force ||
            !existing ||
            existing.signature !== signature ||
            !Array.isArray(existingVector) ||
            existingVector.length < LEARNING_VECTOR_MIN_LENGTH
        );
        if (!needsUpdate) {
            if (ensureNativeEmbeddingSynced(conceptId, existing)) {
                updated = true;
            }
            continue;
        }

        processed += 1;
        const result = await ensureLearningEmbeddingForConcept(concept, options);
        if (result) updated = true;
    }

    if (updated && options.save !== false) {
        saveState();
    }
    return updated;
}
