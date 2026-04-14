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
                openrouter: 'qwen/qwen-2.5-coder-32b-instruct',
                siliconflow: 'Qwen/Qwen2.5-Coder-7B-Instruct'
            }
        },
        general: {
            provider: 'openrouter',
            models: {
                openrouter: 'meta-llama/llama-3.3-70b-instruct',
                siliconflow: 'Qwen/Qwen2.5-7B-Instruct'
            }
        },
        learning: {
            provider: 'openrouter',
            models: {
                openrouter: 'deepseek/deepseek-chat',
                siliconflow: 'deepseek-ai/DeepSeek-V2.5'
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
        graphExpanded: false,
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
let codeInteractionMode = 'view';
let filePickerExpanded = new Set();
let filePickerSearchTerm = '';
let filePickerSearchMode = 'smart';
let recentChatsSearchTerm = '';
let recentChatsVisibleCount = 20;
let projectPressTimer = null;
let projectLongPressTriggered = false;
let projectActionIndex = null;
let appScreenHistory = [];

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
const MAX_HOME_RECENT_CHATS = 5;
const RECENT_CHATS_PAGE_SIZE = 20;

const OPENROUTER_MODEL_OPTIONS = [
    { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', tags: ['general', 'cheap'] },
    { value: 'openai/gpt-4o', label: 'GPT-4o', tags: ['general'] },
    { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', tags: ['general', 'code'] },
    { value: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku', tags: ['cheap'] },
    { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B', tags: ['general'] },
    { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B (free)', tags: ['general', 'free'] },
    { value: 'mistralai/mistral-small-3.2-24b-instruct:free', label: 'Mistral Small 3.2 (free)', tags: ['general', 'free'] },
    { value: 'qwen/qwen-2.5-coder-32b-instruct', label: 'Qwen 2.5 Coder 32B', tags: ['code', 'free'] },
    { value: 'qwen/qwen-2.5-72b-instruct', label: 'Qwen 2.5 72B Instruct', tags: ['general'] },
    { value: 'deepseek/deepseek-chat', label: 'DeepSeek V3 Chat', tags: ['learning', 'code', 'general'] },
    { value: 'deepseek/deepseek-r1', label: 'DeepSeek R1 (reasoning)', tags: ['learning', 'reason'] },
    { value: 'deepseek/deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill 70B', tags: ['reason'] },
    { value: 'google/gemma-2-27b-it', label: 'Gemma 2 27B IT', tags: ['general'] },
    { value: 'nvidia/llama-3.1-nemotron-70b-instruct', label: 'Nemotron 70B', tags: ['general'] }
];

const SILICONFLOW_MODEL_OPTIONS = [
    { value: 'Qwen/Qwen2.5-7B-Instruct', label: 'Qwen 2.5 7B Instruct', tags: ['cheap', 'free'] },
    { value: 'Qwen/Qwen2.5-14B-Instruct', label: 'Qwen 2.5 14B Instruct', tags: ['general'] },
    { value: 'Qwen/Qwen2.5-32B-Instruct', label: 'Qwen 2.5 32B Instruct', tags: ['general'] },
    { value: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen 2.5 72B Instruct', tags: ['general', 'learning'] },
    { value: 'Qwen/Qwen2.5-Coder-7B-Instruct', label: 'Qwen 2.5 Coder 7B', tags: ['code', 'free'] },
    { value: 'Qwen/Qwen2.5-Coder-32B-Instruct', label: 'Qwen 2.5 Coder 32B', tags: ['code'] },
    { value: 'THUDM/GLM-4-9B-Chat', label: 'GLM-4 9B Chat', tags: ['general', 'free'] },
    { value: 'deepseek-ai/DeepSeek-V2.5', label: 'DeepSeek V2.5', tags: ['learning', 'code'] },
    { value: 'deepseek-ai/DeepSeek-Coder-V2-Instruct', label: 'DeepSeek Coder V2', tags: ['code'] },
    { value: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B', label: 'DeepSeek R1 Distill Qwen 32B', tags: ['reason'] },
    { value: 'meta-llama/Meta-Llama-3.1-8B-Instruct', label: 'Llama 3.1 8B', tags: ['cheap', 'free'] }
];

// Per-scope recommended defaults. Kept in sync with chatConfig seed above.
// Used by ensureStateShape() to pick sensible defaults for fresh state and
// by getDefaultModelForProviderInScope() when callers want a task-aware default.
const SCOPE_RECOMMENDED_MODELS = {
    section: {
        openrouter: 'qwen/qwen-2.5-coder-32b-instruct',
        siliconflow: 'Qwen/Qwen2.5-Coder-7B-Instruct'
    },
    general: {
        openrouter: 'meta-llama/llama-3.3-70b-instruct',
        siliconflow: 'Qwen/Qwen2.5-7B-Instruct'
    },
    learning: {
        openrouter: 'deepseek/deepseek-chat',
        siliconflow: 'deepseek-ai/DeepSeek-V2.5'
    }
};

const CHAT_SCOPES = ['section', 'general', 'learning'];

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

    // Vectors live in their own localStorage key (see 17-learning-embeddings.js).
    // Strip any stray `.vector` arrays from the embedding metadata map so the
    // main state blob never grows with vector data (large arrays balloon
    // JSON.parse time at every boot).
    const hub = snapshot.learningHub;
    if (hub && typeof hub === 'object' && hub.embeddings && typeof hub.embeddings === 'object') {
        const slim = {};
        Object.keys(hub.embeddings).forEach(id => {
            const record = hub.embeddings[id];
            if (!record || typeof record !== 'object') return;
            const { vector: _discard, ...meta } = record;
            slim[id] = meta;
        });
        snapshot.learningHub = { ...hub, embeddings: slim };
    }

    return snapshot;
}

function getProviderModelOptions(provider) {
    return provider === 'siliconflow' ? SILICONFLOW_MODEL_OPTIONS : OPENROUTER_MODEL_OPTIONS;
}

function getDefaultModelForProvider(provider) {
    return provider === 'siliconflow' ? DEFAULT_SILICONFLOW_MODEL : DEFAULT_OPENROUTER_MODEL;
}

function getDefaultModelForProviderInScope(provider, scope = 'section') {
    const key = CHAT_SCOPES.includes(scope) ? scope : 'section';
    const providerKey = API_PROVIDERS.includes(provider) ? provider : 'openrouter';
    const recommended = SCOPE_RECOMMENDED_MODELS?.[key]?.[providerKey];
    return recommended || getDefaultModelForProvider(providerKey);
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

    CHAT_SCOPES.forEach(scope => {
        const cfg = state.chatConfig[scope] || {};
        const provider = API_PROVIDERS.includes(cfg.provider) ? cfg.provider : state.activeAPI;
        const models = cfg.models && typeof cfg.models === 'object' ? cfg.models : {};

        state.chatConfig[scope] = {
            provider,
            models: {
                openrouter: String(models.openrouter || getDefaultModelForProviderInScope('openrouter', scope)),
                siliconflow: String(models.siliconflow || getDefaultModelForProviderInScope('siliconflow', scope))
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
        if (!project.highlightLevels || typeof project.highlightLevels !== 'object') project.highlightLevels = {};
        if (!project.chats || typeof project.chats !== 'object') project.chats = {};
        if (!project.lineChats || typeof project.lineChats !== 'object') project.lineChats = {};
        if (!project.linePins || typeof project.linePins !== 'object') project.linePins = {};
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

        Object.keys(project.highlightLevels).forEach(fileKey => {
            const byLine = project.highlightLevels[fileKey];
            if (!byLine || typeof byLine !== 'object') {
                delete project.highlightLevels[fileKey];
                return;
            }
            Object.keys(byLine).forEach(lineKey => {
                const level = Number(byLine[lineKey]);
                if (!Number.isInteger(level) || level < 1) delete byLine[lineKey];
                else byLine[lineKey] = Math.min(3, level);
            });
            if (!Object.keys(byLine).length) delete project.highlightLevels[fileKey];
        });

        Object.keys(project.lineChats).forEach(lineChatId => {
            const chat = project.lineChats[lineChatId];
            if (!chat || typeof chat !== 'object') {
                delete project.lineChats[lineChatId];
                return;
            }
            if (!Array.isArray(chat.messages)) chat.messages = [];
            chat.updatedAt = String(chat.updatedAt || chat.createdAt || '');
            chat.fileIdx = Number.isInteger(Number(chat.fileIdx)) ? Number(chat.fileIdx) : null;
            chat.lineIdx = Number.isInteger(Number(chat.lineIdx)) ? Number(chat.lineIdx) : null;
        });

        Object.keys(project.linePins).forEach(fileKey => {
            const byLine = project.linePins[fileKey];
            if (!byLine || typeof byLine !== 'object') {
                delete project.linePins[fileKey];
                return;
            }
            Object.keys(byLine).forEach(lineKey => {
                const chatId = String(byLine[lineKey] || '').trim();
                if (!chatId) delete byLine[lineKey];
                else byLine[lineKey] = chatId;
            });
            if (!Object.keys(byLine).length) delete project.linePins[fileKey];
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
    // Embedding records: metadata only. Vector arrays live in a separate
    // vector store (see 17-learning-embeddings.js) so the main state blob
    // stays small. Legacy persisted states that still carry an inline
    // `.vector` field are migrated on the spot by migrateInlineLearningVectors.
    const rawEmbeddings = state.learningHub.embeddings && typeof state.learningHub.embeddings === 'object'
        ? state.learningHub.embeddings
        : {};
    const normalizedEmbeddings = {};
    Object.keys(rawEmbeddings).forEach(conceptId => {
        const item = rawEmbeddings[conceptId];
        if (!item || typeof item !== 'object') return;
        const id = String(conceptId || '');
        if (!id) return;
        const hasInlineVector = Array.isArray(item.vector) && item.vector.length >= 24;
        const signature = String(item.signature || '');
        // Keep records that either (a) still carry a legacy inline vector, or
        // (b) already have a signature from a previous run. Empty records are
        // dropped — no point retaining them.
        if (!hasInlineVector && !signature && !item.nativeSignature) return;
        normalizedEmbeddings[id] = {
            model: String(item.model || ''),
            api: String(item.api || ''),
            updatedAt: String(item.updatedAt || ''),
            signature,
            nativeSyncedAt: String(item.nativeSyncedAt || ''),
            nativeSignature: String(item.nativeSignature || '')
        };
        // Carry the inline vector forward just long enough for the migration
        // helper below to move it into the dedicated vector store.
        if (hasInlineVector) normalizedEmbeddings[id].vector = item.vector;
    });
    state.learningHub.embeddings = normalizedEmbeddings;
    if (typeof migrateInlineLearningVectors === 'function') {
        migrateInlineLearningVectors(normalizedEmbeddings);
    }
    const graphMode = String(state.learningHub.graphMode || '').toLowerCase();
    state.learningHub.graphMode = ['connections', 'recency', 'source'].includes(graphMode) ? graphMode : 'connections';
    const graphZoom = Number(state.learningHub.graphZoom);
    state.learningHub.graphZoom = Number.isFinite(graphZoom)
        ? Math.min(2.2, Math.max(1, graphZoom))
        : 1.45;
    state.learningHub.graphExpanded = Boolean(state.learningHub.graphExpanded);
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

function getLineChatId(fileIdx, lineIdx) {
    return `line:${Number(fileIdx)}:${Number(lineIdx)}`;
}

function parseLineChatMeta(lineChatId = '') {
    const raw = String(lineChatId || '').trim();
    if (!raw.startsWith('line:')) {
        return { fileIdx: null, lineIdx: null };
    }
    const parts = raw.split(':');
    const fileIdx = Number(parts[1]);
    const lineIdx = Number(parts[2]);
    return {
        fileIdx: Number.isInteger(fileIdx) ? fileIdx : null,
        lineIdx: Number.isInteger(lineIdx) ? lineIdx : null
    };
}

function getHighlightLevel(project, fileIdx, lineIdx) {
    if (!project || !project.highlightLevels) return 1;
    const byLine = project.highlightLevels[String(fileIdx)];
    if (!byLine || typeof byLine !== 'object') return 1;
    const value = Number(byLine[String(lineIdx)]);
    if (!Number.isInteger(value) || value < 1) return 1;
    return Math.min(3, value);
}

function setHighlightLevel(project, fileIdx, lineIdx, level = 1) {
    if (!project) return;
    if (!project.highlightLevels || typeof project.highlightLevels !== 'object') {
        project.highlightLevels = {};
    }
    const fileKey = String(fileIdx);
    if (!project.highlightLevels[fileKey] || typeof project.highlightLevels[fileKey] !== 'object') {
        project.highlightLevels[fileKey] = {};
    }
    project.highlightLevels[fileKey][String(lineIdx)] = Math.min(3, Math.max(1, Number(level) || 1));
}

function clearHighlightLevel(project, fileIdx, lineIdx) {
    if (!project?.highlightLevels) return;
    const fileKey = String(fileIdx);
    const byLine = project.highlightLevels[fileKey];
    if (!byLine || typeof byLine !== 'object') return;
    delete byLine[String(lineIdx)];
    if (!Object.keys(byLine).length) delete project.highlightLevels[fileKey];
}

function getLinePinChatId(project, fileIdx, lineIdx) {
    if (!project?.linePins) return '';
    const byLine = project.linePins[String(fileIdx)];
    if (!byLine || typeof byLine !== 'object') return '';
    return String(byLine[String(lineIdx)] || '').trim();
}

function setLinePinChatId(project, fileIdx, lineIdx, chatId = '') {
    if (!project) return;
    if (!project.linePins || typeof project.linePins !== 'object') project.linePins = {};
    const fileKey = String(fileIdx);
    if (!project.linePins[fileKey] || typeof project.linePins[fileKey] !== 'object') {
        project.linePins[fileKey] = {};
    }
    const value = String(chatId || '').trim();
    if (value) {
        project.linePins[fileKey][String(lineIdx)] = value;
    } else {
        delete project.linePins[fileKey][String(lineIdx)];
    }
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

        Object.entries(project.lineChats || {}).forEach(([lineChatId, chat]) => {
            if (!chat || !Array.isArray(chat.messages) || chat.messages.length === 0) return;
            const meta = parseLineChatMeta(lineChatId);
            if (!Number.isInteger(meta.fileIdx) || !Number.isInteger(meta.lineIdx)) return;
            const fileName = String(project.files?.[meta.fileIdx]?.name || `File ${meta.fileIdx + 1}`);
            const updatedAt = String(chat.updatedAt || project.lastOpenedAt || project.created || '');
            const updatedMs = Number.isFinite(Date.parse(updatedAt)) ? Date.parse(updatedAt) : 0;
            const projectName = String(project.name || 'Project');

            items.push({
                type: 'line',
                updatedAt,
                updatedMs,
                lineChatId,
                lineIdx: meta.lineIdx,
                fileIdx: meta.fileIdx,
                projectIndex,
                projectName,
                fileName,
                title: `Line ${meta.lineIdx + 1} Note`,
                subtitle: `${projectName} | ${fileName} | L${meta.lineIdx + 1}`,
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
    return String(model || getDefaultModelForProviderInScope(selectedProvider, scope));
}

function setChatProvider(scope = 'section', provider = 'openrouter') {
    ensureStateShape();
    const cfg = getChatConfig(scope);
    const nextProvider = API_PROVIDERS.includes(provider) ? provider : 'openrouter';
    cfg.provider = nextProvider;
    if (!cfg.models[nextProvider]) {
        cfg.models[nextProvider] = getDefaultModelForProviderInScope(nextProvider, scope);
    }
}

function setChatModel(scope = 'section', model = '', provider = '') {
    ensureStateShape();
    const cfg = getChatConfig(scope);
    const selectedProvider = provider || cfg.provider;
    if (!API_PROVIDERS.includes(selectedProvider)) return;

    const nextModel = String(model || '').trim() || getDefaultModelForProviderInScope(selectedProvider, scope);
    cfg.models[selectedProvider] = nextModel;

    // Legacy top-level model fields track the 'section' scope so older code
    // paths that still read state.openrouterModel / state.siliconflowModel
    // see an up-to-date value for the primary chat flow.
    if (scope === 'section') {
        if (selectedProvider === 'openrouter') state.openrouterModel = nextModel;
        if (selectedProvider === 'siliconflow') state.siliconflowModel = nextModel;
    }
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
