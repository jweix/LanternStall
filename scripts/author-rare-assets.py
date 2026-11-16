"""Explicit source-authoring step. Runtime builds only read individual manifest objects."""
from pathlib import Path
from collections import deque
import json
import shutil
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
FOLDER = ROOT / 'shared/assets/lobby'
GENERATED = Path('/Users/jiangweixin/.codex/generated_images/01a1d9d4-01e7-79b3-8a0a-3cfd1804825e')
FILES = {
    'source/master/v9/star-atlas.png': 'exec-a0661af0-1b3c-49fe-a43a-fe49a59d1eee.png',
    'source/master/v9/harvest-atlas.png': 'exec-917702ea-af48-4325-8b60-e34dc4a5231a.png',
    'source/scene/v9/environment-star.png': 'exec-a4fb3487-ffe0-4e4e-932e-9ab30f7931c3.png',
    'source/scene/v9/environment-harvest.png': 'exec-84997d4c-7303-40fa-a482-086e66f38baa.png',
    'source/scene/v9/game-clean.png': 'exec-dfd8ab5e-6a58-4685-a0a0-6d79565030ed.png',
    'source/master/v9/star-roof.png': 'exec-e907b036-be86-4b07-bb59-ff51f2f103a4.png',
    'source/master/v9/harvest-roof.png': 'exec-ee55f00e-c923-4d25-b9b4-90b28feffe3f.png',
}
for destination, source in FILES.items():
    path = FOLDER / destination
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        shutil.copyfile(GENERATED / source, path)

def connected_object(image, threshold=24):
    """Keep largest authored alpha component and its original soft fringe."""
    alpha = image.getchannel('A')
    w, h = image.size
    pixels = alpha.tobytes()
    seen = bytearray(w*h)
    largest = []
    for start, value in enumerate(pixels):
        if value <= threshold or seen[start]:
            continue
        seen[start] = 1
        queue = deque([start])
        component = []
        while queue:
            pos = queue.popleft()
            component.append(pos)
            x, y = pos % w, pos // w
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)):
                nx, ny = x+dx, y+dy
                if 0 <= nx < w and 0 <= ny < h:
                    p = ny*w+nx
                    if not seen[p] and pixels[p] > threshold:
                        seen[p] = 1
                        queue.append(p)
        if len(component) > len(largest):
            largest = component
    mask = bytearray(w*h)
    for pos in largest:
        x, y = pos % w, pos // w
        for yy in range(max(0,y-2),min(h,y+3)):
            for xx in range(max(0,x-2),min(w,x+3)):
                p = yy*w+xx
                mask[p] = pixels[p]
    image.putalpha(Image.frombytes('L',(w,h),bytes(mask)))
    bounds = image.getchannel('A').point(lambda a:255 if a>24 else 0).getbbox()
    return image.crop(bounds) if bounds else image

slots = ['awning','lamp','tables','ornament','menu','plate','wok','chef','cloth']
prefix = {'awning':'lobby-scene-awning-', 'lamp':'lobby-lamp-', 'tables':'lobby-scene-stool-',
          'ornament':'lobby-plant-', 'menu':'stall-', 'plate':'lobby-plate-',
          'wok':'lobby-wok-', 'chef':'lobby-scene-chef-', 'cloth':'lobby-cloth-'}
limits = {'awning':[746,240], 'lamp':[124,210], 'tables':[176,164], 'ornament':[176,190],
          'menu':[96,120], 'plate':[176,100], 'wok':[240,120], 'chef':[300,285], 'cloth':[340,190]}
manifest = json.loads((FOLDER/'manifest.json').read_text())
assets = {a['id']:a for a in manifest['assets']}
records = []
for theme in ['star','harvest']:
    atlas = Image.open(FOLDER/f'source/master/v9/{theme}-atlas.png').convert('RGBA')
    for i, slot in enumerate(slots):
        x, y = i%3, i//3
        cell = atlas.crop((x*atlas.width//3,y*atlas.height//3,(x+1)*atlas.width//3,(y+1)*atlas.height//3))
        cell = connected_object(cell)
        relative = f'source/scene/v9/{theme}-{slot}.png'
        cell.save(FOLDER/relative)
        asset_id = f'stall-{theme}-menu' if slot=='menu' else prefix[slot]+theme
        assets[asset_id] = {'id':asset_id,'file':relative,'maxSize':limits[slot],'trim':True}
        if slot=='tables':
            assets['lobby-stool-right-'+theme] = dict(assets[asset_id],id='lobby-stool-right-'+theme)
        records.append({'theme':theme,'slot':slot,'source':relative,'size':list(cell.size)})
    assets['lobby-environment-'+theme] = {'id':'lobby-environment-'+theme,
        'file':f'source/scene/v9/environment-{theme}.png','maxSize':[640,480],'format':'jpeg'}
    roof=connected_object(Image.open(FOLDER/f'source/master/v9/{theme}-roof.png').convert('RGBA'),220)
    roof.save(FOLDER/f'source/scene/v9/{theme}-awning.png')
clean = Image.open(FOLDER/'source/scene/v9/game-clean.png').convert('RGB')
clean.resize((928,1695),Image.Resampling.LANCZOS).save(FOLDER/'source/scene/v9/game-clean-normalized.png')
assets.pop('lobby-game-clean',None)
# The normal cloth is a single foreground object from the approved game art.
original=Image.open(ROOT/'shared/assets/backgrounds/background-main.png').convert('RGBA')
cloth=original.crop((590,1628,928,1695))
mask=Image.new('L',cloth.size)
ImageDraw.Draw(mask).polygon([(82,0),(338,0),(338,67),(0,67),(15,29),(29,16),(47,7)],fill=255)
cloth.putalpha(mask)
cloth.save(FOLDER/'source/scene/v9/cloth-warm.png')
assets['lobby-cloth']={'id':'lobby-cloth','file':'source/scene/v9/cloth-warm.png','maxSize':[338,67]}
manifest['assets'] = list(assets.values())
(FOLDER/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(FOLDER/'source/master/v9/extraction.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(records,ensure_ascii=False,indent=2))
