// ============ CHAT UI ============
function getChatBubbleProviderLabel(provider = '') {
    if (provider === 'openrouter') return 'OpenRouter';
    if (provider === 'siliconflow') return 'SiliconFlow';
    return String(provider || '');
}

function renderChatBubbleMeta(message) {
    if (!message || message.role !== 'assistant') return '';
    const provider = String(message.api || '').trim();
    const model = String(message.model || '').trim();
    if (!provider && !model) return '';

    const providerLabel = provider ? `<span class="provider">${escapeHtml(getChatBubbleProviderLabel(provider))}</span>` : '';
    const modelLabel = model ? `<span class="model">${escapeHtml(model)}</span>` : '';
    return `<div class="chat-bubble-meta">${providerLabel}${modelLabel}</div>`;
}

function buildAIHistoryFromMessages(messages = []) {
    if (!Array.isArray(messages)) return [];

    return messages
        .filter(message => !message?.pending && (message?.role === 'user' || message?.role === 'assistant'))
        .map(message => ({
            role: message.role === 'assistant' ? 'assistant' : 'user',
            content: String(message.content || '')
        }))
        .filter(message => message.content.trim().length > 0);
}

function decodeSessionRefMarker(rawValue = '') {
    try {
        return decodeURIComponent(String(rawValue || ''));
    } catch (_) {
        return String(rawValue || '');
    }
}

function renderSessionReferenceTag(rawSessionId = '', rawLabel = '') {
    const sessionId = decodeSessionRefMarker(rawSessionId);
    const label = String(rawLabel || 'Session').trim() || 'Session';
    const safeId = encodeURIComponent(sessionId);
    return `
        <span class="session-ref-wrap">
            <span class="session-ref-pill">${escapeHtml(label)}</span>
            <button class="session-ref-btn" data-action="open-learning-session" data-session-id="${safeId}">Go to that session</button>
        </span>
    `;
}

function renderChatMessages(messages) {
    const container = document.getElementById('chat-messages');
    container.innerHTML = messages.map((m, i) => {
        const isBookmarked = m.bookmarked ? 'bookmarked' : '';
        const isPending = m.pending ? 'pending' : '';
        const borderStyle = m.borderColor ? `border-color: var(--color-${m.borderColor})` : '';
        const readOnlyMode = typeof isReferenceReadOnlyMode === 'function' ? isReferenceReadOnlyMode() : false;
        const bubbleActionAttrs = (m.pending || readOnlyMode) ? '' : `data-action="show-bubble-options" data-bubble-index="${i}"`;
        const meta = renderChatBubbleMeta(m);
        return `
            <div class="chat-bubble ${m.role === 'user' ? 'user' : 'ai'} ${isBookmarked} ${isPending}" 
                 style="${borderStyle}" 
                 ${bubbleActionAttrs}>
                ${meta}
                ${formatMessage(m.content)}
            </div>
        `;
    }).join('');
    container.scrollTop = container.scrollHeight;
}

function getChatCodeLanguage(languageHint = '') {
    if (languageHint) {
        return detectLanguageFromHint(languageHint);
    }

    const currentFile = state.currentProject !== null && state.currentFile !== null
        ? state.projects[state.currentProject]?.files?.[state.currentFile]?.name || ''
        : '';

    return detectLanguageFromFileName(currentFile);
}

function renderChatCodeBlock(code, languageHint = '') {
    const lang = getChatCodeLanguage(languageHint);
    const rawHint = String(languageHint || '').trim();
    const label = rawHint ? rawHint.toUpperCase() : (lang === 'plain' ? 'TEXT' : lang.toUpperCase());
    const normalized = String(code || '').replace(/\r\n/g, '\n');
    const lines = normalized.split('\n');
    if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();

    const renderedLines = (lines.length ? lines : ['']).map((line, idx) => `
        <div class="chat-code-line">
            <span class="chat-code-line-num">${idx + 1}</span>
            <span class="chat-code-line-text">${highlightCodeLine(line, lang)}</span>
        </div>
    `).join('');

    return `
        <div class="chat-code-block">
            <div class="chat-code-head">${escapeHtml(label)}</div>
            <div class="chat-code-body">${renderedLines}</div>
        </div>
    `;
}

