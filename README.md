# 灯火大排档 · 夜市小炒

按菜谱配料的夜市消除小游戏，首发抖音小游戏。点击没有被覆盖的食材，放进 7 格共享备菜栏；配齐某桌的多种材料后自动开炒、送菜，按菜品获得金币。

**收入记录本关流水；首通后存入永久金币钱包，用于装扮小摊。清空本关全部食材，包含备菜和暂存，并等最后一道菜送达后通关。不存在收入目标。**

启动进入小摊，底部“小摊／装扮／菜谱／夜市”四个页签复用同一套Canvas业务与绘制。真实通关接入金币、每日奖励、购买换装、菜谱、活动和本机存档。完整行为见[经营需求与验收](docs/11-product-requirements.md)，数值与活动规则见[运营与经济配置](docs/12-operations-and-economy.md)。

## 目录

| 路径 | 用途 |
| --- | --- |
| `AGENTS.md` | 后续 AI 接手项目的简要背景和规则 |
| `shared/core/` | 业务状态机、动效、可变盘面与有界求解 |
| `shared/data/level-config.js` | 各关统一菜品列表、形状、层数和种子 |
| `shared/runtime/` | 输入、工具、暂停、效果和换关控制 |
| `shared/rendering/` | 不依赖平台 API 的 Canvas 2D 绘制 |
| `shared/data/`、`shared/assets/` | 20 道菜、14 种食材、布局和原始透明 PNG |
| `platforms/douyin/` | 抖音首发适配、入口、安全区、生命周期、本地存档和侧边栏每日复访 |
| `platforms/wechat/` | 保留微信适配与原有 AppID |
| `platforms/web/` | 浏览器试玩；`demo/` 中保留原始固定时间轴展示 |
| `docs/` | 已修正规则的交接说明、当前实现状态和验收说明 |
| `reference/`、`previews/` | 历史视觉参考、确认视频和资源总览 |
| `tests/`、`scripts/` | 自动验证、构建和本机预览工具 |

抖音、微信和浏览器复用公共核心。未来新增小红书或海外平台时，在 `platforms/` 下建立独立适配目录。

## 运行抖音小游戏

首次注册、主体认证、AppID、测试号、真机扫码和上线材料见[抖音首发指南](docs/15-douyin-launch.md)。没有发过抖音视频也可以开始开发。

```sh
npm run build:douyin
npm run test:douyin
```

抖音开发者工具选「小游戏」，导入 **`platforms/douyin/game/`**。正式AppID `tt727304ceec0e853e02`已写入`platforms/douyin/project.config.json`，构建自动同步到生成包；IDE登录账号须拥有对应开发权限。当前完成游戏端适配、侧边栏主页引导与每日200金币自动发放／持久化去重；资质、实际IDE编译、真机与提审验收未完成。

全平台验证：`npm run build` 后 `npm test`。

## 运行微信小游戏

环境：Node.js 18+、Python 3 和 Pillow。无需安装 npm 依赖。若 Python 缺少 Pillow，可执行 `python3 -m pip install Pillow`。

```sh
npm run build
npm test
```

打开微信开发者工具，导入 **`platforms/wechat/`**。已配置 AppID `wx09cfd51ad5bcdb2f`、小游戏类型 `game`，游戏根目录为生成的 `game/`。

微信入口使用 `wx.createCanvas`，没有 WXML、Page 或浏览器 DOM。构建只复制所需公共代码、JSON 和共享运行图（原色食材裁透明留白，成品保留透明画框，背景保留设计分辨率），不包含视频、PDF、原始大图集、实验室、离线分析器和候选报告。当前主包接近 **4 MiB**，构建强制检查本项目设定的 4 MiB 预算。

`platforms/wechat/game/` 不提交版本管理，每次修改后重新构建。请修改 `shared/` 和 `platforms/wechat/src/` 的源码。可通过环境变量 `LANTERN_PYTHON` 指定安装了 Pillow 的 Python。

## 浏览器试玩

```sh
npm run serve
```

