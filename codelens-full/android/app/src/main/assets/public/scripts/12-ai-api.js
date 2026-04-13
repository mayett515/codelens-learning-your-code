// ============ AI API ============
const DEFAULT_API_REQUEST_DELAY_MS = 15000;
const MAX_PENDING_REQUESTS = 30;
const API_POLICIES = {
    openrouter: {
        minDelayMs: 1100,
        retryLimit: 3,
        baseBackoffMs: 3000,
        maxBackoffMs: 45000,
        timeoutMs: 70000
    },
    siliconflow: {
        minDelayMs: 1500,
        retryLimit: 3,
        baseBackoffMs: 3200,
        maxBackoffMs: 50000,
        timeoutMs: 70000
    }
};

const apiLastRequestFinishedAt = {
    openrouter: 0,
    siliconflow: 0
};

const PROVIDER_DISPLAY_NAMES = {
    openrouter: 'OpenRouter',
    siliconflow: 'SiliconFlow'
};

const EMBEDDING_MODELS = {
    siliconflow: [
        'BAAI/bge-m3',
        'Qwen/Qwen3-Embedding-8B',
        'netease-youdao/bce-embedding-base_v1'
    ],
    openrouter: [
        'openai/text-embedding-3-small',
        'nomic-ai/nomic-embed-text-v1.5'
    ]
};

const LEARNING_EMBEDDING_MAX_DIMENSIONS = 256;

const APP_SYSTEM_PROMPT = [
    'You are the AI assistant inside the CodeLens mobile coding app.',
    'The user is editing code and markdown from a phone and wants fast, practical, reliable help.',
    'Always preserve continuity with previous chat turns and use the conversation history provided.',
    'Keep answers concise and actionable, and use markdown code fences when code is needed.'
].join('\n');

let nextApiRequestId = 1;
let pendingApiRequests = [];
let activeApiRequest = null;
let isApiWorkerRunning = false;
let apiCooldownUntil = 0;
let cooldownRelease = null;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getApiPolicy(api) {
    return API_POLICIES[api] || {
        minDelayMs: DEFAULT_API_REQUEST_DELAY_MS,
        retryLimit: 2,
        baseBackoffMs: 5000,
        maxBackoffMs: 60000,
        timeoutMs: 70000
    };
}

function parseRetryAfterMs(value) {
    if (!value) return 0;

    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
        return Math.max(0, Math.floor(numeric * 1000));
    }

    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
        return Math.max(0, parsed - Date.now());
    }

    return 0;
}

function extractErrorMessage(payload, fallback) {
    if (!payload) return fallback;
    if (typeof payload === 'string') return payload;
    if (typeof payload.message === 'string' && payload.message.trim()) return payload.message;

    if (payload.error) {
        if (typeof payload.error === 'string') return payload.error;
        if (typeof payload.error.message === 'string' && payload.error.message.trim()) return payload.error.message;
        if (typeof payload.error.status === 'string' && payload.error.status.trim()) return payload.error.status;
    }

    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
        const first = payload.errors[0];
        if (typeof first === 'string') return first;
        if (first && typeof first.message === 'string' && first.message.trim()) return first.message;
    }

    return fallback;
}

function isRetriableStatus(status) {
    return status === 408 || status === 409 || status === 429 || status >= 500;
}

function isLikelyRetriableMessage(message = '') {
    return /(too many requests|rate limit|resource exhausted|temporarily unavailable|timeout|timed out|network|failed to fetch|service unavailable|upstream)/i.test(String(message));
}

function isLikelyHardLimitMessage(message = '') {
    return /(insufficient balance|insufficient credits|not enough credits|payment required|billing details|quota exceeded[\s\S]*limit:\s*0|free[_\s-]?tier[\s\S]*limit:\s*0)/i.test(String(message));
}

function createApiError(message, options = {}) {
    const err = new Error(message || 'Request failed');
    err.status = options.status || 0;
    err.retriable = Boolean(options.retriable);
    err.retryAfterMs = options.retryAfterMs || 0;
    return err;
}

