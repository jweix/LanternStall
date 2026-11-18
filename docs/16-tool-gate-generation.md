# 实验道具关：配置与生成

当前模式为 `tool-gate`，配置版本及生成器版本均为 1，生成产物 `experimentVersion` 为 2，基于 V5 游戏规则。它生成**无道具必无解、正确使用一次移出可以通关**的关卡，仅用于离线生成和浏览器实验室。没有主线 `--apply`，不写 `shared/data/level-config.js`，不进入两端小游戏包，也不播放真实广告或产生经营奖励。

当前支持开局至首道菜之前的容量门槛，指定工具仅为 `stash`、一次。中途必经门槛、多次广告、指定撤回或洗牌必过不在本模式范围内；不支持的配置会报错，不会静默替换工具。

## 快速生成

在仓库根目录使用 Node.js 18+：

```sh
# 默认双岛配置，生成一关
npm run levels:generate:tool-gate

# 按同一配置生成三个连续种子的关卡
npm run levels:generate:tool-gate -- --config configs/experiments/tool-gate.json --count 3 --seed 20261118 --out reports/levels/generated-tool-gates.json

# 三料菜、灯笼轮廓示例：17张材料
npm run levels:generate:tool-gate -- --config configs/experiments/tool-gate-triple.json --count 3 --out reports/levels/generated-tool-gates-triple.json

# 参数说明与独立回归
npm run levels:generate:tool-gate -- --help
npm run test:tool-gate
```

默认配置在 [tool-gate.json](../configs/experiments/tool-gate.json)，第二个示例在 [tool-gate-triple.json](../configs/experiments/tool-gate-triple.json)。复制文件并修改参数即可，无需填写每层食材或牌位。

| CLI 参数 | 用途 |
| --- | --- |
| `--config` | 生成配置 JSON，默认 `configs/experiments/tool-gate.json` |
| `--count` | 1–64，默认 1；每个结果都必须独立验收通过 |
| `--seed` | 覆盖配置种子，0–4294967295；第 i 个结果使用 `(seed+i) >>> 0`，从 i=0 开始 |
| `--out` | 生成产物 JSON，默认 `reports/levels/generated-tool-gates.json`；不能覆盖输入配置或写入 shared/native 源码目录 |

所有关卡在内存中通过验收后才写出批次；任一种子生成失败，命令非零退出，不覆盖已有产物。不同种子可能得到相同盘面，输出的 `distinctLayouts` 给出实际不同盘面数，不承诺每个种子都产生新内容。

## 配置格式

```json
{
  "mode": "tool-gate",
  "version": 1,
  "id": "TG-GENERATED",
  "level": 99,
  "seed": 20261118,
  "solvability": "requires-tool",
  "requiredTool": "stash",
  "toolUses": 1,
  "orders": ["d01", "d02", "d03", "d04", "d05", "d04", "d05"],
  "shape": "islands",
  "layers": 7,
  "gate": { "minPicks": 8, "maxPicks": 10 },
  "generation": { "maxAttempts": 128, "maxSearchNodes": 20000 }
}
```

| 字段 | 约束与含义 |
| --- | --- |
| `mode / version` | 固定 `tool-gate / 1` |
| `id` | 1–40 个英文字母、数字、下划线或短横线，用于实验标签和内容指纹 |
| `level` | 可省略，默认 99；仅供实验室画面显示，1–10000，不代表替换该主线关 |
| `seed` | 可省略，默认 0；同版本、规则、配置和种子可确定性复现 |
| `solvability` | 固定 `requires-tool`，生产生成器继续拒绝此值 |
| `requiredTool / toolUses` | 固定 `stash / 1`；初始免费额度为零，见证中模拟一次完整视频奖励执行移出 |
| `orders` | 统一菜品列表，每个 ID 一份，前三道为开局可完成订单；3–24 份、最多六种配方 |
| `shape` | `pairs / islands / ring / bridge / lantern / twins`，使用现有几何模板与原牌尺寸 |
| `layers` | 2–8，形状与层数必须能容纳材料；总牌数不超过 72 |
| `gate.minPicks / maxPicks` | 首道菜所需牌数的几何下界筛选范围，默认 8–10，必须各自介于 8–10 且有序 |
| `generation.maxAttempts` | 候选分配上限，默认 128，范围 1–512 |
| `generation.maxSearchNodes` | 每个候选的一次移出搜索节点预算，默认 20000，范围 1–100000 |

未知字段也会报错，避免参数拼写错误后没有生效。配方 ID 见 `shared/data/recipes.json`；材料数量和收入从菜单推导，仍检查不同配方子集冲突、全关材料集中度和开局同料集中度。

上限十张来自主槽七格加移出三格。下界大于七才能证明无道具无解；下界超过十时，一次移出无法在首道菜前保管所有材料，本模式拒绝。下界不超过十仍不等于全关可过，所以后续完整通关回放不可省略。

## 算法与验收

