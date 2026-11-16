"""Explicit source authoring; normal builds only read independent manifest assets."""
from pathlib import Path
from collections import deque
from PIL import Image,ImageFilter,ImageChops
import json,shutil
root=Path(__file__).resolve().parent.parent;folder=root/'shared/assets/lobby'
generated=Path('/Users/jiangweixin/.codex/generated_images/01a1d9d4-01e7-79b3-8a0a-3cfd1804825e')
files={'stool':'exec-40882208-554b-4465-a1b6-a725b9f79c36.png','plant':'exec-fa39871b-48b9-4b66-886f-45ccc48e4e19.png'}
for name,file in files.items():
 target=folder/'source/master/v10'/f'{name}.png';target.parent.mkdir(parents=True,exist_ok=True)
 if not target.exists():shutil.copyfile(generated/file,target)
 im=Image.open(target).convert('RGBA');alpha=im.getchannel('A');w,h=im.size;data=alpha.tobytes();seen=bytearray(w*h);largest=[]
 for start,value in enumerate(data):
  if value<24 or seen[start]:continue
  seen[start]=1;queue=deque([start]);part=[]
  while queue:
   i=queue.popleft();part.append(i);x,y=i%w,i//w
   for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]:
    nx,ny=x+dx,y+dy;j=ny*w+nx
    if 0<=nx<w and 0<=ny<h and not seen[j] and data[j]>=24:seen[j]=1;queue.append(j)
  if len(part)>len(largest):largest=part
 mask=bytearray(w*h)
 for i in largest:mask[i]=255
 keep=Image.frombytes('L',im.size,bytes(mask)).filter(ImageFilter.MaxFilter(5));im.putalpha(ImageChops.multiply(alpha,keep));bounds=im.getchannel('A').point(lambda a:255 if a>24 else 0).getbbox();im=im.crop(bounds)
 dest=folder/'source/scene/v10'/f'{name}-complete.png';dest.parent.mkdir(parents=True,exist_ok=True);im.save(dest)
manifest=json.loads((folder/'manifest.json').read_text())
for a in manifest['assets']:
 if a['id'] in ['lobby-scene-stool','lobby-stool-right']:a['file']='source/scene/v10/stool-complete.png'
 if a['id']=='lobby-plant':a['file']='source/scene/v10/plant-complete.png'
(folder/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
record=json.loads((folder/'generation-v10.json').read_text()) if (folder/'generation-v10.json').exists() else {}
record.update({'tool':'built-in imagegen','intent':'repair extraction gaps and remove background remnants','assets':files,'invariants':'Original warm 2.5D style, red plastic stool, green plant in terracotta pot with double cream wave. Genuine transparent background; complete feet, crossbars and pot silhouette. No cabinet fragments in holes or leaf gaps.','authoring':'Source images are copied into source/master/v10; largest connected alpha component with its original antialiased fringe is extracted into independent source/scene/v10 objects.'})
(folder/'generation-v10.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
