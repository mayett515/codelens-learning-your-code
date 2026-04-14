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

let navigationBackHandlingInitialized = false;
let navigationLastBackHandledAt = 0;

function buildNavigationBrowserState(screenId = '') {
    return {
        __codelensNav: true,
        screenId: String(screenId || '').trim() || 'home-screen'
    };
}

function syncBrowserHistoryState(screenId = '', options = {}) {
    const id = String(screenId || '').trim();
    if (!id || !window.history) return;
    const replace = options.replace === true;

    try {
        if (replace && typeof window.history.replaceState === 'function') {
            window.history.replaceState(buildNavigationBrowserState(id), '', window.location.href);
            return;
        }
        if (!replace && typeof window.history.pushState === 'function') {
            const currentState = window.history.state;
            if (currentState?.__codelensNav && currentState.screenId === id) return;
            window.history.pushState(buildNavigationBrowserState(id), '', window.location.href);
        }
    } catch (_) {
        // Ignore history API failures (older webviews / restricted contexts).
    }
}

function handleBackNavigation() {
    const now = Date.now();
    // Some Android environments fire both Cordova and Capacitor events.
    if (now - navigationLastBackHandledAt < 220) return true;
    const handled = navigateBack();
    if (handled) {
        navigationLastBackHandledAt = now;
    }
    return handled;
}

function initializeNavigationBackHandling() {
    if (navigationBackHandlingInitialized) return;
    navigationBackHandlingInitialized = true;

    const activeScreen = getActiveScreenId();
    syncBrowserHistoryState(activeScreen, { replace: true });

    window.addEventListener('popstate', event => {
        const statePayload = event?.state;
        if (!statePayload?.__codelensNav) return;

        if (!handleBackNavigation()) {
            syncBrowserHistoryState(getActiveScreenId(), { replace: true });
        }
    });

    const appPlugin = window.Capacitor?.Plugins?.App;
    if (appPlugin && typeof appPlugin.addListener === 'function') {
        appPlugin.addListener('backButton', () => {
            if (handleBackNavigation()) return;
            if (window.history && window.history.length > 1) {
                try {
                    window.history.back();
                    return;
                } catch (_) {
                    // fall through to exit
                }
            }
            if (typeof appPlugin.exitApp === 'function') {
                appPlugin.exitApp();
            }
        });
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
        syncBrowserHistoryState(nextScreenId);
    }
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (nextScreenId === 'home-screen' || nextScreenId === 'recent-chats-screen') document.querySelectorAll('.nav-item')[0].classList.add('active');
    else if (nextScreenId === 'learning-screen' || nextScreenId === 'learning-chat-screen' || nextScreenId === 'gems-screen') document.querySelectorAll('.nav-item')[1].classList.add('active');
    else if (nextScreenId === 'folders-screen') document.querySelectorAll('.nav-item')[2].classList.add('active');
    else if (nextScreenId === 'settings-screen') document.querySelectorAll('.nav-item')[3].classList.add('active');

    if (nextScreenId === 'project-screen') scheduleRenderVisibleCodeLines();
    if (nextScreenId === 'learning-screen' && typeof renderLearningScreen === 'function') renderLearningScreen();
    if (nextScreenId !== 'learning-screen' && typeof destroyLearningGraphCytoscape === 'function') destroyLearningGraphCytoscape();
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
    if (handleBackNavigation()) {
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
