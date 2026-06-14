document.addEventListener('DOMContentLoaded', () => {
    const API_URL = window.DachaGoConfig?.apiUrl || 'https://dev-net-rent.onrender.com/api/v1';
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = 'auth.html'; return; }

    const sessionsList = document.getElementById('sessions-list');
    const changePassBtn = document.getElementById('change-pass-btn');
    const deletePassportBtn = document.getElementById('delete-passport-btn');

    // --- SESSIONS ---
    async function loadSessions() {
        // Simulated session logic
        const userAgent = navigator.userAgent;
        const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
        const deviceName = isMobile ? "Мобильное устройство" : "Персональный компьютер";
        
        sessionsList.innerHTML = `
            <div class="session-item">
                <div class="session-info">
                    <span class="session-device">${deviceName} <span class="session-current">ТЕКУЩАЯ</span></span>
                    <span class="session-meta">Ташкент, Узбекистан • Сейчас в сети</span>
                </div>
            </div>
            <div class="session-item" style="opacity: 0.6;">
                <div class="session-info">
                    <span class="session-device">iPhone 13 Pro</span>
                    <span class="session-meta">Самарканд, Узбекистан • 2 часа назад</span>
                </div>
                <button class="terminate-btn" onclick="alert('Сессия завершена')">Выйти</button>
            </div>
        `;
    }

    // --- CHANGE PASSWORD ---
    changePassBtn.onclick = async () => {
        const oldPassword = document.getElementById('old-password').value;
        const newPassword = document.getElementById('new-password').value;

        if (newPassword.length < 8) {
            alert("Новый пароль должен содержать минимум 8 символов");
            return;
        }

        changePassBtn.disabled = true;
        changePassBtn.innerText = "Обновление...";

        try {
            const res = await fetch(`${API_URL}/users/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
            });

            if (res.ok) {
                alert("Пароль успешно изменен!");
                document.getElementById('old-password').value = '';
                document.getElementById('new-password').value = '';
            } else {
                const err = await res.json();
                alert("Ошибка: " + (err.detail || "Не удалось изменить пароль"));
            }
        } catch (e) {
            alert("Ошибка сети");
        } finally {
            changePassBtn.disabled = false;
            changePassBtn.innerText = "Обновить пароль";
        }
    };

    // --- DELETE PASSPORT DATA ---
    deletePassportBtn.onclick = async () => {
        if (!confirm("Вы уверены? Это действие удалит ваш статус верификации и вы не сможете публиковать новые объявления.")) {
            return;
        }

        try {
            const res = await fetch(`${API_URL}/users/delete-passport`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                alert("Паспортные данные удалены. Статус верификации отозван.");
                window.location.href = 'profile.html';
            } else {
                alert("Ошибка при удалении данных");
            }
        } catch (e) {
            alert("Ошибка сети");
        }
    };

    loadSessions();
});
