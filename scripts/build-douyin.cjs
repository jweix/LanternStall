'use strict';
module.exports = function buildDouyin(options = {}) {
  const config = JSON.parse(JSON.stringify(require('../platforms/douyin/project.config.json')));
  const appid = process.env.LANTERN_DOUYIN_APPID === undefined ? config.appid : process.env.LANTERN_DOUYIN_APPID;
  if (appid && !/^tt[a-zA-Z0-9]+$/.test(appid)) throw new Error('抖音 AppID 应为控制台提供的 tt 开头 ID；测试号请留空并在 IDE 选择。');
  config.appid = appid;
  const result = require('./build-minigame.cjs')('douyin', '抖音小游戏', { ...options, projectConfig: config });
  if (!appid) console.log('尚未配置正式 AppID：导入时请选择 IDE 提供的测试号；测试号不可上传。');
  return result;
};
if (require.main === module) module.exports();
