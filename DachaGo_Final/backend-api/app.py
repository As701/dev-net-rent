import os
import random
import jwt
import bcrypt
import string
import logging
import json
import uuid
import hashlib
import base64
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from fastapi import FastAPI, HTTPException, Request, Header, BackgroundTasks, UploadFile, File, WebSocket, WebSocketDisconnect
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
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif not DATABASE_URL:
    DATABASE_URL = "sqlite+aiosqlite:///./database.sqlite"

# Configure asyncpg connection pooling and TCP keepalive parameters
database_options = {}
if "postgresql" in DATABASE_URL:
    database_options = {
        "min_size": 1,
        "max_size": 10,
        "ssl": "require",
        "command_timeout": 30
    }

database = Database(DATABASE_URL, **database_options)
metadata = MetaData()

# 2. PYDANTIC MODELS (FOR VALIDATION)
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PassportSchema(BaseModel):
    series: str = Field(..., min_length=2, max_length=2)
    number: str = Field(..., min_length=7, max_length=7)

class ListingCreate(BaseModel):
    title: str
    type: str
    category: str
    price: float
    location: str
    description: str
    passport: PassportSchema
    liveness_img: str # Base64
    amenities: str
    rules: str
    details: dict
    calendar: str
    is_bargaining_enabled: bool = False

class NegotiationCreate(BaseModel):
    listing_id: str
    proposed_price: float
    slot_id: str

class AdminVerifyPayment(BaseModel):
    booking_id: int
    action: str # "approve" or "reject"
    comment: Optional[str] = None

class ChangePasswordSchema(BaseModel):
    old_password: str
    new_password: str

# 3. SQL TABLES
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
    Column("passport_hash", String, unique=True, nullable=True),
    Column("is_verified", Boolean, default=False),
    Column("strikes", Integer, default=0),
    Column("otp", String, nullable=True),
    Column("expire", DateTime, nullable=True),
    Column("verified", Boolean, default=False),
    Column("role", String, default="user"),
    Column("created_at", DateTime, default=datetime.utcnow)
)

listings_table = Table(
    "listings",
    metadata,
    Column("id", String, primary_key=True),
    Column("owner_id", String, nullable=False),
    Column("title", String),
    Column("location", String),
    Column("price", Float),
    Column("type", String),
    Column("category", String),
    Column("image", String),
    Column("description", String),
    Column("amenities", String),
    Column("rules", String),
    Column("details", String),
    Column("calendar", String),
    Column("liveness_url", String),
    Column("is_bargaining_enabled", Boolean, default=False),
    Column("payment_status", String, default="unpaid"),
    Column("expires_at", DateTime, nullable=True),
    Column("status", String, default="pending")
)

bookings_table = Table(
    "bookings",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", String, nullable=False),
    Column("listing_id", String, nullable=False),
    Column("dates", String, nullable=False), 
    Column("status", String, default="pending"),
    Column("queue_position", Integer, default=1),
    Column("screenshot_url", String, nullable=True),
    Column("created_at", DateTime, default=datetime.utcnow)
)

negotiations_table = Table(
    "negotiations",
    metadata,
    Column("id", String, primary_key=True),
    Column("listing_id", String, nullable=False),
    Column("user_id", String, nullable=False),
    Column("owner_id", String, nullable=False),
    Column("proposed_price", Float, nullable=False),
    Column("slot_id", String, nullable=False),
    Column("status", String, default="pending"),
    Column("created_at", DateTime, default=datetime.utcnow)
)

system_notifications_table = Table(
    "system_notifications",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", String, nullable=False),
    Column("title", String, nullable=False),
    Column("message", String, nullable=False),
    Column("type", String, default="info"),
    Column("is_read", Boolean, default=False),
    Column("created_at", DateTime, default=datetime.utcnow)
)

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "MYKASB_ULTRA_SECURE_PRODUCTION_KEY_2026")

app = FastAPI(title="MyKasb API", version="1.0.0")

