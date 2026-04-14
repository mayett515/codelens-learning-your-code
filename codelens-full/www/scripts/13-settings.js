// ============ SETTINGS ============
const PROVIDER_LABELS = {
    openrouter: 'OpenRouter',
    siliconflow: 'SiliconFlow'
};

function getProviderLabel(provider = '') {
    return PROVIDER_LABELS[provider] || provider;
}

function normalizeApiSelectionCards() {
    const seen = new Set();
    const cards = document.querySelectorAll('.api-select[data-action="set-active-api"]');

    cards.forEach(card => {
        const provider = String(card.dataset.api || '').trim().toLowerCase();
        if (!API_PROVIDERS.includes(provider) || seen.has(provider)) {
            card.parentElement?.remove();
            return;
        }

        seen.add(provider);
        card.id = `api-${provider}`;
        card.dataset.api = provider;

        const statusEl = card.querySelector('.api-status');
        const status = statusEl ? statusEl.outerHTML : '<span class="api-status"></span>';
        card.innerHTML = `${status}<span>${getProviderLabel(provider)}</span>`;
    });
}

function fillProviderSelect(selectEl, selectedProvider = 'openrouter') {
    if (!selectEl) return;
    const nextProvider = API_PROVIDERS.includes(selectedProvider) ? selectedProvider : 'openrouter';

    selectEl.innerHTML = API_PROVIDERS.map(provider => `
        <option value="${provider}">${getProviderLabel(provider)}</option>
    `).join('');
    selectEl.value = nextProvider;
}

function fillModelSelect(selectEl, provider, selectedModel = '') {
    if (!selectEl) return;

    const options = getProviderModelOptions(provider);
    const fallback = getDefaultModelForProvider(provider);
    const nextValue = String(selectedModel || fallback);

    const hasOption = options.some(option => option.value === nextValue);
    const list = hasOption
        ? options
        : [{ value: nextValue, label: `${nextValue} (custom)` }, ...options];

    selectEl.innerHTML = list.map(option => `
        <option value="${option.value}">${option.label}</option>
    `).join('');
    selectEl.value = nextValue;
}

function ensureSelectValue(selectEl, value, label = '') {
    if (!selectEl) return;
    const normalized = String(value || '').trim();
    if (!normalized) return;

    const exists = Array.from(selectEl.options).some(option => option.value === normalized);
    if (!exists) {
        const option = document.createElement('option');
        option.value = normalized;
        option.textContent = label || `${normalized} (custom)`;
        selectEl.insertBefore(option, selectEl.firstChild);
    }

    selectEl.value = normalized;
}

function getChatSelectorElements(scope = 'section') {
    if (scope === 'general') {
        return {
            provider: document.getElementById('general-chat-provider-select'),
            model: document.getElementById('general-chat-model-select')
        };
    }
    if (scope === 'learning') {
        return {
            provider: document.getElementById('learning-chat-provider-select'),
            model: document.getElementById('learning-chat-model-select')
        };
    }

    return {
        provider: document.getElementById('chat-provider-select'),
        model: document.getElementById('chat-model-select')
    };
}

function syncChatModelControls(scope = 'section') {
    ensureStateShape();
    const controls = getChatSelectorElements(scope);
    if (!controls.provider || !controls.model) return;

    const provider = getChatProvider(scope);
    const model = getChatModel(scope, provider);
    fillProviderSelect(controls.provider, provider);
    fillModelSelect(controls.model, provider, model);
}

function syncAllChatModelControls() {
    (typeof CHAT_SCOPES !== 'undefined' ? CHAT_SCOPES : ['section', 'general', 'learning'])
        .forEach(scope => syncChatModelControls(scope));
}

function syncSettingsModelControls() {
    const openrouterModelSelect = document.getElementById('openrouter-model');
    const siliconflowModelSelect = document.getElementById('siliconflow-model');
    fillModelSelect(openrouterModelSelect, 'openrouter', state.openrouterModel);
    fillModelSelect(siliconflowModelSelect, 'siliconflow', state.siliconflowModel);
}

