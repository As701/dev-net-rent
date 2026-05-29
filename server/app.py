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

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

DB_PATH = os.path.join(os.path.dirname(__file__), 'database.sqlite')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ГЕНЕРАЦИЯ ID ПО ТЗ (#DGID + 5 цифр + Буква)
def generate_dgid():
    digits = ''.join(random.choice(string.digits) for _ in range(5))
    letter = random.choice(string.ascii_uppercase)
    return f"#DGID{digits}{letter}"

# Инициализация базы данных (логирование изменений ID)
def init_audit_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS id_audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            old_id TEXT,
            new_id TEXT,
            user_name TEXT,
            actor_id TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

init_audit_db()

@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    conn = get_db()
    u = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if u: return dict(u)
    raise HTTPException(status_code=404)

@app.post("/api/users/update")
async def update_user(data: Dict[str, Any], request: Request):
    target_uid = data.get('id')
    new_uid = data.get('new_id') # Для смены ID админом
    actor_id = data.get('actor_id', "system") # Кто меняет
    
    conn = get_db()
    
    # Если запрашивается смена ID
    if new_uid and new_uid != target_uid:
        # Логируем для супер-админа
        user_row = conn.execute("SELECT name FROM users WHERE id=?", (target_uid,)).fetchone()
        user_name = user_row['name'] if user_row else "Unknown"
        
        conn.execute("""
            INSERT INTO id_audit_logs (old_id, new_id, user_name, actor_id)
            VALUES (?, ?, ?, ?)
        """, (target_uid, new_uid, user_name, actor_id))
        
        # Обновляем ID в таблице пользователей
        conn.execute("UPDATE users SET id=? WHERE id=?", (new_uid, target_uid))
        # Обновляем ID в связанных таблицах (например, объявлениях), чтобы не было "битых" связей
        conn.execute("UPDATE listings SET owner_id=? WHERE owner_id=?", (new_uid, target_uid))
        target_uid = new_uid # Продолжаем обновление остальных полей уже под новым ID

    conn.execute("""
        UPDATE users SET name=?, avatar=?, bio=?, phone=?, email=?, verified=?, role=?
        WHERE id=?
    """, (data.get('name'), data.get('avatar'), data.get('bio'), data.get('phone'), data.get('email'), data.get('verified', 0), data.get('role', 'user'), target_uid))
    
    conn.commit()
    updated = conn.execute("SELECT * FROM users WHERE id=?", (target_uid,)).fetchone()
    conn.close()
    return dict(updated)

# Получение логов изменений ID (Только для Super Admin)
@app.get("/api/admin/audit/ids")
async def get_id_audit_logs():
    conn = get_db()
    logs = conn.execute("SELECT * FROM id_audit_logs ORDER BY timestamp DESC").fetchall()
    conn.close()
    return [dict(l) for l in logs]

@app.post("/api/login")
async def login(data: Dict[str, str]):
    val = data.get('email_or_phone', '').strip()
    name = data.get('name', '').strip()
    conn = get_db()
    # Ищем по email или телефону
    user = conn.execute("SELECT * FROM users WHERE email=? OR phone=?", (val, val)).fetchone()
    
    if not user:
        # СОЗДАЕМ НОВОГО ПОЛЬЗОВАТЕЛЯ С РАНДОМНЫМ ID ПО ТЗ
        uid = generate_dgid()
        is_email = '@' in val
        
        # Если имя не передано, генерируем из email или ставим дефолт
        if not name:
            name = val.split('@')[0] if is_email else "User"
            
        conn.execute("INSERT INTO users (id, email, phone, name, verified, role) VALUES (?,?,?,?,?,?)",
                     (uid, val if is_email else None, val if not is_email else None, name, 0, "user"))
        conn.commit()
        user = conn.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    
    conn.close()
    return dict(user)

# ПУБЛИЧНЫЕ ОБЪЯВЛЕНИЯ (ИСПРАВЛЕНИЕ 404)
@app.get("/api/listings")
async def get_listings():
    conn = get_db()
    rows = conn.execute("SELECT * FROM listings WHERE status='active' OR status IS NULL").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/listings/user/{user_id:path}")
async def get_user_listings(user_id: str):
    print(f"DEBUG: get_user_listings for {user_id}")
    conn = get_db()
    rows = conn.execute("SELECT * FROM listings WHERE owner_id = ?", (user_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ЭНДПОИНТЫ ДЛЯ СООБЩЕНИЙ (ИСПРАВЛЕНИЕ 404)
@app.get("/api/messages/conversations/{user_id}")
async def get_convs(user_id: str):
    return [] # Заглушка, чтобы не было 404

# АДМИНКА
@app.post("/api/admin/login")
async def admin_login(creds: Dict[str, str]):
    e, p = creds.get('email'), creds.get('password')
    if e == "admin@dachago.uz" and p == "admin777":
        return {"user": {"id":"#DGIDADMIN","name":"Founder","role":"super_admin"}, "redirect": "founder/dashboard.html", "token": "admin-token"}
    raise HTTPException(status_code=401)

@app.get("/api/admin/stats/advanced")
async def st():
    return {"total_users": 10, "active_listings": 5, "pending_listings": 2, "total_admins": 1, "new_users_24h": 1, "rejected_listings": 0}

@app.get("/api/admin/users/all-detailed")
async def all_users():
    conn = get_db()
    rows = conn.execute("SELECT * FROM users ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/admin/search")
async def admin_search(query: str):
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id=? OR email=? OR phone=?", (query, query, query)).fetchone()
    if user:
        return {"type": "user", "data": dict(user), "listings": []}
    raise HTTPException(status_code=404)

@app.post("/api/users/update-phone")
async def update_phone(data: Dict[str, str]):
    uid = data.get('id'); new_phone = data.get('phone')
    conn = get_db(); conn.execute("UPDATE users SET phone=? WHERE id=?", (new_phone, uid)); conn.commit(); conn.close()
    return {"ok": True}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5005)
