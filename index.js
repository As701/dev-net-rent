document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = window.DachaGoConfig?.apiUrl || 'http://localhost:5005/api/v1';
    
    // --- ELEMENTS ---
    const container = document.getElementById('listings-container');
    const displayName = document.getElementById('display-name');
    const searchTrigger = document.getElementById('main-search-trigger');
    const filterBtn = document.getElementById('filter-btn');
    const filterSheet = document.getElementById('filter-sheet');
    const filterOverlay = document.getElementById('modal-overlay');
    const filterFooter = document.getElementById('filter-footer');
    const regionSelect = document.getElementById('filter-region');
    const citySelect = document.getElementById('filter-city');
    const cityWrap = document.getElementById('filter-city-wrap');
    const priceMinInput = document.getElementById('price-min');
    const priceMaxInput = document.getElementById('price-max');
    const roomChips = document.querySelectorAll('#rooms-chips .chip');
    const amenityChips = document.querySelectorAll('#amenities-chips .chip');
    const typeItems = document.querySelectorAll('.type-toggle-item');
    const typeSlider = document.getElementById('type-slider');
    const categories = document.querySelectorAll('.category-item');

    const notifBtn = document.getElementById('notif-trigger');
    const notifModal = document.getElementById('notif-modal');
    const closeNotif = document.getElementById('close-notifications');
    const notifContentArea = document.getElementById('notif-content-area');
    const notifTabs = document.querySelectorAll('.notif-tab');
    const unreadBadge = document.getElementById('unread-count-badge');
    const headerNotifDot = document.getElementById('header-notif-dot');

    const searchModal = document.getElementById('search-modal');
    const modalSearchInput = document.getElementById('modal-search-input');
    const executeSearchBtn = document.getElementById('execute-search');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history');
    const closeSearchModalBtn = document.getElementById('close-search-modal');

    // --- STATE ---
    let allListings = [];
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    let searchHistory = JSON.parse(localStorage.getItem('search_history') || '[]');
    let selectedRooms = 'any';
    let selectedAmenities = [];
    let selectedType = 'rent';
    let currentNotifTab = 'unread';

    // --- MOCK DATA ---
    let notifications = JSON.parse(localStorage.getItem('dacha_notifs') || JSON.stringify([
        { id: 1, title: "Система", message: "Добро пожаловать в DachaGo! Пройдите верификацию для бронирования.", type: "info", time: "10:30", read: false, action: "verify.html" },
        { id: 2, title: "Торг", message: "Владелец виллы 'Royal' принял ваше предложение! Оплатите бронь в течение 10 минут.", type: "success", time: "Вчера", read: false, action: "bookings.html" }
    ]));

    const locationData = {
        "Ташкентская область": ["Ташкент", "Чарвак", "Чимган", "Бельдерсай", "Бричмулла", "Ходжикент", "Паркент", "Кибрай"],
        "Самаркандская область": ["Самарканд", "Ургут"],
        "Бухарская область": ["Бухара", "Гиждуван"]
    };

    const mockListings = [
        {
            id: "1", title: "Вилла 'Royal' с панорамным видом", location: "Чарвак, Ташкентская обл.", price: 2500000, type: "rent", category: "villas",
            image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80",
            is_bargaining_enabled: true, details: { beds: 5, baths: 3, capacity: 12, rooms: 5 }
        },
        {
            id: "2", title: "Уютная дача у леса", location: "Бочка, Ташкентская обл.", price: 1200000, type: "rent", category: "dachas",
            image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80",
            is_bargaining_enabled: false, details: { beds: 3, baths: 1, capacity: 8, rooms: 3 }
        }
    ];

    // --- INITIALIZATION ---
    function init() {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && displayName) displayName.innerText = user.name;
        
        if (regionSelect) {
            Object.keys(locationData).forEach(reg => {
                const opt = document.createElement('option');
                opt.value = reg; opt.textContent = reg;
                regionSelect.appendChild(opt);
            });
            regionSelect.onchange = () => {
                const reg = regionSelect.value;
                citySelect.innerHTML = '<option value="all">Все города</option>';
                if (reg !== 'all' && locationData[reg]) {
                    locationData[reg].forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c; opt.textContent = c;
                        citySelect.appendChild(opt);
                    });
                    cityWrap.style.display = 'flex';
                } else cityWrap.style.display = 'none';
            };
        }
        updateNotifBadges();
        fetchData();
    }

    async function fetchData() {
        try {
            const res = await fetch(`${API_URL}/listings`);
            if (res.ok) allListings = await res.json();
            else throw new Error();
        } catch (e) { allListings = mockListings; }
        applyFilters();
    }

    // --- FILTERS ---
    if (filterBtn) filterBtn.onclick = () => { 
        filterSheet.classList.add('active'); 
        filterOverlay.style.display = 'block'; 
        filterFooter.classList.add('active');
        document.body.classList.add('hide-nav'); 
    };
    
    if (filterOverlay) filterOverlay.onclick = () => { 
        filterSheet.classList.remove('active'); 
        filterOverlay.style.display = 'none'; 
        filterFooter.classList.remove('active');
        document.body.classList.remove('hide-nav'); 
    };

    document.getElementById('apply-advanced-filters').onclick = () => { applyFilters(); filterOverlay.click(); };
    document.getElementById('reset-filters').onclick = () => { window.location.reload(); };

    roomChips.forEach(chip => {
        chip.onclick = () => {
            roomChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedRooms = chip.dataset.rooms;
        };
    });

    amenityChips.forEach(chip => {
        chip.onclick = () => {
            const id = chip.dataset.id;
            const idx = selectedAmenities.indexOf(id);
            if (idx > -1) selectedAmenities.splice(idx, 1); else selectedAmenities.push(id);
            chip.classList.toggle('active');
        };
    });

    typeItems.forEach((item, index) => {
        item.onclick = () => {
            typeItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            if (typeSlider) typeSlider.style.transform = `translateX(${index * 100}%)`;
            selectedType = item.dataset.type;
            applyFilters();
        };
    });

    categories.forEach(cat => {
        cat.onclick = () => {
            categories.forEach(c => c.classList.remove('active'));
            cat.classList.add('active');
            applyFilters();
        };
    });

    function applyFilters() {
        const activeCat = document.querySelector('.category-item.active');
        const category = activeCat ? activeCat.dataset.category : 'all';
        const query = (modalSearchInput?.value || '').toLowerCase().trim();
        const minP = parseInt(priceMinInput?.value || 0) || 0;
        const maxP = parseInt(priceMaxInput?.value || Infinity) || Infinity;

        const filtered = allListings.filter(l => {
            const matchesType = l.type === selectedType;
            const matchesCat = category === 'all' || l.category === category;
            const matchesSearch = !query || l.title.toLowerCase().includes(query) || l.location.toLowerCase().includes(query);
            const matchesPrice = (l.price || 0) >= minP && (l.price || 0) <= maxP;
            let matchesRooms = true;
            if (selectedRooms !== 'any') {
                const r = l.rooms || l.details?.rooms || 0;
                if (selectedRooms === '4+') matchesRooms = r >= 4;
                else matchesRooms = r == selectedRooms;
            }
            return matchesType && matchesCat && matchesSearch && matchesPrice && matchesRooms;
        });
        renderListings(filtered);
    }

    function renderListings(items) {
        if (!container) return;
        if (items.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:50px; color:#9BA5B7;"><h3>Объявлений пока нет</h3></div>`;
            return;
        }
        container.innerHTML = items.map(item => {
            const isFav = favorites.includes(String(item.id));
            const details = typeof item.details === 'string' ? JSON.parse(item.details) : (item.details || {});
            const categoryLabel = { 'cottages': 'Коттедж', 'villas': 'Вилла', 'dachas': 'Дача' }[item.category] || 'Объект';
            
            return `
            <div class="property-card" onclick="window.location.href='details.html?id=${item.id}'">
                <div class="card-image-wrap">
                    <img src="${item.image}" class="card-img">
                    <div style="position: absolute; top: 15px; left: 15px; background: rgba(0,0,0,0.4); backdrop-filter: blur(10px); color: white; padding: 5px 12px; border-radius: 10px; font-size: 10px; font-weight: 800;">${categoryLabel}</div>
                    <button class="fav-btn" onclick="toggleFavorite(event, '${item.id}')">
                        <i class="${isFav ? 'fas' : 'far'} fa-heart" style="${isFav ? 'color: #EA5455;' : ''}"></i>
                    </button>
                    ${item.is_bargaining_enabled ? `<div style="position:absolute; bottom:15px; left:15px; background:white; color:#2599C8; padding:6px 12px; border-radius:10px; font-size:10px; font-weight:900; box-shadow:0 4px 10px rgba(0,0,0,0.1);"><i class="fas fa-comments-dollar"></i> ТОРГ ДОСТУПЕН</div>` : ''}
                </div>
                <div class="card-info">
                    <h3 class="card-title">${item.title}</h3>
                    <div style="color:#9BA5B7; font-size:12px; margin-bottom:15px;"><i class="fas fa-map-marker-alt"></i> ${item.location}</div>
                    <div class="card-features">
                        <div class="feat-item"><i class="fas fa-bed" style="color:var(--brand-blue)"></i> ${details.rooms || 0}</div>
                        <div class="feat-item"><i class="fas fa-users" style="color:var(--brand-blue)"></i> ${details.capacity || 0}</div>
                    </div>
                    <div class="card-bottom">
                        <div class="card-price">${(item.price || 0).toLocaleString()} <span>сум / сутки</span></div>
                        <div style="background:var(--soft-gray); color:var(--brand-blue); padding:10px 16px; border-radius:12px; font-size:12px; font-weight:800;">Подробнее</div>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    window.toggleFavorite = (e, id) => {
        e.stopPropagation();
        const strId = String(id);
        const idx = favorites.indexOf(strId);
        if (idx > -1) favorites.splice(idx, 1); else favorites.push(strId);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        applyFilters();
    };

    // --- NOTIFICATIONS ---
    function updateNotifBadges() {
        const unreadCount = notifications.filter(n => !n.read).length;
        if (unreadBadge) unreadBadge.innerText = unreadCount;
        if (headerNotifDot) headerNotifDot.classList.toggle('active', unreadCount > 0);
        localStorage.setItem('dacha_notifs', JSON.stringify(notifications));
    }

    if (notifBtn) notifBtn.onclick = () => { notifModal.classList.add('active'); document.body.classList.add('hide-nav'); renderNotifications(); };
    if (closeNotif) closeNotif.onclick = () => { notifModal.classList.remove('active'); document.body.classList.remove('hide-nav'); };

    notifTabs.forEach(tab => {
        tab.onclick = () => {
            notifTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentNotifTab = tab.dataset.notifTab;
            renderNotifications();
        };
    });

    function renderNotifications() {
        const filtered = notifications.filter(n => currentNotifTab === 'unread' ? !n.read : n.read);
        if (!notifContentArea) return;
        if (filtered.length === 0) {
            notifContentArea.innerHTML = `<div style="text-align:center; padding:50px; color:#9BA5B7;">История пуста</div>`;
            return;
        }
        notifContentArea.innerHTML = filtered.map(n => `
            <div class="notif-card ${!n.read ? 'unread' : ''}" onclick="openNotifDetail(${n.id})">
                <div class="notif-icon-box ${n.type === 'success' ? 'bg-green' : 'bg-blue'}"><i class="fas ${n.type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i></div>
                <div class="notif-info">
                    <div class="notif-head"><span class="notif-label">${n.title}</span><span class="notif-time">${n.time}</span></div>
                    <p class="notif-text">${n.message}</p>
                </div>
            </div>
        `).join('');
    }

    window.openNotifDetail = (id) => {
        const n = notifications.find(x => x.id === id);
        if (!n) return;
        n.read = true; updateNotifBadges(); renderNotifications();
        document.getElementById('detail-title').innerText = n.title;
        document.getElementById('detail-body').innerText = n.message;
        const iconBox = document.getElementById('detail-icon-box');
        iconBox.className = `notif-icon-box ${n.type === 'success' ? 'bg-green' : 'bg-blue'}`;
        iconBox.innerHTML = `<i class="fas ${n.type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>`;
        document.getElementById('detail-footer').innerHTML = n.action ? `<button class="apply-btn" onclick="window.location.href='${n.action}'">Перейти к действию</button>` : '';
        document.getElementById('notif-detail-overlay').style.display = 'block';
        document.getElementById('notif-detail-sheet').classList.add('active');
    };

    window.closeNotifDetail = () => {
        document.getElementById('notif-detail-overlay').style.display = 'none';
        document.getElementById('notif-detail-sheet').classList.remove('active');
    };
    document.getElementById('notif-detail-overlay').onclick = window.closeNotifDetail;

    // --- SEARCH ---
    if (searchTrigger) searchTrigger.onclick = () => { searchModal.style.display = 'flex'; modalSearchInput.focus(); renderHistory(); };
    if (closeSearchModalBtn) closeSearchModalBtn.onclick = () => { searchModal.style.display = 'none'; };
    if (executeSearchBtn) executeSearchBtn.onclick = () => {
        const q = modalSearchInput.value.trim();
        if (q) {
            searchHistory = [q, ...searchHistory.filter(h => h !== q)].slice(0, 5);
            localStorage.setItem('search_history', JSON.stringify(searchHistory));
            applyFilters();
            document.getElementById('search-results-section').style.display = 'block';
            document.getElementById('search-history-section').style.display = 'none';
        }
    };

    function renderHistory() {
        if (searchHistory.length === 0) { document.getElementById('search-history-section').style.display = 'none'; return; }
        document.getElementById('search-history-section').style.display = 'block';
        historyList.innerHTML = searchHistory.map(h => `<div class="history-chip" onclick="modalSearchInput.value='${h}'; executeSearchBtn.click();"><i class="fas fa-history"></i><span>${h}</span></div>`).join('');
    }

    if (clearHistoryBtn) clearHistoryBtn.onclick = () => { searchHistory = []; localStorage.setItem('search_history', '[]'); renderHistory(); };

    init();
});
