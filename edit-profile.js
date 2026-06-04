document.addEventListener('DOMContentLoaded', () => {
    const API_URL = window.DachaGoConfig?.apiUrl || 'https://dev-net-rent.onrender.com/api/v1';
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');

    if (!token || !userRaw) {
        window.location.href = 'auth.html';
        return;
    }

    const user = JSON.parse(userRaw);

    // Привязываем элементы инпутов формы редактирования (согласно HTML)
    const nameInput = document.getElementById('edit-name');
    const phoneInput = document.getElementById('new-phone-input');
    const idInput = document.getElementById('display-id');
    const roleInput = document.getElementById('display-role');
    const phoneDisplay = document.getElementById('current-phone-display');
    const saveBtn = document.getElementById('save-profile-btn');
    const backBtn = document.getElementById('back-trigger');
    const cancelBtn = document.getElementById('cancel-trigger');

    // КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Заполняем форму актуальными данными из базы
    if (nameInput) nameInput.value = user.name || '';
    if (phoneDisplay) phoneDisplay.innerText = user.phone || user.email || '...';
    
    // НАСТРОЙКА ИЗ ТЗ: Заполняем ID и Роль, делая их read-only (уже в HTML readonly)
    if (idInput) {
        idInput.value = user.user_id_code || user.id || '';
        idInput.disabled = true; // Полностью блокируем поле для ввода
        idInput.style.backgroundColor = '#F1F5F9'; // Визуально делаем серым
        idInput.style.color = '#64748B';
    }

    if (roleInput) {
        roleInput.value = user.role === 'admin' ? 'Администратор' : 'Пользователь';
        roleInput.disabled = true;
        roleInput.style.backgroundColor = '#F1F5F9';
        roleInput.style.color = '#64748B';
    }

    if (backBtn) backBtn.addEventListener('click', () => window.history.back());
    if (cancelBtn) cancelBtn.addEventListener('click', (e) => { e.preventDefault(); window.history.back(); });

    // Логика сохранения изменений при отправке
    if (saveBtn) {
        saveBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const updatedData = {
                name: nameInput ? nameInput.value.trim() : user.name,
                // phone обновляется через SMS модалку, здесь сохраняем текущие или новые данные
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
                    alert('Профиль успешно обновлен!');
                    window.location.href = 'profile.html';
                } else {
                    const errData = await response.json();
                    alert(errData.detail || 'Ошибка при обновлении профиля');
                }
            } catch (err) {
                console.error(err);
                alert('Ошибка соединения с сервером');
            }
        });
    }
});
