// ============ INIT ============
function init() {
    loadApiKeysFromStorage();
    applyKitIcons();
    loadState();
    ensureStateShape();
    if (typeof ensureLearnerGem === 'function') ensureLearnerGem();
    renderProjects();
    renderGems();
    renderFolders();
    loadSettings();
    if (typeof renderLearningHomePreview === 'function') renderLearningHomePreview();
    if (typeof renderHomeRecentChatsPreview === 'function') renderHomeRecentChatsPreview();
    if (typeof renderLearningScreen === 'function') renderLearningScreen();
    if (typeof renderLearningReviewChatScreen === 'function') renderLearningReviewChatScreen();
    setupEventListeners();
    updateSelectionStatus();
    updateAIQueueUI();
    if (typeof applyReferenceReadOnlyUI === 'function') applyReferenceReadOnlyUI();
}

function applyKitIcons() {
    const setIcon = (selector, iconName, classes = '') => {
        const el = document.querySelector(selector);
        if (el) el.innerHTML = uiIcon(iconName, classes);
    };

    setIcon('.logo-icon', 'search');
    setIcon('.header-actions .icon-btn:nth-child(1)', 'bookmark');
    setIcon('.header-actions .icon-btn:nth-child(2)', 'settings');

    const quickIcons = ['import', 'clipboard', 'chat', 'brain', 'menu'];
    document.querySelectorAll('#home-screen .quick-grid .quick-card .icon').forEach((el, idx) => {
        el.innerHTML = uiIcon(quickIcons[idx] || 'spark', 'lg');
    });

    setIcon('#project-screen .code-header .icon-btn:nth-child(1)', 'arrow-left');
    setIcon('#project-screen .code-header .icon-btn:nth-child(3)', 'chat');
    const eraserBtn = document.querySelector('.color-btn.eraser');
    if (eraserBtn) eraserBtn.innerHTML = uiIcon('eraser');

    const toolbarButtons = document.querySelectorAll('#project-screen .toolbar-btn');
    if (toolbarButtons[0]) toolbarButtons[0].innerHTML = iconWithText('menu', 'View');
    if (toolbarButtons[1]) toolbarButtons[1].innerHTML = iconWithText('target', 'Mark');
    if (toolbarButtons[5]) toolbarButtons[5].innerHTML = iconWithText('sections', 'Sections');
    if (toolbarButtons[6]) toolbarButtons[6].innerHTML = iconWithText('bot', 'Avatar Chat');
    if (toolbarButtons[7]) toolbarButtons[7].innerHTML = iconWithText('settings', 'Color Names');

    setIcon('#chat-screen [data-action="go-back-from-chat"]', 'arrow-left');
    const chatCaptureBtn = document.getElementById('chat-capture-learning-btn');
    if (chatCaptureBtn) chatCaptureBtn.innerHTML = iconWithText('brain', 'Save as Learning', 'tight');
    const linePinBtn = document.getElementById('line-chat-pin-btn');
    if (linePinBtn) linePinBtn.innerHTML = uiIcon('bookmark');
    setIcon('#chat-screen [data-action="show-chat-bookmarks"]', 'bookmark');
    setIcon('#chat-send-btn', 'send');

    setIcon('#general-chat-screen [data-action="show-screen"][data-screen="home-screen"]', 'arrow-left');
    const generalCaptureBtn = document.getElementById('general-capture-learning-btn');
    if (generalCaptureBtn) generalCaptureBtn.innerHTML = iconWithText('brain', 'Save as Learning', 'tight');
    setIcon('#general-chat-screen [data-action="show-general-chat-folders"]', 'folder');
    setIcon('#general-chat-screen [data-action="show-avatar-picker"]', 'bot');
    setIcon('#general-chat-send-btn', 'send');

    setIcon('#learning-screen .code-header .icon-btn:nth-child(1)', 'arrow-left');
    setIcon('#learning-chat-screen .chat-header .icon-btn:nth-child(1)', 'arrow-left');
    setIcon('#learning-chat-screen .chat-header .icon-btn:nth-child(3)', 'plus');
    setIcon('#learning-review-send-btn', 'send');
    setIcon('#gems-screen .code-header .icon-btn:nth-child(1)', 'arrow-left');
    setIcon('#gems-screen .code-header .icon-btn:nth-child(3)', 'plus');
    setIcon('#bookmarks-screen .code-header .icon-btn:nth-child(1)', 'arrow-left');
    setIcon('#folders-screen .code-header .icon-btn:nth-child(1)', 'arrow-left');
    setIcon('#folders-screen .code-header .icon-btn:nth-child(3)', 'plus');
    setIcon('#settings-screen .code-header .icon-btn:nth-child(1)', 'arrow-left');
    setIcon('#recent-chats-screen .code-header .icon-btn:nth-child(1)', 'arrow-left');

    document.querySelectorAll('#bookmarks-filter .filter-chip').forEach(chip => {
        const color = chip.dataset.color;
        if (!color || color === 'all') return;
        chip.innerHTML = `<span class="color-dot ${color}"></span>`;
    });

    const apiLabels = [
        ['#api-openrouter', 'chat', 'OpenRouter'],
        ['#api-siliconflow', 'bolt', 'SiliconFlow']
    ];
    apiLabels.forEach(([selector, iconName, label]) => {
        const row = document.querySelector(selector);
        if (!row) return;
        row.innerHTML = `<span class="api-status"></span><span class="icon-with-text tight">${uiIcon(iconName, 'sm')}<span>${label}</span></span>`;
    });

    const redLabel = document.getElementById('color-name-red')?.previousElementSibling;
    const greenLabel = document.getElementById('color-name-green')?.previousElementSibling;
    const yellowLabel = document.getElementById('color-name-yellow')?.previousElementSibling;
    const blueLabel = document.getElementById('color-name-blue')?.previousElementSibling;
    const purpleLabel = document.getElementById('color-name-purple')?.previousElementSibling;
    if (redLabel) redLabel.innerHTML = `<span class="color-dot red"></span> Red Name`;
    if (greenLabel) greenLabel.innerHTML = `<span class="color-dot green"></span> Green Name`;
    if (yellowLabel) yellowLabel.innerHTML = `<span class="color-dot yellow"></span> Yellow Name`;
    if (blueLabel) blueLabel.innerHTML = `<span class="color-dot blue"></span> Blue Name`;
    if (purpleLabel) purpleLabel.innerHTML = `<span class="color-dot purple"></span> Purple Name`;

    const exportBtn = document.getElementById('settings-export-btn');
    const importBtn = document.getElementById('settings-import-trigger-btn');
    const clearBtn = document.getElementById('settings-clear-btn');
    if (exportBtn) exportBtn.innerHTML = iconWithText('export', 'Export Backup');
    if (importBtn) importBtn.innerHTML = iconWithText('import', 'Import Backup');
    if (clearBtn) clearBtn.innerHTML = iconWithText('trash', 'Clear All Data');

    document.querySelectorAll('.bottom-nav .nav-item .icon').forEach((el, idx) => {
        const icons = ['home', 'brain', 'folder', 'settings'];
        el.innerHTML = uiIcon(icons[idx] || 'spark');
    });

    document.querySelectorAll('.modal-close').forEach(el => {
        el.innerHTML = uiIcon('close');
    });

    const toggleBookmarkBtn = document.getElementById('bubble-toggle-bookmark-btn');
    const saveToFolderBtn = document.getElementById('bubble-save-folder-btn');
    const saveLearningBtn = document.getElementById('bubble-save-learning-btn');
    const newFolderBtn = document.getElementById('save-snippet-new-folder-btn');
    const askLearningBtn = document.getElementById('learning-concept-ask-btn');
    if (toggleBookmarkBtn) toggleBookmarkBtn.innerHTML = iconWithText('bookmark', 'Toggle Bookmark');
    if (saveToFolderBtn) saveToFolderBtn.innerHTML = iconWithText('folder', 'Save to Folder');
    if (saveLearningBtn) saveLearningBtn.innerHTML = iconWithText('brain', 'Save as Learning');
    if (newFolderBtn) newFolderBtn.innerHTML = iconWithText('plus', 'New Folder');
    if (askLearningBtn) askLearningBtn.innerHTML = iconWithText('chat', 'Ask Learner Gem');

    const faceValues = ['senior-dev', 'teacher', 'debug-bot', 'reviewer', 'quick-helper', 'brain', 'user', 'bolt'];
    document.querySelectorAll('#gem-face-picker .face-option').forEach((el, idx) => {
        const faceKey = faceValues[idx] || 'debug-bot';
        el.dataset.face = faceKey;
        el.innerHTML = renderFaceGlyph(faceKey, 'lg');
    });
}

