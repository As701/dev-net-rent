document.addEventListener('DOMContentLoaded', () => {
    const API_URL = window.DachaGoConfig?.apiUrl || 'https://dev-net-rent.onrender.com/api/v1';
    const BASE_URL = API_URL.replace('/api/v1', ''); // Get base domain for static files
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
        cancelBtn: document.getElementById('cancel-trigger'),
        avatarImg: document.getElementById('edit-avatar'),
        cameraOverlay: document.querySelector('.camera-overlay') || document.getElementById('avatar-picker-trigger')
    };

    // Create hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    // 1. Initial Data Population
    if (elements.name) elements.name.value = user.name || '';
    if (elements.bio) elements.bio.value = user.bio || '';
    if (elements.email) elements.email.value = user.email || '';
    
    if (elements.avatarImg) {
        let avatarUrl = user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`;
        if (avatarUrl.startsWith('/storage')) avatarUrl = BASE_URL + avatarUrl;
        elements.avatarImg.src = avatarUrl;
    }

    if (elements.phone) {
        if (user.phone) {
            elements.phone.value = user.phone;
            if (elements.phoneStatus) elements.phoneStatus.classList.add('active');
        } else {
            elements.phone.value = '';
            elements.phone.placeholder = "Номер подтверждается при бронировании";
        }
    }

    if (elements.id) elements.id.value = user.user_id_code || user.id || '';
    if (elements.role) elements.role.value = user.role === 'admin' ? 'Администратор' : 'Пользователь';

    if (elements.backBtn) elements.backBtn.addEventListener('click', () => window.history.back());
    if (elements.cancelBtn) elements.cancelBtn.addEventListener('click', (e) => { e.preventDefault(); window.history.back(); });

    // 2. Avatar Click / Camera Click Logic
    const triggerUpload = () => fileInput.click();
    if (elements.avatarImg) elements.avatarImg.addEventListener('click', triggerUpload);
    if (elements.cameraOverlay) elements.cameraOverlay.addEventListener('click', triggerUpload);

    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview immediately
        const reader = new FileReader();
        reader.onload = (event) => { if (elements.avatarImg) elements.avatarImg.src = event.target.result; };
        reader.readAsDataURL(file);

        // Upload to server
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_URL}/users/upload-avatar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                user.avatar_url = data.avatar_url;
                localStorage.setItem('user', JSON.stringify(user));
                alert('Фото профиля обновлено!');
            } else {
                alert('Ошибка при загрузке фото');
            }
        } catch (err) {
            console.error(err);
            alert('Ошибка соединения с сервером');
        }
    };

    // 3. Save Profile Text Changes
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
