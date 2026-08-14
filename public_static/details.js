document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const listingId = urlParams.get('id');

    if (!listingId) {
        window.location.href = 'index.html';
        return;
    }

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
        chatBtn: document.getElementById('chat-action-btn'),
        bookBtn: document.getElementById('book-action-btn')
    };

    // Robust mapping for both IDs and Russian names from create.html
    const amenityIcons = {
        'pool': { icon: 'fa-swimming-pool', label: 'Бассейн' },
        'Бассейн': { icon: 'fa-swimming-pool', label: 'Бассейн' },
        
        'sauna': { icon: 'fa-hot-tub', label: 'Сауна/Баня' },
        'Сауна/Баня': { icon: 'fa-hot-tub', label: 'Сауна/Баня' },
        'Сауна': { icon: 'fa-hot-tub', label: 'Сауна/Баня' },
        
        'wifi': { icon: 'fa-wifi', label: 'Wi-Fi' },
        'Wi-Fi': { icon: 'fa-wifi', label: 'Wi-Fi' },
        
        'ac': { icon: 'fa-snowflake', label: 'Конд-р' },
        'Конд-р': { icon: 'fa-snowflake', label: 'Конд-р' },
        'Кондиционер': { icon: 'fa-snowflake', label: 'Конд-р' },
        
        'tv': { icon: 'fa-tv', label: 'ТВ' },
        'ТВ': { icon: 'fa-tv', label: 'ТВ' },
        
        'kitchen': { icon: 'fa-utensils', label: 'Кухня' },
        'Кухня': { icon: 'fa-utensils', label: 'Кухня' },
        
        'wash': { icon: 'fa-soap', label: 'Стирка' },
        'Стирка': { icon: 'fa-soap', label: 'Стирка' },
        
        'grill': { icon: 'fa-fire', label: 'Мангал' },
        'Мангал': { icon: 'fa-fire', label: 'Мангал' },
        
        'billiards': { icon: 'fa-circle', label: 'Бильярд' },
        'Бильярд': { icon: 'fa-circle', label: 'Бильярд' },
        
        'tennis': { icon: 'fa-table-tennis-paddle-ball', label: 'Теннис' },
        'Теннис': { icon: 'fa-table-tennis-paddle-ball', label: 'Теннис' },
        
        'karaoke': { icon: 'fa-microphone', label: 'Караоке' },
        'Караоке': { icon: 'fa-microphone', label: 'Караоке' },
        
        'ps': { icon: 'fa-gamepad', label: 'Play Station' },
        'Play Station': { icon: 'fa-gamepad', label: 'Play Station' },
        
        'bowling': { icon: 'fa-bowling-ball', label: 'Боулинг' },
        'Боулинг': { icon: 'fa-bowling-ball', label: 'Боулинг' },
        
        'cinema': { icon: 'fa-film', label: 'Кино' },
        'Кино': { icon: 'fa-film', label: 'Кино' }
    };

    function renderAmenities(amenitiesJson) {
        if (!elements.amenities) return;
        
        let list = [];
        try {
            if (typeof amenitiesJson === 'string') {
                if (amenitiesJson.startsWith('[') || amenitiesJson.startsWith('{')) {
                    list = JSON.parse(amenitiesJson);
                } else {
                    list = amenitiesJson.split(',').map(s => s.trim());
                }
            } else {
                list = amenitiesJson || [];
            }
        } catch(e) { list = []; }

        if (!list || list.length === 0) {
            elements.amenities.innerHTML = '<p style="color:var(--text-light); font-size:12px;">Удобства не указаны</p>';
            return;
        }

        elements.amenities.innerHTML = list.map(id => {
            const info = amenityIcons[id] || { icon: 'fa-check-circle', label: id };
            return `
                <div class="amenity-item active">
                    <i class="fas ${info.icon}"></i>
                    <span>${info.label}</span>
                    <div class="check-badge">✓</div>
                </div>
            `;
        }).join('');
    }

    try {
        const API_URL = window.DachaGoConfig?.apiUrl || 'https://dev-net-rent.onrender.com/api/v1';
        const response = await fetch(`${API_URL}/listings`);
        const listings = await response.json();
        const item = listings.find(l => String(l.id) === String(listingId));   

        if (!item) {
            alert('Объявление не найдено');
            window.location.href = 'index.html';
            return;
        }

        // POPULATE UI
        if (elements.galleryImg) elements.galleryImg.src = item.image || 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80';
        if (elements.title) elements.title.innerText = item.title;
        if (elements.location) elements.location.innerText = item.location;
        if (elements.id) elements.id.innerText = `ID: DG-${item.id.toString().padStart(3, '0')}`;

        const priceFormatted = (item.price || 0).toLocaleString();
        if (elements.price) {
            if (item.type === 'sale') {
                elements.price.innerHTML = `${priceFormatted} сум <span>всего</span>`;
                if (elements.bookBtn) elements.bookBtn.innerText = 'Купить объект';
            } else {
                elements.price.innerHTML = `${priceFormatted} сум <span>/сутки</span>`;
                if (elements.bookBtn) elements.bookBtn.innerText = 'Забронировать';
            }
        }

        if (elements.beds) elements.beds.innerText = item.rooms || '-';
        if (elements.baths) elements.baths.innerText = item.bathrooms || '1';
        if (elements.area) elements.area.innerText = item.area || '-';
        if (elements.capacity) elements.capacity.innerText = item.capacity || '-';
        if (elements.description) elements.description.innerText = item.description || 'Описание не предоставлено.';
        
        renderAmenities(item.amenities);

        if (elements.ownerName) elements.ownerName.innerText = item.owner_name || 'Владелец';

        // Favorite State
        let favorites = JSON.parse(localStorage.getItem('favorites') || '[]'); 
        if (elements.favBtn) {
            if (favorites.includes(String(item.id))) {
                elements.favBtn.classList.add('active');
                elements.favBtn.querySelector('i').className = 'fas fa-heart';     
            }

                    elements.favBtn.onclick = () => {
            const strId = String(item.id);
            const index = favorites.indexOf(strId);
            if (index > -1) {
                favorites.splice(index, 1);
                elements.favBtn.classList.remove('active');
                elements.favBtn.querySelector('i').className = 'far fa-heart'; 
            } else {
                favorites.push(strId);
                elements.favBtn.classList.add('active');
                elements.favBtn.querySelector('i').className = 'fas fa-heart'; 
            }
            localStorage.setItem('favorites', JSON.stringify(favorites));      
        };
        }

        if (elements.chatBtn) {
            elements.chatBtn.onclick = (e) => {
                const user = localStorage.getItem('user');
                if (!user) {
                    e.preventDefault();
                    alert('Пожалуйста, войдите в аккаунт, чтобы воспользоваться этой функцией.');
                    window.location.href = 'auth.html';
                } else {
                    window.location.href = `messages.html?chat_id=${item.id}`;     
                }
            };
        }

        if (elements.bookBtn) {
            elements.bookBtn.onclick = (e) => {
                const user = localStorage.getItem('user');
                if (!user) {
                    e.preventDefault();
                    alert('Пожалуйста, войдите в аккаунт, чтобы забронировать объект.');
                    window.location.href = 'auth.html';
                } else {
                    alert('Функция бронирования скоро будет доступна!');
                }
            };
        }

    } catch (error) {
        console.error('Error loading details:', error);
        alert('Ошибка при загрузке данных');
    } finally {
        if (elements.loading) elements.loading.style.display = 'none';
    }
});