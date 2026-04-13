// ============ STATE ============
let state = {
    projects: [],
    gems: [],
    folders: [],
    bookmarks: [],
    generalChats: [],
    colorNames: { red: 'Important', green: 'Understood', yellow: 'Review', blue: 'Question', purple: 'Complex' },
    activeAPI: 'openrouter',
    openrouterModel: 'openai/gpt-4o-mini',
    siliconflowModel: 'Qwen/Qwen2.5-7B-Instruct',
    chatConfig: {
        section: {
            provider: 'openrouter',
            models: {
                openrouter: 'openai/gpt-4o-mini',
                siliconflow: 'Qwen/Qwen2.5-7B-Instruct'
            }
        },
        general: {
            provider: 'openrouter',
            models: {
                openrouter: 'openai/gpt-4o-mini',
                siliconflow: 'Qwen/Qwen2.5-7B-Instruct'
            }
        }
    },
    currentProject: null,
    currentFile: null,
    currentChat: null,
    currentColor: 'green',
    selectedBubbleIdx: null,
    currentGeneralFolder: null,
    currentAvatar: null,
    learningHub: {
        sessions: [],
        concepts: [],
        links: [],
        embeddings: {},
        graphMode: 'connections',
        graphZoom: 1.45,
        reviewChats: [],
        activeReviewChatId: null,
        activeConceptId: null
    },
    referenceView: null
};

let isRangeSelectMode = false;
let selectionStartLine = null;
let selectionEndLine = null;
let lastClickedLine = null;
let saveStateTimer = null;
let saveStatePending = false;
let filePickerExpanded = new Set();
let filePickerSearchTerm = '';
let projectPressTimer = null;
let projectLongPressTriggered = false;
let projectActionIndex = null;

const SAVE_DEBOUNCE_MS = 300;
const VIRTUAL_LINE_HEIGHT = 24;
const VIRTUAL_OVERSCAN = 35;
const PROJECT_LONG_PRESS_MS = 450;
const STATE_STORAGE_KEY = 'codelens_state_v2';
const LEGACY_STATE_STORAGE_KEY = 'codelens_state';
const API_KEYS_STORAGE_KEY = 'codelens_api_keys_v1';
const API_KEY_PROVIDERS = ['openrouter', 'siliconflow'];
const API_PROVIDERS = ['openrouter', 'siliconflow'];
const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4o-mini';
const DEFAULT_SILICONFLOW_MODEL = 'Qwen/Qwen2.5-7B-Instruct';
const MAX_PROJECT_RECENT_FILES = 8;
const MAX_RECENT_CHATS = 50;

