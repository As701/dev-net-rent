import os
import random
import jwt
import bcrypt
import string
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
import resend
from databases import Database
from sqlalchemy import create_engine, MetaData, Table, Column, String, Boolean, DateTime, Float, Integer

# 1. DATABASE CONFIGURATION
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./database.sqlite"

database = Database(DATABASE_URL)
metadata = MetaData()

# USERS TABLE
users_table = Table(
    "users",
    metadata,
    Column("id", String, primary_key=True),
    Column("email", String, unique=True),
    Column("phone", String, unique=True, nullable=True),
    Column("name", String),
    Column("password", String),
    Column("role", String, default="user"),
    Column("otp", String, nullable=True),
    Column("expire", DateTime, nullable=True),
    Column("is_verified", Boolean, default=False),
    Column("created_at", DateTime, default=datetime.utcnow)
)

# LISTINGS TABLE
listings_table = Table(
    "listings",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("title", String),
    Column("location", String),
    Column("price", Float),
    Column("type", String),
    Column("image", String),
    Column("status", String, default="active")
)

SECRET_KEY = "DACHAGO_ULTRA_SECURE_PRODUCTION_KEY_2026_LONG_AND_UNIQUE"

app = FastAPI()

@app.on_event("startup")
async def startup():
    await database.connect()
    db_url = DATABASE_URL
    if "postgresql" in db_url and "+psycopg2" not in db_url:
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://")
    engine = create_engine(db_url)
    metadata.create_all(engine)

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def send_otp_email(to_email, name, code):
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        print(f"DEBUG: OTP for {to_email} is {code} (RESEND_API_KEY MISSING)")
        return True
    
    resend.api_key = api_key
    
    # Clean HTML template
    html_body = f"""
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2b96cd; text-align: center;">DachaGo</h2>
        <p>Здравствуйте, <strong>{name}</strong>!</p>
        <p>Ваш код для подтверждения регистрации:</p>
        <div style="background: #f4f7f9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1a1d1e;">{code}</span>
        </div>
        <p style="font-size: 12px; color: #9ba5b7;">Код действителен в течение 5 минут. Если вы не запрашивали этот код, просто проигнорируйте письмо.</p>
    </div>
    """
    
    try:
        resend.Emails.send({
            "from": "DachaGo <noreply@dacha-go.uz>",
            "to": [to_email],
            "subject": "Код подтверждения регистрации DachaGo",
            "html": html_body
        })
        print(f"SUCCESS: Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"ERROR sending email: {str(e)}")
        return False

def generate_dgid():
    digits = ''.join(random.choice(string.digits) for _ in range(5))
    letter = random.choice(string.ascii_uppercase)
    return f"#DGID{digits}{letter}"

# --- AUTH ENDPOINTS ---

@app.post("/api/auth/register")
async def register(data: Dict[str, str]):
    try:
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')

        if not name or not email or not password:
            raise HTTPException(status_code=400, detail="Все поля обязательны")

        query = users_table.select().where(users_table.c.email == email)
        existing = await database.fetch_one(query)

        otp_code = str(random.randint(100000, 999999))
        expire_time = datetime.utcnow() + timedelta(minutes=5)
        hashed_pass = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        if existing:
            if existing['is_verified']:
                raise HTTPException(status_code=400, detail="Этот Email уже занят")
            
            upd_query = users_table.update().where(users_table.c.email == email).values(
                name=name,
                password=hashed_pass,
                otp=otp_code,
                expire=expire_time
            )
            await database.execute(upd_query)
        else:
            uid = generate_dgid()
            ins_query = users_table.insert().values(
                id=uid,
                email=email,
                name=name,
                password=hashed_pass,
                otp=otp_code,
                expire=expire_time,
                is_verified=False
            )
            await database.execute(ins_query)

        await send_otp_email(email, name, otp_code)
        return {"status": "success", "message": "Код отправлен"}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"REGISTRATION ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail="Ошибка сервера при регистрации")

@app.post("/api/auth/verify")
async def verify_code(data: Dict[str, str]):
    try:
        email = data.get('email')
        code = data.get('code')

        query = users_table.select().where(users_table.c.email == email)
        user = await database.fetch_one(query)

        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")

        if user['is_verified']:
            return {"status": "success", "message": "Аккаунт уже подтвержден"}

        if user['otp'] != code:
            raise HTTPException(status_code=400, detail="Неверный код подтверждения")

        if datetime.utcnow() > user['expire']:
            raise HTTPException(status_code=400, detail="Срок действия кода истек")

        upd_query = users_table.update().where(users_table.c.email == email).values(
            is_verified=True,
            otp=None,
            expire=None
        )
        await database.execute(upd_query)

        token = jwt.encode({
            "sub": user['id'],
            "exp": datetime.utcnow() + timedelta(days=7)
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
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"VERIFY ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail="Ошибка сервера при верификации")

@app.post("/api/auth/login")
async def login(data: Dict[str, str]):
    try:
        identity = data.get('identity') or data.get('email')
        password = data.get('password')

        query = users_table.select().where((users_table.c.email == identity) | (users_table.c.phone == identity))
        user = await database.fetch_one(query)

        if not user:
            raise HTTPException(status_code=401, detail="Пользователь не найден")

        if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            raise HTTPException(status_code=401, detail="Неверный пароль")

        if not user['is_verified']:
            raise HTTPException(status_code=403, detail="Email не подтвержден")

        token = jwt.encode({
            "sub": user['id'],
            "exp": datetime.utcnow() + timedelta(days=7)
        }, SECRET_KEY, algorithm="HS256")

        return {
            "status": "success",
            "token": token,
            "user": {
                "id": user['id'],
                "name": user['name'],
                "email": user['email']
            }
        }
    except Exception as e:
        print(f"LOGIN ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail="Ошибка сервера при входе")

@app.get("/api/users/me")
async def get_me(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")

        query = users_table.select().where(users_table.c.id == user_id)
        user = await database.fetch_one(query)

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "id": user['id'],
            "name": user['name'],
            "email": user['email'],
            "phone": user['phone'],
            "role": user['role']
        }
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/api/listings")
async def get_listings():
    query = listings_table.select().where(listings_table.c.status == 'active')
    rows = await database.fetch_all(query)
    return [dict(r) for r in rows]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
