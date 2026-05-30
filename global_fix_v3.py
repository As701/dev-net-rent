import os
import re

def fix_manually(text):
    # Mapping common mojibake pairs to Cyrillic characters
    # This is a brute-force approach for the most frequent corruptions
    mapping = {
        '╨░': 'а', '╨▒': 'б', '╨▓': 'в', '╨│': 'г', '╨┤': 'д', '╨╡': 'е', '╤С': 'ё', '╨╢': 'ж',
        '╨╖': 'з', '╨╕': 'и', '╨╣': 'й', '╨║': 'к', '╨╗': 'л', '╨╝': 'м', '╨╜': 'н', '╨╛': 'о',
        '╨┐': 'п', '╤А': 'р', '╤Б': 'с', '╤В': 'т', '╤Г': 'у', '╤Д': 'ф', '╤Е': 'х', '╤Ж': 'ц',
        '╤З': 'ч', '╤И': 'ш', '╤Й': 'щ', '╤К': 'ъ', '╤Л': 'ы', '╤м': 'ь', '╤н': 'э', '╤О': 'ю',
        '╤П': 'я',
        '╨Р': 'А', '╨С': 'Б', '╨Т': 'В', '╨У': 'Г', '╨Ф': 'Д', '╨Х': 'Е', '╨е': 'Ё', '╨Ц': 'Ж',
        '╨Ч': 'З', '╨Ш': 'И', '╨Щ': 'Й', '╨Ъ': 'К', '╨Ы': 'Л', '╨Ь': 'М', '╨н': 'Н', '╨Ю': 'О',
        '╨Я': 'П', '╨а': 'Р', '╨б': 'С', '╨в': 'Т', '╨г': 'У', '╨д': 'Ф', '╨х': 'Х', '╨ж': 'Ц',
        '╨з': 'Ч', '╨и': 'Ш', '╨й': 'Щ', '╨й': 'Ъ', '╨л': 'Ы', '╨м': 'Ь', '╨н': 'Э', '╨ю': 'Ю',
        '╨я': 'Я',
        'тАФ': '—', 'тАУ': '–', 'тАЬ': '«', 'тАЭ': '»', 'тДЦ': '…'
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
