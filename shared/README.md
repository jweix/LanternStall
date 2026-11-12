# 共享内容

`core/game-engine.js` 为纯 JavaScript 玩法规则，通过 `globalThis.LanternGame` 提供接口；它不依赖平台或渲染环境。共用规则测试在 `tests/core/`。

`assets/runtime/` 保存运行素材，`assets/source/` 保存原图与提示词，`assets/manifest.json` 定义逻辑资源名。平台只保留自己独有或需要覆盖的素材，选择规则见 [工程说明](../docs/architecture.md)。
