# 抖音小游戏

首发目标为抖音。此目录是源码工程，**抖音开发者工具导入构建后的 `platforms/douyin/game/`**，与微信导入父目录的方式不同。

```sh
npm run build:douyin
npm run test:douyin
```

需要 Node.js 18+、Python 3 + Pillow，无需安装 npm 依赖。`src/` 保存 `tt` 适配与入口；公共玩法、经营和绘制来自 `shared/`，图片及字体与 Web／微信字节相同。生成目录不提交 Git，不手工修改；源码变化后重新构建。

`project.config.json` 中的 `appid` 暂留空。尚未注册应用时，导入工具后选择工具提供的测试号；它只能预览调试，不能上传。正式创建小游戏后，把控制台的 `tt…` AppID 填入**本目录源码配置**，再构建。也可临时使用：

```sh
LANTERN_DOUYIN_APPID=你的实际AppID npm run build:douyin
```

构建会覆盖 `game/` 内的配置，包括 IDE 修改的 AppID、编译条件和私有配置；需保留的 AppID 写回源码配置，侧边栏调试条件可在重建后重新选择。AppSecret 属于服务端密钥，不写入工程。

已实现原生Canvas 2D、图片与字体加载、触摸／列表拖动／取消／模拟器鼠标、安全区与抖音胶囊避让、本地存档、后台暂停和恢复重置帧时间、加载失败重试。支持侧边栏的宿主在主页与设置显示「复访有礼」；同步监听 `tt.onShow`，以最新 `launch_from`／`location` 判断回访，通过 `tt.navigateToScene` 跳转引导。

侧边栏已接每日200金币自动到账，金币与发奖日同一事务保存，支持失败重试与冷／热启动去重；跳转成功或普通来源不发奖。代码及自动验证不代表已通过必接审核，仍需IDE／手机完整链路验收。注册、资质、真机性能及提审发布尚未完成。完整步骤和官方来源见[抖音注册、调试与首发](../../docs/15-douyin-launch.md)。
