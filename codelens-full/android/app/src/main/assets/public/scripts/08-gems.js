// ============ GEMS ============
const LEARNER_GEM_SYSTEM_ID = 'learner';

function getDefaultLearnerGem() {
    return {
        id: 'system-learner-gem',
        name: 'Learner',
        face: 'teacher',
        color: 'blue',
        prompt: 'You are Learner Gem, a patient learning coach for reviewing saved concepts. Teach with short steps, practical examples, and quick checks for understanding. Ask one clarifying question when needed, then continue with concise guidance.',
        active: false,
        system: LEARNER_GEM_SYSTEM_ID
    };
}

function isLearnerGem(gem = {}) {
    if (String(gem?.system || '').toLowerCase() === LEARNER_GEM_SYSTEM_ID) return true;
    return String(gem?.name || '').trim().toLowerCase() === 'learner';
}

function ensureLearnerGem() {
    if (!Array.isArray(state.gems)) {
        state.gems = [];
    }

    const template = getDefaultLearnerGem();
    const idx = state.gems.findIndex(isLearnerGem);
    if (idx >= 0) {
        const gem = state.gems[idx] || {};
        let changed = false;

        if (!gem.id) {
            gem.id = template.id;
            changed = true;
        }
        if (!gem.name) {
            gem.name = template.name;
            changed = true;
        }
        if (!gem.face) {
            gem.face = template.face;
            changed = true;
        }
        if (!gem.color) {
            gem.color = template.color;
            changed = true;
        }
        if (!String(gem.prompt || '').trim()) {
            gem.prompt = template.prompt;
            changed = true;
        }
        if (String(gem.system || '').toLowerCase() !== LEARNER_GEM_SYSTEM_ID) {
            gem.system = LEARNER_GEM_SYSTEM_ID;
            changed = true;
        }

        state.gems[idx] = gem;
        return changed;
    }

    state.gems.unshift({ ...template });
    return true;
}

function getLearnerGemPrompt() {
    ensureLearnerGem();
    const gem = state.gems.find(isLearnerGem);
    return String(gem?.prompt || getDefaultLearnerGem().prompt);
}

function legacyRenderGemsOld() {
    const list = document.getElementById('gems-list');
    if (state.gems.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="icon">💎</div><div class="title">No gems yet</div><div class="desc">Create prompt templates</div></div>';
        return;
    }
    list.innerHTML = state.gems.map((g, i) => `
        <div class="list-item" data-action="toggle-gem-active" data-gem-index="${i}">
            <div class="icon" style="background:var(--color-${g.color})">${g.face}</div>
            <div class="info">
                <div class="name">${g.name}</div>
                <div class="meta">${g.prompt.substring(0, 40)}...</div>
            </div>
            <span class="arrow">${g.active ? '✓' : ''}</span>
        </div>
    `).join('');
}

function legacyRenderGemSelectorOld(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '<div class="gem-chip" data-action="clear-active-gem">None</div>' +
        state.gems.map((g, i) => `
            <div class="gem-chip ${g.active ? 'active' : ''}" data-action="set-active-gem" data-gem-index="${i}">
                <span>${g.face}</span>
                <span>${g.name}</span>
            </div>
        `).join('');
}

function legacyCreateGemOld() {
    const name = document.getElementById('gem-name').value.trim();
    const face = document.querySelector('#gem-face-picker .selected')?.dataset.face || '🤓';
    const color = document.querySelector('#gem-color-picker .selected')?.dataset.color || 'blue';
    const prompt = document.getElementById('gem-prompt').value.trim();
    
    if (!name || !prompt) { showToast('Name and prompt required'); return; }
    
    state.gems.push({ id: Date.now(), name, face, color, prompt, active: false });
    saveState();
    renderGems();
    hideModal('create-gem-modal');
    
    document.getElementById('gem-name').value = '';
    document.getElementById('gem-prompt').value = '';
    showToast('Gem created!');
}

function toggleGemActive(idx) {
    state.gems.forEach((g, i) => g.active = (i === idx && !g.active));
    saveState();
    renderGems();
}

function setActiveGem(idx) {
    state.gems.forEach((g, i) => g.active = (i === idx));
    saveState();
    renderGemSelector('gem-selector');
    renderGemSelector('general-gem-selector');
}

function clearActiveGem() {
    state.gems.forEach(g => g.active = false);
    saveState();
    renderGemSelector('gem-selector');
    renderGemSelector('general-gem-selector');
}

// Kit-style icon overrides.
function renderGems() {
    const changed = ensureLearnerGem();
    if (changed) saveState();

    const list = document.getElementById('gems-list');
    if (state.gems.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="icon">${uiIcon('gem', 'lg')}</div><div class="title">No gems yet</div><div class="desc">Create prompt templates</div></div>`;
        return;
    }

    list.innerHTML = state.gems.map((g, i) => `
        <div class="list-item" data-action="toggle-gem-active" data-gem-index="${i}">
            <div class="icon" style="background:var(--color-${g.color})">${renderFaceGlyph(g.face)}</div>
            <div class="info">
                <div class="name">${g.name}</div>
                <div class="meta">${g.prompt.substring(0, 40)}...</div>
            </div>
            <span class="arrow">${g.active ? uiIcon('check') : ''}</span>
        </div>
    `).join('');
}

function renderGemSelector(containerId) {
    const changed = ensureLearnerGem();
    if (changed) saveState();

    const container = document.getElementById(containerId);
    container.innerHTML = '<div class="gem-chip" data-action="clear-active-gem">None</div>' +
        state.gems.map((g, i) => `
            <div class="gem-chip ${g.active ? 'active' : ''}" data-action="set-active-gem" data-gem-index="${i}">
                <span>${renderFaceGlyph(g.face, 'sm')}</span>
                <span>${g.name}</span>
            </div>
        `).join('');
}

function createGem() {
    const name = document.getElementById('gem-name').value.trim();
    const face = normalizeFaceKey(document.querySelector('#gem-face-picker .selected')?.dataset.face || 'debug-bot');
    const color = document.querySelector('#gem-color-picker .selected')?.dataset.color || 'blue';
    const prompt = document.getElementById('gem-prompt').value.trim();

    if (!name || !prompt) { showToast('Name and prompt required'); return; }

    const maybeSystem = name.toLowerCase() === 'learner' ? LEARNER_GEM_SYSTEM_ID : '';
    state.gems.push({
        id: Date.now(),
        name,
        face,
        color,
        prompt,
        active: false,
        system: maybeSystem
    });
    saveState();
    renderGems();
    hideModal('create-gem-modal');

    document.getElementById('gem-name').value = '';
    document.getElementById('gem-prompt').value = '';
    showToast('Gem created!');
}
