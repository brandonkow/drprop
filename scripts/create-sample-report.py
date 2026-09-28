"""Create the bundled fictional diagnosis used by the app preview."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

root = Path(__file__).resolve().parents[1]
target = root / 'app/src/assets/sample-diagnosis.pdf'
target.parent.mkdir(parents=True, exist_ok=True)
fonts = root / 'app/node_modules/@expo-google-fonts'
font_names = [('Geist', fonts / 'geist/400Regular/Geist_400Regular.ttf'), ('InstrumentSerif', fonts / 'instrument-serif/400Regular/InstrumentSerif_400Regular.ttf')]
for name, path in font_names:
    if not path.exists():
        raise FileNotFoundError(f'Install app font dependencies before generating: {path}')
    pdfmetrics.registerFont(TTFont(name, str(path)))
c = canvas.Canvas(str(target), pagesize=A4, invariant=1)
c.setTitle('Dr Prop - fictional sample diagnosis')
c.setAuthor('Dr Prop preview')
w, h = A4
c.setFillColor(HexColor('#F4F1EA')); c.rect(0, 0, w, h, fill=1, stroke=0)
def text(x, y, value, size=11, face='Geist', color='#1C1B19'):
    c.setFillColor(HexColor(color)); c.setFont(face, size); c.drawString(x, y, value)
text(48, h-58, 'DR. PROP / PROPERTY CLINIC', 11)
text(48, h-88, 'FICTIONAL SAMPLE - NOT A PROPERTY ASSESSMENT', 9, color='#686259')
text(48, h-154, 'A little more clarity.', 38, 'InstrumentSerif')
text(48, h-186, 'Sample terrace / 01 September 2026', 11)
c.setStrokeColor(HexColor('#D9CFBF')); c.line(48, h-213, w-48, h-213)
sections = [
    ('01 / WHAT WE KNOW', ['This is a demonstration of the report format.', 'No property documents, inspection or market evidence were reviewed.']),
    ('02 / QUESTIONS TO TAKE AWAY', ['What documents remain outstanding?', 'Which costs recur after the purchase?', 'What needs independent inspection?']),
    ('03 / NEXT STEPS', ['Gather the title documents and recurring-cost schedule.', 'Record unresolved questions and seek the relevant professional review.', 'Book a final check after the outstanding information is available.']),
]
y = h-253
for label, lines in sections:
    text(48, y, label, 9, color='#686259'); y -= 30
    for line in lines:
        text(48, y, line); y -= 21
    y -= 35
text(48, 112, 'ADVISER NOTE / SAMPLE', 9, color='#686259')
text(48, 88, 'Illustrative information only. No legal, tax or financial advice.', 10)
text(48, 48, 'DR. PROP PREVIEW', 8, color='#686259'); text(w-70, 48, '1 / 1', 8)
c.save()
print(target)
