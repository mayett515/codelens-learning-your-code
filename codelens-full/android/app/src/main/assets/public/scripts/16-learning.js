// ============ LEARNING HUB ============
function getTodayDateKey() {
    return new Date().toISOString().slice(0, 10);
}

function toDateKey(value = '') {
    const raw = String(value || '').trim();
    if (!raw) return getTodayDateKey();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return getTodayDateKey();
    return parsed.toISOString().slice(0, 10);
}

function cleanLearningText(value = '') {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function truncateLearningText(value = '', maxLen = 180) {
    const text = cleanLearningText(value);
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return `${text.slice(0, Math.max(0, maxLen - 3))}...`;
}

function normalizeNullableLearningText(value = '') {
    if (value === null || value === undefined) return null;
    const text = cleanLearningText(value);
    return text || null;
}

function createLearningId(prefix = 'learn') {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6).toString(16)}`;
}

function deepCloneSimple(value) {
    try {
        return JSON.parse(JSON.stringify(value));
    } catch (_) {
        return null;
    }
}

function tokenizeLearningText(value = '') {
    const normalized = String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!normalized) return [];
    return normalized.split(' ').filter(token => token.length >= 3);
}

function uniqueLearningStrings(values = []) {
    const seen = new Set();
    const result = [];
    values.forEach(value => {
        const normalized = cleanLearningText(value).toLowerCase();
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        result.push(cleanLearningText(value));
    });
    return result;
}

function getCurrentChatContextDescriptor() {
    if (state.currentChat?.type === 'section' && state.currentProject !== null) {
        const project = state.projects[state.currentProject];
        const sectionId = state.currentChat?.id;
        const chat = project?.chats?.[sectionId];
        if (!project || !sectionId || !chat) return null;

        const titleText = cleanLearningText(document.getElementById('chat-title')?.textContent || '');
        const subtitleText = cleanLearningText(document.getElementById('chat-subtitle')?.textContent || '');
        const title = [titleText || project.name || 'Section Chat', subtitleText].filter(Boolean).join(' - ');

        return {
            scope: 'section',
            sessionKey: `section:${project.id}:${sectionId}`,
            title,
            source: {
                type: 'section',
                projectId: project.id,
                sectionId,
                fileIdx: state.currentFile
            },
            messages: Array.isArray(chat.messages) ? chat.messages : []
        };
    }

    if (state.currentChat?.type === 'general') {
        const folderId = state.currentGeneralFolder ?? state.generalChats[state.currentChat.idx]?.folderId ?? null;
        if (folderId === null || folderId === undefined) return null;

        const chatIdx = state.generalChats.findIndex(chat => chat.folderId === folderId);
        if (chatIdx < 0) return null;

        const folder = state.folders.find(item => item.id === folderId);
        const folderName = cleanLearningText(folder?.name || document.getElementById('general-chat-folder')?.textContent || 'General Chat');

        return {
            scope: 'general',
            sessionKey: `general:${folderId}`,
            title: `General - ${folderName}`,
            source: {
                type: 'general',
                folderId
            },
            messages: Array.isArray(state.generalChats[chatIdx]?.messages) ? state.generalChats[chatIdx].messages : []
        };
    }

    return null;
}

function getLearningSessionById(sessionId = '') {
    ensureStateShape();
    const id = String(sessionId || '').trim();
    if (!id) return null;
    return state.learningHub.sessions.find(session => session.id === id) || null;
}

function getLearningSessionByKey(sessionKey = '') {
    ensureStateShape();
    const key = String(sessionKey || '').trim();
    if (!key) return null;
    return state.learningHub.sessions.find(session => session.sessionKey === key) || null;
}

function getOrCreateLearningSessionForContext(context) {
    ensureStateShape();
    if (!context) return null;

    const nowIso = new Date().toISOString();
    const dateKey = toDateKey(nowIso);
    const existing = getLearningSessionByKey(context.sessionKey);
    if (existing) {
        existing.title = cleanLearningText(context.title || existing.title || 'Learning Session');
        existing.updatedAt = nowIso;
        if (!existing.createdAt) existing.createdAt = nowIso;
        if (!existing.dateKey) existing.dateKey = dateKey;
        if (!existing.source || typeof existing.source !== 'object') existing.source = deepCloneSimple(context.source) || {};
        return existing;
    }

    const session = {
        id: createLearningId('session'),
        sessionKey: String(context.sessionKey || createLearningId('key')),
        title: cleanLearningText(context.title || 'Learning Session'),
        createdAt: nowIso,
        updatedAt: nowIso,
        dateKey,
        source: deepCloneSimple(context.source) || {},
        concepts: [],
        snippets: [],
        relatedSessionIds: []
    };
    state.learningHub.sessions.push(session);
    return session;
}

function extractLearningKeywords(text = '', maxCount = 8) {
    const tokens = tokenizeLearningText(text);
    const frequency = new Map();
    const stopWords = new Set(['this', 'that', 'with', 'from', 'about', 'what', 'when', 'where', 'which', 'have', 'will', 'your', 'into', 'also', 'then', 'than', 'were', 'been', 'them', 'they', 'just', 'very', 'more', 'some', 'like', 'used', 'using', 'only', 'does', 'doesnt']);

    tokens.forEach(token => {
        if (stopWords.has(token)) return;
        frequency.set(token, (frequency.get(token) || 0) + 1);
    });

    return Array.from(frequency.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, maxCount)
        .map(entry => entry[0]);
}

const LEARNING_CONCEPT_STOP_WORDS = new Set([
    'core', 'principle', 'concept', 'concepts', 'key', 'takeaway', 'takeaways',
    'guide', 'pattern', 'patterns', 'approach', 'approaches', 'method', 'methods',
    'thing', 'things', 'topic', 'topics', 'note', 'notes', 'idea', 'ideas',
    'learn', 'learning', 'learned', 'session', 'chat', 'summary'
]);

function collectLearningConceptTokens(values = []) {
    const sourceValues = Array.isArray(values) ? values : [values];
    const set = new Set();

    sourceValues.forEach(value => {
        if (Array.isArray(value)) {
            value.forEach(item => {
                tokenizeLearningText(item || '').forEach(token => {
                    if (token.length < 3 || LEARNING_CONCEPT_STOP_WORDS.has(token)) return;
                    set.add(token);
                });
            });
            return;
        }

        tokenizeLearningText(value || '').forEach(token => {
            if (token.length < 3 || LEARNING_CONCEPT_STOP_WORDS.has(token)) return;
            set.add(token);
        });
    });

    return Array.from(set);
}

function computeLearningTokenJaccard(leftTokens = [], rightTokens = []) {
    const left = new Set(Array.isArray(leftTokens) ? leftTokens : []);
    const right = new Set(Array.isArray(rightTokens) ? rightTokens : []);
    if (!left.size || !right.size) return 0;

    let overlap = 0;
    left.forEach(token => {
        if (right.has(token)) overlap += 1;
    });

    const union = left.size + right.size - overlap;
    if (!union) return 0;
    return overlap / union;
}

function getLearningConceptSimilarity(leftConcept = {}, rightConcept = {}) {
    const leftTitle = cleanLearningText(leftConcept.title || '').toLowerCase();
    const rightTitle = cleanLearningText(rightConcept.title || '').toLowerCase();
    const leftCoreConcept = cleanLearningText(leftConcept.coreConcept || leftConcept.core_concept || '').toLowerCase();
    const rightCoreConcept = cleanLearningText(rightConcept.coreConcept || rightConcept.core_concept || '').toLowerCase();
    const leftPattern = cleanLearningText(leftConcept.architecturalPattern || leftConcept.architectural_pattern || '').toLowerCase();
    const rightPattern = cleanLearningText(rightConcept.architecturalPattern || rightConcept.architectural_pattern || '').toLowerCase();
    const leftParadigm = cleanLearningText(leftConcept.programmingParadigm || leftConcept.programming_paradigm || '').toLowerCase();
    const rightParadigm = cleanLearningText(rightConcept.programmingParadigm || rightConcept.programming_paradigm || '').toLowerCase();

    const leftTitleTokens = collectLearningConceptTokens([leftConcept.title || '']).slice(0, 6);
    const rightTitleTokens = collectLearningConceptTokens([rightConcept.title || '']).slice(0, 6);
    const leftKeywordTokens = collectLearningConceptTokens([leftConcept.keywords || [], leftConcept.languageSyntax || leftConcept.language_syntax || []]).slice(0, 12);
    const rightKeywordTokens = collectLearningConceptTokens([rightConcept.keywords || [], rightConcept.languageSyntax || rightConcept.language_syntax || []]).slice(0, 12);
    const leftCoreTokens = collectLearningConceptTokens([
        leftConcept.coreConcept || leftConcept.core_concept || '',
        leftConcept.architecturalPattern || leftConcept.architectural_pattern || '',
        leftConcept.programmingParadigm || leftConcept.programming_paradigm || ''
    ]).slice(0, 14);
    const rightCoreTokens = collectLearningConceptTokens([
        rightConcept.coreConcept || rightConcept.core_concept || '',
        rightConcept.architecturalPattern || rightConcept.architectural_pattern || '',
        rightConcept.programmingParadigm || rightConcept.programming_paradigm || ''
    ]).slice(0, 14);
    const leftAllTokens = collectLearningConceptTokens([
        leftConcept.title || '',
        leftConcept.principle || '',
        leftConcept.summary || '',
        leftConcept.coreConcept || leftConcept.core_concept || '',
        leftConcept.architecturalPattern || leftConcept.architectural_pattern || '',
        leftConcept.programmingParadigm || leftConcept.programming_paradigm || '',
        leftConcept.languageSyntax || leftConcept.language_syntax || [],
        leftConcept.keywords || []
    ]).slice(0, 30);
    const rightAllTokens = collectLearningConceptTokens([
        rightConcept.title || '',
        rightConcept.principle || '',
        rightConcept.summary || '',
        rightConcept.coreConcept || rightConcept.core_concept || '',
        rightConcept.architecturalPattern || rightConcept.architectural_pattern || '',
        rightConcept.programmingParadigm || rightConcept.programming_paradigm || '',
        rightConcept.languageSyntax || rightConcept.language_syntax || [],
        rightConcept.keywords || []
    ]).slice(0, 30);

    const exactTitleMatch = Boolean(leftTitle && rightTitle && leftTitle === rightTitle);
    const inclusiveTitleMatch = Boolean(
        leftTitle && rightTitle &&
        leftTitle.length >= 8 &&
        rightTitle.length >= 8 &&
        (leftTitle.includes(rightTitle) || rightTitle.includes(leftTitle))
    );
    const exactCoreMatch = Boolean(leftCoreConcept && rightCoreConcept && leftCoreConcept === rightCoreConcept);
    const exactPatternMatch = Boolean(leftPattern && rightPattern && leftPattern === rightPattern);
    const exactParadigmMatch = Boolean(leftParadigm && rightParadigm && leftParadigm === rightParadigm);

    const titleScore = computeLearningTokenJaccard(leftTitleTokens, rightTitleTokens);
    const keywordScore = computeLearningTokenJaccard(leftKeywordTokens, rightKeywordTokens);
    const coreScore = computeLearningTokenJaccard(leftCoreTokens, rightCoreTokens);
    const allScore = computeLearningTokenJaccard(leftAllTokens, rightAllTokens);

    let score = (titleScore * 0.35) + (keywordScore * 0.14) + (coreScore * 0.36) + (allScore * 0.15);
    if (exactTitleMatch) score = Math.max(score, 0.86);
    if (inclusiveTitleMatch) score = Math.max(score, 0.74);
    if (exactCoreMatch) score = Math.max(score, 0.84);
    if (exactPatternMatch) score = Math.max(score, 0.8);
    if (exactParadigmMatch) score = Math.max(score, 0.76);
    return clampLearning01(score);
}

function chooseMoreSpecificLearningPrinciple(existingValue = '', nextValue = '') {
    const existing = cleanLearningText(existingValue || '');
    const incoming = cleanLearningText(nextValue || '');
    if (!existing) return incoming;
    if (!incoming) return existing;
    if (existing.toLowerCase() === incoming.toLowerCase()) return existing;

    const similarity = computeLearningTokenJaccard(
        collectLearningConceptTokens([existing]),
        collectLearningConceptTokens([incoming])
    );
    if (similarity >= 0.7) {
        return incoming.length > existing.length ? incoming : existing;
    }
    return existing;
}

function findBestLearningConceptMatch(candidateConcept = {}, options = {}) {
    const minScore = clampLearning01(options.minScore ?? 0.62);
    const excludeSessionId = String(options.excludeSessionId || '');
    let bestMatch = null;

    state.learningHub.sessions.forEach(session => {
        if (!session || !Array.isArray(session.concepts)) return;
        if (excludeSessionId && session.id === excludeSessionId) return;

        session.concepts.forEach(concept => {
            const score = getLearningConceptSimilarity(candidateConcept, concept);
            if (score < minScore) return;
            if (!bestMatch || score > bestMatch.score) {
                bestMatch = { concept, session, score };
            }
        });
    });

    return bestMatch;
}

function addConceptToLearningSession(session, concept = {}) {
    if (!session) return null;

    const title = truncateLearningText(concept.title || '', 80) || 'Core Principle';
    const summary = truncateLearningText(concept.summary || concept.principle || concept.content || '', 280);
    const principle = summary;
    const coreConcept = truncateLearningText(concept.coreConcept || concept.core_concept || '', 140);
    const architecturalPattern = normalizeNullableLearningText(concept.architecturalPattern || concept.architectural_pattern || '');
    const programmingParadigm = truncateLearningText(concept.programmingParadigm || concept.programming_paradigm || '', 90);
    const languageSyntax = uniqueLearningStrings(Array.isArray(concept.languageSyntax)
        ? concept.languageSyntax
        : Array.isArray(concept.language_syntax)
            ? concept.language_syntax
            : []).slice(0, 10);
    if (!principle) return null;

    const keywords = uniqueLearningStrings([
        ...(Array.isArray(concept.keywords) ? concept.keywords : []),
        ...languageSyntax,
        coreConcept,
        architecturalPattern || '',
        programmingParadigm,
        ...extractLearningKeywords(`${title} ${principle}`, 8)
    ]).slice(0, 10);

    const candidateConcept = { title, principle, summary, coreConcept, architecturalPattern, programmingParadigm, languageSyntax, keywords };
    const duplicate = session.concepts.find(item => getLearningConceptSimilarity(candidateConcept, item) >= 0.84);
    if (duplicate) {
        duplicate.principle = chooseMoreSpecificLearningPrinciple(duplicate.principle || '', principle);
        duplicate.summary = chooseMoreSpecificLearningPrinciple(duplicate.summary || '', summary || principle);
        duplicate.coreConcept = duplicate.coreConcept || coreConcept;
        duplicate.architecturalPattern = duplicate.architecturalPattern || architecturalPattern;
        duplicate.programmingParadigm = duplicate.programmingParadigm || programmingParadigm;
        duplicate.languageSyntax = uniqueLearningStrings([...(duplicate.languageSyntax || []), ...languageSyntax]).slice(0, 10);
        duplicate.keywords = uniqueLearningStrings([...(duplicate.keywords || []), ...keywords]).slice(0, 10);
        duplicate.source = String(duplicate.source || concept.source || 'summary');
        return duplicate;
    }

    const globalMatch = findBestLearningConceptMatch(candidateConcept, {
        minScore: 0.62,
        excludeSessionId: session.id
    });
    const canonicalTitle = truncateLearningText(globalMatch?.concept?.title || title, 80) || title;
    const canonicalKeywords = uniqueLearningStrings([
        ...keywords,
        ...languageSyntax,
        ...(Array.isArray(globalMatch?.concept?.keywords) ? globalMatch.concept.keywords : []),
        ...extractLearningKeywords(`${canonicalTitle} ${principle}`, 6)
    ]).slice(0, 10);

    if (globalMatch?.concept) {
        globalMatch.concept.keywords = uniqueLearningStrings([
            ...(Array.isArray(globalMatch.concept.keywords) ? globalMatch.concept.keywords : []),
            ...canonicalKeywords
        ]).slice(0, 10);
        globalMatch.concept.coreConcept = globalMatch.concept.coreConcept || coreConcept;
        globalMatch.concept.architecturalPattern = globalMatch.concept.architecturalPattern || architecturalPattern;
        globalMatch.concept.programmingParadigm = globalMatch.concept.programmingParadigm || programmingParadigm;
        globalMatch.concept.languageSyntax = uniqueLearningStrings([...(globalMatch.concept.languageSyntax || []), ...languageSyntax]).slice(0, 10);
    }

    const newConcept = {
        id: createLearningId('concept'),
        title: canonicalTitle,
        principle,
        summary,
        coreConcept,
        architecturalPattern,
        programmingParadigm,
        languageSyntax,
        keywords: canonicalKeywords,
        createdAt: new Date().toISOString(),
        source: String(concept.source || 'summary')
    };
    session.concepts.unshift(newConcept);
    session.concepts = session.concepts.slice(0, 24);
    return newConcept;
}

function addSnippetToLearningSession(session, snippet = {}) {
    if (!session) return null;
    const content = truncateLearningText(snippet.content || '', 420);
    if (!content) return null;

    const duplicate = session.snippets.find(item => cleanLearningText(item.content || '').toLowerCase() === cleanLearningText(content).toLowerCase());
    if (duplicate) return duplicate;

    const nextSnippet = {
        id: createLearningId('snippet'),
        content,
        role: String(snippet.role || 'assistant'),
        borderColor: String(snippet.borderColor || 'green'),
        api: String(snippet.api || ''),
        model: String(snippet.model || ''),
        createdAt: new Date().toISOString(),
        source: String(snippet.source || 'chat-bubble')
    };

    session.snippets.unshift(nextSnippet);
    session.snippets = session.snippets.slice(0, 36);
    return nextSnippet;
}

function deriveLearningConceptRecords() {
    const records = [];
    state.learningHub.sessions.forEach(session => {
        (session.concepts || []).forEach(concept => {
            records.push({
                id: concept.id,
                sessionId: session.id,
                sessionTitle: session.title,
                sessionDateKey: session.dateKey,
                title: concept.title,
                principle: concept.principle,
                summary: concept.summary || concept.principle || '',
                coreConcept: concept.coreConcept || '',
                architecturalPattern: concept.architecturalPattern || null,
                programmingParadigm: concept.programmingParadigm || '',
                languageSyntax: Array.isArray(concept.languageSyntax) ? concept.languageSyntax : [],
                keywords: Array.isArray(concept.keywords) ? concept.keywords : [],
                createdAt: concept.createdAt || session.updatedAt || session.createdAt || '',
                source: concept.source || 'summary'
            });
        });
    });
    return records;
}

const LEARNING_VECTOR_MIN_LENGTH = 24;
const LEARNING_VECTOR_PREFETCH_LIMIT = 140;
const LEARNING_VECTOR_MAX_UPDATES_PER_QUERY = 10;
const LEARNING_QUERY_EMBED_CACHE_LIMIT = 24;
const learningEmbeddingJobs = new Map();
const learningQueryEmbeddingCache = new Map();

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
    const validIds = new Set((Array.isArray(concepts) ? concepts : []).map(item => String(item?.id || '')).filter(Boolean));
    Object.keys(store).forEach(conceptId => {
        if (!validIds.has(conceptId)) {
            delete store[conceptId];
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
    const hasUsableExisting = Boolean(
        existing &&
        existing.signature === signature &&
        Array.isArray(existing.vector) &&
        existing.vector.length >= LEARNING_VECTOR_MIN_LENGTH
    );
    if (hasUsableExisting && !options.force) {
        return existing;
    }

    const jobKey = `${conceptId}:${signature}`;
    if (learningEmbeddingJobs.has(jobKey)) {
        return learningEmbeddingJobs.get(jobKey);
    }

    const job = (async () => {
        const payload = await embedTextForLearning(buildLearningConceptEmbeddingText(concept), options);
        if (!payload?.vector || payload.vector.length < LEARNING_VECTOR_MIN_LENGTH) return null;

        store[conceptId] = {
            vector: payload.vector.slice(0, 256),
            model: String(payload.model || ''),
            api: String(payload.api || ''),
            updatedAt: new Date().toISOString(),
            signature
        };
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
        const needsUpdate = Boolean(
            options.force ||
            !existing ||
            existing.signature !== signature ||
            !Array.isArray(existing.vector) ||
            existing.vector.length < LEARNING_VECTOR_MIN_LENGTH
        );
        if (!needsUpdate) continue;

        processed += 1;
        const result = await ensureLearningEmbeddingForConcept(concept, options);
        if (result?.vector?.length) updated = true;
    }

    if (updated && options.save !== false) {
        saveState();
    }
    return updated;
}

function calculateLearningLinks(concepts = []) {
    const links = [];
    for (let i = 0; i < concepts.length; i++) {
        for (let j = i + 1; j < concepts.length; j++) {
            const a = concepts[i];
            const b = concepts[j];
            if (a.sessionId === b.sessionId) continue;
            const setA = new Set(collectLearningConceptTokens([
                a.title || '',
                a.summary || a.principle || '',
                a.coreConcept || '',
                a.architecturalPattern || '',
                a.programmingParadigm || '',
                a.languageSyntax || [],
                a.keywords || []
            ]));
            const setB = new Set(collectLearningConceptTokens([
                b.title || '',
                b.summary || b.principle || '',
                b.coreConcept || '',
                b.architecturalPattern || '',
                b.programmingParadigm || '',
                b.languageSyntax || [],
                b.keywords || []
            ]));

            let overlap = 0;
            setA.forEach(word => {
                if (setB.has(word)) overlap += 1;
            });

            const similarity = getLearningConceptSimilarity(
                { title: a.title, principle: a.principle, keywords: a.keywords },
                { title: b.title, principle: b.principle, keywords: b.keywords }
            );
            const sameCanonicalTitle = cleanLearningText(a.title || '').toLowerCase() === cleanLearningText(b.title || '').toLowerCase();

            if (sameCanonicalTitle) {
                overlap = Math.max(overlap, 3);
            } else if (similarity >= 0.78) {
                overlap = Math.max(overlap, 3);
            } else if (similarity >= 0.64) {
                overlap = Math.max(overlap, 2);
            } else if (similarity >= 0.53) {
                overlap = Math.max(overlap, 1);
            }

            if (overlap <= 0) continue;

            links.push({
                id: `${a.id}:${b.id}`,
                sourceConceptId: a.id,
                targetConceptId: b.id,
                sourceSessionId: a.sessionId,
                targetSessionId: b.sessionId,
                weight: overlap
            });
        }
    }

    return links.sort((a, b) => b.weight - a.weight).slice(0, 80);
}

function refreshLearningDerivedData() {
    ensureStateShape();
    const concepts = deriveLearningConceptRecords();
    const links = calculateLearningLinks(concepts);
    state.learningHub.concepts = concepts;
    state.learningHub.links = links;
    pruneLearningEmbeddingsToKnownConcepts(concepts);

    const relatedMap = new Map();
    links.forEach(link => {
        if (!relatedMap.has(link.sourceSessionId)) relatedMap.set(link.sourceSessionId, new Map());
        if (!relatedMap.has(link.targetSessionId)) relatedMap.set(link.targetSessionId, new Map());

        const srcMap = relatedMap.get(link.sourceSessionId);
        srcMap.set(link.targetSessionId, (srcMap.get(link.targetSessionId) || 0) + link.weight);
        const tgtMap = relatedMap.get(link.targetSessionId);
        tgtMap.set(link.sourceSessionId, (tgtMap.get(link.sourceSessionId) || 0) + link.weight);
    });

    state.learningHub.sessions.forEach(session => {
        const map = relatedMap.get(session.id) || new Map();
        session.relatedSessionIds = Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(entry => entry[0]);
    });
}

function getSortedLearningSessions() {
    ensureStateShape();
    return state.learningHub.sessions
        .slice()
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
}

function renderLearningSessionsInto(containerId, sessions = []) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!sessions.length) {
        container.innerHTML = '<div class="empty-state"><div class="title">No learnings yet</div><div class="desc">Open a chat and tap the brain button to capture what you learned.</div></div>';
        return;
    }

    container.innerHTML = sessions.map(session => {
        const conceptPreview = (session.concepts || []).slice(0, 2).map(item => `<li>${escapeHtml(item.title || 'Concept')}</li>`).join('');
        const snippetCount = (session.snippets || []).length;
        const conceptCount = (session.concepts || []).length;
        const relatedCount = (session.relatedSessionIds || []).length;
        const safeId = encodeURIComponent(session.id);
        return `
            <div class="list-item learning-session-item interactive" data-action="open-learning-session" data-session-id="${safeId}">
                <div class="icon">${uiIcon('brain')}</div>
                <div class="info">
                    <div class="name">${escapeHtml(session.title || 'Learning Session')}</div>
                    <div class="meta">${escapeHtml(session.dateKey || '')} | ${conceptCount} principles | ${snippetCount} snippets | ${relatedCount} links</div>
                    ${conceptPreview ? `<ul class="learning-mini-list">${conceptPreview}</ul>` : ''}
                </div>
                <button class="learning-open-btn" data-action="open-learning-session" data-session-id="${safeId}">Go to session</button>
            </div>
        `;
    }).join('');
}

function renderLearningSnippets(containerId = 'learning-snippets-list') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const sessionLookup = new Map(state.learningHub.sessions.map(session => [session.id, session]));
    const snippets = [];
    state.learningHub.sessions.forEach(session => {
        (session.snippets || []).forEach(snippet => {
            snippets.push({
                ...snippet,
                sessionId: session.id,
                sessionTitle: session.title,
                sessionDateKey: session.dateKey
            });
        });
    });

    snippets.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    const topSnippets = snippets.slice(0, 16);

    if (!topSnippets.length) {
        container.innerHTML = '<div class="empty-state"><div class="title">No snippets saved</div><div class="desc">Use "Save as Learning" from chat bubble options.</div></div>';
        return;
    }

    container.innerHTML = topSnippets.map(snippet => {
        const session = sessionLookup.get(snippet.sessionId);
        const safeId = encodeURIComponent(snippet.sessionId);
        const role = snippet.role === 'user' ? 'You' : 'Assistant';
        return `
            <div class="learning-snippet-card">
                <div class="learning-snippet-meta">${escapeHtml(role)} | ${escapeHtml(snippet.sessionDateKey || '')} | ${escapeHtml(session?.title || 'Session')}</div>
                <div class="learning-snippet-content">${formatMessage(snippet.content || '')}</div>
                <div class="learning-snippet-actions">
                    <button class="learning-open-btn" data-action="open-learning-session" data-session-id="${safeId}">Go to session</button>
                </div>
            </div>
        `;
    }).join('');
}

function decodeLearningData(rawValue = '') {
    try {
        return decodeURIComponent(String(rawValue || ''));
    } catch (_) {
        return String(rawValue || '');
    }
}

function getLearningReviewChats() {
    ensureStateShape();
    return Array.isArray(state.learningHub.reviewChats) ? state.learningHub.reviewChats : [];
}

function getLearningReviewChatById(rawReviewChatId = '') {
    const reviewChatId = decodeLearningData(rawReviewChatId);
    if (!reviewChatId) return null;
    return getLearningReviewChats().find(chat => chat.id === reviewChatId) || null;
}

function getLearningConceptById(rawConceptId = '') {
    refreshLearningDerivedData();
    const conceptId = decodeLearningData(rawConceptId);
    if (!conceptId) return { concept: null, session: null };

    const concept = state.learningHub.concepts.find(item => item.id === conceptId) || null;
    const session = concept ? getLearningSessionById(concept.sessionId) : null;
    return { concept, session };
}

function getLatestLearningReviewChatForConcept(conceptId = '') {
    const id = String(conceptId || '').trim();
    if (!id) return null;

    return getLearningReviewChats()
        .filter(chat => chat.conceptId === id)
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())[0] || null;
}

function getLearningConceptRecordsSorted(limit = 80) {
    refreshLearningDerivedData();
    const sessionLookup = new Map(state.learningHub.sessions.map(session => [session.id, session]));

    const sorted = state.learningHub.concepts.slice().sort((a, b) => {
        const aSession = sessionLookup.get(a.sessionId);
        const bSession = sessionLookup.get(b.sessionId);
        const aTime = new Date(a.createdAt || aSession?.updatedAt || aSession?.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || bSession?.updatedAt || bSession?.createdAt || 0).getTime();
        return bTime - aTime;
    });

    return sorted.slice(0, Math.max(1, Number(limit) || 80));
}

function clampLearning01(value = 0) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    if (num <= 0) return 0;
    if (num >= 1) return 1;
    return num;
}

function getConceptReviewStats(conceptId = '') {
    const id = String(conceptId || '').trim();
    if (!id) {
        return { reviewChats: 0, userMessages: 0, assistantMessages: 0 };
    }

    const chats = getLearningReviewChats().filter(chat => chat.conceptId === id);
    let userMessages = 0;
    let assistantMessages = 0;

    chats.forEach(chat => {
        (chat.messages || []).forEach(message => {
            if (message.pending) return;
            if (message.role === 'user') userMessages += 1;
            if (message.role === 'assistant') assistantMessages += 1;
        });
    });

    return {
        reviewChats: chats.length,
        userMessages,
        assistantMessages
    };
}

function getConceptStrengthScore(conceptId = '') {
    const stats = getConceptReviewStats(conceptId);
    if (!stats.reviewChats) return 0.08;

    const reviewSignal = Math.min(0.58, stats.reviewChats * 0.18);
    const questionSignal = Math.min(0.26, stats.userMessages * 0.05);
    const repetitionSignal = Math.min(0.18, Math.max(0, stats.reviewChats - 1) * 0.06);
    return clampLearning01(0.08 + reviewSignal + questionSignal + repetitionSignal);
}

function getLearningStrengthPalette(score = 0) {
    const s = clampLearning01(score);

    if (s < 0.34) {
        const t = s / 0.34;
        const alpha = 0.18 + (0.82 * t);
        return {
            tone: 'weak',
            fill: `rgba(234, 85, 95, ${alpha.toFixed(3)})`,
            stroke: `rgba(255, 137, 145, ${(0.36 + 0.58 * t).toFixed(3)})`
        };
    }

    if (s < 0.67) {
        const t = (s - 0.34) / 0.33;
        const alpha = 0.18 + (0.82 * t);
        return {
            tone: 'mid',
            fill: `rgba(245, 197, 74, ${alpha.toFixed(3)})`,
            stroke: `rgba(255, 223, 140, ${(0.38 + 0.58 * t).toFixed(3)})`
        };
    }

    const t = (s - 0.67) / 0.33;
    const alpha = 0.18 + (0.82 * t);
    return {
        tone: 'strong',
        fill: `rgba(121, 214, 107, ${alpha.toFixed(3)})`,
        stroke: `rgba(192, 255, 185, ${(0.40 + 0.56 * t).toFixed(3)})`
    };
}

function renderLearningConceptExplorer(containerId = 'learning-concepts-list') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const concepts = getLearningConceptRecordsSorted(80);
    if (!concepts.length) {
        container.innerHTML = '<div class="empty-state"><div class="title">No concepts yet</div><div class="desc">Capture learning in chat and your key principles will appear here.</div></div>';
        return;
    }

    const reviewChats = getLearningReviewChats();
    const reviewCountByConcept = new Map();
    reviewChats.forEach(chat => {
        reviewCountByConcept.set(chat.conceptId, (reviewCountByConcept.get(chat.conceptId) || 0) + 1);
    });
    const learnerGemReady = typeof getLearnerGemPrompt === 'function' && Boolean(String(getLearnerGemPrompt() || '').trim());
    const learnerHint = learnerGemReady ? 'Learner gem ready' : 'Learning mode';

    container.innerHTML = concepts.map(concept => {
        const safeConceptId = encodeURIComponent(concept.id);
        const keywords = (concept.keywords || []).slice(0, 7);
        const taxonomy = uniqueLearningStrings([
            concept.coreConcept || '',
            concept.architecturalPattern || '',
            concept.programmingParadigm || ''
        ]).slice(0, 3);
        const reviewCount = reviewCountByConcept.get(concept.id) || 0;
        const latestReview = getLatestLearningReviewChatForConcept(concept.id);
        const safeReviewId = latestReview ? encodeURIComponent(latestReview.id) : '';
        const strengthScore = getConceptStrengthScore(concept.id);
        const strengthPalette = getLearningStrengthPalette(strengthScore);
        const strengthPct = Math.round(strengthScore * 100);
        const strengthLabel = strengthPalette.tone === 'strong' ? 'Strong' : strengthPalette.tone === 'mid' ? 'Medium' : 'Weak';
        const conceptStyle = `--learning-strength-fill:${strengthPalette.fill};--learning-strength-stroke:${strengthPalette.stroke};`;

        return `
            <div class="learning-concept-card interactive" style="${conceptStyle}" data-action="open-learning-concept" data-concept-id="${safeConceptId}">
                <div class="learning-concept-title">${escapeHtml(concept.title || 'Core Principle')}</div>
                <div class="learning-concept-meta">${escapeHtml(concept.sessionDateKey || '')} | ${escapeHtml(concept.sessionTitle || 'Session')} | ${reviewCount} review chat${reviewCount === 1 ? '' : 's'} | ${learnerHint}</div>
                <div class="learning-strength-badge">${strengthLabel} ${strengthPct}%</div>
                <div class="learning-concept-principle">${escapeHtml(concept.principle || '')}</div>
                ${taxonomy.length ? `<div class="learning-keywords">${taxonomy.map(word => `<span class="learning-keyword">${escapeHtml(word)}</span>`).join('')}</div>` : ''}
                ${keywords.length ? `<div class="learning-keywords">${keywords.map(word => `<span class="learning-keyword">${escapeHtml(word)}</span>`).join('')}</div>` : ''}
                <div class="learning-concept-actions">
                    <button class="learning-open-btn" data-action="open-learning-concept" data-concept-id="${safeConceptId}">Relearn</button>
                    <button class="learning-open-btn" data-action="start-learning-review-chat" data-concept-id="${safeConceptId}">Ask Learner Gem</button>
                    ${latestReview ? `<button class="learning-open-btn" data-action="open-learning-review-chat" data-review-chat-id="${safeReviewId}">Continue Chat</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function getRelatedConceptTitles(conceptId = '', limit = 4) {
    const id = String(conceptId || '').trim();
    if (!id) return [];
    const conceptLookup = new Map(state.learningHub.concepts.map(item => [item.id, item]));

    const linked = (state.learningHub.links || [])
        .filter(link => link.sourceConceptId === id || link.targetConceptId === id)
        .sort((a, b) => Number(b.weight || 0) - Number(a.weight || 0))
        .slice(0, Math.max(1, Number(limit) || 4))
        .map(link => {
            const otherId = link.sourceConceptId === id ? link.targetConceptId : link.sourceConceptId;
            const other = conceptLookup.get(otherId);
            return other?.title || '';
        })
        .filter(Boolean);

    return uniqueLearningStrings(linked).slice(0, Math.max(1, Number(limit) || 4));
}

function openLearningConceptById(rawConceptId = '') {
    const { concept, session } = getLearningConceptById(rawConceptId);
    if (!concept) {
        showToast('Concept not found');
        return;
    }

    state.learningHub.activeConceptId = concept.id;
    saveState();

    const body = document.getElementById('learning-concept-modal-body');
    const askBtn = document.getElementById('learning-concept-ask-btn');
    if (!body) return;

    const relatedTitles = getRelatedConceptTitles(concept.id, 4);
    const keywords = (concept.keywords || []).slice(0, 10);
    const languageSyntax = (concept.languageSyntax || []).slice(0, 8);
    const taxonomyFacts = [
        concept.coreConcept ? `Core concept: ${concept.coreConcept}` : '',
        concept.architecturalPattern ? `Pattern: ${concept.architecturalPattern}` : '',
        concept.programmingParadigm ? `Paradigm: ${concept.programmingParadigm}` : ''
    ].filter(Boolean);

    body.innerHTML = `
        <div class="learning-concept-title">${escapeHtml(concept.title || 'Core Principle')}</div>
        <div class="learning-concept-meta">${escapeHtml(concept.sessionDateKey || '')} | ${escapeHtml(session?.title || concept.sessionTitle || 'Session')}</div>
        <div class="learning-modal-principle">${escapeHtml(concept.principle || '')}</div>
        ${taxonomyFacts.length ? `<div class="learning-modal-block-title">Concept Taxonomy</div><ul class="learning-mini-list">${taxonomyFacts.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
        ${languageSyntax.length ? `<div class="learning-modal-block-title">Syntax Layer</div><div class="learning-keywords">${languageSyntax.map(word => `<span class="learning-keyword">${escapeHtml(word)}</span>`).join('')}</div>` : ''}
        ${keywords.length ? `<div class="learning-modal-block-title">Keywords</div><div class="learning-keywords">${keywords.map(word => `<span class="learning-keyword">${escapeHtml(word)}</span>`).join('')}</div>` : ''}
        ${relatedTitles.length ? `<div class="learning-modal-block-title">Related Concepts</div><ul class="learning-mini-list">${relatedTitles.map(title => `<li>${escapeHtml(title)}</li>`).join('')}</ul>` : ''}
    `;

    if (askBtn) {
        askBtn.dataset.conceptId = encodeURIComponent(concept.id);
    }

    showModal('learning-concept-modal');
}

function getLearningSnippetsForConcept(session, concept, limit = 3) {
    const snippets = Array.isArray(session?.snippets) ? session.snippets : [];
    const keywords = (concept?.keywords || []).map(item => String(item || '').toLowerCase()).filter(Boolean);

    const scored = snippets.map(snippet => {
        const text = String(snippet.content || '').toLowerCase();
        const score = keywords.reduce((total, keyword) => total + (text.includes(keyword) ? 1 : 0), 0);
        return { snippet, score };
    });

    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(1, Number(limit) || 3))
        .map(item => item.snippet);
}

