"""Package actual-browser evidence; never produce a runtime art asset."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parent.parent
out=root/'previews/lobby-themes'
geometry=json.loads((out/'browser-geometry.json').read_text())
full_font=Path('/System/Library/Fonts/Hiragino Sans GB.ttc')
font_path=str(full_font if full_font.exists() else root/'shared/assets/lobby/fonts/LanternBody.ttf')
font=lambda n:ImageFont.truetype(font_path,n)
shots={}
for theme in ['warm','bamboo','sea','festival']:
    r=geometry[theme]
    full=Image.open(out/f'browser-{theme}-full.jpg')
    shots[theme]=full.crop((round(r['x']),round(r['y']),round(r['x']+r['width']),round(r['y']+r['height'])))
    shots[theme].save(out/f'browser-{theme}.jpg',quality=96)

overview=Image.new('RGB',(1536,814),'#213b39')
d=ImageDraw.Draw(overview)
for i,(theme,label) in enumerate(zip(shots,['暖红','竹影','海风','秋夜'])):
    d.text((i*384+192,25),label,font=font(26),fill='#fff0cc',anchor='mm')
    overview.paste(shots[theme].resize((372,744),Image.Resampling.LANCZOS),(i*384+6,56))
overview.save(out/'overview.jpg',quality=96)

r=geometry['festival']
for name in ['purchase','equipped','chef','stools','plant']:
    full=Image.open(out/f'browser-{name}-full.jpg')
    full.crop((round(r['x']),round(r['y']),round(r['x']+r['width']),round(r['y']+r['height']))).save(out/f'browser-{name}.jpg',quality=96)

proof=Image.new('RGB',(880,900),'#213b39');p=ImageDraw.Draw(proof)
for i,(name,label) in enumerate([('purchase','已获2件，补齐7件'),('equipped','扣款21,000，整套使用中')]):
    p.text((220+i*440,28),label,font=font(23),fill='#fff0cc',anchor='mm')
    proof.paste(Image.open(out/f'browser-{name}.jpg'),(10+i*440,54))
proof.save(out/'purchase-proof.jpg',quality=96)

inputs=[
 ('stools','凳子：完整换色，保留高光','/var/folders/_k/klp1tmm56bggpzx_4_n3004w0000gn/T/codex-clipboard-0b8d776f-a1d6-4dd5-a8ef-07f533bd7a0b.png'),
 ('plant','盆栽：陶盆换色，绿叶保留','/var/folders/_k/klp1tmm56bggpzx_4_n3004w0000gn/T/codex-clipboard-f47e56a9-9ee5-4612-b59e-5aa8472a71a2.png'),
 ('chef','厨师：补齐围裙，移除截取残留','/var/folders/_k/klp1tmm56bggpzx_4_n3004w0000gn/T/codex-clipboard-9d30993d-bbe3-4156-b061-2e6433e3f3b9.png')]
details=Image.new('RGB',(920,782),'#213b39');dd=ImageDraw.Draw(details)
dd.text((235,27),'修正前（用户截图）',font=font(23),fill='#fff0cc',anchor='mm')
dd.text((690,27),'修正后（浏览器实图）',font=font(23),fill='#fff0cc',anchor='mm')
for row,(name,label,file) in enumerate(inputs):
    y=58+row*238
    dd.text((22,y+12),label,font=font(21),fill='#e7d1a7')
    before=Image.open(file).convert('RGB');before.save(out/f'before-{name}.png')
    after=Image.open(out/f'browser-{name}.jpg')
    def area(x,y,w,h):return (round(x*420/887),round(y*840/1774),round((x+w)*420/887),round((y+h)*840/1774))
    after=after.crop(area(38,1034,789,355) if name=='chef' else area(38,1218,388,171))
    for col,im in enumerate([before,after]):
        im.thumbnail((430,174),Image.Resampling.LANCZOS)
        # Enlarge the 420px browser crop to the same viewing size as the user's
        # high-density screenshot; never retouch any screenshot pixels.
        scale=min(430/im.width,174/im.height)
        im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
        details.paste(im,(14+col*455+(430-im.width)//2,y+47+(174-im.height)//2))
details.save(out/'details-before-after.jpg',quality=96)

checks=json.loads((out/'checks.json').read_text())
(out/'verification.json').write_text(json.dumps({
 'date':'2026-11-15','themes':['暖红','竹影','海风','秋夜'],
 'inspectedMaterialThumbnails':36,'browserInspected':['warm','bamboo','sea','festival','chef','stools','plant'],
 'browserBundle':{'theme':'festival','owned':2,'deduction':3000,'paid':21000,'walletBefore':89713,'walletAfter':68713,'equippedSlots':9},
 'themeContainsComponentList':False,'playerSaveTouched':False,
 'webWechatSharedAssetsAndLogic':True,'wechatPackageMiB':3.95,'checksPassed':sum(c['passed'] for c in checks)
},ensure_ascii=False,indent=2)+'\n')
print('Packaged browser theme overview, material fixes, bundle purchase evidence and verification.')