function loadSettings() {
    ensureStateShape();
    normalizeApiSelectionCards();

    const keys = getApiKeysSnapshot();
    const openrouterKeyInput = document.getElementById('openrouter-key');
    const siliconflowKeyInput = document.getElementById('siliconflow-key');
    if (openrouterKeyInput) openrouterKeyInput.value = keys.openrouter || '';
    if (siliconflowKeyInput) siliconflowKeyInput.value = keys.siliconflow || '';

    syncSettingsModelControls();

    document.getElementById('color-name-red').value = state.colorNames.red || '';
    document.getElementById('color-name-green').value = state.colorNames.green || '';
    document.getElementById('color-name-yellow').value = state.colorNames.yellow || '';
    document.getElementById('color-name-blue').value = state.colorNames.blue || '';
    document.getElementById('color-name-purple').value = state.colorNames.purple || '';

    updateAPIButtons();
    syncAllChatModelControls();
    if (typeof applyKitIcons === 'function') {
        applyKitIcons();
    }
}

function saveSettings() {
    ensureStateShape();
    const previousOpenRouterModel = String(state.openrouterModel || DEFAULT_OPENROUTER_MODEL);
    const previousSiliconFlowModel = String(state.siliconflowModel || DEFAULT_SILICONFLOW_MODEL);

    setApiKeys({
        openrouter: document.getElementById('openrouter-key')?.value.trim() || '',
        siliconflow: document.getElementById('siliconflow-key')?.value.trim() || ''
    });
    persistApiKeysToStorage();

    state.openrouterModel = String(document.getElementById('openrouter-model')?.value || DEFAULT_OPENROUTER_MODEL);
    state.siliconflowModel = String(document.getElementById('siliconflow-model')?.value || DEFAULT_SILICONFLOW_MODEL);

    (typeof CHAT_SCOPES !== 'undefined' ? CHAT_SCOPES : ['section', 'general', 'learning']).forEach(scope => {
        const cfg = getChatConfig(scope);
        if (!cfg.models.openrouter || cfg.models.openrouter === previousOpenRouterModel) {
            cfg.models.openrouter = state.openrouterModel;
        }
        if (!cfg.models.siliconflow || cfg.models.siliconflow === previousSiliconFlowModel) {
            cfg.models.siliconflow = state.siliconflowModel;
        }
    });

    saveState();
    updateAPIButtons();
    syncSettingsModelControls();
    syncAllChatModelControls();
    updateAIQueueUI();
    showToast('Settings saved');
}

function saveColorNames() {
    state.colorNames.red = document.getElementById('color-name-red').value.trim() || 'Important';
    state.colorNames.green = document.getElementById('color-name-green').value.trim() || 'Understood';
    state.colorNames.yellow = document.getElementById('color-name-yellow').value.trim() || 'Review';
    state.colorNames.blue = document.getElementById('color-name-blue').value.trim() || 'Question';
    state.colorNames.purple = document.getElementById('color-name-purple').value.trim() || 'Complex';
    saveState();
    showToast('Color names saved');
}

function setActiveAPI(api) {
    const provider = String(api || '').trim().toLowerCase();
    if (!API_PROVIDERS.includes(provider)) return;

    state.activeAPI = provider;
    (typeof CHAT_SCOPES !== 'undefined' ? CHAT_SCOPES : ['section', 'general', 'learning'])
        .forEach(scope => setChatProvider(scope, provider));
    saveState();
    updateAPIButtons();
    syncAllChatModelControls();
    showToast(`${getProviderLabel(provider)} selected`);
}

function updateAPIButtons() {
    API_PROVIDERS.forEach(api => {
        const el = document.getElementById('api-' + api);
        if (!el) return;

        const isActive = state.activeAPI === api;
        el.classList.toggle('selected', isActive);
        const statusEl = el.querySelector('.api-status');
        if (statusEl) statusEl.classList.toggle('active', isActive);
    });
}

function handleChatProviderChange(scope = 'section', provider = '') {
    const nextProvider = String(provider || '').trim().toLowerCase();
    if (!API_PROVIDERS.includes(nextProvider)) return;

    setChatProvider(scope, nextProvider);
    state.activeAPI = nextProvider;
    saveState();
    updateAPIButtons();
    syncChatModelControls(scope);
    const scopeLabel = scope === 'general' ? 'General'
        : scope === 'learning' ? 'Learning'
        : 'Section';
    showToast(`${scopeLabel} chat uses ${getProviderLabel(nextProvider)}`);
}

function handleChatModelChange(scope = 'section', model = '') {
    const provider = getChatProvider(scope);
    setChatModel(scope, model, provider);
    saveState();
    syncChatModelControls(scope);

    if (provider === 'openrouter') {
        ensureSelectValue(document.getElementById('openrouter-model'), state.openrouterModel);
    }
    if (provider === 'siliconflow') {
        ensureSelectValue(document.getElementById('siliconflow-model'), state.siliconflowModel);
    }
}
