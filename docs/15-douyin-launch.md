# 抖音注册、调试与首发

核对日期：2026-11-17。项目改为抖音首发，微信适配保留。这里区分「本地开发／手机预览」和「面向玩家正式上线」，前者可以先用测试号推进。

## 从没有抖音账号开始

开发者平台账号用于管理应用，抖音 App 账号用于手机扫码与后续运营，小游戏 AppID 则是单独创建应用后获得的标识。注册开放平台可用手机号、邮箱或抖音号，不要求先发布视频。官方开发入门流程没有把视频作品或粉丝数列为前提；短视频推广和游戏发布是不同操作。[注册与入驻](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/guide/minigame/register)

建议依次执行：

1. 安装手机抖音并注册自己的账号，供真机预览扫码使用。
2. 进入 [抖音小游戏官网](https://game.open-douyin.com/)，用自己长期持有的手机号／邮箱注册开放平台账号，保存好登录方式。
3. 先下载 [抖音开发者工具](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/dev-tools/developer-instrument-update-and-download)，登录后用测试号导入本工程，确认玩法效果。测试号不能上传。[工具概览](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/dev-tools/mini-app-developer-instrument)
4. 计划正式创建应用时，完成主体认证。官方当前支持个人身份创建小游戏；有企业或个体工商户也可按对应主体入驻。个人按后台准备身份证与实名核验；企业／个体准备相应证照和管理员资料，按所选流程完成验证。不要为个人主体套用企业的对公账户步骤。主体影响资质、授权与结算，按实际权利归属选择。[入驻流程](https://partner.open-douyin.com/docs/resource/zh-CN/developer/join/join-into-developer-platform)、[入驻常见问题](https://partner.open-douyin.com/docs/resource/zh-CN/developer/join/issues)
5. 在控制台选「小游戏 → 创建小游戏」，填写名称「灯火大排档」、联系人、电话和邮箱。工程为原生 JavaScript + Canvas 2D，按界面选择与原生／自研实现相符的引擎项。不要创建成需要 TTML 页面的普通小程序。[创建与信息完善](https://partner.open-douyin.com/docs/resource/zh-CN/mini-game/guide/minigame/improve-information)
6. 在「开发管理／开发设置」取得 `tt…` AppID，填入 `platforms/douyin/project.config.json` 的 `appid`。把要调试的其他账号加入开发者／协作者权限。AppID 可用于客户端配置，AppSecret 不能放进客户端。

账号注册、收验证码、人脸核验、资质签署与协议接受由账号持有人本人在官方页面完成；当前没有替用户注册账号或创建真实应用。

## 本工程怎么运行

环境为 Node.js 18+、Python 3 + Pillow，不需要 npm 依赖。执行：

```sh
# 只生成抖音包并验证
npm run build:douyin
npm run test:douyin

# 同时生成抖音／微信包并执行完整回归
npm run build
npm test
```

在抖音开发者工具的**小游戏**界面选择「导入」，目录为仓库下的 **`platforms/douyin/game/`**。该目录直接包含 `game.js`、`game.json` 和 `project.config.json`；无正式 AppID 时，在导入界面选择 IDE 提供的测试号，有正式 AppID 时确保登录账号拥有该应用的开发权限。[工程结构](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/guide/dev-guide/newbie-tutorial)、[导入与测试号](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/dev-tools/mini-app-developer-instrument)

不能导入整个仓库、`src/` 或微信目录。修改 `shared/`、`platforms/douyin/src/` 或源码配置后需要重新构建，再在 IDE 编译。构建覆盖生成目录，IDE 内修改的 AppID／编译条件不会自动写回源码。永久 AppID 填源码配置；临时可用 `LANTERN_DOUYIN_APPID=实际AppID npm run build:douyin`。

两个 native 包共用 `scripts/build-minigame.cjs`：生成 JavaScript 数据模块、复制独立运行清单内的素材与字体、检查项目自定的 4 MiB 预算。当前两端包体接近该预算；后续增加素材应考虑压缩或分包，以 IDE 实际包体统计为准。平台包体规则与本项目预算不混为一谈。

## 三种效果调试

| 方式 | 操作 | 能确认的内容 |
| --- | --- | --- |
| 浏览器快速试玩 | `npm run serve`，打开 `http://127.0.0.1:4173/platforms/web/` | 共享玩法、四页经营与动效，不能验证 `tt` API |
| 抖音 IDE 模拟器 | 导入生成目录并编译，选小屏／全面屏设备 | Canvas、触摸、滚动、胶囊避让、Console 错误和本地存储 |
| 手机抖音预览／真机调试 | IDE 点「预览」或「真机调试」，用手机抖音扫一扫 | 真实字体与图片、Android／iOS、触摸响应、帧率、后台返回与 API 差异 |

IDE 的 Console 看报错，Sources 设断点，Storage 查看 `lantern-stall-v2`。Canvas 项目没有可逐个检查的 TTML 控件；画面与命中区域来自共享渲染坐标。真机调试支持 Android 和 iOS。[调试工具说明](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/dev-tools/mini-app-developer-instrument)

首次建议手工走完：四个页签、装扮拖动与试穿、开张取牌、快速连续选料、暂存取回、暂停／重开／回店、完整通关后钱包入账、退出重进后数据保留。分别检查小屏与带底部手势条设备，工具行应在真实胶囊下方；切后台一分钟再回来，关卡用时和厨房不能跳进度。当前存档仅在本机本应用内，Web、微信与抖音之间不会同步，清数据会丢失进度。

常见定位：

- 空白或缺模块：确认先构建并导入 `game/`，在 Console 查第一条脚本错误。
- 没有 AppID／不能上传：先用 IDE 测试号调试；要上传必须完成正式应用创建和开发者权限配置。
- 源码已改而效果不变：重新构建，再编译；IDE 当前加载的是生成文件。
- 轻触提示食材加载失败：点击重试，查看缺失图片／字体路径；本包资源全在本地，不依赖资源域名。
- 金币／装备看似重置：检查是否换了测试号、AppID、设备或清除了 Storage；同名存档键不代表跨平台共用数据。

## 侧边栏复访调试

官方把侧边栏复访列为所有小游戏的必接能力。本次实现 `tt.checkScene`、`tt.navigateToScene`、同步的 `tt.onShow` 监听与最新来源状态；支持时在经营页「设置」显示「去首页侧边栏」。缺失接口、能力不支持或检查失败时隐藏入口，跳转失败保留当前页面并提示重试。[必接能力](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/guide/minigame/essential-skills)

1. 在最新 IDE 运行游戏，打开「设置 → 去首页侧边栏」，再从模拟侧边栏进入。
2. 回来后设置页应显示「已从侧边栏返回」。来源取最新 `onShow` 的 `launch_from=homepage` 且 `location=sidebar_card`，热启动也更新，不能只看冷启动参数。
3. 可用自定义编译模式选择场景 `021036` 模拟，并在手机扫码调试；真实未上线应用不一定出现在手机侧边栏，完整链路按官方指引申请测试支持并配置测试设备／指定版本。[侧边栏技术指南](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/guide/open-ability/Introduction-for-tech)

当前入口是无奖励的复访基础接入。官方技术指南还给出了礼包引导与发奖闭环，**本次未实现该礼包，不代表已满足全部必接审核标准**。提审前须补齐／确认平台认可的复访方案，若新增金币激励须先更新经济配置与事务去重规则，沿用自动发奖约定，不能临时增加手动领金币。

## 正式上线前要准备什么

目前工程是可生成、可供 IDE 调试的本地游戏端，不是已经审核通过的发布版本。需要完成：

- 基本资料：名称、图标、简介、类目、联系人、适龄信息，以及后台要求的隐私与用户信息说明。名称和权利材料保持一致。
- 权利资质：按后台提供计算机软件著作权登记证书、自审自查材料，权利主体不一致时补授权链。电子软著准入与作品备案材料存在区别，按官方资质说明准备，不能认为仅有代码就能直接上线。[资质规范](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/operation1/norms/credential-norms-for-mini-game)、[资质常见问题](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/guide/contactus/endowments)
- 作品备案：待上线游戏完成基本资料和版本审核后，按当前流程由平台自动申报，后台关注进度；有版号的游戏走相应流程。作品备案不等同于 ICP 核准。[小游戏备案申报](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/guide/minigame/game-filing-application-works)
- ICP 核准：按控制台开放的入口办理，通过并取得核准号后才能上线；无版号游戏的入口在作品备案通过后开放。个人／企业的具体材料按所在地与后台要求提交。[ICP 核准指引](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/guide/minigame/icp/icp-filings)
- 必接能力、真机与多宿主回归：完成复访方案验收、实际触摸／低帧性能／后台恢复。官方自 2026-04-20 起对符合要求的合作 App 自动分发并回归，不能假设只需通过抖音一端。若未来有用户输入、内购等能力，另按必接规范接敏感词／客服等。[提审指引](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/guide/minigame/examineguide)

当前没有支付、广告单元、登录服务或云同步；这些不能靠填 AppID 自动获得。若以后接联网服务，再配置相应安全域名与服务端。已取得版号的在运营游戏还需按官方要求办理防沉迷实名认证渠道绑定。[渠道绑定适用范围](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/guide/minigame/realnameauthentication)

资料与测试具备后，在 IDE 上传版本号和更新说明，在控制台选测试版本、扫码回归、提交审核，按要求附三张实际游戏截图；待所需审核与核准完成后再发布。上传测试版、提交审核、公开发布是三个不同阶段。[版本提审](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/guide/minigame/examineguide)、[发布小游戏](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/guide/minigame/release)

## 本次验证边界

自动验证见 `tests/verify-douyin.cjs`：独立包结构、资源与字体字节一致、无 DOM 启动、真实触摸通关V3第1关并仅结算290金币一次、存储失败阻止开局、重载恢复进度、加载失败重试、鼠标、安全区、后台恢复、冷／热侧边栏来源与跳转失败。额外救援SDK适配及回调隔离见`verify-level-tools.cjs`；完整回归同时覆盖微信与共享引擎。

本机已安装抖音开发者工具，尚无正式小游戏AppID；V3本次未执行IDE编译、抖音手机扫码或上传。自动`tt`模拟验证不能代替这些实测，以测试号／正式AppID的IDE与真机结果作为下一步证据。两端`src/ad-config.js`的`rewardedRescueUnitId`均为空，救援入口隐藏；填真实广告单元后重新构建，仅完整播放回调发奖，不把模拟回调当作真实广告验收。
