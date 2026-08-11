# discover_labels.py
import fitz

doc = fitz.open("assets/template.pdf")
page = doc[0]

words = page.get_text("words")  # (x0, y0, x1, y1, "단어", ...)
for w in sorted(words, key=lambda x: (x[1], x[0])):  # y좌표 → x좌표 순 정렬
    x0, y0, x1, y1, text = w[0], w[1], w[2], w[3], w[4]
    print(f"'{text}'  x0={x0:.1f} y0={y0:.1f} x1={x1:.1f} y1={y1:.1f}")

doc.close()