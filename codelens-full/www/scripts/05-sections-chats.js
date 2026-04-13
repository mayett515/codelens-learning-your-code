// ============ SECTIONS & CHATS ============
function getSectionsForFile(fileIdx) {
    const cacheKey = `${state.currentProject}:${fileIdx}`;
    if (sectionsCache.has(cacheKey)) {
        return sectionsCache.get(cacheKey);
    }

    const project = state.projects[state.currentProject];
    const highlights = project.highlights[fileIdx] || {};
    const sections = [];
    
    const lineNums = Object.keys(highlights).map(Number).sort((a, b) => a - b);
    if (lineNums.length === 0) {
        sectionsCache.set(cacheKey, sections);
        return sections;
    }
    
    let start = lineNums[0];
    let currentColor = highlights[start];
    
    for (let i = 1; i <= lineNums.length; i++) {
        const line = lineNums[i];
        const prevLine = lineNums[i - 1];
        
        if (i === lineNums.length || line !== prevLine + 1 || highlights[line] !== currentColor) {
            sections.push({
                id: `${fileIdx}-${currentColor}-${start}-${prevLine}`,
                color: currentColor,
                start,
                end: prevLine,
                fileIdx
            });
            
            if (i < lineNums.length) {
                start = line;
                currentColor = highlights[line];
            }
        }
    }
    
    sectionsCache.set(cacheKey, sections);
    return sections;
}

function getSections() {
    return getSectionsForFile(state.currentFile);
}

function getAllSections() {
    const project = state.projects[state.currentProject];
    let all = [];

    for (let fileIdx = 0; fileIdx < project.files.length; fileIdx++) {
        all = all.concat(getSectionsForFile(fileIdx));
    }

    return all.sort((a, b) => (a.fileIdx - b.fileIdx) || (a.start - b.start));
}

function getSectionPreview(section) {
    const project = state.projects[state.currentProject];
    const file = project.files[section.fileIdx];
    if (!file) return '';

    const content = file.content
        .split('\n')
        .slice(section.start, section.end + 1)
        .join(' ')
        .trim();

    const truncated = content.length > 120 ? content.slice(0, 120) + '...' : content;
    return escapeHtml(truncated || '(empty section)');
}

function showMarkedSections() {
    const project = state.projects[state.currentProject];
    const sections = getAllSections();
    const list = document.getElementById('sections-list');
    
    if (sections.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="title">No marked sections</div><div class="desc">Tap lines to mark them with colors</div></div>';
    } else {
        const grouped = new Map();
        for (const section of sections) {
            if (!grouped.has(section.fileIdx)) grouped.set(section.fileIdx, []);
            grouped.get(section.fileIdx).push(section);
        }

        list.innerHTML = Array.from(grouped.entries()).map(([fileIdx, fileSections]) => {
            const fileName = escapeHtml(project.files[fileIdx]?.name || `File ${fileIdx + 1}`);

            return `
            <div class="sections-group">
                <div class="sections-group-title">
                    <span>${fileName}</span>
                    <span class="section-count-chip">${fileSections.length} section${fileSections.length === 1 ? '' : 's'}</span>
                </div>
                ${fileSections.map(s => `
            <div class="list-item" data-action="open-section-chat" data-section-id="${s.id}">
                <div class="icon" style="background:var(--color-${s.color})"></div>
                <div class="info">
                    <div class="name">${state.colorNames[s.color] || s.color}</div>
                    <div class="meta">Lines ${s.start + 1} - ${s.end + 1}</div>
                    <div class="section-preview">${getSectionPreview(s)}</div>
                </div>
                <span class="arrow">${uiIcon('chat')}</span>
            </div>
                `).join('')}
            </div>
            `;
        }).join('');
    }
    
    showModal('sections-modal');
}

function openSectionChat(lineIdx) {
    const sections = getSectionsForFile(state.currentFile);
    const section = sections.find(s => lineIdx >= s.start && lineIdx <= s.end);
    if (!section) return;
    
    openSectionChatById(section.id);
}

