(function() {
    let currentTab = 'login';
    const form = document.getElementById('auth-form');
    const submitBtn = document.getElementById('btn-submit');
    const loader = submitBtn.querySelector('.loader');
    const btnText = submitBtn.querySelector('.btn-text');

    // Field references
    const nameInput = document.getElementById('input-name');
    const identityInput = document.getElementById('input-identity');
    const passwordInput = document.getElementById('input-password');
    const confirmInput = document.getElementById('input-confirm');
    const identityIcon = document.getElementById('identity-icon');

    // Validation state
    const state = {
        name: { valid: false, touched: false },
        identity: { valid: false, touched: false, type: null },
        password: { valid: false, touched: false },
        confirm: { valid: false, touched: false }
    };

    // Initialize
    function init() {
        setupTabs();
        setupInputListeners();
        setupPasswordToggle();
        updateSubmitButton();
    }

    function setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                if (target === currentTab) return;
                
                currentTab = target;
                tabs.forEach(t => t.classList.toggle('active', t === tab));
                
                // Toggle UI
                document.getElementById('group-name').style.display = target === 'register' ? 'block' : 'none';
                document.getElementById('group-confirm').style.display = target === 'register' ? 'block' : 'none';
                document.getElementById('pass-reqs').style.display = target === 'register' ? 'block' : 'none';
                document.getElementById('forgot-link').style.display = target === 'login' ? 'block' : 'none';
                
                document.getElementById('auth-title').innerText = target === 'register' ? 'Создать аккаунт' : 'С возвращением!';
                document.getElementById('auth-subtitle').innerText = target === 'register' 
                    ? 'Заполните данные, чтобы начать пользоваться всеми функциями DachaGo.' 
                    : 'Войдите в аккаунт, чтобы продолжить поиск вашей идеальной дачи.';
                
                btnText.innerText = target === 'register' ? 'Зарегистрироваться' : 'Войти';
                
                // Reset errors on switch
                clearErrors();
                updateSubmitButton();
            });
        });
    }

    function setupInputListeners() {
        nameInput.addEventListener('input', e => {
            state.name.touched = true;
            validateName(e.target.value);
            updateSubmitButton();
        });

        identityInput.addEventListener('input', e => {
            state.identity.touched = true;
            handleIdentityInput(e);
            updateSubmitButton();
        });

        passwordInput.addEventListener('input', e => {
            state.password.touched = true;
            validatePassword(e.target.value);
            if (currentTab === 'register') validateConfirm(confirmInput.value);
            updateSubmitButton();
        });

        confirmInput.addEventListener('input', e => {
            state.confirm.touched = true;
            validateConfirm(e.target.value);
            updateSubmitButton();
        });

        form.addEventListener('submit', handleSubmit);
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

    // --- Validation Logic ---

    function validateName(val) {
        const errorEl = document.getElementById('error-name');
        const wrapper = nameInput.closest('.input-wrapper');
        const status = wrapper.querySelector('.field-status');
        
        // Regex for Lat, Cyr, Uzb chars, space, hyphen
        const nameRegex = /^[a-zA-Zа-яА-ЯёЁўЎқҚғҒҳҲ\s-]+$/;
        
        let error = '';
        if (val.length > 0 && val.length < 2) error = 'Минимум 2 символа';
        else if (val.length > 50) error = 'Максимум 50 символов';
        else if (val.length > 0 && !nameRegex.test(val)) error = 'Только буквы, пробел или дефис';

        state.name.valid = val.length >= 2 && val.length <= 50 && nameRegex.test(val);
        
        updateFieldUI(wrapper, errorEl, status, error, state.name.valid && val.length > 0);
    }

    function handleIdentityInput(e) {
        let val = e.target.value;
        const errorEl = document.getElementById('error-identity');
        const wrapper = identityInput.closest('.input-wrapper');
        const status = wrapper.querySelector('.field-status');

        // Detect if phone (starts with + or digits)
        if (val.match(/^[+\d]/)) {
            state.identity.type = 'phone';
            identityIcon.className = 'fas fa-phone field-icon';
            val = formatPhone(val);
            e.target.value = val;
            
            const raw = val.replace(/\D/g, '');
            const isValid = raw.length === 12 && raw.startsWith('998');
            state.identity.valid = isValid;
            
            let error = '';
            if (raw.length > 0 && !raw.startsWith('998')) error = 'Только номера Узбекистана (+998)';
            else if (raw.length > 0 && raw.length < 12) error = 'Номер заполнен не полностью';

            updateFieldUI(wrapper, errorEl, status, error, isValid);
        } else {
            state.identity.type = 'email';
            identityIcon.className = 'far fa-envelope field-icon';
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const isValid = emailRegex.test(val);
            state.identity.valid = isValid;
            
            let error = '';
            if (val.length > 0 && !isValid) error = 'Email введён неверно';

            updateFieldUI(wrapper, errorEl, status, error, isValid);
        }
    }

    function formatPhone(val) {
        let x = val.replace(/\D/g, '').match(/(\d{0,3})(\d{0,2})(\d{0,3})(\d{0,2})(\d{0,2})/);
        if (!x[1]) return '+';
        let formatted = '+' + x[1];
        if (x[2]) formatted += ' (' + x[2] + ')';
        if (x[3]) formatted += ' ' + x[3];
        if (x[4]) formatted += '-' + x[4];
        if (x[5]) formatted += '-' + x[5];
        return formatted;
    }

    function validatePassword(val) {
        const errorEl = document.getElementById('error-password');
        const wrapper = passwordInput.closest('.input-wrapper');
        
        const reqs = {
            length: val.length >= 8,
            case: /[a-z]/.test(val) && /[A-Z]/.test(val),
            digit: /\d/.test(val),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(val)
        };

        // Forbidden passwords
        const forbidden = ['password', 'qwerty', '12345678', 'dachago', 'admin', 'user'];
        const isForbidden = forbidden.includes(val.toLowerCase());

        if (currentTab === 'register') {
            Object.keys(reqs).forEach(key => {
                const item = document.querySelector(`.req-item[data-req="${key}"]`);
                item.classList.toggle('valid', reqs[key]);
            });
        }

        const isValid = reqs.length && reqs.case && reqs.digit && reqs.special && !isForbidden;
        state.password.valid = isValid;

        let error = '';
        if (val.length > 0) {
            if (isForbidden) error = 'Этот пароль слишком прост';
            else if (!isValid && currentTab === 'login') error = 'Пароль не соответствует требованиям';
        }

        updateFieldUI(wrapper, errorEl, null, error, isValid && val.length > 0);
    }

    function validateConfirm(val) {
        const errorEl = document.getElementById('error-confirm');
        const wrapper = confirmInput.closest('.input-wrapper');
        const status = wrapper.querySelector('.field-status');

        const isValid = val === passwordInput.value && val.length > 0;
        state.confirm.valid = isValid;

        let error = '';
        if (val.length > 0 && !isValid) error = 'Пароли не совпадают';

        updateFieldUI(wrapper, errorEl, status, error, isValid);
    }

    function updateFieldUI(wrapper, errorEl, statusEl, error, isValid) {
        if (error) {
            wrapper.classList.add('error');
            wrapper.classList.remove('success');
            if (errorEl) errorEl.innerText = error;
            if (statusEl) statusEl.innerHTML = '';
        } else if (isValid) {
            wrapper.classList.remove('error');
            wrapper.classList.add('success');
            if (errorEl) errorEl.innerText = '';
            if (statusEl) statusEl.innerHTML = '<i class="fas fa-circle-check"></i>';
        } else {
            wrapper.classList.remove('error', 'success');
            if (errorEl) errorEl.innerText = '';
            if (statusEl) statusEl.innerHTML = '';
        }
    }

    function updateSubmitButton() {
        const isLoginValid = state.identity.valid && state.password.valid;
        const isRegisterValid = state.name.valid && state.identity.valid && state.password.valid && state.confirm.valid;
        
        submitBtn.disabled = currentTab === 'login' ? !isLoginValid : !isRegisterValid;
    }

    function clearErrors() {
        document.querySelectorAll('.error-msg').forEach(el => el.innerText = '');
        document.querySelectorAll('.input-wrapper').forEach(el => el.classList.remove('error', 'success'));
        document.querySelectorAll('.field-status').forEach(el => el.innerHTML = '');
        document.querySelectorAll('.req-item').forEach(el => el.classList.remove('valid'));
    }

    // --- API Interactions ---

    async function handleSubmit(e) {
        e.preventDefault();
        if (submitBtn.disabled) return;

        setLoading(true);
        const API_URL = window.DachaGoConfig?.apiUrl || 'https://dev-net-rent.onrender.com/api/v1';
        
        const identity = identityInput.value.replace(/[^\d+]/g, ''); // Raw phone or email
        const password = passwordInput.value;
        const name = nameInput.value;

        const endpoint = currentTab === 'login' ? '/auth/login' : '/auth/register';
        const body = currentTab === 'login' 
            ? { identity, password }
            : { name, identity, identity_type: state.identity.type, password };

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = 'index.html';
            } else {
                handleApiError(data.message || 'Произошла ошибка');
            }
        } catch (err) {
            handleApiError('Не удалось связаться с сервером');
        } finally {
            setLoading(false);
        }
    }

    function setLoading(isLoading) {
        submitBtn.disabled = isLoading;
        loader.style.display = isLoading ? 'block' : 'none';
        btnText.style.display = isLoading ? 'none' : 'block';
    }

    function handleApiError(msg) {
        // Show general error or field specific
        if (msg.toLowerCase().includes('пользователь')) {
            const errorEl = document.getElementById('error-identity');
            errorEl.innerText = msg;
            identityInput.closest('.input-wrapper').classList.add('error');
        } else {
            alert(msg);
        }
    }

    // Global expose
    window.socialAuth = async function(provider) {
        alert('Социальная авторизация в разработке');
    };

    init();
})();