function applyInlineFormatting(text) {
    let escaped = escapeHtml(text);
    const codeSnippets = [];
    const sessionRefs = [];

    escaped = escaped.replace(/`([^`]+)`/g, (_, code) => {
        const token = `@@CODE${codeSnippets.length}@@`;
        codeSnippets.push(`<code>${code}</code>`);
        return token;
    });

    escaped = escaped.replace(/\[\[SESSION_REF:([^\]|]+)\|([^\]]+)\]\]/g, (_, sessionId, label) => {
        const token = `@@SESSIONREF${sessionRefs.length}@@`;
        sessionRefs.push(renderSessionReferenceTag(sessionId, label));
        return token;
    });

    escaped = escaped
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');

    codeSnippets.forEach((snippet, idx) => {
        escaped = escaped.replace(`@@CODE${idx}@@`, snippet);
    });
    sessionRefs.forEach((snippet, idx) => {
        escaped = escaped.replace(`@@SESSIONREF${idx}@@`, snippet);
    });

    return escaped;
}

function formatTextSegment(segment) {
    const lines = segment.replace(/\r\n/g, '\n').split('\n');
    let html = '';
    let listType = null;

    const closeList = () => {
        if (listType) {
            html += `</${listType}>`;
            listType = null;
        }
    };

    for (const rawLine of lines) {
        const line = rawLine.replace(/\t/g, '    ');
        const trimmed = line.trim();

        if (!trimmed) {
            closeList();
            continue;
        }

        const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
        if (heading) {
            closeList();
            const level = heading[1].length;
            html += `<div class="msg-h l${level}">${applyInlineFormatting(heading[2])}</div>`;
            continue;
        }

        const quote = trimmed.match(/^>\s?(.*)$/);
        if (quote) {
            closeList();
            html += `<div class="msg-quote">${applyInlineFormatting(quote[1])}</div>`;
            continue;
        }

        const ul = trimmed.match(/^[-*]\s+(.+)$/);
        if (ul) {
            if (listType !== 'ul') {
                closeList();
                listType = 'ul';
                html += '<ul class="msg-list">';
            }
            html += `<li>${applyInlineFormatting(ul[1])}</li>`;
            continue;
        }

        const ol = trimmed.match(/^\d+\.\s+(.+)$/);
        if (ol) {
            if (listType !== 'ol') {
                closeList();
                listType = 'ol';
                html += '<ol class="msg-list">';
            }
            html += `<li>${applyInlineFormatting(ol[1])}</li>`;
            continue;
        }

        closeList();
        html += `<div class="msg-p">${applyInlineFormatting(trimmed)}</div>`;
    }

    closeList();
    return html;
}

function formatMessage(content) {
    const source = String(content ?? '').replace(/\r\n/g, '\n');
    const fenceRe = /```([^\n`]*)\n?([\s\S]*?)```/g;
    let html = '';
    let cursor = 0;
    let match;

    while ((match = fenceRe.exec(source)) !== null) {
        const textPart = source.slice(cursor, match.index);
        if (textPart.trim()) {
            html += formatTextSegment(textPart);
        }

        const languageHint = (match[1] || '').trim();
        const codePart = match[2] || '';
        html += renderChatCodeBlock(codePart, languageHint);
        cursor = fenceRe.lastIndex;
    }

    const trailing = source.slice(cursor);
    if (trailing.trim()) {
        html += formatTextSegment(trailing);
    }

    return html || '<div class="msg-p">&nbsp;</div>';
}

function showBubbleOptions(idx) {
    if (typeof isReferenceReadOnlyMode === 'function' && isReferenceReadOnlyMode()) {
        showToast('Read-only memory session');
        return;
    }

    state.selectedBubbleIdx = idx;
    
    const messages = getCurrentMessages();
    const msg = messages[idx];
    
    // Set current color in picker
    document.querySelectorAll('#bubble-color-picker .color-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.color === (msg.borderColor || 'green'));
    });
    
    showModal('bubble-color-modal');
}

