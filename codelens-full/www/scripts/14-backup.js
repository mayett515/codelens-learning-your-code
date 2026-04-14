// ============ BACKUP ============
function exportBackup() {
    const data = JSON.stringify(getPersistedStateSnapshot(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codelens_backup_' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup exported!');
}

function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = sanitizePersistedState(JSON.parse(e.target.result));
            // Learning vectors live in their own storage key (see
            // 17-learning-embeddings.js). Drop them before applying the
            // imported state so stale vectors from the previous install
            // don't get matched against freshly-imported concept ids.
            if (typeof clearAllLearningVectors === 'function') {
                clearAllLearningVectors();
            }
            state = { ...state, ...data };
            sectionsCache.clear();
            saveState();
            renderProjects();
            renderGems();
            renderFolders();
            loadSettings();
            showToast('Backup imported!');
        } catch (err) {
            showToast('Invalid backup file');
        }
    };
    reader.readAsText(file);
}

function clearAllData() {
    if (confirm('Delete ALL data? This cannot be undone!')) {
        if (saveStateTimer) clearTimeout(saveStateTimer);
        saveStateTimer = null;
        saveStatePending = false;
        localStorage.removeItem(STATE_STORAGE_KEY);
        localStorage.removeItem(LEGACY_STATE_STORAGE_KEY);
        // Also wipe the separate learning-vector store and, best-effort,
        // the native bridge's persisted vectors.
        if (typeof clearAllLearningVectors === 'function') {
            clearAllLearningVectors();
        }
        clearStoredApiKeys();
        location.reload();
    }
}
