"""Cut the authored modular art into shared, alpha-preserving runtime sprites.

Source illustration stays untouched. Cropping, palette export and cloth colour
variants are reproducible asset preparation, not per-platform rendering.
"""
from pathlib import Path
import colorsys
import json
from PIL import Image, ImageEnhance


def prepare(root, out):
    source = root / 'shared/assets/stall/source'
    result = {}
    for old in out.glob('stall-*'):
        if old.is_file(): old.unlink()

    def export(name, image, size, colors=96):
        image = image.copy().convert('RGBA')
        image.thumbnail(size, Image.Resampling.LANCZOS)
        image = image.quantize(colors=colors, method=Image.Quantize.FASTOCTREE)
        image.save(out / (name + '.png'), optimize=True)
        result[name] = {'path': 'assets/' + name + '.png', 'width': image.width, 'height': image.height}

    def trim(image):
        bounds = image.getchannel('A').point(lambda a: 255 if a > 14 else 0).getbbox()
        return image.crop(bounds) if bounds else image

    atlas = Image.open(source / 'props-atlas-v2.png').convert('RGBA')
    cells = ['awning', 'lamp', 'tables', 'ornament', 'menu', 'wok', 'plate', 'chef', 'sign']
    sizes = [(384, 190), (144, 248), (240, 180), (104, 138), (112, 150), (144, 112), (112, 88), (112, 180), (384, 190)]
    palettes=json.loads((root/'shared/assets/lobby/palettes.json').read_text())
    hues = {'base': None, 'warm': None, **{theme:colorsys.rgb_to_hsv(*(int(p['menu'][i:i+2],16)/255 for i in (1,3,5)))[0] for theme,p in palettes.items()}}

    def cloth_variant(image, hue, theme):
        if hue is None:
            return image
        pixels = []
        for r, g, b, a in getattr(image, 'get_flattened_data', image.getdata)():
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            # Recolour red cloth/ceramic only, preserving golden wood, highlights,
            # greens, metal and all alpha. Shadows and folds remain in the value.
            if (h < .10 or h > .94) and s > .38 and a:
                sat = s * (.42 if theme == 'bamboo' else .46 if theme == 'sea' else .58)
                value = v * (.86 if theme == 'bamboo' else .86 if theme == 'sea' else .88)
                r, g, b = (round(k * 255) for k in colorsys.hsv_to_rgb(hue, sat, value))
            pixels.append((r, g, b, a))
        image = image.copy()
        image.putdata(pixels)
        return image

    for i, slot in enumerate(cells):
        # The shared lobby compositor now owns every other independent sprite.
        # Keep only the legacy tabletop menu and alternate environments in use.
        if slot != 'menu': continue
        cell = trim(atlas.crop((i % 3 * atlas.width // 3, i // 3 * atlas.height // 3,
                                (i % 3 + 1) * atlas.width // 3, (i // 3 + 1) * atlas.height // 3)))
        if slot == 'sign':
            export('stall-sign', cell, sizes[i])
        else:
            for theme, hue in hues.items():
                export('stall-' + theme + '-' + slot, cloth_variant(cell, hue, theme), sizes[i], 80)

    quay = root / 'shared/assets/lobby/source/scene/v13'
    street = Image.open(quay / 'environment-festival.png').convert('RGB')
    street.thumbnail((512, 1024), Image.Resampling.LANCZOS)
    street.save(out / 'stall-night.jpg', quality=66, optimize=True)
    result['stall-night'] = {'path': 'assets/stall-night.jpg', 'width': street.width, 'height': street.height}
    for theme in ['bamboo', 'sea']:
        street = Image.open(quay / ('environment-' + theme + '.png')).convert('RGB')
        street.thumbnail((512, 1024), Image.Resampling.LANCZOS)
        name = 'stall-night-' + theme + '.jpg'
        street.save(out / name, quality=66, optimize=True)
        result['stall-night-' + theme] = {'path': 'assets/' + name, 'width': street.width, 'height': street.height}
    return result
