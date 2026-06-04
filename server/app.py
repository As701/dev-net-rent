import resend
import os
from fastapi import FastAPI, HTTPException, Body, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any
import sqlite3
import uuid
import uvicorn
import json
import os
import random
import string
import jwt
import bcrypt
import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(os.path.dirname(__file__), 'database.sqlite')
SECRET_KEY = "DACHA_GO_ULTRA_SECRET_KEY_2026" 

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT UNIQUE,
            phone TEXT UNIQUE,
            password TEXT,
            role TEXT DEFAULT 'user',
            is_verified BOOLEAN DEFAULT 0,
            verification_code TEXT,
            code_expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS listings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            location TEXT,
            price REAL,
            type TEXT,
            image TEXT,
            status TEXT DEFAULT 'active'
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# SMTP CONFIG (PLACEHOLDERS)
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def generate_dgid():
    digits = ''.join(random.choice(string.digits) for _ in range(5))
    letter = random.choice(string.ascii_uppercase)
    return f"#DGID{digits}{letter}"

def send_otp_email(to_email, name, code):
    api_key = os.environ.get('RESEND_API_KEY')
    if not api_key:
        print(f'DEBUG: OTP for {to_email} is {code} (RESEND_API_KEY not set)')
        return True
    resend.api_key = api_key
    html_content = f'''
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2b96cd; text-align: center;">DachaGo</h2>
        <p>Здравствуйте, <strong>{name}</strong>!</p>
        <p>Ваш код для подтверждения регистрации:</p>
        <div style="background: #f4f7f9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1a1d1e;">{code}</span>
        </div>
        <p style="font-size: 12px; color: #9ba5b7;">Код действителен в течение 5 минут. Если вы не запрашивали этот код, просто проигнорируйте письмо.</p>
    </div>
    '''
    try:
        resend.Emails.send({
            "from": "DachaGo <noreply@dacha-go.uz>",
            "to": [to_email],
            "subject": "Код подтверждения регистрации DachaGo",
            "html": html_content
        })
        return True
    except Exception as e:
        print(f'Resend Error: {e}')
        return False

# --- AUTH ENDPOINTS ---

@app.post("/api/auth/register")
async def register(data: Dict[str, str]):
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    
    if not name or not email or not password:
        raise HTTPException(status_code=400, detail="Все поля обязательны")
    
    conn = get_db()
    existing = conn.execute("SELECT id, is_verified FROM users WHERE email=?", (email,)).fetchone()
    
    if existing:
        if existing['is_verified']:
            conn.close()
            raise HTTPException(status_code=400, detail="Этот Email уже занят")
        
        otp_code = str(random.randint(100000, 999999))
        expires_at = (datetime.datetime.now() + datetime.timedelta(minutes=5)).strftime("%Y-%m-%d %H:%M:%S")
        hashed_pass = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        conn.execute('''
            UPDATE users SET verification_code=?, code_expires_at=?, name=?, password=? WHERE email=?
        ''', (otp_code, expires_at, name, hashed_pass, email))
        conn.commit()
        send_otp_email(email, name, otp_code)
        conn.close()
        return {"status": "success", "message": "Код отправлен на почту"}

    hashed_pass = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    otp_code = str(random.randint(100000, 999999))
    expires_at = (datetime.datetime.now() + datetime.timedelta(minutes=5)).strftime("%Y-%m-%d %H:%M:%S")
    uid = generate_dgid()
    
    try:
        conn.execute('''
            INSERT INTO users (id, name, email, password, is_verified, verification_code, code_expires_at, role)
            VALUES (?, ?, ?, ?, 0, ?, ?, ?)
        ''', (uid, name, email, hashed_pass, otp_code, expires_at, "user"))
        conn.commit()
        send_otp_email(email, name, otp_code)
        conn.close()
        return {"status": "success", "message": "Код отправлен на почту"}
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/verify")
async def verify_code(data: Dict[str, str]):
    email = data.get('email')
    code = data.get('code')
    
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    if user['is_verified']:
        conn.close()
        raise HTTPException(status_code=400, detail="Аккаунт уже подтвержден")
    
    if user['verification_code'] != code:
        conn.close()
        raise HTTPException(status_code=400, detail="Неверный код подтверждения")
    
    expiry = datetime.datetime.strptime(user['code_expires_at'], "%Y-%m-%d %H:%M:%S")
    if datetime.datetime.now() > expiry:
        conn.close()
        raise HTTPException(status_code=400, detail="Срок действия кода истек. Запросите новый код.")
    
    conn.execute("UPDATE users SET is_verified=1, verification_code=NULL, code_expires_at=NULL WHERE email=?", (email,))
    conn.commit()
    
    token = jwt.encode({
        "sub": user['id'],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }, SECRET_KEY, algorithm="HS256")
    
    res = {
        "success": True,
        "token": token,
        "user": {
            "id": user['id'],
            "name": user['name'],
            "email": user['email']
        }
    }
    conn.close()
    return res

@app.post("/api/auth/login")
async def login_modern(data: Dict[str, str]):
    identity = data.get('identity')
    password = data.get('password')
    
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email=? OR phone=?", (identity, identity)).fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    
    if not user['password']: 
        raise HTTPException(status_code=401, detail="Для этого аккаунта не установлен пароль.")
        
    if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Неверный пароль")
        
    if not user['is_verified'] and user['email']:
        raise HTTPException(status_code=403, detail="Email не подтвержден")

    token = jwt.encode({
        "sub": user['id'],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }, SECRET_KEY, algorithm="HS256")
    
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user['id'],
            "name": user['name'],
            "email": user['email']
        }
    }

@app.get("/api/listings")
async def get_listings():
    conn = get_db()
    rows = conn.execute("SELECT * FROM listings WHERE status='active' OR status IS NULL").fetchall()
    conn.close()
    return [dict(r) for r in rows]

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5005)