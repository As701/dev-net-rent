(function() {
    let currentTab = 'login';

    const API_URL = window.DachaGoConfig?.apiUrl || 'https://dachago-server.onrender.com/api/v1';

    // Elements
    const form = document.getElementById('auth-form');
    const submitBtn = document.getElementById('btn-submit');
    const nameInput = document.getElementById('input-name');
    const identityInput = document.getElementById('input-identity');
    const identityWrapper = document.getElementById('identity-wrapper');
    const identityIcon = document.getElementById('identity-icon');
    const identityLabel = document.getElementById('identity-label');
    const passwordInput = document.getElementById('input-password');
    const confirmInput = document.getElementById('input-confirm');
    const passReqsBox = document.getElementById('pass-reqs');

    function init() {
        setupTabs();
        setupPasswordToggle();
        setupIdentityInput();
        setupRealtimeValidation();
        form.addEventListener('submit', handleSubmit);
    }

    function setupIdentityInput() {
        identityInput.addEventListener('input', (e) => {
            let val = identityInput.value.trim();
            
            if (currentTab === 'register') {
                // In Registration, we enforce Email + Password logic as per previous TZ, 
                // but if we want to support dynamic switching here too:
                updateIdentityUI(val);
            } else {
                updateIdentityUI(val);
            }
            validateForm();
        });
    }

    function updateIdentityUI(val) {
        if (!val) {
            identityIcon.className = 'far fa-envelope field-icon';
            identityWrapper.classList.remove('phone-mode');
            return;
        }

        // TZ Logic: strictly digits, optional plus, spaces, or hyphens = Phone
        const phonePattern = /^\+?[0-9\s-]+$/;
        const isPotentialPhone = phonePattern.test(val);
        const hasEmailSymbols = val.includes('@') || /[a-zA-Z]/.test(val);

        if (isPotentialPhone && !hasEmailSymbols) {
            identityIcon.className = 'fas fa-phone field-icon';
            identityWrapper.classList.add('phone-mode');
            identityInput.placeholder = "(90) 000-00-00";
        } else {
            identityIcon.className = 'far fa-envelope field-icon';
            identityWrapper.classList.remove('phone-mode');
            identityInput.placeholder = "example@mail.com";
        }
    }

    function setupRealtimeValidation() {
        const updateFieldUI = (input, isValid) => {
            const wrapper = input.closest('.input-wrapper');
            if (isValid) {
                wrapper.classList.add('valid');
                wrapper.classList.remove('error');
            } else {
                wrapper.classList.remove('valid');
            }
            validateForm();
        };

        nameInput.addEventListener('input', () => updateFieldUI(nameInput, nameInput.value.trim().length >= 2));
        passwordInput.addEventListener('input', () => {
            const val = passwordInput.value;
            const reqs = {
                len: val.length >= 8,
                case: /[a-z]/.test(val) && /[A-Z]/.test(val),
                num: /\d/.test(val),
                spec: /[!@#$%^&*]/.test(val)
            };
            let allMet = true;
            Object.keys(reqs).forEach(key => {
                const el = document.querySelector(`[data-req="${key}"]`);      
                if (el) el.classList.toggle('met', reqs[key]);
                if (!reqs[key]) allMet = false;
            });
            updateFieldUI(passwordInput, allMet);
        });
        confirmInput.addEventListener('input', () => {
            updateFieldUI(confirmInput, confirmInput.value === passwordInput.value && confirmInput.value.length > 0);
        });
    }

    function validateForm() {
        if (currentTab === 'login') {
            submitBtn.disabled = !(identityInput.value.length > 5 && passwordInput.value.length >= 8);
            return;
        }
        const nameOk = nameInput.value.trim().length >= 2;
        const identVal = identityInput.value.trim();
        
        // Strictly Email for registration as per TZ "Email + OTP"
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identVal);
        const identOk = isEmail;
        
        const passOk = passwordInput.closest('.input-wrapper').classList.contains('valid');
        const confirmOk = confirmInput.value === passwordInput.value && confirmInput.value.length > 0;
        submitBtn.disabled = !(nameOk && identOk && passOk && confirmOk);      
    }

    function setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                if (target === currentTab) return;
                currentTab = target;
                tabs.forEach(t => t.classList.toggle('active', t === tab));    
                
                document.getElementById('group-name').style.display = target === 'register' ? 'block' : 'none';
                document.getElementById('group-confirm').style.display = target === 'register' ? 'block' : 'none';
                passReqsBox.classList.toggle('visible', target === 'register');
                
                if (target === 'register') {
                    identityLabel.innerText = "Email для регистрации";
                    identityInput.placeholder = "example@mail.com";
                    identityWrapper.classList.remove('phone-mode');
                    identityIcon.className = 'far fa-envelope field-icon';
                } else {
                    identityLabel.innerText = "Email или телефон";
                    updateIdentityUI(identityInput.value.trim());
                }

                submitBtn.querySelector('.btn-text').innerText = target === 'register' ? 'Зарегистрироваться' : 'Войти';
                validateForm();
            });
        });
    }

    function setupPasswordToggle() {
        document.querySelectorAll('.toggle-pass').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = btn.previousElementSibling;
                input.type = input.type === 'password' ? 'text' : 'password';  
                btn.classList.toggle('fa-eye');
                btn.classList.toggle('fa-eye-slash');
            });
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const name = nameInput.value.trim();
        let identity = identityInput.value.trim();
        const password = passwordInput.value;

        // If phone mode is active, prepend +998 and clean digits
        if (identityWrapper.classList.contains('phone-mode')) {
            const cleanDigits = identity.replace(/\D/g, '');
            identity = `+998${cleanDigits}`;
        } else {
            identity = identity.toLowerCase(); // Email always lowercase
        }

        setLoading(true);
        if (currentTab === 'register') {
            try {
                const response = await fetch(`${API_URL}/auth/register`, {     
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email: identity, password })
                });
                const data = await response.json();
                if (response.ok) {
                    window.location.href = `verify.html?email=${encodeURIComponent(identity)}`;
                } else {
                    alert(data.detail || 'Ошибка регистрации');
                }
            } catch (err) { alert('Ошибка сервера'); } finally { setLoading(false); }
        } else {
            try {
                const response = await fetch(`${API_URL}/auth/login`, {        
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: identity, password })
                });
                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('token', data.access_token);
                    localStorage.setItem('user', JSON.stringify(data.user));   
                    window.location.href = 'index.html';
                } else { alert(data.detail || 'Ошибка входа'); }    
            } catch (err) { alert('Ошибка'); } finally { setLoading(false); }
        }
    }

    function setLoading(isLoading) {
        const loader = submitBtn.querySelector('.loader');
        const btnText = submitBtn.querySelector('.btn-text');
        submitBtn.disabled = isLoading;
        if (loader) loader.style.display = isLoading ? 'block' : 'none';       
        if (btnText) btnText.style.display = isLoading ? 'none' : 'block';     
    }

    init();
})();
