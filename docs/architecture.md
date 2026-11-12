# 平台与资源组织

## 依赖方向

`platforms/<平台>/src → shared/core`。核心规则不依赖 DOM 或平台 SDK，各平台负责渲染、输入、生命周期和服务适配。目前只有 `web-preview` 可运行，其他平台为待接入目录。

| 目录 | 职责 |
| --- | --- |
| `shared/core/` | 叠牌、材料、订单、备菜盘、道具、收入、待出餐队列与存档 |
| `shared/assets/runtime/` | 共用运行贴图，供各平台复用 |
| `shared/assets/source/` | 原始美术与完整生成提示词，不直接打入运行包 |
| `platforms/<平台>/src/` | 平台入口、渲染、输入、SDK 与服务适配 |
| `platforms/<平台>/assets/` | 当前平台独有素材与资源覆盖清单 |
| `platforms/<平台>/platform.json` | 平台状态、资源清单、源码与输出配置 |
| `dist/<平台>/` | 生成产物，Git 忽略 |
| `design/archive/` | 历史设计，不参与构建 |
| `docs/` | 当前设计、验证记录、截图与录屏 |

各平台不复制核心代码。新增引擎可以增加共用渲染层，但 `wx`、`tt`、浏览器宿主等接口保持在平台工程。

## 资源选择

`project.json` 注册平台与共享依赖。`shared/assets/manifest.json` 定义逻辑名称 `ingredientAtlas`、`stallScene`、`cookingAtlas`，每个资源有 `runtime` 与 `source` 两个版本，每版含 `path`、`mimeType`。

平台 `assets/manifest.json` 默认 `assets: {}`。同名资源优先选择当前平台覆盖，未覆盖的版本回退到共享素材。例如微信将替换图存为 `platforms/wechat/assets/textures/food.webp`，配置：

```json
{
  "schemaVersion": 1,
  "assets": {
    "ingredientAtlas": {
      "runtime": {"path": "textures/food.webp", "mimeType": "image/webp"}
    }
  }
}
```

路径相对于清单目录。只替换运行版不影响高清原图，也不改变其他平台。显式替换的文件不存在或逻辑名称拼错时构建报错。没有共享版本的启动图、分享图由对应平台代码或工具链直接引用。

当前夜市与炒菜资产在 `shared/assets/*/video-style/`。运行版使用 JPEG/WebP，高清页使用 PNG 原图。食材图标仍用此前共用食材美术。不要扫描并打包全部原图与历史方案。

## 出餐与展示分离

```text
玩家拿取 → 核心匹配配方 → 消耗材料，加入 pending
                               ↓
页面继续接受其他取料 ← 展示层依次下锅、快炒、调味、装盘
                               ↓
                     成菜飞回小票，completeDelivery(key)
                               ↓
                     一次性入账、补新单、再次检查配方
```

`pick()` 返回新加入的出餐记录，记录包含唯一 `key`、订单编号、消耗材料和牌编号、收入与小费。只有 `completeDelivery(key)` 才计收入并换小票；重复完成返回失败且不改状态。

等待和烹饪期间继续接受取料，不全屏锁住输入。托盘满且还有待出餐时进入 `waiting`，等新订单补入后继续检查配方；托盘满且没有待出餐才进入 `jammed`。收入达标后停止新取料，已配好的菜仍完成结算，出餐队列清空后显示收摊。

`cook-animation.js` 只控制展示、读取 DOM 位置和触发交付回调，不改写规则或牌位。页面从核心待出餐队列驱动展示；左上角自动演示使用独立游戏实例，结束后恢复原实例，不写真实存档。

## 存档

版本 4 保存收入目标、牌堆布局版本、已拿材料、备菜盘、旁盘、食材映射、待出餐队列、唯一编号、订单队列和道具。待出餐恢复后继续展示并以唯一编号入账。

兼容版本 2/3：版本 2 的收入按扣除原始零钱后的余额迁移，旧碗映射为旁盘，提示次数映射为理菜次数。旧布局保留至新开一局。历史赔付或拒单字段不再导出，新的 API 和界面不提供该功能。

## 平台状态与构建

| 平台 | 状态 |
| --- | --- |
| `web-preview` | DOM 原型，源码为 screen、theme、app、host-adapter、cook-animation |
| `wechat` | 首发目标，尚未确定引擎并接入 SDK |
| `douyin` | 预留 |
| `xiaohongshu` | 预留，发行形态待确认 |
| `overseas` | 预留，具体渠道确定后可继续细分 |

平台 SDK、AppID、真实广告、支付、登录、云存档尚未接入。`build: null` 的平台不生成假发布包。

Python 构建入口和验证命令见 [README](../README.md)。浏览器 `index.html` 提供 UTF-8 与移动 viewport；`lantern-stall.html` 是可嵌入片段；高清页使用 390 逻辑宽度、四倍重新渲染。宿主接口集中在浏览器 `host-adapter.js`。

宿主适配会过滤本页已经提交的存档回声，避免连续取料时旧快照晚到而回滚收入或重新播放同一份菜；外部的新恢复事件继续正常传递。
