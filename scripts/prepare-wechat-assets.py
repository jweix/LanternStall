"""Deterministic runtime-size exports; source art and alpha remain in shared/."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'platforms/wechat/game/assets'
manifest = json.loads((ROOT / 'shared/asset-manifest.json').read_text())
result = {}
for asset in manifest['assets']:
    kind, name = asset['kind'], asset['id']
    if kind not in ('dish', 'ingredient') and name not in ('wok', 'cloche', 'empty-plate'):
        continue
    source = Image.open(ROOT / 'shared' / asset['path']).convert('RGBA')
    box = asset['bbox']
    image = source.crop((box['x'], box['y'], box['x'] + box['w'], box['y'] + box['h']))
    image.thumbnail((320, 224) if kind == 'dish' else (192, 192), Image.Resampling.LANCZOS)
    target = OUT / (name + '.png')
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, optimize=True)
    result[name] = {'path': 'assets/' + target.name, 'width': image.width, 'height': image.height}

background = Image.open(ROOT / 'shared/assets/ui/base-scene-reference.png').convert('RGB')
background.resize((650, 1187), Image.Resampling.LANCZOS).save(OUT / 'scene.jpg', quality=84, optimize=True)
result['scene'] = {'path': 'assets/scene.jpg', 'width': 650, 'height': 1187}
(OUT.parent / 'asset-index.js').write_text('module.exports = ' + json.dumps(result, ensure_ascii=False) + ';\n')
