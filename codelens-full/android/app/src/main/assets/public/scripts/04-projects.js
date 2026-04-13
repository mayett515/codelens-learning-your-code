// ============ PROJECTS ============
function legacyRenderProjectsOld() {
    const list = document.getElementById('projects-list');
    if (state.projects.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="icon">📦</div><div class="title">No projects yet</div><div class="desc">Import from GitHub or paste code</div></div>';
        return;
    }
    list.innerHTML = state.projects.map((p, i) => `
        <div class="list-item project-item"
             data-action="project-open"
             data-project-index="${i}"
             >
            <div class="icon">📁</div>
            <div class="info">
                <div class="name">${p.name}</div>
                <div class="meta">${p.files ? p.files.length + ' files' : 'Code snippet'}</div>
            </div>
            <span class="arrow">→</span>
        </div>
    `).join('');
}

function handleProjectTap(idx) {
    if (projectLongPressTriggered) {
        projectLongPressTriggered = false;
        return;
    }
    openProject(idx);
}

function startProjectLongPress(event, idx) {
    if (event && typeof event.button === 'number' && event.button !== 0) return;
    cancelProjectLongPress();
    projectLongPressTriggered = false;
    projectPressTimer = setTimeout(() => {
        projectLongPressTriggered = true;
        showProjectActionMenu(idx);
    }, PROJECT_LONG_PRESS_MS);
}

function cancelProjectLongPress() {
    if (!projectPressTimer) return;
    clearTimeout(projectPressTimer);
    projectPressTimer = null;
}

function showProjectActionMenu(idx) {
    projectActionIndex = idx;
    const title = document.getElementById('project-actions-title');
    if (title) title.textContent = state.projects[idx]?.name || 'Project';
    showModal('project-actions-modal');
    if (navigator.vibrate) navigator.vibrate(12);
}

function cancelProjectDelete() {
    projectActionIndex = null;
    hideModal('project-actions-modal');
}

function deleteSelectedProject() {
    if (projectActionIndex === null || !state.projects[projectActionIndex]) {
        cancelProjectDelete();
        return;
    }

    const removedName = state.projects[projectActionIndex].name;
    state.projects.splice(projectActionIndex, 1);
    sectionsCache.clear();

    if (state.projects.length === 0) {
        state.currentProject = null;
        state.currentFile = null;
    } else if (state.currentProject === projectActionIndex) {
        state.currentProject = Math.min(projectActionIndex, state.projects.length - 1);
        state.currentFile = 0;
    } else if (state.currentProject > projectActionIndex) {
        state.currentProject -= 1;
    }

    saveState();
    renderProjects();
    cancelProjectDelete();
    showToast(`Deleted ${removedName}`);
}

function createFromPaste() {
    const name = document.getElementById('paste-name').value.trim() || 'Untitled';
    const code = document.getElementById('paste-code').value;
    if (!code) { showToast('Please paste some code'); return; }
    
    const project = {
        id: Date.now(),
        name,
        files: [{ name: 'main.txt', content: code }],
        highlights: {},
        chats: {},
        avatarChats: [],
        recentFiles: [0],
        created: new Date().toISOString()
    };
    
    state.projects.push(project);
    saveState();
    renderProjects();
    hideModal('paste-modal');
    document.getElementById('paste-name').value = '';
    document.getElementById('paste-code').value = '';
    showToast('Project created!');
}

function setImportStatus(message = '', tone = 'loading') {
    const statusEl = document.getElementById('import-status');
    if (!statusEl) return;

    const text = String(message || '').trim();
    if (!text) {
        statusEl.textContent = '';
        statusEl.classList.add('is-hidden');
        statusEl.classList.remove('is-loading', 'is-success', 'is-error');
        return;
    }

    statusEl.textContent = text;
    statusEl.classList.remove('is-hidden', 'is-loading', 'is-success', 'is-error');
    if (tone === 'success') statusEl.classList.add('is-success');
    else if (tone === 'error') statusEl.classList.add('is-error');
    else statusEl.classList.add('is-loading');
}

