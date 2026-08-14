document.addEventListener('DOMContentLoaded', async () => {
    console.log("Details script initialized...");
    
    const urlParams = new URLSearchParams(window.location.search);
    const listingId = urlParams.get('id');
    const API_URL = window.DachaGoConfig?.apiUrl || 'https://dev-net-rent.onrender.com/api/v1';

    if (!listingId) { 
        console.error("No ID found in URL, redirecting...");
        window.location.href = 'index.html'; 
        return; 
    }

    const state = {
        item: null,
        selectedDates: [],
        currentMonth: new Date().getMonth(),
        currentYear: new Date().getFullYear(),
        proposedPrice: 0,
        baseTotal: 0
    };

    // --- ELEMENTS ---
    const getEl = (id) => document.getElementById(id);
    const elements = {
        loading: getEl('loading-screen'),
        slider: getEl('slider-wrapper'),
        title: getEl('title'),
        location: getEl('location')?.querySelector('span'),
        ownerAvatar: getEl('owner-avatar'),
        ownerName: getEl('owner-name'),
        description: getEl('description'),
        charsRow: getEl('chars-row'),
        amenitiesGrid: getEl('amenities-grid'),
        rulesFlex: getEl('rules-flex'),
        calendarGrid: getEl('calendar-grid'),
        monthLabel: getEl('cal-month-label'),
        priceSummary: getEl('price-summary'),
        bargainModal: getEl('bargain-modal'),
        modalOverlay: getEl('modal-overlay'),
        bargainSlider: getEl('bargain-slider'),
        proposedPriceLabel: getEl('proposed-price-label'),
        priceDiffLabel: getEl('price-diff-label')
    };

    // --- MOCK DATA ---
    const mockListings = [
        {
            id: "1", title: "Вилла 'Royal' с панорамным видом", location: "Чарвак, Ташкентская обл.", price: 2500000, type: "rent", category: "villas",
            image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80",
            photos: [
                "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
            ],
            is_bargaining_enabled: true, 
            description: "Шикарная вилла с видом на Чарвакское водохранилище. Идеально для больших компаний и семейного отдыха.",
            details: { beds: 5, baths: 3, capacity: 12, area: 450 },
            amenities: "pool,sauna,wifi,ac,tv,kitchen",
            rules: "no_alcohol,families_only",
            calendar: "{}"
        },
        {
            id: "2", title: "Уютная дача у леса", location: "Бочка, Ташкентская обл.", price: 1200000, type: "rent", category: "dachas",
            image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80",
            photos: ["https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80"],
            is_bargaining_enabled: false, 
            description: "Тихое место для спокойного отдыха. Мангал, свежий воздух и комфортные условия.",
            details: { beds: 3, baths: 1, capacity: 8, area: 120 },
            amenities: "grill,wifi,kitchen",
            rules: "no_parties",
            calendar: "{}"
        }
    ];

    async function loadData() {
        console.log("Loading data for ID:", listingId);
        try {
            const res = await fetch(`${API_URL}/listings`);
            if (res.ok) {
                const listings = await res.json();
                state.item = listings.find(l => String(l.id) === String(listingId));
            }
        } catch (e) {
            console.warn("API Error, using mock data...");
        }

        if (!state.item) {
            state.item = mockListings.find(l => String(l.id) === String(listingId));
        }

        if (!state.item) {
            console.error("Listing not found!");
            alert("Объявление не найдено");
            window.location.href = 'index.html';
            return;
        }

        try {
            renderUI();
        } catch (err) {
            console.error("Render error:", err);
        } finally {
            if (elements.loading) elements.loading.style.display = 'none';
        }
    }

    function renderUI() {
        const item = state.item;
        
        // 1. Photos
        if (elements.slider) {
            const photos = item.photos || [item.image];
            elements.slider.innerHTML = photos.map(p => `<div class="swiper-slide"><img src="${p}" style="width:100%; height:100%; object-fit:cover;"></div>`).join('');
            
            // Safe Swiper init
            if (typeof Swiper !== 'undefined') {
                new Swiper('.swiper', { pagination: { el: '.swiper-pagination', clickable: true } });
            } else {
                console.warn("Swiper not loaded, using static layout");
                elements.slider.style.display = 'block';
                elements.slider.style.overflowX = 'auto';
            }
        }

        // 2. Text Content
        if (elements.title) elements.title.innerText = item.title;
        if (elements.location) elements.location.innerText = item.location;
        if (elements.ownerName) elements.ownerName.innerText = item.owner_name || 'Верифицированный владелец';
        if (elements.description) elements.description.innerText = item.description;
        if (elements.ownerAvatar) elements.ownerAvatar.src = item.owner_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.owner_id || 'owner'}`;

        // 3. Characteristics
        if (elements.charsRow) {
            const d = typeof item.details === 'string' ? JSON.parse(item.details) : (item.details || {});
            elements.charsRow.innerHTML = `
                <div class="char-pill"><i class="fas fa-bed"></i><span>${d.beds || 0} спальни</span></div>
                <div class="char-pill"><i class="fas fa-bath"></i><span>${d.baths || 0} санузла</span></div>
                <div class="char-pill"><i class="fas fa-vector-square"></i><span>${d.area || 0} м²</span></div>
                <div class="char-pill"><i class="fas fa-users"></i><span>до ${d.capacity || 0} чел.</span></div>
            `;
        }

        // 4. Amenities
        if (elements.amenitiesGrid) {
            const amens = item.amenities ? (typeof item.amenities === 'string' ? item.amenities.split(',') : item.amenities) : [];
            const allA = [
                {id:'pool', icon:'fa-swimming-pool', label:'Бассейн'},
                {id:'sauna', icon:'fa-hot-tub', label:'Сауна'},
                {id:'wifi', icon:'fa-wifi', label:'Wi-Fi'},
                {id:'ac', icon:'fa-snowflake', label:'Конд-р'}
            ];
            elements.amenitiesGrid.innerHTML = allA.map(a => `
                <div class="amenity-box ${amens.includes(a.id) ? 'active' : ''}" style="text-align:center;">
                    <div class="amenity-icon" style="font-size:20px; margin-bottom:5px;"><i class="fas ${a.icon}"></i></div>
                    <span style="font-size:10px;">${a.label}</span>
                </div>
            `).join('');
        }

        renderCalendar();
    }

    function renderCalendar() {
        if (!elements.calendarGrid) return;
        const date = new Date(state.currentYear, state.currentMonth, 1);
        elements.monthLabel.innerText = date.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
        
        elements.calendarGrid.innerHTML = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => `<div class="cal-day-label" style="text-align:center; font-weight:800; font-size:10px;">${d}</div>`).join('');
        
        const firstDayIndex = (new Date(state.currentYear, state.currentMonth, 1).getDay() + 6) % 7;
        const lastDay = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();

        for (let i = 0; i < firstDayIndex; i++) elements.calendarGrid.innerHTML += '<div></div>';

        const busyDates = state.item.calendar ? (typeof state.item.calendar === 'string' ? JSON.parse(state.item.calendar) : state.item.calendar) : {};

        for (let d = 1; d <= lastDay; d++) {
            const dateStr = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const isBusy = busyDates[dateStr] && busyDates[dateStr].status === 'busy';
            const isSelected = state.selectedDates.includes(dateStr);

            const dayEl = document.createElement('div');
            dayEl.className = `cal-day ${isBusy ? 'busy' : ''} ${isSelected ? 'selected' : ''}`;
            dayEl.style.cssText = "height:40px; display:flex; align-items:center; justify-content:center; font-weight:700; border-radius:10px; cursor:pointer;";
            if (isSelected) dayEl.style.background = "#2599C8"; if (isSelected) dayEl.style.color = "white";
            if (isBusy) dayEl.style.opacity = "0.2";
            
            dayEl.innerText = d;
            if (!isBusy) dayEl.onclick = () => {
                const idx = state.selectedDates.indexOf(dateStr);
                if (idx > -1) state.selectedDates.splice(idx, 1); else state.selectedDates.push(dateStr);
                renderCalendar();
            };
            elements.calendarGrid.appendChild(dayEl);
        }
    }

    // --- FORCED TIMEOUT ---
    setTimeout(() => {
        if (elements.loading && elements.loading.style.display !== 'none') {
            console.warn("Loading screen forced to close due to timeout.");
            elements.loading.style.display = 'none';
        }
    }, 3000);

    loadData();
});
