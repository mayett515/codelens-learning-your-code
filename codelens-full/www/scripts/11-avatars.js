// ============ AVATARS ============
function unusedShowAvatarPickerOld() {
    const list = document.getElementById('avatar-list');
    const avatars = [
        { face: '🧠', name: 'Senior Dev', color: 'purple', prompt: 'You are a senior developer with 15 years of experience. Give detailed, professional advice.' },
        { face: '👨‍🏫', name: 'Teacher', color: 'blue', prompt: 'You are a patient teacher. Explain things step by step with examples.' },
        { face: '🤖', name: 'Debug Bot', color: 'green', prompt: 'You are a debugging assistant. Focus on finding and fixing bugs.' },
        { face: '🎯', name: 'Code Reviewer', color: 'orange', prompt: 'You are a code reviewer. Point out issues and suggest improvements.' },
        { face: '⚡', name: 'Quick Helper', color: 'yellow', prompt: 'You give quick, concise answers. No fluff, just solutions.' }
    ];
    
    list.innerHTML = avatars.map((a, i) => `
        <div class="list-item" data-action="select-avatar" data-avatar-index="${i}">
            <div class="icon" style="background:var(--color-${a.color})">${a.face}</div>
            <div class="info">
                <div class="name">${a.name}</div>
                <div class="meta">${a.prompt.substring(0, 40)}...</div>
            </div>
            <span class="arrow">${state.currentAvatar?.name === a.name ? '✓' : ''}</span>
        </div>
    `).join('');
    
    showModal('avatar-modal');
}

function unusedSelectAvatarOld(idx) {
    const avatars = [
        { face: '🧠', name: 'Senior Dev', color: 'purple', prompt: 'You are a senior developer with 15 years of experience. Give detailed, professional advice.' },
        { face: '👨‍🏫', name: 'Teacher', color: 'blue', prompt: 'You are a patient teacher. Explain things step by step with examples.' },
        { face: '🤖', name: 'Debug Bot', color: 'green', prompt: 'You are a debugging assistant. Focus on finding and fixing bugs.' },
        { face: '🎯', name: 'Code Reviewer', color: 'orange', prompt: 'You are a code reviewer. Point out issues and suggest improvements.' },
        { face: '⚡', name: 'Quick Helper', color: 'yellow', prompt: 'You give quick, concise answers. No fluff, just solutions.' }
    ];
    
    state.currentAvatar = avatars[idx];
    hideModal('avatar-modal');
    showToast('Chatting with ' + state.currentAvatar.name);
}

function showProjectAvatarChat() {
    showAvatarPicker();
}

function showProjectChats() {
    showMarkedSections();
}

function showGeneralChatFolders() {
    showScreen('folders-screen');
    showToast('Open a folder to continue the chat there');
}

// Kit-style icon overrides.
function showAvatarPicker() {
    const list = document.getElementById('avatar-list');
    const avatars = getDefaultAvatars();

    list.innerHTML = avatars.map((a, i) => `
        <div class="list-item" data-action="select-avatar" data-avatar-index="${i}">
            <div class="icon" style="background:var(--color-${a.color})">${renderFaceGlyph(a.face)}</div>
            <div class="info">
                <div class="name">${a.name}</div>
                <div class="meta">${a.prompt.substring(0, 40)}...</div>
            </div>
            <span class="arrow">${state.currentAvatar?.name === a.name ? uiIcon('check') : ''}</span>
        </div>
    `).join('');

    showModal('avatar-modal');
}

function selectAvatar(idx) {
    const avatars = getDefaultAvatars();
    state.currentAvatar = avatars[idx];
    hideModal('avatar-modal');
    showToast('Chatting with ' + state.currentAvatar.name);
}