function buildLearningReviewStarterMessage(concept, session) {
    const sessionTitle = session?.title || concept?.sessionTitle || 'Session';
    const coreConcept = concept?.coreConcept ? `Core concept: ${concept.coreConcept}` : '';
    const pattern = concept?.architecturalPattern ? `Pattern: ${concept.architecturalPattern}` : '';
    const lines = [
        `Let's relearn **${concept?.title || 'this concept'}**.`,
        concept?.principle ? `Core principle: ${concept.principle}` : '',
        coreConcept,
        pattern,
        `Source: ${sessionTitle}`,
        'Ask me for examples, quizzes, analogies, or a step-by-step recap.'
    ].filter(Boolean);

    return lines.join('\n\n');
}

function createLearningReviewChat(concept, session) {
    const now = new Date().toISOString();
    const provider = getChatProvider('general');
    const model = getChatModel('general', provider);

    const chat = {
        id: createLearningId('review'),
        conceptId: concept.id,
        conceptTitle: concept.title || 'Core Principle',
        sessionId: session?.id || concept.sessionId || '',
        createdAt: now,
        updatedAt: now,
        messages: [{
            role: 'assistant',
            content: buildLearningReviewStarterMessage(concept, session),
            borderColor: 'green',
            api: provider,
            model
        }]
    };

    state.learningHub.reviewChats.unshift(chat);
    state.learningHub.reviewChats = state.learningHub.reviewChats.slice(0, 160);
    return chat;
}

