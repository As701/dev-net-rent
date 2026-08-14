"""
DachaGo Production Database Diagnostic Script
Tests database connectivity layers safely without exposing credentials.
"""
import os
import sys
import socket
import ssl
import asyncio
from urllib.parse import urlparse, parse_qs

_SERVER_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _SERVER_DIR not in sys.path:
    sys.path.insert(0, _SERVER_DIR)

def safe_url_info(raw_url: str) -> dict:
    if not raw_url:
        return {"status": "NOT_SET"}
    try:
        p = urlparse(raw_url)
        safe_host = p.hostname or "unknown"
        port = p.port or 5432
        db_name = p.path.strip('/')
        q = parse_qs(p.query)
        ssl_mode = q.get("ssl", [None])[0] or q.get("sslmode", [None])[0]
        return {
            "status": "PARSED",
            "scheme": p.scheme,
            "host": safe_host,
            "port": port,
            "db_name": db_name,
            "ssl_mode": ssl_mode,
            "has_password": bool(p.password),
            "is_pooler": ("pooler.supabase.com" in safe_host or port == 6543)
        }
    except Exception as e:
        return {"status": "PARSE_ERROR", "error": str(e)}

async def run_diagnostics():
    print("============================================================")
    print("  DachaGo - Production Database Connection Diagnostics")
    print("============================================================")

    raw_url = os.environ.get("DATABASE_URL")
    info = safe_url_info(raw_url)
    print(f"[1] DATABASE_URL: {info['status']}")

    if info["status"] != "PARSED":
        print("  [FAIL] DATABASE_URL is not set or invalid.")
        return

    print(f"  Scheme      : {info['scheme']}")
    print(f"  Host        : {info['host']}")
    print(f"  Port        : {info['port']}")
    print(f"  Database    : {info['db_name']}")
    print(f"  SSL Mode    : {info['ssl_mode']}")
    print(f"  Has Password: {info['has_password']}")
    print(f"  Is Pooler   : {info['is_pooler']}")

    # 2. DNS Resolution
    host = info["host"]
    port = info["port"]
    print("\n[2] DNS Resolution...")
    try:
        ip = socket.gethostbyname(host)
        print(f"  [PASS] DNS resolved {host} -> {ip}")
    except Exception as e:
        print(f"  [FAIL] DNS resolution failed for {host}: {e}")
        return

    # 3. TCP Connectivity
    print("\n[3] TCP Connection Test...")
    try:
        sock = socket.create_connection((host, port), timeout=5.0)
        sock.close()
        print(f"  [PASS] TCP socket connection to {host}:{port} succeeded")
    except Exception as e:
        print(f"  [FAIL] TCP connection to {host}:{port} failed: {e}")
        return

    # 4. Direct asyncpg Connection Test
    print("\n[4] Direct asyncpg Connection Test...")
    try:
        import asyncpg
        # Convert postgresql+asyncpg:// or postgres:// to postgresql://
        pg_url = raw_url.replace("postgresql+asyncpg://", "postgresql://", 1)
        pg_url = pg_url.replace("postgres://", "postgresql://", 1)

        conn = await asyncio.wait_for(
            asyncpg.connect(pg_url, ssl="require", statement_cache_size=0, timeout=10.0),
            timeout=10.0
        )
        val = await conn.fetchval("SELECT 1")
        version = await conn.fetchval("SELECT version()")
        current_db = await conn.fetchval("SELECT current_database()")
        await conn.close()
        print(f"  [PASS] Direct asyncpg connect SUCCESS! SELECT 1 -> {val}")
        print(f"  Current DB: {current_db}")
        print(f"  PostgreSQL Version: {version.splitlines()[0]}")
    except Exception as e:
        print(f"  [FAIL] Direct asyncpg connection failed: {type(e).__name__}: {str(e).splitlines()[0]}")

    # 5. databases.Database Abstraction Test
    print("\n[5] databases.Database Abstraction Test...")
    try:
        from databases import Database
        from app import DATABASE_URL, IS_POSTGRES
        db = Database(DATABASE_URL, ssl="require", min_size=1, max_size=3, statement_cache_size=0) if IS_POSTGRES else Database(DATABASE_URL)
        await asyncio.wait_for(db.connect(), timeout=10.0)
        val = await db.fetch_val("SELECT 1")
        await db.disconnect()
        print(f"  [PASS] databases.Database connect SUCCESS! SELECT 1 -> {val}")
    except Exception as e:
        print(f"  [FAIL] databases.Database connection failed: {type(e).__name__}: {str(e).splitlines()[0]}")

    print("\n============================================================")
    print("  Diagnostics Completed")
    print("============================================================")

if __name__ == "__main__":
    asyncio.run(run_diagnostics())
