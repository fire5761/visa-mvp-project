# fix_template_font.py — assets/template_d2.docx에 딱 한 번 실행
import docx
from docx.oxml.ns import qn

TARGET_FONT = "Noto Sans CJK KR"   # 또는 "UnDotum" (설치했다면)

doc = docx.Document("assets/template_d2.docx")

replaced = 0
for rFonts in doc.element.body.iter(qn('w:rFonts')):
    for attr in ['ascii', 'hAnsi', 'eastAsia', 'cs']:
        key = qn(f'w:{attr}')
        if rFonts.get(key) == '돋움':
            rFonts.set(key, TARGET_FONT)
            replaced += 1

print(f"교체된 폰트 참조: {replaced}개")
doc.save("assets/template_d2.docx")  # 같은 파일에 덮어씀