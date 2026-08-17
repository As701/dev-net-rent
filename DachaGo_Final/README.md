# DachaGo Project Structure

## Directories:

### 1. `/frontend`
- **Technology:** Next.js 14 (App Router), TypeScript, Tailwind CSS.
- **Port:** Defaults to 3000.
- **API Connection:** Connects to `http://localhost:5000` (FastAPI).

### 2. `/backend-api`
- **Technology:** FastAPI (Python), SQLite.
- **Port:** 5000.
- **Database:** `database.sqlite` (included).
- **Key Features:** Property listings, moderation, view counting logic.

### 3. `/backend-auth`
- **Technology:** Node.js (Express).
- **Port:** 8080.
- **Note:** This appears to be a legacy or testing authentication server.

### 4. `/web-client`
- **Technology:** Pure HTML/JS/CSS.
- **Note:** Legacy web interface that also connects to the FastAPI backend.

### 5. `/docs`
- **Purpose:** Project documentation and notes.

## How to run:
1. **FastAPI Backend:** `cd backend-api && python app.py`
2. **Next.js Frontend:** `cd frontend && npm install && npm run dev`
