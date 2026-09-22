import os

files_to_check = [
    'index.html',
    'package.json',
    'server.ts'
]

def scan_and_replace(filepath):
    if not os.path.exists(filepath):
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    new_content = new_content.replace('Dayspend', 'Dejz')
    new_content = new_content.replace('dayspend', 'dejz')
    new_content = new_content.replace('DAYSPEND', 'DEJZ')
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk('public/src'):
    for file in files:
        if file.endswith(('.ts', '.tsx', '.js', '.json', '.html', '.css')):
            scan_and_replace(os.path.join(root, file))

for f in files_to_check:
    scan_and_replace(f)

print("Replacement complete")
