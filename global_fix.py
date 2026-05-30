import os
import re

def to_bytes(s):
    res = []
    for c in s:
        try:
            res.append(c.encode("cp1251")[0])
        except:
            code = ord(c)
            if 0x400 <= code <= 0x4ff:
                res.append(code - 0x350)
            elif code <= 0xff:
                res.append(code)
            else:
                return None
    return bytes(res)

def fix_string(s):
    if not s: return s
    b = to_bytes(s)
    if b:
        try:
            return b.decode("utf-8")
        except:
            return s
    return s

def fix_content(content):
    pattern = re.compile(r"[\u0080-\u00ff\u0400-\u04ff\u2500-\u257f]+")
    def replace_match(m):
        s = m.group(0)
        fixed = fix_string(s)
        return fixed if fixed else s
    return pattern.sub(replace_match, content)

def process_file(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        fixed = fix_content(content)
        if fixed != content:
            with open(path, "w", encoding="utf-8") as f:
                f.write(fixed)
            return True
    except Exception as e:
        print(f"Error processing {path}: {e}")
    return False

root = r"C:\Users\world\.dachago\tmp\system32\DachaGo"
extensions = (".html", ".js", ".ts", ".tsx", ".css", ".json")
fixed_count = 0

for r, dirs, files in os.walk(root):
    if any(x in r for x in ["node_modules", ".next", ".git"]): continue
    for f in files:
        if f.endswith(extensions):
            path = os.path.join(r, f)
            if process_file(path):
                print(f"Fixed: {path}")
                fixed_count += 1

print(f"Total files fixed: {fixed_count}")