function updateLineChatPinButton() {
    const button = document.getElementById('line-chat-pin-btn');
    if (!button) return;

    const isLineChat = state.currentChat?.type === 'line';
    button.classList.toggle('is-hidden', !isLineChat);
    if (!isLineChat) return;

    const project = state.projects[state.currentProject];
    const lineIdx = Number(state.currentChat?.lineIdx);
    const lineNumber = Number.isInteger(lineIdx) ? lineIdx + 1 : '?';
    const pinnedChatId = getLinePinChatId(project, state.currentChat?.fileIdx, lineIdx);
    const isPinned = Boolean(pinnedChatId && pinnedChatId === state.currentChat?.id);
    button.title = isPinned ? `Line ${lineNumber} already pinned` : `Mark line ${lineNumber} with a point`;
    button.innerHTML = uiIcon(isPinned ? 'check' : 'bookmark');
}

function openLineInsightChat(lineIdx) {
    if (state.currentProject === null || state.currentFile === null) return;
    const lineChatId = getLineChatId(state.currentFile, lineIdx);
    openLineChatById(lineChatId, { fileIdx: state.currentFile, lineIdx });
}

function openLineChatById(lineChatId, options = {}) {
    const project = state.projects[state.currentProject];
    if (!project) return;
    ensureProjectLineStores(project);

    const parsed = parseLineChatMeta(lineChatId);
    const fileIdx = Number.isInteger(options.fileIdx) ? Number(options.fileIdx) : parsed.fileIdx;
    const lineIdx = Number.isInteger(options.lineIdx) ? Number(options.lineIdx) : parsed.lineIdx;
    if (!Number.isInteger(fileIdx) || !Number.isInteger(lineIdx) || !project.files[fileIdx]) return;

    if (!project.lineChats[lineChatId]) {
        project.lineChats[lineChatId] = {
            fileIdx,
            lineIdx,
            messages: [],
            bookmarks: [],
            updatedAt: ''
        };
    }

    if (state.currentFile !== fileIdx) {
        state.currentFile = fileIdx;
        clearSelectionState();
        renderFileTabs();
        renderCode();
    }

    const chat = project.lineChats[lineChatId];
    state.currentChat = { type: 'line', id: lineChatId, fileIdx, lineIdx };
    touchProjectRecentFile(state.currentProject, fileIdx, { save: false });
    touchLineChatActivity(state.currentProject, lineChatId, { save: false });
    saveState();

    const fileName = project.files[fileIdx]?.name || 'File';
    document.getElementById('chat-title').textContent = `Line ${lineIdx + 1}`;
    document.getElementById('chat-subtitle').textContent = `${fileName} • double-tap note chat`;
    updateLineChatPinButton();
    renderGemSelector('gem-selector');
    syncChatModelControls('section');
    renderChatMessages(chat.messages);
    showScreen('chat-screen');

    if (chat.messages.length === 0) {
        const lineText = String(project.files[fileIdx]?.content?.split('\n')?.[lineIdx] || '').trim();
        autoExplainLine(lineText, lineChatId, lineIdx);
    }
}

async function autoExplainLine(codeLine, lineChatId, lineIdx) {
    const project = state.projects[state.currentProject];
    const chat = project?.lineChats?.[lineChatId];
    if (!chat) return;

    const lineText = String(codeLine || '').trim();
    if (!lineText) {
        chat.messages.push({
            role: 'assistant',
            content: `Line ${lineIdx + 1} is empty.`,
            borderColor: 'green'
        });
        touchLineChatActivity(state.currentProject, lineChatId, { save: false });
        saveState();
        renderChatMessages(chat.messages);
        return;
    }

    chat.messages.push({ role: 'user', content: `Explain line ${lineIdx + 1}:`, borderColor: 'green' });
    chat.messages.push({ role: 'assistant', content: `\`\`\`\n${lineText}\n\`\`\``, borderColor: 'green' });
    touchLineChatActivity(state.currentProject, lineChatId, { save: false });
    renderChatMessages(chat.messages);

    const provider = getChatProvider('section');
    const model = getChatModel('section', provider);
    const history = buildAIHistoryFromMessages(chat.messages);
    const prompt = `Explain only this single line in context. Keep it concise and practical.\n\nLine ${lineIdx + 1}: ${lineText}`;
    const response = await callAI(prompt, {
        scope: 'section',
        api: provider,
        model,
        history
    });

    chat.messages.push({
        role: 'assistant',
        content: response?.content || 'No response',
        borderColor: 'green',
        api: response?.api || provider,
        model: response?.model || model
    });
    touchLineChatActivity(state.currentProject, lineChatId, { save: false });
    saveState();
    renderChatMessages(chat.messages);
}

