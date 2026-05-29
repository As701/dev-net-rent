const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 8080;

app.use(cors({ origin: '*' }));
app.use(bodyParser.json());

// ЛОГИРУЕМ КАЖДЫЙ ЗАПРОС
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// ГАРАНТИРОВАННЫЙ ВХОД ДЛЯ АСИЛБЕКА (БЕЗ БАЗЫ)
app.post('/api/login', (req, res) => {
    const { email_or_phone, password } = req.body;
    console.log(`Попытка входа для: ${email_or_phone}`);

    // Прямая проверка пароля
    if (email_or_phone === 'user@dachago.uz' && password === 'password123') {
        console.log('--- УСПЕШНЫЙ ВХОД (ЖЕСТКО ПРОПИСАН) ---');
        return res.json({ 
            id: 'admin-id-fixed', 
            email: 'user@dachago.uz', 
            name: 'Asilbek' 
        });
    }

    res.status(401).json({ error: "Неправильный логин или пароль" });
});

app.get('/api/listings', (req, res) => {
    res.json([{
        id: 1,
        title: 'Элитная дача в Чимгане',
        location: 'Чимган',
        price: 1500000,
        image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=400'
    }]);
});

// Слушаем на 127.0.0.1 (локальный адрес)
app.listen(PORT, '127.0.0.1', () => {
    console.log(`--- СЕРВЕР ЗАПУЩЕН НА http://127.0.0.1:8080 ---`);
    console.log('--- БЕЗ БАЗЫ ДАННЫХ ДЛЯ ТЕСТА ВХОДА ---');
});