打开 [本机试玩](http://127.0.0.1:4173/platforms/web/)。浏览器版、抖音版与微信版复用同一套规则、控制、渲染和256张运行图片；启动时自动生成 `shared/assets/runtime/`，无需手动拷贝素材。

[关卡实验室](http://127.0.0.1:4173/platforms/web/lab/)不读写经营存档，可编辑本关订单JSON、查看分层、求解与单步、运行基础策略及导入导出操作记录。复杂道具预算用 `npm run analyze:levels -- --levels 1,20,40,64 --trials 16 --tools`，扩样用 `npm run test:levels:full`。候选筛选、回放命令及配置示例见[关卡配置说明](docs/09-level-generation.md)。

[道具验证关 TG01](http://127.0.0.1:4173/platforms/web/lab/?experiment=tool-gate)独立验证“无道具必无解、一次移出可通关”，不进入主线、不播放真实广告。`npm run analyze:tool-gate` 可复现几何容量证明、真实引擎穷举和快速输入通关路线；实验配置在 `platforms/web/lab/experiments/tool-gate.js`。

[可配置道具生成模式](http://127.0.0.1:4173/platforms/web/lab/?experiment=generated-tool-gate)支持菜单、形状、层数、种子、门槛与搜索预算，自动分配材料并验证。`npm run levels:generate:tool-gate -- --config configs/experiments/tool-gate.json --count 3` 输出实验关 JSON，可导入实验室；当前仅支持一次移出，不接主线。完整配置、第二个示例、导入与故障排查见[生成说明](docs/16-tool-gate-generation.md)，`npm run test:tool-gate` 执行专项回归。

四个经营页签已按2026-11-14四页整体重构稿接入真实游戏，使用独立的887×1774等比画幅；闯关保持928×1695。原稿和改版说明在[工程内视觉参考](reference/lobby-redesign-2026-11-14/)，实际效果见[四页截图](previews/lobby-v4-overview.png)、[主题预览](previews/lobby-v4-themes.png)。[接入说明](docs/14-lobby-redesign.md)说明源码、资源构建、真实数据与原稿示例的区别。

纯环境、可换装物件、空白九切片组件与业务状态分离，四个页签均可操作：开张进入真实关卡，金币／购买／试装／装备／菜谱／相册／活动继续使用原存档。页面组装在`shared/rendering/lobby-ui.js`，底面、场景、布局分别位于`lobby-components.js`、`lobby-scene.js`和`shared/data/lobby-layout.js`；可复现素材处理在`scripts/prepare-lobby-assets.py`。没有新增购买价格或手动领取奖励规则。

原来的两个离线展示仍可直接双击 `platforms/web/demo/approved-animation.html`、`platforms/web/demo/asset-lab.html` 打开。它们是固定时间轴的视觉参考，结算弹窗也是演示，不能用来判断真实关卡完成条件。

## 当前范围

菜单配齐后立即交给独立厨房任务；0.28 秒餐盘确认、0.14 秒整卡收起，0.42 秒新菜单显示并接料，0.54 秒落稳。旧菜继续排队、炒制、送收入牌旁，并按原任务入账一次。最终规则与验收见 [菜单交接时序和表现](docs/10-menu-handoff.md)。

已接通选牌、错层遮挡、飞行预约、自动扣料、单锅排队、炒菜与送菜并行、金币结算、撤回、移出三张及取回、洗牌、暂停、失败重试、下一关与回店。三端各自在本机以lantern-stall-v2保存钱包、首通、拥有与装备、愿望、菜谱、活动、相册和减少动效，并迁移旧解锁进度；支持以同一尝试编号和真实引擎回放恢复中途牌局，内容更新不匹配时保留经营数据并重新开局。已接入六种轻音效和持久化静音；当前没有账号、云同步、支付或实际广告配置。

V5用`shared/data/level-config.js`逐关配置统一菜品列表，最多同时显示三道，完成一道补入下一道，列表耗尽后才减少数量，卡片不显示桌号，材料和收入自动展开。原第2关前移为首关：3种菜共5份、11张食材；第9关达到24份，最多6种配方／72张牌／8层，支持六种轮廓。每副牌通过稳定和三种连续点击间隔的真实引擎无道具见证；留存版安排舒缓与挑战起伏，并报告可见信息策略和道具成绩，不以低通过率或视频收益作为目标，不把存在解当成容易过关。三种经典道具每局各一次，主线看完整激励视频执行，实验室可免费测试；两端真实广告单元尚为空。配置、工具和当前结果见[关卡配置说明](docs/09-level-generation.md)，状态见[接手说明](docs/project-status.md)。

局内整体UI、纯背景、组件位置和做菜表现已移植 `dapaidang-handoff-v12-complete` 的完整交付版，位于 `shared/rendering/approved-ui.js`；真实选牌、菜单交接、FIFO厨房和经营结算继续由现有引擎事件驱动。原图已拷入shared，运行不依赖上级交付目录。取样见 `previews/ui-v12-flow.png` 与 `previews/ui-v12-comparison.png`。历史截图、视频与旧验收报告可能仍带有 `128/300` 等错误收入样式；它们仅供美术和节奏参考，当前规则以本说明与 `AGENTS.md` 为准。

首胜点亮3道菜谱即永久获得星河灯串，支持明确试穿、换上与持久化。竹影／海风／秋夜整套为1800／9000／16000金币，旧拥有和钱包保留。第一锅后开放菜谱与夜市；每日三道小炒提供5／6／7份短关、120／160／200金币的一次奖励和收藏／活动进度，不推进主线。首页显示最近珍藏目标、今日菜单和收好的牌局。`npm run test:retention`验证奖励、续玩和每日菜单；`scripts/render-retention-review.cjs`生成真实流程视觉取样。
