document.addEventListener('DOMContentLoaded', async () => {
    // ИСПРАВЛЕНИЕ АДРЕСА API: Добавлен обязательный префикс /v1, как на бэкенде Render
    const API_URL = window.DachaGoConfig?.apiUrl || 'https://dev-net-rent.onrender.com/api/v1';
    const token = localStorage.getItem('token');
    
    const elements = {
        app: document.getElementById('profile-app'),
        name: document.getElementById('display-name'),
        id: document.getElementById('display-id'),
        phone: document.getElementById('display-phone'),
        avatar: document.getElementById('user-avatar'),
        logout: document.getElementById('logout-trigger'),
        // Новые элементы из HTML, которые раньше игнорировались:
        statusDot: document.getElementById('status-dot'),
        statusLabel: document.getElementById('status-label')
    };

    if (!token) {
        renderGuestState();
    } else {
        await fetchProfile();
    }

    function renderGuestState() {
        if (elements.app) {
            elements.app.innerHTML = `
                <div style="padding: 100px 24px; text-align: center;">
                    <div style="width: 100px; height: 100px; background: #E3F2FD; border-radius: 35px; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px; font-size: 40px; color: #2b96cd;">        
                        <i class="fas fa-user-lock"></i>
                    </div>
                    <h2 style="font-weight: 900; font-size: 24px; margin-bottom: 10px;">Личный кабинет</h2>
                    <p style="color: #9BA5B7; font-size: 15px; margin-bottom: 40px; line-height: 1.6;">Войдите в аккаунт, чтобы управлять своими объявлениями, бронированиями и профилем.</p>
                    <a href="auth.html" style="display: block; background: #2b96cd; color: white; padding: 18px; border-radius: 20px; text-decoration: none; font-weight: 800; box-shadow: 0 10px 25px rgba(37, 153, 200, 0.3);">Войти / Регистрация</a>
                </div>`;
        }
    }

    async function fetchProfile() {
        try {
            const response = await fetch(`${API_URL}/users/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                localStorage.clear();
                renderGuestState();
                return;
            }

            const user = await response.json();
            
            // Железно сохраняем актуальные данные пользователя в localStorage
            localStorage.setItem('user', JSON.stringify(user));
            renderProfile(user);
        } catch (error) {
            console.error('Error fetching profile:', error);
            const cachedUser = JSON.parse(localStorage.getItem('user'));
            if (cachedUser) renderProfile(cachedUser);
            else renderGuestState();
        }
    }

    function renderProfile(user) {
        // Заполняем имя и аватарку по умолчанию
        if (elements.name) elements.name.innerText = user.name || 'Пользователь';
        if (elements.phone) elements.phone.innerText = user.phone || user.email || 'Телефон не указан';
        if (elements.avatar && !elements.avatar.src) {
            elements.avatar.src = user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
        }
        
        // КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Выводим уникальный сгенерированный ID бэкенда
        if (elements.id) {
            elements.id.innerText = user.user_id_code || user.id || 'N/A';
        }

        // КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Выводим роль пользователя и статус верификации
        if (elements.statusLabel && elements.statusDot) {
            const userRole = user.role === 'admin' ? 'Администратор' : 'Пользователь';
            elements.statusLabel.innerText = `Роль: ${userRole}`;
            elements.statusDot.classList.add('verified'); // Активируем зеленую точку статуса
        }
        
        if (elements.logout) {
            elements.logout.addEventListener('click', () => {
                localStorage.clear();
                window.location.href = 'index.html'; // При выходе красиво редиректим на главную
            });
        }
    }
});
