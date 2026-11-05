"""Render a local pairing link as SVG. The link is read from stdin, never argv."""
import sys
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderSVG

value = sys.stdin.readline(2048).strip()
if not (value.startswith('http://') or value.startswith('https://')) or len(value) > 1024 or '#' not in value:
    raise SystemExit(2)
code = QrCodeWidget(value)
x1, y1, x2, y2 = code.getBounds()
scale = 320.0 / max(x2 - x1, y2 - y1)
drawing = Drawing(320, 320, transform=[scale, 0, 0, scale, -x1 * scale, -y1 * scale])
drawing.add(code)
svg = renderSVG.drawToString(drawing)
start = svg.find('<svg')
end = svg.rfind('</svg>')
if start < 0 or end < start:
    raise SystemExit(3)
sys.stdout.write(svg[start:end + len('</svg>')])
