# 灯火大排档

夜市主题竖屏小游戏：看顾客小票、从叠牌取料、在七格盘中配菜，配齐后自动入锅快炒，上桌计入营业收入。微信小游戏为首发目标，后续预留抖音、小红书和境外发行；当前可运行的是浏览器原型。

最新界面按用户视频调整：紧凑招牌与三张小票、密集五列食材台、左侧七格备菜盘、右侧燃气炒锅。**已经取消撕单/拒单及赔付功能。** 关卡只以收入达标，不要求完成固定份数。

- [项目上下文与协作约定](AGENTS.md)
- [玩法设计](docs/game-design.html) · [工程说明](docs/architecture.md)
- [最新高清图](docs/video-style-hd.jpg) · [实际操作录屏](docs/video-style-demo.mp4) · [视频参考分析](docs/video-reference-notes.md)

## 工程目录

```text
shared/core/                 共享规则、收入、待出餐队列与存档
shared/assets/runtime/       共用运行素材
shared/assets/source/        美术原图与提示词
platforms/web-preview/       当前浏览器原型
platforms/wechat/            微信工程预留
platforms/douyin/            抖音工程预留
platforms/xiaohongshu/       小红书工程预留
platforms/overseas/          境外工程预留
scripts/                    构建和测试工具
tests/                      规则、宿主与构建测试
dist/<平台>/                生成产物，不提交版本库
design/archive/             历史视觉方案
docs/                       设计、截图、录屏与验证记录
project.json                平台注册表与共享依赖
```

共享内容只维护一份；各平台代码、SDK、配置与独有资源放在各自目录，素材差异通过 `assets/manifest.json` 覆盖。

## 运行与验证

Python 构建只使用标准库，JS 测试需要 Node.js。在根目录执行：

```sh
python3 scripts/build_preview.py
python3 scripts/build_hd_preview.py
python3 -m unittest discover -s tests/build -p 'test_*.py'
node scripts/test-game.cjs
node scripts/test-platform.cjs
```

打开 [浏览器原型](dist/web-preview/index.html)。左上角 ▶ 自动演示连续选料、快炒、调味、装盘和上菜，结束恢复原局面。另生成小于 1 MB 的 `lantern-stall.html` 内联稿与读取原图、四倍渲染的 `lantern-stall-hd-export.html`。

## 当前玩法

三张订单、九类材料、二十份配方、六十张叠牌、七格备菜盘；配方使用二至四份食材，允许重复材料。首关默认收入目标 ¥300，下一晚提高目标，不显示出餐份数。

配齐先生成待出餐记录，炒菜期间仍能继续取料。各份菜依次入锅，成菜飞回对应小票后计入菜价和小费，再补新订单。重复回调不重复入账。有待出餐时满盘先等待补单，避免提前判负。

道具为先搁一盘（移出前三味到旁盘）、放回一味（撤回尚未配齐的拿取）、重新理菜（只重排剩余食材）。模拟视频补给整轮限一次。

规则位于 `shared/core/game-engine.js`。页面和输入在 `platforms/web-preview/src/`，炒菜展示在 `cook-animation.js`，宿主存档在 `host-adapter.js`。存档版本 4 保留待出餐队列与唯一编号，兼容旧版本 2/3；旧经济字段不再导出。

## 美术与能力边界

最新[美术原图与完整提示词](shared/assets/source/video-style/)由内置 imagegen 工具生成；运行素材使用 JPEG/WebP。食材图标沿用此前素材。用户视频只作参考，不打入游戏。

历史效果图保留在 `docs/`，历史美术保留在归档或原有源目录。真实广告、平台 SDK、登录、支付、云存档、正式章节、商店、音效和顾客动画尚未接入；其他平台目前为待接入工程。