function loadState() {
    const saved = localStorage.getItem(STATE_STORAGE_KEY) || localStorage.getItem(LEGACY_STATE_STORAGE_KEY);
    if (!saved) return;

    try {
        const parsed = sanitizePersistedState(JSON.parse(saved));
        state = { ...state, ...parsed };
        sectionsCache.clear();
    } catch (_) {
        localStorage.removeItem(STATE_STORAGE_KEY);
        localStorage.removeItem(LEGACY_STATE_STORAGE_KEY);
    }
}

function flushStateSave() {
    if (!saveStatePending) return;
    saveStatePending = false;
    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(getPersistedStateSnapshot()));
    if (STATE_STORAGE_KEY !== LEGACY_STATE_STORAGE_KEY) {
        localStorage.removeItem(LEGACY_STATE_STORAGE_KEY);
    }
}

function saveState() {
    saveStatePending = true;
    if (saveStateTimer) clearTimeout(saveStateTimer);
    saveStateTimer = setTimeout(() => {
        saveStateTimer = null;
        flushStateSave();
    }, SAVE_DEBOUNCE_MS);
}

function invalidateSectionsCache(fileIdx = null) {
    if (state.currentProject === null) return;

    if (fileIdx === null) {
        const prefix = `${state.currentProject}:`;
        for (const key of Array.from(sectionsCache.keys())) {
            if (key.startsWith(prefix)) sectionsCache.delete(key);
        }
        return;
    }

    sectionsCache.delete(`${state.currentProject}:${fileIdx}`);
}

