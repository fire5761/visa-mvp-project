# check_form_fields.py
import fitz

doc = fitz.open("assets/template.pdf")
page = doc[0]

widgets = list(page.widgets())
if widgets:
    print(f"✅ AcroForm 필드 {len(widgets)}개 발견!")
    for w in widgets:
        print(f"  필드명: {w.field_name}, 타입: {w.field_type_string}, 위치: {w.rect}")
else:
    print("❌ AcroForm 필드 없음 — 플랫 PDF입니다. 라벨 기반 자동 탐지가 필요합니다.")

doc.close()