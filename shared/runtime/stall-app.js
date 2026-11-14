(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./game-session.js'), require('../core/profile.js'), require('../data/progression.js'));
  else root.DapaidangApp = factory(root.DapaidangSession, root.DapaidangProfile, root.DapaidangProgression);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Game, Profiles, C) {
  'use strict';
  class App {
    constructor(options) {
      this.options = options; this.profile = new Profiles.Profile(options); this.tab = 'home'; this.screen = 'home';
      this.sub = { decor: 'scene', recipes: 'recipes', market: 'current' }; this.category = 'lamp'; this.theme = 'warm';
      this.page = 0; this.categoryPage = 0; this.preview = null; this.modal = null; this.hits = []; this.hidden = false; this.toast = null;
      this.session = null; this.settlement = null; this.pending = null; this.selection = null;
      if (options.previewLevel) this.start(options.previewLevel, options.previewLevel > this.profile.nextLevel);
    }
    say(text) { this.toast = { text, until: (this.options.now ? this.options.now() : Date.now()) + 2300 }; }
    check(ok, message) { if (!ok) this.say(this.profile.error || message || '当前无法操作'); return ok; }
    start(level, sandbox) {
      const begin = n => {
        if (!sandbox && !this.check(this.attempt = this.profile.begin(n), '请从当前关卡继续')) return false;
        this.settlement = null; this.pending = null; return true;
      };
      if (!begin(level)) return;
      let initial = true; this.sandbox = !!sandbox;
      this.session = new Game.Session({ recipes: this.options.recipes, layout: this.options.layout, level,
        reducedMotion: this.profile.state.reducedMotion,
        onStart: n => { if (initial) { initial = false; return true; } return begin(n); },
        onSettings: v => { if (!this.profile.settings(v.reducedMotion)) { this.session.reducedMotion = this.profile.state.reducedMotion; this.say(this.profile.error); } },
        onProgress: result => {
          this.pending = { level: result.completedLevel, revenue: result.revenue, dishes: result.dishes };
          this.credit();
        }, onHome: () => this.home() });
      this.session.setHidden(this.hidden); this.screen = 'game'; this.modal = null; this.preview = null; this.hits = [];
    }
    credit() {
      if (!this.pending || this.settlement) return true;
      if (this.sandbox) { this.settlement = { credited: 0, rewards: [], newly: [], sandbox: true }; return true; }
      const receipt = this.profile.settle(this.attempt, this.pending);
      if (!receipt) { this.say(this.profile.error || '结算尚未完成，请重试'); return false; }
      this.settlement = receipt; return true;
    }
    home(confirm) {
      if (this.session?.engine.status === 'playing' && !confirm) { this.session.setPanel('pause'); this.modal = { type: 'leave' }; return; }
      if (!this.credit()) return;
      this.session = null; this.screen = 'home'; this.tab = 'home'; this.page = 0; this.modal = null; this.hits = [];
      if (this.settlement?.first && this.profile.state.cleared.length === 1 && !this.profile.state.tutorialDone) this.modal = { type: 'first' };
    }
    setHidden(value) { this.hidden = !!value; if (this.session) this.session.setHidden(value); }
    view() {
      const state = this.profile.state;
      const themePreview = this.screen === 'home' && this.tab === 'decor' && this.sub.decor === 'themes' && !this.selection;
      const previewEquipment = themePreview ? Object.fromEntries(C.slots.map(slot => [slot, this.theme + '-' + slot])) :
        this.preview ? Object.assign({}, state.equipped, { [C.byId[this.preview].slot]: this.preview }) : null;
      return { screen: this.screen, tab: this.tab, sub: this.sub, category: this.category, theme: this.theme, page: this.page, categoryPage: this.categoryPage,
        preview: this.preview, selection: this.selection, modal: this.modal, state, nextLevel: this.profile.nextLevel, settlement: this.settlement,
        daily: this.profile.daily(), appearance: this.profile.appearance(previewEquipment), themePreview,
        game: this.session ? Object.assign(this.session.view(), { appearance: this.profile.appearance(), settlement: this.settlement,
          wallet: state.coins, homeEnabled: true, introduceStore: state.cleared.length === 1 && !state.tutorialDone, saveError: !!this.profile.error, sandbox: this.sandbox }) : null,
        toast: this.toast && this.toast.until > (this.options.now ? this.options.now() : Date.now()) ? this.toast.text : '',
        released: C.event.books.map((_, i) => this.profile.released(i)), memories: this.profile.memories(), adAvailable: !!this.options.rewardedAd };
    }
    frame(ms) { if (this.screen === 'game') this.session.frame(ms); return this.view(); }
    pointer(point) {
      if (this.hidden) return false;
      const hit = this.hits.slice().reverse().find(h => point.x >= h.rect[0] && point.y >= h.rect[1] && point.x <= h.rect[0] + h.rect[2] && point.y <= h.rect[1] + h.rect[3]);
      if (hit) {
        if (this.screen === 'game' && this.session.engine.status === 'won' && !this.credit()) return true;
        this.handle(hit.action, hit.value); this.hits = []; return true;
      }
      if (this.modal) return true;
      if (this.screen === 'game') {
        if (this.session.engine.status === 'won' && !this.credit()) return true;
        return this.session.pointer(point);
      }
      return false;
    }
    handle(action, value) {
      const s = this.profile.state;
      if (action === 'sound') { this.say('当前暂未接入声音，可在设置中调整动效'); return; }
      if (action === 'category-page') { this.categoryPage = value ? 1 : 0; this.category = value ? 'plate' : 'lamp'; this.page = 0; this.selection = null; this.preview = null; return; }
      if (action === 'event-reward') {
        const item = C.byId[value]; if (!item || !s.owned.includes(item.id)) return;
        this.tab = 'decor'; this.category = item.slot; this.sub.decor = item.slot === 'chef' ? 'chef' : item.slot === 'background' ? 'background' : 'scene';
        this.categoryPage = ['plate', 'wok'].includes(item.slot) ? 1 : 0; this.selection = item.id; this.preview = item.id; this.page = Math.floor(C.items.filter(i => i.slot === item.slot).findIndex(i => i.id === item.id) / 4); return;
      }
      if (action === 'tab') { this.tab = value; this.page = 0; this.preview = null; this.selection = null; return; }
      if (action === 'sub') { this.categoryPage = 0; this.sub[this.tab] = value; this.page = 0; this.selection = null; this.preview = null; return; }
      if (action === 'category') { this.category = value; this.page = 0; this.selection = null; this.preview = null; return; }
      if (action === 'page') { this.page = Math.max(0, this.page + value); return; }
      if (action === 'play') { this.start(this.profile.nextLevel); return; }
      if (action === 'level') { this.start(value); return; }
      if (action === 'map') { this.page = Math.floor((this.profile.nextLevel - 1) / 20); this.modal = { type: 'map' }; return; }
      if (action === 'ledger' || action === 'settings') { this.toast = null; this.page = 0; this.modal = { type: action }; return; }
      if (action === 'close') { this.modal = null; this.selection = null; return; }
      if (action === 'leave') { this.home(true); return; }
      if (action === 'reduced') { this.check(this.profile.settings(!s.reducedMotion)); if (this.session) this.session.reducedMotion = this.profile.state.reducedMotion; return; }
      if (action === 'wish') { this.check(this.profile.wish(value)); this.say('已设为小摊的下一个愿望'); return; }
      if (action === 'wish-open') { this.tab = 'decor'; this.category = C.byId[s.wish].slot; this.sub.decor = this.category === 'background' ? 'background' : this.category === 'chef' ? 'chef' : 'scene'; this.categoryPage = ['plate', 'wok'].includes(this.category) ? 1 : 0; this.selection = s.wish; this.preview = s.wish; this.page = Math.floor(C.items.filter(i => i.slot === this.category).findIndex(i => i.id === s.wish) / 4); return; }
      if (action === 'item') { this.selection = value; this.preview = value; return; }
      if (action === 'buy') {
        const item = C.byId[value];
        if (!item || item.source !== 'coins' || s.owned.includes(value)) { this.say('这件装扮已有其他获取方式或已拥有'); return; }
        if (s.cleared.length < item.unlock) { this.say('首通' + item.unlock + '关后开放'); return; }
        if (s.coins < item.price) { this.say('还差 ' + (item.price - s.coins) + ' 金币，继续开摊攒一攒'); return; }
        this.toast = null; this.modal = { type: 'purchase', item: value }; return;
      }
      if (action === 'confirm-buy') {
        if (this.check(this.profile.purchase(value), '金币不足或物品已拥有')) {
          this.modal = null; this.preview = null;
          if (value === 'warm-lamp' && !s.tutorialDone) { this.profile.finishTutorial(); this.tab = 'home'; }
          this.say('买好并换上了，小摊又有新模样');
        } return;
      }
      if (action === 'equip') { if (this.check(this.profile.equip(value))) { this.preview = null; this.say('换好啦，可随时免费换回'); } return; }
      if (action === 'theme') { this.theme = value; this.selection = null; this.preview = null; this.page = 0; return; }
      if (action === 'recipe') { this.modal = { type: 'recipe', id: value }; return; }
      if (action === 'photo') { if (this.check(this.profile.photo(), s.photos.length >= 24 ? '相册已满，请先删除一张照片' : '首通10关后可以拍照')) this.say('小摊的模样已存进经营相册'); return; }
      if (action === 'photo-view') { this.modal = { type: 'photo', id: value }; return; }
      if (action === 'memory') { this.modal = { type: 'memory', id: value }; return; }
      if (action === 'delete-photo') { this.modal = { type: 'delete-photo', id: value }; return; }
      if (action === 'confirm-delete') { this.check(this.profile.removePhoto(value)); this.modal = null; return; }
      if (action === 'book') { if (s.cleared.length < 5) this.say('首通5关后开始参加夜市'); else if (this.check(this.profile.selectBook(value), '这本活动册尚未开放')) this.say('已选中，下次通关继续累计'); return; }
      if (action === 'tutorial') { this.modal = null; this.tab = 'decor'; this.sub.decor = 'scene'; this.category = 'lamp'; this.selection = 'warm-lamp'; this.preview = 'warm-lamp'; return; }
      if (action === 'ad') {
        if (!this.options.rewardedAd || !this.settlement || this.settlement.adTaken || this.adPending || this.profile.daily().ads >= C.economy.adLimit) return;
        this.adPending = true;
        Promise.resolve(this.options.rewardedAd()).then(completed => {
          if (completed && this.profile.adReward()) { this.settlement.adTaken = true; this.say('经营补贴 +200 金币'); }
        }).catch(() => this.say('这次视频未完成，奖励未发放')).finally(() => { this.adPending = false; });
      }
    }
  }
  return { App };
});
