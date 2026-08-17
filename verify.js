document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) { window.location.href = 'auth.html'; return; }

    const seriesInput = document.getElementById('passport-series');
    const numberInput = document.getElementById('passport-number');
    const startCameraBtn = document.getElementById('start-camera-btn');
    const captureBtn = document.getElementById('capture-btn');
    const submitBtn = document.getElementById('submit-verify-btn');
    const video = document.getElementById('video-stream');
    const videoWrap = document.getElementById('video-wrap');
    const gestureDisplay = document.getElementById('gesture-display');
    const cameraHint = document.getElementById('camera-hint');
    const previewContainer = document.getElementById('preview-img-container');
    const previewImg = document.getElementById('preview-img');
    const successBadge = document.getElementById('liveness-success');
    const canvas = document.getElementById('capture-canvas');

    let stream = null;
    let capturedImage = null;
    const gestures = ["🖖🏻", "✌🏻", "👌🏻", "🤘🏻", "🤙🏻"];

    // --- CAMERA LOGIC ---
    startCameraBtn.onclick = async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
            video.srcObject = stream;
            videoWrap.style.display = 'block';
            gestureDisplay.style.display = 'block';
            captureBtn.style.display = 'block';
            startCameraBtn.style.display = 'none';
            cameraHint.style.display = 'none';

            // Randomize gesture
            const randomGesture = gestures[Math.floor(Math.random() * gestures.length)];
            gestureDisplay.innerText = `Покажите жест: ${randomGesture}`;
        } catch (err) {
            alert("Ошибка доступа к камере. Пожалуйста, разрешите доступ в настройках.");
            console.error(err);
        }
    };

    captureBtn.onclick = () => {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        capturedImage = canvas.toDataURL('image/jpeg', 0.8);
        previewImg.src = capturedImage;
        
        // Stop stream
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        videoWrap.style.display = 'none';
        gestureDisplay.style.display = 'none';
        captureBtn.style.display = 'none';
        previewContainer.style.display = 'block';
        successBadge.style.display = 'flex';
        
        validate();
    };

    // --- VALIDATION ---
    function validate() {
        const series = seriesInput.value.trim();
        const number = numberInput.value.trim();
        const isPassportValid = series.length === 2 && number.length === 7;
        
        submitBtn.disabled = !(isPassportValid && capturedImage);
    }

    seriesInput.oninput = validate;
    numberInput.oninput = validate;

    // --- SUBMIT ---
    submitBtn.onclick = async () => {
        const API_URL = window.DachaGoConfig?.apiUrl || 'https://dev-net-rent.onrender.com/api/v1';
        const token = localStorage.getItem('token');

        submitBtn.disabled = true;
        submitBtn.innerText = "Отправка...";

        const payload = {
            passport: {
                series: seriesInput.value.toUpperCase(),
                number: numberInput.value
            },
            liveness_img: capturedImage
        };

        try {
            // We use a specific endpoint for user verification
            const res = await fetch(`${API_URL}/users/verify-identity`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (res.ok) {
                alert("Данные успешно отправлены на проверку! Модерация займет до 24 часов.");
                window.location.href = 'profile.html';
            } else {
                alert("Ошибка: " + (result.detail || "Не удалось отправить данные"));
                submitBtn.disabled = false;
                submitBtn.innerText = "Отправить на проверку";
            }
        } catch (err) {
            alert("Ошибка сети. Попробуйте позже.");
            submitBtn.disabled = false;
            submitBtn.innerText = "Отправить на проверку";
        }
    };
});