function getCurrentHighlights() {
    if (state.currentProject === null || state.currentFile === null) return {};
    const project = state.projects[state.currentProject];
    return project?.highlights?.[state.currentFile] || {};
}

function getCodeViewerElements() {
    const viewer = document.getElementById('code-viewer');
    if (!viewer) return null;

    if (!codeViewState.viewerInitialized) {
        viewer.innerHTML = `
            <div id="code-top-spacer"></div>
            <div id="code-lines-container"></div>
            <div id="code-bottom-spacer"></div>
        `;
        viewer.addEventListener('scroll', scheduleRenderVisibleCodeLines);
        codeViewState.viewerInitialized = true;
    }

    return {
        viewer,
        topSpacer: document.getElementById('code-top-spacer'),
        linesContainer: document.getElementById('code-lines-container'),
        bottomSpacer: document.getElementById('code-bottom-spacer')
    };
}

function getSelectionClassForLine(lineIdx) {
    const range = getSelectedRange();
    const isSelectedRange = range && lineIdx >= range.start && lineIdx <= range.end;
    const isAnchor = isRangeSelectMode && selectionStartLine === lineIdx;
    return `${isSelectedRange ? 'selected-range' : ''} ${isAnchor ? 'selected-anchor' : ''}`.trim();
}

function applyLineClasses(lineEl, lineIdx) {
    if (state.currentProject === null || state.currentFile === null) return;
    const project = state.projects[state.currentProject];
    const highlights = getCurrentHighlights();
    const color = highlights[lineIdx];
    const markLevel = color ? `mark-level-${getHighlightLevel(project, state.currentFile, lineIdx)}` : '';
    const markedClass = color ? `marked-${color} ${markLevel}` : '';
    const selectionClass = getSelectionClassForLine(lineIdx);
    const pinClass = getLinePinChatId(project, state.currentFile, lineIdx) ? 'has-pin' : '';
    lineEl.className = `code-line ${markedClass} ${selectionClass} ${pinClass}`.trim();
}

