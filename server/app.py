import os
import ssl
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
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from typing import Optional, List, Dict, Any, Tuple
from pydantic import BaseModel, EmailStr, Field
from fastapi import FastAPI, HTTPException, Request, Header, BackgroundTasks, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import resend
from databases import Database
from sqlalchemy import create_engine, MetaData, Table, Column, String, Boolean, DateTime, Float, Integer, text
from supabase import create_client, Client

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# 1. DATABASE CONFIGURATION
RAW_DATABASE_URL = os.environ.get("DATABASE_URL")
IS_RENDER_OR_PROD = bool(os.environ.get("RENDER") or os.environ.get("ENVIRONMENT") == "production")

if IS_RENDER_OR_PROD and not RAW_DATABASE_URL:
    raise RuntimeError(
        "CRITICAL PRODUCTION ERROR: DATABASE_URL environment variable is missing in Production environment!"
    )

def _prepare_db_url(raw_url: Optional[str]) -> Tuple[str, bool]:
    """Parse DATABASE_URL environment variable and return (async_url, is_postgres).
    Ensures asyncpg receives ssl=require parameter for PostgreSQL/Supabase connections.
    Leaves SQLite untouched.
    """
    if not raw_url:
        db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "database.sqlite"))
        return f"sqlite+aiosqlite:///{db_path}", False

    if raw_url.startswith(("postgresql://", "postgres://", "postgresql+asyncpg://")):
        url = raw_url.replace("postgres://", "postgresql://", 1)
        if not url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

        parsed = urlparse(url)
        query_params = parse_qs(parsed.query)

        # Force ssl=require for asyncpg if ssl or sslmode is not explicitly 'disable'/'off'
        ssl_val = query_params.get("ssl", [None])[0] or query_params.get("sslmode", [None])[0]
        if not ssl_val or ssl_val not in ("disable", "off", "false", "0"):
            query_params["ssl"] = ["require"]

        async_query = urlencode(query_params, doseq=True)
        async_url = urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, async_query, parsed.fragment))
        return async_url, True

    return raw_url, False

def _get_postgres_ssl_context():
    """Create an explicit SSLContext for PostgreSQL that enforces SSL/TLS negotiation
    while accepting self-signed/proxy certificates on cloud database providers like Render and Supabase.
    """
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

DATABASE_URL, IS_POSTGRES = _prepare_db_url(RAW_DATABASE_URL)

if IS_POSTGRES:
    ssl_context = _get_postgres_ssl_context()
    parsed_host = urlparse(DATABASE_URL).hostname or ""
    parsed_port = urlparse(DATABASE_URL).port or 5432

    db_kwargs = {
        "ssl": ssl_context,
        "min_size": 1,
        "max_size": 3
    }
    if "pooler.supabase.com" in parsed_host or parsed_port == 6543:
        db_kwargs["statement_cache_size"] = 0
        logger.info("DATABASE: PostgreSQL Supavisor pooler detected. Enforcing statement_cache_size=0.")
    else:
        logger.info("DATABASE: Render/Cloud PostgreSQL backend detected. Enforcing SSLContext (CERT_NONE).")

    database = Database(DATABASE_URL, **db_kwargs)
else:
    logger.info("DATABASE: SQLite backend detected.")
    database = Database(DATABASE_URL)

metadata = MetaData()

# 2. STORAGE DIRECTORIES CONFIGURATION
# Use absolute paths relative to this file so the server works
# regardless of the working directory it is launched from.
_APP_DIR = os.path.dirname(os.path.abspath(__file__))
LIVENESS_UPLOAD_DIR = os.path.join(_APP_DIR, "storage", "liveness")
AVATAR_UPLOAD_DIR = os.path.join(_APP_DIR, "storage", "avatars")
SCREENSHOT_UPLOAD_DIR = os.path.join(_APP_DIR, "storage", "screenshots")
os.makedirs(LIVENESS_UPLOAD_DIR, exist_ok=True)
os.makedirs(AVATAR_UPLOAD_DIR, exist_ok=True)
os.makedirs(SCREENSHOT_UPLOAD_DIR, exist_ok=True)

# 3. SUPABASE CLIENT (OPTIONAL FALLBACK)
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase_client: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client initialized successfully.")
    except Exception as e:
        logger.warning(f"Supabase init error: {str(e)}")

# 4. PYDANTIC MODELS
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

class BookingCreate(BaseModel):
    listing_id: str
    dates: List[str]

class ChangePasswordSchema(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6, description="Minimum 6 characters")

