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

function addConceptToLearningSession(session, concept = {}) {
    if (!session) return null;

    const title = truncateLearningText(concept.title || '', 80) || 'Core Principle';
    const principle = truncateLearningText(concept.principle || concept.summary || concept.content || '', 280);
    if (!principle) return null;

    const keywords = uniqueLearningStrings([
        ...(Array.isArray(concept.keywords) ? concept.keywords : []),
        ...extractLearningKeywords(`${title} ${principle}`, 8)
    ]).slice(0, 8);

    const normalizedKey = `${title.toLowerCase()}|${principle.slice(0, 80).toLowerCase()}`;
    const duplicate = session.concepts.find(item => {
        const otherKey = `${String(item.title || '').toLowerCase()}|${String(item.principle || '').slice(0, 80).toLowerCase()}`;
        return normalizedKey === otherKey;
    });
    if (duplicate) return duplicate;

    const newConcept = {
        id: createLearningId('concept'),
        title,
        principle,
        keywords,
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
                keywords: Array.isArray(concept.keywords) ? concept.keywords : [],
                createdAt: concept.createdAt || session.updatedAt || session.createdAt || '',
                source: concept.source || 'summary'
            });
        });
    });
    return records;
}

function calculateLearningLinks(concepts = []) {
    const links = [];
    for (let i = 0; i < concepts.length; i++) {
        for (let j = i + 1; j < concepts.length; j++) {
            const a = concepts[i];
            const b = concepts[j];
            if (a.sessionId === b.sessionId) continue;
            const setA = new Set((a.keywords || []).map(word => String(word).toLowerCase()));
            const setB = new Set((b.keywords || []).map(word => String(word).toLowerCase()));
            let overlap = 0;
            setA.forEach(word => {
                if (setB.has(word)) overlap += 1;
            });
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
            <div class="list-item learning-session-item">
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
        const reviewCount = reviewCountByConcept.get(concept.id) || 0;
        const latestReview = getLatestLearningReviewChatForConcept(concept.id);
        const safeReviewId = latestReview ? encodeURIComponent(latestReview.id) : '';
        const strengthScore = getConceptStrengthScore(concept.id);
        const strengthPalette = getLearningStrengthPalette(strengthScore);
        const strengthPct = Math.round(strengthScore * 100);
        const strengthLabel = strengthPalette.tone === 'strong' ? 'Strong' : strengthPalette.tone === 'mid' ? 'Medium' : 'Weak';
        const conceptStyle = `--learning-strength-fill:${strengthPalette.fill};--learning-strength-stroke:${strengthPalette.stroke};`;

        return `
            <div class="learning-concept-card" style="${conceptStyle}">
                <div class="learning-concept-title">${escapeHtml(concept.title || 'Core Principle')}</div>
                <div class="learning-concept-meta">${escapeHtml(concept.sessionDateKey || '')} | ${escapeHtml(concept.sessionTitle || 'Session')} | ${reviewCount} review chat${reviewCount === 1 ? '' : 's'} | ${learnerHint}</div>
                <div class="learning-strength-badge">${strengthLabel} ${strengthPct}%</div>
                <div class="learning-concept-principle">${escapeHtml(concept.principle || '')}</div>
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

    body.innerHTML = `
        <div class="learning-concept-title">${escapeHtml(concept.title || 'Core Principle')}</div>
        <div class="learning-concept-meta">${escapeHtml(concept.sessionDateKey || '')} | ${escapeHtml(session?.title || concept.sessionTitle || 'Session')}</div>
        <div class="learning-modal-principle">${escapeHtml(concept.principle || '')}</div>
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
    const lines = [
        `Let's relearn **${concept?.title || 'this concept'}**.`,
        concept?.principle ? `Core principle: ${concept.principle}` : '',
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
    const learnerGemPrompt = typeof getLearnerGemPrompt === 'function'
        ? String(getLearnerGemPrompt() || '').trim()
        : '';

    const prompt = [
        'You are teaching the user a concept they already learned and want to reinforce.',
        `Concept title: ${concept.title || 'Core Principle'}`,
        `Concept principle: ${concept.principle || ''}`,
        `Keywords: ${(concept.keywords || []).join(', ') || 'n/a'}`,
        `Session title: ${session?.title || concept.sessionTitle || 'Session'}`,
        `Session date: ${session?.dateKey || concept.sessionDateKey || ''}`,
        snippetLines ? `Relevant snippets:\n${snippetLines}` : '',
        'Explain clearly, check understanding, and suggest the next small practice step.'
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

    const width = options.width || 340;
    const height = options.height || 230;
    const cx = width / 2;
    const cy = height / 2;
    const sessionRadius = Math.min(width, height) * 0.31;
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
        const radius = isSession ? 10 : 7;
        const labelY = isSession ? 18 : 14;
        const labelClass = isSession ? 'learning-graph-label session' : 'learning-graph-label concept';
        const visual = getLearningGraphNodeVisual(node, mode);
        const actionAttr = isSession
            ? `data-action="open-learning-session" data-session-id="${encodeURIComponent(node.sessionId || '')}"`
            : `data-action="open-learning-concept" data-concept-id="${encodeURIComponent(node.conceptId || '')}"`;
        const title = isSession ? `Open Session: ${node.label}` : `Open Concept: ${node.label}`;
        return `
            <g class="learning-graph-node ${isSession ? 'session' : 'concept'} interactive" ${actionAttr}>
                <title>${escapeHtml(title)}</title>
                <circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${radius}" fill="${visual.fill}" stroke="${visual.stroke}" stroke-width="${isSession ? '1.2' : '1.1'}"></circle>
                <text x="${node.x.toFixed(1)}" y="${(node.y + labelY).toFixed(1)}" text-anchor="middle" class="${labelClass}">${escapeHtml(node.label)}</text>
            </g>
        `;
    }).join('');

    const showModeControls = Boolean(options.showModeControls);
    const modeMeta = getLearningGraphModeMeta(mode);
    const controlsHtml = showModeControls ? `
        <div class="learning-graph-controls">
            ${LEARNING_GRAPH_MODES.map(key => {
                const meta = getLearningGraphModeMeta(key);
                const active = key === mode ? 'active' : '';
                return `<button class="learning-graph-mode-btn ${active}" data-action="set-learning-graph-mode" data-mode="${key}">${meta.label}</button>`;
            }).join('')}
        </div>
        <div class="learning-graph-mode-desc">${escapeHtml(modeMeta.description)}</div>
    ` : '';

    container.innerHTML = `
        ${controlsHtml}
        <div class="learning-graph-wrap">
            <svg viewBox="0 0 ${width} ${height}" class="learning-graph-svg" aria-label="Knowledge graph">
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
    `;
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
        maxSessions: 8,
        maxConceptsPerSession: 2,
        width: 340,
        height: 240
    });
    renderLearningSnippets('learning-snippets-list');
}

