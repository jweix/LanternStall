"""Copy the exact shared runtime image set into the generated WeChat package."""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'shared/assets/runtime'
OUT = ROOT / 'platforms/wechat/game/assets'
OUT.mkdir(parents=True, exist_ok=True)
index = json.loads((SOURCE / 'asset-index.json').read_text())
for asset in index.values():
    name = Path(asset['path']).name
    shutil.copyfile(SOURCE / name, OUT / name)
(OUT.parent / 'asset-index.js').write_text('module.exports = ' + json.dumps(index, ensure_ascii=False) + ';\n')
