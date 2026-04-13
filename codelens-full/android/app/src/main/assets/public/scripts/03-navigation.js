// ============ NAVIGATION ============
function getActiveScreenId() {
    return document.querySelector('.screen.active')?.id || 'home-screen';
}

function pushScreenHistory(screenId = '') {
    const id = String(screenId || '').trim();
    if (!id) return;
    if (appScreenHistory[appScreenHistory.length - 1] === id) return;
    appScreenHistory.push(id);
    if (appScreenHistory.length > 50) {
        appScreenHistory = appScreenHistory.slice(-50);
    }
}

function showScreen(screenId, options = {}) {
    const nextScreenId = String(screenId || '').trim();
    if (!nextScreenId) return;
    const trackHistory = options.trackHistory !== false;
    const previousScreen = getActiveScreenId();

    if (nextScreenId === 'home-screen' && state.referenceView) {
        state.referenceView = null;
        saveState();
    }

    const target = document.getElementById(nextScreenId);
    if (!target) return;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    target.classList.add('active');

    if (trackHistory && previousScreen && previousScreen !== nextScreenId) {
        pushScreenHistory(previousScreen);
    }
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (nextScreenId === 'home-screen' || nextScreenId === 'recent-chats-screen') document.querySelectorAll('.nav-item')[0].classList.add('active');
    else if (nextScreenId === 'learning-screen' || nextScreenId === 'learning-chat-screen' || nextScreenId === 'gems-screen') document.querySelectorAll('.nav-item')[1].classList.add('active');
    else if (nextScreenId === 'folders-screen') document.querySelectorAll('.nav-item')[2].classList.add('active');
    else if (nextScreenId === 'settings-screen') document.querySelectorAll('.nav-item')[3].classList.add('active');

    if (nextScreenId === 'project-screen') scheduleRenderVisibleCodeLines();
    if (nextScreenId === 'learning-screen' && typeof renderLearningScreen === 'function') renderLearningScreen();
    if (nextScreenId === 'learning-chat-screen' && typeof renderLearningReviewChatScreen === 'function') renderLearningReviewChatScreen();
    if (nextScreenId === 'home-screen' && typeof renderLearningHomePreview === 'function') renderLearningHomePreview();
    if (nextScreenId === 'home-screen' && typeof renderHomeRecentChatsPreview === 'function') renderHomeRecentChatsPreview();
    if (nextScreenId === 'recent-chats-screen' && typeof renderRecentChatsScreen === 'function') renderRecentChatsScreen({ reset: true });
    if (typeof applyReferenceReadOnlyUI === 'function') applyReferenceReadOnlyUI();
}

function getTopVisibleModal() {
    const visible = Array.from(document.querySelectorAll('.modal-overlay.show'));
    return visible.length ? visible[visible.length - 1] : null;
}

function closeTopModalIfAny() {
    const topModal = getTopVisibleModal();
    if (!topModal) return false;
    hideModal(topModal.id);
    return true;
}

function navigateBack() {
    if (closeTopModalIfAny()) return true;

    while (appScreenHistory.length) {
        const previous = appScreenHistory.pop();
        if (!previous || previous === getActiveScreenId()) continue;
        showScreen(previous, { trackHistory: false });
        return true;
    }
    return false;
}

function handleAndroidBackButton(event) {
    if (navigateBack()) {
        event?.preventDefault?.();
        return;
    }
}

function showModal(modalId) {
    document.getElementById(modalId).classList.add('show');
    if (modalId === 'import-modal' && typeof setImportStatus === 'function') {
        setImportStatus('');
    }
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
    if (modalId === 'import-modal' && typeof setImportStatus === 'function') {
        setImportStatus('');
    }
    if (modalId === 'file-picker-modal') {
        filePickerSearchTerm = '';
        const searchInput = document.getElementById('file-picker-search');
        if (searchInput) searchInput.value = '';
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}