async function parseJSONResponse(response) {
    const rawText = await response.text();
    if (!rawText) return { data: null, rawText: '' };

    try {
        return { data: JSON.parse(rawText), rawText };
    } catch {
        return { data: null, rawText };
    }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 70000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs));

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
        if (error && error.name === 'AbortError') {
            throw createApiError('Request timed out. Retrying...', { retriable: true });
        }

        throw createApiError(error?.message || 'Network request failed. Retrying...', { retriable: true });
    } finally {
        clearTimeout(timeoutId);
    }
}

function normalizeAIContent(content) {
    if (typeof content === 'string') {
        return content.trim() || 'No response';
    }

    if (Array.isArray(content)) {
        const joined = content.map(item => {
            if (typeof item === 'string') return item;
            if (item && typeof item.text === 'string') return item.text;
            return '';
        }).join('\n').trim();
        return joined || 'No response';
    }

    if (content && typeof content.text === 'string') {
        return content.text.trim() || 'No response';
    }

    return 'No response';
}

function getProviderDisplayName(api = '') {
    return PROVIDER_DISPLAY_NAMES[api] || String(api || '');
}

function normalizeHistoryMessages(history = []) {
    if (!Array.isArray(history)) return [];

    return history
        .map(item => {
            const role = item?.role === 'assistant' ? 'assistant' : item?.role === 'system' ? 'system' : item?.role === 'user' ? 'user' : '';
            const content = normalizeAIContent(item?.content || '');
            if (!role || !content) return null;
            return { role, content };
        })
        .filter(Boolean);
}

function buildApiMessages(prompt, history = [], systemPrompts = []) {
    const messages = [{ role: 'system', content: APP_SYSTEM_PROMPT }];

    if (Array.isArray(systemPrompts)) {
        systemPrompts
            .map(text => String(text || '').trim())
            .filter(Boolean)
            .forEach(text => messages.push({ role: 'system', content: text }));
    }

    normalizeHistoryMessages(history).forEach(message => messages.push(message));
    messages.push({ role: 'user', content: String(prompt || '').trim() });
    return messages;
}

function getApiKeyMissingMessage(api) {
    if (api === 'openrouter') return 'Please set your OpenRouter API key in Settings';
    if (api === 'siliconflow') return 'Please set your SiliconFlow API key in Settings';
    return 'Please set your API key in Settings';
}

function normalizeAIResultPayload(payload, api, model) {
    if (payload && typeof payload === 'object' && typeof payload.content === 'string') {
        return {
            content: payload.content,
            api: payload.api || api,
            model: payload.model || model,
            error: Boolean(payload.error),
            cancelled: Boolean(payload.cancelled)
        };
    }

    return {
        content: normalizeAIContent(payload),
        api,
        model,
        error: false,
        cancelled: false
    };
}

function getRemainingDelayMs(api) {
    const policy = getApiPolicy(api);
    const lastFinishedAt = apiLastRequestFinishedAt[api] || 0;
    if (!lastFinishedAt) return 0;

    const elapsed = Date.now() - lastFinishedAt;
    return Math.max(0, policy.minDelayMs - elapsed);
}

function waitWithCancelableCooldown(ms) {
    if (ms <= 0) return Promise.resolve();

    apiCooldownUntil = Date.now() + ms;
    updateAIQueueUI();

    return new Promise(resolve => {
        const tickId = setInterval(updateAIQueueUI, 1000);
        const timeoutId = setTimeout(() => {
            clearInterval(tickId);
            apiCooldownUntil = 0;
            cooldownRelease = null;
            updateAIQueueUI();
            resolve();
        }, ms);

        cooldownRelease = () => {
            clearInterval(tickId);
            clearTimeout(timeoutId);
            apiCooldownUntil = 0;
            cooldownRelease = null;
            updateAIQueueUI();
            resolve();
        };
    });
}

function isAIInputBlocked() {
    return false;
}

