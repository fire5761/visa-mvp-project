# calibrate_grid.py
import fitz

doc = fitz.open("assets/template.pdf")
page = doc[0]

# 50px 간격으로 좌표 그리드 라인 + 숫자 라벨 그리기
for x in range(0, int(page.rect.width), 50):
    page.draw_line((x, 0), (x, page.rect.height), color=(1, 0, 0), width=0.3)
    page.insert_text((x + 2, 10), str(x), fontsize=6, color=(1, 0, 0))
for y in range(0, int(page.rect.height), 50):
    page.draw_line((0, y), (page.rect.width, y), color=(0, 0, 1), width=0.3)
    page.insert_text((2, y + 8), str(y), fontsize=6, color=(0, 0, 1))

pix = page.get_pixmap(dpi=150)
pix.save("calibration_grid.png")
doc.close()
print("✅ calibration_grid.png 생성 완료")