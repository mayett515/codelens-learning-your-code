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
        clearStoredApiKeys();
        location.reload();
    }
}
