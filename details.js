document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const listingId = urlParams.get('id');
    const API_URL = window.DachaGoConfig?.apiUrl || 'https://dev-net-rent.onrender.com/api/v1';

    if (!listingId) { window.location.href = 'index.html'; return; }

    const elements = {
        loading: document.getElementById('loading-overlay'),
        galleryImg: document.getElementById('main-gallery-img'),
        price: document.getElementById('price-container'),
        title: document.getElementById('listing-title'),
        location: document.getElementById('listing-location'),
        id: document.getElementById('listing-id'),
        beds: document.getElementById('char-beds'),
        baths: document.getElementById('char-baths'),
        area: document.getElementById('char-area'),
        capacity: document.getElementById('char-capacity'),
        amenities: document.getElementById('amenities-container'),
        description: document.getElementById('listing-description'),
        ownerName: document.getElementById('owner-name'),
        favBtn: document.getElementById('fav-detail-btn'),
        bookBtn: document.getElementById('book-action-btn'),
        // Modal Elements
        modal: document.getElementById('sms-verification-modal'),
        stepPhone: document.getElementById('modal-step-phone'),
        stepCode: document.getElementById('modal-step-code'),
        phoneInput: document.getElementById('booking-phone-input'),
        confirmPhoneLabel: document.getElementById('confirm-phone-label'),
        btnGetCode: document.getElementById('btn-get-code'),
        btnVerifyBook: document.getElementById('btn-verify-book'),
        closeModal: document.getElementById('close-modal-btn'),
        backToPhone: document.getElementById('back-to-phone-btn'),
        otpBoxes: document.querySelectorAll('.otp-box')
    };

    const amenityIcons = {
        'pool': { icon: 'fa-swimming-pool', label: 'Бассейн' },
        'БАССЕЙН': { icon: 'fa-swimming-pool', label: 'Бассейн' },
        'sauna': { icon: 'fa-hot-tub', label: 'Сауна/Баня' },
        'САУНА': { icon: 'fa-hot-tub', label: 'Сауна/Баня' },
        'wifi': { icon: 'fa-wifi', label: 'Wi-Fi' },
        'ac': { icon: 'fa-snowflake', label: 'Конд-р' },
        'kitchen': { icon: 'fa-utensils', label: 'Кухня' },
        'karaoke': { icon: 'fa-microphone', label: 'Караоке' }
    };

    function renderAmenities(amenitiesJson) {
        if (!elements.amenities) return;
        let list = [];
        try { list = (typeof amenitiesJson === 'string') ? JSON.parse(amenitiesJson) : (amenitiesJson || []); } catch(e) { list = []; }
        if (!list.length) { elements.amenities.innerHTML = '<p>Удобства не указаны</p>'; return; }
        elements.amenities.innerHTML = list.map(id => {
            const info = amenityIcons[id.toLowerCase()] || { icon: 'fa-check-circle', label: id };
            return `<div class="amenity-item active"><i class="fas ${info.icon}"></i><span>${info.label}</span><div class="check-badge">✓</div></div>`;
        }).join('');
    }

    async function loadData() {
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const res = await fetch(`${API_URL}/listings`, { headers });
            const listings = await res.json();
            const item = listings.find(l => String(l.id) === String(listingId));
            if (!item) { window.location.href = 'index.html'; return; }

            elements.galleryImg.src = item.image || '';
            elements.title.innerText = item.title;
            elements.location.innerText = item.location;
            elements.id.innerText = `ID: DG-${item.id}`;
            elements.price.innerHTML = `${item.price.toLocaleString()} сум <span>/сутки</span>`;
            elements.beds.innerText = item.rooms || '-';
            elements.baths.innerText = item.bathrooms || '1';
            elements.area.innerText = item.area || '-';
            elements.capacity.innerText = item.capacity || '-';
            elements.description.innerText = item.description || '';
            renderAmenities(item.amenities);
            elements.ownerName.innerText = item.owner_name || 'Владелец';
        } catch (e) { console.error(e); } finally { elements.loading.style.display = 'none'; }
    }

    // --- BOOKING LOGIC (LAZY VERIFICATION) ---
    if (elements.bookBtn) {
        elements.bookBtn.onclick = (e) => {
            e.preventDefault();
            const userRaw = localStorage.getItem('user');
            if (!userRaw) { alert('Пожалуйста, войдите в аккаунт'); window.location.href = 'auth.html'; return; }
            
            const user = JSON.parse(userRaw);
            
            // Ветка 1: Телефон уже есть
            if (user.phone) {
                confirmBooking();
            } else {
                // Ветка 2: Телефона нет -> Показываем модалку
                elements.modal.style.display = 'flex';
            }
        };
    }

    // Step 1: Send SMS
    elements.btnGetCode.onclick = async () => {
        const phone = elements.phoneInput.value.trim();
        if (phone.length < 9) { alert('Введите корректный номер'); return; }
        
        elements.btnGetCode.disabled = true;
        elements.btnGetCode.innerText = 'Отправка...';

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/auth/send-sms-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ phone })
            });

            if (res.ok) {
                elements.confirmPhoneLabel.innerText = phone;
                elements.stepPhone.style.display = 'none';
                elements.stepCode.style.display = 'block';
            } else {
                alert('Ошибка при отправке СМС');
            }
        } catch (err) { alert('Ошибка сети'); } finally { elements.btnGetCode.disabled = false; elements.btnGetCode.innerText = 'Получить код'; }
    };

    // Step 2: Verify and Book
    elements.btnVerifyBook.onclick = async () => {
        const code = Array.from(elements.otpBoxes).map(b => b.value).join('');
        if (code.length < 4) return;

        elements.btnVerifyBook.disabled = true;
        elements.btnVerifyBook.innerText = 'Проверка...';

        try {
            const token = localStorage.getItem('token');
            const phone = elements.phoneInput.value.trim();
            const res = await fetch(`${API_URL}/auth/verify-sms-and-book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ phone, code, listing_id: listingId, dates: ["2024-07-01"] }) // Simplified dates for TZ
            });

            if (res.ok) {
                // Update local user data
                const user = JSON.parse(localStorage.getItem('user'));
                user.phone = phone;
                localStorage.setItem('user', JSON.stringify(user));

                alert('Номер подтвержден! Заявка на бронирование отправлена на модерацию.');
                elements.modal.style.display = 'none';
            } else {
                alert('Неверный код подтверждения');
            }
        } catch (err) { alert('Ошибка сети'); } finally { elements.btnVerifyBook.disabled = false; elements.btnVerifyBook.innerText = 'Подтвердить и забронировать'; }
    };

    async function confirmBooking() {
        alert('Заявка отправлена на модерацию!');
        // Here you would call a regular booking endpoint if needed
    }

    // OTP Boxes focus logic
    elements.otpBoxes.forEach((box, i) => {
        box.oninput = () => { if (box.value && i < 3) elements.otpBoxes[i+1].focus(); };
        box.onkeydown = (e) => { if (e.key === 'Backspace' && !box.value && i > 0) elements.otpBoxes[i-1].focus(); };
    });

    elements.closeModal.onclick = () => elements.modal.style.display = 'none';
    elements.backToPhone.onclick = () => { elements.stepCode.style.display = 'none'; elements.stepPhone.style.display = 'block'; };

    loadData();
});