function startLearningReviewChatFromConcept(rawConceptId = '', options = {}) {
    const requestedConceptId = decodeLearningData(rawConceptId);
    const conceptId = requestedConceptId || (options.useActiveConcept ? state.learningHub.activeConceptId : '');
    const forceNew = Boolean(options.forceNew);

    const { concept, session } = getLearningConceptById(conceptId);
    if (!concept) {
        showToast('Pick a concept first');
        return;
    }

    state.learningHub.activeConceptId = concept.id;
    let chat = forceNew ? null : getLatestLearningReviewChatForConcept(concept.id);
    if (!chat) {
        chat = createLearningReviewChat(concept, session);
    }

    state.learningHub.activeReviewChatId = chat.id;
    saveState();
    hideModal('learning-concept-modal');
    showScreen('learning-chat-screen');
    renderLearningReviewChatScreen();
    showToast(forceNew ? 'New learning chat started' : 'Learning chat opened');
}

function openLearningReviewChatById(rawReviewChatId = '') {
    const chat = getLearningReviewChatById(rawReviewChatId);
    if (!chat) {
        showToast('Learning chat not found');
        return;
    }

    state.learningHub.activeReviewChatId = chat.id;
    state.learningHub.activeConceptId = chat.conceptId;
    saveState();
    showScreen('learning-chat-screen');
    renderLearningReviewChatScreen();
}

