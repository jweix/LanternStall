# 灯火大排档 · 夜市小炒

按菜谱配料的夜市消除小游戏，首发微信小游戏。点击没有被覆盖的食材，放进 7 格共享备菜栏；配齐某桌的多种材料后自动开炒、送菜，按菜品获得金币。

**收入记录本关流水；首通后存入永久金币钱包，用于装扮小摊。清空本关全部食材，包含备菜和暂存，并等最后一道菜送达后通关。不存在收入目标。**

启动进入小摊，底部“小摊／装扮／菜谱／夜市”四个页签复用同一套Canvas业务与绘制。真实通关接入金币、每日奖励、购买换装、菜谱、活动和本机存档。完整行为见[经营需求与验收](docs/11-product-requirements.md)，数值与活动规则见[运营与经济配置](docs/12-operations-and-economy.md)。

## 目录

| 路径 | 用途 |
| --- | --- |
| `AGENTS.md` | 后续 AI 接手项目的简要背景和规则 |
| `shared/core/` | 业务状态机、动效计算、分档可解牌堆 |
| `shared/runtime/` | 输入、工具、暂停、效果和换关控制 |
| `shared/rendering/` | 不依赖平台 API 的 Canvas 2D 绘制 |
| `shared/data/`、`shared/assets/` | 20 道菜、14 种食材、布局和原始透明 PNG |
| `platforms/wechat/` | 微信配置、入口、图片加载、生命周期和本地存档 |
| `platforms/web/` | 浏览器试玩；`demo/` 中保留原始固定时间轴展示 |
| `docs/` | 已修正规则的交接说明、当前实现状态和验收说明 |
| `reference/`、`previews/` | 历史视觉参考、确认视频和资源总览 |
| `tests/`、`scripts/` | 自动验证、构建和本机预览工具 |

未来新增平台时，在 `platforms/` 下分别建立 `douyin/`、`xiaohongshu/`、`overseas/` 等目录，复用公共核心；目前这些平台尚未实现。

## 运行微信小游戏

环境：Node.js 18+、Python 3 和 Pillow。无需安装 npm 依赖。若 Python 缺少 Pillow，可执行 `python3 -m pip install Pillow`。

```sh
npm run build:wechat
npm test
```

打开微信开发者工具，导入 **`platforms/wechat/`**。已配置 AppID `wx09cfd51ad5bcdb2f`、小游戏类型 `game`，游戏根目录为生成的 `game/`。

微信入口使用 `wx.createCanvas`，没有 WXML、Page 或浏览器 DOM。构建只复制所需公共代码、JSON 和共享运行图（原色食材裁透明留白，成品保留透明画框，背景保留设计分辨率），不包含视频、PDF、原始大图集和离线 base64 预览。当前主包约 **2.63 MiB**，构建强制检查本项目设定的 4 MiB 预算。

`platforms/wechat/game/` 不提交版本管理，每次修改后重新构建。请修改 `shared/` 和 `platforms/wechat/src/` 的源码。可通过环境变量 `LANTERN_PYTHON` 指定安装了 Pillow 的 Python。

## 浏览器试玩

```sh
npm run serve
```

打开 [本机试玩](http://127.0.0.1:4173/platforms/web/)。浏览器版与微信版复用同一套规则、控制、渲染和142张运行图片；启动时自动生成 `shared/assets/runtime/`，无需手动拷贝素材。

四个经营页签已按2026-11-14四页整体重构稿接入真实游戏，使用独立的887×1774等比画幅；闯关保持928×1695。原稿和改版说明在[工程内视觉参考](reference/lobby-redesign-2026-11-14/)，实际效果见[四页截图](previews/lobby-v4-overview.png)、[主题预览](previews/lobby-v4-themes.png)。[接入说明](docs/14-lobby-redesign.md)说明源码、资源构建、真实数据与原稿示例的区别。

纯环境、可换装物件、空白九切片组件与业务状态分离，四个页签均可操作：开张进入真实关卡，金币／购买／试装／装备／菜谱／相册／活动继续使用原存档。页面组装在`shared/rendering/lobby-ui.js`，底面、场景、布局分别位于`lobby-components.js`、`lobby-scene.js`和`shared/data/lobby-layout.js`；可复现素材处理在`scripts/prepare-lobby-assets.py`。没有新增购买价格或手动领取奖励规则。

原来的两个离线展示仍可直接双击 `platforms/web/demo/approved-animation.html`、`platforms/web/demo/asset-lab.html` 打开。它们是固定时间轴的视觉参考，结算弹窗也是演示，不能用来判断真实关卡完成条件。

## 当前范围

菜单配齐后立即交给独立厨房任务；0.28 秒餐盘确认、0.14 秒整卡收起，0.42 秒新菜单显示并接料，0.54 秒落稳。旧菜继续排队、炒制、送收入牌旁，并按原任务入账一次。最终规则与验收见 [菜单交接时序和表现](docs/10-menu-handoff.md)。

已接通选牌、错层遮挡、飞行预约、自动扣料、单锅排队、炒菜与送菜并行、金币结算、撤回、暂存取回、提示、暂停、失败重试、下一关与回店。两端以lantern-stall-v2保存钱包、首通、拥有与装备、愿望、菜谱、活动、相册和减少动效，并迁移旧解锁进度；不会恢复中途牌局。当前没有音频素材、账号、云同步、支付或实际广告配置。

关卡先确定各道菜的份数和三桌有限补单，再据配方生成 40 份材料，通过遮挡依赖和受控交错构造可解牌堆。前四关依次是入门、家常、忙碌、挑战，菜谱池从 3 种增至 6 种；后续按章轮换难度和全部 20 道菜。浏览器右侧可直接试玩四档。`npm run analyze:levels` 可复现策略通关率对比；固定策略结果已有梯度，真人难度仍需试玩校准。研究来源、算法和四档参数见 [关卡难度设计与实现](docs/09-level-generation.md)，项目状态见 [接手记录](docs/project-status.md)。

局内整体UI、纯背景、组件位置和做菜表现已移植 `dapaidang-handoff-v12-complete` 的完整交付版，位于 `shared/rendering/approved-ui.js`；真实选牌、菜单交接、FIFO厨房和经营结算继续由现有引擎事件驱动。原图已拷入shared，运行不依赖上级交付目录。取样见 `previews/ui-v12-flow.png` 与 `previews/ui-v12-comparison.png`。历史截图、视频与旧验收报告可能仍带有 `128/300` 等错误收入样式；它们仅供美术和节奏参考，当前规则以本说明与 `AGENTS.md` 为准。
