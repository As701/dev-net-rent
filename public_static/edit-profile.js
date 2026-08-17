document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = window.DachaGoConfig?.apiUrl || 'http://localhost:5005/api';
    let currentUser = JSON.parse(localStorage.getItem('user'));

    if (!currentUser || !currentUser.id) {
        window.location.href = 'auth.html';
        return;
    }

    const elements = {
        name: document.getElementById('edit-name'),
        about: document.getElementById('edit-about'),
        phone: document.getElementById('current-phone-display'),
        avatar: document.getElementById('edit-avatar'),
        idDisplay: document.getElementById('display-id'),
        roleDisplay: document.getElementById('display-role'),
        saveBtn: document.getElementById('save-profile-btn'),
        backBtn: document.getElementById('back-trigger'),
        cancelBtn: document.getElementById('cancel-trigger'),
        avatarPicker: document.getElementById('avatar-picker-trigger'),
        
        // SMS Modal
        overlay: document.getElementById('sms-modal-overlay'),
        step1: document.getElementById('step-1-modal'),
        step2: document.getElementById('step-2-modal'),
        newPhone: document.getElementById('new-phone-input'),
        smsCode: document.getElementById('sms-code-input'),
        targetPhone: document.getElementById('target-phone'),
        sendCodeBtn: document.getElementById('send-code-btn'),
        verifyCodeBtn: document.getElementById('verify-code-btn'),
        openModalBtn: document.getElementById('open-sms-modal')
    };

    let originalData = {};
    let hasChanges = false;

    // 1. ЗАГРУЗКА ДАННЫХ
    async function loadData() {
        try {
            const res = await fetch(`${API_URL}/users/${encodeURIComponent(currentUser.id)}`);
            const data = await res.json();
            
            originalData = { ...data };
            
            elements.name.value = data.name || '';
            elements.about.value = data.about || '';
            elements.phone.innerText = data.phone || 'Не указан';
            elements.avatar.src = data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.id.replace('#', '')}`;
            elements.idDisplay.value = data.id;
            elements.roleDisplay.value = data.role === 'admin' ? 'Администратор' : 'Пользователь';
            
            // Отслеживаем изменения
            [elements.name, elements.about].forEach(el => {
                el.addEventListener('input', () => { hasChanges = true; });
            });
        } catch (e) {
            console.error('Ошибка загрузки:', e);
        }
    }

    // 2. СМЕНА АВАТАРА (Имитация)
    elements.avatarPicker.onclick = () => {
        const newSeed = Math.random().toString(36).substring(7);
        const newUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${newSeed}`;
        elements.avatar.src = newUrl;
        hasChanges = true;
    };

    // 3. СОХРАНЕНИЕ
    elements.saveBtn.onclick = async () => {
        const name = elements.name.value.trim();
        if (!name) return alert('Имя обязательно для заполнения');

        const payload = {
            id: currentUser.id,
            name: name,
            about: elements.about.value.trim(),
            avatar: elements.avatar.src
        };

        try {
            elements.saveBtn.innerText = 'Сохранение...';
            elements.saveBtn.disabled = true;

            const res = await fetch(`${API_URL}/users/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                hasChanges = false;
                alert('Профиль успешно обновлен!');
                window.location.href = 'profile.html';
            } else {
                alert('Ошибка при сохранении');
            }
        } catch (e) {
            alert('Ошибка сервера');
        } finally {
            elements.saveBtn.innerText = 'Сохранить изменения';
            elements.saveBtn.disabled = false;
        }
    };

    // 4. ВЫХОД И ПРЕДУПРЕЖДЕНИЕ
    const handleExit = (e) => {
        if (hasChanges) {
            if (!confirm('У вас есть несохраненные изменения. Выйти без сохранения?')) {
                if (e) e.preventDefault();
                return false;
            }
        }
        window.location.href = 'profile.html';
    };

    elements.backBtn.onclick = handleExit;
    elements.cancelBtn.onclick = handleExit;

    // 5. ЛОГИКА SMS
    elements.openModalBtn.onclick = () => {
        elements.overlay.style.display = 'flex';
        elements.step1.style.display = 'block';
        elements.step2.style.display = 'none';
    };

    elements.sendCodeBtn.onclick = async () => {
        const phone = elements.newPhone.value.trim();
        if (phone.length < 9) return alert('Введите корректный номер');

        elements.sendCodeBtn.innerText = 'Отправка...';
        elements.sendCodeBtn.disabled = true;

        setTimeout(() => {
            elements.targetPhone.innerText = phone;
            elements.step1.style.display = 'none';
            elements.step2.style.display = 'block';
            elements.sendCodeBtn.innerText = 'Получить код';
            elements.sendCodeBtn.disabled = false;
        }, 1000);
    };

    elements.verifyCodeBtn.onclick = async () => {
        const code = elements.smsCode.value.trim();
        const phone = elements.newPhone.value.trim();

        if (code !== '1111') return alert('Неверный код подтверждения (используйте 1111)');

        try {
            const res = await fetch(`${API_URL}/users/update-phone`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: currentUser.id, phone: phone })
            });

            if (res.ok) {
                alert('Номер телефона успешно изменен!');
                closeSmsModal();
                loadData();
            }
        } catch (e) {
            alert('Ошибка сервера');
        }
    };

    window.closeSmsModal = () => {
        elements.overlay.style.display = 'none';
    };

    loadData();
});
