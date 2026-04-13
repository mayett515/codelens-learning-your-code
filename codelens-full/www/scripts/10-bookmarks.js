// ============ BOOKMARKS ============
function renderBookmarks(filter = 'all') {
    const list = document.getElementById('bookmarks-list');
    const filtered = filter === 'all' ? state.bookmarks : state.bookmarks.filter(b => b.color === filter);
    
    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="icon">🔖</div><div class="title">No bookmarks</div><div class="desc">Long-press messages to bookmark them</div></div>';
        return;
    }
    
    list.innerHTML = filtered.map(b => `
        <div class="list-item">
            <div class="icon" style="background:var(--color-${b.color})">🔖</div>
            <div class="info">
                <div class="name">${b.content.substring(0, 50)}...</div>
                <div class="meta">${state.colorNames[b.color] || b.color}</div>
            </div>
        </div>
    `).join('');
}

function filterBookmarks(color) {
    document.querySelectorAll('#bookmarks-filter .filter-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.color === color);
    });
    renderBookmarks(color);
}

function showChatBookmarks() {
    showScreen('bookmarks-screen');
    renderBookmarks('all');
}

// Kit-style icon override.
function legacyRenderBookmarksOld(filter = 'all') {
    const list = document.getElementById('bookmarks-list');
    const filtered = filter === 'all' ? state.bookmarks : state.bookmarks.filter(b => b.color === filter);

    if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="icon">${uiIcon('bookmark', 'lg')}</div><div class="title">No bookmarks</div><div class="desc">Long-press messages to bookmark them</div></div>`;
        return;
    }

    list.innerHTML = filtered.map(b => `
        <div class="list-item">
            <div class="icon" style="background:var(--color-${b.color})">${uiIcon('bookmark')}</div>
            <div class="info">
                <div class="name">${b.content.substring(0, 50)}...</div>
                <div class="meta">${state.colorNames[b.color] || b.color}</div>
            </div>
        </div>
    `).join('');
}