const OPENROUTER_MODEL_OPTIONS = [
    { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'openai/gpt-4o', label: 'GPT-4o' },
    { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku' },
    { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
    { value: 'mistralai/mistral-small-3.2-24b-instruct:free', label: 'Mistral Small 3.2' }
];

const SILICONFLOW_MODEL_OPTIONS = [
    { value: 'Qwen/Qwen2.5-7B-Instruct', label: 'Qwen 2.5 7B Instruct' },
    { value: 'Qwen/Qwen2.5-32B-Instruct', label: 'Qwen 2.5 32B Instruct' },
    { value: 'Qwen/Qwen2.5-14B-Instruct', label: 'Qwen 2.5 14B Instruct' },
    { value: 'THUDM/GLM-4-9B-Chat', label: 'GLM-4 9B Chat' },
    { value: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen 2.5 72B Instruct' }
];

let apiKeys = {
    openrouter: '',
    siliconflow: ''
};

let codeViewState = {
    fileKey: null,
    lines: [],
    fileLanguage: 'plain',
    highlightCache: new Map(),
    renderStart: -1,
    renderEnd: -1,
    renderScheduled: false,
    viewerInitialized: false
};

const sectionsCache = new Map();
const JS_TOKEN_RE = /(?<comment>\/\/.*$)|(?<string>"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(?<keyword>\b(?:async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|false|finally|for|from|function|if|import|in|instanceof|let|new|null|of|return|static|super|switch|this|throw|true|try|typeof|undefined|var|void|while|with|yield)\b)|(?<number>\b\d+(?:\.\d+)?\b)|(?<function>\b[A-Za-z_$][\w$]*(?=\s*\())|(?<type>\b[A-Z][A-Za-z0-9_]*\b)/g;
const PY_TOKEN_RE = /(?<comment>#.*$)|(?<string>"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(?<keyword>\b(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|False|finally|for|from|global|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|try|while|with|yield)\b)|(?<number>\b\d+(?:\.\d+)?\b)|(?<function>\b[A-Za-z_][A-Za-z0-9_]*(?=\s*\())|(?<type>\b[A-Z][A-Za-z0-9_]*\b)/g;
const JSON_TOKEN_RE = /(?<string>"(?:\\.|[^"\\])*")|(?<number>-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|(?<keyword>\b(?:true|false|null)\b)|(?<operator>[{}\[\]:,])/g;
const HTML_TOKEN_RE = /(?<comment>&lt;!--.*?--&gt;)|(?<keyword>&lt;\/?[A-Za-z][A-Za-z0-9:-]*)|(?<string>"[^"]*"|'[^']*')|(?<operator>\/?&gt;)/g;
const CSS_TOKEN_RE = /(?<comment>\/\*.*?\*\/)|(?<keyword>@[a-zA-Z-]+)|(?<type>\b[a-zA-Z-]+(?=\s*:))|(?<number>\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw)?\b)|(?<string>"[^"]*"|'[^']*')/g;
const MD_TOKEN_RE = /(?<keyword>^#{1,6}\s.*$)|(?<comment>^>\s.*$)|(?<string>`[^`]+`)|(?<function>\[[^\]]+\]\([^)]+\)|https?:\/\/\S+)/g;
const CFG_TOKEN_RE = /(?<comment>#.*$|;.*$)|(?<type>^[A-Za-z0-9_.-]+(?=\s*=))|(?<string>"[^"]*"|'[^']*')|(?<number>\b\d+(?:\.\d+)?\b)|(?<keyword>\b(?:true|false|null)\b)/g;
const ICON_SPRITE_PATH = './assets/icons.svg';

function sanitizeApiKeys(rawKeys = {}) {
    const sanitized = {};
    API_KEY_PROVIDERS.forEach(provider => {
        const raw = typeof rawKeys?.[provider] === 'string' ? rawKeys[provider] : '';
        sanitized[provider] = raw.trim();
    });
    return sanitized;
}

function getApiKeysSnapshot() {
    return { ...apiKeys };
}

function getApiKey(provider) {
    return apiKeys[provider] || '';
}

function setApiKeys(rawKeys = {}) {
    apiKeys = sanitizeApiKeys(rawKeys);
    return getApiKeysSnapshot();
}

function setApiKey(provider, value = '') {
    if (!API_KEY_PROVIDERS.includes(provider)) return '';
    apiKeys[provider] = String(value || '').trim();
    return apiKeys[provider];
}

function persistApiKeysToStorage() {
    const payload = JSON.stringify(getApiKeysSnapshot());

    let savedToNative = false;
    try {
        if (window.NativeSecureStore && typeof window.NativeSecureStore.setApiKeys === 'function') {
            window.NativeSecureStore.setApiKeys(payload);
            savedToNative = true;
        }
    } catch (_) {
        savedToNative = false;
    }

    if (!savedToNative) {
        localStorage.setItem(API_KEYS_STORAGE_KEY, payload);
    }
}

function loadApiKeysFromStorage() {
    let payload = '';

    try {
        if (window.NativeSecureStore && typeof window.NativeSecureStore.getApiKeys === 'function') {
            payload = String(window.NativeSecureStore.getApiKeys() || '');
        }
    } catch (_) {
        payload = '';
    }

    if (!payload) {
        payload = localStorage.getItem(API_KEYS_STORAGE_KEY) || '';
    }

    if (!payload) {
        setApiKeys({});
        return getApiKeysSnapshot();
    }

    try {
        const parsed = JSON.parse(payload);
        setApiKeys(parsed);
    } catch (_) {
        setApiKeys({});
    }

    return getApiKeysSnapshot();
}

function clearStoredApiKeys() {
    setApiKeys({});

    try {
        if (window.NativeSecureStore && typeof window.NativeSecureStore.clearApiKeys === 'function') {
            window.NativeSecureStore.clearApiKeys();
        }
    } catch (_) {
        // ignore bridge issues, local fallback still cleared below
    }

    localStorage.removeItem(API_KEYS_STORAGE_KEY);
}

function migrateLegacyApiKeys(legacyApiKeys = {}) {
    const hasCurrent = API_KEY_PROVIDERS.some(provider => Boolean(getApiKey(provider)));
    if (hasCurrent) return;

    const normalized = sanitizeApiKeys(legacyApiKeys);
    const hasLegacy = API_KEY_PROVIDERS.some(provider => Boolean(normalized[provider]));
    if (!hasLegacy) return;

    setApiKeys(normalized);
    persistApiKeysToStorage();
}

function sanitizePersistedState(rawState = {}) {
    const next = { ...(rawState || {}) };

    if (next.apiKeys && typeof next.apiKeys === 'object') {
        migrateLegacyApiKeys(next.apiKeys);
    }

    delete next.apiKeys;
    return next;
}

function getPersistedStateSnapshot() {
    const snapshot = { ...state };
    delete snapshot.apiKeys;
    return snapshot;
}

function getProviderModelOptions(provider) {
    return provider === 'siliconflow' ? SILICONFLOW_MODEL_OPTIONS : OPENROUTER_MODEL_OPTIONS;
}

function getDefaultModelForProvider(provider) {
    return provider === 'siliconflow' ? DEFAULT_SILICONFLOW_MODEL : DEFAULT_OPENROUTER_MODEL;
}

function ensureStateShape() {
    if (!API_PROVIDERS.includes(state.activeAPI)) {
        state.activeAPI = 'openrouter';
    }

    state.openrouterModel = String(state.openrouterModel || DEFAULT_OPENROUTER_MODEL);
    state.siliconflowModel = String(state.siliconflowModel || DEFAULT_SILICONFLOW_MODEL);

    if (!state.chatConfig || typeof state.chatConfig !== 'object') {
        state.chatConfig = {};
    }

    ['section', 'general'].forEach(scope => {
        const cfg = state.chatConfig[scope] || {};
        const provider = API_PROVIDERS.includes(cfg.provider) ? cfg.provider : state.activeAPI;
        const models = cfg.models && typeof cfg.models === 'object' ? cfg.models : {};

        state.chatConfig[scope] = {
            provider,
            models: {
                openrouter: String(models.openrouter || state.openrouterModel || DEFAULT_OPENROUTER_MODEL),
                siliconflow: String(models.siliconflow || state.siliconflowModel || DEFAULT_SILICONFLOW_MODEL)
            }
        };
    });

    state.projects = Array.isArray(state.projects) ? state.projects : [];
    state.folders = Array.isArray(state.folders) ? state.folders : [];
    state.generalChats = Array.isArray(state.generalChats) ? state.generalChats : [];

    state.projects.forEach(project => {
        if (!project || typeof project !== 'object') return;
        if (!Array.isArray(project.files)) project.files = [];
        if (!project.highlights || typeof project.highlights !== 'object') project.highlights = {};
        if (!project.chats || typeof project.chats !== 'object') project.chats = {};
        if (!Array.isArray(project.avatarChats)) project.avatarChats = [];

        const normalizedRecentFiles = Array.isArray(project.recentFiles)
            ? project.recentFiles
                .map(value => Number(value))
                .filter(value => Number.isInteger(value) && value >= 0 && value < project.files.length)
            : [];
        project.recentFiles = Array.from(new Set(normalizedRecentFiles)).slice(0, MAX_PROJECT_RECENT_FILES);

        Object.keys(project.chats).forEach(sectionId => {
            const chat = project.chats[sectionId];
            if (!chat || typeof chat !== 'object') {
                project.chats[sectionId] = { messages: [], bookmarks: [], updatedAt: '' };
                return;
            }
            if (!Array.isArray(chat.messages)) chat.messages = [];
            if (!Array.isArray(chat.bookmarks)) chat.bookmarks = [];
            chat.updatedAt = String(chat.updatedAt || chat.createdAt || '');
        });
    });

    state.folders.forEach(folder => {
        if (!folder || typeof folder !== 'object') return;
        if (!Array.isArray(folder.snippets)) folder.snippets = [];
    });

    state.generalChats = state.generalChats
        .filter(chat => chat && typeof chat === 'object')
        .map(chat => ({
            folderId: chat.folderId ?? null,
            messages: Array.isArray(chat.messages) ? chat.messages : [],
            updatedAt: String(chat.updatedAt || chat.createdAt || '')
        }));

    if (!state.learningHub || typeof state.learningHub !== 'object') {
        state.learningHub = {};
    }

    const sessions = Array.isArray(state.learningHub.sessions) ? state.learningHub.sessions : [];
    state.learningHub.sessions = sessions.map(session => {
        const id = String(session?.id || '').trim();
        const createdAt = String(session?.createdAt || '');
        const updatedAt = String(session?.updatedAt || createdAt);

        const concepts = Array.isArray(session?.concepts) ? session.concepts : [];
        const snippets = Array.isArray(session?.snippets) ? session.snippets : [];
        const relatedSessionIds = Array.isArray(session?.relatedSessionIds) ? session.relatedSessionIds : [];

        return {
            id,
            sessionKey: String(session?.sessionKey || id || ''),
            title: String(session?.title || 'Learning Session'),
            dateKey: String(session?.dateKey || ''),
            createdAt,
            updatedAt,
            source: session?.source && typeof session.source === 'object' ? session.source : {},
            concepts: concepts.map(item => ({
                id: String(item?.id || ''),
                title: String(item?.title || 'Core Principle'),
                principle: String(item?.principle || item?.summary || ''),
                summary: String(item?.summary || item?.principle || ''),
                coreConcept: String(item?.coreConcept || item?.core_concept || ''),
                architecturalPattern: item?.architecturalPattern === null || item?.architectural_pattern === null
                    ? null
                    : String(item?.architecturalPattern || item?.architectural_pattern || ''),
                programmingParadigm: String(item?.programmingParadigm || item?.programming_paradigm || ''),
                languageSyntax: Array.isArray(item?.languageSyntax)
                    ? item.languageSyntax.map(entry => String(entry || '')).filter(Boolean)
                    : Array.isArray(item?.language_syntax)
                        ? item.language_syntax.map(entry => String(entry || '')).filter(Boolean)
                        : [],
                keywords: Array.isArray(item?.keywords) ? item.keywords.map(word => String(word || '')).filter(Boolean) : [],
                createdAt: String(item?.createdAt || ''),
                source: String(item?.source || 'summary')
            })).filter(item => item.id && (item.principle || item.summary)),
            snippets: snippets.map(item => ({
                id: String(item?.id || ''),
                content: String(item?.content || ''),
                role: String(item?.role || 'assistant'),
                borderColor: String(item?.borderColor || 'green'),
                api: String(item?.api || ''),
                model: String(item?.model || ''),
                createdAt: String(item?.createdAt || ''),
                source: String(item?.source || 'chat-bubble')
            })).filter(item => item.id && item.content),
            relatedSessionIds: relatedSessionIds.map(value => String(value || '')).filter(Boolean)
        };
    }).filter(session => session.id);

    state.learningHub.concepts = Array.isArray(state.learningHub.concepts) ? state.learningHub.concepts : [];
    state.learningHub.links = Array.isArray(state.learningHub.links) ? state.learningHub.links : [];
    const rawEmbeddings = state.learningHub.embeddings && typeof state.learningHub.embeddings === 'object'
        ? state.learningHub.embeddings
        : {};
    const normalizedEmbeddings = {};
    Object.keys(rawEmbeddings).forEach(conceptId => {
        const item = rawEmbeddings[conceptId];
        const vector = Array.isArray(item?.vector)
            ? item.vector.map(value => Number(value)).filter(value => Number.isFinite(value)).slice(0, 256)
            : [];
        if (!vector.length) return;
        normalizedEmbeddings[String(conceptId || '')] = {
            vector,
            model: String(item?.model || ''),
            api: String(item?.api || ''),
            updatedAt: String(item?.updatedAt || ''),
            signature: String(item?.signature || ''),
            nativeSyncedAt: String(item?.nativeSyncedAt || ''),
            nativeSignature: String(item?.nativeSignature || '')
        };
    });
    state.learningHub.embeddings = normalizedEmbeddings;
    const graphMode = String(state.learningHub.graphMode || '').toLowerCase();
    state.learningHub.graphMode = ['connections', 'recency', 'source'].includes(graphMode) ? graphMode : 'connections';
    const graphZoom = Number(state.learningHub.graphZoom);
    state.learningHub.graphZoom = Number.isFinite(graphZoom)
        ? Math.min(2.2, Math.max(1, graphZoom))
        : 1.45;
    const reviewChats = Array.isArray(state.learningHub.reviewChats) ? state.learningHub.reviewChats : [];
    state.learningHub.reviewChats = reviewChats.map(chat => ({
        id: String(chat?.id || ''),
        conceptId: String(chat?.conceptId || ''),
        conceptTitle: String(chat?.conceptTitle || ''),
        sessionId: String(chat?.sessionId || ''),
        createdAt: String(chat?.createdAt || ''),
        updatedAt: String(chat?.updatedAt || chat?.createdAt || ''),
        messages: Array.isArray(chat?.messages)
            ? chat.messages.map(message => ({
                role: message?.role === 'assistant' ? 'assistant' : 'user',
                content: String(message?.content || ''),
                borderColor: String(message?.borderColor || 'green'),
                api: String(message?.api || ''),
                model: String(message?.model || ''),
                pending: Boolean(message?.pending)
            })).filter(message => message.content || message.pending)
            : []
    })).filter(chat => chat.id && chat.conceptId);
    state.learningHub.activeReviewChatId = String(state.learningHub.activeReviewChatId || '');
    state.learningHub.activeConceptId = String(state.learningHub.activeConceptId || '');

    if (!state.referenceView || typeof state.referenceView !== 'object') {
        state.referenceView = null;
    }
}

function touchProjectRecentFile(projectIdx, fileIdx, options = {}) {
    const project = state.projects?.[projectIdx];
    if (!project || !Array.isArray(project.files)) return;

    const idx = Number(fileIdx);
    if (!Number.isInteger(idx) || idx < 0 || idx >= project.files.length) return;

    if (!Array.isArray(project.recentFiles)) project.recentFiles = [];
    project.recentFiles = project.recentFiles
        .map(value => Number(value))
        .filter(value => Number.isInteger(value) && value >= 0 && value < project.files.length && value !== idx);
    project.recentFiles.unshift(idx);
    if (project.recentFiles.length > MAX_PROJECT_RECENT_FILES) {
        project.recentFiles = project.recentFiles.slice(0, MAX_PROJECT_RECENT_FILES);
    }
    project.lastOpenedAt = new Date().toISOString();

    if (options.save !== false) saveState();
}

function getProjectRecentFiles(project, limit = MAX_PROJECT_RECENT_FILES) {
    if (!project || !Array.isArray(project.files)) return [];
    const maxItems = Math.max(1, Number(limit) || MAX_PROJECT_RECENT_FILES);
    const indexList = Array.isArray(project.recentFiles) ? project.recentFiles : [];

    return indexList
        .map(value => Number(value))
        .filter(value => Number.isInteger(value) && value >= 0 && value < project.files.length)
        .slice(0, maxItems)
        .map(idx => ({
            idx,
            file: project.files[idx]
        }));
}

function getChatPreviewText(messages = [], maxLen = 120) {
    if (!Array.isArray(messages) || messages.length === 0) return '';
    const latest = messages
        .slice()
        .reverse()
        .find(message => message && !message.pending && String(message.content || '').trim());
    const text = String(latest?.content || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return `${text.slice(0, Math.max(0, maxLen - 3))}...`;
}

function parseSectionMeta(sectionId = '') {
    const raw = String(sectionId || '').trim();
    if (!raw) {
        return {
            fileIdx: null,
            color: 'green',
            start: null,
            end: null
        };
    }

    const parts = raw.split('-');
    const fileIdx = Number(parts[0]);
    const color = String(parts[1] || 'green');
    const start = Number(parts[2]);
    const end = Number(parts[3]);

    return {
        fileIdx: Number.isInteger(fileIdx) ? fileIdx : null,
        color,
        start: Number.isInteger(start) ? start : null,
        end: Number.isInteger(end) ? end : null
    };
}

function buildRecentChats(limit = MAX_RECENT_CHATS) {
    const items = [];
    const maxItems = Math.max(1, Number(limit) || MAX_RECENT_CHATS);

    state.projects.forEach((project, projectIndex) => {
        if (!project || typeof project !== 'object' || !project.chats || typeof project.chats !== 'object') return;

        Object.entries(project.chats).forEach(([sectionId, chat]) => {
            if (!chat || !Array.isArray(chat.messages) || chat.messages.length === 0) return;

            const sectionMeta = parseSectionMeta(sectionId);
            const fileName = Number.isInteger(sectionMeta.fileIdx)
                ? String(project.files?.[sectionMeta.fileIdx]?.name || `File ${sectionMeta.fileIdx + 1}`)
                : 'File';
            const lineText = Number.isInteger(sectionMeta.start) && Number.isInteger(sectionMeta.end)
                ? `L${sectionMeta.start + 1}-${sectionMeta.end + 1}`
                : 'Section';
            const updatedAt = String(chat.updatedAt || project.lastOpenedAt || project.created || '');
            const updatedMs = Number.isFinite(Date.parse(updatedAt)) ? Date.parse(updatedAt) : 0;
            const labelColor = state.colorNames?.[sectionMeta.color] || sectionMeta.color || 'Section';
            const projectName = String(project.name || 'Project');

            items.push({
                type: 'section',
                updatedAt,
                updatedMs,
                sectionId,
                projectIndex,
                projectName,
                fileName,
                title: `${labelColor} Section`,
                subtitle: `${projectName} | ${fileName} | ${lineText}`,
                preview: getChatPreviewText(chat.messages, 140)
            });
        });
    });

    state.generalChats.forEach((chat, chatIdx) => {
        if (!chat || !Array.isArray(chat.messages) || chat.messages.length === 0) return;
        const folderId = chat.folderId ?? null;
        const folder = state.folders.find(item => item?.id === folderId);
        const folderName = String(folder?.name || 'General');
        const updatedAt = String(chat.updatedAt || '');
        const updatedMs = Number.isFinite(Date.parse(updatedAt)) ? Date.parse(updatedAt) : 0;

        items.push({
            type: 'general',
            updatedAt,
            updatedMs,
            chatIdx,
            folderId,
            folderName,
            title: `General: ${folderName}`,
            subtitle: 'General Chat',
            preview: getChatPreviewText(chat.messages, 140)
        });
    });

    return items
        .sort((a, b) => b.updatedMs - a.updatedMs)
        .slice(0, maxItems);
}

function touchSectionChatActivity(projectIdx, sectionId, options = {}) {
    const project = state.projects?.[projectIdx];
    if (!project || !project.chats || !project.chats[sectionId]) return;
    project.chats[sectionId].updatedAt = new Date().toISOString();
    if (typeof renderHomeRecentChatsPreview === 'function') renderHomeRecentChatsPreview();
    const recentScreen = document.getElementById('recent-chats-screen');
    if (recentScreen?.classList.contains('active') && typeof renderRecentChatsScreen === 'function') {
        renderRecentChatsScreen();
    }
    if (options.save !== false) saveState();
}

function touchGeneralChatActivity(chatIdx, options = {}) {
    const idx = Number(chatIdx);
    if (!Number.isInteger(idx) || idx < 0 || idx >= state.generalChats.length) return;
    const chat = state.generalChats[idx];
    if (!chat) return;
    chat.updatedAt = new Date().toISOString();
    if (typeof renderHomeRecentChatsPreview === 'function') renderHomeRecentChatsPreview();
    const recentScreen = document.getElementById('recent-chats-screen');
    if (recentScreen?.classList.contains('active') && typeof renderRecentChatsScreen === 'function') {
        renderRecentChatsScreen();
    }
    if (options.save !== false) saveState();
}

function getChatConfig(scope = 'section') {
    ensureStateShape();
    return state.chatConfig[scope] || state.chatConfig.section;
}

function getChatProvider(scope = 'section') {
    return getChatConfig(scope).provider;
}

function getChatModel(scope = 'section', provider = '') {
    const cfg = getChatConfig(scope);
    const selectedProvider = provider || cfg.provider;
    const model = cfg.models?.[selectedProvider];
    return String(model || getDefaultModelForProvider(selectedProvider));
}

function setChatProvider(scope = 'section', provider = 'openrouter') {
    ensureStateShape();
    const cfg = getChatConfig(scope);
    const nextProvider = API_PROVIDERS.includes(provider) ? provider : 'openrouter';
    cfg.provider = nextProvider;
    if (!cfg.models[nextProvider]) {
        cfg.models[nextProvider] = getDefaultModelForProvider(nextProvider);
    }
}

function setChatModel(scope = 'section', model = '', provider = '') {
    ensureStateShape();
    const cfg = getChatConfig(scope);
    const selectedProvider = provider || cfg.provider;
    if (!API_PROVIDERS.includes(selectedProvider)) return;

    const nextModel = String(model || '').trim() || getDefaultModelForProvider(selectedProvider);
    cfg.models[selectedProvider] = nextModel;

    if (selectedProvider === 'openrouter') state.openrouterModel = nextModel;
    if (selectedProvider === 'siliconflow') state.siliconflowModel = nextModel;
}

function uiIcon(name, classes = '') {
    const iconName = String(name || '').trim() || 'spark';
    const css = classes ? ` ${classes}` : '';
    return `<svg class="ui-icon${css}" aria-hidden="true"><use href="${ICON_SPRITE_PATH}#i-${iconName}" xlink:href="${ICON_SPRITE_PATH}#i-${iconName}"></use></svg>`;
}

function iconWithText(name, text = '', classes = '') {
    const safeText = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<span class="icon-with-text${classes ? ' ' + classes : ''}">${uiIcon(name)}<span>${safeText}</span></span>`;
}

function normalizeFaceKey(face = '') {
    const raw = String(face || '').trim().toLowerCase();
    if (!raw) return 'debug-bot';

    if (raw.includes('senior')) return 'senior-dev';
    if (raw.includes('teacher')) return 'teacher';
    if (raw.includes('review')) return 'reviewer';
    if (raw.includes('quick')) return 'quick-helper';
    if (raw.includes('debug') || raw.includes('bot') || raw.includes('robot')) return 'debug-bot';

    if (['senior-dev', 'teacher', 'debug-bot', 'reviewer', 'quick-helper', 'spark', 'brain', 'user', 'target', 'bolt', 'bug'].includes(raw)) {
        return raw;
    }

    // Legacy emoji/mojibake fallback from older builds.
    if (raw.includes('ð') || raw.includes('â')) {
        if (raw.includes('§ ')) return 'senior-dev';
        if (raw.includes('‘¨')) return 'teacher';
        if (raw.includes('¤–')) return 'debug-bot';
        if (raw.includes('ž¯')) return 'reviewer';
        if (raw.includes('š¡')) return 'quick-helper';
        return 'debug-bot';
    }

    return 'debug-bot';
}

function getFaceIconName(face = '') {
    const key = normalizeFaceKey(face);
    if (key === 'senior-dev') return 'brain';
    if (key === 'teacher') return 'user';
    if (key === 'debug-bot') return 'bug';
    if (key === 'reviewer') return 'target';
    if (key === 'quick-helper') return 'bolt';
    return 'spark';
}

function renderFaceGlyph(face = '', classes = '') {
    return uiIcon(getFaceIconName(face), classes);
}

function getDefaultAvatars() {
    return [
        { face: 'senior-dev', name: 'Senior Dev', color: 'purple', prompt: 'You are a senior developer with 15 years of experience. Give detailed, professional advice.' },
        { face: 'teacher', name: 'Teacher', color: 'blue', prompt: 'You are a patient teacher. Explain things step by step with examples.' },
        { face: 'debug-bot', name: 'Debug Bot', color: 'green', prompt: 'You are a debugging assistant. Focus on finding and fixing bugs.' },
        { face: 'reviewer', name: 'Code Reviewer', color: 'orange', prompt: 'You are a code reviewer. Point out issues and suggest improvements.' },
        { face: 'quick-helper', name: 'Quick Helper', color: 'yellow', prompt: 'You give quick, concise answers. No fluff, just solutions.' }
    ];
}
