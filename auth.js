(function() {
    let currentTab = 'login';
    let userEmail = ''; 
    let timerInterval = null;

    const API_URL = window.DachaGoConfig?.apiUrl || 'http://localhost:5005/api/v1';

    let identityMask = null;

    // Elements
    const screenInput = document.getElementById('screen-input');
    const screenOtp = document.getElementById('screen-otp');
    const screenSuccess = document.getElementById('screen-success');
    const authHeader = document.getElementById('auth-header');
    
    const form = document.getElementById('auth-form');
    const submitBtn = document.getElementById('btn-submit');
    const verifyBtn = document.getElementById('btn-verify-otp');
    const timerEl = document.getElementById('otp-timer');
    const resendBtn = document.getElementById('resend-otp');
    const displayEmail = document.getElementById('display-user-email');

    const otpInputs = document.querySelectorAll('.otp-input');

    // Robust Selectors for Data Extraction
    const nameInput = document.getElementById('input-name') || document.querySelector('input[placeholder="Введите имя"]');
    const identityInput = document.getElementById('input-identity') || document.getElementById('auth-username') || document.querySelector('input[type="text"]');
    const identityIcon = document.getElementById('identity-icon');
    const identityLabel = document.getElementById('auth-label');

    const passwordInput = document.getElementById('input-password') || document.querySelector('input[type="password"]');
    const confirmInput = document.getElementById('input-confirm');
    const passReqsBox = document.getElementById('pass-reqs');

    // --- DYNAMIC MASK LOGIC ---
    function initDynamicMask() {
        if (!identityInput) return;

        identityMask = IMask(identityInput, {
            mask: [
                {
                    // PATTERN A: Phone
                    mask: '+{998} (00) 000-00-00',
                    lazy: false,
                    eager: true,
                    startsWith: function (value, prepared) {
                        return /^\+?[0-9\s-()]*$/.test(value);
                    }
                },
                {
                    // PATTERN B: Free entry (Email)
                    mask: /^[a-zA-Z0-9.@_\-*]*$/,
                    lazy: true
                }
            ]
        });

        // Handle UI updates based on current mask pattern
        identityMask.on('accept', () => {
            const val = identityInput.value.trim();
            const isEmail = /[a-zA-Z@]/.test(val);

            if (isEmail) {
                if (identityIcon) identityIcon.className = 'far fa-envelope field-icon';
                if (identityLabel) identityLabel.innerText = currentTab === 'register' ? 'EMAIL ДЛЯ РЕГИСТРАЦИИ' : 'EMAIL ИЛИ ТЕЛЕФОН';
            } else if (val.length > 0) {
                if (identityIcon) identityIcon.className = 'fas fa-phone field-icon';
                if (identityLabel) identityLabel.innerText = currentTab === 'register' ? 'ТЕЛЕФОН ДЛЯ РЕГИСТРАЦИИ' : 'ТЕЛЕФОН';
            } else {
                if (identityLabel) identityLabel.innerText = currentTab === 'register' ? 'EMAIL ДЛЯ РЕГИСТРАЦИИ' : 'EMAIL ИЛИ ТЕЛЕФОН';
            }

            validateIdentity();
        });
    }

    function validateIdentity() {
        const wrapper = identityInput.closest('.input-wrapper');
        const val = identityInput.value.trim();
        let isValid = false;

        const isEmail = /[a-zA-Z@]/.test(val);

        if (isEmail) {
            isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        } else {
            // Check if phone is complete (9 digits after +998)
            isValid = identityMask && identityMask.unmaskedValue.length === 12;
        }

        if (isValid) {
            wrapper.classList.add('valid');
            wrapper.classList.remove('error');
        } else {
            wrapper.classList.remove('valid');
        }
        validateForm();
    }

    // Initialize
    function init() {
        setupTabs();
        setupPasswordToggle();
        setupRealtimeValidation();
        setupOTPInputs();
        initDynamicMask();

        form.addEventListener('submit', handleSubmit);
        if (verifyBtn) verifyBtn.addEventListener('click', handleVerifyOTP);
        if (resendBtn) resendBtn.addEventListener('click', handleResendOTP);
        
        // Add back button listener
        const backBtnOtp = document.getElementById('back-to-input');
        if (backBtnOtp) {
            backBtnOtp.addEventListener('click', (e) => {
                e.preventDefault();
                transitionScreens(screenOtp, screenInput);
                authHeader.style.display = 'block';
            });
        }
    }

    function transitionScreens(from, to) {
        from.classList.add('fade-out');
        setTimeout(() => {
            from.classList.remove('active', 'fade-out');
            to.classList.add('fade-in', 'active');
            setTimeout(() => to.classList.remove('fade-in'), 400);
        }, 400);
    }

    function setupOTPInputs() {
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const val = e.target.value;
                if (val.length === 1 && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
                
                const code = Array.from(otpInputs).map(i => i.value).join('');
                if (code.length === 6) {
                    handleVerifyOTP();
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });
        });
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
                
                document.getElementById('auth-title').innerText = target === 'register' ? 'Создать аккаунт' : 'С возвращением!';
                document.getElementById('auth-subtitle').innerText = target === 'register' 
                    ? 'Заполните данные, чтобы начать пользоваться всеми функциями DachaGo.' 
                    : 'Войдите в аккаунт, чтобы продолжить поиск вашей идеальной дачи.';
                
                identityInput.placeholder = target === 'register' ? 'example@mail.com' : 'example@mail.com или +998...';
                if (identityLabel) identityLabel.innerText = target === 'register' ? 'EMAIL ДЛЯ РЕГИСТРАЦИИ' : 'EMAIL ИЛИ ТЕЛЕФОН';

                submitBtn.querySelector('.btn-text').innerText = target === 'register' ? 'Зарегистрироваться' : 'Войти';
                clearErrors();
                
                // Reset field
                if (identityMask) identityMask.value = '';
                if (identityIcon) identityIcon.className = 'far fa-envelope field-icon';

                validateForm();
            });
        });
    }

    function setupRealtimeValidation() {
        const validateField = (input, validator) => {
            input.addEventListener('input', () => {
                if (input === identityInput) return; // Handled by dynamic mask accept

                const wrapper = input.closest('.input-wrapper');
                if (validator && validator(input.value)) {
                    wrapper.classList.add('valid');
                    wrapper.classList.remove('error');
                } else if (validator) {
                    wrapper.classList.remove('valid');
                }
                
                if (input === passwordInput) {
                    validatePasswordReqs();
                    validateConfirm(); // Check match if main password changes
                }
                if (input === confirmInput) {
                    validateConfirm(); // Check match if confirm field changes
                }
                validateForm();
            });
        };

        if (nameInput) validateField(nameInput, val => val.trim().length >= 2);
        if (passwordInput) validateField(passwordInput, val => val.length >= 8);
        if (confirmInput) validateField(confirmInput, null); // Handled by validateConfirm
    }

    function validatePasswordReqs() {
        if (!passwordInput) return;
        const val = passwordInput.value;
        const reqs = {
            len: val.length >= 8,
            case: /[a-z]/.test(val) && /[A-Z]/.test(val),
            num: /\d/.test(val),
            spec: /[!@#$%^&*]/.test(val)
        };

        Object.keys(reqs).forEach(key => {
            const el = document.querySelector(`[data-req="${key}"]`);
            if (el) el.classList.toggle('met', reqs[key]);
        });
    }

    function validateConfirm() {
        if (currentTab !== 'register' || !confirmInput || !passwordInput) return;
        const wrapper = confirmInput.closest('.input-wrapper');
        const passValue = passwordInput.value;
        const confirmValue = confirmInput.value;

        if (confirmValue.length === 0) {
            wrapper.classList.remove('valid', 'error');
            return;
        }

        const match = passValue === confirmValue && passValue.length > 0;
        
        if (match) {
            wrapper.classList.add('valid');
            wrapper.classList.remove('error');
        } else {
            wrapper.classList.remove('valid');
            wrapper.classList.add('error');
        }
    }

    function validateForm() {
        let isValid = true;
        
        // Check Identity
        let identityOk = false;
        const val = identityInput.value.trim();
        const isEmail = /[a-zA-Z@]/.test(val);

        if (isEmail) {
            if (currentTab === 'register') {
                identityOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
            } else {
                identityOk = val.length > 0;
            }
        } else {
            identityOk = identityMask && identityMask.unmaskedValue.length === 12;
        }

        if (currentTab === 'register') {
            const nameOk = nameInput ? nameInput.value.trim().length >= 2 : false;
            const passOk = passwordInput ? (passwordInput.value.length >= 8 && 
                           /[a-z]/.test(passwordInput.value) && 
                           /[A-Z]/.test(passwordInput.value) && 
                           /\d/.test(passwordInput.value) && 
                           /[!@#$%^&*]/.test(passwordInput.value)) : false;
            const confirmOk = (confirmInput && passwordInput) ? confirmInput.value === passwordInput.value : false;
            isValid = nameOk && identityOk && passOk && confirmOk;
        } else {
            isValid = identityOk && (passwordInput ? passwordInput.value.length > 0 : false);
        }
        submitBtn.disabled = !isValid;
    }

    function setupPasswordToggle() {
        document.querySelectorAll('.toggle-pass').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = btn.previousElementSibling;
                const isPass = input.type === 'password';
                input.type = isPass ? 'text' : 'password';
                btn.classList.toggle('fa-eye', !isPass);
                btn.classList.toggle('fa-eye-slash', isPass);
            });
        });
    }

    // --- OTP LOGIC ---
    function startTimer() {
        let seconds = 59;
        resendBtn.classList.add('disabled');
        if (timerInterval) clearInterval(timerInterval);
        
        timerInterval = setInterval(() => {
            const displaySec = seconds < 10 ? '0' + seconds : seconds;
            timerEl.innerText = `Отправить повторно через 00:${displaySec}`;
            if (seconds <= 0) {
                clearInterval(timerInterval);
                timerEl.innerText = 'Вы можете запросить код повторно';
                resendBtn.classList.remove('disabled');
            }
            seconds--;
        }, 1000);
    }

    async function handleVerifyOTP() {
        const code = Array.from(otpInputs).map(i => i.value).join('');
        if (code.length !== 6) return;

        setLoading(true, verifyBtn);
        try {
            const response = await fetch(`${API_URL}/auth/verify-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, code: code })
            });

            const data = await response.json();

            if (response.ok) {
                transitionScreens(screenOtp, screenSuccess);
                const token = data.access_token || data.token;
                if (token) localStorage.setItem('token', token);
                if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
                setTimeout(() => { window.location.href = 'index.html'; }, 2500);
            } else {
                alert(data.detail || data.message || 'Неверный код подтверждения');
                otpInputs.forEach(i => i.value = '');
                otpInputs[0].focus();
            }
        } catch (err) {
            alert('Ошибка связи с сервером');
        } finally {
            setLoading(false, verifyBtn);
        }
    }

    async function handleResendOTP(e) {
        e.preventDefault();
        if (resendBtn.classList.contains('disabled')) return;

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: nameInput ? nameInput.value.trim() : "", 
                    email: userEmail, 
                    password: passwordInput ? passwordInput.value : "" 
                })
            });
            if (response.ok) {
                alert('Код отправлен повторно');
                startTimer();
            } else {
                const data = await response.json();
                alert(data.detail || data.message || 'Ошибка отправки');
            }
        } catch (err) {
            alert('Ошибка сервера');
        }
    }

    // --- SCREEN TRANSITIONS ---
    function showOTPScreen() {
        authHeader.style.display = 'none';
        displayEmail.innerText = userEmail;
        transitionScreens(screenInput, screenOtp);
        startTimer();
        setTimeout(() => otpInputs[0].focus(), 500);
    }

    // --- DATA EXTRACTION ---
    function getCleanIdentifier() {
        if (!identityInput) return '';
        const rawValue = identityInput.value.trim();
        const isEmail = /[a-zA-Z@]/.test(rawValue);
        
        if (isEmail) {
            return rawValue;
        } else {
            return rawValue.replace(/[\s-()]/g, '');
        }
    }

    // --- FORM SUBMISSION ---
    async function handleSubmit(e) {
        e.preventDefault();
        
        const name = nameInput ? nameInput.value.trim() : "";
        const identifier = getCleanIdentifier();
        const password = passwordInput ? passwordInput.value : "";

        if (!identifier || !password) {
            showError('identity', 'Заполните это поле');
            return;
        }

        setLoading(true, submitBtn);

        if (currentTab === 'register') {
            userEmail = identifier;
            try {
                const response = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email: identifier, password })
                });
                const data = await response.json();
                if (response.ok) {
                    showOTPScreen();
                } else {
                    alert(data.detail || data.message || 'Ошибка регистрации');
                }
            } catch (err) {
                alert('Ошибка сервера');
            } finally {
                setLoading(false, submitBtn);
            }
        } else {
            // Login
            try {
                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: identifier, password })
                });
                const data = await response.json();
                if (response.ok) {
                    const token = data.access_token || data.token;
                    if (token) localStorage.setItem('token', token);
                    if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
                    window.location.href = 'index.html';
                } else {
                    alert(data.detail || data.message || 'Ошибка входа');
                }
            } catch (err) {
                alert('Ошибка сервера');
            } finally {
                setLoading(false, submitBtn);
            }
        }
    }

    function setLoading(isLoading, btn) {
        const loader = btn.querySelector('.loader');
        const btnText = btn.querySelector('.btn-text');
        btn.disabled = isLoading;
        if (loader) loader.style.display = isLoading ? 'block' : 'none';
        if (btnText) btnText.style.display = isLoading ? 'none' : 'block';
    }

    function showError(field, msg) {
        const errEl = document.getElementById(`error-${field}`);
        if (errEl) errEl.innerText = msg;
        const input = document.getElementById(`input-${field}`);
        if (input) {
            const wrapper = input.closest('.input-wrapper');
            wrapper.classList.add('error');
            setTimeout(() => wrapper.classList.remove('error'), 3000);
        }
    }

    function clearErrors() {
        document.querySelectorAll('.error-msg').forEach(el => el.innerText = '');
        document.querySelectorAll('.input-wrapper').forEach(el => el.classList.remove('error'));
    }

    init();
})();