function getActiveLearningReviewChat() {
    const activeId = String(state.learningHub.activeReviewChatId || '').trim();
    if (activeId) {
        const found = getLearningReviewChatById(activeId);
        if (found) return found;
    }

    const conceptId = String(state.learningHub.activeConceptId || '').trim();
    if (conceptId) {
        const fallback = getLatestLearningReviewChatForConcept(conceptId);
        if (fallback) {
            state.learningHub.activeReviewChatId = fallback.id;
            return fallback;
        }
    }

    return null;
}

function buildLearningReviewSystemPrompts(concept, session) {
    if (!concept) return [];
    const snippets = getLearningSnippetsForConcept(session, concept, 3);
    const snippetLines = snippets.map((snippet, idx) => `- snippet_${idx + 1}: ${truncateLearningText(snippet.content || '', 220)}`).join('\n');
    const relatedTitles = getRelatedConceptTitles(concept.id || '', 5);
    const learnerGemPrompt = typeof getLearnerGemPrompt === 'function'
        ? String(getLearnerGemPrompt() || '').trim()
        : '';

    const prompt = [
        'You are the user\'s personal Dot Connector and coding mentor.',
        'Do not teach from scratch. Start by linking this concept to prior memory and explain through association.',
        `Concept title: ${concept.title || 'Core Principle'}`,
        `Concept summary: ${concept.summary || concept.principle || ''}`,
        `Core concept: ${concept.coreConcept || 'n/a'}`,
        `Architectural pattern: ${concept.architecturalPattern || 'n/a'}`,
        `Programming paradigm: ${concept.programmingParadigm || 'n/a'}`,
        `Language syntax: ${(concept.languageSyntax || []).join(', ') || 'n/a'}`,
        `Keywords: ${(concept.keywords || []).join(', ') || 'n/a'}`,
        `Related concepts in memory: ${relatedTitles.join(', ') || 'n/a'}`,
        `Session title: ${session?.title || concept.sessionTitle || 'Session'}`,
        `Session date: ${session?.dateKey || concept.sessionDateKey || ''}`,
        snippetLines ? `Relevant snippets:\n${snippetLines}` : '',
        'Use a conversational bridge opener (example tone: "Eyy, this should look familiar...").',
        'State what is the same conceptually and what is different in implementation details.',
        'End with one concrete next practice step and one check-understanding question.'
    ].filter(Boolean).join('\n');

    return [learnerGemPrompt, prompt].filter(Boolean);
}

