import os
import re

def fix_mojibake(text):
    # This pattern matches typical mojibake sequences found in the project (╨а╤Ю etc.)
    # These are often CP437 or CP850 interpretations of UTF-8 bytes.
    # We will try to reverse the most common one: UTF-8 interpreted as CP437
    try:
        # Step 1: Encode string to bytes using CP437 (common source of this mojibake)
        # Step 2: Decode as UTF-8
        # We do this carefully for sequences that look like our target
        def replacer(match):
            s = match.group(0)
            try:
                # ╨а = 0xD0 0xB0 in UTF-8
                # In CP437: ╨ is 0xD0, а is 0xB0
                return s.encode('cp437').decode('utf-8')
            except:
                try:
                    # Try CP850 if CP437 fails
                    return s.encode('cp850').decode('utf-8')
                except:
                    return s

        # Match sequences starting with ╨ or ╤ (the common UTF-8 lead bytes for Cyrillic)
        # and including the subsequent "box drawing" and high-ascii characters
        return re.sub(r'[╨╤][\u0080-\u257f]+', replacer, text)
    except:
        return text

def process_file(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        fixed = fix_mojibake(content)
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
