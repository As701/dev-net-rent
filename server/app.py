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
from supabase import create_client, Client

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

database = Database(DATABASE_URL)
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
    Column("strikes", Integer, default=0), # Added for Anti-Spam (3 strikes = ban)
    Column("otp", String, nullable=True),
    Column("expire", DateTime, nullable=True),
    Column("verified", Boolean, default=False),
    Column("role", String, default="user"), # user, admin, staff
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
    Column("status", String, default="pending"), # pending, pending_check, confirmed, rejected
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
    Column("type", String, default="info"), # info, success, warning, danger
    Column("is_read", Boolean, default=False),
    Column("created_at", DateTime, default=datetime.utcnow)
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

app.mount("/storage", StaticFiles(directory="storage"), name="storage")

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
    await database.execute(query)

# --- ADMIN ENDPOINTS ---

@app.post("/api/v1/admin/verify-payment")
async def verify_payment(data: AdminVerifyPayment, authorization: Optional[str] = Header(None)):
    admin_id = await get_current_user_id(authorization)
    # Basic check for admin role (in real app, query DB for user.role)
    
    booking = await database.fetch_one(bookings_table.select().where(bookings_table.c.id == data.booking_id))
    if not booking: raise HTTPException(status_code=404, detail="Booking not found")

    new_status = "confirmed" if data.action == "approve" else "rejected"
    await database.execute(bookings_table.update().where(bookings_table.c.id == data.booking_id).values(status=new_status))

    # Send notification to CLIENT (DachaGo Tab)
    msg_to_client = "Ваша оплата депозита подтверждена! Свяжитесь с владельцем для уточнения деталей заселения." if data.action == "approve" else f"Оплата отклонена: {data.comment}"
    await create_system_notification(booking["user_id"], "Статус оплаты", msg_to_client, "success" if data.action == "approve" else "danger")

    # If approved, notify OWNER in P2P chat (simulated by returning success and updating system log)
    if data.action == "approve":
        listing = await database.fetch_one(listings_table.select().where(listings_table.c.id == booking["listing_id"]))
        if listing:
            owner_notif = "Платформа DachaGo подтвердила оплату депозита. Вы можете начать обсуждение заселения."
            await create_system_notification(listing["owner_id"], "Новая бронь", owner_notif, "success")

    return {"status": "success", "new_status": new_status}

@app.post("/api/v1/users/verify-identity")
async def verify_identity(data: Dict[str, Any], authorization: Optional[str] = Header(None)):
    user_id = await get_current_user_id(authorization)
    
    passport = data.get("passport")
    if not passport or not passport.get("series") or not passport.get("number"):
        raise HTTPException(status_code=400, detail="Passport data required")
    
    # Anti-Fraud: Passport Hashing
    raw_passport = f"{passport['series'].upper()}{passport['number']}"
    passport_hash = hashlib.sha256(raw_passport.encode()).hexdigest()
    
    # Check for duplicate passports
    duplicate_query = users_table.select().where(
        (users_table.c.passport_hash == passport_hash) & 
        (users_table.c.id != user_id)
    )
    existing_passport = await database.fetch_one(duplicate_query)
    if existing_passport:
        raise HTTPException(status_code=400, detail="Identity already registered with another account")
    
    # Liveness Image Storage
    liveness_data = data.get("liveness_img")
    liveness_url = None
    if liveness_data and liveness_data.startswith("data:image"):
        try:
            header, encoded = liveness_data.split(",", 1)
            img_data = base64.b64decode(encoded)
            filename = f"liveness_{user_id.replace('#', '')}_{uuid.uuid4().hex[:8]}.jpg"
            filepath = os.path.join(LIVENESS_UPLOAD_DIR, filename)
            with open(filepath, "wb") as f:
                f.write(img_data)
            liveness_url = f"/storage/liveness/{filename}"
        except Exception as e:
            logger.error(f"LIVENESS STORAGE ERROR: {str(e)}")

    # Update user record
    await database.execute(users_table.update().where(users_table.c.id == user_id).values(
        passport_hash=passport_hash,
        is_verified=False # Remains false until admin manual check
    ))

    # Log system notification
    await create_system_notification(user_id, "Верификация", "Ваши данные отправлены на проверку модератором.", "info")

    return {"status": "success", "message": "Verification data submitted"}

@app.get("/api/v1/bookings/me")
async def get_my_bookings(authorization: Optional[str] = Header(None)):
    user_id = await get_current_user_id(authorization)
    
    # Query with join to get listing info
    query = f"""
        SELECT b.*, l.title, l.location, l.image, l.price as base_price 
        FROM bookings b
        JOIN listings l ON b.listing_id = l.id
        WHERE b.user_id = :user_id
        ORDER BY b.created_at DESC
    """
    rows = await database.fetch_all(query=query, values={"user_id": user_id})
    
    bookings = [dict(r) for r in rows]
    
    # Categorize
    result = {
        "active": [],   # pending
        "payment": [],  # pending_check or confirmed (if not yet in history)
        "history": []   # rejected or confirmed (if date passed)
    }
    
    now = datetime.utcnow()
    
    for b in bookings:
        # Example logic for categorization
        if b["status"] == "pending":
            result["active"].append(b)
        elif b["status"] == "pending_check":
            result["payment"].append(b)
        elif b["status"] in ["confirmed", "rejected"]:
            # If confirmed but date not passed, maybe keep in active/payment?
            # For simplicity, confirmed goes to history here
            result["history"].append(b)
            
    return result

@app.get("/api/v1/messages/notifications/{user_id}")
async def get_system_notifications(user_id: str, authorization: Optional[str] = Header(None)):
    await get_current_user_id(authorization) # Verify auth
    query = system_notifications_table.select().where(system_notifications_table.c.user_id == user_id).order_by(system_notifications_table.c.created_at.desc())
    rows = await database.fetch_all(query)
    return [dict(r) for r in rows]

@app.post("/api/v1/users/change-password")
async def change_password(data: ChangePasswordSchema, authorization: Optional[str] = Header(None)):
    user_id = await get_current_user_id(authorization)
    user = await database.fetch_one(users_table.select().where(users_table.c.id == user_id))
    
    if not user or not bcrypt.checkpw(data.old_password.encode('utf-8'), user['password'].encode('utf-8')):
        raise HTTPException(status_code=400, detail="Неверный текущий пароль")
    
    hashed_pass = bcrypt.hashpw(data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    await database.execute(users_table.update().where(users_table.c.id == user_id).values(password=hashed_pass))
    
    return {"status": "success", "message": "Пароль обновлен"}

@app.delete("/api/v1/users/delete-passport")
async def delete_passport(authorization: Optional[str] = Header(None)):
    user_id = await get_current_user_id(authorization)
    await database.execute(users_table.update().where(users_table.c.id == user_id).values(
        passport_hash=None,
        is_verified=False
    ))
    return {"status": "success", "message": "Данные паспорта удалены"}

@app.on_event("startup")
async def startup():
    await database.connect()
    sync_db_url = DATABASE_URL
    if sync_db_url.startswith("postgresql+asyncpg://"):
        sync_db_url = sync_db_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    elif sync_db_url.startswith("sqlite+aiosqlite://"):
        sync_db_url = sync_db_url.replace("sqlite+aiosqlite://", "sqlite://")
    engine = create_engine(sync_db_url)
    metadata.create_all(engine)

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

@app.get("/api/v1/listings")
async def get_listings():
    query = listings_table.select().where(listings_table.c.status == "active")
    rows = await database.fetch_all(query)
    return [dict(r) for r in rows]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 5005)))