function updateAIQueueUI() {
    const now = Date.now();
    const cooldownSeconds = Math.max(0, Math.ceil((apiCooldownUntil - now) / 1000));
    const queuedCount = pendingApiRequests.length;

    let statusText = 'AI idle';
    if (activeApiRequest) {
        const attempt = activeApiRequest.attempt || 1;
        const maxAttempts = activeApiRequest.maxAttempts || 1;
        const attemptInfo = maxAttempts > 1 ? ` (${attempt}/${maxAttempts})` : '';
        const provider = getProviderDisplayName(activeApiRequest.api);
        const model = activeApiRequest.model ? ` • ${activeApiRequest.model}` : '';
        statusText = `Sending with ${provider}${model}${attemptInfo}...`;
        if (queuedCount > 0) statusText += ` | queued ${queuedCount}`;
    } else if (queuedCount > 0 && cooldownSeconds > 0) {
        statusText = `Queued: ${queuedCount} | next in ${cooldownSeconds}s`;
    } else if (queuedCount > 0) {
        statusText = `Queued: ${queuedCount}`;
    } else if (cooldownSeconds > 0) {
        statusText = `Cooldown: ${cooldownSeconds}s`;
    }

    ['chat-queue-status', 'general-queue-status', 'learning-review-queue-status'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = statusText;
    });

    // Keep send buttons enabled so user can continue queueing prompts.
    ['chat-send-btn', 'general-chat-send-btn', 'learning-review-send-btn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = false;
    });

    const canCancel = queuedCount > 0;
    ['chat-queue-cancel', 'general-queue-cancel', 'learning-review-queue-cancel'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = !canCancel;
    });
}

function cancelPendingRequests() {
    const cancelled = pendingApiRequests.splice(0, pendingApiRequests.length);
    cancelled.forEach(req => req.resolve({
        content: 'Cancelled queued request',
        api: req.api,
        model: req.model,
        error: true,
        cancelled: true
    }));

    if (cancelled.length > 0 && cooldownRelease && !activeApiRequest) {
        cooldownRelease();
    }

    updateAIQueueUI();

    if (cancelled.length > 0) {
        showToast(`Cancelled ${cancelled.length} queued request${cancelled.length === 1 ? '' : 's'}`);
    }
}

function computeRetryDelayMs(api, attempt, retryAfterMs = 0) {
    const policy = getApiPolicy(api);
    const expDelay = Math.min(
        policy.maxBackoffMs,
        policy.baseBackoffMs * Math.pow(2, Math.max(0, attempt - 1))
    );
    const jitter = Math.floor(Math.random() * 700);
    const merged = Math.max(expDelay + jitter, retryAfterMs || 0);
    return Math.max(500, Math.min(policy.maxBackoffMs, merged));
}

function shouldRetryError(error) {
    if (!error) return false;
    const message = String(error.message || '');

    if (Number(error.status || 0) === 402) return false;
    if (isLikelyHardLimitMessage(message)) return false;

    if (error.retriable) return true;
    if (error.status && isRetriableStatus(error.status)) return true;
    return isLikelyRetriableMessage(message);
}

async function withApiRetries(api, requestFn) {
    const policy = getApiPolicy(api);
    const maxAttempts = Math.max(1, (policy.retryLimit || 0) + 1);
    let attempt = 0;

    while (attempt < maxAttempts) {
        attempt += 1;

        if (activeApiRequest) {
            activeApiRequest.attempt = attempt;
            activeApiRequest.maxAttempts = maxAttempts;
            updateAIQueueUI();
        }

        try {
            return await requestFn();
        } catch (error) {
            if (attempt >= maxAttempts || !shouldRetryError(error)) {
                throw error;
            }

            const waitMs = computeRetryDelayMs(api, attempt, error.retryAfterMs || 0);
            await waitWithCancelableCooldown(waitMs);
        }
    }

    throw createApiError('Request failed after retries');
}

async function executeAIRequest(request) {
    return await withApiRetries(request.api, async () => {
        if (request.api === 'openrouter') return await callOpenRouter(request);
        if (request.api === 'siliconflow') return await callSiliconFlow(request);
        throw createApiError('No API selected', { retriable: false });
    });
}

async function processAIQueue() {
    if (isApiWorkerRunning) return;
    isApiWorkerRunning = true;

    try {
        while (pendingApiRequests.length > 0) {
            const nextRequest = pendingApiRequests[0];
            if (!nextRequest) break;

            const waitMs = getRemainingDelayMs(nextRequest.api);
            if (waitMs > 0) {
                await waitWithCancelableCooldown(waitMs);
                if (pendingApiRequests.length === 0) break;
            }

            const request = pendingApiRequests.shift();
            if (!request) continue;

            activeApiRequest = request;
            activeApiRequest.attempt = 1;
            activeApiRequest.maxAttempts = Math.max(1, getApiPolicy(request.api).retryLimit + 1);
            updateAIQueueUI();

            try {
                const result = await executeAIRequest(request);
                request.resolve(normalizeAIResultPayload(result, request.api, request.model));
            } catch (e) {
                request.resolve({
                    content: 'Error: ' + (e?.message || 'Unknown API error'),
                    api: request.api,
                    model: request.model,
                    error: true
                });
            } finally {
                activeApiRequest = null;
                apiLastRequestFinishedAt[request.api] = Date.now();
                updateAIQueueUI();
            }
        }
    } finally {
        isApiWorkerRunning = false;
        updateAIQueueUI();
    }
}

