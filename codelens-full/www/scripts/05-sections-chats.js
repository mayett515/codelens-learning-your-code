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
    
    document.getElementById('chat-title').textContent = state.colorNames[color] || color;
    const fileName = project.files[fileIdx]?.name || 'File';
    document.getElementById('chat-subtitle').textContent = `${fileName} - Lines ${start + 1} - ${end + 1}`;
    
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
    saveState();
    renderChatMessages(chat.messages);
}

function goBackFromChat() {
    if (typeof isReferenceReadOnlyMode === 'function' && isReferenceReadOnlyMode() && typeof exitLearningSessionReference === 'function') {
        exitLearningSessionReference();
        return;
    }

    if (state.currentChat?.type === 'section' || state.currentChat?.type === 'avatar') {
        showScreen('project-screen');
    } else {
        showScreen('home-screen');
    }
}
