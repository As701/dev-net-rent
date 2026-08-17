document.addEventListener('DOMContentLoaded', () => {
    // === СОСТОЯНИЕ ===
    let mode = 'simple';
    let currentDate = new Date();
    let availability = {}; // { "2026-04-22": { status: 'available', price: 1500000 } }
    let photos = [];
    let selectedCoords = null;
    let myMap, myPlacemark;

    // === ЭЛЕМЕНТЫ ===
    const calGrid = document.getElementById('cal-grid');
    const monthName = document.getElementById('month-name');
    const proFeatures = document.getElementById('pro-features');
    const publishBtn = document.getElementById('publish-btn');
    const basePriceInput = document.getElementById('base-price');
    const weekendMarkupInput = document.getElementById('weekend-markup');

    // === ПЕРЕКЛЮЧЕНИЕ РЕЖИМА ===
    document.getElementById('mode-simple').onclick = () => switchMode('simple');
    document.getElementById('mode-pro').onclick = () => switchMode('pro');

    function switchMode(newMode) {
        mode = newMode;
        document.getElementById('mode-simple').classList.toggle('active', mode === 'simple');
        document.getElementById('mode-pro').classList.toggle('active', mode === 'pro');
        proFeatures.style.display = mode === 'pro' ? 'block' : 'none';
        renderCalendar();
    }

    // === УМНЫЙ КАЛЕНДАРЬ ===
    function renderCalendar() {
        calGrid.innerHTML = '';
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
        monthName.innerText = `${monthNames[month]} ${year}`;

        // Заголовки дней
        ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].forEach(d => {
            const el = document.createElement('div');
            el.className = 'cal-day-name';
            el.innerText = d;
            calGrid.appendChild(el);
        });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const offset = firstDay === 0 ? 6 : firstDay - 1;

        for (let i = 0; i < offset; i++) calGrid.appendChild(document.createElement('div'));

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayOfWeek = new Date(year, month, d).getDay(); // 0-Вс, 5-Пт, 6-Сб
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

            const dayEl = document.createElement('div');
            dayEl.className = 'cal-day';
            
            // Расчет цены
            let price = parseInt(basePriceInput.value);
            if (mode === 'pro' && isWeekend) {
                price += Math.round(price * (parseInt(weekendMarkupInput.value) / 100));
            }

            // Статус
            const state = availability[dateStr] || { status: 'available', price: price };
            dayEl.classList.add(state.status);
            
            dayEl.innerHTML = `
                <span>${d}</span>
                <span class="cal-price-tag">${(price / 1000).toFixed(0)}k</span>
            `;

            dayEl.onclick = () => {
                toggleDateStatus(dateStr, state);
                renderCalendar();
            };

            calGrid.appendChild(dayEl);
        }
    }

    function toggleDateStatus(dateStr, currentState) {
        const newStatus = currentState.status === 'available' ? 'blocked' : 'available';
        availability[dateStr] = { ...currentState, status: newStatus };
    }

    document.getElementById('prev-month').onclick = () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); };
    document.getElementById('next-month').onclick = () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); };
    
    document.getElementById('open-all').onclick = () => { availability = {}; renderCalendar(); };
    document.getElementById('close-all').onclick = () => {
        // Логика блокировки всего месяца...
        alert('Месяц закрыт для бронирования');
    };

    // === ФОТО ===
    const fileInput = document.getElementById('file-input');
    fileInput.onchange = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                photos.push(ev.target.result);
                const img = document.createElement('img');
                img.src = ev.target.result;
                img.style = "width:100%; aspect-ratio:1; object-fit:cover; border-radius:20px; border:1px solid #eee;";
                document.getElementById('photo-grid').prepend(img);
                validateForm();
            };
            reader.readAsDataURL(file);
        });
    };

    // === КАРТЫ ===
    ymaps.ready(() => {
        myMap = new ymaps.Map("map-container", { center: [41.31, 69.24], zoom: 12, controls: [] });
        myMap.events.add('click', (e) => {
            selectedCoords = e.get('coords');
            if (myPlacemark) myPlacemark.geometry.setCoordinates(selectedCoords);
            else {
                myPlacemark = new ymaps.Placemark(selectedCoords, {}, { preset: 'islands#blueDotIcon', draggable: true });
                myMap.geoObjects.add(myPlacemark);
            }
        });
    });

    document.getElementById('map-picker-trigger').onclick = () => document.getElementById('map-modal').classList.add('active');
    document.getElementById('close-map').onclick = () => document.getElementById('map-modal').classList.remove('active');
    document.getElementById('confirm-map').onclick = () => {
        if (selectedCoords) {
            document.getElementById('loc-status').innerText = 'Локация подтверждена';
            document.getElementById('loc-coords').innerText = selectedCoords.map(c => c.toFixed(4)).join(', ');
            document.getElementById('map-modal').classList.remove('active');
            validateForm();
        }
    };

    // === ПУБЛИКАЦИЯ ===
    function validateForm() {
        const title = document.getElementById('title-input').value;
        publishBtn.disabled = !(title.length > 3 && photos.length > 0 && selectedCoords);
    }
    document.getElementById('title-input').oninput = validateForm;

    publishBtn.onclick = async () => {
        const randomCode = `#${Math.floor(1000 + Math.random() * 9000)}ADS`;
        const payload = {
            title: document.getElementById('title-input').value,
            ad_code: randomCode,
            coords: selectedCoords.join(','),
            image: photos[0],
            price: parseInt(basePriceInput.value),
            availability: availability, // PRO ДАННЫЕ
            mode: mode
        };
        
        console.log('Sending PRO payload:', payload);
        alert(`Опубликовано! Ваш код: ${randomCode}`);
        window.location.href = 'index.html';
    };

    // INIT
    renderCalendar();
});
