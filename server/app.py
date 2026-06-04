import os
import random
import jwt
import bcrypt
import string
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Request, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import resend
from databases import Database
from sqlalchemy import create_engine, MetaData, Table, Column, String, Boolean, DateTime, Float, Integer, text

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 1. DATABASE CONFIGURATION
DATABASE_URL = os.environ.get("DATABASE_URL")

# Автоматически адаптируем строку под требования асинхронного драйвера PostgreSQL
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif not DATABASE_URL:
    DATABASE_URL = "sqlite+aiosqlite:///./database.sqlite"

database = Database(DATABASE_URL)
metadata = MetaData()

# NEW SCHEMA AS PER TZ
users_table = Table(
    "users",
    metadata,
    Column("id", String, primary_key=True),
    Column("name", String(100)),
    Column("email", String(255), unique=True, nullable=False),
    Column("phone", String(20), nullable=True),
    Column("password", String, nullable=False),
    Column("otp", String, nullable=True),
    Column("expire", DateTime, nullable=True),
    Column("verified", Boolean, default=False),
    Column("role", String, default="user"),
    Column("created_at", DateTime, default=datetime.utcnow)
)

# Keep otp_codes_table for compatibility if needed, but primary logic moves to users_table
otp_codes_table = Table(
    "otp_codes",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("email", String(255), nullable=False),
    Column("code", String(6), nullable=False),
    Column("expires_at", DateTime, nullable=False),
    Column("attempts", Integer, default=0),
    Column("created_at", DateTime, default=datetime.utcnow)
)

listings_table = Table(
    "listings",
    metadata,
    Column("id", String, primary_key=True),
    Column("title", String),
    Column("location", String),
    Column("price", Float),
    Column("type", String),
    Column("image", String),
    Column("status", String, default="active")
)

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "DACHAGO_ULTRA_SECURE_PRODUCTION_KEY_2026")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await database.connect()

    # Sync operation engine
    sync_db_url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql+psycopg2://") if "postgresql+asyncpg://" in DATABASE_URL else DATABASE_URL
    sync_db_url = sync_db_url.replace("sqlite+aiosqlite://", "sqlite://") if "sqlite+aiosqlite://" in sync_db_url else sync_db_url

    engine = create_engine(sync_db_url)

    if os.environ.get("REFRESH_DB") == "true":
        logger.info("REFRESHING DATABASE TABLES...")
        metadata.drop_all(engine)

    metadata.create_all(engine)
    logger.info("Database tables verified/created.")

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

