(function() {
    let currentTab = 'login';
    let userEmail = ''; 
    let timerInterval = null;

    const API_URL = window.DachaGoConfig?.apiUrl || 'https://dev-net-rent.onrender.com/api/v1';

    // Elements
    const screenInput = document.getElementById('screen-input');
    const screenOtp = document.getElementById('screen-otp');
    const screenSuccess = document.getElementById('screen-success');
    const authHeader = document.getElementById('auth-header');
    
    const form = document.getElementById('auth-form');
    const submitBtn = document.getElementById('btn-submit');
    const verifyBtn = document.getElementById('btn-verify-otp');
    const otpInput = document.getElementById('otp-main-input');
    const timerEl = document.getElementById('otp-timer');
    const resendBtn = document.getElementById('resend-otp');
    const displayEmail = document.getElementById('display-user-email');

    const nameInput = document.getElementById('input-name');
    const identityInput = document.getElementById('input-identity');
    const passwordInput = document.getElementById('input-password');

    // Initialize
    function init() {
        setupTabs();
        setupPasswordToggle();
        form.addEventListener('submit', handleSubmit);
        if (verifyBtn) verifyBtn.addEventListener('click', handleVerifyOTP);
        if (resendBtn) resendBtn.addEventListener('click', handleResendOTP);
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
                
                submitBtn.querySelector('.btn-text').innerText = target === 'register' ? 'Зарегистрироваться' : 'Войти';
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
    function startTimer() {
        let seconds = 59;
        resendBtn.classList.add('disabled');
        if (timerInterval) clearInterval(timerInterval);
        
        timerInterval = setInterval(() => {
            const displaySec = seconds < 10 ? '0' + seconds : seconds;
            timerEl.innerText = `Повторный запрос кода доступен через 00:${displaySec}`;
            if (seconds <= 0) {
                clearInterval(timerInterval);
                timerEl.innerText = 'Вы можете запросить код повторно';
                resendBtn.classList.remove('disabled');
            }
            seconds--;
        }, 1000);
    }

    async function handleVerifyOTP() {
        const code = otpInput.value.trim();
        if (code.length !== 6) return alert('Введите 6 цифр кода');

        setLoading(true, verifyBtn);
        try {
            const response = await fetch(`${API_URL}/auth/verify-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, code: code })
            });

            const data = await response.json();

            if (response.ok) {
                showSuccess();
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                setTimeout(() => { window.location.href = 'index.html'; }, 2500);
            } else {
                alert(data.detail || 'Неверный код подтверждения');
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
        screenInput.classList.add('exit');
        authHeader.style.display = 'none';
        displayEmail.innerText = userEmail;
        setTimeout(() => {
            screenInput.classList.remove('active', 'exit');
            screenOtp.classList.add('active');
            startTimer();
            otpInput.focus();
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

        // Validation
        if (currentTab === 'register' && name.length < 2) return showError('name', 'Минимум 2 символа');
        if (!identity) return showError('identity', 'Введите email или телефон');
        if (password.length < 8) return showError('password', 'Минимум 8 символов');
        if (!/[A-Z]/.test(password) || !/\d/.test(password)) return showError('password', 'Нужна заглавная буква и цифра');

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
        loader.style.display = isLoading ? 'block' : 'none';
        btnText.style.display = isLoading ? 'none' : 'block';
    }

    function showError(field, msg) {
        const errEl = document.getElementById(`error-${field}`);
        if (errEl) errEl.innerText = msg;
        const wrapper = document.getElementById(`input-${field}`).closest('.input-wrapper');
        wrapper.classList.add('error');
        setTimeout(() => wrapper.classList.remove('error'), 3000);
    }

    function clearErrors() {
        document.querySelectorAll('.error-msg').forEach(el => el.innerText = '');
        document.querySelectorAll('.input-wrapper').forEach(el => el.classList.remove('error'));
    }

    init();
})();
