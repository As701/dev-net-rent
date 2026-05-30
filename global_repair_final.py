import os
import re

def fix_manually(text):
    mapping = {
        "╨░": "а", "╨▒": "б", "╨▓": "в", "╨│": "г", "╨┤": "д", "╨╡": "е", "╤С": "ё", "╨╢": "ж",
        "╨╖": "з", "╨╕": "и", "╨╣": "й", "╨║": "к", "╨╗": "л", "╨╝": "м", "╨╜": "н", "╨╛": "о",
        "╨┐": "п", "╤А": "р", "╤Б": "с", "╤В": "т", "╤Г": "у", "╤Д": "ф", "╤Е": "х", "╤Ж": "ц",
        "╤З": "ч", "╤И": "ш", "╤Й": "щ", "╤К": "ъ", "╤Л": "ы", "╤м": "ь", "╤н": "э", "╤О": "ю",
        "╤П": "я",
        "╨Р": "А", "╨С": "Б", "╨Т": "В", "╨У": "Г", "╨Ф": "Д", "╨Х": "Е", "╨е": "Ё", "╨Ц": "Ж",
        "╨Ч": "З", "╨Ш": "И", "╨Щ": "Й", "╨Ъ": "К", "╨Ы": "Л", "╨Ь": "М", "╨н": "Н", "╨Ю": "О",
        "╨Я": "П", "╨а": "Р", "╨б": "С", "╨в": "Т", "╨г": "У", "╨д": "Ф", "╨х": "Х", "╨ж": "Ц",
        "╨з": "Ч", "╨и": "Ш", "╨й": "Щ", "╨л": "Ы", "╨м": "Ь", "╨н": "Э", "╨ю": "Ю", "╨я": "Я",
        "тАФ": "—", "тАУ": "–", "тАЬ": "«", "тАЭ": "»", "тДЦ": "…"
    }
    new_text = text
    # Order by length descending to avoid partial replacement of sequences
    sorted_keys = sorted(mapping.keys(), key=len, reverse=True)
    for k in sorted_keys:
        new_text = new_text.replace(k, mapping[k])
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
    except: return False

root = r"C:\Users\world\.dachago\tmp\system32\DachaGo"
extensions = (".html", ".js", ".ts", ".tsx", ".css", ".json")
fixed_count = 0
for r, dirs, files in os.walk(root):
    if any(x in r for x in ["node_modules", ".next", ".git"]): continue
    for f in files:
        if f.endswith(extensions):
            if process_file(os.path.join(r, f)): fixed_count += 1
print(f"Fixed files: {fixed_count}")
