document.addEventListener('DOMContentLoaded', () => {
    const API_URL = window.DachaGoConfig ? window.DachaGoConfig.apiUrl : 'http://localhost:5005/api';
    
    // --- AUTH GUARD ---
    let currentUser = JSON.parse(localStorage.getItem('dacha_admin_user') || '{}');
    if (!localStorage.getItem('dacha_admin_logged') || currentUser.role !== 'admin') {
        localStorage.clear();
        window.location.href = '../index.html';
        return;
    }

    // --- ELEMENTS ---
    const navItems = document.querySelectorAll('.nav-item');
    const dashView = document.getElementById('dash-view');
    const dynamicView = document.getElementById('dynamic-view');
    const viewContainer = document.getElementById('view-container');
    const tableTitle = document.getElementById('table-title');
    const pageTitle = document.getElementById('page-title');
    const globalSearch = document.getElementById('global-search');
    const searchModal = document.getElementById('search-modal');
    const modalBody = document.getElementById('modal-body-content');

    let activeChatId = null;

    function initUI() {
        document.getElementById('user-name').innerText = currentUser.name;
        document.getElementById('user-avatar').src = currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`;
        fetchStaffStats();
        fetchPendingListings();
    }

    // --- GLOBAL SEARCH ---
    if (globalSearch) {
        globalSearch.onkeypress = async (e) => {
            if (e.key === 'Enter') {
                const q = globalSearch.value.trim();
                if (!q) return;
                try {
                    const res = await fetch(`${API_URL}/admin/search?query=${q}`);
                    if (!res.ok) throw new Error('Not found');
                    const data = await res.json();
                    if (data.type === 'user') window.viewUser(data.data.id);
                    else alert('Найдено объявление: ' + data.data.title);
                } catch (err) {
                    alert('Ничего не найдено (ID/Email)');
                }
            }
        };
    }

    window.closeModal = () => { if (searchModal) searchModal.style.display = 'none'; };

    window.viewUser = async (id) => {
        try {
            const res = await fetch(`${API_URL}/admin/search?query=${id}`);
            const data = await res.json();
            const u = data.data;
            
            searchModal.style.display = 'flex';
            document.getElementById('modal-title').innerText = 'Просмотр пользователя';
            modalBody.innerHTML = `
                <div style="display:grid; grid-template-columns: 150px 1fr; gap:25px; align-items:start;">
                    <img src="${u.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed='+u.id}" style="width:100%; border-radius:20px; border:2px solid var(--brand-blue);">
                    <div>
                        <h2 style="margin:0; color:var(--brand-blue);">${u.name}</h2>
                        <p style="color:#888; font-size:12px; margin:5px 0 15px;">ID: ${u.id}</p>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:14px;">
                            <div><b>Роль:</b> ${u.role}</div>
                            <div><b>Телефон:</b> ${u.phone || '—'}</div>
                            <div><b>Email:</b> ${u.email || '—'}</div>
                            <div><b>Дата рег:</b> ${new Date(u.reg_date || Date.now()).toLocaleDateString()}</div>
                        </div>
                        <div style="margin-top:20px; background:rgba(255,255,255,0.03); padding:15px; border-radius:15px;">
                            <label style="font-size:11px; font-weight:800; color:#888; display:block; margin-bottom:8px;">СМЕНА ИДЕНТИФИКАТОРА (ID)</label>
                            <div style="display:flex; gap:8px;">
                                <input type="text" id="new-id-input" placeholder="#DGID..." style="flex:1; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px; color:white; font-size:12px;">
                                <button class="btn btn-primary" style="padding:10px 15px;" onclick="window.updateUserId('${u.id}')">СМЕНИТЬ</button>
                            </div>
                        </div>
                        <div style="margin-top:20px; padding-top:20px; border-top:1px solid rgba(255,255,255,0.05);">
                            <h3>Объявления пользователя</h3>
                            <div id="user-ads-list" style="font-size:12px; color:#aaa;">Загрузка...</div>
                        </div>
                    </div>
                </div>
            `;
            
            const adsList = document.getElementById('user-ads-list');
            if (data.listings && data.listings.length > 0) {
                adsList.innerHTML = data.listings.map(l => `
                    <div style="background:rgba(255,255,255,0.02); padding:10px; border-radius:10px; margin-bottom:5px; display:flex; justify-content:space-between;">
                        <span>${l.title}</span>
                        <b style="color:var(--brand-blue)">${l.price} сум</b>
                    </div>
                `).join('');
            } else {
                adsList.innerText = 'Нет объявлений';
            }
        } catch (e) { alert('Ошибка загрузки данных'); }
    };

    // --- NAVIGATION ---
    navItems.forEach(item => {
        item.onclick = () => {
            const view = item.dataset.view;
            if (!view) return;
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            switchView(view);
        };
    });

    function switchView(view) {
        pageTitle.innerText = view.toUpperCase();
        if (view === 'dash') {
            dashView.style.display = 'block';
            dynamicView.style.display = 'none';
            fetchStaffStats();
            fetchPendingListings();
        } else {
            dashView.style.display = 'none';
            dynamicView.style.display = 'block';
            renderView(view);
        }
    }

    // --- MESSENGER ---
    async function renderMessenger() {
        tableTitle.innerText = 'Центр сообщений (Staff)';
        viewContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 280px 1fr; gap: 20px; height: 550px;">
                <div id="staff-convos" style="background:rgba(255,255,255,0.02); border-radius:20px; overflow-y:auto; border:1px solid rgba(255,255,255,0.05);"></div>
                <div style="display:flex; flex-direction:column; background:var(--card-bg); border-radius:20px; border:1px solid rgba(255,255,255,0.05);">
                    <div id="staff-chat-header" style="padding:15px 20px; border-bottom:1px solid rgba(255,255,255,0.05); font-weight:800;">ВЫБЕРИТЕ ДИАЛОГ</div>
                    <div id="staff-chat-messages" style="flex:1; padding:20px; overflow-y:auto; display:flex; flex-direction:column; gap:10px;"></div>
                    <div style="padding:20px; border-top:1px solid rgba(255,255,255,0.05); display:flex; gap:10px;">
                        <input type="text" id="staff-m-input" placeholder="Введите сообщение..." style="flex:1; background:rgba(0,0,0,0.2); border:none; padding:15px; border-radius:15px; color:white; outline:none;">
                        <button class="btn btn-primary" id="staff-m-send"><i class="fas fa-paper-plane"></i></button>
                    </div>
                </div>
            </div>
        `;
        loadConvos();
        
        // Listeners for dynamic messenger
        const btnSend = document.getElementById('staff-m-send');
        const inputMsg = document.getElementById('staff-m-input');
        
        btnSend.onclick = sendMessage;
        inputMsg.onkeypress = (e) => { if(e.key === 'Enter') sendMessage(); };
    }

    async function loadConvos() {
        const res = await fetch(`${API_URL}/messages/conversations/${currentUser.id}`);
        const convs = await res.json();
        const container = document.getElementById('staff-convos');
        if(!container) return;
        container.innerHTML = convs.map(c => `
            <div style="padding:15px; border-bottom:1px solid rgba(255,255,255,0.03); cursor:pointer; background:${activeChatId === c.contact_id ? 'rgba(37,153,200,0.1)' : 'transparent'}" onclick="openChat('${c.contact_id}', '${c.contact_name}')">
                <div style="font-weight:700; font-size:13px;">${c.contact_name}</div>
                <div style="font-size:11px; color:#666; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.last_message}</div>
            </div>
        `).join('') || '<p style="text-align:center; padding:20px;">Нет диалогов</p>';
    }

    window.openChat = (id, name) => {
        activeChatId = id;
        document.getElementById('staff-chat-header').innerText = name;
        loadMessages();
        loadConvos();
    };

    async function loadMessages() {
        if (!activeChatId) return;
        const res = await fetch(`${API_URL}/messages/history?user_id=${currentUser.id}&contact_id=${activeChatId}`);
        const msgs = await res.json();
        const area = document.getElementById('staff-chat-messages');
        if(!area) return;
        area.innerHTML = msgs.map(m => {
            const isMine = m.sender_id === currentUser.id;
            return `
                <div style="align-self:${isMine?'flex-end':'flex-start'}; background:${isMine?'var(--brand-blue)':'rgba(255,255,255,0.05)'}; padding:10px 15px; border-radius:15px; max-width:80%;">
                    ${isMine ? '<div style="font-size:8px; font-weight:900; color:rgba(255,255,255,0.5); margin-bottom:3px;">ADMIN</div>' : ''}
                    <div style="font-size:13px; font-weight:600;">${m.text}</div>
                </div>
            `;
        }).join('');
        area.scrollTop = area.scrollHeight;
    }

    async function sendMessage() {
        const input = document.getElementById('staff-m-input');
        const text = input.value.trim();
        if (!text || !activeChatId) return;
        await fetch(`${API_URL}/messages/send`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ sender_id: currentUser.id, receiver_id: activeChatId, text })
        });
        input.value = ''; loadMessages(); loadConvos();
    }

    // --- DASHBOARD CORE ---
    async function fetchStaffStats() {
        try {
            const res = await fetch(`${API_URL}/admin/stats/advanced`, { headers: { 'x-admin-role': 'admin' } });
            const s = await res.json();
            document.getElementById('st-users').innerText = s.total_users;
            document.getElementById('st-active').innerText = s.active_listings;
            document.getElementById('st-pending').innerText = s.pending_listings;
            document.getElementById('st-rejected').innerText = s.rejected_listings;
        } catch (e) {}
    }

    async function fetchPendingListings() {
        try {
            const res = await fetch(`${API_URL}/admin/listings`);
            const list = await res.json();
            const pending = list.filter(a => a.status === 'pending');
            const body = document.getElementById('pending-body');
            if(!body) return;
            body.innerHTML = pending.map(l => `
                <tr>
                    <td><span class="id-tag">${l.id.substring(0,8)}</span></td>
                    <td>${l.title}</td>
                    <td><span class="id-tag" style="color:#888;">${l.owner_id.substring(0,8)}</span></td>
                    <td><small>${new Date(l.created_at || Date.now()).toLocaleDateString()}</small></td>
                    <td><span class="status-badge status-pending">НА ПРОВЕРКЕ</span></td>
                    <td>
                        <button class="btn btn-primary" style="padding:5px 10px;" onclick="moderate('${l.id}', 'active')">OK</button>
                        <button class="btn btn-outline" style="padding:5px 10px; color:var(--danger);" onclick="moderate('${l.id}', 'rejected')">X</button>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="6" style="text-align:center; padding:20px;">Очередь пуста</td></tr>';
        } catch (e) {}
    }

    // --- MODERATION ---
    window.moderate = async (id, status) => {
        try {
            await fetch(`${API_URL}/admin/listings/${id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-id': currentUser.id },
                body: JSON.stringify({ status })
            });
            fetchStaffStats(); fetchPendingListings();
        } catch (e) {}
    };

    async function fetchFullUsers() {
        try {
            const res = await fetch(`${API_URL}/admin/users/all-detailed`);
            const users = await res.json();
            const body = document.getElementById('users-body');
            if(!body) return;
            body.innerHTML = users.map(u => `
                <tr>
                    <td><span class="id-tag" onclick="window.viewUser('${u.id}')" style="cursor:pointer;">${u.id.substring(0,8)}</span></td>
                    <td><b>${u.name}</b><br><small>${u.role}</small></td>
                    <td>${u.phone || u.email}</td>
                    <td><small>${new Date(u.reg_date || Date.now()).toLocaleDateString()}</small></td>
                    <td><button class="btn btn-outline" style="padding:5px 10px;" onclick="window.viewUser('${u.id}')">ПРОФИЛЬ</button></td>
                </tr>
            `).join('') || '<tr><td colspan="5" style="text-align:center; padding:20px;">Пользователей нет</td></tr>';
        } catch (e) { console.error(e); }
    }

    function renderView(view) {
        if (view === 'listings') {
            tableTitle.innerText = 'Управление объявлениями';
            viewContainer.innerHTML = `<table id="main-table"><thead><tr><th>ID</th><th>Название</th><th>Владелец</th><th>Статус</th><th>Действие</th></tr></thead><tbody id="full-ads-body"></tbody></table>`;
            fetchFullListings();
        } else if (view === 'users') {
            tableTitle.innerText = 'База пользователей';
            viewContainer.innerHTML = `<table id="main-table"><thead><tr><th>ID</th><th>Имя / Роль</th><th>Контакты</th><th>Регистрация</th><th>Профиль</th></tr></thead><tbody id="users-body"></tbody></table>`;
            fetchFullUsers();
        } else if (view === 'profile') {
            tableTitle.innerText = 'Настройки аккаунта';
            renderProfile();
        } else if (view === 'messages') {
            renderMessenger();
        }
    }

    async function fetchFullListings() {
        const res = await fetch(`${API_URL}/admin/listings`);
        const list = await res.json();
        const body = document.getElementById('full-ads-body');
        if(!body) return;
        body.innerHTML = list.map(l => `
            <tr>
                <td><span class="id-tag">${l.id.substring(0,8)}</span></td>
                <td>${l.title}</td>
                <td><span class="id-tag">${l.owner_id.substring(0,8)}</span></td>
                <td><span class="status-badge status-${l.status}">${l.status}</span></td>
                <td><button class="btn btn-primary" onclick="moderate('${l.id}', 'active')">АКТИВИРОВАТЬ</button></td>
            </tr>
        `).join('');
    }

    function renderProfile() {
        viewContainer.innerHTML = `
            <div style="padding: 40px; max-width: 450px; margin: 0 auto; text-align: center;">
                <img src="${currentUser.avatar || ''}" style="width:100px; height:100px; border-radius:25px; border:2px solid var(--brand-blue); margin-bottom:20px;">
                <input type="text" id="p-name" value="${currentUser.name}" class="btn-outline" style="width:100%; padding:12px; margin-bottom:12px; text-align:center;">
                <input type="text" id="p-avatar" value="${currentUser.avatar || ''}" placeholder="Avatar URL" class="btn-outline" style="width:100%; padding:12px; margin-bottom:15px; text-align:center;">
                <button class="btn btn-primary" style="width:100%;" onclick="saveProf()">СОХРАНИТЬ</button>
            </div>
        `;
    }

    window.saveProf = async () => {
        const name = document.getElementById('p-name').value;
        const avatar = document.getElementById('p-avatar').value;
        await fetch(`${API_URL}/admin/profile/update`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id: currentUser.id, name, avatar})
        });
        currentUser.name = name; currentUser.avatar = avatar;
        localStorage.setItem('dacha_admin_user', JSON.stringify(currentUser));
        location.reload();
    };

    window.updateUserId = async (oldId) => {
        const newId = document.getElementById('new-id-input').value.trim();
        if (!newId || newId === oldId) return alert('Введите новый уникальный ID');
        
        if (!confirm(`Подтверждаете смену ID с ${oldId} на ${newId}?`)) return;

        try {
            const res = await fetch(`${API_URL}/users/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: oldId,
                    new_id: newId,
                    actor_id: currentUser.id
                })
            });
            if (res.ok) {
                alert('ID успешно изменен!');
                window.viewUser(newId);
                if (document.getElementById('users-body')) fetchFullUsers();
            } else {
                alert('Ошибка при обновлении ID.');
            }
        } catch (e) { alert('Ошибка сети'); }
    };

    document.getElementById('logout-btn').onclick = () => {
        localStorage.clear();
        window.location.href = '../index.html';
    };

    initUI();
});
