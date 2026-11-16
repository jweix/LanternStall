"""Create review-only evidence crops from browser screenshots, never production art."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
folder = root / 'previews/lobby-audit'
report = json.loads((root / 'docs/lobby-visual-audit.json').read_text())
records = {i['id']: i for i in report['issues']}
assert len(records) == len(report['issues']) == report['summary']['total']
assert report['summary']['high'] == sum(i['priority'] == '高' for i in records.values())
for issue in records.values():
    x, y, w, h = issue['box']
    assert 0 <= x < x + w <= 887 and 0 <= y < y + h <= 1774, issue['id']
    for src in issue['code']:
        source = root / src['file']
        assert source.exists(), source
        if src['line']:
            assert src['line'] <= len(source.read_text().splitlines()), src

for entry in json.loads((folder / 'capture-layout.json').read_text()):
    assert entry['reference']['loaded']
    full = Image.open(folder / ('full-' + entry['page'] + '.jpg'))
    for kind in ['actual', 'reference']:
        r = entry[kind]
        bounds = tuple(round(n) for n in [r['x'], r['y'], r['x'] + r['width'], r['y'] + r['height']])
        full.crop(bounds).save(folder / (kind + '-' + entry['page'] + '.jpg'), quality=96, subsampling=0)

font_path = '/System/Library/Fonts/Hiragino Sans GB.ttc'
font = ImageFont.truetype(font_path, 21)
small = ImageFont.truetype(font_path, 16)
keys = ['A01', 'S01', 'A02', 'A04']
rows = []
for key in keys:
    issue = records[key]
    x, y, w, h = issue['box']
    height = min(330, max(145, round(h * 430 / w)))
    row = Image.new('RGB', (940, height + 83), '#fff3d8')
    draw = ImageDraw.Draw(row)
    draw.text((18, 10), key + ' ' + issue['title'], font=font, fill='#60391f')
    for i, kind in enumerate(['reference', 'actual']):
        draw.text((18 + i * 470, 40), '原稿' if not i else '当前 Web', font=small, fill='#92613e')
        source = Image.open(folder / (kind + '-' + issue['page'] + '.jpg'))
        scale = source.width / 887
        crop = source.crop(tuple(round(n * scale) for n in [x, y, x + w, y + h]))
        crop.thumbnail((434, height), Image.Resampling.LANCZOS)
        if crop.width < 434 and crop.height < height:
            ratio = min(434 / crop.width, height / crop.height)
            crop = crop.resize((round(crop.width * ratio), round(crop.height * ratio)), Image.Resampling.LANCZOS)
        row.paste(crop, (18 + i * 470 + (434 - crop.width) // 2, 65 + (height - crop.height) // 2))
    rows.append(row)

sheet = Image.new('RGB', (980, sum(r.height for r in rows) + 125), '#193737')
draw = ImageDraw.Draw(sheet)
draw.text((20, 16), '四页走查：重点问题证据（未修复）', font=font, fill='#ffe6bd')
y = 60
for row in rows:
    sheet.paste(row, (20, y))
    y += row.height + 10
draw.text((20, sheet.height - 24), '同一设计坐标的浏览器截图局部；A04只比较外溢蒙层，不以状态文案不同判错。', font=small, fill='#ffe6bd')
sheet.save(folder / 'key-findings.jpg', quality=95, subsampling=0)
print('Validated %d issues and rendered four browser evidence pairs' % len(records))
