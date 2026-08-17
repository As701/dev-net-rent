import os
import sqlite3

def repair_db(db_path):
    if not os.path.exists(db_path): return
    try:
        conn = sqlite3.connect(db_path)
        conn.text_factory = str
        cur = conn.cursor()
        
        mapping = {
            "а": "а", "б": "б", "в": "в", "г": "г", "д": "д", "е": "е", "ё": "ё", "ж": "ж",
            "з": "з", "и": "и", "й": "й", "к": "к", "л": "л", "м": "м", "н": "н", "о": "о",
            "п": "п", "р": "р", "с": "с", "т": "т", "у": "у", "ф": "ф", "х": "х", "ц": "ц",
            "ч": "ч", "ш": "ш", "щ": "щ", "ъ": "ъ", "ы": "ы", "ь": "ь", "э": "э", "ю": "ю",
            "я": "я", "А": "А", "Б": "Б", "В": "В", "Г": "Г", "Д": "Д", "Е": "Е", "Ё": "Ё",
            "Ж": "Ж", "З": "З", "И": "И", "Й": "Й", "К": "К", "Л": "Л", "М": "М", "Э": "Н",
            "О": "О", "П": "П", "Р": "Р", "С": "С", "Т": "Т", "У": "У", "Ф": "Ф", "Х": "Х",
            "Ц": "Ц", "Ч": "Ч", "Ш": "Ш", "Щ": "Щ", "Ы": "Ы", "Ь": "Ь", "Э": "Э", "Ю": "Ю",
            "Я": "Я"
        }

        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cur.fetchall()]
        
        for t in tables:
            cur.execute(f"PRAGMA table_info({t})")
            cols = [r[1] for r in cur.fetchall() if r[2] and ("TEXT" in r[2].upper() or "VARCHAR" in r[2].upper())]
            if not cols: continue
            
            cur.execute(f"SELECT rowid, {','.join(cols)} FROM {t}")
            rows = cur.fetchall()
            for row in rows:
                rowid = row[0]
                updates = []
                vals = []
                for i, val in enumerate(row[1:]):
                    if not val or not isinstance(val, str): continue
                    new_val = val
                    for k, v in mapping.items():
                        new_val = new_val.replace(k, v)
                    if new_val != val:
                        updates.append(f"{cols[i]} = ?")
                        vals.append(new_val)
                if updates:
                    vals.append(rowid)
                    cur.execute(f"UPDATE {t} SET {','.join(updates)} WHERE rowid = ?", tuple(vals))
        
        conn.commit()
        conn.close()
        print(f"Repaired: {db_path}")
    except Exception as e:
        print(f"Error repairing {db_path}: {e}")

db_repair_list = [
    r"C:\Users\world\.dachago\tmp\system32\DachaGo\server\database.sqlite",
    r"C:\Users\world\.dachago\tmp\system32\DachaGo\database.sqlite"
]
for dbp in db_repair_list: repair_db(dbp)
