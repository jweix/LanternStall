"""Cut the authored modular art into shared, alpha-preserving runtime sprites.

Source illustration stays untouched. Cropping, palette export and cloth colour
variants are reproducible asset preparation, not per-platform rendering.
"""
from pathlib import Path
import colorsys
from PIL import Image, ImageEnhance


def prepare(root, out):
    source = root / 'shared/assets/stall/source'
    result = {}

    def export(name, image, size, colors=96):
        image = image.copy().convert('RGBA')
        image.thumbnail(size, Image.Resampling.LANCZOS)
        image = image.quantize(colors=colors, method=Image.Quantize.FASTOCTREE)
        image.save(out / (name + '.png'), optimize=True)
        result[name] = {'path': 'assets/' + name + '.png', 'width': image.width, 'height': image.height}

    def trim(image):
        bounds = image.getchannel('A').point(lambda a: 255 if a > 14 else 0).getbbox()
        return image.crop(bounds) if bounds else image

    body = trim(Image.open(source / 'wooden-stall-v2.png').convert('RGBA'))
    export('stall-body', body, (640, 600), 128)
    atlas = Image.open(source / 'props-atlas-v2.png').convert('RGBA')
    cells = ['awning', 'lamp', 'tables', 'ornament', 'menu', 'wok', 'plate', 'chef', 'sign']
    sizes = [(384, 190), (80, 138), (240, 180), (104, 138), (112, 150), (144, 112), (112, 88), (112, 180), (384, 190)]
    hues = {'base': None, 'warm': .015, 'bamboo': .24, 'sea': .53, 'festival': .84}

    def cloth_variant(image, hue, theme):
        if hue is None:
            return image
        pixels = []
        for r, g, b, a in getattr(image, 'get_flattened_data', image.getdata)():
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            # Recolour red cloth/ceramic only, preserving golden wood, highlights,
            # greens, metal and all alpha. Shadows and folds remain in the value.
            if (h < .048 or h > .96) and s > .38 and a:
                sat = s * (.45 if theme == 'bamboo' else .50 if theme == 'sea' else .42 if theme == 'festival' else .82)
                value = v * (.88 if theme == 'bamboo' else .90 if theme == 'sea' else .86 if theme == 'festival' else 1)
                r, g, b = (round(k * 255) for k in colorsys.hsv_to_rgb(hue, sat, value))
            pixels.append((r, g, b, a))
        image = image.copy()
        image.putdata(pixels)
        return image

    for i, slot in enumerate(cells):
        cell = trim(atlas.crop((i % 3 * atlas.width // 3, i // 3 * atlas.height // 3,
                                (i % 3 + 1) * atlas.width // 3, (i // 3 + 1) * atlas.height // 3)))
        if slot == 'sign':
            export('stall-sign', cell, sizes[i])
        else:
            for theme, hue in hues.items():
                export('stall-' + theme + '-' + slot, cloth_variant(cell, hue, theme), sizes[i], 80)

    street = Image.open(source / 'night-market-v2.png').convert('RGB')
    street.thumbnail((800, 640), Image.Resampling.LANCZOS)
    street.save(out / 'stall-night.jpg', quality=82, optimize=True)
    result['stall-night'] = {'path': 'assets/stall-night.jpg', 'width': street.width, 'height': street.height}
    for theme in ['bamboo', 'sea']:
        street = Image.open(source / ('night-market-' + theme + '-v2.png')).convert('RGB')
        street.thumbnail((800, 640), Image.Resampling.LANCZOS)
        name = 'stall-night-' + theme + '.jpg'
        street.save(out / name, quality=82, optimize=True)
        result['stall-night-' + theme] = {'path': 'assets/' + name, 'width': street.width, 'height': street.height}
    return result