async function callAI(prompt, options = {}) {
    ensureStateShape();

    const scope = String(options.scope || '').trim() || 'section';
    const requestedApi = String(options.api || '').trim().toLowerCase();
    const api = API_PROVIDERS.includes(requestedApi)
        ? requestedApi
        : (getChatProvider(scope) || state.activeAPI || 'openrouter');

    const requestedModel = String(options.model || '').trim();
    const model = requestedModel || getChatModel(scope, api) || getDefaultModelForProvider(api);
    const promptText = String(prompt || '').trim();

    if (!promptText) {
        return {
            content: 'Please enter a prompt first.',
            api,
            model,
            error: true
        };
    }

    if (!getApiKey(api)) {
        return {
            content: getApiKeyMissingMessage(api),
            api,
            model,
            error: true
        };
    }

    const queueDepth = pendingApiRequests.length + (activeApiRequest ? 1 : 0);
    if (queueDepth >= MAX_PENDING_REQUESTS) {
        return {
            content: `Queue is full (${MAX_PENDING_REQUESTS}). Wait a bit or cancel queued requests.`,
            api,
            model,
            error: true
        };
    }

    return new Promise(resolve => {
        pendingApiRequests.push({
            id: nextApiRequestId++,
            api,
            scope,
            model,
            prompt: promptText,
            history: normalizeHistoryMessages(options.history || []),
            systemPrompts: Array.isArray(options.systemPrompts) ? options.systemPrompts : [],
            resolve,
            createdAt: Date.now(),
            attempt: 1,
            maxAttempts: Math.max(1, getApiPolicy(api).retryLimit + 1)
        });

        if (options.notifyQueue && queueDepth > 0) {
            showToast(`Added to queue (#${queueDepth + 1})`);
        }

        updateAIQueueUI();
        processAIQueue();
    });
}

async function requestJsonFromApi(api, url, options) {
    const policy = getApiPolicy(api);
    const response = await fetchWithTimeout(url, options, policy.timeoutMs);
    const retryAfterMs = parseRetryAfterMs(response.headers.get('Retry-After'));
    const { data } = await parseJSONResponse(response);

    if (!response.ok) {
        const fallback = `${api} request failed (${response.status})`;
        const message = extractErrorMessage(data, fallback);
        const retriable =
            (isRetriableStatus(response.status) || isLikelyRetriableMessage(message)) &&
            !isLikelyHardLimitMessage(message) &&
            response.status !== 402;
        throw createApiError(message, {
            status: response.status,
            retriable,
            retryAfterMs
        });
    }

    if (data && typeof data === 'object' && data.error) {
        const message = extractErrorMessage(data, `${api} returned an error`);
        const bodyStatus = Number(data.error?.code) || 0;
        const retriable =
            (isRetriableStatus(bodyStatus) || isLikelyRetriableMessage(message)) &&
            !isLikelyHardLimitMessage(message) &&
            bodyStatus !== 402;
        throw createApiError(message, {
            status: bodyStatus,
            retriable,
            retryAfterMs
        });
    }

    if (data === null) {
        throw createApiError(`${api} returned an invalid response`, { retriable: true });
    }

    return data;
}

function isModelUnavailableError(error) {
    const status = Number(error?.status || 0);
    const message = String(error?.message || '');

    if (status === 404 && /(endpoint|model|not found)/i.test(message)) {
        return true;
    }

    if (status === 403 && /(forbidden|access|permission|unauthorized|not allowed)/i.test(message)) {
        return true;
    }

    return /(no endpoints found|model .* not found|unknown model|unsupported model|model is not available|invalid model)/i.test(message);
}

