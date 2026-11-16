"""Package browser evidence and native-resolution shared-renderer effects."""
import json
import shutil
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
out = root / 'previews'
folder = out / 'lobby-audit'
revision = sys.argv[1] if len(sys.argv)>1 else 'v6'
assert revision in ['v6','v7']
records = json.loads((folder / 'fixed-capture-layout.json').read_text())
for entry in records:
    page = entry['page']
    assert entry['reference']['loaded'], page
    full = Image.open(folder / ('fixed-full-' + page + '.jpg'))
    for kind in ['actual', 'reference']:
        target = folder / (kind + '-' + page + '.jpg')
        before = folder / ('before-' + kind + '-' + page + '.jpg')
        if target.exists() and not before.exists(): shutil.copyfile(target, before)
        r = entry[kind]
        bounds = tuple(round(n) for n in [r['x'], r['y'], r['x'] + r['width'], r['y'] + r['height']])
        full.crop(bounds).save(target, quality=97, subsampling=0)
    shutil.copyfile(folder / ('actual-' + page + '.jpg'), out / ('lobby-'+revision+'-browser-' + page + '.jpg'))
    shutil.copyfile(out / ('lobby-v4-' + page + '.png'), out / ('lobby-'+revision+'-' + page + '.png'))

decor = next(e for e in records if e['page'] == 'decor')['actual']
bounds = tuple(round(n) for n in [decor['x'], decor['y'], decor['x']+decor['width'], decor['y']+decor['height']])
Image.open(folder/'fixed-full-decor-disabled.jpg').crop(bounds).save(folder/'actual-decor-disabled.jpg',quality=97,subsampling=0)

font = ImageFont.truetype('/System/Library/Fonts/Hiragino Sans GB.ttc', 25)
small = ImageFont.truetype('/System/Library/Fonts/Hiragino Sans GB.ttc', 18)
sheet = Image.new('RGB',(1780,934),'#193737')
d = ImageDraw.Draw(sheet)
for i,(page,label) in enumerate([('home','小摊'),('decor','装扮 · 试装'),('recipes','菜谱'),('market','夜市')]):
    x=20+i*440
    d.text((x+210,24),label,font=font,fill='#ffebc9',anchor='mm')
    picture=Image.open(folder/('actual-'+page+'.jpg'))
    assert picture.size==(420,840),picture.size
    sheet.paste(picture,(x,56))
d.text((20,909),'修复后的 Web 实际截图 · 独立真实通关回放档案 · 动态数值、价格与自动奖励按真实规则显示',font=small,fill='#e7ceaa')
sheet.save(out/'lobby-fixed-overview.jpg',quality=96,subsampling=0)

report=json.loads((root/'docs/lobby-visual-audit.json').read_text())
issues={i['id']:i for i in report['issues']}
rows=[]
for key in ['A01','S01','A02','A04']:
    issue=issues[key];x,y,w,h=issue['box'];height=min(300,max(150,round(h*430/w)))
    row=Image.new('RGB',(1430,height+86),'#fff2d7');draw=ImageDraw.Draw(row)
    draw.text((16,8),key+' '+issue['title'],font=font,fill='#633918')
    for i,(prefix,label) in enumerate([('reference','原稿'),('before-actual','修复前'),('actual','修复后')]):
        name='actual-decor-disabled.jpg' if key=='A04' and prefix=='actual' else prefix+'-'+issue['page']+'.jpg'
        source=Image.open(folder/name);scale=source.width/887
        crop=source.crop(tuple(round(v*scale) for v in [x,y,x+w,y+h]))
        factor=min(446/crop.width,height/crop.height)
        crop=crop.resize((round(crop.width*factor),round(crop.height*factor)),Image.Resampling.LANCZOS)
        px=16+i*476;draw.text((px,45),label,font=small,fill='#8e613e');row.paste(crop,(px+(446-crop.width)//2,75+(height-crop.height)//2))
    rows.append(row)
comparison=Image.new('RGB',(1470,sum(r.height+12 for r in rows)+72),'#193737');draw=ImageDraw.Draw(comparison)
draw.text((20,15),'原稿 / 修复前 / 修复后：字样、完整架体、胶囊弧度、禁用边缘',font=font,fill='#ffebc9')
y=60
for row in rows:comparison.paste(row,(20,y));y+=row.height+12
comparison.save(folder/'fixed-key-findings.jpg',quality=96,subsampling=0)
print('Packaged four actual browser effects, four native PNGs and four before/after evidence pairs')
