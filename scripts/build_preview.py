"""生成浏览器交互稿；仅打包共享依赖和 web-preview 平台资源。"""
from build_lib import render_preview

def main():
    fragment, output_dir = render_preview()
    size = len(fragment.encode('utf-8'))
    if size >= 1_000_000:
        raise ValueError(f'Embedded preview exceeds 1 MB: {size:,} bytes')
    output_dir.mkdir(parents=True, exist_ok=True)
    output = output_dir / 'lantern-stall.html'
    output.write_text(fragment, encoding='utf-8')
    browser_page = ('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">'
                    '<meta name="viewport" content="width=device-width,initial-scale=1">'
                    '<title>灯火大排档 · 今夜开张</title>'
                    '<style>body{margin:0;background:#262e40}</style></head><body>'
                    + fragment + '</body></html>')
    (output_dir / 'index.html').write_text(browser_page, encoding='utf-8')
    print(f'Built {output} ({size:,} bytes)')


if __name__ == '__main__':
    main()
