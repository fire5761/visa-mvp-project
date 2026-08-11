# fix_template_font_v2.py
import docx
from docx.oxml.ns import qn

doc = docx.Document("assets/template_d2.docx")

TARGET_FONT = "NanumGothic"
replaced = 0
for rFonts in doc.element.body.iter(qn('w:rFonts')):
    for attr in ['ascii', 'hAnsi', 'eastAsia', 'cs']:
        key = qn(f'w:{attr}')
        if rFonts.get(key) == 'Noto Sans CJK KR':
            rFonts.set(key, TARGET_FONT)
            replaced += 1

print(f"교체된 폰트 참조: {replaced}개")
doc.save("assets/template_d2.docx")