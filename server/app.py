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
SECRET_KEY = "DACHA_GO_ULTRA_SECRET_KEY_2026" # В реальном проекте брать из .env

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
    if not SMTP_USER or not SMTP_PASS:
        print(f"DEBUG: Email to {to_email} with code {code} (SMTP not configured)")
        return True
    
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USER
        msg['To'] = to_email
        msg['Subject'] = "Код подтверждения DachaGo"
        
        body = f"Привет, {name}!\n\nВаш код подтверждения: {code}\nОн будет действовать 5 минут."
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"SMTP Error: {e}")
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
    existing = conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")
    
    hashed_pass = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    otp_code = str(random.randint(100000, 999999))
    expires_at = (datetime.datetime.now() + datetime.timedelta(minutes=5)).strftime("%Y-%m-%d %H:%M:%S")
    uid = generate_dgid()
    
    try:
        conn.execute("""
            INSERT INTO users (id, name, email, password, is_verified, verification_code, code_expires_at, role)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (uid, name, email, hashed_pass, False, otp_code, expires_at, "user"))
        conn.commit()
        
        send_otp_email(email, name, otp_code)
            
        conn.close()
        return {"success": True, "message": "Код отправлен на почту"}
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/verify")
async def verify(data: Dict[str, str]):
    email = data.get('email')
    code = data.get('code')
    
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    if user['verification_code'] != code:
        conn.close()
        raise HTTPException(status_code=400, detail="Неверный код подтверждения")
    
    expiry = datetime.datetime.strptime(user['code_expires_at'], "%Y-%m-%d %H:%M:%S")
    if datetime.datetime.now() > expiry:
        conn.close()
        raise HTTPException(status_code=400, detail="Срок действия кода истек")
    
    conn.execute("UPDATE users SET is_verified=1, verification_code=NULL, code_expires_at=NULL WHERE email=?", (email,))
    conn.commit()
    
    # Генерация токена
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

@app.post("/api/login")
async def login_legacy(data: Dict[str, str]):
    return await login_modern({"identity": data.get('email_or_phone'), "password": data.get('password')})

@app.get("/api/listings")
async def get_listings():
    conn = get_db()
    rows = conn.execute("SELECT * FROM listings WHERE status='active' OR status IS NULL").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    conn = get_db()
    u = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if u: return dict(u)
    raise HTTPException(status_code=404)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5005)
