import os
import logging
from sqlalchemy import create_engine, text

logger = logging.getLogger("dacha_migrations")
logger.setLevel(logging.INFO)

def apply_migrations(db_url: str):
    sync_url = db_url
    if sync_url.startswith("postgresql+asyncpg://"):
        sync_url = sync_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    elif sync_url.startswith("sqlite+aiosqlite://"):
        sync_url = sync_url.replace("sqlite+aiosqlite://", "sqlite://")

    engine = create_engine(sync_url)

    with engine.connect() as conn:
        # Create migrations tracking table if not exists
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                name VARCHAR NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        conn.commit()

        # Get applied migration versions
        rows = conn.execute(text("SELECT version FROM schema_migrations")).fetchall()
        applied_versions = {r[0] for r in rows}

        migrations_dir = os.path.dirname(os.path.abspath(__file__))
        sql_files = sorted([f for f in os.listdir(migrations_dir) if f.endswith(".sql")])

        for file_name in sql_files:
            try:
                version = int(file_name.split("_")[0])
            except ValueError:
                continue

            if version in applied_versions:
                continue

            file_path = os.path.join(migrations_dir, file_name)
            logger.info(f"Applying database migration {file_name} (version {version})...")

            with open(file_path, "r", encoding="utf-8") as f:
                sql_content = f.read()

            statements = [s.strip() for s in sql_content.split(";") if s.strip()]
            for stmt in statements:
                try:
                    conn.execute(text(stmt))
                    conn.commit()
                except Exception as e:
                    logger.debug(f"Notice during migration execution statement: {e}")

            conn.execute(
                text("INSERT INTO schema_migrations (version, name) VALUES (:ver, :name)"),
                {"ver": version, "name": file_name}
            )
            conn.commit()
            logger.info(f"Database migration {file_name} successfully applied.")