function renderLearningReviewChatScreen() {
    const titleEl = document.getElementById('learning-review-title');
    const subtitleEl = document.getElementById('learning-review-subtitle');
    const messagesEl = document.getElementById('learning-review-messages');
    if (!titleEl || !subtitleEl || !messagesEl) return;

    const chat = getActiveLearningReviewChat();
    if (!chat) {
        titleEl.textContent = 'Learning Q&A';
        subtitleEl.textContent = 'Choose a concept to start a separate review chat';
        messagesEl.innerHTML = '<div class="empty-state"><div class="title">No learning chat yet</div><div class="desc">Open a concept and tap "Ask in New Chat".</div></div>';
        return;
    }

    const { concept, session } = getLearningConceptById(chat.conceptId);
    const title = concept?.title || chat.conceptTitle || 'Learning Q&A';
    const subtitleParts = [
        session?.dateKey || concept?.sessionDateKey || '',
        session?.title || concept?.sessionTitle || ''
    ].filter(Boolean);

    titleEl.textContent = title;
    subtitleEl.textContent = subtitleParts.join(' | ') || 'Separate learning review chat';

    messagesEl.innerHTML = (chat.messages || []).map(message => {
        const isPending = message.pending ? 'pending' : '';
        const borderStyle = message.borderColor ? `border-color: var(--color-${message.borderColor})` : '';
        const meta = renderChatBubbleMeta(message);
        return `
            <div class="chat-bubble ${message.role === 'user' ? 'user' : 'ai'} ${isPending}" style="${borderStyle}">
                ${meta}
                ${formatMessage(message.content)}
            </div>
        `;
    }).join('');

    messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function sendLearningReviewMessage() {
    const input = document.getElementById('learning-review-input');
    if (!input) return;

    const text = String(input.value || '').trim();
    if (!text) return;

    const chat = getActiveLearningReviewChat();
    if (!chat) {
        showToast('Start from a concept first');
        return;
    }

    const provider = getChatProvider('general');
    const model = getChatModel('general', provider);
    const history = buildAIHistoryFromMessages(chat.messages || []);
    const { concept, session } = getLearningConceptById(chat.conceptId);
    const systemPrompts = buildLearningReviewSystemPrompts(concept, session);

    input.value = '';
    chat.messages.push({ role: 'user', content: text, borderColor: 'green' });
    const pendingReply = {
        role: 'assistant',
        content: 'Thinking...',
        borderColor: 'green',
        pending: true,
        api: provider,
        model
    };
    chat.messages.push(pendingReply);
    chat.updatedAt = new Date().toISOString();
    state.learningHub.activeConceptId = concept?.id || chat.conceptId;
    state.learningHub.activeReviewChatId = chat.id;
    saveState();
    renderLearningReviewChatScreen();

    const response = await callAI(text, {
        notifyQueue: true,
        scope: 'general',
        api: provider,
        model,
        history,
        systemPrompts
    });

    pendingReply.content = response?.content || 'No response';
    pendingReply.api = response?.api || provider;
    pendingReply.model = response?.model || model;
    pendingReply.pending = false;
    chat.updatedAt = new Date().toISOString();
    saveState();

    if (state.learningHub.activeReviewChatId === chat.id) {
        renderLearningReviewChatScreen();
    }
}

const LEARNING_GRAPH_MODES = ['connections', 'recency', 'source'];
const LEARNING_GRAPH_MODE_META = {
    connections: {
        label: 'Connections',
        description: 'Links by shared keywords, with strength colors: weak red -> medium yellow -> strong green.'
    },
    recency: {
        label: 'Recency',
        description: 'Colors concept nodes by how recently the concept was learned.'
    },
    source: {
        label: 'Capture Type',
        description: 'Colors concept nodes by auto-summary vs manual bubble capture.'
    }
};

function normalizeLearningGraphMode(mode = '') {
    const raw = String(mode || '').trim().toLowerCase();
    return LEARNING_GRAPH_MODES.includes(raw) ? raw : 'connections';
}

function getLearningGraphMode() {
    ensureStateShape();
    return normalizeLearningGraphMode(state.learningHub.graphMode);
}

function getLearningGraphModeMeta(mode = '') {
    const normalized = normalizeLearningGraphMode(mode);
    return LEARNING_GRAPH_MODE_META[normalized] || LEARNING_GRAPH_MODE_META.connections;
}

function clampLearningGraphZoom(value = 1.45) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 1.45;
    if (numeric < 1) return 1;
    if (numeric > 2.2) return 2.2;
    return numeric;
}

function getLearningGraphZoom() {
    ensureStateShape();
    return clampLearningGraphZoom(state.learningHub.graphZoom || 1.45);
}

function setLearningGraphZoom(zoom = 1.45) {
    const nextZoom = clampLearningGraphZoom(zoom);
    if (Math.abs(nextZoom - getLearningGraphZoom()) < 0.001) return;
    state.learningHub.graphZoom = nextZoom;
    saveState();
    renderLearningScreen();
}

function setLearningGraphMode(mode = '') {
    const nextMode = normalizeLearningGraphMode(mode);
    if (state.learningHub.graphMode === nextMode) return;
    state.learningHub.graphMode = nextMode;
    saveState();
    renderLearningScreen();
}