function detectLanguageFromFileName(fileName = '') {
    const lower = fileName.toLowerCase();
    const ext = lower.includes('.') ? lower.split('.').pop() : '';

    if (['py'].includes(ext)) return 'python';
    if (['json'].includes(ext)) return 'json';
    if (['html', 'htm', 'xml', 'svg'].includes(ext)) return 'markup';
    if (['css', 'scss', 'sass', 'less'].includes(ext)) return 'css';
    if (['md', 'markdown'].includes(ext)) return 'markdown';
    if (['yml', 'yaml', 'toml', 'ini', 'env'].includes(ext)) return 'config';
    if (['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'java', 'kt', 'kts', 'swift', 'go', 'rs', 'c', 'cpp', 'cc', 'h', 'hpp', 'php', 'rb', 'sh'].includes(ext)) return 'jslike';

    return 'plain';
}

function detectLanguageFromHint(languageHint = '') {
    const hint = String(languageHint || '').toLowerCase().trim();
    if (!hint) return 'plain';

    if (['py', 'python', 'py3'].includes(hint)) return 'python';
    if (['json', 'jsonc'].includes(hint)) return 'json';
    if (['html', 'htm', 'xml', 'svg'].includes(hint)) return 'markup';
    if (['css', 'scss', 'sass', 'less'].includes(hint)) return 'css';
    if (['md', 'markdown', 'mdx'].includes(hint)) return 'markdown';
    if (['yaml', 'yml', 'toml', 'ini', 'dotenv', 'env'].includes(hint)) return 'config';
    if (['js', 'javascript', 'jsx', 'ts', 'typescript', 'tsx', 'java', 'kotlin', 'kt', 'swift', 'go', 'rust', 'rs', 'c', 'cpp', 'c++', 'csharp', 'cs', 'php', 'ruby', 'rb', 'bash', 'sh', 'shell'].includes(hint)) return 'jslike';

    return 'plain';
}

function getTokenClass(groups = {}) {
    if (groups.comment) return 'syn-comment';
    if (groups.string) return 'syn-string';
    if (groups.keyword) return 'syn-keyword';
    if (groups.number) return 'syn-number';
    if (groups.function) return 'syn-function';
    if (groups.type) return 'syn-type';
    if (groups.operator) return 'syn-operator';
    return '';
}

function highlightWithRegex(escapedLine, regex) {
    regex.lastIndex = 0;
    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(escapedLine)) !== null) {
        if (match.index > lastIndex) {
            result += escapedLine.slice(lastIndex, match.index);
        }

        const tokenClass = getTokenClass(match.groups || {});
        result += tokenClass ? `<span class="${tokenClass}">${match[0]}</span>` : match[0];
        lastIndex = regex.lastIndex;

        if (match[0].length === 0) {
            regex.lastIndex += 1;
        }
    }

    if (lastIndex < escapedLine.length) {
        result += escapedLine.slice(lastIndex);
    }

    return result || '&nbsp;';
}

function highlightCodeLine(rawLine, language) {
    if (rawLine === '') return '&nbsp;';
    const escaped = escapeHtml(rawLine);
    if (!escaped.trim()) return '&nbsp;';

    if (language === 'python') return highlightWithRegex(escaped, PY_TOKEN_RE);
    if (language === 'json') return highlightWithRegex(escaped, JSON_TOKEN_RE);
    if (language === 'markup') return highlightWithRegex(escaped, HTML_TOKEN_RE);
    if (language === 'css') return highlightWithRegex(escaped, CSS_TOKEN_RE);
    if (language === 'markdown') return highlightWithRegex(escaped, MD_TOKEN_RE);
    if (language === 'config') return highlightWithRegex(escaped, CFG_TOKEN_RE);
    if (language === 'jslike') return highlightWithRegex(escaped, JS_TOKEN_RE);
    return escaped;
}

function getHighlightedLineHTML(lineIdx) {
    if (codeViewState.highlightCache.has(lineIdx)) {
        return codeViewState.highlightCache.get(lineIdx);
    }

    const rawLine = codeViewState.lines[lineIdx] || '';
    const html = highlightCodeLine(rawLine, codeViewState.fileLanguage);
    codeViewState.highlightCache.set(lineIdx, html);
    return html;
}

