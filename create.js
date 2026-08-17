document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) { window.location.href = 'auth.html?redirect=create.html'; return; }
    const user = JSON.parse(userStr);

    let calendarData = {};
    let selectedDates = [];
    let uploadedPhotos = [];
    let currentType = 'rent';
    let currentCategory = 'dachas';
    let amenities = [];
    let rules = [];
    let selectedCoords = null;
    let calendarMode = 'price';
    let isBargainingEnabled = false;

    // --- BARGAINING TOGGLE ---
    const bargainingBtn = document.getElementById('bargaining-toggle-btn');
    const bargainingHint = document.getElementById('bargaining-hint');
    if (bargainingBtn) {
        bargainingBtn.onclick = () => {
            isBargainingEnabled = !isBargainingEnabled;
            bargainingBtn.classList.toggle('active', isBargainingEnabled);
            if (bargainingHint) bargainingHint.style.display = isBargainingEnabled ? 'block' : 'none';
        };
    }

    const locationData = {
        "Ташкентская область": ["Ташкент", "Чарвак", "Чимган", "Бельдерсай", "Бричмулла", "Ходжикент", "Паркент", "Кибрай"],
        "Самаркандская область": ["Самарканд", "Ургут"],
        "Бухарская область": ["Бухара", "Гиждуван"]
    };

    const descInput = document.getElementById('desc-input');
    const descErr = document.getElementById('desc-err');
    const descCount = document.getElementById('desc-count');
    const publishBtn = document.getElementById('publish-btn');
    const MIN_CHARS = 50;
    const MAX_CHARS = 50000;

    // --- FORMATTING ---
    function formatNumber(val) {
        return val.toString().replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    }

    function shortenPrice(num) {
        if (num >= 1000000) {
            let res = (num / 1000000).toFixed(1);
            return res.endsWith('.0') ? res.slice(0, -2) + 'M' : res + 'M';    
        }
        if (num >= 1000) {
            let res = (num / 1000).toFixed(1);
            return res.endsWith('.0') ? res.slice(0, -2) + 'K' : res + 'K';    
        }
        return num;
    }

    document.addEventListener('input', (e) => {
        if (e.target.id.includes('price') || e.target.classList.contains('price-input')) {
            e.target.value = formatNumber(e.target.value);
        }
    });

    // --- LOCATION ---
    const regionSelect = document.getElementById('region-select');
    const citySelect = document.getElementById('city-select');
    const citySelectGroup = document.getElementById('city-select-group');      
    
    if (regionSelect) {
        Object.keys(locationData).forEach(r => {
            const o = document.createElement('option'); o.value = r; o.textContent = r;
            regionSelect.appendChild(o);
        });
        regionSelect.onchange = () => {
            const cities = locationData[regionSelect.value];
            if (citySelect) {
                citySelect.innerHTML = '<option value="" disabled selected>Выберите город</option>';
                cities.forEach(c => {
                    const o = document.createElement('option'); o.value = c; o.textContent = c;
                    citySelect.appendChild(o);
                });
                if (citySelectGroup) citySelectGroup.style.display = 'flex';
            }
            checkOverallValidation();
        };
    }

    // --- YANDEX MAP ---
    const mapModal = document.getElementById('map-modal');
    let yMap, yPlacemark;
    const mapBtn = document.getElementById('map-picker-btn');
    if (mapBtn) {
        mapBtn.onclick = () => {
            if (typeof ymaps === 'undefined') {
                alert("Ошибка: Библиотека карт не загружена. Проверьте подключение к интернету или API ключ.");
                return;
            }
            mapModal.classList.add('active');
            if (!yMap) {
                ymaps.ready(() => {
                    yMap = new ymaps.Map("map-container", { center: [41.2995, 69.2401], zoom: 12 });
                    yMap.events.add('click', (e) => {
                        const coords = e.get('coords');
                        if (yPlacemark) yPlacemark.geometry.setCoordinates(coords);
                        else {
                            yPlacemark = new ymaps.Placemark(coords, {}, { preset: 'islands#blueDotIcon' });
                            yMap.geoObjects.add(yPlacemark);
                        }
                        selectedCoords = { lat: coords[0], lng: coords[1] };       
                    });
                });
            }
        };
    }
    
    const closeMapBtn = document.getElementById('close-map');
    if (closeMapBtn) closeMapBtn.onclick = () => mapModal.classList.remove('active');
    
    const confirmLocBtn = document.getElementById('confirm-location');
    if (confirmLocBtn) {
        confirmLocBtn.onclick = () => {
            if (selectedCoords) {
                document.getElementById('map-status-text').innerText = "Локация подтверждена ✓";
                mapModal.classList.remove('active');
            } else alert("Выберите точку на карте");
        };
    }

    // --- PHOTOS ---
    const photoGrid = document.getElementById('photo-grid');
    const addPhotoTrigger = document.getElementById('add-photo-trigger');      
    const fileInput = document.getElementById('real-file-input');
    
    if (addPhotoTrigger) addPhotoTrigger.onclick = () => fileInput.click();
    if (fileInput) {
        fileInput.onchange = (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (ev) => { uploadedPhotos.push(ev.target.result); renderPhotos(); };
                reader.readAsDataURL(file);
            });
        };
    }
    
    function renderPhotos() {
        if (!photoGrid) return;
        photoGrid.innerHTML = '';
        uploadedPhotos.forEach((src, i) => {
            const d = document.createElement('div'); d.className = 'photo-box';
            d.innerHTML = `<img src="${src}"><div class="remove-photo" onclick="window.removePhoto(${i})">×</div>`;
            photoGrid.appendChild(d);
        });
        photoGrid.appendChild(addPhotoTrigger);
    }
    window.removePhoto = (i) => { uploadedPhotos.splice(i, 1); renderPhotos(); };

    // --- CALENDAR ---
    const calendarGrid = document.getElementById('calendar-grid');
    const calendarControls = document.getElementById('calendar-controls');     
    const priceInput = document.getElementById('calendar-price-input');        
    const minStayInput = document.getElementById('calendar-min-stay');
    const discountInput = document.getElementById('calendar-discount');        
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    const monthNames = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

    function renderCalendar() {
        if (!calendarGrid) return;
        calendarGrid.innerHTML = '';
        document.getElementById('current-month-display').innerText = `${monthNames[currentMonth]} ${currentYear}`;
        ['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'].forEach(d => {
            const el = document.createElement('div'); el.className = 'calendar-day-label'; el.innerText = d;
            calendarGrid.appendChild(el);
        });
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();      
        const offset = (firstDay === 0 ? 6 : firstDay - 1);
        const days = new Date(currentYear, currentMonth + 1, 0).getDate();     
        const today = new Date(); today.setHours(0,0,0,0);

        for (let i = 0; i < offset; i++) calendarGrid.appendChild(document.createElement('div'));
        for (let day = 1; day <= days; day++) {
            const dateStr = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const dateObj = new Date(currentYear, currentMonth, day);
            const isPast = dateObj < today;
            const dayEl = document.createElement('div'); dayEl.className = 'calendar-day';
            if (isPast) { dayEl.style.opacity = '0.2'; dayEl.style.pointerEvents = 'none'; }

            const data = calendarData[dateStr];
            if (data && data.available) {
                dayEl.classList.add('available');
                let finalPrice = data.price;
                if (data.discount > 0) finalPrice = data.price * (1 - data.discount/100);
                dayEl.innerHTML = `<span>${day}</span><span style="font-size:8px;font-weight:900">${shortenPrice(Math.round(finalPrice))}</span>`;
                if (data.minStay > 1) dayEl.innerHTML += `<div style="position:absolute;bottom:2px;font-size:5px;background:var(--text-dark);color:white;padding:1px 3px;border-radius:4px">${data.minStay}дн.</div>`;
                if (data.discount > 0) dayEl.innerHTML += `<div style="position:absolute;top:2px;right:2px;font-size:5px;background:var(--danger-red);color:white;padding:1px 3px;border-radius:4px">-${data.discount}%</div>`;
            } else {
                dayEl.classList.add('unavailable');
                dayEl.innerHTML = `<span>${day}</span><span style="font-size:6px;font-weight:800;color:var(--danger-red)">ЗАКРЫТО</span>`;
            }

            if (selectedDates.includes(dateStr)) dayEl.classList.add('selected');
            dayEl.onclick = () => {
                if (selectedDates.includes(dateStr)) selectedDates = selectedDates.filter(d => d !== dateStr);
                else selectedDates.push(dateStr);
                calendarControls.classList.toggle('active', selectedDates.length > 0);
                renderCalendar();
            };
            calendarGrid.appendChild(dayEl);
        }
    }

    const prevMonthBtn = document.getElementById('prev-month');
    if (prevMonthBtn) prevMonthBtn.onclick = () => { currentMonth--; if(currentMonth<0){currentMonth=11;currentYear--;} renderCalendar(); };
    
    const nextMonthBtn = document.getElementById('next-month');
    if (nextMonthBtn) nextMonthBtn.onclick = () => { currentMonth++; if(currentMonth>11){currentMonth=0;currentYear++;} renderCalendar(); };
    
    const setPriceModeBtn = document.getElementById('set-price-mode');
    if (setPriceModeBtn) setPriceModeBtn.onclick = () => { calendarMode='price'; setPriceModeBtn.classList.add('active'); document.getElementById('set-unavailable-mode').classList.remove('active'); document.getElementById('price-input-container').style.display='block'; };
    
    const setUnavailModeBtn = document.getElementById('set-unavailable-mode');
    if (setUnavailModeBtn) setUnavailModeBtn.onclick = () => { calendarMode='unavailable'; setUnavailModeBtn.classList.add('active'); document.getElementById('set-price-mode').classList.remove('active'); document.getElementById('price-input-container').style.display='none'; };  

    const applyCalendarBtn = document.getElementById('apply-calendar-settings');
    if (applyCalendarBtn) {
        applyCalendarBtn.onclick = () => {       
            const price = parseInt(priceInput.value.replace(/\s/g,'')) || 0;       
            const minStay = parseInt(minStayInput.value) || 1;
            const discount = parseInt(discountInput.value) || 0;
            selectedDates.forEach(d => {
                if (calendarMode === 'price') calendarData[d] = { price, minStay, discount, available: true };
                else calendarData[d] = { available: false };
            });
            selectedDates = []; calendarControls.classList.remove('active'); priceInput.value=""; renderCalendar();
        };
    }

    // --- TYPE & CATEGORIES ---
    document.querySelectorAll('.type-option').forEach(opt => {
        opt.onclick = () => {
            document.querySelectorAll('.type-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            currentType = opt.dataset.type;

            const isSale = currentType === 'sale';
            document.getElementById('calendar-section').style.display = isSale ? 'none' : 'block';
            document.getElementById('sale-price-section').style.display = isSale ? 'block' : 'none';
            document.getElementById('rules-section').style.display = isSale ? 'none' : 'block';
        };
    });

    document.querySelectorAll('.amenity-item, .criterion-item, .cat-option, .policy-option').forEach(item => {
        item.onclick = () => {
            if (item.classList.contains('cat-option') || item.classList.contains('policy-option')) {
                const p = item.parentElement; p.querySelectorAll('.active').forEach(a => a.classList.remove('active'));
            }
            item.classList.toggle('active');
            const id = item.dataset.id;
            if (item.classList.contains('amenity-item')) {
                if (item.classList.contains('active')) amenities.push(id); else amenities = amenities.filter(a => a !== id);
            }
            if (item.classList.contains('criterion-item')) {
                if (item.classList.contains('active')) rules.push(id); else rules = rules.filter(r => r !== id);
            }
        };
    });

    // --- DESCRIPTION COUNTER & VALIDATION ---
    let isLivenessPassed = false;
    const gestures = [
        { icon: '🖖🏻', label: 'Покажите жест: 🖖🏻 (Vulkan)' },
        { icon: '🤘🏻', label: 'Покажите жест: 🤘🏻 (Rock-n-Roll)' },
        { icon: '✌🏻', label: 'Покажите жест: ✌🏻 (Peace)' },
        { icon: '👌🏻', label: 'Покажите жест: 👌🏻 (OK)' }
    ];
    let currentGesture = null;
    let livenessStream = null;
    let capturedLivenessData = null;

    // --- LIVENESS LOGIC ---
    const startLivenessBtn = document.getElementById('start-liveness-btn');
    const captureLivenessBtn = document.getElementById('capture-liveness-btn');
    const livenessVideo = document.getElementById('liveness-video');
    const livenessCanvas = document.getElementById('liveness-canvas');
    const cameraWrap = document.getElementById('camera-preview-wrap');
    const livenessPlaceholder = document.getElementById('liveness-placeholder');
    const livenessInstructions = document.getElementById('liveness-instructions');
    const gestureLabel = document.getElementById('gesture-instruction');
    const livenessSuccess = document.getElementById('liveness-success');

    if (startLivenessBtn) {
        startLivenessBtn.onclick = async () => {
            try {
                livenessStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
                livenessVideo.srcObject = livenessStream;
                cameraWrap.style.display = 'block';
                livenessPlaceholder.style.display = 'none';
                startLivenessBtn.style.display = 'none';
                livenessInstructions.style.display = 'block';
                
                // Randomize gesture
                currentGesture = gestures[Math.floor(Math.random() * gestures.length)];
                gestureLabel.innerText = currentGesture.label;
            } catch (err) {
                alert("Ошибка доступа к камере: " + err.message);
            }
        };
    }

    if (captureLivenessBtn) {
        captureLivenessBtn.onclick = () => {
            const context = livenessCanvas.getContext('2d');
            livenessCanvas.width = livenessVideo.videoWidth;
            livenessCanvas.height = livenessVideo.videoHeight;
            context.drawImage(livenessVideo, 0, 0, livenessCanvas.width, livenessCanvas.height);
            
            capturedLivenessData = livenessCanvas.toDataURL('image/jpeg', 0.8);
            
            // Stop stream
            if (livenessStream) {
                livenessStream.getTracks().forEach(track => track.stop());
            }
            
            cameraWrap.style.display = 'none';
            livenessInstructions.style.display = 'none';
            livenessSuccess.style.display = 'block';
            isLivenessPassed = true;
            checkOverallValidation();
        };
    }

    function validateDescription() {
        if (!descInput) return;

        let text = descInput.value;
        if (text.length > MAX_CHARS) {
            text = text.substring(0, MAX_CHARS);
            descInput.value = text;
        }

        const currentLen = text.length;
        if (descCount) descCount.innerText = `${currentLen.toLocaleString()} / ${MAX_CHARS.toLocaleString()}`;

        if (currentLen < MIN_CHARS) {
            if (descErr) {
                descErr.style.color = 'var(--danger-red)';
                descErr.innerText = `Нужно еще ${MIN_CHARS - currentLen} симв.`;
            }
        } else {
            if (descErr) {
                descErr.style.color = '#28C76F'; // Success green
                descErr.innerText = 'Описание заполнено ✓';
            }
        }
        checkOverallValidation();
    }

    function checkOverallValidation() {
        const title = document.getElementById('title-input')?.value;
        const region = document.getElementById('region-select')?.value;        
        const desc = descInput?.value || "";
        const pSeries = document.getElementById('passport-series')?.value;
        const pNumber = document.getElementById('passport-number')?.value;

        const isValid = title && region && desc.length >= MIN_CHARS && pSeries?.length === 2 && pNumber?.length === 7 && isLivenessPassed;
        if (publishBtn) publishBtn.disabled = !isValid;
    }

    document.getElementById('passport-series')?.addEventListener('input', checkOverallValidation);
    document.getElementById('passport-number')?.addEventListener('input', checkOverallValidation);

    if (descInput) {
        descInput.addEventListener('input', validateDescription);
    }

    // --- PAYMENT TIMER UPDATED ---
    let paymentInterval = null;
    function startPaymentTimer(seconds) {
        const timerWrap = document.getElementById('payment-timer-wrap');
        const timerDisplay = document.getElementById('payment-timer');
        if (!timerWrap || !timerDisplay) return;

        if (paymentInterval) clearInterval(paymentInterval);
        timerWrap.style.display = 'block';
        let timeLeft = seconds;

        paymentInterval = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerDisplay.innerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            if (timeLeft <= 0) {
                clearInterval(paymentInterval);
                alert("Время на оплату истекло. Объявление аннулировано.");
                window.location.href = 'index.html';
            }
            timeLeft--;
        }, 1000);
    }

    if (publishBtn) {
        publishBtn.onclick = async () => {
            const token = localStorage.getItem('token');
            const API_URL = window.DachaGoConfig?.apiUrl || 'https://dev-net-rent.onrender.com/api/v1';

            const finalData = {
                owner_id: user.id,
                title: document.getElementById('title-input').value,
                type: currentType,
                category: document.querySelector('.cat-option.active')?.dataset.category,
                price: document.getElementById('listing-price-input').value.replace(/\s/g,''),
                location: `${regionSelect.value}, ${citySelect.value}`,
                coords: selectedCoords,
                is_bargaining_enabled: isBargainingEnabled,
                passport: {
                    series: document.getElementById('passport-series').value.toUpperCase(),
                    number: document.getElementById('passport-number').value
                },
                liveness_img: capturedLivenessData,
                details: {
                    beds: document.getElementById('bedrooms-input').value,
                    baths: document.getElementById('bathrooms-input').value,       
                    rooms: document.getElementById('rooms-input').value,
                    area: document.getElementById('area-input').value,
                    capacity: document.getElementById('capacity-input').value      
                },
                amenities: amenities.join(','),
                rules: rules.join(','),
                description: document.getElementById('desc-input').value,
                calendar: JSON.stringify(calendarData),
                checkin: document.getElementById('checkin-time').value,
                checkout: document.getElementById('checkout-time').value,
                policy: document.querySelector('.policy-option.active')?.dataset.policy,
                photos: uploadedPhotos
            };
            
            publishBtn.disabled = true;
            publishBtn.innerText = "Отправка...";
            
            try {
                const res = await fetch(`${API_URL}/listings/create`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(finalData)
                });
                
                const result = await res.json();
                
                if (res.ok) {
                    alert("Объявление создано! Оплатите размещение в течение 10 минут.");
                    publishBtn.innerText = "Ожидание оплаты...";
                    
                    const expiresAt = new Date(result.expires_at).getTime();
                    const now = new Date().getTime();
                    const diff = Math.floor((expiresAt - now) / 1000);
                    
                    startPaymentTimer(diff > 0 ? diff : 600);
                } else {
                    alert("Ошибка: " + (result.detail || "Не удалось создать объявление"));
                    publishBtn.disabled = false;
                    publishBtn.innerText = "Опубликовать";
                }
            } catch (err) {
                alert("Ошибка сети: " + err.message);
                publishBtn.disabled = false;
                publishBtn.innerText = "Опубликовать";
            }
        };
    }

    // Initial render
    renderCalendar();
    validateDescription();
    checkOverallValidation();
});