(function() {
    let currentTab = 'login';
    let userEmail = ''; 
    let timerInterval = null;

    const API_URL = window.DachaGoConfig?.apiUrl || 'http://localhost:5005/api';

    let phoneMaskInstance = null;

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

    const nameInput = document.getElementById('input-name');
    const identityInput = document.getElementById('input-identity');
    const passwordInput = document.getElementById('input-password');
    const confirmInput = document.getElementById('input-confirm');
    const passReqsBox = document.getElementById('pass-reqs');

    // Smart Mask Functions
    function initSmartMask() {
        if (!phoneMaskInstance && identityInput) {
            phoneMaskInstance = IMask(identityInput, {
                mask: '+{998} (00) 000-00-00',
                lazy: false,
                eager: true
            });
            // Trigger validation on mask change
            phoneMaskInstance.on('accept', () => {
                validateIdentity();
            });
        }
    }

    function destroySmartMask() {
        if (phoneMaskInstance) {
            phoneMaskInstance.destroy();
            phoneMaskInstance = null;
        }
    }

    function validateIdentity() {
        const wrapper = identityInput.closest('.input-wrapper');
        const val = identityInput.value.trim();
        let isValid = false;

        if (phoneMaskInstance) {
            // Check if phone is complete (9 digits after +998)
            isValid = phoneMaskInstance.unmaskedValue.length === 12; // 998 + 9 digits
        } else {
            // Email validation
            isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
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
        setupIdentityHandler();
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

    function setupIdentityHandler() {
        if (!identityInput) return;

        identityInput.addEventListener('input', (e) => {
            if (e.detail && e.detail.unmasked) return;

            const identityIcon = document.getElementById('identity-icon');
            const identityLabel = document.querySelector('label[for="input-identity"]') || document.querySelector('.form-group:nth-child(2) label');
            
            // 1. ЖЕСТКАЯ ПРОВЕРКА НА EMAIL: есть ли буквы или @?
            const hasEmailChars = /[a-zA-Z@]/.test(identityInput.value);

            if (hasEmailChars) {
                if (phoneMaskInstance) {
                    const textBackup = identityInput.value; 
                    destroySmartMask();
                    identityInput.value = textBackup;
                }
                if (identityIcon) identityIcon.className = 'far fa-envelope field-icon';
                if (identityLabel) identityLabel.innerText = currentTab === 'register' ? 'EMAIL ДЛЯ РЕГИСТРАЦИИ' : 'EMAIL ИЛИ ТЕЛЕФОН';
                
                validateIdentity();
                return;
            }

            // 2. ЛОГИКА ДЛЯ ТЕЛЕФОНА: если в поле ТОЛЬКО цифры (или плюс)
            const currentValue = phoneMaskInstance ? phoneMaskInstance.unmaskedValue : identityInput.value;
            const isDigitsOnly = /^\+?[0-9]*$/.test(currentValue.replace(/[\s-()]/g, ''));

            if (isDigitsOnly && currentValue.length > 0) {
                if (identityIcon) identityIcon.className = 'fas fa-phone field-icon';
                if (identityLabel) identityLabel.innerText = currentTab === 'register' ? 'ТЕЛЕФОН ДЛЯ РЕГИСТРАЦИИ' : 'ТЕЛЕФОН';
                initSmartMask();
            } else if (currentValue.length === 0) {
                destroySmartMask();
                if (identityLabel) identityLabel.innerText = currentTab === 'register' ? 'Email адрес' : 'Email или телефон';
            }
            
            if (!phoneMaskInstance) {
                validateIdentity();
            }
        });
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

                submitBtn.querySelector('.btn-text').innerText = target === 'register' ? 'Зарегистрироваться' : 'Войти';
                clearErrors();
                
                // Trigger identity handler to refresh label/icon/mask
                const event = new Event('input', { bubbles: true });
                identityInput.dispatchEvent(event);

                validateForm();
            });
        });
    }

    function setupRealtimeValidation() {
        const validateField = (input, validator) => {
            input.addEventListener('input', () => {
                if (input === identityInput) return; // Handled by setupIdentityHandler

                const wrapper = input.closest('.input-wrapper');
                if (validator(input.value)) {
                    wrapper.classList.add('valid');
                    wrapper.classList.remove('error');
                } else {
                    wrapper.classList.remove('valid');
                }
                if (input === passwordInput) validatePasswordReqs();
                if (input === confirmInput || input === passwordInput) validateConfirm();
                validateForm();
            });
        };

        validateField(nameInput, val => val.trim().length >= 2);
        validateField(identityInput, null); // Handled by setupIdentityHandler
        validateField(passwordInput, val => val.length >= 8);
    }

    function validatePasswordReqs() {
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
        if (currentTab !== 'register') return;
        const wrapper = confirmInput.closest('.input-wrapper');
        const match = confirmInput.value === passwordInput.value && confirmInput.value.length > 0;
        wrapper.classList.toggle('valid', match);
    }

    function validateForm() {
        let isValid = true;
        if (currentTab === 'register') {
            const nameOk = nameInput.value.trim().length >= 2;
            
            let identityOk = false;
            if (phoneMaskInstance) {
                identityOk = phoneMaskInstance.unmaskedValue.length === 12;
            } else {
                identityOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identityInput.value);
            }

            const passOk = passwordInput.value.length >= 8 && 
                           /[a-z]/.test(passwordInput.value) && 
                           /[A-Z]/.test(passwordInput.value) && 
                           /\d/.test(passwordInput.value) && 
                           /[!@#$%^&*]/.test(passwordInput.value);
            const confirmOk = confirmInput.value === passwordInput.value;
            isValid = nameOk && identityOk && passOk && confirmOk;
        } else {
            let identityOk = false;
            if (phoneMaskInstance) {
                identityOk = phoneMaskInstance.unmaskedValue.length === 12;
            } else {
                identityOk = identityInput.value.trim().length > 0;
            }
            isValid = identityOk && passwordInput.value.length > 0;
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
            const response = await fetch(`${API_URL}/auth/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, code: code })
            });

            const data = await response.json();

            if (response.ok) {
                transitionScreens(screenOtp, screenSuccess);
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                setTimeout(() => { window.location.href = 'index.html'; }, 2500);
            } else {
                alert(data.detail || 'Неверный код подтверждения');
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
                    name: nameInput.value, 
                    email: userEmail, 
                    password: passwordInput.value 
                })
            });
            if (response.ok) {
                alert('Код отправлен повторно');
                startTimer();
            } else {
                const data = await response.json();
                alert(data.detail || 'Ошибка отправки');
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

    // --- FORM SUBMISSION ---
    async function handleSubmit(e) {
        e.preventDefault();
        
        const name = nameInput.value.trim();
        const identity = identityInput.value.trim();
        const password = passwordInput.value;

        setLoading(true, submitBtn);

        if (currentTab === 'register') {
            userEmail = identity;
            try {
                const response = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email: identity, password })
                });
                const data = await response.json();
                if (response.ok) {
                    showOTPScreen();
                } else {
                    alert(data.detail || 'Ошибка регистрации');
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
                    body: JSON.stringify({ identity, password })
                });
                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    window.location.href = 'index.html';
                } else {
                    alert(data.detail || 'Ошибка входа');
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