function getCurrentMessages() {
    const project = state.projects[state.currentProject];
    if (state.currentChat?.type === 'section') {
        return project?.chats?.[state.currentChat.id]?.messages || [];
    } else if (state.currentChat?.type === 'line') {
        return project?.lineChats?.[state.currentChat.id]?.messages || [];
    } else if (state.currentChat?.type === 'general') {
        return state.generalChats[state.currentChat.idx]?.messages || [];
    }
    return [];
}

function toggleBookmark() {
    const messages = getCurrentMessages();
    const msg = messages[state.selectedBubbleIdx];
    msg.bookmarked = !msg.bookmarked;
    
    if (msg.bookmarked) {
        state.bookmarks.push({
            content: msg.content,
            color: msg.borderColor || 'green',
            source: state.currentChat,
            msgIdx: state.selectedBubbleIdx,
            created: new Date().toISOString()
        });
    } else {
        state.bookmarks = state.bookmarks.filter(b => 
            !(b.source?.id === state.currentChat?.id && b.msgIdx === state.selectedBubbleIdx)
        );
    }
    
    saveState();
    hideModal('bubble-color-modal');
    
    if (state.currentChat?.type === 'section') {
        const project = state.projects[state.currentProject];
        renderChatMessages(project.chats[state.currentChat.id].messages);
    }
    
    showToast(msg.bookmarked ? 'Bookmarked!' : 'Bookmark removed');
}

document.querySelectorAll('#bubble-color-picker .color-option').forEach(el => {
    el.addEventListener('click', () => {
        const color = el.dataset.color;
        const messages = getCurrentMessages();
        messages[state.selectedBubbleIdx].borderColor = color;
        
        document.querySelectorAll('#bubble-color-picker .color-option').forEach(e => e.classList.remove('selected'));
        el.classList.add('selected');
        
        saveState();
        
        if (state.currentChat?.type === 'section') {
            const project = state.projects[state.currentProject];
            renderChatMessages(project.chats[state.currentChat.id].messages);
        }
    });
});

async function sendMessage() {
    if (typeof isReferenceReadOnlyMode === 'function' && isReferenceReadOnlyMode()) {
        showToast('This referenced session is read-only. Tap "Back to main session" to continue.');
        return;
    }

    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    input.value = '';
    
    const projectIdx = state.currentProject;
    const chatId = state.currentChat?.id;
    const project = state.projects[projectIdx];
    const isLineChat = state.currentChat?.type === 'line';
    const chat = isLineChat ? project?.lineChats?.[chatId] : project?.chats?.[chatId];
    if (!chat) return;

    const provider = getChatProvider('section');
    const model = getChatModel('section', provider);
    const history = buildAIHistoryFromMessages(chat.messages);
    const systemPrompts = [];

    const activeGem = state.gems.find(g => g.active);
    if (activeGem) {
        systemPrompts.push(activeGem.prompt);
    }
    if (typeof getLearningSystemPromptForQuery === 'function') {
        const memoryPrompt = await getLearningSystemPromptForQuery(text, { scope: 'section' });
        if (memoryPrompt) systemPrompts.push(memoryPrompt);
    }

    chat.messages.push({ role: 'user', content: text, borderColor: 'green' });
    const pendingReply = {
        role: 'assistant',
        content: 'Thinking...',
        borderColor: 'green',
        pending: true,
        api: provider,
        model
    };
    chat.messages.push(pendingReply);
    if (isLineChat) touchLineChatActivity(projectIdx, chatId, { save: false });
    else touchSectionChatActivity(projectIdx, chatId, { save: false });
    saveState();
    renderChatMessages(chat.messages);

    const response = await callAI(text, {
        notifyQueue: true,
        scope: 'section',
        api: provider,
        model,
        history,
        systemPrompts
    });

    pendingReply.content = response?.content || 'No response';
    pendingReply.api = response?.api || provider;
    pendingReply.model = response?.model || model;
    pendingReply.pending = false;
    if (isLineChat) touchLineChatActivity(projectIdx, chatId, { save: false });
    else touchSectionChatActivity(projectIdx, chatId, { save: false });
    saveState();

    if (
        state.currentProject === projectIdx &&
        (state.currentChat?.type === 'section' || state.currentChat?.type === 'line') &&
        state.currentChat?.id === chatId
    ) {
        renderChatMessages(chat.messages);
    }
}