function scoreLearningSessionForQuery(session, tokens = []) {
    if (!tokens.length) return 0;
    const corpus = [
        session.title || '',
        ...(session.concepts || []).map(item => `${item.title || ''} ${item.principle || ''} ${(item.keywords || []).join(' ')}`),
        ...(session.snippets || []).map(item => item.content || '')
    ].join(' ').toLowerCase();

    let score = 0;
    tokens.forEach(token => {
        if (corpus.includes(token)) score += 1;
    });
    return score;
}

function getRelevantLearningSessions(query = '', limit = 3) {
    const sessions = getSortedLearningSessions();
    if (!sessions.length) return [];

    const tokens = tokenizeLearningText(query);
    const scored = sessions.map(session => ({
        session,
        score: scoreLearningSessionForQuery(session, tokens)
    }));

    const relevant = scored
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(entry => entry.session);

    if (relevant.length > 0) return relevant;
    return sessions.slice(0, Math.min(limit, 2));
}

function getLearningSystemPromptForQuery(query = '') {
    refreshLearningDerivedData();
    if (!state.learningHub.sessions.length) return '';

    const sessions = getRelevantLearningSessions(query, 3);
    if (!sessions.length) return '';

    const memoryLines = sessions.map(session => {
        const conceptSummary = (session.concepts || []).slice(0, 2).map(concept => concept.title || '').filter(Boolean).join(', ');
        return `- id=${session.id}; date=${session.dateKey || ''}; title=${session.title || 'Session'}; concepts=${conceptSummary || 'n/a'}`;
    }).join('\n');

    return [
        'Memory context from prior sessions (use only if relevant):',
        memoryLines,
        'If you reference one of these sessions, include this exact token format once:',
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

    return {
        session_title: 'Captured Learning',
        core_principles: [
            {
                title: 'Key takeaway',
                principle: truncateLearningText(principleText, 240),
                keywords: extractLearningKeywords(principleText, 6)
            }
        ],
        snippets: latestAssistant ? [{ quote: truncateLearningText(latestAssistant.content, 260), reason: 'Most recent assistant explanation' }] : []
    };
}

function normalizeLearningSummary(summary, messages = []) {
    if (!summary || typeof summary !== 'object') {
        return buildFallbackLearningSummary(messages);
    }

    const principlesRaw = Array.isArray(summary.core_principles) ? summary.core_principles : [];
    const principles = principlesRaw
        .map(item => ({
            title: truncateLearningText(item?.title || '', 80) || 'Core Principle',
            principle: truncateLearningText(item?.principle || item?.summary || '', 280),
            keywords: uniqueLearningStrings(Array.isArray(item?.keywords) ? item.keywords : [])
        }))
        .filter(item => item.principle);

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
    const history = buildAIHistoryFromMessages(messages).slice(-20);

    const prompt = [
        'Summarize this conversation into concrete learnings.',
        'Return ONLY valid JSON with this exact shape:',
        '{',
        '  "session_title": "string",',
        '  "core_principles": [',
        '    { "title": "string", "principle": "string", "keywords": ["string"] }',
        '  ],',
        '  "snippets": [',
        '    { "quote": "string", "reason": "string" }',
        '  ]',
        '}',
        'Rules:',
        '- Max 6 principles.',
        '- Keep each principle specific and practical.',
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

    summary.core_principles.forEach(principle => {
        addConceptToLearningSession(session, {
            title: principle.title,
            principle: principle.principle,
            keywords: principle.keywords,
            source: 'chat-summary'
        });
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
    addConceptToLearningSession(session, {
        title: truncateLearningText(firstSentence || 'Saved chat insight', 72),
        principle: truncateLearningText(message.content || '', 260),
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
