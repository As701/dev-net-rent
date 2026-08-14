document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = window.DachaGoConfig?.apiUrl || 'https://dev-net-rent.onrender.com/api/v1';
    
    // --- AUTH GUARD ---
    let currentUser = JSON.parse(localStorage.getItem('dacha_admin_user') || '{}');
    if (!localStorage.getItem('dacha_admin_logged') || currentUser.role !== 'super_admin') {
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
    const globalSearch = document.getElementById('global-search');
    const searchModal = document.getElementById('search-modal');
    const modalBody = document.getElementById('modal-body-content');

    function initUI() {
        document.getElementById('user-name').innerText = currentUser.name;
        document.getElementById('user-avatar').src = currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`;
        fetchDashboardData();
    }

    // --- NAVIGATION ---
    navItems.forEach(item => {
        item.onclick = () => {
            const view = item.dataset.view;
            if (!view) return;
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            if (view === 'dash') {
                dashView.style.display = 'block';
                dynamicView.style.display = 'none';
                fetchDashboardData();
            } else {
                dashView.style.display = 'none';
                dynamicView.style.display = 'block';
                renderView(view);
            }
        };
    });

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
            document.getElementById('modal-title').innerText = 'Досье пользователя';
            modalBody.innerHTML = `
                <div style="display:grid; grid-template-columns: 180px 1fr; gap:30px; align-items:start;">
                    <img src="${u.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed='+u.id}" style="width:100%; border-radius:20px; border:2px solid var(--founder-gold);">
                    <div>
                        <h2 style="color:var(--founder-gold); margin:0;">${u.name}</h2>
                        <p style="color:#888; font-size:12px; margin:5px 0 15px;">ID: ${u.id}</p>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; font-size:14px;">
                            <div><b>Роль:</b> ${u.role}</div>
                            <div><b>Телефон:</b> ${u.phone || '—'}</div>
                            <div><b>Email:</b> ${u.email || '—'}</div>
                            <div><b>Дата рег:</b> ${new Date(u.reg_date || Date.now()).toLocaleString()}</div>
                        </div>
                        <div style="margin-top:25px; display:flex; flex-wrap:wrap; gap:10px;">
                            <div style="width:100%; display:flex; gap:5px; margin-bottom:5px;">
                                <input type="text" id="new-id-input" placeholder="Новый ID (напр. #DGID...)" style="flex:1; background:rgba(255,255,255,0.05); border:1px solid var(--founder-gold); border-radius:10px; padding:10px; color:white; font-size:12px;">
                                <button class="btn btn-primary" style="padding:10px 15px;" onclick="window.updateUserId('${u.id}')">СМЕНИТЬ ID</button>
                            </div>
                            <button class="btn btn-outline" style="border-color:var(--founder-gold); color:var(--founder-gold);" onclick="alert('Управление ролями...')">ИЗМЕНИТЬ РОЛЬ</button>
                            <button class="btn btn-outline" style="color:var(--danger); border-color:var(--danger);" onclick="banUser('${u.id}')">ЗАБЛОКИРОВАТЬ</button>
                        </div>
                    </div>
                </div>
                <div style="margin-top:30px;">
                    <h3>Объявления пользователя</h3>
                    <div id="user-ads-list" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;"></div>
                </div>
            `;
            
            const adsList = document.getElementById('user-ads-list');
            if (data.listings && data.listings.length > 0) {
                adsList.innerHTML = data.listings.map(l => `
                    <div style="background:rgba(255,255,255,0.02); padding:15px; border-radius:15px; border:1px solid rgba(255,255,255,0.05);">
                        <div style="font-weight:800;">${l.title}</div>
                        <div style="color:var(--founder-gold); font-size:13px; margin-top:5px;">${l.price} сум</div>
                    </div>
                `).join('');
            } else {
                adsList.innerHTML = '<div style="color:#666;">Нет объявлений</div>';
            }
        } catch (e) { alert('Ошибка загрузки данных'); }
    };

    // --- DASHBOARD DATA ---
    async function fetchDashboardData() {
        try {
            const resStats = await fetch(`${API_URL}/admin/stats/advanced`, { headers: {'x-admin-role': 'super_admin'}});
            const s = await resStats.json();
            document.getElementById('s-users').innerText = s.total_users;
            document.getElementById('s-active').innerText = s.active_listings;
            document.getElementById('s-pending').innerText = s.pending_listings;
            document.getElementById('s-admins').innerText = s.total_admins;
            document.getElementById('s-new').innerText = s.new_users_24h;

            const resLogs = await fetch(`${API_URL}/admin/recent-activity`);
            const logs = await resLogs.json();
            document.getElementById('dash-logs-body').innerHTML = logs.map(l => `
                <tr onclick="viewAdminActivity('${l.admin_id}')" style="cursor:pointer;">
                    <td><span class="id-tag">${l.admin_id.substring(0,8)}</span></td>
                    <td><b>${l.action}</b></td>
                    <td><small>${new Date(l.date).toLocaleString()}</small></td>
                    <td><small style="color:#666;">${l.device.substring(0,20)}...</small></td>
                </tr>
            `).join('') || '<tr><td colspan="4" style="text-align:center;">Нет данных</td></tr>';

            const resAds = await fetch(`${API_URL}/admin/listings`);
            const ads = await resAds.json();
            document.getElementById('dash-ads-body').innerHTML = ads.slice(0, 8).map(a => `
                <tr onclick="window.viewAd('${a.id}')" style="cursor:pointer;">
                    <td><span class="id-tag">${a.id.substring(0,8)}</span></td>
                    <td>${a.title}</td>
                    <td><span class="id-tag" style="color:#888;">${a.owner_id.substring(0,8)}</span></td>
                    <td><span class="status-badge status-${a.status}">${a.status}</span></td>
                </tr>
            `).join('');
        } catch(e) {}
    }

    // --- VIEWS ---
    function renderView(view) {
        if (view === 'listings') {
        tableTitle.innerText = 'Все объявления';
        viewContainer.innerHTML = `<table id="main-table"><thead><tr><th>ID</th><th>Название</th><th>Владелец</th><th>Статус</th><th>Действие</th></tr></thead><tbody id="ads-body"></tbody></table>`;
        fetchFullAds();
        } else if (view === 'users') {
        tableTitle.innerText = 'База пользователей';
        viewContainer.innerHTML = `<table id="main-table"><thead><tr><th>ID</th><th>Имя / Роль</th><th>Телефон / Email</th><th>Регистрация</th><th>Профиль</th></tr></thead><tbody id="users-body"></tbody></table>`;
        fetchFullUsers();
        } else if (view === 'audit') {
        tableTitle.innerText = 'История изменений ID';
        viewContainer.innerHTML = `<table id="main-table"><thead><tr><th>Старый ID</th><th>Новый ID</th><th>Пользователь</th><th>Кто изменил</th><th>Дата</th></tr></thead><tbody id="audit-body"></tbody></table>`;
        fetchAuditLogs();
        } else if (view === 'admins') {            tableTitle.innerText = 'Команда администраторов';
            viewContainer.innerHTML = `<table id="main-table"><thead><tr><th>ID</th><th>Имя</th><th>Действия</th></tr></thead><tbody id="admins-body"></tbody></table>`;
            fetchAdmins();
        }
    }

    async function fetchFullUsers() {
        const res = await fetch(`${API_URL}/admin/users/all-detailed`);
        const users = await res.json();
        document.getElementById('users-body').innerHTML = users.map(u => `
            <tr>
                <td><span class="id-tag" onclick="window.viewUser('${u.id}')" style="cursor:pointer;">${u.id.substring(0,8)}</span></td>
                <td><b>${u.name}</b><br><small>${u.role}</small></td>
                <td>${u.phone || u.email}</td>
                <td><small>${new Date(u.reg_date || Date.now()).toLocaleDateString()}</small></td>
                <td><button class="btn btn-outline" onclick="window.viewUser('${u.id}')">ДЕТАЛИ</button></td>
            </tr>
        `).join('');
    }

    async function fetchFullAds() {
        const res = await fetch(`${API_URL}/admin/listings`);
        const ads = await res.json();
        document.getElementById('ads-body').innerHTML = ads.map(a => `
            <tr>
                <td><span class="id-tag">${a.id.substring(0,8)}</span></td>
                <td>${a.title}</td>
                <td><span class="id-tag">${a.owner_id.substring(0,8)}</span></td>
                <td><span class="status-badge status-${a.status}">${a.status}</span></td>
                <td><button class="btn btn-outline" onclick="window.viewAd('${a.id}')">ПРОСМОТР</button></td>
            </tr>
        `).join('');
    }

    async function fetchAdmins() {
        const res = await fetch(`${API_URL}/admin/users`, {headers:{'x-admin-role':'super_admin'}});
        const users = await res.json();
        const admins = users.filter(u => u.role === 'admin' || u.role === 'super_admin');
        document.getElementById('admins-body').innerHTML = admins.map(a => `
            <tr>
                <td><span class="id-tag">${a.id.substring(0,8)}</span></td>
                <td><b>${a.name}</b> (${a.role})</td>
                <td><button class="btn btn-primary" onclick="viewAdminActivity('${a.id}')">АКТИВИРОВАТЬ</button></td>
            </tr>
        `).join('');
    }

    async function fetchAuditLogs() {
        try {
            const res = await fetch(`${API_URL}/admin/audit/ids`);
            const logs = await res.json();
            document.getElementById('audit-body').innerHTML = logs.map(l => `
                <tr>
                    <td><span class="id-tag">${l.old_id}</span></td>
                    <td><span class="id-tag" style="color:var(--founder-gold);">${l.new_id}</span></td>
                    <td><b>${l.user_name}</b></td>
                    <td><span class="id-tag">${l.actor_id}</span></td>
                    <td><small>${new Date(l.timestamp).toLocaleString()}</small></td>
                </tr>
            `).join('') || '<tr><td colspan="5" style="text-align:center;">Логов пока нет</td></tr>';
        } catch(e) { console.error(e); }
    }

    window.updateUserId = async (oldId) => {
        const newId = document.getElementById('new-id-input').value.trim();
        if (!newId || newId === oldId) return alert('Введите новый уникальный ID');
        
        if (!confirm(`Вы уверены, что хотите изменить ID с ${oldId} на ${newId}?`)) return;

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
                alert('Ошибка при обновлении ID. Возможно, он уже занят.');
            }
        } catch (e) { alert('Ошибка сети'); }
    };

    document.getElementById('logout-btn').onclick = () => {
        localStorage.clear();
        window.location.href = '../index.html';
    };

    initUI();
});