function renderCodeLineElement(lineIdx) {
    const lineEl = document.createElement('div');
    lineEl.dataset.line = String(lineIdx);
    applyLineClasses(lineEl, lineIdx);
    lineEl.addEventListener('click', (event) => handleLineClick(event, lineIdx));
    lineEl.addEventListener('dblclick', (event) => {
        if (typeof handleLineDoubleClick === 'function') handleLineDoubleClick(event, lineIdx);
    });

    const lineNum = document.createElement('span');
    lineNum.className = 'line-num';
    lineNum.textContent = String(lineIdx + 1);

    if (state.currentProject !== null && state.currentFile !== null) {
        const project = state.projects[state.currentProject];
        const linePinChatId = getLinePinChatId(project, state.currentFile, lineIdx);
        if (linePinChatId) {
            const pinBtn = document.createElement('button');
            pinBtn.type = 'button';
            pinBtn.className = 'line-pin-btn';
            pinBtn.title = `Open line ${lineIdx + 1} note`;
            pinBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (typeof openLineChatById === 'function') {
                    openLineChatById(linePinChatId, { fileIdx: state.currentFile, lineIdx });
                }
            });
            lineEl.appendChild(pinBtn);
        }
    }

    const lineText = document.createElement('span');
    lineText.className = 'line-text';
    lineText.innerHTML = getHighlightedLineHTML(lineIdx);

    lineEl.appendChild(lineNum);
    lineEl.appendChild(lineText);
    return lineEl;
}

function renderVisibleCodeLines(force = false) {
    const refs = getCodeViewerElements();
    if (!refs) return;

    const { viewer, topSpacer, linesContainer, bottomSpacer } = refs;
    const totalLines = codeViewState.lines.length;

    if (totalLines === 0) {
        codeViewState.renderStart = -1;
        codeViewState.renderEnd = -1;
        topSpacer.style.height = '0px';
        bottomSpacer.style.height = '0px';
        linesContainer.innerHTML = '';
        return;
    }

    const viewportHeight = Math.max(1, viewer.clientHeight);
    const firstVisible = Math.floor(viewer.scrollTop / VIRTUAL_LINE_HEIGHT);
    const visibleCount = Math.ceil(viewportHeight / VIRTUAL_LINE_HEIGHT);
    const renderStart = Math.max(0, firstVisible - VIRTUAL_OVERSCAN);
    const renderEnd = Math.min(totalLines - 1, firstVisible + visibleCount + VIRTUAL_OVERSCAN);

    if (!force && renderStart === codeViewState.renderStart && renderEnd === codeViewState.renderEnd) {
        return;
    }

    codeViewState.renderStart = renderStart;
    codeViewState.renderEnd = renderEnd;

    topSpacer.style.height = `${renderStart * VIRTUAL_LINE_HEIGHT}px`;
    bottomSpacer.style.height = `${Math.max(0, (totalLines - renderEnd - 1) * VIRTUAL_LINE_HEIGHT)}px`;

    const frag = document.createDocumentFragment();
    for (let lineIdx = renderStart; lineIdx <= renderEnd; lineIdx++) {
        frag.appendChild(renderCodeLineElement(lineIdx));
    }
    linesContainer.innerHTML = '';
    linesContainer.appendChild(frag);
}

function scheduleRenderVisibleCodeLines() {
    if (codeViewState.renderScheduled) return;
    codeViewState.renderScheduled = true;
    requestAnimationFrame(() => {
        codeViewState.renderScheduled = false;
        renderVisibleCodeLines();
    });
}

function refreshVisibleLineClasses() {
    const refs = getCodeViewerElements();
    if (!refs) return;

    refs.linesContainer.querySelectorAll('.code-line').forEach(el => {
        const lineIdx = Number(el.dataset.line);
        applyLineClasses(el, lineIdx);
    });
}

function updateRenderedLine(lineIdx) {
    const refs = getCodeViewerElements();
    if (!refs) return;

    const el = refs.linesContainer.querySelector(`.code-line[data-line="${lineIdx}"]`);
    if (el) applyLineClasses(el, lineIdx);
}

function updateRenderedRange(start, end) {
    if (codeViewState.renderStart < 0 || codeViewState.renderEnd < 0) return;
    const from = Math.max(start, codeViewState.renderStart);
    const to = Math.min(end, codeViewState.renderEnd);
    for (let line = from; line <= to; line++) {
        updateRenderedLine(line);
    }
}

function requestFullCodeRender(resetScroll = false) {
    const refs = getCodeViewerElements();
    if (!refs) return;

    const { viewer } = refs;
    const file = state.projects[state.currentProject].files[state.currentFile];
    const fileKey = `${state.currentProject}:${state.currentFile}`;
    const shouldReset = resetScroll || codeViewState.fileKey !== fileKey;

    codeViewState.fileKey = fileKey;
    codeViewState.lines = file.content.split('\n');
    codeViewState.fileLanguage = detectLanguageFromFileName(file.name || '');
    codeViewState.highlightCache = new Map();
    codeViewState.renderStart = -1;
    codeViewState.renderEnd = -1;

    if (shouldReset) viewer.scrollTop = 0;
    renderVisibleCodeLines(true);
}

