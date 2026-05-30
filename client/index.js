document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = window.DachaGoConfig?.apiUrl || 'https://dev-net-rent.onrender.com/api';
    
    // --- ELEMENTS ---
    const displayName = document.getElementById('display-name');
    const container = document.getElementById('listings-container');
    const searchInput = document.getElementById('search-input');
    const categories = document.querySelectorAll('.category-item');
    const filterBtn = document.querySelector('.filter-btn');

    const filterSheet = document.getElementById('filter-sheet');
    const filterOverlay = document.getElementById('modal-overlay');
    const filterFooter = document.querySelector('.filter-footer');
    const regionSelect = document.getElementById('filter-region');
    const citySelect = document.getElementById('filter-city');
    const cityWrap = document.getElementById('filter-city-wrap');
    const priceMinInput = document.getElementById('price-min');
    const priceMaxInput = document.getElementById('price-max');

    const roomChips = document.querySelectorAll('#rooms-chips .chip');
    const amenityChips = document.querySelectorAll('#amenities-chips .chip');  
    const typeItems = document.querySelectorAll('.type-toggle-item');
    const typeSlider = document.getElementById('type-slider');

    const notifBtn = document.getElementById('notif-trigger');
    const notifModal = document.getElementById('notif-modal');
    const closeNotif = document.getElementById('close-notifications');
    const notifContentArea = document.getElementById('notif-content-area');    
    const headerNotifDot = document.getElementById('header-notif-dot');        

    const locationData = {
        "Ташкентская область": ["Ташкент", "Чарвак", "Чимган", "Бельдерсай", "Бричмулла", "Ходжикент", "Паркент", "Кибрай"],
        "Самаркандская область": ["Самарканд", "Ургут"],
        "Бухарская область": ["Бухара", "Гиждуван"],
        "Ферганская область": ["Фергана", "Коканд"],
        "Хорезмская область": ["Ургенч", "Хива"]
    };

    let allListings = [];
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');     
    let savedFilters = JSON.parse(localStorage.getItem('active_filters') || '{"min":"","max":"","type":"rent","region":"all","city":"all","rooms":"any","amenities":[]}');
    let selectedRooms = savedFilters.rooms || 'any';
    let selectedAmenities = savedFilters.amenities || [];
    let selectedType = savedFilters.type;

    const getUser = () => JSON.parse(localStorage.getItem('user'));

    function updateGreeting() {
        const user = getUser();
        if (user) {
            if (displayName) displayName.innerText = user.name || 'Пользователь';
            if (headerNotifDot) headerNotifDot.classList.add('active');        
        } else {
            if (displayName) displayName.innerHTML = '<a href="auth.html" style="text-decoration:none; color:var(--text-light);">Войти</a>';
            if (headerNotifDot) headerNotifDot.classList.remove('active');     
        }
    }

    function showNotifications() {
        if (!notifModal || !notifContentArea) return;
        notifModal.style.display = 'flex'; document.body.classList.add('hide-nav');
        const user = getUser();
        if (!user) {
            notifContentArea.innerHTML = `
                <div class="guest-state">
                    <i class="fas fa-lock"></i>
                    <h3>Уведомления доступны только авторизованным пользователям</h3>
                    <p>Войдите в аккаунт, чтобы просматривать историю оповещений и ответов на запросы.</p>
                    <a href="auth.html" class="login-btn-pro">Войти в профиль</a>
                </div>`;
            return;
        }
        renderNotificationList();
    }

    if (notifBtn) notifBtn.onclick = showNotifications;
    if (closeNotif) closeNotif.onclick = () => { notifModal.style.display = 'none'; document.body.classList.remove('hide-nav'); };

    const navMessages = document.getElementById('nav-messages');
    if (navMessages) {
        navMessages.onclick = (e) => {
            if (!getUser()) {
                e.preventDefault();
                alert('Пожалуйста, войдите в аккаунт для просмотра сообщений');
                window.location.href = 'auth.html';
            }
        };
    }

    if (regionSelect) {
        Object.keys(locationData).forEach(reg => {
            const opt = document.createElement('option');
            opt.value = reg; opt.textContent = reg;
            regionSelect.appendChild(opt);
        });
        regionSelect.onchange = () => {
            const reg = regionSelect.value;
            if (citySelect) {
                citySelect.innerHTML = '<option value="all">Все города</option>';
                if (reg !== 'all' && locationData[reg]) {
                    locationData[reg].forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c; opt.textContent = c;
                        citySelect.appendChild(opt);
                    });
                    if (cityWrap) cityWrap.style.display = 'flex';
                } else if (cityWrap) cityWrap.style.display = 'none';
            }
        };
    }

    function applySavedToUI() {
        if (priceMinInput) priceMinInput.value = savedFilters.min;
        if (priceMaxInput) priceMaxInput.value = savedFilters.max;
        if (regionSelect) {
            regionSelect.value = savedFilters.region;
            regionSelect.onchange();
            if (citySelect) citySelect.value = savedFilters.city;
        }
        roomChips.forEach(c => c.classList.toggle('active', c.dataset.rooms === selectedRooms));
        amenityChips.forEach(c => c.classList.toggle('active', selectedAmenities.includes(c.dataset.id)));
        typeItems.forEach((item, index) => {
            if (item.dataset.type === selectedType) {
                item.classList.add('active');
                if (typeSlider) typeSlider.style.transform = `translateX(${index * 100}%)`;
            } else item.classList.remove('active');
        });
    }

    function saveCurrentFilters() {
        const filters = {
            min: priceMinInput ? priceMinInput.value : "",
            max: priceMaxInput ? priceMaxInput.value : "",
            type: selectedType,
            region: regionSelect ? regionSelect.value : "all",
            city: citySelect ? citySelect.value : "all",
            rooms: selectedRooms,
            amenities: selectedAmenities
        };
        localStorage.setItem('active_filters', JSON.stringify(filters));       
    }

    if (filterBtn) {
        filterBtn.onclick = () => {
            filterSheet.style.display = 'flex'; document.body.classList.add('hide-nav');
            setTimeout(() => {
                filterSheet.classList.add('active');
                filterFooter.classList.add('active');
                filterOverlay.style.display = 'block';
            }, 10);
        };
    }

    const closeFilters = () => {
        filterSheet.classList.remove('active');
        filterFooter.classList.remove('active');
        setTimeout(() => { filterSheet.style.display = 'none'; filterOverlay.style.display = 'none'; document.body.classList.remove('hide-nav'); }, 400);     
    };

    if (filterOverlay) filterOverlay.onclick = closeFilters;
    document.getElementById('reset-filters').onclick = () => { localStorage.removeItem('active_filters'); window.location.reload(); };
    document.getElementById('apply-advanced-filters').onclick = () => { saveCurrentFilters(); applyFilters(); closeFilters(); };

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
            const index = selectedAmenities.indexOf(id);
            if (index > -1) selectedAmenities.splice(index, 1);
            else selectedAmenities.push(id);
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

    if (searchInput) searchInput.oninput = () => applyFilters();

    function applyFilters() {
        const activeCat = document.querySelector('.category-item.active');     
        const category = activeCat ? activeCat.dataset.category : 'all';       
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const minP = parseInt(priceMinInput ? priceMinInput.value : 0) || 0;   
        const maxP = parseInt(priceMaxInput ? priceMaxInput.value : Infinity) || Infinity;
        saveCurrentFilters();

        const filtered = allListings.filter(l => {
            const matchesType = l.type === selectedType;
            const matchesCat = category === 'all' || l.category === category;  
            const matchesSearch = !query || l.title.toLowerCase().includes(query) || l.location.toLowerCase().includes(query);
            const matchesPrice = (l.price || 0) >= minP && (l.price || 0) <= maxP;
            let matchesRooms = true;
            if (selectedRooms !== 'any') {
                if (selectedRooms === '4+') matchesRooms = (l.rooms || 0) >= 4;
                else matchesRooms = (l.rooms || 0) == selectedRooms;
            }
            let matchesLoc = true;
            if (regionSelect && regionSelect.value !== 'all') {
                matchesLoc = l.location.includes(regionSelect.value);
                if (citySelect && citySelect.value !== 'all') matchesLoc = matchesLoc && l.location.includes(citySelect.value);
            }
            let matchesAmenities = true;
            if (selectedAmenities.length > 0) {
                const itemAmenities = l.amenities ? (typeof l.amenities === 'string' ? JSON.parse(l.amenities) : l.amenities) : [];
                matchesAmenities = selectedAmenities.every(a => itemAmenities.includes(a));
            }
            return matchesType && matchesCat && matchesSearch && matchesPrice && matchesRooms && matchesLoc && matchesAmenities;
        });
        renderListings(filtered);
    }

    function renderListings(items) {
        if (!container) return;
        if (items.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:60px; color:var(--text-light);"><p>Объявления не найдены</p></div>';
            return;
        }
        container.innerHTML = items.map(item => {
            const isFav = favorites.includes(String(item.id));
            return `
            <div class="property-card" onclick="window.location.href='details.html?id=${item.id}'">
                <div class="card-image-wrap">
                    <img src="${item.image}" class="card-img">
                    <button class="fav-btn" onclick="toggleFavorite(event, '${item.id}')"><i class="${isFav ? 'fas' : 'far'} fa-heart"></i></button>
                </div>
                <div class="card-info">
                    <h3 class="card-title">${item.title}</h3>
                    <div class="card-loc"><i class="fas fa-map-marker-alt" style="color:var(--brand-blue)"></i> ${item.location}</div>
                    <div class="card-features">
                        <div class="feat-item"><i class="fas fa-bed" style="color:var(--brand-blue)"></i> ${item.rooms || 0}</div>
                        <div class="feat-item"><i class="fas fa-users" style="color:var(--brand-blue)"></i> ${item.capacity || 0}</div>
                    </div>
                    <div class="card-bottom">
                        <div class="card-price">${(item.price || 0).toLocaleString()} <span>сум/${item.type === 'rent' ? 'сут.' : 'объект'}</span></div>      
                        <div style="background:var(--soft-gray); color:var(--brand-blue); padding:10px 16px; border-radius:12px; font-size:12px; font-weight:800;">Подробнее</div>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    window.toggleFavorite = (event, id) => {
        event.stopPropagation();
        const strId = String(id);
        const index = favorites.indexOf(strId);
        if (index > -1) favorites.splice(index, 1);
        else favorites.push(strId);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        document.querySelectorAll(`.fav-btn[onclick*="'${id}'"] i`).forEach(icon => {
            icon.classList.toggle('fas', favorites.includes(strId));
            icon.classList.toggle('far', !favorites.includes(strId));
        });
    };

    async function init() {
        updateGreeting();
        applySavedToUI();
        try {
            const res = await fetch(`${API_URL}/listings`);
            if (res.ok) { allListings = await res.json(); applyFilters(); }    
        } catch (e) { console.error("Fetch Error:", e); }
    }
    init();

    const notifSheet = document.getElementById('notification-bottom-sheet');   
    const notifOverlay = document.getElementById('notif-sheet-overlay');       
    const sheetIcon = document.getElementById('sheet-icon');
    const sheetTitle = document.getElementById('sheet-title');
    const sheetTime = document.getElementById('sheet-time');
    const sheetBody = document.getElementById('sheet-body');

    window.openNotificationDetails = (id) => {
        const notif = mockNotifications.find(n => n.id === id);
        if (!notif) return;
        sheetIcon.innerHTML = `<i class="${notif.icon}"></i>`;
        sheetIcon.className = `notif-icon-wrap ${notif.iconClass}`;
        sheetTitle.innerText = notif.title;
        sheetTime.innerText = notif.time;
        sheetBody.innerText = notif.fullText || notif.desc;
        notifOverlay.classList.add('active');
        setTimeout(() => notifSheet.classList.add('active'), 10);
        const item = document.querySelector(`.notif-item[data-id="${id}"]`);   
        if (item) { item.classList.remove('unread'); const dot = item.querySelector('.unread-dot'); if (dot) dot.remove(); }
    };

    window.closeNotificationSheet = () => {
        notifSheet.classList.remove('active');
        setTimeout(() => notifOverlay.classList.remove('active'), 300);        
    };
    if (notifOverlay) notifOverlay.onclick = closeNotificationSheet;

    const mockNotifications = [
        { id: 1, title: "Добро пожаловать в DachaGo!", desc: "Начните поиск вашей идеальной дачи прямо сейчас.", fullText: "Мы рады приветствовать вас! DachaGo - это удобный сервис для поиска и аренды лучших загородных домов.", time: "Только что", icon: "fas fa-sparkles", iconClass: "bg-blue", unread: true },
        { id: 2, title: "Аккаунт подтвержден", desc: "Ваш профиль успешно прошел верификацию.", fullText: "Поздравляем! Ваш аккаунт был успешно проверен модераторами.", time: "1 час назад", icon: "fas fa-check-circle", iconClass: "bg-green", unread: false }
    ];

    function renderNotificationList() {
        if (!notifContentArea) return;
        notifContentArea.innerHTML = `<div style="padding:24px 20px 12px; border-bottom:1px solid var(--border-color);"><h4 style="margin:0; font-size:12px; font-weight:900; color:var(--text-light); text-transform:uppercase; letter-spacing:1px;">Сегодня</h4></div>` + 
            mockNotifications.map(n => `<div class="notif-item ${n.unread ? 'unread' : ''}" data-id="${n.id}" onclick="openNotificationDetails(${n.id})"><div class="notif-icon-wrap ${n.iconClass}"><i class="${n.icon}"></i></div><div class="notif-content"><div class="notif-item-title"><span>${n.title}</span><span class="notif-time">${n.time}</span></div><p class="notif-desc">${n.desc}</p></div>${n.unread ? '<div class="unread-dot"></div>' : ''}</div>`).join('');
    }

    // --- SMART SEARCH (CLEAN & STABLE) ---
    const searchModal = document.getElementById('search-modal');
    const modalSearchInput = document.getElementById('modal-search-input');    
    const executeSearchBtn = document.getElementById('execute-search');        
    const historySection = document.getElementById('search-history-section');  
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history');
    const closeSearchModalBtn = document.getElementById('close-search-modal'); 
    const mainSearchBar = document.querySelector('.search-bar');
    const mainSearchInput = document.getElementById('search-input');
    const resultsSection = document.getElementById('search-results-section');  
    const modalListingsContainer = document.getElementById('modal-listings-container');
    const modalFilterBtn = document.getElementById('modal-filter-trigger');    
    const modalLocationBtn = document.getElementById('modal-location-btn');    

    let searchHistory = JSON.parse(localStorage.getItem('search_history') || '[]');

    function openSearchModal() {
        if (!searchModal) return;
        searchModal.style.display = 'flex'; document.body.classList.add('search-active');
        if (!modalSearchInput.value.trim()) showFrame('history');
        else showFrame('results');
        setTimeout(() => { searchModal.classList.add('active'); if (modalSearchInput) modalSearchInput.focus(); }, 10);
        renderHistory();
    }

    function showFrame(frameName) {
        if (!historySection || !resultsSection) return;
        if (frameName === 'history') {
            resultsSection.style.display = 'none';
            if (searchHistory.length > 0) { historySection.style.display = 'block'; historySection.classList.add('frame-slide-in'); }
            else historySection.style.display = 'none';
        } else {
            historySection.style.display = 'none';
            resultsSection.style.display = 'block';
            resultsSection.classList.add('frame-slide-in');
            setTimeout(() => resultsSection.classList.remove('frame-slide-in'), 400);
        }
    }

    function renderHistory() {
        if (!historyList) return;
        if (searchHistory.length === 0) {
            if (historySection) historySection.style.display = 'none';
            historyList.innerHTML = '';
            return;
        }
        if (historySection) historySection.style.display = 'block';
        historyList.innerHTML = searchHistory.map(item => `<div class="history-chip" onclick="useHistoryItem('${item.replace(/'/g, "\\'")}')"><i class="fas fa-history"></i><span>${item}</span></div>`).join('');
    }

    function closeSearchModal() {
        if (!searchModal) return;
        searchModal.classList.remove('active');
        if (mainSearchInput) mainSearchInput.value = '';
        if (modalSearchInput) modalSearchInput.value = '';
        applyFilters();
        setTimeout(() => { searchModal.style.display = 'none'; document.body.classList.remove('search-active'); }, 300);
    }

    window.useHistoryItem = (query) => {
        if (modalSearchInput) modalSearchInput.value = query;
        performSearch(query);
    };

    function performSearch(query) {
        if (!query || !query.trim()) { showFrame('history'); return; }
        const q = query.trim();
        searchHistory = searchHistory.filter(h => h.toLowerCase() !== q.toLowerCase());
        searchHistory.unshift(q);
        if (searchHistory.length > 10) searchHistory.pop();
        localStorage.setItem('search_history', JSON.stringify(searchHistory));
        if (mainSearchInput) mainSearchInput.value = q;
        applyFilters();
        showModalResults(q);
    }

    function showModalResults(query) {
        if (!modalListingsContainer) return;
        showFrame('results');
        const q = query.toLowerCase();
        const filtered = allListings.filter(l => {
            const matchesType = l.type === selectedType;
            return l.title.toLowerCase().includes(q) || l.location.toLowerCase().includes(q);
        });
        modalListingsContainer.innerHTML = filtered.length === 0 ? '<div style="text-align:center; padding:60px; color:var(--text-light);"><p>Ничего не найдено</p></div>' : 
            filtered.map(item => `<div class="property-card" onclick="window.location.href='details.html?id=${item.id}'"><div class="card-image-wrap"><img src="${item.image}" class="card-img"><button class="fav-btn" onclick="toggleFavorite(event, '${item.id}')"><i class="${favorites.includes(String(item.id)) ? 'fas' : 'far'} fa-heart"></i></button></div><div class="card-info"><h3 class="card-title" style="font-size:16px;">${item.title}</h3><div class="card-loc" style="font-size:12px;"><i class="fas fa-map-marker-alt" style="color:var(--brand-blue)"></i> ${item.location}</div><div class="card-bottom"><div class="card-price" style="font-size:18px;">${(item.price || 0).toLocaleString()} <span>сум</span></div></div></div></div>`).join('');
    }

    if (modalFilterBtn) modalFilterBtn.onclick = () => { if (filterBtn) filterBtn.click(); };
    if (modalLocationBtn) modalLocationBtn.onclick = () => { if (filterBtn) filterBtn.click(); setTimeout(() => { if (regionSelect) regionSelect.focus(); }, 500); };
    if (modalSearchInput) modalSearchInput.oninput = (e) => { if (!e.target.value.trim()) { showFrame('history'); renderHistory(); } };
    if (mainSearchBar) mainSearchBar.addEventListener('click', (e) => { if (e.target.id !== 'search-input') openSearchModal(); });
    if (mainSearchInput) { mainSearchInput.addEventListener('mousedown', (e) => { e.preventDefault(); openSearchModal(); }); mainSearchInput.addEventListener('focus', (e) => { e.preventDefault(); mainSearchInput.blur(); openSearchModal(); }); }
    if (executeSearchBtn) executeSearchBtn.onclick = () => performSearch(modalSearchInput.value);
    if (modalSearchInput) modalSearchInput.onkeypress = (e) => { if (e.key === 'Enter') performSearch(modalSearchInput.value); };
    if (clearHistoryBtn) clearHistoryBtn.onclick = () => { searchHistory = []; localStorage.setItem('search_history', '[]'); if (historySection) historySection.style.display = 'none'; if (historyList) historyList.innerHTML = ''; };
    if (closeSearchModalBtn) closeSearchModalBtn.onclick = closeSearchModal;

});