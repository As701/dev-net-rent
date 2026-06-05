(function() {
    let currentTab = 'login';
    let loginMask = null;

    const API_URL = window.DachaGoConfig?.apiUrl || 'https://dev-net-rent.onrender.com/api/v1';

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

    // --- UNIFIED INPUT CONTROL CENTER ---
    function setupIdentityInput() {
        if (!identityInput) return;

        identityInput.addEventListener('input', (e) => {
            let val = identityInput.value.trim();
            
            // 1. Determine mode: Phone or Email?
            // If starts with digit or +, and doesn't have @ or letters yet
            const isPotentialPhone = /^\+?[0-9]/.test(val);
            const hasEmailSymbols = /[@a-zA-Z]/.test(val);

            if (isPotentialPhone && !hasEmailSymbols && currentTab === 'login') {
                // PHONE MODE
                initSmartMask();
                if (identityIcon) identityIcon.className = 'fas fa-phone field-icon';
                if (identityWrapper) identityWrapper.classList.add('phone-mode');
                if (identityLabel) identityLabel.innerText = "ТЕЛЕФОН";
            } else {
                // EMAIL MODE
                destroySmartMask();
                if (identityIcon) identityIcon.className = 'far fa-envelope field-icon';
                if (identityWrapper) identityWrapper.classList.remove('phone-mode');
                if (identityLabel) {
                    identityLabel.innerText = currentTab === 'register' ? "EMAIL ДЛЯ РЕГИСТРАЦИИ" : "EMAIL";
                }
                if (!val) identityInput.placeholder = "example@mail.com или +998...";
            }

            validateForm();
        });
    }

    function initSmartMask() {
        if (!loginMask && identityInput) {
            loginMask = IMask(identityInput, {
                mask: '+{998} (00) 000-00-00',
                lazy: true,
                eager: true,
                overwrite: true
            });
        }
    }

    function destroySmartMask() {
        if (loginMask) {
            loginMask.destroy();
            loginMask = null;
        }
    }
    // ------------------------------------

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

        if (nameInput) nameInput.addEventListener('input', () => updateFieldUI(nameInput, nameInput.value.trim().length >= 2));
        
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

        if (confirmInput) {
            confirmInput.addEventListener('input', () => {
                updateFieldUI(confirmInput, confirmInput.value === passwordInput.value && confirmInput.value.length > 0);
            });
        }
    }

    function validateForm() {
        if (currentTab === 'login') {
            const val = loginMask ? loginMask.unmaskedValue : identityInput.value.trim();
            // Phone needs 9 digits (excluding +998), Email needs standard check
            const isPhone = loginMask && val.length === 9;
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identityInput.value.trim());
            
            submitBtn.disabled = !((isPhone || isEmail) && passwordInput.value.length >= 8);
            return;
        }
        
        // Registration tab
        const nameOk = nameInput.value.trim().length >= 2;
        const identVal = identityInput.value.trim();
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identVal);
        const passOk = passwordInput.closest('.input-wrapper').classList.contains('valid');
        const confirmOk = confirmInput.value === passwordInput.value && confirmInput.value.length > 0;
        
        submitBtn.disabled = !(nameOk && isEmail && passOk && confirmOk);
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
                
                // Reset input when switching tabs
                destroySmartMask();
                identityInput.value = "";
                identityIcon.className = 'far fa-envelope field-icon';
                identityWrapper.classList.remove('phone-mode');
                
                if (target === 'register') {
                    identityLabel.innerText = "EMAIL ДЛЯ РЕГИСТРАЦИИ";
                    identityInput.placeholder = "example@mail.com";
                } else {
                    identityLabel.innerText = "EMAIL ИЛИ ТЕЛЕФОН";
                    identityInput.placeholder = "example@mail.com или +998...";
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
        let identity = loginMask ? `+998${loginMask.unmaskedValue}` : identityInput.value.trim();
        const password = passwordInput.value;

        if (!loginMask) identity = identity.toLowerCase();

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