function setupEventListeners() {
    document.getElementById('chat-input').addEventListener('keypress', e => {
        if (e.key === 'Enter') sendMessage();
    });
    document.getElementById('general-chat-input').addEventListener('keypress', e => {
        if (e.key === 'Enter') sendGeneralMessage();
    });
    document.getElementById('learning-review-input')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') sendLearningReviewMessage();
    });

    const chatProviderSelect = document.getElementById('chat-provider-select');
    const chatModelSelect = document.getElementById('chat-model-select');
    const generalProviderSelect = document.getElementById('general-chat-provider-select');
    const generalModelSelect = document.getElementById('general-chat-model-select');

    if (chatProviderSelect) {
        chatProviderSelect.addEventListener('change', event => {
            handleChatProviderChange('section', event.target.value);
        });
    }
    if (chatModelSelect) {
        chatModelSelect.addEventListener('change', event => {
            handleChatModelChange('section', event.target.value);
        });
    }
    if (generalProviderSelect) {
        generalProviderSelect.addEventListener('change', event => {
            handleChatProviderChange('general', event.target.value);
        });
    }
    if (generalModelSelect) {
        generalModelSelect.addEventListener('change', event => {
            handleChatModelChange('general', event.target.value);
        });
    }

    document.querySelectorAll('#gem-face-picker .face-option').forEach(el => {
        el.addEventListener('click', () => {
            document.querySelectorAll('#gem-face-picker .face-option').forEach(face => face.classList.remove('selected'));
            el.classList.add('selected');
        });
    });

    document.querySelectorAll('.color-picker .color-option').forEach(el => {
        el.addEventListener('click', () => {
            el.parentElement.querySelectorAll('.color-option').forEach(option => option.classList.remove('selected'));
            el.classList.add('selected');
        });
    });

    const importBackupInput = document.getElementById('import-backup');
    if (importBackupInput) {
        importBackupInput.addEventListener('change', importBackup);
    }

    const filePickerSearchInput = document.getElementById('file-picker-search');
    if (filePickerSearchInput) {
        filePickerSearchInput.addEventListener('input', event => {
            filePickerSearchTerm = String(event.target.value || '');
            renderFilePicker();
        });
    }

    const recentChatsSearchInput = document.getElementById('recent-chats-search');
    if (recentChatsSearchInput) {
        recentChatsSearchInput.addEventListener('input', event => {
            recentChatsSearchTerm = String(event.target.value || '');
            recentChatsVisibleCount = RECENT_CHATS_PAGE_SIZE;
            if (typeof renderRecentChatsScreen === 'function') renderRecentChatsScreen({ reset: true });
        });
    }

    const recentChatsScroll = document.getElementById('recent-chats-scroll');
    if (recentChatsScroll) {
        recentChatsScroll.addEventListener('scroll', () => {
            if (typeof handleRecentChatsScroll === 'function') handleRecentChatsScroll(recentChatsScroll);
        });
    }

    document.addEventListener('click', handleDelegatedActionClick);
    document.addEventListener('backbutton', handleAndroidBackButton);
    if (typeof initializeNavigationBackHandling === 'function') {
        initializeNavigationBackHandling();
    }
    window.addEventListener('resize', scheduleRenderVisibleCodeLines);
    window.addEventListener('beforeunload', flushStateSave);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) flushStateSave();
    });
}

function getDatasetNumber(el, key) {
    const value = Number(el?.dataset?.[key]);
    return Number.isFinite(value) ? value : null;
}