# Secure production CORS origins
allowed_origins = [
    "https://mykasb.uz",
    "https://www.mykasb.uz",
    "https://mykasb-uz.vercel.app",
    "http://localhost:3000",
    "http://localhost:5005"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("storage", exist_ok=True)
app.mount("/storage", StaticFiles(directory="storage"), name="storage")

# Database Reconnection Helper
async def execute_db_query(func, *args, **kwargs):
    """Executes a DB operation with automatic reconnect retry if the pool connection dropped."""
    try:
        return await func(*args, **kwargs)
    except Exception as exc:
        err_msg = str(exc)
        if "ConnectionDoesNotExistError" in err_msg or "connection was closed" in err_msg or "closed" in err_msg:
            logger.warning("DB connection drop detected. Reconnecting pool...")
            try:
                await database.disconnect()
            except Exception:
                pass
            await database.connect()
            return await func(*args, **kwargs)
        raise exc

# --- WEBSOCKET MANAGER ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections.values()):
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

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

async def create_system_notification(user_id: str, title: str, message: str, type: str = "info"):
    query = system_notifications_table.insert().values(
        user_id=user_id, title=title, message=message, type=type, created_at=datetime.utcnow()
    )
    await execute_db_query(database.execute, query)

# --- SYSTEM HEALTH ENDPOINTS ---
@app.get("/")
async def root():
    return {"status": "ok", "app": "MyKasb Backend API", "version": "1.0.0", "environment": "production"}

@app.get("/health")
async def health():
    return {"status": "ok", "app": "MyKasb"}

@app.get("/health/db")
async def health_db():
    try:
        await execute_db_query(database.execute, text("SELECT 1"))
        return {"status": "healthy", "database": "postgresql" if "postgresql" in DATABASE_URL else "sqlite", "connected": True}
    except Exception as e:
        logger.error(f"Health DB Check Error: {e}")
        return {"status": "unhealthy", "database": "postgresql" if "postgresql" in DATABASE_URL else "sqlite", "connected": False, "error": str(e)}

@app.on_event("startup")
async def startup():
    logger.info("Connecting to database...")
    await database.connect()
    sync_db_url = DATABASE_URL
    if sync_db_url.startswith("postgresql+asyncpg://"):
        sync_db_url = sync_db_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    elif sync_db_url.startswith("sqlite+aiosqlite://"):
        sync_db_url = sync_db_url.replace("sqlite+aiosqlite://", "sqlite://")
    try:
        engine = create_engine(sync_db_url)
        metadata.create_all(engine)
    except Exception as e:
        logger.warning(f"Metadata create_all sync engine warning: {e}")

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

@app.get("/api/v1/listings")
async def get_listings():
    query = listings_table.select().where(listings_table.c.status == "active")
    rows = await execute_db_query(database.fetch_all, query)
    return [dict(r) for r in rows]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 5005)))

    rooms: str = "0"
    capacity: str = "0"
    area: str = "0"
    amenities: List[str] = []
    rules: List[str] = []
    price: int = 0
    weekendPrice: Optional[str] = ""
    deposit: Optional[str] = ""
    isNegotiable: bool = False
    calendarData: Dict[str, Any] = {}
    checkIn: str = "14:00"
    checkOut: str = "11:00"
    paymentPolicy: str = "deposit"
    owner_id: str = "admin-id-fixed"

class UserLogin(BaseModel):
    email_or_phone: str
    password: str

class UserRegister(BaseModel):
    email: str
    phone: str = ""
    name: str
    password: str

class VerifyOTP(BaseModel):
    userId: str
    otp: str

class ForgotPassword(BaseModel):
    email: str

class ResendOTP(BaseModel):
    userId: str