function getOpenRouterModelFallbackList(currentModel = '') {
    const list = [
        currentModel,
        'openai/gpt-4o-mini',
        'openai/gpt-4o',
        'anthropic/claude-3.5-sonnet',
        'meta-llama/llama-3.1-70b-instruct',
        'mistralai/mistral-small-3.2-24b-instruct:free'
    ].filter(Boolean);

    return Array.from(new Set(list));
}

function getSiliconFlowModelFallbackList(currentModel = '') {
    const list = [
        currentModel,
        DEFAULT_SILICONFLOW_MODEL,
        'Qwen/Qwen2.5-72B-Instruct',
        'Qwen/Qwen2.5-32B-Instruct',
        'Qwen/Qwen2.5-14B-Instruct',
        'THUDM/GLM-4-9B-Chat'
    ].filter(Boolean);

    return Array.from(new Set(list));
}

function persistResolvedModel(request, resolvedModel) {
    if (!request || !resolvedModel) return;

    setChatModel(request.scope || 'section', resolvedModel, request.api);
    saveState();

    if (request.api === 'openrouter') {
        const modelSelect = document.getElementById('openrouter-model');
        if (modelSelect) {
            const exists = Array.from(modelSelect.options).some(option => option.value === resolvedModel);
            if (!exists) {
                const custom = document.createElement('option');
                custom.value = resolvedModel;
                custom.textContent = `${resolvedModel} (custom)`;
                modelSelect.insertBefore(custom, modelSelect.firstChild);
            }
            modelSelect.value = resolvedModel;
        }
    }

    if (request.api === 'siliconflow') {
        const modelSelect = document.getElementById('siliconflow-model');
        if (modelSelect) {
            const exists = Array.from(modelSelect.options).some(option => option.value === resolvedModel);
            if (!exists) {
                const custom = document.createElement('option');
                custom.value = resolvedModel;
                custom.textContent = `${resolvedModel} (custom)`;
                modelSelect.insertBefore(custom, modelSelect.firstChild);
            }
            modelSelect.value = resolvedModel;
        }
    }
}

function getRequestMessages(request) {
    return buildApiMessages(request.prompt, request.history || [], request.systemPrompts || []);
}

function getEmbeddingFallbackModels(api = '', preferredModel = '') {
    const provider = String(api || '').toLowerCase();
    const list = [
        String(preferredModel || '').trim(),
        ...(EMBEDDING_MODELS[provider] || [])
    ].filter(Boolean);
    return Array.from(new Set(list));
}

function normalizeEmbeddingVector(rawVector = []) {
    if (!Array.isArray(rawVector)) return null;
    const numeric = rawVector
        .map(value => Number(value))
        .filter(value => Number.isFinite(value));
    if (numeric.length < 16) return null;

    const truncated = numeric.slice(0, LEARNING_EMBEDDING_MAX_DIMENSIONS);
    const norm = Math.sqrt(truncated.reduce((sum, value) => sum + (value * value), 0));
    if (!Number.isFinite(norm) || norm <= 0) return null;
    return truncated.map(value => Number((value / norm).toFixed(6)));
}

function parseEmbeddingFromPayload(payload) {
    if (!payload || typeof payload !== 'object') return null;

    if (Array.isArray(payload?.data) && Array.isArray(payload.data[0]?.embedding)) {
        return payload.data[0].embedding;
    }

    if (Array.isArray(payload?.embedding)) {
        return payload.embedding;
    }

    if (Array.isArray(payload?.output?.embeddings) && Array.isArray(payload.output.embeddings[0]?.embedding)) {
        return payload.output.embeddings[0].embedding;
    }

    return null;
}

async function requestEmbeddingVector(api, endpoint, key, model, text) {
    const payload = await requestJsonFromApi(api, endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(api === 'openrouter'
                ? {
                    'Authorization': `Bearer ${key}`,
                    'HTTP-Referer': 'https://codelens.local',
                    'X-Title': 'CodeLens'
                }
                : {
                    'Authorization': `Bearer ${key}`
                })
        },
        body: JSON.stringify({
            model,
            input: [String(text || '').slice(0, 12000)]
        })
    });

    const embedding = parseEmbeddingFromPayload(payload);
    const normalized = normalizeEmbeddingVector(embedding);
    if (!normalized) {
        throw createApiError(`Invalid embedding response for ${api}:${model}`, { retriable: true });
    }

    return {
        vector: normalized,
        api,
        model
    };
}

