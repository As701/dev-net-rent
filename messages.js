document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = window.DachaGoConfig?.apiUrl || 'https://dev-net-rent.onrender.com/api/v1';
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
        window.location.href = 'auth.html';
        return;
    }

    const user = JSON.parse(userStr);
    const chatList = document.getElementById('chat-list');
    const tabs = document.querySelectorAll('.tab-item');
    let currentTab = 'owners';

    // --- TAB SWITCHING ---
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.tab;
            loadMessages();
        };
    });

    async function loadMessages() {
        chatList.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Загрузка...</p></div>';
        
        if (currentTab === 'owners') {
            await loadConversations();
        } else {
            await loadSystemNotifications();
        }
    }

    async function loadConversations() {
        try {
            // Using /api/v1 for consistency
            const res = await fetch(`${API_URL}/messages/conversations/${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            renderConversations(data);
        } catch (e) {
            renderError('Не удалось загрузить чаты');
        }
    }

    async function loadSystemNotifications() {
        try {
            const res = await fetch(`${API_URL}/messages/notifications/${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            renderSystemNotifications(data);
        } catch (e) {
            renderError('Не удалось загрузить уведомления');
        }
    }

    function renderConversations(items) {
        if (!items || items.length === 0) {
            chatList.innerHTML = `<div class="empty-state"><i class="fas fa-comment-slash"></i><p>У вас пока нет активных чатов</p></div>`;
            return;
        }

        chatList.innerHTML = items.map(chat => `
            <a href="chat-detail.html?contactId=${chat.contact_id}" class="chat-item">
                <img src="${chat.contact_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.contact_id}`}" class="chat-avatar" alt="avatar">
                <div class="chat-info">
                    <div class="chat-top">
                        <h4 class="chat-name">${chat.contact_name}</h4>
                        <span class="chat-time">${formatTime(chat.time)}</span>
                    </div>
                    <p class="chat-msg">${chat.is_mine ? 'Вы: ' : ''}${chat.last_message}</p>
                </div>
                ${chat.unread ? '<div class="chat-unread"></div>' : ''}
            </a>
        `).join('');
    }

    function renderSystemNotifications(items) {
        if (!items || items.length === 0) {
            chatList.innerHTML = `<div class="empty-state"><i class="fas fa-bell-slash"></i><p>Системных уведомлений нет</p></div>`;
            return;
        }

        chatList.innerHTML = items.map(n => {
            const iconMap = {
                'success': { icon: 'fa-check-circle', class: 'bg-success' },
                'danger': { icon: 'fa-exclamation-triangle', class: 'bg-danger' },
                'info': { icon: 'fa-info-circle', class: 'bg-info' },
                'warning': { icon: 'fa-bell', class: 'bg-info' }
            };
            const meta = iconMap[n.type] || iconMap.info;

            return `
                <div class="system-notif">
                    <div class="system-icon ${meta.class}">
                        <i class="fas ${meta.icon}"></i>
                    </div>
                    <div class="chat-info">
                        <div class="chat-top">
                            <h4 class="chat-name">${n.title}</h4>
                            <span class="chat-time">${formatTime(n.created_at)}</span>
                        </div>
                        <p class="chat-msg" style="white-space: normal; color: var(--text-dark); line-height: 1.4;">${n.message}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderError(msg) {
        chatList.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>${msg}</p></div>`;
    }

    function formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    loadMessages();

    // --- WEBSOCKET ---
    let ws;
    function connectWS() {
        const WS_URL = window.DachaGoConfig?.apiUrl?.replace('http', 'ws') || 'ws://localhost:5005';
        ws = new WebSocket(`${WS_URL}/ws/${user.id}`);
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'slot_locked') {
                if (window.currentSlotId === data.slot_id && user.id !== data.active_user_id) {
                    alert(data.message);
                }
            }
            // Auto refresh current tab on new message
            loadMessages();
        };
        ws.onclose = () => setTimeout(connectWS, 5000);
    }
    connectWS();
});