function markCurrentLineChat() {
    if (state.currentChat?.type !== 'line') return;
    const project = state.projects[state.currentProject];
    if (!project) return;
    ensureProjectLineStores(project);

    const fileIdx = Number(state.currentChat.fileIdx);
    const lineIdx = Number(state.currentChat.lineIdx);
    const chatId = String(state.currentChat.id || '').trim();
    if (!Number.isInteger(fileIdx) || !Number.isInteger(lineIdx) || !chatId) return;

    setLinePinChatId(project, fileIdx, lineIdx, chatId);
    touchLineChatActivity(state.currentProject, chatId, { save: false });
    saveState();
    updateLineChatPinButton();
    if (state.currentFile === fileIdx) updateRenderedLine(lineIdx);
    showToast(`Pinned line ${lineIdx + 1}`);
}

function touchLineChatActivity(projectIdx, lineChatId, options = {}) {
    const project = state.projects?.[projectIdx];
    if (!project?.lineChats?.[lineChatId]) return;
    project.lineChats[lineChatId].updatedAt = new Date().toISOString();
    if (typeof renderHomeRecentChatsPreview === 'function') renderHomeRecentChatsPreview();
    const recentScreen = document.getElementById('recent-chats-screen');
    if (recentScreen?.classList.contains('active') && typeof renderRecentChatsScreen === 'function') {
        renderRecentChatsScreen();
    }
    if (options.save !== false) saveState();
}

function openSectionChatById(sectionId) {
    hideModal('sections-modal');
    
    const project = state.projects[state.currentProject];
    if (!project.chats[sectionId]) {
        project.chats[sectionId] = { messages: [], bookmarks: [] };
    }
    
    state.currentChat = { type: 'section', id: sectionId };
    
    const parts = sectionId.split('-');
    const fileIdx = parseInt(parts[0], 10);
    const color = parts[1];
    const start = parseInt(parts[2], 10);
    const end = parseInt(parts[3], 10);

    if (state.currentFile !== fileIdx) {
        state.currentFile = fileIdx;
        clearSelectionState();
        renderFileTabs();
        renderCode();
    }

    touchProjectRecentFile(state.currentProject, fileIdx, { save: false });
    touchSectionChatActivity(state.currentProject, sectionId, { save: false });
    saveState();
    
    document.getElementById('chat-title').textContent = state.colorNames[color] || color;
    const fileName = project.files[fileIdx]?.name || 'File';
    document.getElementById('chat-subtitle').textContent = `${fileName} - Lines ${start + 1} - ${end + 1}`;
    updateLineChatPinButton();
    
    renderGemSelector('gem-selector');
    syncChatModelControls('section');
    renderChatMessages(project.chats[sectionId].messages);
    showScreen('chat-screen');
    
    // Auto-explain if new
    if (project.chats[sectionId].messages.length === 0) {
        const file = project.files[fileIdx];
        const codeSnippet = file.content.split('\n').slice(start, end + 1).join('\n');
        autoExplain(codeSnippet, sectionId);
    }
}

async function autoExplain(code, sectionId) {
    const project = state.projects[state.currentProject];
    const chat = project.chats[sectionId];
    
    chat.messages.push({ role: 'user', content: 'Explain this code:', borderColor: 'green' });
    chat.messages.push({ role: 'assistant', content: '```\n' + code + '\n```', borderColor: 'green' });
    touchSectionChatActivity(state.currentProject, sectionId, { save: false });
    renderChatMessages(chat.messages);

    const provider = getChatProvider('section');
    const model = getChatModel('section', provider);
    const history = buildAIHistoryFromMessages(chat.messages);
    const response = await callAI('Explain this code simply:\n\n' + code, {
        scope: 'section',
        api: provider,
        model,
        history
    });
    chat.messages.push({
        role: 'assistant',
        content: response?.content || 'No response',
        borderColor: 'green',
        api: response?.api || provider,
        model: response?.model || model
    });
    touchSectionChatActivity(state.currentProject, sectionId, { save: false });
    saveState();
    renderChatMessages(chat.messages);
}

function goBackFromChat() {
    if (typeof isReferenceReadOnlyMode === 'function' && isReferenceReadOnlyMode() && typeof exitLearningSessionReference === 'function') {
        exitLearningSessionReference();
        return;
    }

    if (state.currentChat?.type === 'section' || state.currentChat?.type === 'avatar' || state.currentChat?.type === 'line') {
        showScreen('project-screen');
    } else {
        showScreen('home-screen');
    }
}