# --- EMAIL LOGIC ---
async def send_otp_email(to_email, name, code):
    api_key = os.environ.get("RESEND_API_KEY", "re_F2KYsdkL_7EsUSawHYxXb34RsDjyG5kVw")
    resend.api_key = api_key

    html_body = f"""
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2b96cd; text-align: center;">DachaGo</h2>
        <p>Здравствуйте, <strong>{name}</strong>!</p>
        <p>Ваш код подтверждения регистрации:</p>
        <div style="background: #f4f7f9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1a1d1e;">{code}</span>
        </div>
        <p style="font-size: 12px; color: #9ba5b7;">Код действителен в течение 10 минут. Если вы не запрашивали этот код, просто проигнорируйте письмо.</p>  
    </div>
    """

    try:
        resend.Emails.send({
            "from": "DachaGo <noreply@dacha-go.uz>",
            "to": [to_email],
            "subject": "Подтверждение регистрации DachaGo",
            "html": html_body
        })
        logger.info(f"OTP sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        return False

def generate_dgid():
    digits = ''.join(random.choice(string.digits) for _ in range(5))
    letter = random.choice(string.ascii_uppercase)
    return f"#DGID{digits}{letter}"

# --- API V1 AUTH ENDPOINTS ---

@app.post("/api/v1/auth/register")
async def register(request: Request, background_tasks: BackgroundTasks):       
    try:
        data = await request.json()
        name = data.get('name')
        raw_email = data.get('email')
        password = data.get('password')

        if not name or not raw_email or not password:
            raise HTTPException(status_code=400, detail="Все поля обязательны")

        # ПОЧИНКА 1: Переводим в нижний регистр
        email = raw_email.lower().strip()

        # Check existing user
        query = users_table.select().where(users_table.c.email == email)       
        existing = await database.fetch_one(query)

        if existing and existing['verified']:
            raise HTTPException(status_code=400, detail="Этот Email уже занят")

        hashed_pass = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        otp_code = str(random.randint(100000, 999999))
        expire_time = datetime.utcnow() + timedelta(minutes=10)

        if existing:
            # Update unverified user
            upd_query = users_table.update().where(users_table.c.email == email).values(
                name=name,
                password=hashed_pass,
                otp=otp_code,
                expire=expire_time
            )
            await database.execute(upd_query)
        else:
            # Create new user
            uid = generate_dgid()
            ins_query = users_table.insert().values(
                id=uid,
                email=email,
                name=name,
                password=hashed_pass,
                otp=otp_code,
                expire=expire_time,
                verified=False,
                created_at=datetime.utcnow()
            )
            await database.execute(ins_query)

        background_tasks.add_task(send_otp_email, email, name, otp_code)       

        return {"status": "success", "message": "Код подтверждения отправлен на почту"}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"REGISTRATION ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail="Ошибка сервера при регистрации")

@app.post("/api/v1/auth/verify-email")
async def verify_email(request: Request):
    try:
        data = await request.json()
        raw_email = data.get("email")
        code = data.get("code")

        if not raw_email or not code:
            raise HTTPException(status_code=400, detail="Email и код обязательны")

        # ПОЧИНКА 1: Переводим в нижний регистр
        email = raw_email.lower().strip()

        # Ищем пользователя в PostgreSQL
        query = users_table.select().where(users_table.c.email == email)
        user = await database.fetch_one(query)

        if not user:
            return {"status": "error", "message": "Код не найден. Запросите новый."}

        # ПОЧИНКА 2: Корректное сравнение времени для PostgreSQL
        current_time = datetime.now(timezone.utc)
        
        user_expire = user["expire"]
        if user_expire.tzinfo is None:
            user_expire = user_expire.replace(tzinfo=timezone.utc)

        # Проверяем код и время его жизни
        if user["otp"] != str(code) or current_time > user_expire:
            return {"status": "error", "message": "Код не найден. Запросите новый."}

        # Если всё совпало — активируем пользователя
        update_query = users_table.update().where(users_table.c.email == email).values(verified=True, otp=None)
        await database.execute(update_query)

        # JWT generation
        token = jwt.encode({
            "sub": user['id'],
            "exp": datetime.utcnow() + timedelta(days=7)
        }, SECRET_KEY, algorithm="HS256")

        return {
            "status": "success",
            "message": "Почта успешно подтверждена",
            "token": token,
            "user": {
                "id": user['id'],
                "name": user['name'],
                "email": user['email']
            }
        }
    except Exception as e:
        logger.error(f"VERIFY ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/auth/login")
async def login(request: Request):
    try:
        data = await request.json()
        raw_email = data.get('email')
        password = data.get('password')

        if not raw_email or not password:
            raise HTTPException(status_code=400, detail="Email и пароль обязательны")

        email = raw_email.lower().strip()

        query = users_table.select().where(users_table.c.email == email)       
        user = await database.fetch_one(query)

        if not user:
            raise HTTPException(status_code=401, detail="Пользователь не найден")

        if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            raise HTTPException(status_code=401, detail="Неверный пароль")

        if not user['verified']:
            raise HTTPException(status_code=403, detail="Email не подтвержден. Пожалуйста, проверьте почту.")

        token = jwt.encode({
            "sub": user['id'],
            "exp": datetime.utcnow() + timedelta(days=7)
        }, SECRET_KEY, algorithm="HS256")

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user['id'],
                "name": user['name'],
                "email": user['email']
            }
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"LOGIN ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail="Ошибка сервера при входе")

@app.get("/api/v1/users/me")
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

@app.get("/api/v1/listings")
async def get_listings():
    query = listings_table.select().where(listings_table.c.status == 'active') 
    rows = await database.fetch_all(query)
    return [dict(r) for r in rows]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))  
