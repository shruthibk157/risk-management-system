import os

file_path = r'c:\Users\User\Documents\risk-management-system\backend\engine.js'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if "if (err) {" in line and "Index creation skipped" in lines[lines.index(line)+1]:
        new_lines.append(line)
        new_lines.append("      console.log('Index creation skipped:', err.message);\n")
        new_lines.append("    }\n")
        new_lines.append("  });\n")
        skip = True
    elif skip and "  // Knowledge Extraction Support" in line:
        skip = False
        new_lines.append(line)
    elif not skip:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Updated engine.js")