function formatRecentTime(isoValue = '') {
    const ms = Date.parse(String(isoValue || ''));
    if (!Number.isFinite(ms) || ms <= 0) return 'recent';

    const diffMs = Date.now() - ms;
    if (diffMs < 60 * 1000) return 'just now';
    if (diffMs < 60 * 60 * 1000) return `${Math.max(1, Math.floor(diffMs / 60000))}m ago`;
    if (diffMs < 24 * 60 * 60 * 1000) return `${Math.max(1, Math.floor(diffMs / 3600000))}h ago`;
    return `${Math.max(1, Math.floor(diffMs / 86400000))}d ago`;
}

function decodeRecentData(raw = '') {
    try {
        return decodeURIComponent(String(raw || ''));
    } catch (_) {
        return String(raw || '');
    }
}

function formatRecentDate(isoValue = '') {
    const ts = Date.parse(String(isoValue || ''));
    if (!Number.isFinite(ts) || ts <= 0) return '';
    return new Date(ts).toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getFilteredRecentChats(limit = MAX_RECENT_CHATS, query = '') {
    const all = buildRecentChats(limit);
    const q = String(query || '').trim().toLowerCase();
    if (!q) return all;

    return all.filter(item => {
        const hay = [
            item.type,
            item.title,
            item.subtitle,
            item.preview,
            item.projectName,
            item.fileName,
            item.folderName
        ].map(value => String(value || '').toLowerCase()).join('\n');
        return hay.includes(q);
    });
}

function renderRecentChatsInto(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const items = options.items || [];
    const isFiltered = Boolean(String(options.query || '').trim());
    if (!items.length) {
        container.innerHTML = isFiltered
            ? '<div class="empty-state"><div class="title">No matching chats</div><div class="desc">Try a different search term.</div></div>'
            : '<div class="empty-state"><div class="title">No recent chats yet</div><div class="desc">Open a section chat or general chat to see it here.</div></div>';
        return;
    }

    container.innerHTML = items.map(item => {
        const preview = item.preview ? `<div class="meta">${escapeHtml(item.preview)}</div>` : '';
        const timeLabel = formatRecentTime(item.updatedAt);
        const dateLabel = formatRecentDate(item.updatedAt);
        const whenLabel = [timeLabel, dateLabel].filter(Boolean).join(' • ');

        if (item.type === 'section') {
            return `
                <div class="list-item recent-chat-item"
                     data-action="open-recent-chat"
                     data-chat-type="section"
                     data-project-index="${item.projectIndex}"
                     data-section-id="${encodeURIComponent(item.sectionId || '')}">
                    <div class="icon">${uiIcon('chat')}</div>
                    <div class="info">
                        <div class="name">${escapeHtml(item.title || 'Section Chat')}</div>
                        <div class="meta">${escapeHtml(item.subtitle || item.projectName || '')} | ${escapeHtml(whenLabel)}</div>
                        ${preview}
                    </div>
                    <span class="arrow">${uiIcon('arrow-right')}</span>
                </div>
            `;
        }

        if (item.type === 'line') {
            return `
                <div class="list-item recent-chat-item"
                     data-action="open-recent-chat"
                     data-chat-type="line"
                     data-project-index="${item.projectIndex}"
                     data-line-chat-id="${encodeURIComponent(item.lineChatId || '')}">
                    <div class="icon">${uiIcon('target')}</div>
                    <div class="info">
                        <div class="name">${escapeHtml(item.title || 'Line Chat')}</div>
                        <div class="meta">${escapeHtml(item.subtitle || item.projectName || '')} | ${escapeHtml(whenLabel)}</div>
                        ${preview}
                    </div>
                    <span class="arrow">${uiIcon('arrow-right')}</span>
                </div>
            `;
        }

        return `
            <div class="list-item recent-chat-item"
                 data-action="open-recent-chat"
                 data-chat-type="general"
                 data-chat-idx="${item.chatIdx}"
                 data-folder-id="${encodeURIComponent(String(item.folderId ?? ''))}">
                <div class="icon">${uiIcon('folder')}</div>
                <div class="info">
                    <div class="name">${escapeHtml(item.title || 'General Chat')}</div>
                    <div class="meta">${escapeHtml(item.subtitle || 'General Chat')} | ${escapeHtml(whenLabel)}</div>
                    ${preview}
                </div>
                <span class="arrow">${uiIcon('arrow-right')}</span>
            </div>
        `;
    }).join('');
}

function renderHomeRecentChatsPreview() {
    const items = getFilteredRecentChats(MAX_RECENT_CHATS, '').slice(0, MAX_HOME_RECENT_CHATS);
    renderRecentChatsInto('home-recent-chats', { items });
}

function renderRecentChatsScreen(options = {}) {
    if (options.reset) {
        recentChatsVisibleCount = RECENT_CHATS_PAGE_SIZE;
    }

    const searchInput = document.getElementById('recent-chats-search');
    if (searchInput && searchInput.value !== recentChatsSearchTerm) {
        searchInput.value = recentChatsSearchTerm;
    }
    const query = String(searchInput?.value || recentChatsSearchTerm || '').trim();
    recentChatsSearchTerm = query;

    const filtered = getFilteredRecentChats(MAX_RECENT_CHATS, query);
    const visible = filtered.slice(0, recentChatsVisibleCount);
    renderRecentChatsInto('recent-chats-list', { items: visible, query });

    const loadMore = document.getElementById('recent-chats-load-more');
    if (loadMore) {
        if (visible.length < filtered.length) {
            loadMore.textContent = `Scroll for more (${visible.length}/${filtered.length})`;
        } else {
            loadMore.textContent = filtered.length ? `Showing ${filtered.length} chats` : '';
        }
    }
}

function handleRecentChatsScroll(scrollEl) {
    if (!scrollEl) return;
    if (scrollEl.scrollTop + scrollEl.clientHeight < scrollEl.scrollHeight - 80) return;

    const query = String(recentChatsSearchTerm || '').trim();
    const filtered = getFilteredRecentChats(MAX_RECENT_CHATS, query);
    if (recentChatsVisibleCount >= filtered.length) return;
    recentChatsVisibleCount = Math.min(filtered.length, recentChatsVisibleCount + RECENT_CHATS_PAGE_SIZE);
    renderRecentChatsScreen();
}

function openRecentChat(actionEl) {
    if (!actionEl) return;

    const chatType = String(actionEl.dataset.chatType || '').trim().toLowerCase();
    if (chatType === 'section') {
        const projectIndex = Number(actionEl.dataset.projectIndex);
        const sectionId = decodeRecentData(actionEl.dataset.sectionId || '');
        if (!Number.isInteger(projectIndex) || !state.projects[projectIndex] || !sectionId) {
            showToast('Recent section chat is unavailable');
            return;
        }
        state.currentProject = projectIndex;
        openSectionChatById(sectionId);
        return;
    }

    if (chatType === 'line') {
        const projectIndex = Number(actionEl.dataset.projectIndex);
        const lineChatId = decodeRecentData(actionEl.dataset.lineChatId || '');
        if (!Number.isInteger(projectIndex) || !state.projects[projectIndex] || !lineChatId) {
            showToast('Recent line chat is unavailable');
            return;
        }
        state.currentProject = projectIndex;
        const parsed = parseLineChatMeta(lineChatId);
        if (Number.isInteger(parsed.fileIdx)) state.currentFile = parsed.fileIdx;
        openLineChatById(lineChatId, parsed);
        return;
    }

    if (chatType === 'general') {
        const folderIdRaw = decodeRecentData(actionEl.dataset.folderId || '');
        const chatIdx = Number(actionEl.dataset.chatIdx);
        const folderIndex = state.folders.findIndex(folder => String(folder?.id ?? '') === folderIdRaw);

        if (folderIndex >= 0) {
            openFolder(folderIndex);
            return;
        }

        if (!Number.isInteger(chatIdx) || !state.generalChats[chatIdx]) {
            showToast('Recent general chat is unavailable');
            return;
        }

        const fallbackChat = state.generalChats[chatIdx];
        state.currentGeneralFolder = fallbackChat.folderId ?? null;
        state.currentChat = { type: 'general', idx: chatIdx };
        const folderName = state.folders.find(item => item?.id === state.currentGeneralFolder)?.name || 'General';
        const folderLabel = document.getElementById('general-chat-folder');
        if (folderLabel) folderLabel.textContent = folderName;
        renderGeneralGemSelector();
        syncChatModelControls('general');
        renderGeneralChatMessages();
        showScreen('general-chat-screen');
        return;
    }

    showToast('Unknown recent chat type');
}
