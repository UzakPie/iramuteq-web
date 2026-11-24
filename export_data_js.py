import json
import os

with open('iramuteq_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

js_content = "window.IRAMUTEQ_PRECOMPUTED_DATA = " + json.dumps(data, ensure_ascii=False) + ";\n"

with open('data.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"data.js generated: {os.path.getsize('data.js')} bytes")
