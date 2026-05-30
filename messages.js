document.addEventListener('DOMContentLoaded', async () => {
    const chatList = document.getElementById('chat-list');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
        window.location.href = 'auth.html';
        return;
    }

    async function loadConversations() {
        const API_URL = window.DachaGoConfig?.apiUrl || 'http://localhost:5005/api';
        try {
            const res = await fetch(`${API_URL}/messages/conversations/${user.id}`);
            const data = await res.json();
            renderConversations(data);
        } catch (e) {
            console.error('Ошибка загрузки чатов:', e);
            chatList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Не удалось загрузить сообщения</p>
                </div>`;
        }
    }

    function renderConversations(items) {
        if (!items || items.length === 0) {
            chatList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comment-slash"></i>
                    <p>У вас пока нет активных чатов</p>
                </div>`;
            return;
        }

        chatList.innerHTML = items.map(chat => `
            <a href="chat-detail.html?contactId=${chat.contact_id}" class="chat-item">
                <img src="${chat.contact_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.contact_name}`}" class="chat-avatar" alt="avatar">
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

    function formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    loadConversations();
});
