import os
import re

def fix_manually(text):
    mapping = {
        "а": "а", "б": "б", "в": "в", "г": "г", "д": "д", "е": "е", "ё": "ё", "ж": "ж",
        "з": "з", "и": "и", "й": "й", "к": "к", "л": "л", "м": "м", "н": "н", "о": "о",
        "п": "п", "р": "р", "с": "с", "т": "т", "у": "у", "ф": "ф", "х": "х", "ц": "ц",
        "ч": "ч", "ш": "ш", "щ": "щ", "ъ": "ъ", "ы": "ы", "ь": "ь", "э": "э", "ю": "ю",
        "я": "я",
        "А": "А", "Б": "Б", "В": "В", "Г": "Г", "Д": "Д", "Е": "Е", "Ё": "Ё", "Ж": "Ж",
        "З": "З", "И": "И", "Й": "Й", "К": "К", "Л": "Л", "М": "М", "Э": "Н", "О": "О",
        "П": "П", "Р": "Р", "С": "С", "Т": "Т", "У": "У", "Ф": "Ф", "Х": "Х", "Ц": "Ц",
        "Ч": "Ч", "Ш": "Ш", "Щ": "Щ", "Ы": "Ы", "Ь": "Ь", "Э": "Э", "Ю": "Ю", "Я": "Я",
        "—": "—", "–": "–", "«": "«", "»": "»", "…": "…"
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
