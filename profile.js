document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = window.DachaGoConfig?.apiUrl || 'https://dev-net-rent.onrender.com/api';
    const token = localStorage.getItem('token');
    
    const elements = {
        app: document.getElementById('profile-app'),
        name: document.getElementById('display-name'),
        id: document.getElementById('display-id'),
        phone: document.getElementById('display-phone'),
        avatar: document.getElementById('user-avatar'),
        logout: document.getElementById('logout-trigger')
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
        if (elements.name) elements.name.innerText = user.name;
        if (elements.id) elements.id.innerText = user.id;
        if (elements.phone) elements.phone.innerText = user.phone || 'Не указан';
        
        if (elements.logout) {
            elements.logout.addEventListener('click', () => {
                localStorage.clear();
                window.location.reload();
            });
        }
    }
});