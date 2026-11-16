"""Explicit semantic extraction: remove the old lamp from the fixed prep rack.

The independently equipped lamp owns its cap and tassel. Normal builds only
read the corrected rack object from the manifest, never page references.
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageChops

root = Path(__file__).resolve().parent.parent
folder = root / 'shared/assets/lobby'
source = folder / 'source/scene/v6/prep-rack-preview.png'
image = Image.open(source).convert('RGBA')
scale = 4
mask = Image.new('L', (image.width * scale, image.height * scale), 255)
outline = [(8, 0), (43, 0), (41, 34), (37, 38), (12, 38), (8, 34)]
ImageDraw.Draw(mask).polygon([(x * scale, y * scale) for x, y in outline], fill=0)
mask = mask.resize(image.size, Image.Resampling.LANCZOS)
image.putalpha(ImageChops.multiply(image.getchannel('A'), mask))
target = folder / 'source/scene/v11/prep-rack-preview.png'
target.parent.mkdir(parents=True, exist_ok=True)
image.save(target)
manifest = json.loads((folder / 'manifest.json').read_text())
next(a for a in manifest['assets'] if a['id'] == 'lobby-prep-rack-preview')['file'] = str(target.relative_to(folder))
(folder / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
(target.parent / 'extraction.json').write_text(json.dumps({
    'source': str(source.relative_to(folder)), 'asset': 'lobby-prep-rack-preview',
    'removedObject': 'old red lamp cap and tassel', 'removedOutline': outline,
    'preserved': 'rack, steamers, vegetables, tomato and existing transparent silhouette'
}, ensure_ascii=False, indent=2) + '\n')
