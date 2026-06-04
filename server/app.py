import os
import random
import jwt
import bcrypt
import string
import logging
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Request, Header, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import resend
from databases import Database
from sqlalchemy import create_engine, MetaData, Table, Column, String, Boolean, DateTime, Float, Integer, text

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 1. DATABASE CONFIGURATION
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1) # Standardize
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif not DATABASE_URL:
    DATABASE_URL = "sqlite+aiosqlite:///./database.sqlite"

database = Database(DATABASE_URL)
metadata = MetaData()

# Create storage directory for uploads
UPLOAD_DIR = "storage/avatars"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Temporary SMS storage (In-memory)
sms_codes = {} # { phone: {"code": "...", "expires": ...} }

# TABLES
users_table = Table(
    "users",
    metadata,
    Column("id", String, primary_key=True),
    Column("name", String(100)),
    Column("email", String(255), unique=True, nullable=False),
    Column("phone", String(20), nullable=True),
    Column("password", String, nullable=False),
    Column("bio", String, nullable=True),
    Column("avatar_url", String, nullable=True),
    Column("otp", String, nullable=True),
    Column("expire", DateTime, nullable=True),
    Column("verified", Boolean, default=False),
    Column("role", String, default="user"),
    Column("created_at", DateTime, default=datetime.utcnow)
)

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

