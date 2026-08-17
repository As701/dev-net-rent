import os
import sqlite3
import json

def to_bytes(s):
    res = []
    for c in s:
        try:
            # Try official cp1251 first
            res.append(c.encode('cp1251')[0])
        except:
            code = ord(c)
            if 0x400 <= code <= 0x4ff:
                res.append(code - 0x350)
            elif code <= 0xff:
                res.append(code)
            else:
                raise ValueError(f"Cannot map character {c} (U+{code:04x})")
    return bytes(res)

def fix_string(s):
    if not s:
        return s
    try:
        # Step 1: Get original bytes
        b = to_bytes(s)
        # Step 2: Decode as UTF-8
        return b.decode('utf-8')
    except:
        return s

def fix_content(content):
    import re
    
    # Match any sequence of non-ASCII characters
    pattern = re.compile(r'[^\x00-\x7f]+')
    
    def surgical_fix(s):
        # Try to fix the string. If it fails, try to fix it by character or smaller blocks.
        if not s: return s
        
        # If fix_string works for the whole thing, great!
        fixed = fix_string(s)
        if fixed != s: return fixed
        
        # Otherwise, try to find sequences of 2 characters that look like corrupted UTF-8
        # (mostly Р/С followed by something)
        res = ""
        i = 0
        while i < len(s):
            # Try to take 2 characters and fix them
            if i + 1 < len(s):
                chunk2 = s[i:i+2]
                fixed2 = fix_string(chunk2)
                if fixed2 != chunk2 and len(fixed2) == 1: # Fixed 2 chars into 1
                    res += fixed2
                    i += 2
                    continue
            
            # Try to take 3 characters (for emojis etc)
            if i + 2 < len(s):
                chunk3 = s[i:i+3]
                fixed3 = fix_string(chunk3)
                if fixed3 != chunk3 and len(fixed3) == 1:
                    res += fixed3
                    i += 3
                    continue

            # Try to take 4 characters
            if i + 3 < len(s):
                chunk4 = s[i:i+4]
                fixed4 = fix_string(chunk4)
                if fixed4 != chunk4 and len(fixed4) == 1:
                    res += fixed4
                    i += 4
                    continue

            res += s[i]
            i += 1
        return res

    return pattern.sub(lambda m: surgical_fix(m.group(0)), content)

def fix_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        fixed_content = fix_content(content)

        if fixed_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            return True
    except Exception as e:
        print(f"Error fixing {file_path}: {e}")
    return False

def fix_database(db_path):
    if not os.path.exists(db_path):
        return
    
    conn = sqlite3.connect(db_path)
    conn.text_factory = str # Ensure we get strings
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    
    for table in tables:
        # Get all columns for this table
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [row[1] for row in cursor.fetchall() if row[2].upper() in ('TEXT', 'VARCHAR', 'STRING')]
        
        if not columns:
            continue
            
        cursor.execute(f"SELECT rowid, {', '.join(columns)} FROM {table}")
        rows = cursor.fetchall()
        
        for row in rows:
            rowid = row[0]
            updates = []
            values = []
            for i, col_name in enumerate(columns):
                val = row[i+1]
                if isinstance(val, str):
                    fixed_val = fix_string(val)
                    if fixed_val != val:
                        updates.append(f"{col_name} = ?")
                        values.append(fixed_val)
            
            if updates:
                values.append(rowid)
                cursor.execute(f"UPDATE {table} SET {', '.join(updates)} WHERE rowid = ?", tuple(values))
    
    conn.commit()
    conn.close()

def main():
    root_dir = r'C:\Users\world\.dachago\tmp\system32\DachaGo'
    extensions = ('.html', '.ts', '.tsx', '.js', '.jsx', '.json', '.css')
    
    for root, dirs, files in os.walk(root_dir):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if '.next' in dirs:
            dirs.remove('.next')
        if '.git' in dirs:
            dirs.remove('.git')
            
        for file in files:
            if file.endswith(extensions):
                path = os.path.join(root, file)
                if fix_file(path):
                    print(f"Fixed: {path}")
            elif file == 'database.sqlite':
                path = os.path.join(root, file)
                fix_database(path)
                print(f"Fixed database: {path}")

if __name__ == "__main__":
    main()
