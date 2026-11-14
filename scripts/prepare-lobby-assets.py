"""Export semantic production components; never read or crop page mockups.

Each source file is one logical object/material. Layout and business states live
in JavaScript, not in images. Reference PNGs are deliberately outside this path.
"""
import colorsys
import json
from PIL import Image


def prepare(root, out):
    folder = root / 'shared/assets/lobby'
    manifest = json.loads((folder / 'manifest.json').read_text())
    result = {}
    for old in out.glob('lobby-*'):
        if old.is_file(): old.unlink()

    def export(name, image, limit):
        image = image.convert('RGBA'); image.thumbnail(tuple(limit), Image.Resampling.LANCZOS)
        image = image.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
        image.save(out / (name + '.png'), optimize=True)
        result[name] = {'path': 'assets/' + name + '.png', 'width': image.width, 'height': image.height}

    hues = {'base': None, 'warm': .005, 'bamboo': .24, 'sea': .53, 'festival': .84}
    for asset in manifest['assets']:
        image = Image.open(folder / asset['file']).convert('RGBA')
        if asset.get('format') == 'jpeg':
            image.thumbnail(tuple(asset['maxSize']), Image.Resampling.LANCZOS)
            name = asset['id'] + '.jpg'
            image.convert('RGB').save(out/name, quality=88, optimize=True)
            result[asset['id']] = {'path':'assets/'+name,'width':image.width,'height':image.height}
        else:
            export(asset['id'], image, asset['maxSize'])
        if asset['id'] not in ['lobby-scene-chef', 'lobby-scene-awning', 'lobby-scene-stool']: continue
        for theme, hue in hues.items():
            variant = image.copy()
            if hue is not None:
                pixels = []
                for pixel, (r, g, b, a) in enumerate(image.getdata()):
                    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
                    # Standalone garment/cloth/plastic only; no scene, food,
                    # UI or other equipment can be accidentally recoloured.
                    if (h < .045 or h > .96) and s > .55 and a and (asset['id'] != 'lobby-scene-chef' or pixel // image.width > image.height * .62):
                        r, g, b = (round(n * 255) for n in colorsys.hsv_to_rgb(hue, s * (.85 if theme == 'warm' else .5), v * (1 if theme == 'warm' else .92)))
                    pixels.append((r, g, b, a))
                variant.putdata(pixels)
            export(asset['id'] + '-' + theme, variant, asset['maxSize'])
    return result