async function importFromGitHub() {
    const url = document.getElementById('github-url').value.trim();
    if (!url) {
        setImportStatus('Enter a GitHub URL first.', 'error');
        showToast('Please enter a URL');
        return;
    }

    setImportStatus('Preparing import...', 'loading');
    showToast('Importing...');
    
    try {
        let files = [];
        let projectName = 'GitHub Import';
        const CODE_FILE_RE = /\.(js|ts|py|jsx|tsx|html|css|json|md|java|kt|swift|go|rs|c|cpp|h|hpp|php|rb|sh|xml|ya?ml|toml|ini|txt|sql|csv|gradle|properties|lock)$/i;
        const SINGLE_FILE_RE = /\.(js|ts|py|jsx|tsx|html|css|json|md|java|kt|swift|go|rs|c|cpp|h|hpp|php|rb|sh|xml|ya?ml|toml|ini)(\?|#|$)/i;
        const MAX_IMPORT_FILES = 500;
        const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.idea', '.vscode', 'vendor', 'pods', 'target']);

        const safeDecode = (value) => {
            try { return decodeURIComponent(value || ''); } catch (_) { return value || ''; }
        };

        const encodePath = (path) => path.split('/').map(part => encodeURIComponent(part)).join('/');

        const fetchGitHubJson = async (apiUrl) => {
            const res = await fetch(apiUrl, { headers: { 'Accept': 'application/vnd.github+json' } });
            if (!res.ok) {
                throw new Error(`GitHub API error ${res.status}`);
            }
            return await res.json();
        };
        
        if (url.includes('/blob/')) {
            setImportStatus('Fetching selected file from GitHub...', 'loading');
            const blobMatch = url.match(/github\.com\/([^\/]+)\/([^\/?#]+)\/blob\/([^\/?#]+)\/(.+)$/i);
            if (!blobMatch) {
                setImportStatus('Invalid GitHub file URL.', 'error');
                showToast('Invalid GitHub file URL');
                return;
            }

            const owner = blobMatch[1];
            const repo = blobMatch[2].replace(/\.git$/, '');
            const branch = safeDecode(blobMatch[3]);
            const filePath = safeDecode(blobMatch[4]).replace(/[#?].*$/, '');
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${encodePath(filePath)}`;

            const res = await fetch(rawUrl);
            if (!res.ok) throw new Error(`Failed to fetch file (${res.status})`);
            const content = await res.text();
            files = [{ name: filePath.split('/').pop(), content }];
            projectName = `${owner}/${repo}`;
        } else if (url.includes('raw.githubusercontent.com') || SINGLE_FILE_RE.test(url)) {
            // Single file
            setImportStatus('Downloading single file...', 'loading');
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Failed to fetch file (${res.status})`);
            const content = await res.text();
            const name = url.split('/').pop().split('?')[0];
            files = [{ name, content }];
        } else {
            // Repo - recursively import code files from GitHub API
            setImportStatus('Inspecting repository structure...', 'loading');
            const match = url.match(/github\.com\/([^\/]+)\/([^\/?#]+)(?:\/tree\/([^\/?#]+)(?:\/(.*))?)?/i);
            if (!match) {
                setImportStatus('Invalid GitHub URL.', 'error');
                showToast('Invalid GitHub URL');
                return;
            }
            
            const owner = match[1];
            const repo = match[2].replace(/\.git$/, '');
            const requestedBranch = safeDecode(match[3]);
            const requestedPath = safeDecode(match[4] || '').replace(/\/+$/, '');
            projectName = `${owner}/${repo}${requestedPath ? '/' + requestedPath : ''}`;

            const repoMeta = await fetchGitHubJson(`https://api.github.com/repos/${owner}/${repo}`);
            const branch = requestedBranch || repoMeta.default_branch || 'main';

            const queue = [requestedPath];
            const discovered = [];
            let scannedDirectories = 0;
            setImportStatus(`Scanning ${owner}/${repo} (${branch})...`, 'loading');

            while (queue.length > 0 && discovered.length < MAX_IMPORT_FILES) {
                const currentPath = queue.shift();
                const encodedPath = currentPath ? encodePath(currentPath) : '';
                const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;
                const items = await fetchGitHubJson(apiUrl);
                const list = Array.isArray(items) ? items : [items];
                scannedDirectories += 1;

                if (scannedDirectories % 4 === 0) {
                    setImportStatus(`Scanning files... ${discovered.length} found`, 'loading');
                }

                for (const item of list) {
                    if (item.type === 'dir') {
                        const dirName = (item.name || '').toLowerCase();
                        if (!SKIP_DIRS.has(dirName)) {
                            queue.push(item.path);
                        }
                    } else if (item.type === 'file' && CODE_FILE_RE.test(item.name || '') && item.download_url) {
                        discovered.push({ name: item.path, downloadUrl: item.download_url });
                        if (discovered.length >= MAX_IMPORT_FILES) break;
                    }
                }
            }

            let fetched = 0;
            for (const file of discovered) {
                const fileRes = await fetch(file.downloadUrl);
                if (!fileRes.ok) continue;
                const content = await fileRes.text();
                files.push({ name: file.name, content });
                fetched += 1;
                if (fetched % 5 === 0 || fetched === discovered.length) {
                    setImportStatus(`Downloading files... ${fetched}/${discovered.length}`, 'loading');
                }
            }

            if (discovered.length >= MAX_IMPORT_FILES) {
                showToast(`Imported first ${files.length} files (limit ${MAX_IMPORT_FILES})`);
            }
        }
        
        if (files.length === 0) {
            setImportStatus('No supported code files found in that source.', 'error');
            showToast('No code files found');
            return;
        }
        
        const project = {
            id: Date.now(),
            name: projectName,
            files,
            highlights: {},
            chats: {},
            avatarChats: [],
            recentFiles: [0],
            created: new Date().toISOString()
        };
        
        state.projects.push(project);
        saveState();
        renderProjects();
        hideModal('import-modal');
        document.getElementById('github-url').value = '';
        setImportStatus(`Import complete: ${files.length} files`, 'success');
        setTimeout(() => setImportStatus(''), 1800);
        showToast(`Imported ${files.length} files!`);
    } catch (e) {
        setImportStatus(`Import failed: ${e.message}`, 'error');
        showToast('Import failed: ' + e.message);
    }
}

function openProject(idx) {
    state.currentProject = idx;
    invalidateSectionsCache();
    clearSelectionState();
    filePickerExpanded = new Set();
    const project = state.projects[state.currentProject];
    const preferredFileIdx = Number(project?.recentFiles?.[0]);
    state.currentFile = Number.isInteger(preferredFileIdx) && preferredFileIdx >= 0 && preferredFileIdx < (project?.files?.length || 0)
        ? preferredFileIdx
        : 0;
    touchProjectRecentFile(state.currentProject, state.currentFile, { save: false });
    saveState();
    
    renderFileTabs();
    renderCode({ resetScroll: true });
    showScreen('project-screen');
}

function renderFileTabs() {
    const project = state.projects[state.currentProject];
    const current = project.files[state.currentFile];
    const fileName = current?.name || 'file';

    const headerName = document.getElementById('current-file-name');
    if (headerName) headerName.textContent = fileName;

    const switcherName = document.getElementById('file-switcher-name');
    if (switcherName) switcherName.textContent = fileName;

    renderProjectRecentFiles();
}

function renderProjectRecentFiles() {
    const wrap = document.getElementById('project-recent-wrap');
    const container = document.getElementById('project-recent-files');
    if (!wrap || !container || state.currentProject === null) return;

    const project = state.projects[state.currentProject];
    const recents = getProjectRecentFiles(project, MAX_PROJECT_RECENT_FILES)
        .filter(entry => Number(entry.idx) !== Number(state.currentFile))
        .slice(0, 6);

    if (!recents.length) {
        wrap.classList.add('is-hidden');
        container.innerHTML = '';
        return;
    }

    wrap.classList.remove('is-hidden');
    container.innerHTML = recents.map(entry => `
        <button class="project-recent-btn" data-action="open-project-recent-file" data-file-index="${entry.idx}">
            ${escapeHtml(String(entry.file?.name || `File ${entry.idx + 1}`))}
        </button>
    `).join('');
}

function normalizeFilePath(path) {
    return String(path || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function buildFilePickerTree() {
    const project = state.projects[state.currentProject];
    const root = { name: '', path: '', folders: new Map(), files: [] };

    project.files.forEach((file, idx) => {
        const normalized = normalizeFilePath(file.name);
        const parts = normalized ? normalized.split('/').filter(Boolean) : [`file-${idx + 1}`];

        let node = root;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            const nextPath = node.path ? `${node.path}/${part}` : part;
            if (!node.folders.has(part)) {
                node.folders.set(part, { name: part, path: nextPath, folders: new Map(), files: [] });
            }
            node = node.folders.get(part);
        }

        const fileName = parts[parts.length - 1] || `file-${idx + 1}`;
        node.files.push({ idx, name: fileName, fullPath: normalized || fileName });
    });

    return root;
}

function legacyRenderFilePickerNodeOld(node, depth = 0) {
    const folders = Array.from(node.folders.values()).sort((a, b) => a.name.localeCompare(b.name));
    const files = node.files.slice().sort((a, b) => a.name.localeCompare(b.name));
    const margin = 4 + (depth * 14);
    let html = '';

    for (const folder of folders) {
        const isOpen = filePickerExpanded.has(folder.path);
        const encodedPath = encodeURIComponent(folder.path);
        html += `
            <div class="list-item file-picker-item folder" style="margin-left:${margin}px;" data-action="toggle-file-picker-folder" data-folder-path="${encodedPath}">
                <div class="icon">DIR</div>
                <div class="info">
                    <div class="name">${escapeHtml(folder.name)}</div>
                    <div class="meta">${isOpen ? 'Tap to collapse' : 'Tap to open'}</div>
                </div>
                <span class="arrow">${isOpen ? 'v' : '>'}</span>
            </div>
        `;
        if (isOpen) {
            html += renderFilePickerNode(folder, depth + 1);
        }
    }

    for (const file of files) {
        const activeClass = file.idx === state.currentFile ? 'active' : '';
        html += `
            <div class="list-item file-picker-item file ${activeClass}" style="margin-left:${margin}px;" data-action="select-file-from-picker" data-file-index="${file.idx}">
                <div class="icon">FILE</div>
                <div class="info">
                    <div class="name">${escapeHtml(file.name)}</div>
                    <div class="meta">${escapeHtml(file.fullPath)}</div>
                </div>
                <span class="arrow">${file.idx === state.currentFile ? 'OK' : '>'}</span>
            </div>
        `;
    }

    return html;
}

function getFileSearchSnippet(content = '', query = '') {
    const body = String(content || '');
    const q = String(query || '').trim().toLowerCase();
    if (!q || !body) return '';

    const lcBody = body.toLowerCase();
    const matchIndex = lcBody.indexOf(q);
    if (matchIndex < 0) return '';

    const start = Math.max(0, matchIndex - 36);
    const end = Math.min(body.length, matchIndex + q.length + 56);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < body.length ? '...' : '';
    return `${prefix}${body.slice(start, end).replace(/\s+/g, ' ').trim()}${suffix}`;
}

function renderFilePickerSearchResults(project, query = '') {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return '';
    const allowContentScan = q.length >= 2;

    const matches = [];
    project.files.forEach((file, idx) => {
        const path = normalizeFilePath(file.name);
        const fileName = path.split('/').pop() || `file-${idx + 1}`;
        const pathHit = path.toLowerCase().includes(q);
        const contentHit = allowContentScan && String(file.content || '').toLowerCase().includes(q);
        if (!pathHit && !contentHit) return;

        matches.push({
            idx,
            fileName,
            fullPath: path || fileName,
            source: pathHit ? 'Path match' : 'Content match',
            snippet: contentHit ? getFileSearchSnippet(file.content, q) : ''
        });
    });

    if (!matches.length) {
        return '<div class="empty-state"><div class="title">No file matched</div><div class="desc">Try another keyword</div></div>';
    }

    const limited = matches.slice(0, 150);
    const listHtml = limited.map(match => {
        const activeClass = match.idx === state.currentFile ? 'active' : '';
        return `
            <div class="list-item file-picker-item file ${activeClass}" data-action="select-file-from-picker" data-file-index="${match.idx}">
                <div class="icon">${uiIcon('file')}</div>
                <div class="info">
                    <div class="name">${escapeHtml(match.fileName)}</div>
                    <div class="meta">${escapeHtml(match.fullPath)}</div>
                    <div class="file-picker-snippet">${escapeHtml(match.source)}${match.snippet ? ` | ${escapeHtml(match.snippet)}` : ''}</div>
                </div>
                <span class="arrow">${match.idx === state.currentFile ? uiIcon('check') : uiIcon('arrow-right')}</span>
            </div>
        `;
    }).join('');

    const suffix = matches.length > limited.length
        ? `<div class="file-picker-search-meta">Showing first ${limited.length} of ${matches.length} matches</div>`
        : `<div class="file-picker-search-meta">${matches.length} match${matches.length === 1 ? '' : 'es'}</div>`;

    return `${suffix}${listHtml}`;
}

function renderFilePicker() {
    const list = document.getElementById('file-picker-list');
    if (!list || state.currentProject === null) return;

    const project = state.projects[state.currentProject];
    const searchInput = document.getElementById('file-picker-search');
    const searchTerm = String(searchInput ? searchInput.value : filePickerSearchTerm || '').trim();
    filePickerSearchTerm = searchTerm;

    if (searchTerm) {
        list.innerHTML = renderFilePickerSearchResults(project, searchTerm);
        return;
    }

    const currentPath = normalizeFilePath(project.files[state.currentFile]?.name || '');
    const folderParts = currentPath ? currentPath.split('/').slice(0, -1) : [];

    let prefix = '';
    for (const part of folderParts) {
        prefix = prefix ? `${prefix}/${part}` : part;
        filePickerExpanded.add(prefix);
    }

    const tree = buildFilePickerTree();
    if (filePickerExpanded.size === 0) {
        for (const folder of tree.folders.values()) {
            filePickerExpanded.add(folder.path);
        }
    }

    const content = renderFilePickerNode(tree, 0);
    list.innerHTML = content || '<div class="empty-state"><div class="title">No files</div><div class="desc">Import files first</div></div>';
}

function showFilePicker() {
    const searchInput = document.getElementById('file-picker-search');
    if (searchInput) searchInput.value = filePickerSearchTerm;
    renderFilePicker();
    showModal('file-picker-modal');
    if (searchInput) searchInput.focus();
}

function toggleFilePickerFolder(encodedPath) {
    let path = '';
    try {
        path = decodeURIComponent(encodedPath);
    } catch (_) {
        path = String(encodedPath || '');
    }
    if (filePickerExpanded.has(path)) filePickerExpanded.delete(path);
    else filePickerExpanded.add(path);
    renderFilePicker();
}

function selectFileFromPicker(idx) {
    switchFile(idx);
    hideModal('file-picker-modal');
}

function switchFile(idx) {
    state.currentFile = idx;
    clearSelectionState();
    touchProjectRecentFile(state.currentProject, idx, { save: false });
    renderFileTabs();
    renderCode({ resetScroll: true });
    saveState();
}

function renderCode(options = {}) {
    requestFullCodeRender(Boolean(options.resetScroll));
    updateSelectionStatus();
}

function clearSelectionState() {
    selectionStartLine = null;
    selectionEndLine = null;
    lastClickedLine = null;
}

function getSelectedRange() {
    if (selectionStartLine === null || selectionEndLine === null) return null;
    return {
        start: Math.min(selectionStartLine, selectionEndLine),
        end: Math.max(selectionStartLine, selectionEndLine)
    };
}

function updateSelectionStatus() {
    const status = document.getElementById('selection-status');
    const selectButton = document.getElementById('select-mode-btn');
    if (selectButton) selectButton.classList.toggle('active', isRangeSelectMode);
    if (!status) return;

    const range = getSelectedRange();

    if (!isRangeSelectMode) {
        status.innerHTML = 'Mark mode: tap lines to mark. Hold <strong>Shift</strong> and click another line to mark a full range.';
        return;
    }

    if (!range) {
        status.textContent = 'Selection mode ON: tap a start line, then tap an end line.';
        return;
    }

    status.textContent = `Selection mode ON: lines ${range.start + 1}-${range.end + 1} selected. Tap "Mark Range" to apply the active color.`;
}

function toggleSelectionMode() {
    isRangeSelectMode = !isRangeSelectMode;
    clearSelectionState();
    refreshVisibleLineClasses();
    updateSelectionStatus();
}

function clearSelection() {
    clearSelectionState();
    refreshVisibleLineClasses();
    updateSelectionStatus();
}

function applySelectionToCurrentColor(showFeedback = true) {
    const range = getSelectedRange();
    if (!range) {
        if (showFeedback) showToast('Select a range first');
        return;
    }

    const project = state.projects[state.currentProject];
    if (!project.highlights[state.currentFile]) project.highlights[state.currentFile] = {};
    const highlights = project.highlights[state.currentFile];

    for (let line = range.start; line <= range.end; line++) {
        if (state.currentColor === 'eraser') delete highlights[line];
        else highlights[line] = state.currentColor;
    }

    invalidateSectionsCache(state.currentFile);
    saveState();

    const count = range.end - range.start + 1;
    if (showFeedback) {
        const action = state.currentColor === 'eraser' ? 'Cleared' : 'Marked';
        showToast(`${action} ${count} line${count === 1 ? '' : 's'}`);
    }

    clearSelectionState();
    updateRenderedRange(range.start, range.end);
    refreshVisibleLineClasses();
    updateSelectionStatus();
}

function handleLineClick(evt, lineIdx) {
    if (isRangeSelectMode) {
        if (selectionStartLine === null) {
            selectionStartLine = lineIdx;
            selectionEndLine = lineIdx;
        } else {
            selectionEndLine = lineIdx;
        }

        refreshVisibleLineClasses();
        updateSelectionStatus();
        return;
    }

    if (evt && evt.shiftKey && lastClickedLine !== null) {
        selectionStartLine = lastClickedLine;
        selectionEndLine = lineIdx;
        applySelectionToCurrentColor(false);
        return;
    }

    lastClickedLine = lineIdx;
    toggleLine(lineIdx);
}

function toggleLine(lineIdx) {
    const project = state.projects[state.currentProject];
    if (!project.highlights[state.currentFile]) project.highlights[state.currentFile] = {};
    
    const highlights = project.highlights[state.currentFile];
    
    if (state.currentColor === 'eraser') {
        delete highlights[lineIdx];
    } else if (highlights[lineIdx] === state.currentColor) {
        // Open chat for this section
        openSectionChat(lineIdx);
        return;
    } else {
        highlights[lineIdx] = state.currentColor;
    }
    
    invalidateSectionsCache(state.currentFile);
    saveState();
    updateRenderedLine(lineIdx);
    updateSelectionStatus();
}

function selectColor(color) {
    state.currentColor = color;
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.color-btn.${color}`).classList.add('active');
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Kit-style icon overrides.
function renderProjects() {
    const list = document.getElementById('projects-list');
    if (state.projects.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="icon">${uiIcon('import', 'lg')}</div><div class="title">No projects yet</div><div class="desc">Import from GitHub or paste code</div></div>`;
        return;
    }

    list.innerHTML = state.projects.map((p, i) => `
        <div class="list-item project-item"
             data-action="project-open"
             data-project-index="${i}"
             >
            <div class="icon">${uiIcon('folder')}</div>
            <div class="info">
                <div class="name">${escapeHtml(p.name || 'Untitled')}</div>
                <div class="meta">${p.files ? p.files.length + ' files' : 'Code snippet'}${Array.isArray(p.recentFiles) && p.recentFiles.length ? ` | ${Math.min(p.recentFiles.length, 6)} recent` : ''}</div>
            </div>
            <span class="arrow">${uiIcon('arrow-right')}</span>
        </div>
    `).join('');
    bindProjectItemGestures();
}

function bindProjectItemGestures() {
    document.querySelectorAll('#projects-list .project-item[data-project-index]').forEach(item => {
        const idx = Number(item.dataset.projectIndex);
        if (!Number.isFinite(idx)) return;
        item.addEventListener('pointerdown', (event) => startProjectLongPress(event, idx));
        item.addEventListener('pointermove', cancelProjectLongPress);
        item.addEventListener('pointerup', cancelProjectLongPress);
        item.addEventListener('pointercancel', cancelProjectLongPress);
        item.addEventListener('pointerleave', cancelProjectLongPress);
    });
}

function renderFilePickerNode(node, depth = 0) {
    const folders = Array.from(node.folders.values()).sort((a, b) => a.name.localeCompare(b.name));
    const files = node.files.slice().sort((a, b) => a.name.localeCompare(b.name));
    const margin = 4 + (depth * 14);
    let html = '';

    for (const folder of folders) {
        const isOpen = filePickerExpanded.has(folder.path);
        const encodedPath = encodeURIComponent(folder.path);
        html += `
            <div class="list-item file-picker-item folder" style="margin-left:${margin}px;" data-action="toggle-file-picker-folder" data-folder-path="${encodedPath}">
                <div class="icon">${uiIcon('folder')}</div>
                <div class="info">
                    <div class="name">${escapeHtml(folder.name)}</div>
                    <div class="meta">${isOpen ? 'Tap to collapse' : 'Tap to open'}</div>
                </div>
                <span class="arrow">${isOpen ? uiIcon('chevron-down') : uiIcon('arrow-right')}</span>
            </div>
        `;
        if (isOpen) {
            html += renderFilePickerNode(folder, depth + 1);
        }
    }

    for (const file of files) {
        const activeClass = file.idx === state.currentFile ? 'active' : '';
        html += `
            <div class="list-item file-picker-item file ${activeClass}" style="margin-left:${margin}px;" data-action="select-file-from-picker" data-file-index="${file.idx}">
                <div class="icon">${uiIcon('file')}</div>
                <div class="info">
                    <div class="name">${escapeHtml(file.name)}</div>
                    <div class="meta">${escapeHtml(file.fullPath)}</div>
                </div>
                <span class="arrow">${file.idx === state.currentFile ? uiIcon('check') : uiIcon('arrow-right')}</span>
            </div>
        `;
    }

    return html;
}
