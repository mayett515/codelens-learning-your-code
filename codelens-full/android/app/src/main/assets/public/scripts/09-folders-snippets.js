// ============ FOLDERS & SNIPPETS ============
function legacyRenderFoldersOld() {
    const list = document.getElementById('folders-list');
    const preview = document.getElementById('folders-preview');
    
    if (state.folders.length === 0) {
        const empty = '<div class="empty-state"><div class="icon">📁</div><div class="title">No folders yet</div><div class="desc">Save AI answers to folders</div></div>';
        list.innerHTML = empty;
        preview.innerHTML = '<div class="list-item" data-action="show-screen" data-screen="folders-screen"><div class="icon">📁</div><div class="info"><div class="name">Manage Snippets</div><div class="meta">Save & organize answers</div></div><span class="arrow">→</span></div>';
        return;
    }
    
    list.innerHTML = state.folders.map((f, i) => `
        <div class="list-item" data-action="open-folder" data-folder-index="${i}">
            <div class="icon">📂</div>
            <div class="info">
                <div class="name">${f.name}</div>
                <div class="meta">${f.snippets?.length || 0} snippets</div>
            </div>
            <span class="arrow">→</span>
        </div>
    `).join('');
    
    preview.innerHTML = state.folders.slice(0, 2).map((f, i) => `
        <div class="list-item" data-action="open-folder" data-folder-index="${i}">
            <div class="icon">📂</div>
            <div class="info"><div class="name">${f.name}</div></div>
            <span class="arrow">→</span>
        </div>
    `).join('');
}

function createFolder() {
    const name = document.getElementById('folder-name').value.trim();
    if (!name) { showToast('Enter folder name'); return; }
    
    state.folders.push({ id: Date.now(), name, snippets: [] });
    saveState();
    renderFolders();
    hideModal('create-folder-modal');
    document.getElementById('folder-name').value = '';
    showToast('Folder created!');
}

function openFolder(folderIdx) {
    const folder = state.folders[folderIdx];
    if (!folder) {
        showToast('Folder not found');
        return;
    }

    state.currentGeneralFolder = folder.id;
    const chatIdx = state.generalChats.findIndex(c => c.folderId === folder.id);
    state.currentChat = chatIdx >= 0 ? { type: 'general', idx: chatIdx } : { type: 'general', idx: null };
    if (chatIdx >= 0) {
        touchGeneralChatActivity(chatIdx, { save: false });
        saveState();
    }

    const folderLabel = document.getElementById('general-chat-folder');
    if (folderLabel) folderLabel.textContent = folder.name;

    renderGeneralGemSelector();
    syncChatModelControls('general');
    renderGeneralChatMessages();
    showScreen('general-chat-screen');
}

function legacySaveToFolderOld() {
    const list = document.getElementById('save-snippet-folders');
    list.innerHTML = state.folders.map((f, i) => `
        <div class="list-item" data-action="save-snippet-to-folder" data-folder-index="${i}">
            <div class="icon">📂</div>
            <div class="info"><div class="name">${f.name}</div></div>
        </div>
    `).join('');
    
    if (state.folders.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="title">No folders</div><div class="desc">Create one first</div></div>';
    }
    
    hideModal('bubble-color-modal');
    showModal('save-snippet-modal');
}

function saveSnippetToFolder(folderIdx) {
    const messages = getCurrentMessages();
    const msg = messages[state.selectedBubbleIdx];
    if (!msg) {
        showToast('Pick a message first');
        return;
    }
    
    state.folders[folderIdx].snippets.push({
        content: msg.content,
        source: state.currentChat,
        created: new Date().toISOString()
    });
    
    saveState();
    hideModal('save-snippet-modal');
    showToast('Saved to ' + state.folders[folderIdx].name);
}

// Kit-style icon overrides.
function renderFolders() {
    const list = document.getElementById('folders-list');
    const preview = document.getElementById('folders-preview');

    if (state.folders.length === 0) {
        const empty = `<div class="empty-state"><div class="icon">${uiIcon('folder', 'lg')}</div><div class="title">No folders yet</div><div class="desc">Save AI answers to folders</div></div>`;
        list.innerHTML = empty;
        preview.innerHTML = `<div class="list-item" data-action="show-screen" data-screen="folders-screen"><div class="icon">${uiIcon('folder')}</div><div class="info"><div class="name">Manage Snippets</div><div class="meta">Save and organize answers</div></div><span class="arrow">${uiIcon('arrow-right')}</span></div>`;
        return;
    }

    list.innerHTML = state.folders.map((f, i) => `
        <div class="list-item" data-action="open-folder" data-folder-index="${i}">
            <div class="icon">${uiIcon('folder')}</div>
            <div class="info">
                <div class="name">${f.name}</div>
                <div class="meta">${f.snippets?.length || 0} snippets</div>
            </div>
            <span class="arrow">${uiIcon('arrow-right')}</span>
        </div>
    `).join('');

    preview.innerHTML = state.folders.slice(0, 2).map((f, i) => `
        <div class="list-item" data-action="open-folder" data-folder-index="${i}">
            <div class="icon">${uiIcon('folder')}</div>
            <div class="info"><div class="name">${f.name}</div></div>
            <span class="arrow">${uiIcon('arrow-right')}</span>
        </div>
    `).join('');
}

function saveToFolder() {
    const list = document.getElementById('save-snippet-folders');
    list.innerHTML = state.folders.map((f, i) => `
        <div class="list-item" data-action="save-snippet-to-folder" data-folder-index="${i}">
            <div class="icon">${uiIcon('folder')}</div>
            <div class="info"><div class="name">${f.name}</div></div>
        </div>
    `).join('');

    if (state.folders.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="title">No folders</div><div class="desc">Create one first</div></div>';
    }

    hideModal('bubble-color-modal');
    showModal('save-snippet-modal');
}
