document.addEventListener('DOMContentLoaded', () => {
    const API_URL = window.DachaGoConfig?.apiUrl || 'https://dev-net-rent.onrender.com/api/v1';
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');

    if (!token || !userRaw) {
        window.location.href = 'auth.html';
        return;
    }

    const user = JSON.parse(userRaw);

    const elements = {
        name: document.getElementById('edit-name'),
        bio: document.getElementById('edit-bio'),
        email: document.getElementById('edit-email'),
        phone: document.getElementById('edit-phone'),
        id: document.getElementById('display-id'),
        role: document.getElementById('display-role'),
        phoneStatus: document.getElementById('phone-status'),
        saveBtn: document.getElementById('save-profile-btn'),
        backBtn: document.getElementById('back-trigger'),
        cancelBtn: document.getElementById('cancel-trigger')
    };

    // 1. Поля Имя и Bio свободно редактируются
    if (elements.name) elements.name.value = user.name || '';
    if (elements.bio) elements.bio.value = user.bio || '';

    // 2. Email заблокирован
    if (elements.email) elements.email.value = user.email || '';

    // 3. Номер телефона (Lazy Verification logic)
    if (elements.phone) {
        if (user.phone) {
            elements.phone.value = user.phone;
            if (elements.phoneStatus) elements.phoneStatus.classList.add('active');
        } else {
            elements.phone.value = '';
            elements.phone.placeholder = "Номер подтверждается при бронировании";
        }
    }

    // 4. Read-only поля
    if (elements.id) elements.id.value = user.user_id_code || user.id || '';
    if (elements.role) elements.role.value = user.role === 'admin' ? 'Администратор' : 'Пользователь';

    if (elements.backBtn) elements.backBtn.addEventListener('click', () => window.history.back());
    if (elements.cancelBtn) elements.cancelBtn.addEventListener('click', (e) => { e.preventDefault(); window.history.back(); });

    // 5. Логика сохранения (PUT /api/v1/users/update)
    if (elements.saveBtn) {
        elements.saveBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            elements.saveBtn.disabled = true;
            elements.saveBtn.innerText = 'Сохранение...';

            const updatedData = {
                name: elements.name.value.trim(),
                bio: elements.bio.value.trim()
            };

            try {
                const response = await fetch(`${API_URL}/users/update`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedData)
                });

                if (response.ok) {
                    const freshUser = await response.json();
                    // Обновляем localStorage только при успехе
                    localStorage.setItem('user', JSON.stringify(freshUser));
                    alert('Профиль успешно обновлен!');
                    window.location.href = 'profile.html';
                } else {
                    const err = await response.json();
                    alert(err.detail || 'Ошибка при обновлении профиля');
                }
            } catch (err) {
                console.error(err);
                alert('Ошибка соединения с сервером');
            } finally {
                elements.saveBtn.disabled = false;
                elements.saveBtn.innerText = 'Сохранить изменения';
            }
        });
    }
});
