'use strict';
require('./prepare-assets.cjs')();
require('./build-minigame.cjs')('wechat', '微信小游戏', { prepare: false });
require('./build-douyin.cjs')({ prepare: false });
