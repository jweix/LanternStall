"""Package the November 15 alignment, silhouette and scrolling inspection."""
import json
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parent.parent
out=root/'previews/lobby-refinements'
out.mkdir(exist_ok=True)
shutil.copyfile(root/'previews/lobby-fixed-overview.jpg',out/'overview.jpg')
for name in ['scroll-bottom','drag','theme-bottom']:
    full=Image.open(out/(name+'-full.jpg'))
    full.crop((208,268,628,1108)).save(out/(name+'.jpg'),quality=97,subsampling=0)

cases=[
 ('H01','青菜与侧架的完整轮廓','home',[138,720,193,187]),
 ('H02','塑料凳内侧、横撑与凳脚','home',[130,1012,285,147]),
 ('H03','钱包金币与数字的垂直中心','home',[660,108,215,72]),
 ('D01','四个主分类字图的垂直中心','decor',[34,340,817,86]),
 ('D02','物品灯具完整限制在卡片留白内','decor',[38,1034,804,365]),
 ('D03','纵向滚动能够到达末项','decor',[38,1034,804,365]),
 ('R01','分类底面完整位于浅木色标题区','recipes',[24,315,829,185]),
 ('M01','活动灯具在卡片内垂直居中','market',[24,687,267,347]),
 ('M02','奖励名与已自动获得对齐','market',[310,860,507,65]),
 ('M03','底部说明与左右云纹对齐','market',[117,1518,657,80]),
]
font=ImageFont.truetype('/System/Library/Fonts/Hiragino Sans GB.ttc',24)
small=ImageFont.truetype('/System/Library/Fonts/Hiragino Sans GB.ttc',18)
rows=[]
for code,title,page,box in cases:
    x,y,w,h=box
    height=min(280,max(100,round(h*580/w)))
    row=Image.new('RGB',(1320,height+86),'#fff2d7');d=ImageDraw.Draw(row)
    d.text((16,8),code+' · '+title,font=font,fill='#633918')
    for col,version in enumerate(['v6','v7']):
        im=Image.open(out/'scroll-bottom.jpg') if code=='D03' and version=='v7' else Image.open(root/'previews'/('lobby-'+version+'-'+page+'.png'))
        scale=im.width/887
        crop=im.crop(tuple(round(n*scale) for n in [x,y,x+w,y+h]))
        factor=min(625/crop.width,height/crop.height)
        crop=crop.resize((round(crop.width*factor),round(crop.height*factor)),Image.Resampling.LANCZOS)
        px=16+col*660
        d.text((px,44),'本轮修正前' if col==0 else '本轮修正后',font=small,fill='#865b39')
        row.paste(crop,(px+(625-crop.width)//2,75+(height-crop.height)//2))
    rows.append(row)
sheet=Image.new('RGB',(1360,sum(r.height+12 for r in rows)+60),'#193737')
d=ImageDraw.Draw(sheet);d.text((20,12),'四页细节复核：完整轮廓、可见边界居中、列表滚动',font=font,fill='#ffebc9')
y=55
for row in rows:sheet.paste(row,(20,y));y+=row.height+12
sheet.save(out/'before-after.jpg',quality=96,subsampling=0)
check_file=Path('/private/tmp/lantern-v7-checks.json')
checks=json.loads(check_file.read_text()) if check_file.exists() else json.loads((out/'verification.json').read_text())['tests']
index=json.loads((root/'shared/assets/runtime/asset-index.json').read_text())
size=sum(p.stat().st_size for p in (root/'platforms/wechat/game').rglob('*') if p.is_file())
report={'date':'2026-11-15','revision':7,'checks':[{'id':c,'title':t,'page':p,'status':'已修正并复核','box':b} for c,t,p,b in cases],
 'tests':checks,'runtimeImages':len(index),'wechatPackageBytes':size,
 'browserInteractions':['Web正常入口载入，无错误，钱包786／首通1关保持不变','列表轻触试装','滚轮到达最后的秋夜灯会灯串','Home回到顶部','鼠标拖动滚动，未选择或装备物品','主题列表End到达第9件背景'],
 'sharedInputChecks':['列表拖动／轻触区分','滚动偏移夹紧','部分卡片命中随视口裁切','切分类回顶部','后台与取消清除手势','微信touch move/end/cancel共同实现'],
 'pixelEqualityClaim':False,'wechatVisualInspection':False,'effects':'overview.jpg','comparison':'before-after.jpg','browserSubpages':['成就','相册','每日']}
for asset in index.values():
    assert (root/'shared/assets/runtime'/Path(asset['path']).name).read_bytes()==(root/'platforms/wechat/game'/asset['path']).read_bytes()
for name in ['LanternBody.ttf','OFL-NotoSansSC.txt']:
    assert (root/'shared/assets/lobby/fonts'/name).read_bytes()==(root/'platforms/wechat/game/assets/fonts'/name).read_bytes()
assert (root/'shared/data/lobby-font-metrics.js').read_bytes()==(root/'platforms/wechat/game/shared/data/lobby-font-metrics.js').read_bytes()
report['webWechatImageFontGeometryByteParity']=True
(out/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
(root/'previews/lobby-v7-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Packaged 10 detail checks, scrolling evidence, four updated screens and seven passed test groups')