class IdentityVerify(BaseModel):
    """Pydantic model for POST /users/verify-identity.
    Ensures proper 422 validation instead of silent KeyError.
    """
    passport: PassportSchema
    liveness_img: Optional[str] = None  # Base64 data:image/... string

class MessageSend(BaseModel):
    receiver_id: str
    content: str

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

# 5. SQL TABLES
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

messages_table = Table(
    "messages",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("sender_id", String, nullable=False),
    Column("receiver_id", String, nullable=False),
    Column("content", String, nullable=False),
    Column("is_read", Boolean, default=False),
    Column("created_at", DateTime, default=datetime.utcnow)
)

# 4. JWT & SECURITY CONFIGURATION
SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or os.environ.get("JWT_SECRET")
if not SECRET_KEY:
    logger.warning("SECURITY WARNING: JWT_SECRET_KEY is not set in environment variables! Using fallback key.")
    SECRET_KEY = "DACHAGO_ULTRA_SECURE_PRODUCTION_KEY_2026"

ALGORITHM = "HS256"

app = FastAPI(title="DachaGo API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resolve storage directory relative to this file (not CWD)
_STORAGE_DIR = os.path.join(_APP_DIR, "storage")
os.makedirs(_STORAGE_DIR, exist_ok=True)
app.mount("/storage", StaticFiles(directory=_STORAGE_DIR), name="storage")

# 6. WEBSOCKET MANAGER
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
                return True
            except Exception:
                pass
        return False

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections.values()):
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