function getConceptAgeDays(createdAt = '') {
    const ts = new Date(createdAt || 0).getTime();
    if (!Number.isFinite(ts) || ts <= 0) return 9999;
    const diffMs = Math.max(0, Date.now() - ts);
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function getLearningGraphNodeVisual(node, mode = 'connections') {
    if (node.type === 'session') {
        return { fill: '#78c6f2', stroke: '#d8f0ff' };
    }

    if (mode === 'connections') {
        const score = getConceptStrengthScore(node.conceptId || '');
        return getLearningStrengthPalette(score);
    }

    if (mode === 'recency') {
        const ageDays = getConceptAgeDays(node.createdAt);
        if (ageDays <= 1) return { fill: '#8fdc66', stroke: '#ecf9db' };
        if (ageDays <= 7) return { fill: '#7bc5ff', stroke: '#e5f3ff' };
        if (ageDays <= 30) return { fill: '#d8b178', stroke: '#fff1dd' };
        return { fill: '#b999f5', stroke: '#f1e9ff' };
    }

    if (mode === 'source') {
        const source = String(node.source || '').toLowerCase();
        if (source.includes('chat-bubble')) return { fill: '#f2ae63', stroke: '#ffe4bf' };
        if (source.includes('chat-summary')) return { fill: '#7ec6f7', stroke: '#dff1ff' };
        return { fill: '#98d479', stroke: '#eaf8de' };
    }

    return { fill: '#98d479', stroke: '#eaf8de' };
}

function buildLearningGraphData(maxSessions = 8, maxConceptsPerSession = 2, options = {}) {
    const mode = normalizeLearningGraphMode(options.mode || getLearningGraphMode());
    const sessions = getSortedLearningSessions().slice(0, maxSessions);
    const conceptNodes = [];
    sessions.forEach(session => {
        (session.concepts || []).slice(0, maxConceptsPerSession).forEach(concept => {
            conceptNodes.push({ ...concept, sessionId: session.id, sessionTitle: session.title });
        });
    });

    const sessionNodes = sessions.map(session => ({
        id: `session:${session.id}`,
        label: truncateLearningText(session.title, 28),
        type: 'session',
        sessionId: session.id,
        updatedAt: session.updatedAt || session.createdAt || ''
    }));
    const conceptGraphNodes = conceptNodes.map(concept => ({
        id: `concept:${concept.id}`,
        conceptId: concept.id,
        label: truncateLearningText(concept.title, 24),
        type: 'concept',
        sessionId: concept.sessionId,
        createdAt: concept.createdAt || '',
        source: concept.source || 'summary'
    }));

    const nodes = [...sessionNodes, ...conceptGraphNodes];
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    const edges = [];

    conceptNodes.forEach(concept => {
        edges.push({
            source: `session:${concept.sessionId}`,
            target: `concept:${concept.id}`,
            weight: 1,
            kind: 'owner'
        });
    });

    if (mode === 'connections') {
        const includedConceptIds = new Set(conceptNodes.map(node => node.id));
        (state.learningHub.links || []).forEach(link => {
            if (!includedConceptIds.has(link.sourceConceptId) || !includedConceptIds.has(link.targetConceptId)) return;
            edges.push({
                source: `concept:${link.sourceConceptId}`,
                target: `concept:${link.targetConceptId}`,
                weight: Math.min(3, Math.max(1, Number(link.weight || 1))),
                kind: 'link'
            });
        });
    }

    return { sessions, nodes: Array.from(nodeMap.values()), edges, mode };
}

function renderLearningGraph(containerId = 'learning-graph', options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const mode = normalizeLearningGraphMode(options.mode || getLearningGraphMode());
    const graph = buildLearningGraphData(options.maxSessions || 8, options.maxConceptsPerSession || 2, { mode });
    if (!graph.nodes.length) {
        container.innerHTML = '<div class="empty-state"><div class="title">Knowledge graph is empty</div><div class="desc">Capture learning from chats to build connected memory.</div></div>';
        return;
    }

    const showModeControls = Boolean(options.showModeControls);
    const enablePanZoom = Boolean(options.enablePanZoom);
    const baseWidth = options.width || 340;
    const baseHeight = options.height || 230;
    const zoom = enablePanZoom ? clampLearningGraphZoom(options.zoom ?? getLearningGraphZoom()) : 1;
    const width = Math.round(baseWidth * zoom);
    const height = Math.round(baseHeight * zoom);
    const cx = width / 2;
    const cy = height / 2;
    const sessionRadius = Math.min(width, height) * 0.33;
    const conceptRadius = sessionRadius * 0.62;

    const positioned = graph.nodes.map(node => ({ ...node, x: cx, y: cy }));
    const sessionNodes = positioned.filter(node => node.type === 'session');
    const conceptNodes = positioned.filter(node => node.type === 'concept');

    sessionNodes.forEach((node, idx) => {
        const angle = (Math.PI * 2 * idx) / Math.max(1, sessionNodes.length);
        node.x = cx + Math.cos(angle) * sessionRadius;
        node.y = cy + Math.sin(angle) * sessionRadius;
    });

    conceptNodes.forEach(node => {
        const ownerIdx = sessionNodes.findIndex(owner => owner.sessionId === node.sessionId);
        const ownerAngle = ownerIdx >= 0 ? (Math.PI * 2 * ownerIdx) / Math.max(1, sessionNodes.length) : 0;
        const siblings = conceptNodes.filter(item => item.sessionId === node.sessionId);
        const siblingIdx = siblings.findIndex(item => item.id === node.id);
        const spread = siblings.length <= 1 ? 0 : (siblingIdx - (siblings.length - 1) / 2) * 0.34;
        const angle = ownerAngle + spread;
        node.x = cx + Math.cos(angle) * conceptRadius;
        node.y = cy + Math.sin(angle) * conceptRadius;
    });

    const byId = new Map(positioned.map(node => [node.id, node]));
    const edgeSvg = graph.edges.map(edge => {
        const source = byId.get(edge.source);
        const target = byId.get(edge.target);
        if (!source || !target) return '';
        const strength = Math.min(3, Math.max(1, Number(edge.weight || 1)));
        const kind = edge.kind === 'link' ? 'link' : 'owner';
        return `<line x1="${source.x.toFixed(1)}" y1="${source.y.toFixed(1)}" x2="${target.x.toFixed(1)}" y2="${target.y.toFixed(1)}" class="learning-graph-edge ${kind} w${strength}" />`;
    }).join('');

    const nodeSvg = positioned.map(node => {
        const isSession = node.type === 'session';
        const radius = isSession ? 11 : 8;
        const hitRadius = isSession ? 21 : 18;
        const labelY = isSession ? 20 : 16;
        const labelClass = isSession ? 'learning-graph-label session' : 'learning-graph-label concept';
        const visual = getLearningGraphNodeVisual(node, mode);
        const actionAttr = isSession
            ? `data-action="open-learning-session" data-session-id="${encodeURIComponent(node.sessionId || '')}"`
            : `data-action="open-learning-concept" data-concept-id="${encodeURIComponent(node.conceptId || '')}"`;
        const title = isSession ? `Open Session: ${node.label}` : `Open Concept: ${node.label}`;
        return `
            <g class="learning-graph-node ${isSession ? 'session' : 'concept'} interactive" ${actionAttr}>
                <title>${escapeHtml(title)}</title>
                <circle class="learning-graph-hit" cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${hitRadius}"></circle>
                <circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${radius}" fill="${visual.fill}" stroke="${visual.stroke}" stroke-width="${isSession ? '1.2' : '1.1'}"></circle>
                <text x="${node.x.toFixed(1)}" y="${(node.y + labelY).toFixed(1)}" text-anchor="middle" class="${labelClass}">${escapeHtml(node.label)}</text>
            </g>
        `;
    }).join('');

    const modeMeta = getLearningGraphModeMeta(mode);
    const zoomPct = Math.round(zoom * 100);
    const controlsHtml = showModeControls ? `
        <div class="learning-graph-controls-row">
            <div class="learning-graph-controls">
                ${LEARNING_GRAPH_MODES.map(key => {
                    const meta = getLearningGraphModeMeta(key);
                    const active = key === mode ? 'active' : '';
                    return `<button class="learning-graph-mode-btn ${active}" data-action="set-learning-graph-mode" data-mode="${key}">${meta.label}</button>`;
                }).join('')}
            </div>
            ${enablePanZoom ? `
                <div class="learning-graph-zoom-controls">
                    <button class="learning-graph-mode-btn" data-action="learning-graph-zoom-out">-</button>
                    <span class="learning-graph-zoom-value">${zoomPct}%</span>
                    <button class="learning-graph-mode-btn" data-action="learning-graph-zoom-in">+</button>
                    <button class="learning-graph-mode-btn" data-action="learning-graph-zoom-reset">Reset</button>
                </div>
            ` : ''}
        </div>
        <div class="learning-graph-mode-desc">${escapeHtml(modeMeta.description)}</div>
        ${enablePanZoom ? '<div class="learning-graph-pan-hint">Drag inside the graph to pan in any direction.</div>' : ''}
    ` : '';

    container.innerHTML = `
        ${controlsHtml}
        <div class="learning-graph-wrap ${enablePanZoom ? 'pannable' : ''}">
            <div class="learning-graph-pan-viewport ${enablePanZoom ? 'enabled' : ''}">
                <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" class="learning-graph-svg ${enablePanZoom ? 'pannable' : ''}" aria-label="Knowledge graph">
                    <defs>
                        <radialGradient id="learningGraphGlow" cx="50%" cy="40%" r="60%">
                            <stop offset="0%" stop-color="#84d0ff" stop-opacity="0.22"></stop>
                            <stop offset="100%" stop-color="#84d0ff" stop-opacity="0"></stop>
                        </radialGradient>
                    </defs>
                    <circle cx="${cx}" cy="${cy}" r="${Math.min(width, height) * 0.44}" fill="url(#learningGraphGlow)"></circle>
                    ${edgeSvg}
                    ${nodeSvg}
                </svg>
            </div>
        </div>
    `;

    if (enablePanZoom) {
        const viewport = container.querySelector('.learning-graph-pan-viewport');
        if (viewport) {
            requestAnimationFrame(() => {
                viewport.scrollLeft = Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2);
                viewport.scrollTop = Math.max(0, (viewport.scrollHeight - viewport.clientHeight) / 2);
            });
        }
    }
}

function renderLearningHomePreview() {
    const container = document.getElementById('home-knowledge-graph');
    if (!container) return;

    refreshLearningDerivedData();
    const sessions = getSortedLearningSessions();
    if (!sessions.length) {
        container.innerHTML = '<div class="empty-state"><div class="title">No learning memory yet</div><div class="desc">Use the brain button in chat to capture what you learned today.</div></div>';
        return;
    }

    const todaySessions = sessions.filter(session => toDateKey(session.dateKey || session.createdAt) === getTodayDateKey());
    const conceptCount = state.learningHub.concepts.length;
    container.innerHTML = `
        <div class="learning-home-summary">
            <div class="learning-chip">${todaySessions.length} today</div>
            <div class="learning-chip">${sessions.length} sessions</div>
            <div class="learning-chip">${conceptCount} concepts</div>
        </div>
        <div id="home-knowledge-graph-svg"></div>
    `;
    renderLearningGraph('home-knowledge-graph-svg', { mode: 'connections', maxSessions: 4, maxConceptsPerSession: 1, width: 320, height: 180 });
}

function renderLearningScreen() {
    const screen = document.getElementById('learning-screen');
    if (!screen) return;

    refreshLearningDerivedData();
    const sessions = getSortedLearningSessions();
    const todayKey = getTodayDateKey();
    const todaySessions = sessions.filter(session => toDateKey(session.dateKey || session.createdAt) === todayKey);
    renderLearningSessionsInto('learning-today-list', todaySessions);
    renderLearningConceptExplorer('learning-concepts-list');
    renderLearningGraph('learning-graph', {
        mode: getLearningGraphMode(),
        showModeControls: true,
        enablePanZoom: true,
        zoom: getLearningGraphZoom(),
        maxSessions: 8,
        maxConceptsPerSession: 2,
        width: 340,
        height: 240
    });
    renderLearningSnippets('learning-snippets-list');
}

function getLearningCurrentScopeContext(options = {}) {
    const scope = String(options.scope || '').toLowerCase();
    const contextParts = [];

    if (scope === 'section') {
        const project = state.projects?.[state.currentProject];
        const file = project?.files?.[state.currentFile];
        if (file?.name) contextParts.push(`Current file: ${file.name}`);
        if (file?.content) contextParts.push(`Current code excerpt:\n${truncateLearningText(file.content, 1500)}`);

        const activeSectionId = state.currentChat?.type === 'section' ? state.currentChat.id : '';
        const sectionMessages = project?.chats?.[activeSectionId]?.messages || [];
        const recentSectionText = sectionMessages
            .filter(message => !message.pending)
            .slice(-6)
            .map(message => `${message.role}: ${truncateLearningText(message.content || '', 220)}`)
            .join('\n');
        if (recentSectionText) contextParts.push(`Recent section chat context:\n${recentSectionText}`);
    } else if (scope === 'general') {
        const chatIdx = state.generalChats.findIndex(chat => chat.folderId === state.currentGeneralFolder);
        const messages = chatIdx >= 0 ? state.generalChats[chatIdx].messages : [];
        const recentGeneralText = (messages || [])
            .filter(message => !message.pending)
            .slice(-6)
            .map(message => `${message.role}: ${truncateLearningText(message.content || '', 220)}`)
            .join('\n');
        if (recentGeneralText) contextParts.push(`Recent general chat context:\n${recentGeneralText}`);
    }

    return contextParts.filter(Boolean).join('\n\n');
}

function scoreLearningConceptForQuery(concept, queryText = '', tokens = []) {
    if (!concept) return 0;
    const titleText = cleanLearningText(concept.title || '').toLowerCase();
    const summaryText = cleanLearningText(concept.summary || concept.principle || '').toLowerCase();
    const coreText = cleanLearningText(concept.coreConcept || '').toLowerCase();
    const patternText = cleanLearningText(concept.architecturalPattern || '').toLowerCase();
    const paradigmText = cleanLearningText(concept.programmingParadigm || '').toLowerCase();
    const syntaxText = (concept.languageSyntax || []).map(item => String(item || '').toLowerCase()).join(' ');
    const keywordText = (concept.keywords || []).map(item => String(item || '').toLowerCase()).join(' ');
    const sessionText = cleanLearningText(concept.sessionTitle || '').toLowerCase();

    let score = 0;
    tokens.forEach(token => {
        if (!token || token.length < 3) return;
        if (coreText.includes(token)) score += 3.2;
        if (patternText.includes(token)) score += 2.8;
        if (paradigmText.includes(token)) score += 2.1;
        if (titleText.includes(token)) score += 1.9;
        if (summaryText.includes(token)) score += 1.3;
        if (syntaxText.includes(token)) score += 1.6;
        if (keywordText.includes(token)) score += 1.4;
        if (sessionText.includes(token)) score += 0.8;
    });

    const pseudoConcept = {
        title: truncateLearningText(queryText, 80),
        summary: truncateLearningText(queryText, 280),
        coreConcept: truncateLearningText(queryText, 140),
        keywords: extractLearningKeywords(queryText, 10)
    };
    const similarityBoost = getLearningConceptSimilarity(concept, pseudoConcept);
    score += similarityBoost * 4.8;

    const ageDays = getConceptAgeDays(concept.createdAt || '');
    if (ageDays <= 2) score += 0.7;
    else if (ageDays <= 10) score += 0.4;
    else if (ageDays <= 30) score += 0.2;

    return score;
}