bookings_table = Table(
    "bookings",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", String, nullable=False),
    Column("listing_id", String, nullable=False),
    Column("dates", String, nullable=False), # JSON string of dates
    Column("status", String, default="pending"),
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

# Serve static files for avatars
app.mount("/storage", StaticFiles(directory="storage"), name="storage")

@app.on_event("startup")
async def startup():
    await database.connect()
    
    sync_db_url = DATABASE_URL
    if sync_db_url.startswith("postgresql+asyncpg://"):
        sync_db_url = sync_db_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    elif sync_db_url.startswith("sqlite+aiosqlite://"):
        sync_db_url = sync_db_url.replace("sqlite+aiosqlite://", "sqlite://")
    
    engine = create_engine(sync_db_url)
    
    if os.environ.get("REFRESH_DB") == "true":
        logger.info("REFRESHING DATABASE TABLES...")
        metadata.drop_all(engine)
    
    metadata.create_all(engine)
    
    # Soft Migration for new columns
    with engine.connect() as conn:
        for col_name, col_type in [("bio", "TEXT"), ("avatar_url", "TEXT")]:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                conn.commit()
                logger.info(f"Added column {col_name} to users")
            except:
                pass
    
    logger.info("Database tables verified/created.")

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

# --- HELPERS ---
async def get_current_user_id(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload.get("sub")
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

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
        <p style="font-size: 12px; color: #9ba5b7;">Код действителен в течение 10 минут.</p>
    </div>
    """
    try:
        resend.Emails.send({"from": "DachaGo <noreply@dacha-go.uz>", "to": [to_email], "subject": "Подтверждение регистрации DachaGo", "html": html_body})
        return True
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        return False

# --- API V1 AUTH ENDPOINTS ---

@app.post("/api/v1/auth/register")
async def register(request: Request, background_tasks: BackgroundTasks):       
    try:
        data = await request.json()
        name, raw_email, password = data.get('name'), data.get('email'), data.get('password')
        if not name or not raw_email or not password: raise HTTPException(status_code=400, detail="Все поля обязательны")
        email = raw_email.lower().strip()
        query = users_table.select().where(users_table.c.email == email)       
        existing = await database.fetch_one(query)
        if existing and existing['verified']: raise HTTPException(status_code=400, detail="Этот Email уже занят")
        hashed_pass = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        otp_code, expire_time = str(random.randint(100000, 999999)), datetime.utcnow() + timedelta(minutes=10)
        
        # Generate initial avatar using DiceBear
        initial_avatar = f"https://api.dicebear.com/7.x/avataaars/svg?seed={email}"

        if existing:
            await database.execute(users_table.update().where(users_table.c.email == email).values(name=name, password=hashed_pass, otp=otp_code, expire=expire_time))
        else:
            await database.execute(users_table.insert().values(
                id=f"#DGID{''.join(random.choices(string.digits, k=5))}{random.choice(string.ascii_uppercase)}", 
                email=email, 
                name=name, 
                password=hashed_pass, 
                otp=otp_code, 
                expire=expire_time, 
                avatar_url=initial_avatar,
                verified=False, 
                created_at=datetime.utcnow()
            ))
        background_tasks.add_task(send_otp_email, email, name, otp_code)       
        return {"status": "success", "message": "Код подтверждения отправлен на почту"}
    except Exception as e:
        logger.error(f"REGISTRATION ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/auth/verify-email")
async def verify_email(request: Request):
    try:
        data = await request.json()
        raw_email, code = data.get("email"), data.get("code")
        if not raw_email or not code: raise HTTPException(status_code=400, detail="Email и код обязательны")
        email = raw_email.lower().strip()
        query = users_table.select().where(users_table.c.email == email)
        user = await database.fetch_one(query)
        if not user: return {"status": "error", "message": "Код не найден. Запросите новый."}
        current_time, user_expire = datetime.now(timezone.utc), user["expire"]
        if user_expire.tzinfo is None: user_expire = user_expire.replace(tzinfo=timezone.utc)
        if user["otp"] != str(code) or current_time > user_expire: return {"status": "error", "message": "Код не найден. Запросите новый."}
        await database.execute(users_table.update().where(users_table.c.email == email).values(verified=True, otp=None))
        token = jwt.encode({"sub": user['id'], "exp": datetime.utcnow() + timedelta(days=7)}, SECRET_KEY, algorithm="HS256")
        return {"status": "success", "message": "Почта успешно подтверждена", "token": token, "user": {"id": user['id'], "name": user['name'], "email": user['email'], "avatar_url": user['avatar_url']}}
    except Exception as e:
        logger.error(f"VERIFY ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/auth/login")
async def login(request: Request):
    try:
        data = await request.json()
        raw_email, password = data.get('email'), data.get('password')
        if not raw_email or not password: raise HTTPException(status_code=400, detail="Email и пароль обязательны")
        email = raw_email.lower().strip()
        query = users_table.select().where(users_table.c.email == email)       
        user = await database.fetch_one(query)
        if not user or not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')): raise HTTPException(status_code=401, detail="Неверный логин или пароль")
        if not user['verified']: raise HTTPException(status_code=403, detail="Email не подтвержден")
        token = jwt.encode({"sub": user['id'], "exp": datetime.utcnow() + timedelta(days=7)}, SECRET_KEY, algorithm="HS256")
        return {"access_token": token, "token_type": "bearer", "user": {"id": user['id'], "name": user['name'], "email": user['email'], "avatar_url": user['avatar_url']}}
    except Exception as e:
        logger.error(f"LOGIN ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- NEW ENDPOINTS ---

@app.put("/api/v1/users/update")
async def update_user(request: Request, authorization: Optional[str] = Header(None)):
    user_id = await get_current_user_id(authorization)
    data = await request.json()
    name, bio, avatar_url = data.get('name'), data.get('bio'), data.get('avatar_url')
    
    values = {}
    if name: values["name"] = name
    if bio: values["bio"] = bio
    if avatar_url: values["avatar_url"] = avatar_url
    
    if values:
        await database.execute(users_table.update().where(users_table.c.id == user_id).values(**values))
    
    user = await database.fetch_one(users_table.select().where(users_table.c.id == user_id))
    return dict(user)

@app.post("/api/v1/users/upload-avatar")
async def upload_avatar(file: UploadFile = File(...), authorization: Optional[str] = Header(None)):
    user_id = await get_current_user_id(authorization)
    
    # Validate file extension
    ext = file.filename.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "webp"]:
        raise HTTPException(status_code=400, detail="Invalid image format")
    
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    with open(filepath, "wb") as buffer:
        buffer.write(await file.read())
    
    # Construct URL (relative for simplicity, ideally absolute with domain)
    avatar_url = f"/storage/avatars/{filename}"
    
    await database.execute(users_table.update().where(users_table.c.id == user_id).values(avatar_url=avatar_url))
    
    return {"status": "success", "avatar_url": avatar_url}

@app.post("/api/v1/auth/send-sms-verification")
async def send_sms_verification(request: Request, authorization: Optional[str] = Header(None)):
    await get_current_user_id(authorization) # Ensure user is logged in
    data = await request.json()
    phone = data.get("phone")
    if not phone: raise HTTPException(status_code=400, detail="Phone is required")
    
    code = str(random.randint(1000, 9999))
    expires = datetime.utcnow() + timedelta(minutes=2)
    sms_codes[phone] = {"code": code, "expires": expires}
    
    logger.info(f"DEBUG: SMS CODE FOR {phone} IS {code}")
    return {"status": "success", "message": "SMS code sent"}

@app.post("/api/v1/auth/verify-sms-and-book")
async def verify_sms_and_book(request: Request, authorization: Optional[str] = Header(None)):
    user_id = await get_current_user_id(authorization)
    data = await request.json()
    phone, code, listing_id, dates = data.get("phone"), data.get("code"), data.get("listing_id"), data.get("dates")
    
    if not all([phone, code, listing_id, dates]): raise HTTPException(status_code=400, detail="Missing required fields")
    
    stored = sms_codes.get(phone)
    if not stored or stored["code"] != code or datetime.utcnow() > stored["expires"]:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    
    await database.execute(users_table.update().where(users_table.c.id == user_id).values(phone=phone))
    
    await database.execute(bookings_table.insert().values(
        user_id=user_id,
        listing_id=str(listing_id),
        dates=json.dumps(dates),
        status="pending",
        created_at=datetime.utcnow()
    ))
    
    if phone in sms_codes: del sms_codes[phone]
    
    return {"status": "success", "message": "Phone verified and booking created"}

@app.get("/api/v1/users/me")
async def get_me(authorization: Optional[str] = Header(None)):
    user_id = await get_current_user_id(authorization)
    user = await database.fetch_one(users_table.select().where(users_table.c.id == user_id))
    if not user: raise HTTPException(status_code=404, detail="User not found")      
    return dict(user)

@app.get("/api/v1/listings")
async def get_listings():
    query = listings_table.select().where(listings_table.c.status == 'active') 
    rows = await database.fetch_all(query)
    return [dict(r) for r in rows]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
