"""Build identical, self-contained web/WeChat sprites from delivered source art.

Only covered board sprites receive the approved CSS colour matrix. Original
menu/prep ingredients remain opaque and in their original colours.
"""
import json
import runpy
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'shared/assets/runtime'
OUT.mkdir(parents=True, exist_ok=True)
manifest = json.loads((ROOT / 'shared/asset-manifest.json').read_text())
result = {}


def save(name, image):
    target = OUT / (name + '.png')
    image = image.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
    image.save(target, optimize=True)
    result[name] = {'path': 'assets/' + target.name, 'width': image.width, 'height': image.height}


def covered(image):
    sepia = ((.393, .769, .189), (.349, .686, .168), (.272, .534, .131))
    pixels = []
    for r, g, b, a in image.getdata():
        v = (r / 255, g / 255, b / 255)
        q = [.35 * v[i] + .65 * sum(k * v[j] for j, k in enumerate(row)) for i, row in enumerate(sepia)]
        l = .213 * q[0] + .715 * q[1] + .072 * q[2]
        pixels.append(tuple(round(max(0, min(1, (.65 * x + .35 * l) * .75)) * 255) for x in q) + (a,))
    out = Image.new('RGBA', image.size)
    out.putdata(pixels)
    return out


for asset in manifest['assets']:
    kind, name = asset['kind'], asset['id']
    if kind not in ('dish', 'ingredient', 'game-background', 'game-button', 'game-overlay'):
        continue
    source = Image.open(ROOT / 'shared' / asset['path']).convert('RGBA')
    if kind == 'game-background':
        # Full design resolution: no downscaling of sign, awning, rim or scenery.
        target = OUT / 'scene.jpg'
        source.convert('RGB').save(target, quality=96, subsampling=0, optimize=True)
        result[name] = {'path': 'assets/scene.jpg', 'width': source.width, 'height': source.height}
    elif kind == 'ingredient':
        box = asset['bbox']
        image = source.crop((box['x'], box['y'], box['x'] + box['w'], box['y'] + box['h']))
        image.thumbnail((192, 192), Image.Resampling.LANCZOS)
        save(name, image)
        save(name + '-covered', covered(image))
    elif kind == 'dish':
        # Preserve the full transparent frame used by the approved movie.
        source.thumbnail((256, 192), Image.Resampling.LANCZOS)
        save(name, source)
    else:
        save(name, source)

result.update(runpy.run_path(str(ROOT / 'scripts/prepare-stall-assets.py'))['prepare'](ROOT, OUT))
result.update(runpy.run_path(str(ROOT / 'scripts/prepare-lobby-assets.py'))['prepare'](ROOT, OUT))
(OUT / 'asset-index.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print('Prepared %d shared runtime images' % len(result))
