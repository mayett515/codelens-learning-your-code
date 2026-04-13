// ============ GENERAL CHAT ============
function renderGeneralGemSelector() {
    renderGemSelector('general-gem-selector');
}

async function sendGeneralMessage() {
    if (typeof isReferenceReadOnlyMode === 'function' && isReferenceReadOnlyMode()) {
        showToast('This referenced session is read-only. Tap "Back to main session" to continue.');
        return;
    }

    const input = document.getElementById('general-chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    input.value = '';
    
    // Find or create chat
    let chatIdx = state.generalChats.findIndex(c => c.folderId === state.currentGeneralFolder);
    if (chatIdx === -1) {
        state.generalChats.push({ folderId: state.currentGeneralFolder, messages: [], updatedAt: '' });
        chatIdx = state.generalChats.length - 1;
    }
    
    const chat = state.generalChats[chatIdx];
    state.currentChat = { type: 'general', idx: chatIdx };

    const provider = getChatProvider('general');
    const model = getChatModel('general', provider);
    const history = buildAIHistoryFromMessages(chat.messages);
    const systemPrompts = [];

    const activeGem = state.gems.find(g => g.active);
    if (activeGem) systemPrompts.push(activeGem.prompt);
    if (state.currentAvatar?.prompt) systemPrompts.push(state.currentAvatar.prompt);
    if (typeof getLearningSystemPromptForQuery === 'function') {
        const memoryPrompt = await getLearningSystemPromptForQuery(text, { scope: 'general' });
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
    touchGeneralChatActivity(chatIdx, { save: false });
    saveState();
    renderGeneralChatMessages();

    const response = await callAI(text, {
        notifyQueue: true,
        scope: 'general',
        api: provider,
        model,
        history,
        systemPrompts
    });

    pendingReply.content = response?.content || 'No response';
    pendingReply.api = response?.api || provider;
    pendingReply.model = response?.model || model;
    pendingReply.pending = false;
    touchGeneralChatActivity(chatIdx, { save: false });
    saveState();

    if (state.currentChat?.type === 'general' && state.currentChat?.idx === chatIdx) {
        renderGeneralChatMessages();
    }
}

function renderGeneralChatMessages() {
    const chatIdx = state.generalChats.findIndex(c => c.folderId === state.currentGeneralFolder);
    const messages = chatIdx >= 0 ? state.generalChats[chatIdx].messages : [];
    
    const container = document.getElementById('general-chat-messages');
    container.innerHTML = messages.map((m, i) => {
        const isBookmarked = m.bookmarked ? 'bookmarked' : '';
        const isPending = m.pending ? 'pending' : '';
        const borderStyle = m.borderColor ? `border-color: var(--color-${m.borderColor})` : '';
        const meta = renderChatBubbleMeta(m);
        return `
            <div class="chat-bubble ${m.role === 'user' ? 'user' : 'ai'} ${isBookmarked} ${isPending}" style="${borderStyle}">
                ${meta}
                ${formatMessage(m.content)}
            </div>
        `;
    }).join('');
    container.scrollTop = container.scrollHeight;
}
