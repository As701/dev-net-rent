(function() {
    let currentTab = 'login';
    let userEmail = ''; // To store email for verification

    const API_URL = window.DachaGoConfig?.apiUrl || 'https://dev-net-rent.onrender.com/api/v1';

    // Elements
    const screenInput = document.getElementById('screen-input');
    const screenOtp = document.getElementById('screen-otp');
    const screenSuccess = document.getElementById('screen-success');
    const authHeader = document.getElementById('auth-header');
    
    const form = document.getElementById('auth-form');
    const submitBtn = document.getElementById('btn-submit');
    const loader = submitBtn.querySelector('.loader');
    const btnText = submitBtn.querySelector('.btn-text');

    const nameInput = document.getElementById('input-name');
    const identityInput = document.getElementById('input-identity');
    const passwordInput = document.getElementById('input-password');
    const otpInputs = document.querySelectorAll('.otp-input');

    // Initialize
    function init() {
        setupTabs();
        setupOTPLogic();
        setupPasswordToggle();
        form.addEventListener('submit', handleSubmit);
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
                
                document.getElementById('auth-title').innerText = target === 'register' ? 'Создать аккаунт' : 'С возвращением!';
                document.getElementById('auth-subtitle').innerText = target === 'register' 
                    ? 'Заполните данные, чтобы начать пользоваться всеми функциями DachaGo.' 
                    : 'Войдите в аккаунт, чтобы продолжить поиск вашей идеальной дачи.';
                
                btnText.innerText = target === 'register' ? 'Зарегистрироваться' : 'Войти';
                clearErrors();
            });
        });
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
    function setupOTPLogic() {
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                if (e.target.value.length > 1) {
                    e.target.value = e.target.value.slice(0, 1);
                }
                if (e.target.value && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
                checkOTPComplete();
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });
        });
    }

    async function checkOTPComplete() {
        const code = Array.from(otpInputs).map(i => i.value).join('');
        if (code.length === 6) {
            // Disable inputs during verification
            otpInputs.forEach(i => i.disabled = true);
            await verifyOTP(code);
        }
    }

    async function verifyOTP(code) {
        try {
            const response = await fetch(`${API_URL}/auth/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, code: code })
            });

            const data = await response.json();

            if (response.ok) {
                showSuccess();
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2500);
            } else {
                alert(data.detail || 'Неверный код');
                otpInputs.forEach(i => { i.disabled = false; i.value = ''; });
                otpInputs[0].focus();
            }
        } catch (err) {
            alert('Ошибка связи с сервером');
            otpInputs.forEach(i => i.disabled = false);
        }
    }

    // --- SCREEN TRANSITIONS ---
    function showOTPScreen() {
        screenInput.classList.add('exit');
        authHeader.style.display = 'none';
        setTimeout(() => {
            screenInput.classList.remove('active', 'exit');
            screenOtp.classList.add('active');
            otpInputs[0].focus();
        }, 400);
    }

    function showSuccess() {
        screenOtp.classList.add('exit');
        setTimeout(() => {
            screenOtp.classList.remove('active', 'exit');
            screenSuccess.classList.add('active');
        }, 400);
    }

    // --- FORM SUBMISSION ---
    async function handleSubmit(e) {
        e.preventDefault();
        
        const name = nameInput.value.trim();
        const identity = identityInput.value.trim();
        const password = passwordInput.value;

        // Simple validation
        if (currentTab === 'register' && !name) return showError('name', 'Введите имя');
        if (!identity) return showError('identity', 'Введите email или телефон');
        if (password.length < 8) return showError('password', 'Минимум 8 символов');

        setLoading(true);

        if (currentTab === 'register') {
            userEmail = identity; // Assume identity is email for OTP
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
                setLoading(false);
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
                setLoading(false);
            }
        }
    }

    function setLoading(isLoading) {
        submitBtn.disabled = isLoading;
        loader.style.display = isLoading ? 'block' : 'none';
        btnText.style.display = isLoading ? 'none' : 'block';
    }

    function showError(field, msg) {
        const errEl = document.getElementById(`error-${field}`);
        if (errEl) errEl.innerText = msg;
        const wrapper = document.getElementById(`input-${field}`).closest('.input-wrapper');
        wrapper.classList.add('error');
    }

    function clearErrors() {
        document.querySelectorAll('.error-msg').forEach(el => el.innerText = '');
        document.querySelectorAll('.input-wrapper').forEach(el => el.classList.remove('error'));
    }

    init();
})();
