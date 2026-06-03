document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = window.DachaGoConfig?.apiUrl || 'https://dev-net-rent.onrender.com/api';
    
    // 1. Получаем текущего пользователя
    let currentUser = JSON.parse(localStorage.getItem('user'));

    const elements = {
        app: document.getElementById('profile-app'),
        name: document.getElementById('display-name'),
        id: document.getElementById('display-id'),
        phone: document.getElementById('display-phone'),
        avatar: document.getElementById('user-avatar'),
        statusDot: document.getElementById('status-dot'),
        statusLabel: document.getElementById('status-label'),
        ratingContainer: document.getElementById('rating-container'),
        ratingValue: document.getElementById('display-rating'),
        
        // Stats
        countAds: document.getElementById('count-ads'),
        countFollowers: document.getElementById('count-followers'),
        countFollowing: document.getElementById('count-following'),
        
        // Ads List
        adsSection: document.getElementById('user-ads-section'),
        adsList: document.getElementById('ads-list'),
        
        // Buttons
        logout: document.getElementById('logout-trigger'),
        deleteAccount: document.getElementById('delete-account-trigger')
    };

    // ПРОВЕРКА АВТОРИЗАЦИИ
    if (!currentUser || !currentUser.id) {
        renderGuestState();
        return;
    }

    function renderGuestState() {
        if (elements.app) {
            elements.app.innerHTML = `
                <div style="padding: 100px 24px; text-align: center;">
                    <div style="width: 100px; height: 100px; background: #E3F2FD; border-radius: 35px; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px; font-size: 40px; color: var(--brand-blue);">
                        <i class="fas fa-user-lock"></i>
                    </div>
                    <h2 style="font-weight: 900; font-size: 24px; margin-bottom: 10px;">Личный кабинет</h2>
                    <p style="color: var(--text-light); font-size: 15px; margin-bottom: 40px; line-height: 1.6;">Войдите в аккаунт, чтобы управлять своими объявлениями, бронированиями и профилем.</p>
                    <a href="auth.html" style="display: block; background: var(--brand-blue); color: white; padding: 18px; border-radius: 20px; text-decoration: none; font-weight: 800; box-shadow: 0 10px 25px rgba(37, 153, 200, 0.3);">Войти / Регистрация</a>
                    <a href="index.html" style="display: block; margin-top: 20px; color: var(--text-light); text-decoration: none; font-weight: 700; font-size: 14px;">На главную</a>
                </div>
            `;
        }
    }

    async function fetchProfile() {
        try {
            const safeId = encodeURIComponent(currentUser.id);
            const response = await fetch(`${API_URL}/users/${safeId}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn('User not found on server, clearing local storage');
                    localStorage.removeItem('user');
                    renderGuestState();
                    return;
                }
                throw new Error('Server error');
            }
            
            const userData = await response.json();
            // СИНХРОНИЗАЦИЯ: обновляем локальные данные данными с сервера
            localStorage.setItem('user', JSON.stringify(userData));
            renderProfile(userData);
            fetchUserAds(userData.id);
        } catch (error) {
            console.error('Ошибка загрузки профиля:', error);
            // Если сервер лежит, показываем что есть в кэше
            renderProfile(currentUser);
        }
    }

    async function fetchUserAds(userId) {
        try {
            const res = await fetch(`${API_URL}/listings/user/${encodeURIComponent(userId)}`);
            if (res.ok) {
                const ads = await res.json();
                renderAds(ads);
            }
        } catch (error) {
            console.error('Ошибка загрузки объявлений:', error);
        }
    }

    function renderProfile(user) {
        if (!elements.name) return; // Мы в режиме гостя или элементы не найдены
        
        elements.name.innerText = user.name || 'Пользователь';
        elements.id.innerText = user.id; 
        elements.phone.innerText = user.phone || 'Номер не указан';
        
        // Аватар
        const avatarSeed = user.id.replace('#', '');
        elements.avatar.src = user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;
        
        // Верификация
        if (user.verified) {
            elements.statusDot.classList.add('verified');
            elements.statusLabel.innerText = 'Верифицирован';
            elements.statusLabel.style.color = 'var(--success)';
        } else {
            elements.statusDot.classList.remove('verified');
            elements.statusLabel.innerText = 'Не верифицирован';
            elements.statusLabel.style.color = 'var(--text-light)';
        }

        // Рейтинг
        if (user.rating && user.rating > 0) {
            elements.ratingContainer.style.display = 'flex';
            elements.ratingValue.innerText = user.rating.toFixed(1);
        }

        // Статистика
        elements.countAds.innerText = user.stats?.adsCount || 0;
        elements.countFollowers.innerText = user.stats?.followersCount || 0;
        elements.countFollowing.innerText = user.stats?.followingCount || 0;
    }

    function renderAds(ads) {
        if (!ads || ads.length === 0) {
            elements.adsSection.style.display = 'none';
            return;
        }

        elements.adsSection.style.display = 'block';
        elements.adsList.innerHTML = ads.map(ad => `
            <div class="ad-mini-card" onclick="window.location.href='details.html?id=${ad.id}'">
                <img src="${ad.image || 'https://via.placeholder.com/160x100?text=No+Photo'}" class="ad-img" alt="${ad.title}">
                <div class="ad-info">
                    <span class="ad-title">${ad.title}</span>
                    <span class="ad-price">${(ad.price || 0).toLocaleString()} сум</span>
                    <span class="ad-status">${ad.status === 'active' ? 'Активно' : 'Черновик'}</span>
                </div>
            </div>
        `).join('');

        elements.countAds.innerText = ads.length;
    }

    if (elements.logout) {
        elements.logout.onclick = () => {
            if (confirm('Выйти из системы?')) {
                localStorage.removeItem('user');
                window.location.reload();
            }
        };
    }

    if (elements.deleteAccount) {
        elements.deleteAccount.onclick = async () => {
            if (confirm('ВНИМАНИЕ! Удалить аккаунт навсегда?')) {
                const doubleCheck = confirm('Это действие нельзя отменить.');
                if (doubleCheck) {
                    try {
                        const res = await fetch(`${API_URL}/users/${encodeURIComponent(currentUser.id)}`, {
                            method: 'DELETE'
                        });
                        if (res.ok) {
                            alert('Аккаунт удален');
                            localStorage.removeItem('user');
                            window.location.href = 'index.html';
                        }
                    } catch (error) {
                        alert('Ошибка при удалении');
                    }
                }
            }
        };
    }

    fetchProfile();
});