async function getRelevantLearningConceptPulls(query = '', options = {}, limit = 3) {
    refreshLearningDerivedData();
    const maxItems = Math.max(1, Number(limit) || 3);
    if (!state.learningHub.concepts.length) return [];

    const currentScopeText = getLearningCurrentScopeContext(options);
    const queryText = [query, currentScopeText].filter(Boolean).join('\n');
    const tokens = collectLearningConceptTokens([queryText]).slice(0, 40);
    const concepts = getLearningConceptRecordsSorted(220);
    if (!concepts.length) return [];

    const vectorCandidates = concepts.slice(0, Math.min(concepts.length, LEARNING_VECTOR_PREFETCH_LIMIT));
    const updatedVectors = await syncLearningConceptEmbeddings(vectorCandidates, {
        maxToUpdate: LEARNING_VECTOR_MAX_UPDATES_PER_QUERY,
        save: false
    });
    if (updatedVectors) saveState();

    const queryEmbedding = await getLearningQueryEmbeddingPayload(queryText, options);
    const embeddingStore = getLearningEmbeddingsStore();

    const scored = concepts.map(concept => ({
        concept,
        lexicalScore: scoreLearningConceptForQuery(concept, queryText, tokens),
        semanticScore: (() => {
            if (!queryEmbedding?.vector?.length) return 0;
            const conceptVector = embeddingStore[concept.id]?.vector;
            if (!Array.isArray(conceptVector) || conceptVector.length < LEARNING_VECTOR_MIN_LENGTH) return 0;
            const cosine = getLearningCosineSimilarity(queryEmbedding.vector, conceptVector);
            return Math.max(0, (cosine + 1) / 2);
        })()
    })).map(entry => ({
        ...entry,
        score: queryEmbedding?.vector?.length
            ? (entry.lexicalScore * 0.58) + (entry.semanticScore * 7.4)
            : entry.lexicalScore
    }));

    const minScore = queryEmbedding?.vector?.length ? 1.1 : 1.35;
    const ranked = scored
        .sort((a, b) => b.score - a.score)
        .filter(entry => entry.score > minScore);

    const picked = [];
    const seenTitles = new Set();
    ranked.forEach(entry => {
        if (picked.length >= maxItems) return;
        const normalizedTitle = cleanLearningText(entry.concept.title || '').toLowerCase();
        if (normalizedTitle && seenTitles.has(normalizedTitle)) return;
        if (normalizedTitle) seenTitles.add(normalizedTitle);
        picked.push(entry.concept);
    });

    if (picked.length >= maxItems) return picked.slice(0, maxItems);

    for (const concept of concepts) {
        if (picked.length >= maxItems) break;
        if (picked.some(item => item.id === concept.id)) continue;
        picked.push(concept);
    }

    return picked.slice(0, maxItems);
}

async function getLearningSystemPromptForQuery(query = '', options = {}) {
    refreshLearningDerivedData();
    if (!state.learningHub.sessions.length) return '';

    const pulls = await getRelevantLearningConceptPulls(query, options, 3);
    if (!pulls.length) return '';

    const scopeContext = getLearningCurrentScopeContext(options);
    const pullLines = pulls.map(concept => {
        const shortTitle = truncateLearningText(concept.title || 'Concept', 42).replace(/[|\]]/g, '');
        const keywordSummary = (concept.keywords || []).slice(0, 7).join(', ') || 'n/a';
        const syntaxSummary = (concept.languageSyntax || []).slice(0, 6).join(', ') || 'n/a';
        return `- title=${concept.title || 'Concept'}; core_concept=${concept.coreConcept || 'n/a'}; architectural_pattern=${concept.architecturalPattern || 'n/a'}; programming_paradigm=${concept.programmingParadigm || 'n/a'}; summary=${truncateLearningText(concept.summary || concept.principle || '', 180)}; syntax=${syntaxSummary}; keywords=${keywordSummary}; session_ref=[[SESSION_REF:${concept.sessionId}|${shortTitle}]]`;
    }).join('\n');

    return [
        'You are the user\'s personal "Dot Connector" and coding mentor.',
        'Your job is to map the current problem/code to concepts from the user\'s own memory vault.',
        scopeContext ? `Current scope context:\n${scopeContext}` : '',
        'Highly relevant Vault Pulls:',
        pullLines,
        'Task:',
        '1) Find the best conceptual match based on core_concept or architectural_pattern, not superficial syntax.',
        '2) If there is a real match, start immediately with a memory bridge (example tone: "Eyy, this should look familiar...").',
        '3) Explain via association: map old concept behavior to this new context directly.',
        '4) If the pulls are genuinely irrelevant, do not force a connection. Say: "This looks like a genuinely new concept for our database. What does this remind you of?"',
        'If you reference one pull, include this exact token format once:',
        '[[SESSION_REF:<id>|<short title>]]',
        'Do not invent session IDs.'
    ].join('\n');
}

function tryParseLearningSummaryJson(text = '') {
    const source = String(text || '').trim();
    if (!source) return null;

    const candidates = [];
    candidates.push(source);
    const fenced = source.match(/```json\s*([\s\S]*?)```/i);
    if (fenced?.[1]) candidates.push(fenced[1].trim());
    const objectMatch = source.match(/\{[\s\S]*\}/);
    if (objectMatch?.[0]) candidates.push(objectMatch[0].trim());

    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(candidate);
            if (parsed && typeof parsed === 'object') return parsed;
        } catch (_) {
            // continue
        }
    }
    return null;
}

function buildFallbackLearningSummary(messages = []) {
    const latestAssistant = messages.slice().reverse().find(message => message.role === 'assistant' && !message.pending);
    const latestUser = messages.slice().reverse().find(message => message.role === 'user' && !message.pending);
    const principleText = latestAssistant?.content || latestUser?.content || '';
    const fallbackKeywords = extractLearningKeywords(principleText, 6);

    return {
        session_title: 'Captured Learning',
        core_principles: [
            {
                title: 'Key takeaway',
                summary: truncateLearningText(principleText, 240),
                core_concept: 'Problem decomposition and practical implementation',
                architectural_pattern: null,
                programming_paradigm: 'Procedural',
                language_syntax: [],
                keywords: fallbackKeywords
            }
        ],
        snippets: latestAssistant ? [{ quote: truncateLearningText(latestAssistant.content, 260), reason: 'Most recent assistant explanation' }] : []
    };
}

function normalizeLearningSummary(summary, messages = []) {
    if (!summary || typeof summary !== 'object') {
        return buildFallbackLearningSummary(messages);
    }

    const principlesRaw = Array.isArray(summary.core_principles)
        ? summary.core_principles
        : (summary.title || summary.summary || summary.core_concept)
            ? [summary]
            : [];
    const principles = principlesRaw
        .map(item => ({
            title: truncateLearningText(item?.title || '', 80) || 'Core Principle',
            summary: truncateLearningText(item?.summary || item?.principle || '', 280),
            core_concept: truncateLearningText(item?.core_concept || item?.coreConcept || '', 140),
            architectural_pattern: normalizeNullableLearningText(item?.architectural_pattern ?? item?.architecturalPattern ?? ''),
            programming_paradigm: truncateLearningText(item?.programming_paradigm || item?.programmingParadigm || '', 90),
            language_syntax: uniqueLearningStrings(
                Array.isArray(item?.language_syntax)
                    ? item.language_syntax
                    : Array.isArray(item?.languageSyntax)
                        ? item.languageSyntax
                        : []
            ).slice(0, 10),
            keywords: uniqueLearningStrings(Array.isArray(item?.keywords) ? item.keywords : [])
        }))
        .map(item => ({
            ...item,
            summary: item.summary || '',
            keywords: uniqueLearningStrings([
                ...item.keywords,
                ...item.language_syntax,
                item.core_concept,
                item.architectural_pattern || '',
                item.programming_paradigm
            ]).slice(0, 10)
        }))
        .filter(item => item.summary);

    const snippetsRaw = Array.isArray(summary.snippets) ? summary.snippets : [];
    const snippets = snippetsRaw
        .map(item => ({
            quote: truncateLearningText(item?.quote || item?.snippet || '', 320),
            reason: truncateLearningText(item?.reason || '', 120)
        }))
        .filter(item => item.quote);

    if (!principles.length && !snippets.length) {
        return buildFallbackLearningSummary(messages);
    }

    return {
        session_title: truncateLearningText(summary.session_title || summary.title || '', 80),
        core_principles: principles,
        snippets
    };
}

function findMessageByQuote(messages = [], quote = '') {
    const normalizedQuote = cleanLearningText(quote).toLowerCase();
    if (!normalizedQuote) return null;
    return messages.find(message => cleanLearningText(message.content || '').toLowerCase().includes(normalizedQuote)) || null;
}

