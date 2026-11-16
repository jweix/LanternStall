# 经营页独立生产美术

运行清单为`manifest.json`版本5。每图一个逻辑对象/固定静物组/空白底面/固定字样；没有整页皮肤、带控件背景、预画试装或固定列表槽。

- `source/scene/v6/`：原稿物件、完整备菜架组、两种柜台镜头、锅盘及食物、纯环境、遮挡处补底。
- `source/scene/v8/`：补齐围裙的透明厨师、不含牌匾的棚布及同风格竹影／海风／秋夜花灯；内置imagegen的最终提示词、源件和路径在`generation-v8.json`。`palettes.json`定义逐部件材质色，导出器保留肤色、叶片、奶油条纹及器具材质，凳子高光和软边也完整换色。
- `source/ui/v6/`：无字胶囊、内容卡、成套页签、雕边愿望牌、空白父面板与导航承托。
- `source/brand/v6/`：固定品牌、页标题、页签/导航/按钮美术字、棚沿及吊绳。
- `source/icons/v6/`：原稿器物图标和云纹。
- `source/master/extraction.json`：原图来源、对象bbox与透明边界制作记录；由`extract-lobby-master.cjs`显式制作源件，不参与构建。
- `generation-v6.json`：内置imagegen的完整补底/清理/空白底面提示词及项目保存路径。优先保留原稿可见像素，只补被遮挡区域。
- `fonts/`：Noto Sans SC 500动态正文字体、历史标题字体源记录、SIL OFL许可及字符覆盖清单（运行只加载正文）。

`prepare-lobby-master.cjs`是显式源素材制作工具；正常构建仅由`prepare-lobby-assets.py`按清单读独立文件。透明物件分别量化RGB/alpha以保留渐变和软边；父框/导航木纹JPEG携带透明轮廓，供两端同一路径裁剪。基础重复文件自动去重。旧v5源件保留作为制作来源，不在当前基准中混用。

`lobby-layout.js`维护22层清单、注册点、两种镜头及页面坐标；`lobby-scene.js`只替换原节点的装备。文字/金额/进度/价格/状态及命中由共享代码维护；固定美术字图片不承担功能。原稿示例数据与手动领奖不进入生产规则。

导出清单中的`contentBounds`提供可见像素边界，用于字图和卡片缩略图居中；它不改变场景内的装备注册点。`prepare-lobby-font.py`同时生成共享字形高度数据`shared/data/lobby-font-metrics.js`，Web与微信使用同一份字体几何定位正文基线。装扮列表的滚动偏移、拖动／轻触判定和裁切热区均由共享App维护。

修改后构建微信并运行测试；详情见`docs/14-lobby-redesign.md`。完整参考稿只保存在`reference/`，源图和预览不进入运行包。
