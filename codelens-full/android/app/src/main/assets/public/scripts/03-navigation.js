// ============ NAVIGATION ============
function showScreen(screenId) {
    if (screenId === 'home-screen' && state.referenceView) {
        state.referenceView = null;
        saveState();
    }

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (screenId === 'home-screen' || screenId === 'recent-chats-screen') document.querySelectorAll('.nav-item')[0].classList.add('active');
    else if (screenId === 'learning-screen' || screenId === 'learning-chat-screen' || screenId === 'gems-screen') document.querySelectorAll('.nav-item')[1].classList.add('active');
    else if (screenId === 'folders-screen') document.querySelectorAll('.nav-item')[2].classList.add('active');
    else if (screenId === 'settings-screen') document.querySelectorAll('.nav-item')[3].classList.add('active');

    if (screenId === 'project-screen') scheduleRenderVisibleCodeLines();
    if (screenId === 'learning-screen' && typeof renderLearningScreen === 'function') renderLearningScreen();
    if (screenId === 'learning-chat-screen' && typeof renderLearningReviewChatScreen === 'function') renderLearningReviewChatScreen();
    if (screenId === 'home-screen' && typeof renderLearningHomePreview === 'function') renderLearningHomePreview();
    if (screenId === 'home-screen' && typeof renderHomeRecentChatsPreview === 'function') renderHomeRecentChatsPreview();
    if (screenId === 'recent-chats-screen' && typeof renderRecentChatsScreen === 'function') renderRecentChatsScreen();
    if (typeof applyReferenceReadOnlyUI === 'function') applyReferenceReadOnlyUI();
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
