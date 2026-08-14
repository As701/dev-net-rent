-- Migration 001: Initial Complete Schema
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password VARCHAR(255) NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    passport_hash VARCHAR,
    is_verified BOOLEAN DEFAULT 0,
    strikes INTEGER DEFAULT 0,
    otp VARCHAR(10),
    expire TIMESTAMP,
    verified BOOLEAN DEFAULT 0,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS listings (
    id VARCHAR PRIMARY KEY,
    owner_id VARCHAR NOT NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    category VARCHAR(50),
    price FLOAT NOT NULL,
    location VARCHAR(255),
    image VARCHAR,
    description TEXT,
    amenities TEXT,
    rules TEXT,
    details TEXT,
    calendar TEXT,
    liveness_url VARCHAR,
    is_bargaining_enabled BOOLEAN DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'unpaid',
    expires_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR NOT NULL,
    listing_id VARCHAR NOT NULL,
    dates TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    queue_position INTEGER DEFAULT 1,
    screenshot_url VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS negotiations (
    id VARCHAR PRIMARY KEY,
    listing_id VARCHAR NOT NULL,
    user_id VARCHAR NOT NULL,
    owner_id VARCHAR NOT NULL,
    proposed_price FLOAT NOT NULL,
    slot_id VARCHAR NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id VARCHAR NOT NULL,
    receiver_id VARCHAR NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
