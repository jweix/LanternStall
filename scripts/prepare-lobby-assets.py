"""Export semantic production components; never read or crop page mockups.

Each source file is one logical object/material. Layout and business states live
in JavaScript, not in images. Reference PNGs are deliberately outside this path.
"""
import colorsys
import hashlib
import json
from PIL import Image, ImageDraw, ImageChops


def prepare(root, out):
    folder = root / 'shared/assets/lobby'
    manifest = json.loads((folder / 'manifest.json').read_text())
    result = {}
    duplicates = {}
    palettes = json.loads((folder / 'palettes.json').read_text())
    authored_ids = {asset['id'] for asset in manifest['assets']}
    for old in out.glob('lobby-*'):
        if old.is_file(): old.unlink()

    def export(name, image, limit, truecolor=False):
        image = image.convert('RGBA'); image.thumbnail(tuple(limit), Image.Resampling.LANCZOS)
        # Quantize opaque RGB separately: alpha variation must not consume the
        # colour budget and turn cream/wood gradients into a few flat bands.
        alpha = image.getchannel('A')
        bounds = alpha.point(lambda a: 255 if a > 24 else 0).getbbox()
        count=224 if name=='lobby-scene-counter' else 96 if name.endswith('-disabled') else 128
        rgb = image.convert('RGB').quantize(colors=count, method=Image.Quantize.MEDIANCUT)
        edges = image.copy(); edges.putalpha(alpha.point(lambda a: a if a < 230 else 0))
        edge = edges.quantize(colors=32, method=Image.Quantize.FASTOCTREE)
        palette = (rgb.getpalette()+[0]*(count*3))[:count*3]; ep = edge.getpalette('RGBA'); opacity = [255]*count
        for i in range(32):
            palette += ep[i*4:i*4+3]; opacity.append(ep[i*4+3])
        data = bytearray(rgb.tobytes()); ed = edge.tobytes()
        for i, a in enumerate(alpha.tobytes()):
            if a < 230: data[i] = count + ed[i]
        image = Image.frombytes('P', image.size, bytes(data)); image.putpalette(palette)
        image.info['transparency'] = bytes(opacity)
        target = out / (name + '.png'); image.save(target, optimize=True)
        result[name] = {'path': 'assets/' + name + '.png', 'width': image.width, 'height': image.height}
        if bounds:
            x,y,right,bottom = bounds
            result[name]['contentBounds'] = [x,y,right-x,bottom-y]
        digest = hashlib.sha256(target.read_bytes()).hexdigest()
        if digest in duplicates:
            result[name]['path'] = result[duplicates[digest]]['path']; target.unlink()
        else: duplicates[digest] = name

    def outline(image):
        a = image.getchannel('A'); w, h = image.size; rows=[]
        for y in range(h):
            row=a.crop((0,y,w,y+1)).point(lambda v:255 if v>200 else 0).getbbox()
            if row: rows.append((y,row[0],row[2]-1))
        points=[(l/w,y/h) for y,l,r in rows]+[(r/w,y/h) for y,l,r in reversed(rows)]
        def simplify(points, tolerance):
            if len(points)<3: return points
            x,y=points[0]; ex,ey=points[-1]; dx,dy=ex-x,ey-y
            distances=[abs(dy*(px-x)-dx*(py-y))/(dx*dx+dy*dy)**.5 if dx or dy else ((px-x)**2+(py-y)**2)**.5 for px,py in points]
            index=max(range(len(points)),key=distances.__getitem__)
            return simplify(points[:index+1],tolerance)[:-1]+simplify(points[index:],tolerance) if distances[index]>tolerance else [points[0],points[-1]]
        return [[round(x,5),round(y,5)] for x,y in simplify(points,.0007)]

    def material_variant(image, asset_id, theme):
        # Authored material regions, not a hue threshold applied to a whole
        # scene. Plastic includes its orange highlights and antialiased edge;
        # clothing excludes hands/face; pottery excludes every green leaf.
        if theme in ['base', 'warm']: return image
        kind = {'lobby-scene-chef':'chef', 'lobby-scene-awning':'awning',
                'lobby-scene-stool':'stool', 'lobby-stool-right':'stool',
                'lobby-plant':'plant', 'lobby-wok':'wok', 'lobby-plate':'plate', 'lobby-cloth':'cloth'}[asset_id]
        color = palettes[theme]['stool' if kind=='cloth' else kind].lstrip('#')
        target = tuple(int(color[i:i+2], 16) / 255 for i in (0, 2, 4))
        th, tl, ts = colorsys.rgb_to_hls(*target)
        # Clothing is a semantic region. Skin shadows have red hues too; a
        # colour threshold alone paints the chin and fingers green/blue.
        clothing = Image.new('L',image.size,0)
        if kind=='chef':
            points=[(.475,.615),(.550,.615),(.505,.710),(.640,.710),(.685,.615),(.775,.615),(.780,1),(.320,1),(.375,.840),(.420,.700)]
            draw=ImageDraw.Draw(clothing)
            draw.polygon([(round(x*image.width),round(y*image.height)) for x,y in points],fill=255)
            # Bare right sleeve/hand overlaps the apron. Its shaded outline
            # must remain warm skin even when the fabric behind it is blue.
            hand=[(.675,.836),(.695,.802),(.730,.790),(.755,.735),(.815,.715),(.890,.740),(.930,.805),(.900,.858),(.855,.903),(.810,.935),(.770,.954),(.730,.935),(.695,.908),(.672,.870)]
            draw.polygon([(round(x*image.width),round(y*image.height)) for x,y in hand],fill=0)
        pixels=[]
        for i, (r,g,b,a) in enumerate(image.getdata()):
            x,y=(i % image.width)/image.width,(i//image.width)/image.height
            h,l,s=colorsys.rgb_to_hls(r/255,g/255,b/255)
            strength=0
            if a:
                if kind=='stool': strength=1
                elif kind=='cloth': strength=1 if (h<.10 or h>.94) and s>.22 else 0
                elif kind=='awning': strength=1 if (h<.10 or h>.94) and s>.22 and r>g*1.22 else 0
                elif kind=='chef': strength=1 if clothing.getpixel((i%image.width,i//image.width)) and (h<.08 or h>.95) and r>g*1.65 and r>b*1.8 else 0
                elif kind=='plant': strength=1 if y>.48 and h<.135 and r>g*1.23 and g>b*1.35 else 0
                elif kind=='plate':
                    radius=(((x-.5)/.49)**2+((y-.44)/.40)**2)**.5
                    strength=.70 if .82<radius<1.04 and l>.25 else 0
                elif kind=='wok':
                    radius=(((x-.365)/.365)**2+((y-.22)/.20)**2)**.5
                    strength=.35 if x<.74 and .84<radius<1.12 and l>.18 else 0
            if strength:
                # Keep the original value relief: folds, highlights, inner leg
                # shadows and ceramic texture survive the material recolour.
                light=max(.025,min(.96,l+(tl-.45)*(1-min(1,max(0,(l-.70)/.25)))))
                q=colorsys.hls_to_rgb(th,light,ts*(.72+.28*s))
                r,g,b=[round(old*(1-strength)+new*255*strength) for old,new in zip((r,g,b),q)]
            pixels.append((r,g,b,a))
        variant=image.copy();variant.putdata(pixels);return variant

    for asset in manifest['assets']:
        image = Image.open(folder / asset['file']).convert('RGBA')
        if asset.get('cleanAlpha'):
            # Discard detached transparent-output specks, keeping the authored
            # surface and its connected soft edge. No contour is redrawn.
            alpha = image.getchannel('A')
            component = alpha.point(lambda a: 1 if a > 12 else 0)
            ImageDraw.floodfill(component, (image.width//2, image.height//2), 2)
            image.putalpha(ImageChops.multiply(alpha, component.point(lambda a: 255 if a == 2 else 0)))
        if asset.get('crop'): image = image.crop(tuple(asset['crop']))
        if asset.get('trim'):
            bounds = image.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
            if bounds: image = image.crop(bounds)
        if asset.get('format') in ['jpeg', 'jpeg-shape']:
            image.thumbnail(tuple(asset['maxSize']), Image.Resampling.LANCZOS)
            name = asset['id'] + '.jpg'
            image.convert('RGB').save(out/name, quality=asset.get('quality',74 if asset['id'].startswith('lobby-environment-') else 84), optimize=True, progressive=True)
            result[asset['id']] = {'path':'assets/'+name,'width':image.width,'height':image.height}
            if asset.get('format') == 'jpeg-shape': result[asset['id']]['shape'] = outline(image)
            digest = hashlib.sha256((out/name).read_bytes()).hexdigest()
            if digest in duplicates:
                result[asset['id']]['path'] = result[duplicates[digest]]['path']
                (out/name).unlink()
            else: duplicates[digest] = asset['id']
        else:
            export(asset['id'], image, asset['maxSize'], asset.get('truecolor',False))
        if asset['id'] in ['lobby-button-primary','lobby-button-secondary','lobby-tab-normal']:
            disabled=image.copy(); opacity=disabled.getchannel('A')
            tint=Image.new('RGB',disabled.size,(187,143,93))
            disabled=Image.blend(disabled.convert('RGB'),tint,.24).convert('RGBA');disabled.putalpha(opacity)
            export(asset['id']+'-disabled',disabled,asset['maxSize'])
        if asset['id'] not in ['lobby-scene-chef', 'lobby-scene-awning', 'lobby-scene-stool', 'lobby-stool-right', 'lobby-plant', 'lobby-wok', 'lobby-plate', 'lobby-cloth']: continue
        material=image.copy();material.thumbnail(tuple(asset['maxSize']), Image.Resampling.LANCZOS)
        for theme in ['base','warm','bamboo','sea','festival']:
            if asset['id'] + '-' + theme in authored_ids: continue
            variant = material_variant(material, asset['id'], theme)
            export(asset['id'] + '-' + theme, variant, asset['maxSize'])
    return result
