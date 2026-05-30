document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = window.DachaGoConfig?.apiUrl || 'http://localhost:5005/api';
    const container = document.getElementById('favorites-container');
    
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

    async function loadFavorites() {
        if (favorites.length === 0) {
            renderEmpty();
            return;
        }

        try {
            const res = await fetch(`${API_URL}/listings`);
            const allListings = await res.json();
            const favListings = allListings.filter(l => favorites.includes(String(l.id)));
            
            if (favListings.length === 0) {
                renderEmpty();
            } else {
                renderListings(favListings);
            }
        } catch (e) {
            console.error(e);
            container.innerHTML = '<p style="text-align:center; color:red;">Ошибка загрузки</p>';
        }
    }

    function renderEmpty() {
        container.innerHTML = `
            <div class="empty-state">
                <i class="far fa-heart"></i>
                <h3>В избранном пока пусто</h3>
                <p>Нажимайте на сердечко в объявлениях, чтобы сохранить их здесь.</p>
            </div>
        `;
    }

    function renderListings(items) {
        container.innerHTML = items.map(item => `
            <div class="property-card" id="fav-card-${item.id}" onclick="window.location.href='details.html?id=${item.id}'">
                <div class="card-image-wrap">
                    <img src="${item.image}" class="card-img">
                    <button class="fav-btn" onclick="removeFavorite(event, '${item.id}')">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <div class="card-info">
                    <h3 class="card-title">${item.title}</h3>
                    <div class="card-loc"><i class="fas fa-map-marker-alt"></i> ${item.location}</div>
                    <div class="card-bottom">
                        <div class="card-price">${(item.price || 0).toLocaleString()} <span>сум</span></div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    window.removeFavorite = (event, id) => {
        event.stopPropagation();
        const strId = String(id);
        favorites = favorites.filter(fid => fid !== strId);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        
        // Immediate UI removal
        const card = document.getElementById(`fav-card-${id}`);
        if (card) {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.9)';
            setTimeout(() => {
                card.remove();
                if (favorites.length === 0) renderEmpty();
            }, 300);
        }
    };

    loadFavorites();
});