function runDelegatedAction(actionEl) {
    const action = actionEl?.dataset?.action || '';
    if (!action) return false;

    switch (action) {
        case 'show-screen':
            if (actionEl.dataset.screen) showScreen(actionEl.dataset.screen);
            return true;
        case 'show-modal':
            if (actionEl.dataset.modal) showModal(actionEl.dataset.modal);
            return true;
        case 'hide-modal':
            if (actionEl.dataset.modal) hideModal(actionEl.dataset.modal);
            return true;
        case 'show-project-chats':
            showProjectChats();
            return true;
        case 'show-file-picker':
            showFilePicker();
            return true;
        case 'select-color':
            if (actionEl.dataset.color) selectColor(actionEl.dataset.color);
            return true;
        case 'set-interaction-mode':
            if (typeof setCodeInteractionMode === 'function') {
                setCodeInteractionMode(actionEl.dataset.mode || 'view');
            }
            return true;
        case 'toggle-selection-mode':
            toggleSelectionMode();
            return true;
        case 'apply-selection-range':
            applySelectionToCurrentColor();
            return true;
        case 'clear-selection':
            clearSelection();
            return true;
        case 'show-marked-sections':
            showMarkedSections();
            return true;
        case 'show-project-avatar-chat':
            showProjectAvatarChat();
            return true;
        case 'go-back-from-chat':
            goBackFromChat();
            return true;
        case 'show-chat-bookmarks':
            showChatBookmarks();
            return true;
        case 'capture-chat-learning':
            if (typeof captureCurrentChatLearning === 'function') captureCurrentChatLearning();
            return true;
        case 'send-section-chat':
            sendMessage();
            return true;
        case 'cancel-ai-queue':
            cancelPendingRequests();
            return true;
        case 'show-general-chat-folders':
            showGeneralChatFolders();
            return true;
        case 'show-avatar-picker':
            showAvatarPicker();
            return true;
        case 'send-general-chat':
            sendGeneralMessage();
            return true;
        case 'filter-bookmarks':
            filterBookmarks(actionEl.dataset.color || 'all');
            return true;
        case 'set-active-api':
            if (actionEl.dataset.api) setActiveAPI(actionEl.dataset.api);
            return true;
        case 'save-settings':
            saveSettings();
            return true;
        case 'save-color-names':
            saveColorNames();
            return true;
        case 'export-backup':
            exportBackup();
            return true;
        case 'open-import-backup':
            document.getElementById('import-backup')?.click();
            return true;
        case 'clear-all-data':
            clearAllData();
            return true;
        case 'import-from-github':
            importFromGitHub();
            return true;
        case 'create-from-paste':
            createFromPaste();
            return true;
        case 'create-gem':
            createGem();
            return true;
        case 'create-folder':
            createFolder();
            return true;
        case 'toggle-bookmark':
            toggleBookmark();
            return true;
        case 'save-to-folder':
            saveToFolder();
            return true;
        case 'save-learning-from-bubble':
            if (typeof saveSelectedBubbleAsLearning === 'function') saveSelectedBubbleAsLearning();
            return true;
        case 'mark-current-line-chat':
            if (typeof markCurrentLineChat === 'function') markCurrentLineChat();
            return true;
        case 'confirm-learning-capture':
            if (typeof confirmLearningCapturePreview === 'function') confirmLearningCapturePreview();
            return true;
        case 'cancel-learning-capture':
            if (typeof cancelLearningCapturePreview === 'function') cancelLearningCapturePreview();
            return true;
        case 'open-learning-session':
            if (typeof openLearningSessionById === 'function') openLearningSessionById(actionEl.dataset.sessionId || '');
            return true;
        case 'open-learning-concept':
            if (typeof openLearningConceptById === 'function') openLearningConceptById(actionEl.dataset.conceptId || '');
            return true;
        case 'start-learning-review-chat':
            if (typeof startLearningReviewChatFromConcept === 'function') startLearningReviewChatFromConcept(actionEl.dataset.conceptId || '', { forceNew: true });
            return true;
        case 'start-learning-review-chat-from-modal':
            if (typeof startLearningReviewChatFromConcept === 'function') startLearningReviewChatFromConcept(actionEl.dataset.conceptId || '', { forceNew: true, useActiveConcept: true });
            return true;
        case 'open-learning-review-chat':
            if (typeof openLearningReviewChatById === 'function') openLearningReviewChatById(actionEl.dataset.reviewChatId || '');
            return true;
        case 'set-learning-graph-mode':
            if (typeof setLearningGraphMode === 'function') setLearningGraphMode(actionEl.dataset.mode || 'connections');
            return true;
        case 'toggle-learning-graph-size':
            if (typeof toggleLearningGraphExpanded === 'function') toggleLearningGraphExpanded();
            return true;
        case 'learning-graph-zoom-in':
            if (typeof setLearningGraphZoom === 'function' && typeof getLearningGraphZoom === 'function') {
                setLearningGraphZoom(getLearningGraphZoom() + 0.2);
            }
            return true;
        case 'learning-graph-zoom-out':
            if (typeof setLearningGraphZoom === 'function' && typeof getLearningGraphZoom === 'function') {
                setLearningGraphZoom(getLearningGraphZoom() - 0.2);
            }
            return true;
        case 'learning-graph-zoom-reset':
            if (typeof setLearningGraphZoom === 'function') setLearningGraphZoom(1.45);
            return true;
        case 'learning-review-new-chat':
            if (typeof startLearningReviewChatFromConcept === 'function') startLearningReviewChatFromConcept('', { forceNew: true, useActiveConcept: true });
            return true;
        case 'send-learning-review':
            if (typeof sendLearningReviewMessage === 'function') sendLearningReviewMessage();
            return true;
        case 'exit-reference-session':
            if (typeof exitLearningSessionReference === 'function') exitLearningSessionReference();
            return true;
        case 'cancel-project-delete':
            cancelProjectDelete();
            return true;
        case 'delete-selected-project':
            deleteSelectedProject();
            return true;
        case 'project-open': {
            const projectIndex = getDatasetNumber(actionEl, 'projectIndex');
            if (projectIndex !== null) handleProjectTap(projectIndex);
            return true;
        }
        case 'toggle-file-picker-folder':
            toggleFilePickerFolder(actionEl.dataset.folderPath || '');
            return true;
        case 'set-file-search-mode':
            if (typeof setFilePickerSearchMode === 'function') setFilePickerSearchMode(actionEl.dataset.mode || 'smart');
            return true;
        case 'select-file-from-picker': {
            const fileIndex = getDatasetNumber(actionEl, 'fileIndex');
            if (fileIndex !== null) selectFileFromPicker(fileIndex);
            return true;
        }
        case 'open-project-recent-file': {
            const fileIndex = getDatasetNumber(actionEl, 'fileIndex');
            if (fileIndex !== null) switchFile(fileIndex);
            return true;
        }
        case 'open-recent-chat':
            if (typeof openRecentChat === 'function') openRecentChat(actionEl);
            return true;
        case 'open-folder': {
            const folderIndex = getDatasetNumber(actionEl, 'folderIndex');
            if (folderIndex !== null) openFolder(folderIndex);
            return true;
        }
        case 'save-snippet-to-folder': {
            const folderIndex = getDatasetNumber(actionEl, 'folderIndex');
            if (folderIndex !== null) saveSnippetToFolder(folderIndex);
            return true;
        }
        case 'set-active-gem': {
            const gemIndex = getDatasetNumber(actionEl, 'gemIndex');
            if (gemIndex !== null) setActiveGem(gemIndex);
            return true;
        }
        case 'clear-active-gem':
            clearActiveGem();
            return true;
        case 'toggle-gem-active': {
            const gemIndex = getDatasetNumber(actionEl, 'gemIndex');
            if (gemIndex !== null) toggleGemActive(gemIndex);
            return true;
        }
        case 'select-avatar': {
            const avatarIndex = getDatasetNumber(actionEl, 'avatarIndex');
            if (avatarIndex !== null) selectAvatar(avatarIndex);
            return true;
        }
        case 'open-section-chat':
            if (actionEl.dataset.sectionId) openSectionChatById(actionEl.dataset.sectionId);
            return true;
        case 'show-bubble-options': {
            const bubbleIndex = getDatasetNumber(actionEl, 'bubbleIndex');
            if (bubbleIndex !== null) showBubbleOptions(bubbleIndex);
            return true;
        }
        default:
            return false;
    }
}

function handleDelegatedActionClick(event) {
    const actionEl = findDelegatedActionElement(event.target);
    if (!actionEl) return;
    if (actionEl.disabled) return;

    if (runDelegatedAction(actionEl)) {
        event.preventDefault();
    }
}

function findDelegatedActionElement(target) {
    if (!target) return null;

    if (typeof target.closest === 'function') {
        const found = target.closest('[data-action]');
        if (found) return found;
    }

    let node = target;
    while (node) {
        if (node.dataset?.action) return node;
        node = node.parentNode || node.host || null;
    }
    return null;
}
