# 道具美术素材

2026-11-18。使用内置 imagegen 编辑原版 PNG，保留暖奶油细纹理、蜂蜜色厚边、柔和高光及深棕手写字。撤回直接复用 `undo.png`。次数、视频、已用角标由真实状态绘制，不烘焙进素材。

- 移出：`move-v4.png`，编辑参考 `stash.png`，运行尺寸 235×96。
- 洗牌：`shuffle-v4.png`，编辑参考 `hint.png`，运行尺寸 265×96。
- 构建按 asset-manifest 的 runtimeSize 等比目标尺寸采样和 runtimeColors 量化；源图保留完整透明通道。三端读取同一运行清单。

## 移出提示词

Use-case: precise-object-edit. Image 1 is the edit target: an existing warm 2.5D Chinese cooking-game tool button. Edit this exact asset, preserving its pill-like rounded rectangular cream button, proportions (235:96), subtle fabric/paper grain, honey-colored thick bottom bevel, soft upper-left lighting and small bottom shadow. Keep the existing golden-orange rounded storage-box icon on the left, its shape, highlights, material and location. Change ONLY the two large dark brown Chinese characters from 暂存 to exactly ‘移出’, matching the existing playful bold hand-painted lettering, scale, baseline and placement. No extra characters, numbers, badges, borders or interface. Output one single button, completely visible and tightly framed, with genuinely transparent pixels outside the rounded button silhouette. The cream button body itself must remain fully opaque. Preserve the reference artwork as closely as possible.

## 洗牌提示词

Use-case: precise-object-edit. Image 1 is the edit target: an existing warm 2.5D Chinese cooking-game tool button. Make its matching SHUFFLE variant. Preserve the rounded cream button body, proportions (265:96), subtle fine paper grain, pale top highlight, honey-colored thick bottom bevel, upper-left lighting and small bottom shadow. Replace ONLY the left light-bulb icon with a polished chunky 2.5D shuffle icon: three small rounded cream game tiles slightly fanned, with a pair of thick coral-orange curved crossing arrows across the tiles, orange shaded sides, soft golden highlights, rounded edges, clear silhouette, and subtle contact shadow, matching the toy-like volume and palette of this button's existing bulb and the game's original orange-red undo arrow. The icon occupies the same left third and is readable at small mobile size. Replace ONLY the two Chinese characters 提示 with exactly ‘洗牌’, matching the existing dark brown playful bold hand-painted lettering, scale, baseline and right-side placement. No extra text, numbers, badges, scenery or surrounding UI. Output exactly one fully visible horizontal button, tightly framed, genuinely transparent outside its rounded silhouette; keep the cream body opaque.
