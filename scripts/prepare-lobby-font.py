"""Explicit authoring step; normal builds copy the checked-in font subset.

Run with Python + fonttools when lobby copy/catalog characters change. Never
depend on the developer machine's proprietary fonts in the shipping package.
"""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
import argparse
import json
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.boundsPen import BoundsPen

root = Path(__file__).resolve().parent.parent
folder = root / 'shared/assets/lobby'
text = ''.join(chr(n) for n in range(32, 127)) + '…？·／，。！：—'
for directory in ['rendering', 'runtime', 'core', 'data']:
    for path in (root / 'shared' / directory).rglob('*'):
        if path.suffix in ['.js', '.json']:
            text += path.read_text()
font = TTFont(folder / 'source/fonts/ZCOOLKuaiLe-Regular.ttf')
options = subset.Options()
options.recalc_timestamp = False
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=text)
subsetter.subset(font)
for record in font['name'].names:
    if record.nameID in [1, 3, 4, 6, 16]:
        record.string = 'LanternDisplay'.encode(record.getEncoding())
target = folder / 'fonts'
target.mkdir(exist_ok=True)
font.save(target / 'LanternDisplay.ttf')
coverage = {'display': ''.join(chr(n) for n in sorted(font.getBestCmap()))}
(target / 'OFL.txt').write_bytes((folder / 'source/fonts/OFL.txt').read_bytes())
parser = argparse.ArgumentParser()
parser.add_argument('--body-source', type=Path)
args = parser.parse_args()
if args.body_source:
    body = TTFont(args.body_source)
    body_subset = subset.Subsetter(options=options)
    body_subset.populate(text=text)
    body_subset.subset(body)
    body = instantiateVariableFont(body, {'wght': 500}, inplace=True)
    # Canvas UI uses horizontal text only. Omit vertical advance tables while
    # retaining the same outlines, horizontal metrics and shaping features.
    for table in ['vhea', 'vmtx']:
        if table in body:
            del body[table]
    for record in body['name'].names:
        if record.nameID in [1, 3, 4, 6, 16]:
            record.string = 'LanternBody'.encode(record.getEncoding())
    body.save(target / 'LanternBody.ttf')
    coverage['body'] = ''.join(chr(n) for n in sorted(body.getBestCmap()))
else:
    coverage['body'] = ''.join(chr(n) for n in sorted(TTFont(target / 'LanternBody.ttf').getBestCmap()))
(target / 'coverage.json').write_text(json.dumps(coverage, ensure_ascii=False))
body = TTFont(target / 'LanternBody.ttf')
glyphs = body.getGlyphSet()
bounds = {}
for code, name in body.getBestCmap().items():
    pen = BoundsPen(glyphs)
    glyphs[name].draw(pen)
    if pen.bounds:
        bounds[str(code)] = [round(pen.bounds[1]), round(pen.bounds[3])]
metrics = json.dumps({'unitsPerEm':body['head'].unitsPerEm,'bounds':bounds},separators=(',',':'))
(root/'shared/data/lobby-font-metrics.js').write_text("/* Ink heights from the bundled LanternBody font; shared by every Canvas. */\n(function(r,f){if(typeof module==='object'&&module.exports)module.exports=f();else r.DapaidangLobbyFontMetrics=f();})(typeof globalThis!=='undefined'?globalThis:this,function(){return "+metrics+";});\n")
print('Prepared shared LanternDisplay font subset')
