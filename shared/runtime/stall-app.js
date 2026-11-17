(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./game-session.js'), require('../core/profile.js'), require('../data/progression.js'));
  else root.DapaidangApp = factory(root.DapaidangSession, root.DapaidangProfile, root.DapaidangProgression);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Game, Profiles, C) {
  'use strict';
  class App {
    constructor(options) {
      this.options = options; this.profile = new Profiles.Profile(options); this.tab = 'home'; this.screen = 'home';
      this.sub = { decor: 'themes', recipes: 'recipes', market: 'current' }; this.category = 'series'; this.theme = 'warm';this.previewFamily=null;this.previewTheme=false;this.rareMode='themes';
      this.page = 0; this.categoryPage = 0; this.decorScroll = 0; this.gesture = null; this.preview = null; this.modal = null; this.hits = []; this.hidden = false; this.toast = null;
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
      this.session.setHidden(this.hidden); this.screen = 'game'; this.modal = null; this.preview = null;this.previewFamily=null; this.hits = [];
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
      this.session = null; this.screen = 'home'; this.tab = 'home'; this.page = 0; this.modal = null; this.preview=null;this.previewFamily=null;this.selection=null;this.hits = [];
      if (this.settlement?.first && this.profile.state.cleared.length === 1 && !this.profile.state.tutorialDone) this.modal = { type: 'first' };
    }
    setHidden(value) { this.hidden = !!value; this.pointerCancel(); if (this.session) this.session.setHidden(value); }
    view() {
      const state = this.profile.state;
      const themePreview = this.screen === 'home' && this.tab === 'decor' && this.sub.decor === 'themes' && this.previewTheme;
      const previewEquipment = themePreview ? Object.fromEntries(C.slots.map(slot => [slot, this.theme + '-' + slot])) :
        this.previewFamily ? Object.fromEntries(C.slots.map(slot=>[slot,this.previewFamily+'-'+slot])) :
        this.preview ? Object.assign({}, state.equipped, { [C.byId[this.preview].slot]: this.preview }) : null;
      return { screen: this.screen, tab: this.tab, sub: this.sub, category: this.category, theme: this.theme, rareMode:this.rareMode, page: this.page, categoryPage: this.categoryPage, decorScroll:this.decorScroll,
        preview: this.preview, previewFamily:this.previewFamily, selection: this.selection, modal: this.modal, state, nextLevel: this.profile.nextLevel, settlement: this.settlement,
        daily: this.profile.daily(), savedAppearance:this.profile.appearance(), appearance: this.profile.appearance(previewEquipment), themePreview, themeOffer: this.profile.themeOffer(this.theme),
        themeOffers:Object.fromEntries(C.shopThemes.map(t=>[t.id,this.profile.themeOffer(t.id)])),
        rareOffers:Object.fromEntries(C.rareItems.map(i=>[i.id,this.profile.rareOffer(i.id)])),
        game: this.session ? Object.assign(this.session.view(), { appearance: this.profile.appearance(), settlement: this.settlement,
          wallet: state.coins, homeEnabled: true, introduceStore: state.cleared.length === 1 && !state.tutorialDone, saveError: !!this.profile.error, sandbox: this.sandbox }) : null,
        toast: this.toast && this.toast.until > (this.options.now ? this.options.now() : Date.now()) ? this.toast.text : '',
        released: C.event.books.map((_, i) => this.profile.released(i)), memories: this.profile.memories(), adAvailable: !!this.options.rewardedAd,
        sidebar: this.options.sidebar ? this.options.sidebar.state() : null };
    }
    frame(ms) { if (this.screen === 'game') this.session.frame(ms); return this.view(); }
    scrollRegion(point) {
      if(this.hidden||this.modal||this.screen!=='home'||this.tab!=='decor')return null;
      return this.hits.find(h=>h.action==='scroll-region'&&(!point||point.x>=h.rect[0]&&point.x<=h.rect[0]+h.rect[2]&&point.y>=h.rect[1]&&point.y<=h.rect[1]+h.rect[3]));
    }
    scroll(point,delta) {
      const region=this.scrollRegion(point);if(!region||!Number.isFinite(delta))return false;
      this.decorScroll=Math.max(0,Math.min(region.value.max,(this.decorScroll===null?region.value.offset:this.decorScroll)+delta));return true;
    }
    pointerStart(point) {
      this.pointerCancel();const region=this.scrollRegion(point);
      if(region){this.gesture={start:{...point},region,dragged:false};return true;}
      return this.pointer(point);
    }
    pointerMove(point) {
      const g=this.gesture;if(!g)return false;
      const dx=point.x-g.start.x,dy=point.y-g.start.y;
      if(Math.hypot(dx,dy)>10)g.dragged=true;
      if(g.dragged)this.decorScroll=Math.max(0,Math.min(g.region.value.max,g.region.value.offset-dy));
      return true;
    }
    pointerEnd(point) {
      const g=this.gesture;if(!g)return false;this.pointerMove(point);this.gesture=null;
      return g.dragged?true:this.pointer(g.start);
    }
    pointerCancel() { this.gesture=null; }
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
      if (action === 'sidebar') {
        if (!this.options.sidebar || !this.options.sidebar.state().available) return;
        this.options.sidebar.open().then(ok => { if (!ok) this.say('暂时无法打开，请重试'); });
        return;
      }
      if(['tab','sub','category','category-page','tutorial'].includes(action)){this.decorScroll=0;this.pointerCancel();}
      if (action === 'sound') { this.say('当前暂未接入声音，可在设置中调整动效'); return; }
      if (action === 'category-page') { this.categoryPage = value ? 1 : 0; this.category = value ? 'plate' : 'lamp'; this.page = 0; this.selection = null; this.preview = null; return; }
      if (action === 'event-reward') {
        const item = C.byId[value]; if (!item || !s.owned.includes(item.id)) return;
        this.tab = 'decor'; this.category='series';this.rareMode='owned'; this.sub.decor = 'rares';this.previewFamily=null;this.previewTheme=false;
        this.selection = item.id; this.preview = null; this.decorScroll=null; this.page=0;this.modal=null;return;
      }
      if (action === 'tab') {
        this.tab = value;this.modal=null;this.toast=null; this.page = 0; this.preview = null;this.previewFamily=null;this.previewTheme=false; this.selection = null;
        if(value==='decor'){this.sub.decor='themes';this.category='series';this.rareMode='themes';this.theme=C.shopThemes.find(t=>C.slots.every(slot=>s.equipped[slot]===t.id+'-'+slot))?.id||'warm';}
        return;
      }
      if (action === 'sub') { this.categoryPage = 0; this.sub[this.tab] = value;this.category='series';this.rareMode='themes';this.previewFamily=null;this.previewTheme=false;this.toast=null; this.page = 0; this.selection = null; this.preview = null; return; }
      if(action==='rare-mode'){
        if(!['themes','owned'].includes(value))return;
        this.rareMode=value;this.category='series';this.previewFamily=null;this.previewTheme=false;this.preview=null;this.selection=null;this.decorScroll=0;this.toast=null;this.pointerCancel();return;
      }
      if (action === 'category') { this.category = value; this.page = 0; this.selection = null; this.preview = null;this.previewFamily=null; return; }
      if(action==='rare-family'){
        const family=C.rareFamilies.find(f=>f.id===value);if(!family?.theme)return;
        this.category=value;this.decorScroll=null;this.rareMode='themes';this.previewFamily=family.theme;this.preview=null;this.selection=null;this.pointerCancel();return;
      }
      if(action==='rare-family-details'){if(C.rareFamilies.some(f=>f.id===value&&f.theme))this.modal={type:'rare-family-progress',family:value};return;}
      if(action==='preview-owned-rare'){
        const offer=this.profile.rareOffer(value);if(!offer?.owned)return;
        this.rareMode='owned';this.selection=value;this.decorScroll=null;this.preview=offer.equipped?null:value;this.previewFamily=null;this.previewTheme=false;this.modal=null;this.toast=null;return;
      }
      if(action==='cancel-outfit-preview'){if(this.decorScroll===null)this.decorScroll=this.scrollRegion()?.value.offset||0;this.preview=null;this.previewFamily=null;this.previewTheme=false;this.selection=null;this.toast=null;return;}
      if(action==='restore-owned-rare'){
        if(this.tab!=='decor'||this.sub.decor!=='rares'||this.rareMode!=='owned'||this.selection!==value)return;
        if(this.check(this.profile.restorePart(value))){this.preview=null;this.previewFamily=null;this.previewTheme=false;this.say('已换回套装对应部件');}return;
      }
      if(action==='equip-owned-rare'){
        const offer=this.profile.rareOffer(value);if(!offer?.owned)return;
        if(this.tab!=='decor'||this.rareMode!=='owned'||this.preview!==value||this.selection!==value)return;
        if(this.check(this.profile.equip(value))){this.rareMode='owned';this.selection=value;this.preview=null;this.previewFamily=null;this.previewTheme=false;this.modal=null;this.say(C.byId[value].name+'已换上');}return;
      }
      if(action==='rare-families'){this.category='series';this.previewFamily=null;this.preview=null;this.selection=null;this.decorScroll=0;this.pointerCancel();return;}
      if(action==='preview-rare-family'){
        if(!C.byTheme[value]?.rare)return;
        this.previewFamily=value;this.preview=null;this.selection=null;return;
      }
      if (action === 'page') { this.page = Math.max(0, this.page + value); return; }
      if (action === 'play') { this.start(this.profile.nextLevel); return; }
      if (action === 'level') { this.start(value); return; }
      if (action === 'map') { this.page = Math.floor((this.profile.nextLevel - 1) / 20); this.modal = { type: 'map' }; return; }
      if (action === 'ledger' || action === 'settings') { this.toast = null; this.page = 0; this.modal = { type: action }; return; }
      if (action === 'close') { this.modal = null; return; }
      if (action === 'leave') { this.home(true); return; }
      if (action === 'reduced') { this.check(this.profile.settings(!s.reducedMotion)); if (this.session) this.session.reducedMotion = this.profile.state.reducedMotion; return; }
      if (action === 'wish') { this.check(this.profile.wish(value)); this.say('已设为小摊的下一个愿望'); return; }
      if (action === 'wish-open') { this.tab='decor';this.sub.decor='themes';this.theme=C.byId[s.wish].theme;this.previewTheme=true;this.previewFamily=null;this.preview=null;this.selection=null;this.decorScroll=null;return; }
      if (action === 'wish-theme') { this.check(this.profile.wish(value+'-lamp'));this.modal=null;this.say('已设为下个套装愿望');return; }
      if (action === 'item') {
        const item=C.byId[value];if(!item||!this.profile.rareOffer(value))return;
        if(this.sub.decor==='themes'){this.sub.decor='rares';this.category=item.source==='recipe'?'recipe':item.theme;this.decorScroll=null;}
        if(this.decorScroll===null)this.decorScroll=this.scrollRegion()?.value.offset||0;this.selection=value;this.modal={type:'rare-details',item:value};return;
      }
      if(action==='preview-rare-item'){
        if(!this.profile.rareOffer(value))return;
        this.previewFamily=null;this.previewTheme=false;this.preview=value;this.selection=value;this.modal=null;return;
      }
      if (action === 'buy') {
        const item = C.byId[value];
        if (!item || item.source !== 'coins' || s.owned.includes(value)) { this.say('这件装扮已有其他获取方式或已拥有'); return; }
        if (s.cleared.length < item.unlock) { this.say('首通' + item.unlock + '关后开放'); return; }
        if (s.coins < item.price) { this.say('价格 '+item.price.toLocaleString()+' 金币'); return; }
        this.toast = null; this.modal = { type: 'purchase', item: value }; return;
      }
      if (action === 'confirm-buy') {
        if (this.check(this.profile.purchase(value), '金币不足或物品已拥有')) {
          this.modal = null; this.preview = null;
          if (value === 'warm-lamp' && !s.tutorialDone) { this.profile.finishTutorial(); this.tab = 'home'; }
          this.say('买好并换上了，小摊又有新模样');
        } return;
      }
      if (action === 'equip') { if (this.check(this.profile.equip(value))) { this.preview = null;this.previewFamily=null;this.modal=null; this.say('已换上这件，其余装扮保持原样'); } return; }
      if (action === 'theme') { if (!C.byTheme[value] || value === 'base' || C.byTheme[value].rare) return; this.theme = value;this.decorScroll=null;this.previewTheme=true;this.previewFamily=null; this.selection = null; this.preview = null; this.page = 0; return; }
      if (action === 'rare-details') { if(this.profile.rareOffer(value))this.modal={type:'rare-details',item:value};return; }
      if (action === 'equip-rare-family') {if(this.check(this.profile.equipRareFamily(value),'集齐同系列珍藏后可一起换上')){this.preview=null;this.previewFamily=null;this.selection=null;this.say('已换上珍藏全系列');}return;}
      if (action === 'theme-details') {if(this.profile.themeOffer(value))this.modal={type:'purchase-theme',theme:value};return;}
      if (action === 'buy-theme') {
        const offer = this.profile.themeOffer(value); if (!offer) return;
        if (offer.complete) { this.handle('equip-theme', value); return; }
        if (!offer.unlocked) { this.say('首通' + offer.unlock + '关后开放'); return; }
        this.toast = null; this.modal = { type: 'purchase-theme', theme: value }; return;
      }
      if (action === 'confirm-buy-theme') {
        if (this.modal?.type !== 'purchase-theme' || this.modal.theme !== value) return;
        if (this.check(this.profile.purchaseTheme(value), '金币不足或主题已拥有')) {
          this.modal = null; this.preview = null; this.selection = null;
          this.say('整套已经配齐并换上啦');
        } return;
      }
      if (action === 'equip-theme') { if (this.check(this.profile.equipTheme(value), '先配齐主题再换上')) { this.preview = null; this.selection = null; this.say('已换上整套主题'); } return; }
      if (action === 'recipe') { this.modal = { type: 'recipe', id: value }; return; }
      if (action === 'photo') { if (this.check(this.profile.photo(), s.photos.length >= 24 ? '相册已满，请先删除一张照片' : '首通10关后可以拍照')) this.say('小摊的模样已存进经营相册'); return; }
      if (action === 'photo-view') { this.modal = { type: 'photo', id: value }; return; }
      if (action === 'memory') { this.modal = { type: 'memory', id: value }; return; }
      if (action === 'delete-photo') { this.modal = { type: 'delete-photo', id: value }; return; }
      if (action === 'confirm-delete') { this.check(this.profile.removePhoto(value)); this.modal = null; return; }
      if (action === 'book') {this.sub.market='current'; if (s.cleared.length < 5) this.say('首通5关后开始参加夜市'); else if (this.check(this.profile.selectBook(value), '这本活动册尚未开放')) this.say('已选中，下次通关继续累计'); return; }
      if (action === 'tutorial') { this.modal = null;this.profile.finishTutorial(); this.tab='decor';this.sub.decor='themes';this.theme='bamboo';this.previewTheme=true;this.previewFamily=null;this.selection=null;this.preview=null; return; }
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