1. 从统一 `orders` 计算菜品与材料总账，用既有形状、层数和种子创建真实牌位。
2. 将开局前三道需要的材料倾向放在深层，其他材料倾向放在上层；按种子打乱材料和同层位置，尝试不同候选。不逐层预填食材。
3. 由真实遮挡图计算每种初始配方材料组合及其全部递归遮挡者的并集，取得首道菜的最小取牌数下界。
4. 只接受无道具无解证书且下界落在 `gate` 区间的候选。首道菜前没有消耗或补单，所有已取牌均占库存，因此下界大于七的证明覆盖任意点击时序及飞行预约。
5. 搜索主槽七格、仅移出一次、无撤回和洗牌的完整路线。找到路线后将移出操作转换为模拟完整视频奖励；搜索超时为未知，拒绝该候选，不作为无解或有解结论。
6. 用真实引擎分别执行稳定输入、0.01/0.05/0.1 秒连续输入。必须仅用一次移出、全部食材消耗、所有菜送达、主槽和移出区清空才通过。

生成器不承诺任意合法菜单、形状、层数都能生成成功，也不保证任意使用工具的时机都能过。当前构造需要菜单中存在前三道不需要的材料；同一种材料即使在后续菜单出现，只要前三道需要，也按当前材料分组。候选分组只是搜索倾向，实际接纳依据始终是证明和真实回放。

生成实现：[tool-gate-generator.js](../platforms/web/lab/experiments/tool-gate-generator.js)。原始 TG01 固定验证关及通用首道菜证明器保留在 [tool-gate.js](../platforms/web/lab/experiments/tool-gate.js)，其原入口与 `npm run analyze:tool-gate` 仍可使用。

## 在实验室调整、试玩与导入

```sh
npm run serve
```

打开 [道具生成模式](http://127.0.0.1:4173/platforms/web/lab/?experiment=generated-tool-gate)，或在实验室点击“加载道具生成模式”。

1. 展开“编辑本关菜品列表与布局”，修改 JSON 中的菜单、种子、形状、层数或门槛，点击“应用到独立试玩”。生成失败时保留原关卡并显示原因。
2. 生成模式以 JSON 内的 `seed` 为准；顶部“关卡／加载配置”用于加载普通关。点击“导出生成参数”可保存为 CLI 的 `--config` 输入文件。
3. 点击“验证无道具并回放失败”，查看容量证书与七张满槽失败。辅助搜索若为未知，仍明确标注，不用它代替几何证书。
4. 点击“模拟视频：移出一次”手动续玩，或点击“回放一次移出通关（模拟）”完整验证。重开保留当前实验配置和种子，不跳回 TG01 或正式第99关。
5. 从“导入生成关卡或离线记录”选中 CLI 输出 JSON，再用“批量生成结果”切换关卡。实验室核对版本及配方／布局 SHA-256，并根据选中关卡的定义重新生成，比较内容指纹、材料牌、菜单、路线和证明后才加载。
6. “导出本次操作记录”保存真实操作时间轴，仍可导入复现。道具生成关没有初始免费工具，视频步骤只模拟奖励，不实际播放广告。

批次产物结构为 `kind: lantern-tool-gate-batch`、`schemaVersion: 1`、配方／布局哈希、生成器版本、实际参数和 `boards` 列表。每关携带 `definition`、`tiles`、`proof`、`witnessActions`、四种输入回放结果及候选拒绝统计。内容指纹用于确定性识别，不是加密签名；导入会重新生成和验证，不直接相信导入的容量、工具次数或证明文字。

## 失败诊断与测试

命令失败时显示种子及候选拒绝统计：

| 拒绝计数 | 原因与处理 |
| --- | --- |
| `opening` | 开局同料过多；换种子、增加候选，或调整菜单 |
| `proof` | 未证明首道所需张数大于七，或不在指定区间；调整层数、形状、菜单或门槛范围 |
| `unsolvableWithTool` | 稳定决策模型搜尽后没有指定工具路线；换候选或配置，不承诺覆盖所有连续时间玩法 |
| `unknownWithTool` | 工具路线搜索预算耗尽；可增加 `maxSearchNodes`，仍失败则换配置 |
| `timedReplay` | 搜索路线未通过真实时序；候选已拒绝，不输出未验证关卡 |

降低 `gate.minPicks` 到七、跳过回放或把未知改为有解都不是放行方式；这些配置或结果会被拒绝。参数调整后重新生成，先检查报告和独立试玩，再运行：

```sh
npm run test:tool-gate
npm run build
npm test
```

当前专项回归验证了 66 个生成结果：两个示例各32个种子，外加替换菜谱、九份菜／八层的配置；覆盖14／17／18张牌、7／8层、双岛／灯笼／双峰。每关检查材料总账、容量证明和四种输入回放；另有真实引擎独立无道具穷举、确定性重建、非法参数、超时拒绝、修改产物拒绝、批量失败不覆盖以及主线配置不变检查。它验证生成与游戏规则，不代表真人难度或真实广告验收。

浏览器已实测修改参数后重新生成、非法门槛拒绝、三个 CLI 结果导入与切换，以及17张灯笼生成关一次移出完整通关（收入338），控制台无警告或错误。完整构建和全量自动回归均通过。