async function callProviderEmbeddings(api, text, options = {}) {
    const provider = String(api || '').toLowerCase();
    const key = getApiKey(provider);
    if (!key) {
        throw createApiError(getApiKeyMissingMessage(provider), { retriable: false });
    }

    const models = getEmbeddingFallbackModels(provider, options.model);
    const endpoints = provider === 'openrouter'
        ? ['https://openrouter.ai/api/v1/embeddings']
        : ['https://api.siliconflow.cn/v1/embeddings', 'https://api.siliconflow.com/v1/embeddings'];

    let lastError = null;
    for (const model of models) {
        for (const endpoint of endpoints) {
            try {
                return await withApiRetries(provider, async () => {
                    return await requestEmbeddingVector(provider, endpoint, key, model, text);
                });
            } catch (error) {
                lastError = error;
                if (!isModelUnavailableError(error) && !isLikelyRetriableMessage(error?.message || '')) {
                    throw error;
                }
            }
        }
    }

    throw lastError || createApiError(`No usable embedding model for ${provider}`, { retriable: false });
}

async function getBestEmbeddingForText(text = '', options = {}) {
    const sourceText = String(text || '').trim();
    if (!sourceText) return null;

    const preferredProvider = String(options.provider || '').toLowerCase();
    const providers = Array.from(new Set([
        preferredProvider,
        'siliconflow',
        'openrouter'
    ].filter(provider => provider === 'siliconflow' || provider === 'openrouter')));

    let lastError = null;
    for (const provider of providers) {
        try {
            return await callProviderEmbeddings(provider, sourceText, {
                model: options.model || ''
            });
        } catch (error) {
            lastError = error;
        }
    }

    if (lastError) {
        console.warn('[learning-embeddings] fallback to lexical similarity:', lastError?.message || lastError);
    }
    return null;
}

async function callOpenRouter(request) {
    const key = getApiKey('openrouter');
    if (!key) throw createApiError(getApiKeyMissingMessage('openrouter'), { retriable: false });

    const models = getOpenRouterModelFallbackList(request.model || state.openrouterModel);
    let lastError = null;

    for (const model of models) {
        try {
            const data = await requestJsonFromApi(
                'openrouter',
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${key}`,
                        'HTTP-Referer': 'https://codelens.local',
                        'X-Title': 'CodeLens'
                    },
                    body: JSON.stringify({
                        model,
                        messages: getRequestMessages(request)
                    })
                }
            );

            if (model !== request.model) {
                persistResolvedModel(request, model);
                showToast(`OpenRouter model switched to ${model}`);
            }

            return {
                content: normalizeAIContent(data?.choices?.[0]?.message?.content),
                api: 'openrouter',
                model
            };
        } catch (error) {
            lastError = error;
            if (!isModelUnavailableError(error)) {
                throw error;
            }
        }
    }

    throw lastError || createApiError('No usable OpenRouter model found');
}

async function callSiliconFlow(request) {
    const key = getApiKey('siliconflow');
    if (!key) throw createApiError(getApiKeyMissingMessage('siliconflow'), { retriable: false });

    const models = getSiliconFlowModelFallbackList(request.model || state.siliconflowModel);
    const endpoints = [
        'https://api.siliconflow.cn/v1/chat/completions',
        'https://api.siliconflow.com/v1/chat/completions'
    ];

    let lastError = null;

    for (const model of models) {
        for (const endpoint of endpoints) {
            try {
                const data = await requestJsonFromApi(
                    'siliconflow',
                    endpoint,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${key}`
                        },
                        body: JSON.stringify({
                            model,
                            messages: getRequestMessages(request)
                        })
                    }
                );

                if (model !== request.model) {
                    persistResolvedModel(request, model);
                    showToast(`SiliconFlow model switched to ${model}`);
                }

                return {
                    content: normalizeAIContent(data?.choices?.[0]?.message?.content),
                    api: 'siliconflow',
                    model
                };
            } catch (error) {
                lastError = error;
                if (!isModelUnavailableError(error)) {
                    throw error;
                }
            }
        }
    }

    throw lastError || createApiError('No usable SiliconFlow model found');
}
