(function() {
    let currentTab = 'login';
    let userEmail = ''; 
    let timerInterval = null;

    const API_URL = window.DachaGoConfig?.apiUrl || 'http://localhost:5005/api';

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

    const otpFields = document.querySelectorAll('.otp-field');

    const nameInput = document.getElementById('input-name');
    const identityInput = document.getElementById('input-identity');
    const passwordInput = document.getElementById('input-password');
    const confirmInput = document.getElementById('input-confirm');
    const passReqsBox = document.getElementById('pass-reqs');

    // Initialize
    function init() {
        setupTabs();
        setupPasswordToggle();
        setupIdentityInput();
        setupRealtimeValidation();
        setupOTPInputs();
        form.addEventListener('submit', handleSubmit);
        if (verifyBtn) verifyBtn.addEventListener('click', handleVerifyOTP);
        if (resendBtn) resendBtn.addEventListener('click', handleResendOTP);
        
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
            to.classList.add('active');
        }, 400);
    }

    // --- PHONE MASK LOGIC ---
    function setupIdentityInput() {
        identityInput.addEventListener('input', (e) => {
            let val = identityInput.value;
            const icon = document.getElementById('identity-icon');
            
            if (/^\+?\d/.test(val)) {
                icon.className = 'fas fa-phone field-icon';
                applyPhoneMask(e);
            } else {
                icon.className = 'far fa-envelope field-icon';
            }
            validateForm();
        });
    }

    function applyPhoneMask(e) {
        let val = identityInput.value.replace(/\D/g, ''); 
        
        if (val.startsWith('998')) {
            val = val.substring(3);
        }

        let formatted = '+998 ';
        if (val.length > 0) formatted += '(' + val.substring(0, 2);
        if (val.length >= 2) formatted += ') ';
        if (val.length > 2) formatted += val.substring(2, 5);
        if (val.length >= 5) formatted += '-';
        if (val.length > 5) formatted += val.substring(5, 7);
        if (val.length >= 7) formatted += '-';
        if (val.length > 7) formatted += val.substring(7, 9);
        
        identityInput.value = formatted.trim();
    }

    // --- REALTIME VALIDATION ---
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
            if (confirmInput.value) updateFieldUI(confirmInput, confirmInput.value === passwordInput.value);
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
        const identVal = identityInput.value;
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identVal);
        const isPhone = /^\+998 \(\d{2}\) \d{3}-\d{2}-\d{2}$/.test(identVal);
        const identOk = isEmail || isPhone;
        const passOk = passwordInput.closest('.input-wrapper').classList.contains('valid');
        const confirmOk = confirmInput.value === passwordInput.value && confirmInput.value.length > 0;

        const allOk = nameOk && identOk && passOk && confirmOk;
        const identWrapper = identityInput.closest('.input-wrapper');
        identWrapper.classList.toggle('valid', identOk);
        submitBtn.disabled = !allOk;
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
                submitBtn.querySelector('.btn-text').innerText = target === 'register' ? 'Зарегистрироваться' : 'Войти';
                clearErrors();
                validateForm();
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

    function setupOTPInputs() {
        otpFields.forEach((field, index) => {
            field.addEventListener('input', (e) => {
                field.value = field.value.replace(/[^0-9]/g, '');
                if (field.value.length === 1 && index < otpFields.length - 1) otpFields[index + 1].focus();
                if (Array.from(otpFields).every(f => f.value.length === 1)) handleVerifyOTP();
            });
            field.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && field.value.length === 0 && index > 0) otpFields[index - 1].focus();
            });
        });
    }

    async function handleVerifyOTP() {
        const code = Array.from(otpFields).map(f => f.value).join('');
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
                alert(data.detail || 'Неверный код');
                otpFields.forEach(f => f.value = '');
                otpFields[0].focus();
            }
        } catch (err) { alert('Ошибка связи'); } finally { setLoading(false, verifyBtn); }
    }

    async function handleResendOTP(e) {
        e.preventDefault();
        if (resendBtn.classList.contains('disabled')) return;
        try {
            await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nameInput.value, email: userEmail, password: passwordInput.value })
            });
            alert('Код отправлен');
            startTimer();
        } catch (err) { alert('Ошибка'); }
    }

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
                if (response.ok) {
                    authHeader.style.display = 'none';
                    displayEmail.innerText = userEmail;
                    transitionScreens(screenInput, screenOtp);
                    startTimer();
                    setTimeout(() => otpFields[0].focus(), 500);
                } else {
                    const data = await response.json();
                    alert(data.detail || 'Ошибка регистрации');
                }
            } catch (err) { alert('Ошибка сервера'); } finally { setLoading(false, submitBtn); }
        } else {
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
                } else { alert(data.detail || 'Ошибка входа'); }
            } catch (err) { alert('Ошибка'); } finally { setLoading(false, submitBtn); }
        }
    }

    function startTimer() {
        let seconds = 59;
        resendBtn.classList.add('disabled');
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            const displaySec = seconds < 10 ? '0' + seconds : seconds;
            timerEl.innerText = `Отправить повторно через 00:${displaySec}`;
            if (seconds <= 0) { clearInterval(timerInterval); timerEl.innerText = 'Вы можете запросить код повторно'; resendBtn.classList.remove('disabled'); }
            seconds--;
        }, 1000);
    }

    function setLoading(isLoading, btn) {
        const loader = btn.querySelector('.loader');
        const btnText = btn.querySelector('.btn-text');
        btn.disabled = isLoading;
        if (loader) loader.style.display = isLoading ? 'block' : 'none';
        if (btnText) btnText.style.display = isLoading ? 'none' : 'block';
    }

    function clearErrors() {
        document.querySelectorAll('.error-msg').forEach(el => el.innerText = '');
        document.querySelectorAll('.input-wrapper').forEach(el => el.classList.remove('error', 'valid'));
    }

    init();
})();