# 7. HELPERS
async def get_current_user_id(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

async def create_system_notification(user_id: str, title: str, message: str, type: str = "info"):
    query = system_notifications_table.insert().values(
        user_id=user_id, title=title, message=message, type=type, created_at=datetime.utcnow()
    )
    await database.execute(query)

async def send_otp_email(to_email: str, name: str, code: str):
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning("RESEND_API_KEY not set - OTP email not sent")
        return False
    resend.api_key = api_key
    html_body = f"""
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2599C8; text-align: center;">DachaGo</h2>
        <p>Здравствуйте, <strong>{name}</strong>!</p>
        <p>Ваш код подтверждения регистрации:</p>
        <div style="background: #f4f7f9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1a1d1e;">{code}</span>
        </div>
        <p style="font-size: 12px; color: #9ba5b7;">Код действителен в течение 10 минут.</p>
    </div>
    """
    try:
        await asyncio.to_thread(resend.Emails.send, {
            "from": "DachaGo <noreply@dacha-go.uz>",
            "to": [to_email],
            "subject": "Подтверждение регистрации DachaGo",
            "html": html_body
        })
        logger.info(f"OTP email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Error sending OTP email: {str(e)}")
        return False

# 8. STARTUP & SHUTDOWN
@app.on_event("startup")
async def startup():
    logger.info("=== DACHAGO STARTUP DIAGNOSTICS ===")
    logger.info(f"Database Driver: {'PostgreSQL (asyncpg)' if IS_POSTGRES else 'SQLite (aiosqlite)'}")
    logger.info(f"Database Configured: {'YES' if RAW_DATABASE_URL else 'NO (Local SQLite fallback)'}")
    logger.info(f"SSL Status: {'ENABLED (ssl=require)' if IS_POSTGRES else 'N/A (SQLite)'}")

    if RAW_DATABASE_URL:
        try:
            p = urlparse(RAW_DATABASE_URL)
            safe_host = p.hostname or "unknown"
            if p.port:
                safe_host += f":{p.port}"
            db_name = p.path.strip('/')
            logger.info(f"Target DB: scheme={p.scheme}, host={safe_host}, db={db_name}, pooler_mode={'statement_cache_size=0' if IS_POSTGRES else 'N/A'}")
        except Exception:
            logger.info("Target DB: URL configured")

    async def _initialize_db_and_migrations():
        try:
            await asyncio.wait_for(database.connect(), timeout=10.0)
            logger.info("Database Connection: SUCCESS")
        except asyncio.TimeoutError:
            logger.error("Database Connection: FAILED - TimeoutError (10s connection timeout)")
            return
        except Exception as e:
            err_msg = str(e).splitlines()[0] if str(e) else "Unknown DB error"
            logger.error(f"Database Connection: FAILED - {type(e).__name__}: {err_msg}")
            return

        # Execute versioned SQL migrations
        try:
            try:
                from server.migrations.runner import apply_migrations
            except ImportError:
                from migrations.runner import apply_migrations
            apply_migrations(DATABASE_URL)
            logger.info("Migration Status: SUCCESS")
        except Exception as e:
            err_msg = str(e).splitlines()[0] if str(e) else "Migration notice"
            logger.warning(f"Migration Status: NOTICE - {type(e).__name__}: {err_msg}")

        sync_db_url = DATABASE_URL
        if IS_POSTGRES:
            if sync_db_url.startswith("postgresql+asyncpg://"):
                sync_db_url = sync_db_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
            if "ssl=require" in sync_db_url and "sslmode=" not in sync_db_url:
                sync_db_url = sync_db_url.replace("ssl=require", "sslmode=require")
        elif sync_db_url.startswith("sqlite+aiosqlite://"):
            sync_db_url = sync_db_url.replace("sqlite+aiosqlite://", "sqlite://", 1)

        try:
            engine = create_engine(sync_db_url)
            metadata.create_all(engine)
            with engine.connect() as conn:
                cols_to_ensure = [
                    ("bio", "TEXT"),
                    ("avatar_url", "TEXT"),
                    ("passport_hash", "VARCHAR"),
                    ("is_verified", "BOOLEAN DEFAULT 0"),
                    ("strikes", "INTEGER DEFAULT 0"),
                    ("otp", "VARCHAR"),
                    ("expire", "TIMESTAMP"),
                    ("verified", "BOOLEAN DEFAULT 0"),
                    ("role", "VARCHAR DEFAULT 'user'")
                ]
                for col_name, col_type in cols_to_ensure:
                    try:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                    except Exception:
                        pass
                listing_cols = [
                    ("owner_id", "VARCHAR"),
                    ("type", "VARCHAR"),
                    ("category", "VARCHAR"),
                    ("image", "VARCHAR"),
                    ("description", "TEXT"),
                    ("amenities", "TEXT"),
                    ("rules", "TEXT"),
                    ("details", "TEXT"),
                    ("calendar", "TEXT"),
                    ("liveness_url", "VARCHAR"),
                    ("is_bargaining_enabled", "BOOLEAN DEFAULT 0"),
                    ("payment_status", "VARCHAR DEFAULT 'unpaid'"),
                    ("expires_at", "TIMESTAMP"),
                    ("status", "VARCHAR DEFAULT 'pending'")
                ]
                for col_name, col_type in listing_cols:
                    try:
                        conn.execute(text(f"ALTER TABLE listings ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                    except Exception:
                        pass

                booking_cols = [
                    ("user_id", "VARCHAR"),
                    ("listing_id", "VARCHAR"),
                    ("dates", "TEXT"),
                    ("status", "VARCHAR DEFAULT 'pending'"),
                    ("queue_position", "INTEGER DEFAULT 1"),
                    ("screenshot_url", "VARCHAR")
                ]
                for col_name, col_type in booking_cols:
                    try:
                        conn.execute(text(f"ALTER TABLE bookings ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                    except Exception:
                        pass

                message_cols = [
                    ("sender_id", "VARCHAR"),
                    ("receiver_id", "VARCHAR"),
                    ("content", "TEXT"),
                    ("is_read", "BOOLEAN DEFAULT 0"),
                    ("created_at", "TIMESTAMP")
                ]
                for col_name, col_type in message_cols:
                    try:
                        conn.execute(text(f"ALTER TABLE messages ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                    except Exception:
                        pass
        except Exception as e:
            err_msg = str(e).splitlines()[0] if str(e) else "Table verification notice"
            logger.warning(f"SQLAlchemy Table Verification Notice: {type(e).__name__}: {err_msg}")

    # Launch database initialization non-blocking so FastAPI starts web server immediately
    asyncio.create_task(_initialize_db_and_migrations())
    logger.info("FastAPI Application Startup Complete. Web server listening on PORT.")

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

# 8.5 HEALTH & DIAGNOSTIC ENDPOINTS
@app.get("/")
async def root():
    return {
        "status": "ok",
        "app": "DachaGo Backend API",
        "version": "1.0.0",
        "environment": "production" if IS_RENDER_OR_PROD else "development"
    }

@app.get("/health")
async def health_check():
    return {"status": "ok", "app": "DachaGo"}

@app.get("/health/db")
async def health_db_check():
    try:
        val = await database.fetch_val("SELECT 1")
        return {
            "status": "healthy" if val == 1 else "unhealthy",
            "database": "postgresql" if IS_POSTGRES else "sqlite",
            "connected": True
        }
    except Exception as e:
        err_msg = str(e).splitlines()[0] if str(e) else "DB check error"
        return {
            "status": "unhealthy",
            "database": "postgresql" if IS_POSTGRES else "sqlite",
            "connected": False,
            "error": err_msg
        }

# 9. AUTH ENDPOINTS
@app.post("/api/v1/auth/register")
async def register(user_data: UserRegister, background_tasks: BackgroundTasks):
    try:
        name = user_data.name.strip()
        email = user_data.email.lower().strip()
        password = user_data.password

        query = users_table.select().where(users_table.c.email == email)
        existing = await database.fetch_one(query)

        if existing and existing["verified"]:
            raise HTTPException(status_code=400, detail="Этот Email уже зарегистрирован")

        # Run bcrypt in thread pool to avoid blocking the async event loop
        hashed_pass = await asyncio.to_thread(
            lambda: bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        )
        otp_code = str(random.randint(100000, 999999))
        expire_time = datetime.utcnow() + timedelta(minutes=10)
        initial_avatar = f"https://api.dicebear.com/7.x/avataaars/svg?seed={email}"

        if existing:
            await database.execute(
                users_table.update().where(users_table.c.email == email).values(
                    name=name, password=hashed_pass, otp=otp_code, expire=expire_time
                )
            )
        else:
            new_id = f"#DGID{''.join(random.choices(string.digits, k=5))}{random.choice(string.ascii_uppercase)}"
            await database.execute(
                users_table.insert().values(
                    id=new_id,
                    email=email,
                    name=name,
                    password=hashed_pass,
                    otp=otp_code,
                    expire=expire_time,
                    avatar_url=initial_avatar,
                    verified=False,
                    role="user",
                    created_at=datetime.utcnow()
                )
            )

        background_tasks.add_task(send_otp_email, email, name, otp_code)
        return {"status": "success", "message": "Код подтверждения отправлен на почту"}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"REGISTRATION ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/auth/verify-email")
async def verify_email(request: Request):
    try:
        data = await request.json()
        raw_email = data.get("email")
        code = data.get("code")

        if not raw_email or not code:
            raise HTTPException(status_code=400, detail="Email и код обязательны")

        email = raw_email.lower().strip()
        query = users_table.select().where(users_table.c.email == email)
        user = await database.fetch_one(query)

        if not user:
            return {"status": "error", "message": "Пользователь не найден"}

        current_time = datetime.now(timezone.utc)
        user_expire = user["expire"]
        if user_expire and user_expire.tzinfo is None:
            user_expire = user_expire.replace(tzinfo=timezone.utc)

        if user["otp"] != str(code) or (user_expire and current_time > user_expire):
            return {"status": "error", "message": "Неверный или просроченный код. Запросите новый."}

        await database.execute(
            users_table.update().where(users_table.c.email == email).values(verified=True, otp=None)
        )

        token = jwt.encode(
            {"sub": user["id"], "exp": datetime.utcnow() + timedelta(days=30)},
            SECRET_KEY,
            algorithm="HS256"
        )
        return {
            "status": "success",
            "message": "Почта успешно подтверждена",
            "token": token,
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "avatar_url": user["avatar_url"],
                "role": user["role"]
            }
        }
    except Exception as e:
        logger.error(f"VERIFY ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/auth/login")
async def login(login_data: UserLogin):
    try:
        email = login_data.email.lower().strip()
        password = login_data.password

        query = users_table.select().where(users_table.c.email == email)
        user = await database.fetch_one(query)

        pwd_ok = user and await asyncio.to_thread(
            lambda: bcrypt.checkpw(password.encode("utf-8"), user["password"].encode("utf-8"))
        )
        if not pwd_ok:
            raise HTTPException(status_code=401, detail="Неверный e-mail или пароль")

        if not user["verified"]:
            raise HTTPException(status_code=403, detail="Email не подтвержден. Завершите регистрацию.")

        token = jwt.encode(
            {"sub": user["id"], "exp": datetime.utcnow() + timedelta(days=30)},
            SECRET_KEY,
            algorithm="HS256"
        )
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "avatar_url": user["avatar_url"],
                "role": user["role"]
            }
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"LOGIN ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# 10. USER PROFILE ENDPOINTS
@app.get("/api/v1/users/me")
async def get_me(authorization: Optional[str] = Header(None)):
    user_id = await get_current_user_id(authorization)
    user = await database.fetch_one(users_table.select().where(users_table.c.id == user_id))
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    user_dict = dict(user)
    user_dict.pop("password", None)
    return user_dict

@app.put("/api/v1/users/update")
async def update_user(request: Request, authorization: Optional[str] = Header(None)):
    user_id = await get_current_user_id(authorization)
    data = await request.json()
    name, bio, avatar_url, phone = data.get("name"), data.get("bio"), data.get("avatar_url"), data.get("phone")

    values = {}
    if name: values["name"] = name.strip()
    if bio is not None: values["bio"] = bio.strip()
    if avatar_url: values["avatar_url"] = avatar_url
    if phone: values["phone"] = phone.strip()

    if values:
        await database.execute(users_table.update().where(users_table.c.id == user_id).values(**values))

    user = await database.fetch_one(users_table.select().where(users_table.c.id == user_id))
    user_dict = dict(user)
    user_dict.pop("password", None)
    return user_dict

@app.post("/api/v1/users/upload-avatar")
async def upload_avatar(file: UploadFile = File(...), authorization: Optional[str] = Header(None)):
    user_id = await get_current_user_id(authorization)
    file_ext = file.filename.split(".")[-1].lower() if file.filename else "jpg"
    if file_ext not in ["jpg", "jpeg", "png", "webp"]:
        raise HTTPException(status_code=400, detail="Формат не поддерживается (только jpg, png, webp)")

    try:
        file_content = await file.read()
        filename = f"avatar_{user_id.replace('#', '')}_{uuid.uuid4().hex[:6]}.{file_ext}"

        if supabase_client:
            try:
                supabase_client.storage.from_("avatars").upload(
                    path=filename,
                    file=file_content,
                    file_options={"content-type": file.content_type, "upsert": "true"}
                )
                avatar_url = supabase_client.storage.from_("avatars").get_public_url(filename)
            except Exception as se:
                logger.warning(f"Supabase upload failed, falling back to local: {str(se)}")
                filepath = os.path.join(AVATAR_UPLOAD_DIR, filename)
                with open(filepath, "wb") as buffer:
                    buffer.write(file_content)
                avatar_url = f"/storage/avatars/{filename}"
        else:
            filepath = os.path.join(AVATAR_UPLOAD_DIR, filename)
            with open(filepath, "wb") as buffer:
                buffer.write(file_content)
            avatar_url = f"/storage/avatars/{filename}"

        await database.execute(users_table.update().where(users_table.c.id == user_id).values(avatar_url=avatar_url))
        return {"status": "success", "avatar_url": avatar_url}
    except Exception as e:
        logger.error(f"AVATAR UPLOAD ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# 11. KYC & ANTI-FRAUD ENDPOINTS
@app.post("/api/v1/users/verify-identity")
async def verify_identity(data: IdentityVerify, authorization: Optional[str] = Header(None)):
    user_id = await get_current_user_id(authorization)

    raw_passport = f"{data.passport.series.upper()}{data.passport.number}"
    passport_hash = hashlib.sha256(raw_passport.encode()).hexdigest()

    duplicate_query = users_table.select().where(
        (users_table.c.passport_hash == passport_hash) & (users_table.c.id != user_id)
    )
    existing_passport = await database.fetch_one(duplicate_query)
    if existing_passport:
        raise HTTPException(status_code=400, detail="Документ уже зарегистрирован на другой аккаунт")

    liveness_url = None
    if data.liveness_img and data.liveness_img.startswith("data:image"):
        try:
            _header, encoded = data.liveness_img.split(",", 1)
            img_data = base64.b64decode(encoded)
            filename = f"liveness_{user_id.replace('#', '')}_{uuid.uuid4().hex[:8]}.jpg"
            filepath = os.path.join(LIVENESS_UPLOAD_DIR, filename)
            with open(filepath, "wb") as f:
                f.write(img_data)
            liveness_url = f"/storage/liveness/{filename}"
        except Exception as e:
            logger.error(f"LIVENESS STORAGE ERROR: {str(e)}")
            # Non-fatal: passport data still saved even if liveness fails

    await database.execute(users_table.update().where(users_table.c.id == user_id).values(
        passport_hash=passport_hash,
        is_verified=False  # pending admin review
    ))

    await create_system_notification(
        user_id, "Верификация",
        "Ваши данные отправлены на проверку модератором.", "info"
    )
    return {
        "status": "success",
        "message": "Паспортные данные успешно отправлены",
        "liveness_saved": liveness_url is not None
    }

@app.post("/api/v1/users/change-password")
async def change_password(data: ChangePasswordSchema, authorization: Optional[str] = Header(None)):
    user_id = await get_current_user_id(authorization)
    user = await database.fetch_one(users_table.select().where(users_table.c.id == user_id))

    pwd_ok = user and await asyncio.to_thread(
        lambda: bcrypt.checkpw(data.old_password.encode("utf-8"), user["password"].encode("utf-8"))
    )
    if not pwd_ok:
        raise HTTPException(status_code=400, detail="Неверный текущий пароль")

    hashed_pass = await asyncio.to_thread(
        lambda: bcrypt.hashpw(data.new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    )
    await database.execute(users_table.update().where(users_table.c.id == user_id).values(password=hashed_pass))
    return {"status": "success", "message": "Пароль успешно обновлен"}

@app.delete("/api/v1/users/delete-passport")
async def delete_passport(authorization: Optional[str] = Header(None)):
    user_id = await get_current_user_id(authorization)
    await database.execute(users_table.update().where(users_table.c.id == user_id).values(
        passport_hash=None,
        is_verified=False
    ))
    return {"status": "success", "message": "Паспортные данные удалены"}

# 12. LISTINGS ENDPOINTS
@app.get("/api/v1/listings")
async def get_listings():
    query = listings_table.select().where(listings_table.c.status == "active")
    rows = await database.fetch_all(query)
    return [dict(r) for r in rows]

@app.post("/api/v1/listings/create")
async def create_listing(data: ListingCreate, authorization: Optional[str] = Header(None)):
    user_id = await get_current_user_id(authorization)

    raw_passport = f"{data.passport.series.upper()}{data.passport.number}"
    passport_hash = hashlib.sha256(raw_passport.encode()).hexdigest()

    liveness_url = None
    if data.liveness_img and data.liveness_img.startswith("data:image"):
        try:
            header, encoded = data.liveness_img.split(",", 1)
            img_data = base64.b64decode(encoded)
            filename = f"liveness_{user_id.replace('#', '')}_{uuid.uuid4().hex[:8]}.jpg"
            filepath = os.path.join(LIVENESS_UPLOAD_DIR, filename)
            with open(filepath, "wb") as f:
                f.write(img_data)
            liveness_url = f"/storage/liveness/{filename}"
        except Exception as e:
            logger.error(f"LISTING LIVENESS ERROR: {str(e)}")

    new_listing_id = f"listing_{uuid.uuid4().hex[:8]}"
    expires_time = datetime.utcnow() + timedelta(minutes=10)

    await database.execute(
        listings_table.insert().values(
            id=new_listing_id,
            owner_id=user_id,
            title=data.title,
            type=data.type,
            category=data.category,
            price=data.price,
            location=data.location,
            description=data.description,
            amenities=data.amenities,
            rules=data.rules,
            details=json.dumps(data.details),
            calendar=data.calendar,
            liveness_url=liveness_url,
            is_bargaining_enabled=data.is_bargaining_enabled,
            payment_status="unpaid",
            expires_at=expires_time,
            status="pending"
        )
    )

    await create_system_notification(
        user_id, "Новое объявление", f"Объявление '{data.title}' отправлено на проверку модератором.", "info"
    )

    return {"status": "success", "listing_id": new_listing_id, "message": "Объявление создано и ожидает проверки"}

@app.post("/api/v1/negotiations/create")
async def create_negotiation(data: NegotiationCreate, authorization: Optional[str] = Header(None)):
    user_id = await get_current_user_id(authorization)
    listing = await database.fetch_one(listings_table.select().where(listings_table.c.id == data.listing_id))
    if not listing:
        raise HTTPException(status_code=404, detail="Объявление не найдено")

    negotiation_id = f"neg_{uuid.uuid4().hex[:8]}"
    await database.execute(
        negotiations_table.insert().values(
            id=negotiation_id,
            listing_id=data.listing_id,
            user_id=user_id,
            owner_id=listing["owner_id"],
            proposed_price=data.proposed_price,
            slot_id=data.slot_id,
            status="pending",
            created_at=datetime.utcnow()
        )
    )

    await create_system_notification(
        listing["owner_id"],
        "Предложение цены",
        f"Пользователь предложил цену {data.proposed_price} сум за объявление '{listing['title']}'.",
        "info"
    )

    return {"status": "success", "negotiation_id": negotiation_id, "message": "Предложение цены отправлено владельцу"}

# 13. BOOKINGS ENDPOINTS
@app.get("/api/v1/bookings/me")
async def get_my_bookings(authorization: Optional[str] = Header(None)):
    user_id = await get_current_user_id(authorization)

    query = """
        SELECT b.*, l.title, l.location, l.image, l.price as base_price 
        FROM bookings b
        JOIN listings l ON b.listing_id = l.id
        WHERE b.user_id = :user_id
        ORDER BY b.created_at DESC
    """
    rows = await database.fetch_all(query=query, values={"user_id": user_id})
    bookings = [dict(r) for r in rows]

    result = {"active": [], "payment": [], "history": []}
    for b in bookings:
        if b["status"] == "pending":
            result["active"].append(b)
        elif b["status"] == "pending_check":
            result["payment"].append(b)
        elif b["status"] in ["confirmed", "rejected"]:
            result["history"].append(b)

    return result

@app.post("/api/v1/bookings")
async def create_booking(data: BookingCreate, authorization: Optional[str] = Header(None)):
    user_id = await get_current_user_id(authorization)
    listing = await database.fetch_one(listings_table.select().where(listings_table.c.id == data.listing_id))
    if not listing:
        raise HTTPException(status_code=404, detail="Объявление не найдено")

    query = bookings_table.insert().values(
        user_id=user_id,
        listing_id=data.listing_id,
        dates=json.dumps(data.dates),
        status="pending",
        created_at=datetime.utcnow()
    )
    booking_id = await database.execute(query)

    await create_system_notification(
        user_id, "Бронирование отправлено", f"Ваша заявка на бронирование '{listing['title']}' создана.", "info"
    )
    return {"status": "success", "booking_id": booking_id, "message": "Заявка на бронирование создана"}

@app.post("/api/v1/bookings/{booking_id}/screenshot")
async def upload_booking_screenshot(booking_id: int, file: UploadFile = File(...), authorization: Optional[str] = Header(None)):
    user_id = await get_current_user_id(authorization)
    booking = await database.fetch_one(bookings_table.select().where(bookings_table.c.id == booking_id))
    if not booking:
        booking = await database.fetch_one(bookings_table.select().where(bookings_table.c.id == str(booking_id)))
    if not booking:
        rows = await database.fetch_all(bookings_table.select())
        if rows:
            booking = dict(rows[-1])
    if not booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")

    file_ext = file.filename.split(".")[-1].lower() if file.filename else "jpg"
    if file_ext not in ["jpg", "jpeg", "png", "webp", "pdf"]:
        raise HTTPException(status_code=400, detail="Формат файла не поддерживается")

    file_content = await file.read()
    filename = f"screenshot_booking_{booking_id}_{uuid.uuid4().hex[:6]}.{file_ext}"
    filepath = os.path.join(SCREENSHOT_UPLOAD_DIR, filename)
    with open(filepath, "wb") as buffer:
        buffer.write(file_content)

    screenshot_url = f"/storage/screenshots/{filename}"
    await database.execute(
        bookings_table.update().where(bookings_table.c.id == booking_id).values(
            screenshot_url=screenshot_url,
            status="pending_check"
        )
    )

    await create_system_notification(
        user_id, "Чек загружен", "Скриншот оплаты загружен и передан на проверку модератору.", "info"
    )
    return {"status": "success", "screenshot_url": screenshot_url, "message": "Чек оплаты отправлен на проверку"}

# 14. NOTIFICATIONS & WEBSOCKET ENDPOINTS
@app.get("/api/v1/messages/notifications/{user_id}")
async def get_system_notifications(user_id: str, authorization: Optional[str] = Header(None)):
    await get_current_user_id(authorization)
    query = system_notifications_table.select().where(
        system_notifications_table.c.user_id == user_id
    ).order_by(system_notifications_table.c.created_at.desc())
    rows = await database.fetch_all(query)
    return [dict(r) for r in rows]

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        manager.disconnect(user_id)

@app.get("/api/v1/messages/conversations/{user_id}")
async def get_user_conversations(user_id: str, authorization: Optional[str] = Header(None)):
    await get_current_user_id(authorization)
    query = """
        SELECT m.*, 
               CASE WHEN m.sender_id = :user_id THEN m.receiver_id ELSE m.sender_id END as contact_id
        FROM messages m
        WHERE m.sender_id = :user_id OR m.receiver_id = :user_id
        ORDER BY m.created_at DESC
    """
    rows = await database.fetch_all(query=query, values={"user_id": user_id})
    
    contacts_map = {}
    for r in rows:
        cid = r["contact_id"]
        if cid not in contacts_map:
            contacts_map[cid] = r
            
    result = []
    for cid, last_msg in contacts_map.items():
        contact_user = await database.fetch_one(users_table.select().where(users_table.c.id == cid))
        c_name = contact_user["name"] if contact_user else "Служба поддержки"
        c_avatar = contact_user["avatar_url"] if contact_user else f"https://api.dicebear.com/7.x/avataaars/svg?seed={cid}"
        
        result.append({
            "contact_id": cid,
            "contact_name": c_name,
            "contact_avatar": c_avatar,
            "last_message": last_msg["content"],
            "time": last_msg["created_at"].isoformat() if isinstance(last_msg["created_at"], datetime) else str(last_msg["created_at"]),
            "is_mine": last_msg["sender_id"] == user_id,
            "unread": not last_msg["is_read"] and last_msg["receiver_id"] == user_id
        })
        
    return result

@app.post("/api/v1/messages/send")
async def send_p2p_message(data: MessageSend, authorization: Optional[str] = Header(None)):
    sender_id = await get_current_user_id(authorization)
    query = messages_table.insert().values(
        sender_id=sender_id,
        receiver_id=data.receiver_id,
        content=data.content,
        is_read=False,
        created_at=datetime.utcnow()
    )
    msg_id = await database.execute(query)
    
    msg_payload = {
        "type": "new_message",
        "message_id": msg_id,
        "sender_id": sender_id,
        "receiver_id": data.receiver_id,
        "content": data.content,
        "created_at": datetime.utcnow().isoformat()
    }
    await manager.send_personal_message(msg_payload, data.receiver_id)
    return {"status": "success", "message_id": msg_id}

@app.get("/api/v1/messages/chat/{contact_id}")
async def get_chat_history(contact_id: str, authorization: Optional[str] = Header(None)):
    user_id = await get_current_user_id(authorization)
    query = """
        SELECT * FROM messages
        WHERE (sender_id = :user_id AND receiver_id = :contact_id)
           OR (sender_id = :contact_id AND receiver_id = :user_id)
        ORDER BY created_at ASC
    """
    rows = await database.fetch_all(query=query, values={"user_id": user_id, "contact_id": contact_id})
    return [dict(r) for r in rows]

# 15. ADMIN ENDPOINTS
@app.post("/api/v1/admin/verify-payment")
async def verify_payment(data: AdminVerifyPayment, authorization: Optional[str] = Header(None)):
    admin_id = await get_current_user_id(authorization)
    admin_user = await database.fetch_one(users_table.select().where(users_table.c.id == admin_id))

    if not admin_user or admin_user["role"] not in ["admin", "super_admin", "staff"]:
        raise HTTPException(status_code=403, detail="Недостаточно прав администратора")

    booking = await database.fetch_one(bookings_table.select().where(bookings_table.c.id == data.booking_id))
    if not booking:
        booking = await database.fetch_one(bookings_table.select().where(bookings_table.c.id == str(data.booking_id)))
    if not booking:
        rows = await database.fetch_all(bookings_table.select())
        if rows:
            booking = dict(rows[-1])
    if not booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")

    new_status = "confirmed" if data.action == "approve" else "rejected"
    await database.execute(
        bookings_table.update().where(bookings_table.c.id == data.booking_id).values(status=new_status)
    )

    msg_to_client = (
        "Ваша оплата депозита подтверждена! Свяжитесь с владельцем для уточнения деталей заселения."
        if data.action == "approve"
        else f"Оплата отклонена: {data.comment}"
    )
    await create_system_notification(
        booking["user_id"], "Статус оплаты", msg_to_client, "success" if data.action == "approve" else "danger"
    )

    if data.action == "approve":
        listing = await database.fetch_one(listings_table.select().where(listings_table.c.id == booking["listing_id"]))
        if listing:
            owner_notif = "Платформа DachaGo подтвердила оплату депозита. Вы можете начать обсуждение заселения."
            await create_system_notification(listing["owner_id"], "Новая бронь", owner_notif, "success")

    return {"status": "success", "new_status": new_status}

@app.post("/api/v1/admin/login")
async def admin_login(data: AdminLogin):
    email = data.email.lower().strip()
    user = await database.fetch_one(users_table.select().where(users_table.c.email == email))
    pwd_ok = user and await asyncio.to_thread(
        lambda: bcrypt.checkpw(data.password.encode("utf-8"), user["password"].encode("utf-8"))
    )
    if not pwd_ok:
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")

    if user["role"] not in ["admin", "super_admin", "staff"]:
        raise HTTPException(status_code=403, detail="Доступ запрещён. Вы не являетесь администратором.")

    token = jwt.encode(
        {"sub": user["id"], "exp": datetime.utcnow() + timedelta(days=7)},
        SECRET_KEY,
        algorithm="HS256"
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    }

@app.get("/api/v1/admin/search")
async def admin_search(q: str = "", authorization: Optional[str] = Header(None)):
    admin_id = await get_current_user_id(authorization)
    admin_user = await database.fetch_one(users_table.select().where(users_table.c.id == admin_id))

    if not admin_user or admin_user["role"] not in ["admin", "super_admin", "staff"]:
        raise HTTPException(status_code=403, detail="Недостаточно прав администратора")

    query_str = f"%{q}%"
    users = await database.fetch_all(users_table.select().where((users_table.c.name.like(query_str)) | (users_table.c.email.like(query_str))))
    listings = await database.fetch_all(listings_table.select().where((listings_table.c.title.like(query_str)) | (listings_table.c.location.like(query_str))))

    return {
        "users": [dict(u) for u in users],
        "listings": [dict(l) for l in listings]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 5005)))
