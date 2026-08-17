import os
import re

def fix_manually(text):
    # Mapping common mojibake pairs to Cyrillic characters
    # This is a brute-force approach for the most frequent corruptions
    mapping = {
        'а': 'а', 'б': 'б', 'в': 'в', 'г': 'г', 'д': 'д', 'е': 'е', 'ё': 'ё', 'ж': 'ж',
        'з': 'з', 'и': 'и', 'й': 'й', 'к': 'к', 'л': 'л', 'м': 'м', 'н': 'н', 'о': 'о',
        'п': 'п', 'р': 'р', 'с': 'с', 'т': 'т', 'у': 'у', 'ф': 'ф', 'х': 'х', 'ц': 'ц',
        'ч': 'ч', 'ш': 'ш', 'щ': 'щ', 'ъ': 'ъ', 'ы': 'ы', 'ь': 'ь', 'э': 'э', 'ю': 'ю',
        'я': 'я',
        'А': 'А', 'Б': 'Б', 'В': 'В', 'Г': 'Г', 'Д': 'Д', 'Е': 'Е', 'Ё': 'Ё', 'Ж': 'Ж',
        'З': 'З', 'И': 'И', 'Й': 'Й', 'К': 'К', 'Л': 'Л', 'М': 'М', 'Э': 'Н', 'О': 'О',
        'П': 'П', 'Р': 'Р', 'С': 'С', 'Т': 'Т', 'У': 'У', 'Ф': 'Ф', 'Х': 'Х', 'Ц': 'Ц',
        'Ч': 'Ч', 'Ш': 'Ш', 'Щ': 'Щ', 'Щ': 'Ъ', 'Ы': 'Ы', 'Ь': 'Ь', 'Э': 'Э', 'Ю': 'Ю',
        'Я': 'Я',
        '—': '—', '–': '–', '«': '«', '»': '»', '…': '…'
    }
    
    new_text = text
    for corrupted, correct in mapping.items():
        new_text = new_text.replace(corrupted, correct)
    return new_text

def process_file(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        fixed = fix_manually(content)
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
