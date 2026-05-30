let currentTab = 'login';

function switchTab(tab) {
    currentTab = tab;
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    
    const nameGroup = document.getElementById('name-group');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const submitBtn = document.getElementById('submit-btn');

    if (tab === 'register') {
        nameGroup.style.display = 'block';
        authTitle.innerText = 'Создать аккаунт';
        authSubtitle.innerText = 'Заполните данные, чтобы начать пользоваться всеми функциями DachaGo.';
        submitBtn.innerText = 'Зарегистрироваться';
    } else {
        nameGroup.style.display = 'none';
        authTitle.innerText = 'С возвращением!';
        authSubtitle.innerText = 'Войдите в аккаунт, чтобы продолжить поиск вашей идеальной дачи.';
        submitBtn.innerText = 'Войти';
    }
}

document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const API_URL = window.DachaGoConfig?.apiUrl || 'http://localhost:5005/api';
    const identifier = document.getElementById('auth-identifier').value;
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name').value;

    const body = { 
        email_or_phone: identifier, 
        password: password,
        name: name 
    };

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('user', JSON.stringify(data));
            window.location.href = 'profile.html';
        } else {
            alert(data.detail || 'Ошибка. Проверьте данные.');
        }
    } catch (err) {
        console.error(err);
        alert('Не удалось связаться с сервером. Проверьте backend.');
    }
});

// Mock Social Auth
async function socialAuth(provider) {
    const API_URL = window.DachaGoConfig?.apiUrl || 'http://localhost:5005/api';
    const mockUser = {
        google: { email_or_phone: 'user@gmail.com', name: 'Google User', provider: 'google' },
        apple: { email_or_phone: 'user@apple.com', name: 'Apple User', provider: 'apple' }
    };

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mockUser[provider])
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('user', JSON.stringify(data));
            window.location.href = 'profile.html';
        }
    } catch (e) {
        alert('Ошибка социальной авторизации');
    }
}
