"""从 UI 源码和原始美术生成 4 倍渲染页，供浏览器导出高清效果图。"""
from build_lib import render_preview

prefix = '''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=1560,initial-scale=1">
<title>灯火大排档 高清效果图</title>
<style>
html,body{margin:0;padding:0;width:1560px;background:#fff7e9;}
body[data-hd-export] #lantern-stall-preview{width:390px;zoom:4;padding:0;margin:0;background:none;}
body[data-hd-export] #lantern-stall-preview .ls-phone{width:390px;max-width:390px;box-shadow:none;}
body[data-hd-export] #lantern-stall-preview *,body[data-hd-export] #lantern-stall-preview *:before,body[data-hd-export] #lantern-stall-preview *:after{transition:none!important;animation:none!important;}
</style></head><body data-hd-export>
'''
def main():
    fragment, output_dir = render_preview(high_resolution=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    output = output_dir / 'lantern-stall-hd-export.html'
    output.write_text(prefix + fragment + '\n</body></html>\n', encoding='utf-8')
    print(f'Built {output}')


if __name__ == '__main__':
    main()