class SocialAuth(BaseModel):
    email: str
    name: str
    avatar: Optional[str] = ""
    provider: str
    provider_id: str

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.on_event("startup")
def setup_db():
    logger.info("Setting up database...")
    conn = get_db()
    cursor = conn.cursor()
    
    # Создаем таблицу listings если не существует
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS listings (
            id TEXT PRIMARY KEY,
            type TEXT,
            title TEXT,
            description TEXT,
            category TEXT,
            location TEXT,
            lat REAL,
            lng REAL,
            image TEXT,
            all_images TEXT,
            rooms INTEGER,
            capacity INTEGER,
            area INTEGER,
            amenities TEXT,
            rules TEXT,
            price INTEGER,
            price_unit TEXT,
            weekend_price TEXT,
            deposit TEXT,
            is_negotiable INTEGER,
            calendar_config TEXT,
            check_in TEXT,
            check_out TEXT,
            payment_policy TEXT,
            owner_id TEXT,
            status TEXT,
            views INTEGER DEFAULT 0,
            rating REAL DEFAULT 5.0
        )
    ''')
    
    # Создаем таблицу users если не существует
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE,
            phone TEXT,
            name TEXT,
            password TEXT,
            role TEXT DEFAULT 'user',
            verified INTEGER DEFAULT 0,
            provider TEXT DEFAULT 'local',
            provider_id TEXT
        )
    ''')
    
    # Проверяем если данные уже есть
    cursor.execute("SELECT COUNT(*) FROM listings")
    if cursor.fetchone()[0] == 0:
        # Сидируем начальные данные
        mock_listings = [
            (
                "1", "rent", "Горная Дача в Чимгане", "Прекрасная дача в самом сердце Чимгана. Есть все условия для комфортного отдыха с семьей.", 
                "dachas", "Чимган, Ташкентская обл.", 41.5173, 70.0210, 
                "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=800",
                json.dumps(["https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=800"]),
                4, 12, 150, json.dumps(["Бассейн", "Wi-Fi", "Зона барбекю"]), json.dumps(["pets", "smoking"]),
                1500000, "день", "1800000", "150000", 1, json.dumps({}), "14:00", "11:00", "deposit", "admin-id-fixed", "active", 125, 4.8
            ),
            (
                "2", "rent", "Современная Вилла с Бассейном", "Роскошная вилла на берегу Чарвака. Панорамный вид, финская сауна и огромный бассейн.", 
                "villas", "Чарвак, Ташкентская обл.", 41.6212, 70.0076, 
                "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800",
                json.dumps(["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800"]),
                6, 20, 450, json.dumps(["Бассейн", "Сауна", "Бильярд", "Wi-Fi"]), json.dumps(["no_alcohol"]),
                3500000, "день", "4000000", "500000", 0, json.dumps({}), "14:00", "11:00", "deposit", "admin-id-fixed", "active", 340, 4.9
            )
        ]
        
        cursor.executemany('''
            INSERT INTO listings (
                id, type, title, description, category, location, lat, lng, image, all_images,
                rooms, capacity, area, amenities, rules, price, price_unit, weekend_price, deposit,
                is_negotiable, calendar_config, check_in, check_out, payment_policy,
                owner_id, status, views, rating
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ''', mock_listings)
    
    conn.commit()
    conn.close()
    logger.info("Database setup complete.")

@app.post("/api/register")
async def register(user_data: UserRegister):
    logger.info(f"Register attempt: {user_data.email}")
    conn = get_db()
    cursor = conn.cursor()
    
    user_id = str(uuid.uuid4())
    hashed_pw = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    try:
        cursor.execute('''
            INSERT INTO users (id, email, phone, name, password, verified)
            VALUES (?, ?, ?, ?, ?, 0)
        ''', (user_id, user_data.email, user_data.phone, user_data.name, hashed_pw))
        conn.commit()
        return {"userId": user_id, "status": "success"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail={"error": "Пользователь с таким email уже существует"})
    finally:
        conn.close()

@app.post("/api/verify-otp")
async def verify_otp(data: VerifyOTP):
    # Упрощенная логика: любой код из 5 цифр подходит
    if len(data.otp) == 5:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET verified = 1 WHERE id = ?", (data.userId,))
        conn.commit()
        conn.close()
        return {"status": "success"}
    raise HTTPException(status_code=400, detail={"error": "Неверный код"})

@app.post("/api/resend-otp")
async def resend_otp(data: ResendOTP):
    logger.info(f"Resending OTP for user: {data.userId}")
    return {"status": "success"}

@app.post("/api/forgot-password")
async def forgot_password(data: ForgotPassword):
    logger.info(f"Forgot password request for: {data.email}")
    return {"status": "success"}

