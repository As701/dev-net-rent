import os
import sqlite3

def repair_db(db_path):
    if not os.path.exists(db_path): return
    try:
        conn = sqlite3.connect(db_path)
        conn.text_factory = str
        cur = conn.cursor()
        
        mapping = {
            "╨░": "а", "╨▒": "б", "╨▓": "в", "╨│": "г", "╨┤": "д", "╨╡": "е", "╤С": "ё", "╨╢": "ж",
            "╨╖": "з", "╨╕": "и", "╨╣": "й", "╨║": "к", "╨╗": "л", "╨╝": "м", "╨╜": "н", "╨╛": "о",
            "╨┐": "п", "╤А": "р", "╤Б": "с", "╤В": "т", "╤Г": "у", "╤Д": "ф", "╤Е": "х", "╤Ж": "ц",
            "╤З": "ч", "╤И": "ш", "╤Й": "щ", "╤К": "ъ", "╤Л": "ы", "╤м": "ь", "╤н": "э", "╤О": "ю",
            "╤П": "я", "╨Р": "А", "╨С": "Б", "╨Т": "В", "╨У": "Г", "╨Ф": "Д", "╨Х": "Е", "╨е": "Ё",
            "╨Ц": "Ж", "╨Ч": "З", "╨Ш": "И", "╨Щ": "Й", "╨Ъ": "К", "╨Ы": "Л", "╨Ь": "М", "╨н": "Н",
            "╨Ю": "О", "╨Я": "П", "╨а": "Р", "╨б": "С", "╨в": "Т", "╨г": "У", "╨д": "Ф", "╨х": "Х",
            "╨ж": "Ц", "╨з": "Ч", "╨и": "Ш", "╨й": "Щ", "╨л": "Ы", "╨м": "Ь", "╨н": "Э", "╨ю": "Ю",
            "╨я": "Я"
        }

        cur.execute("SELECT name FROM sqlite_master WHERE type=''table''")
        tables = [r[0] for r in cur.fetchall()]
        
        for table in tables:
            cur.execute(f"PRAGMA table_info({table})")
            cols = [r[1] for r in cur.fetchall() if "TEXT" in r[2].upper() or "VARCHAR" in r[2].upper()]
            if not cols: continue
            
            cur.execute(f"SELECT rowid, {','.join(cols)} FROM {table}")
            rows = cur.fetchall()
            for row in rows:
                rowid = row[0]
                updates = []
                vals = []
                for i, val in enumerate(row[1:]):
                    if not val: continue
                    new_val = val
                    for k, v in mapping.items():
                        new_val = new_val.replace(k, v)
                    if new_val != val:
                        updates.append(f"{cols[i]} = ?")
                        vals.append(new_val)
                if updates:
                    vals.append(rowid)
                    cur.execute(f"UPDATE {table} SET {','.join(updates)} WHERE rowid = ?", tuple(vals))
        
        conn.commit()
        conn.close()
        print(f"Repaired: {db_path}")
    except Exception as e:
        print(f"Error repairing {db_path}: {e}")

db_paths = [
    r"C:\Users\world\.dachago\tmp\system32\DachaGo\server\database.sqlite",
    r"C:\Users\world\.dachago\tmp\system32\DachaGo\database.sqlite"
]
for p in db_paths: repair_db(p)
