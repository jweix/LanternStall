# 小红书

预留工程。发行形态、入口与工具链尚未确认；确认后在 src/ 中实现适配与渲染，平台工程配置放在本目录。

- src/：平台代码与服务适配。
- assets/：本平台专用资源与共享素材覆盖清单。
- platform.json：状态、目录、资源清单与构建配置。
- 构建产物：dist/xiaohongshu/。

暂未配置发布构建。

共用玩法引用 shared/core/，共用素材引用 shared/assets/，不在各平台复制整份。规则与素材选择见 [工程说明](../../docs/architecture.md)。
