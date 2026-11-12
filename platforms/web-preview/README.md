# 浏览器原型

当前可运行。页面、交互与样式放在 src/；浏览器宿主存档接口集中在 src/host-adapter.js。视频补给是模拟流程。

- src/：平台代码与服务适配。
- assets/：本平台专用资源与共享素材覆盖清单。
- platform.json：状态、目录、资源清单与构建配置。
- 构建产物：dist/web-preview/。

运行：python3 scripts/build_preview.py（项目根目录）。

共用玩法引用 shared/core/，共用素材引用 shared/assets/，不在各平台复制整份。规则与素材选择见 [工程说明](../../docs/architecture.md)。
