document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = window.DachaGoConfig?.apiUrl || 'https://dev-net-rent.onrender.com/api/v1';
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = 'auth.html'; return; }

    const bookingsList = document.getElementById('bookings-list');
    const tabs = document.querySelectorAll('.tab-item');
    let currentTab = 'active';
    let bookingsData = { active: [], payment: [], history: [] };
    let activeIntervals = [];

    // --- TAB SWITCHING ---
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.tab;
            clearAllIntervals();
            renderBookings();
        };
    });

    async function fetchBookings() {
        try {
            const res = await fetch(`${API_URL}/bookings/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                bookingsData = await res.json();
                clearAllIntervals();
                renderBookings();
            }
        } catch (e) {
            console.error("Fetch error:", e);
            bookingsList.innerHTML = `<div class="empty-state"><p>Ошибка загрузки данных</p></div>`;
        }
    }

    function clearAllIntervals() {
        activeIntervals.forEach(clearInterval);
        activeIntervals = [];
    }

    function renderBookings() {
        const items = bookingsData[currentTab] || [];
        if (items.length === 0) {
            bookingsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>Здесь пока пусто</p>
                </div>`;
            return;
        }

        bookingsList.innerHTML = items.map(b => createBookingCard(b)).join('');
        
        // Start timers for payment tab
        if (currentTab === 'payment') {
            startAllTimers();
        }
    }

    function createBookingCard(b) {
        const statusMap = {
            'pending': { class: 'status-pending', label: 'Ожидание владельца' },
            'pending_check': { class: 'status-hot', label: 'Ожидает оплаты' },
            'confirmed': { class: 'status-confirmed', label: 'Подтверждено' },
            'rejected': { class: 'status-pending', label: 'Отклонено' }
        };
        const status = statusMap[b.status] || { class: '', label: b.status };
        
        let paymentHTML = '';
        if (currentTab === 'payment') {
            paymentHTML = `
                <div class="timer-row">
                    <span>ОСТАЛОСЬ:</span>
                    <span class="countdown" data-expire="${b.created_at}">09:59</span>
                </div>
                <div style="font-size: 11px; background: #f8f9fa; padding: 15px; border-radius: 15px; margin-bottom: 10px; border: 1px dashed #dee2e6;">
                    <p style="margin: 0 0 5px; font-weight: 800;">Реквизиты DachaGo:</p>
                    <p style="margin: 0; color: #2599C8; font-weight: 900;">9860 1200 4455 8899</p>
                    <p style="margin: 5px 0 0; font-size: 9px; color: #9BA5B7;">Переведите 10% депозита и загрузите чек ниже</p>
                </div>
                <button class="upload-btn" onclick="uploadScreenshot(${b.id})">Загрузить скриншот оплаты</button>
            `;
        }

        return `
            <div class="booking-card">
                <div class="card-top">
                    <img src="${b.image || 'https://via.placeholder.com/80'}" class="property-img">
                    <div class="property-info">
                        <h3 class="property-title">${b.title}</h3>
                        <span class="property-loc"><i class="fas fa-map-marker-alt"></i> ${b.location}</span>
                    </div>
                </div>
                <div class="card-dates">
                    <i class="fas fa-calendar-alt"></i>
                    <span>${formatDates(b.dates)}</span>
                </div>
                ${paymentHTML}
                <div class="card-footer">
                    <span class="status-badge ${status.class}">${status.label}</span>
                    <span class="price-val">${(b.base_price || 0).toLocaleString()} сум</span>
                </div>
            </div>
        `;
    }

    function formatDates(datesStr) {
        try {
            const dates = JSON.parse(datesStr);
            if (Array.isArray(dates) && dates.length > 0) {
                return `${dates[0]} — ${dates[dates.length-1]}`;
            }
        } catch(e) {}
        return datesStr;
    }

    function startAllTimers() {
        const countdowns = document.querySelectorAll('.countdown');
        countdowns.forEach(el => {
            const createdAt = new Date(el.dataset.expire).getTime();
            const expireAt = createdAt + (10 * 60 * 1000); // +10 mins
            
            const itv = setInterval(() => {
                const now = new Date().getTime();
                const diff = expireAt - now;
                
                if (diff <= 0) {
                    clearInterval(itv);
                    el.innerText = "ВРЕМЯ ИСТЕКЛО";
                    return;
                }
                
                const mins = Math.floor(diff / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                el.innerText = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
            }, 1000);
            activeIntervals.push(itv);
        });
    }

    window.uploadScreenshot = (id) => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*,.pdf';
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch(`${API_URL}/bookings/${id}/screenshot`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                if (res.ok) {
                    alert("Скриншот оплаты успешно загружен! Отправлен на проверку модератору.");
                    fetchBookings();
                } else {
                    const err = await res.json();
                    alert("Ошибка загрузки: " + (err.detail || "Не удалось отправить файл"));
                }
            } catch (err) {
                alert("Ошибка сети при отправке скриншота");
            }
        };
        fileInput.click();
    };

    fetchBookings();
});