@app.post("/api/auth/social")
async def social_auth(data: SocialAuth):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (data.email,))
    user = cursor.fetchone()
    
    if user:
        conn.close()
        return {
            "id": user['id'],
            "email": user['email'],
            "name": user['name'],
            "role": user['role']
        }
    
    user_id = str(uuid.uuid4())
    cursor.execute('''
        INSERT INTO users (id, email, name, provider, provider_id, verified, role)
        VALUES (?, ?, ?, ?, ?, 1, 'user')
    ''', (user_id, data.email, data.name, data.provider, data.provider_id))
    conn.commit()
    conn.close()
    
    return {
        "id": user_id,
        "email": data.email,
        "name": data.name,
        "role": "user"
    }

@app.post("/api/login")
async def login(credentials: UserLogin):
    logger.info(f"Login attempt: {credentials.email_or_phone}")
    
    # Хардкод для теста
    if credentials.email_or_phone == 'user@dachago.uz' and credentials.password == 'password123':
        return {
            "id": "admin-id-fixed",
            "email": "user@dachago.uz",
            "name": "Asilbek",
            "role": "admin"
        }
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ? OR phone = ?", (credentials.email_or_phone, credentials.email_or_phone))
    user = cursor.fetchone()
    conn.close()
    
    if user and bcrypt.checkpw(credentials.password.encode('utf-8'), user['password'].encode('utf-8')):
        return {
            "id": user['id'],
            "email": user['email'],
            "name": user['name'],
            "role": user['role']
        }
    
    raise HTTPException(status_code=401, detail={"error": "Неправильный логин или пароль"})

@app.get("/api/listings")
async def get_listings():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM listings WHERE status = 'active'")
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for row in rows:
        d = dict(row)
        # Маппинг для фронтенда
        d['priceUnit'] = d['price_unit']
        # Десериализуем JSON поля
        for field in ['all_images', 'amenities', 'rules', 'calendar_config']:
            try:
                if field in d and d[field]:
                   d[field] = json.loads(d[field])
                else:
                   d[field] = [] if 'calendar' not in field else {}
            except:
                d[field] = [] if 'calendar' not in field else {}
        results.append(d)
    return results

@app.get("/api/listings/{listing_id}")
async def get_listing(listing_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM listings WHERE id = ?", (listing_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        d = dict(row)
        d['priceUnit'] = d['price_unit']
        for field in ['all_images', 'amenities', 'rules', 'calendar_config']:
            try:
                if field in d and d[field]:
                   d[field] = json.loads(d[field])
                else:
                   d[field] = [] if 'calendar' not in field else {}
            except:
                d[field] = [] if 'calendar' not in field else {}
        
        d['owner'] = {
            "name": "Асилбек Р.",
            "avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed=Asilbek",
            "phone": "+998 90 123 45 67"
        }
        return d
    raise HTTPException(status_code=404, detail="Объявление не найдено")

@app.post("/api/listings")
async def create_listing(listing: ListingCreate):
    conn = get_db()
    cursor = conn.cursor()
    listing_id = str(uuid.uuid4())
    
    # Выбираем главное фото
    main_image = listing.images[0] if listing.images else "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=800"
    
    # Определяем price_unit
    price_unit = "день" if listing.type == "rent" else "общая"
    
    try:
        cursor.execute('''
            INSERT INTO listings (
                id, type, title, description, category, location, lat, lng, image, all_images,
                rooms, capacity, area, amenities, rules, price, price_unit, weekend_price, deposit,
                is_negotiable, calendar_config, check_in, check_out, payment_policy,
                owner_id, status
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ''', (
            listing_id, listing.type, listing.title, listing.description, listing.category,
            listing.location, listing.lat, listing.lng, main_image, json.dumps(listing.images),
            int(listing.rooms or 0), int(listing.capacity or 0), int(listing.area or 0),
            json.dumps(listing.amenities), json.dumps(listing.rules),
            listing.price, price_unit, listing.weekendPrice, listing.deposit,
            1 if listing.isNegotiable else 0, json.dumps(listing.calendarData),
            listing.checkIn, listing.checkOut, listing.paymentPolicy,
            listing.owner_id, "active"
        ))
        conn.commit()
        return {"id": listing_id, "status": "success"}
    except Exception as e:
        logger.error(f"Error creating listing: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.delete("/api/listings/{listing_id}")
async def delete_listing(listing_id: str):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM listings WHERE id = ?", (listing_id,))
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5000)