async function captureCurrentChatLearning() {
    if (isReferenceReadOnlyMode()) {
        showToast('This referenced session is read-only');
        return;
    }

    const context = getCurrentChatContextDescriptor();
    if (!context) {
        showToast('Open a chat first');
        return;
    }

    const messages = (context.messages || []).filter(message => !message.pending);
    if (messages.length < 2) {
        showToast('Need more chat messages first');
        return;
    }

    const provider = getChatProvider(context.scope);
    const model = getChatModel(context.scope, provider);
    const history = buildAIHistoryFromMessages(messages).slice(-40);
    const knownConceptTaxonomy = getLearningConceptRecordsSorted(140)
        .map(item => ({
            title: item.title || '',
            coreConcept: item.coreConcept || '',
            architecturalPattern: item.architecturalPattern || '',
            programmingParadigm: item.programmingParadigm || ''
        }))
        .filter(item => item.title)
        .slice(0, 28);
    const knownConceptBlock = knownConceptTaxonomy.length
        ? `Existing concept taxonomy (reuse a title when the underlying mechanism is the same):\n${knownConceptTaxonomy.map(item => {
            const facets = [
                item.coreConcept ? `core=${item.coreConcept}` : '',
                item.architecturalPattern ? `pattern=${item.architecturalPattern}` : '',
                item.programmingParadigm ? `paradigm=${item.programmingParadigm}` : ''
            ].filter(Boolean).join('; ');
            return `- title=${item.title}${facets ? ` (${facets})` : ''}`;
        }).join('\n')}`
        : 'Existing concept taxonomy: none yet.';

    const prompt = [
        'You are an expert computer science taxonomist and knowledge extraction engine.',
        'Analyze the full provided conversation context and extract broad, language-agnostic learning cards.',
        knownConceptBlock,
        'Return ONLY valid JSON with this exact shape:',
        '{',
        '  "session_title": "string",',
        '  "core_principles": [',
        '    {',
        '      "title": "string",',
        '      "summary": "string",',
        '      "core_concept": "string",',
        '      "architectural_pattern": "string|null",',
        '      "programming_paradigm": "string",',
        '      "language_syntax": ["string"],',
        '      "keywords": ["string"]',
        '    }',
        '  ],',
        '  "snippets": [',
        '    { "quote": "string", "reason": "string" }',
        '  ]',
        '}',
        'Rules:',
        '- Max 6 principles.',
        '- Core concepts must be language-agnostic computer science concepts.',
        '- Reuse existing concept titles when the core mechanism is the same.',
        '- Keep title mechanism-focused and under 7 words.',
        '- Keep each summary specific and practical (1-2 sentences).',
        '- If no architectural pattern exists, return null for architectural_pattern.',
        '- language_syntax should list concrete syntax features used in the snippet/chat.',
        '- Snippets must be concise and high-signal.'
    ].join('\n');

    const response = await callAI(prompt, {
        scope: context.scope,
        api: provider,
        model,
        history,
        systemPrompts: [
            'You are extracting memory for a mobile coding app.',
            'Return strictly JSON only, no markdown fences.'
        ]
    });

    const parsed = tryParseLearningSummaryJson(response?.content || '');
    const summary = normalizeLearningSummary(parsed, messages);
    const session = getOrCreateLearningSessionForContext({
        ...context,
        title: summary.session_title || context.title
    });
    if (!session) {
        showToast('Could not create learning session');
        return;
    }

    const touchedConcepts = [];
    summary.core_principles.forEach(principle => {
        const savedConcept = addConceptToLearningSession(session, {
            title: principle.title,
            summary: principle.summary,
            principle: principle.summary,
            coreConcept: principle.core_concept,
            architecturalPattern: principle.architectural_pattern,
            programmingParadigm: principle.programming_paradigm,
            languageSyntax: principle.language_syntax,
            keywords: principle.keywords,
            source: 'chat-summary'
        });
        if (savedConcept?.id) {
            touchedConcepts.push({
                ...savedConcept,
                sessionId: session.id,
                sessionTitle: session.title,
                sessionDateKey: session.dateKey
            });
        }
    });

    summary.snippets.forEach(item => {
        const matched = findMessageByQuote(messages, item.quote);
        addSnippetToLearningSession(session, {
            content: matched?.content || item.quote,
            role: matched?.role || 'assistant',
            borderColor: matched?.borderColor || 'green',
            api: matched?.api || '',
            model: matched?.model || '',
            source: 'chat-summary'
        });
    });

    session.updatedAt = new Date().toISOString();
    refreshLearningDerivedData();
    saveState();
    renderLearningHomePreview();
    renderLearningScreen();
    hideModal('bubble-color-modal');
    showToast('Learning captured for this chat');

    if (touchedConcepts.length) {
        syncLearningConceptEmbeddings(touchedConcepts, {
            maxToUpdate: Math.min(6, touchedConcepts.length),
            save: true
        }).catch(() => null);
    }
}

function saveSelectedBubbleAsLearning() {
    if (isReferenceReadOnlyMode()) {
        showToast('This referenced session is read-only');
        return;
    }

    const context = getCurrentChatContextDescriptor();
    if (!context) {
        showToast('Open a chat first');
        return;
    }

    const messages = getCurrentMessages();
    const message = messages[state.selectedBubbleIdx];
    if (!message) {
        showToast('Pick a bubble first');
        return;
    }

    const session = getOrCreateLearningSessionForContext(context);
    if (!session) {
        showToast('Could not create learning session');
        return;
    }

    addSnippetToLearningSession(session, {
        content: message.content,
        role: message.role,
        borderColor: message.borderColor || 'green',
        api: message.api || '',
        model: message.model || '',
        source: 'chat-bubble'
    });

    const firstSentence = cleanLearningText(String(message.content || '').split(/[.!?]\s/)[0] || '');
    const savedConcept = addConceptToLearningSession(session, {
        title: truncateLearningText(firstSentence || 'Saved chat insight', 72),
        summary: truncateLearningText(message.content || '', 260),
        coreConcept: 'Applied reasoning and implementation detail',
        architecturalPattern: null,
        programmingParadigm: 'Mixed',
        languageSyntax: [],
        keywords: extractLearningKeywords(message.content || '', 6),
        source: 'chat-bubble'
    });

    session.updatedAt = new Date().toISOString();
    refreshLearningDerivedData();
    saveState();
    renderLearningHomePreview();
    renderLearningScreen();
    hideModal('bubble-color-modal');
    showToast('Saved to Learning Hub');

    if (savedConcept?.id) {
        syncLearningConceptEmbeddings([{
            ...savedConcept,
            sessionId: session.id,
            sessionTitle: session.title,
            sessionDateKey: session.dateKey
        }], {
            maxToUpdate: 1,
            save: true
        }).catch(() => null);
    }
}

function captureNavigationContext() {
    return {
        activeScreenId: document.querySelector('.screen.active')?.id || 'home-screen',
        currentProject: state.currentProject,
        currentFile: state.currentFile,
        currentGeneralFolder: state.currentGeneralFolder,
        currentChat: deepCloneSimple(state.currentChat)
    };
}

function restoreNavigationContext(context) {
    if (!context || typeof context !== 'object') {
        showScreen('home-screen');
        return;
    }

    const chat = context.currentChat || {};
    if (chat.type === 'section' && context.currentProject !== null && context.currentProject !== undefined && chat.id) {
        if (state.projects[context.currentProject]) {
            state.currentProject = context.currentProject;
            if (context.currentFile !== null && context.currentFile !== undefined) {
                state.currentFile = context.currentFile;
            }
            openSectionChatById(chat.id);
            return;
        }
    }

    if (chat.type === 'general' && context.currentGeneralFolder !== null && context.currentGeneralFolder !== undefined) {
        const folderIndex = state.folders.findIndex(folder => folder.id === context.currentGeneralFolder);
        if (folderIndex >= 0) {
            openFolder(folderIndex);
            return;
        }
    }

    if (context.activeScreenId === 'project-screen' && context.currentProject !== null && context.currentProject !== undefined) {
        if (state.projects[context.currentProject]) {
            state.currentProject = context.currentProject;
            state.currentFile = context.currentFile ?? 0;
            renderFileTabs();
            renderCode({ resetScroll: false });
            showScreen('project-screen');
            return;
        }
    }

    showScreen(context.activeScreenId || 'home-screen');
}

function decodeSessionRefData(rawValue = '') {
    try {
        return decodeURIComponent(String(rawValue || ''));
    } catch (_) {
        return String(rawValue || '');
    }
}

function openLearningSessionById(rawSessionId = '') {
    const sessionId = decodeSessionRefData(rawSessionId);
    const session = getLearningSessionById(sessionId);
    if (!session) {
        showToast('Learning session not found');
        return;
    }

    const returnContext = captureNavigationContext();
    const source = session.source || {};
    let opened = false;

    if (source.type === 'section') {
        const projectIndex = state.projects.findIndex(project => project.id === source.projectId);
        if (projectIndex >= 0 && source.sectionId) {
            state.currentProject = projectIndex;
            if (Number.isFinite(source.fileIdx)) state.currentFile = source.fileIdx;
            openSectionChatById(source.sectionId);
            opened = true;
        }
    } else if (source.type === 'general') {
        const folderIndex = state.folders.findIndex(folder => folder.id === source.folderId);
        if (folderIndex >= 0) {
            openFolder(folderIndex);
            opened = true;
        }
    }

    if (!opened) {
        showToast('Original chat is not available anymore');
        return;
    }

    state.referenceView = {
        targetSessionId: session.id,
        returnContext,
        createdAt: new Date().toISOString()
    };
    saveState();
    applyReferenceReadOnlyUI();
    showToast('Opened memory session (read-only)');
}

function getReferenceSession() {
    if (!state.referenceView?.targetSessionId) return null;
    return getLearningSessionById(state.referenceView.targetSessionId);
}

function isReferenceReadOnlyMode() {
    return Boolean(state.referenceView?.targetSessionId);
}

function applyReferenceReadOnlyUI() {
    const readOnly = isReferenceReadOnlyMode();
    const referenceSession = getReferenceSession();
    const label = referenceSession
        ? `Read-only memory: ${referenceSession.title} (${referenceSession.dateKey || ''})`
        : 'Read-only memory session';

    const chatBanner = document.getElementById('chat-session-jump-banner');
    const chatText = document.getElementById('chat-session-jump-text');
    const generalBanner = document.getElementById('general-session-jump-banner');
    const generalText = document.getElementById('general-session-jump-text');

    if (chatText) chatText.textContent = label;
    if (generalText) generalText.textContent = label;
    if (chatBanner) chatBanner.classList.toggle('is-hidden', !readOnly);
    if (generalBanner) generalBanner.classList.toggle('is-hidden', !readOnly);

    const toggles = [
        document.getElementById('chat-input'),
        document.getElementById('chat-send-btn'),
        document.getElementById('chat-provider-select'),
        document.getElementById('chat-model-select'),
        document.getElementById('general-chat-input'),
        document.getElementById('general-chat-send-btn'),
        document.getElementById('general-chat-provider-select'),
        document.getElementById('general-chat-model-select')
    ];
    toggles.forEach(el => {
        if (!el) return;
        el.disabled = readOnly;
    });
}

function exitLearningSessionReference() {
    if (!state.referenceView) return;
    const returnContext = deepCloneSimple(state.referenceView.returnContext);
    state.referenceView = null;
    saveState();
    restoreNavigationContext(returnContext);
    applyReferenceReadOnlyUI();
    showToast('Back to main session');
}
