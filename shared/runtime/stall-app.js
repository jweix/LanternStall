(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./game-session.js'), require('../core/profile.js'), require('../data/progression.js'),require('../data/daily-menu.js'));
  else root.DapaidangApp = factory(root.DapaidangSession, root.DapaidangProfile, root.DapaidangProgression,root.DapaidangDailyMenu);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Game, Profiles, C, Daily) {
  'use strict';
  class App {
    constructor(options) {
      this.options = options; this.profile = new Profiles.Profile(options); this.tab = 'home'; this.screen = 'home';
      this.sub = { decor: 'themes', recipes: 'recipes', market: 'current' }; this.category = 'series'; this.theme = 'warm';this.previewFamily=null;this.previewTheme=false;this.rareMode='themes';
      this.page = 0; this.categoryPage = 0; this.decorScroll = 0; this.gesture = null; this.preview = null; this.modal = null; this.hits = []; this.hidden = false; this.toast = null;
      this.session = null; this.settlement = null; this.pending = null; this.selection = null;
      this.events=[];this.menu=null;
      this.profile.options.onCommit=(after,before)=>{
        if(after.coins!==before.coins)this.track('wallet_change',{source:after.ledger.at(-1)?.label||'',amount:after.coins-before.coins,balance:after.coins});
        const changed=C.slots.filter(slot=>after.equipped[slot]!==before.equipped[slot]);if(changed.length)this.track('outfit_equip',{items:changed.map(slot=>after.equipped[slot]).join(',')});
        if(after.activity.some((n,i)=>n!==before.activity[i]))this.track('event_progress',{activityId:C.event.id,book:after.activeBook,from:before.activity[after.activeBook],to:after.activity[after.activeBook]});
      };
      if (options.previewLevel) this.start(options.previewLevel, options.previewLevel > this.profile.nextLevel);
    }
    say(text) { this.toast = { text, until: (this.options.now ? this.options.now() : Date.now()) + 2300 }; }
    track(name,data) { const event={name,...data};this.events.push(event);this.events=this.events.slice(-100);try{this.options.analytics?.(name,data||{});}catch(_){} }
    feedback(name) { if(!this.hidden&&this.profile.state.sound)try{this.options.audio?.play(name);}catch(_){} }
    toggleSound() { if(this.check(this.profile.toggleSound())){if(!this.profile.state.sound)this.options.audio?.stop();else this.feedback('pick');this.say(this.profile.state.sound?'声音已打开':'声音已关闭');} }
    check(ok, message) { if (!ok){this.say(this.profile.error || message || '当前无法操作');if(this.profile.error)this.track('save_failed',{attempt:this.attempt||0});} return ok; }
    start(level, sandbox, menu, resume) {
      this.menu=menu||null;
      const begin = n => {
        const previousAttempt=this.attempt;
        const attempt=sandbox?null:this.profile.begin(n,this.menu);
        if (!sandbox && !this.check(attempt, '请从当前关卡继续')) return false;
        if(this.session?.engine.status==='playing')this.track('level_end',{level:this.session.level,attempt:previousAttempt,result:'abandoned',elapsed:this.session.engine.playTime,mode:this.menu?'daily':'main'});
        this.attempt=attempt;
        this.settlement = null; this.pending = null; return true;
      };
      if(resume){this.attempt=resume.attempt;this.settlement=null;this.pending=null;}else if (!begin(level)) return;
      if (this.session) this.session.dispose();
      let initial = true,replaying=!!resume; this.sandbox = !!sandbox;
      this.session = new Game.Session({ recipes: this.options.recipes, layout: this.options.layout, level,
        daily:!!menu,resume,levelOptions:menu?{definition:Daily.definition(this.options.recipes,menu.day,menu.index)}:undefined,
        rewardedRescue: this.options.rewardedRescue,
        onCheckpoint:value=>sandbox||!this.profile.state.activeAttempt?true:this.profile.checkpoint(this.attempt,value),
        onSound:()=>this.toggleSound(),
        onStarted:config=>{if(!replaying)this.track('level_start',{level:config.level,attempt:this.attempt,mode:this.menu?'daily':'main',first:!this.menu&&!this.profile.state.cleared.includes(config.level),generatorVersion:config.generatorVersion,contentId:config.contentId});},
        onEvent:event=>{
          const sound={ingredientPicked:'pick',recipeAccepted:'match',cookingStarted:'cook',dishServed:'coin',levelWon:'win',levelFailed:'soft'}[event.type];
          if(sound&&!replaying)this.feedback(sound);
          if(event.type==='ingredientPicked'&&!replaying&&this.session?.actions.length===1)this.track('first_pick',{level,attempt:this.attempt,mode:menu?'daily':'main'});
          if(event.type==='dishServed'&&!replaying&&this.session?.engine.jobs.filter(j=>j.state==='served').length===1)this.track('first_dish',{level,attempt:this.attempt,mode:menu?'daily':'main'});
          if(event.type==='levelFailed'&&!replaying)this.track('level_end',{level,attempt:this.attempt,result:'failed',reason:event.reason,mode:menu?'daily':'main'});
        },
        reducedMotion: this.profile.state.reducedMotion,
        onStart: n => {
          if (initial) { initial = false; return true; }
          const previous=this.menu,previousOptions=this.session.options.levelOptions;
          if(this.menu){const date=Profiles.day(this.options.now?this.options.now():Date.now());this.menu={...this.menu,day:date};this.session.options.levelOptions={definition:Daily.definition(this.options.recipes,date,this.menu.index)};}
          const ok=begin(this.menu?level:n);
          if(!ok){this.menu=previous;this.session.options.levelOptions=previousOptions;}
          return ok;
        },
        onSettings: v => { if (!this.profile.settings(v.reducedMotion)) { this.session.reducedMotion = this.profile.state.reducedMotion; this.say(this.profile.error); } },
        onProgress: result => {
          this.pending = { level: result.completedLevel, revenue: result.revenue, dishes: result.dishes };
          this.credit();
        }, onHome: () => this.home(),onNext:()=>{
          if(!this.credit())return;
          if(!this.menu){this.start(this.session.level+1,this.sandbox);return;}
          const date=Profiles.day(this.options.now?this.options.now():Date.now()),done=this.profile.menuDone(date),index=[0,1,2].find(i=>!done.includes(i));
          if(index===undefined){this.home(true);this.handle('daily-menu');this.say('今晚三道小炒完成啦，明天换新菜单');}
          else this.start(1,false,{day:date,index});
        }});
      replaying=false;
      this.session.setHidden(this.hidden); this.screen = 'game'; this.modal = null; this.preview = null;this.previewFamily=null; this.hits = [];
      if(resume)this.track('level_resume',{level,attempt:this.attempt,mode:menu?'daily':'main'});
      this.session.saveCheckpoint();
    }
    resume() {
      const saved=this.profile.state.suspended,attempt=this.profile.state.activeAttempt;if(!saved||!attempt)return false;
      try{this.start(saved.level,false,attempt.menu,saved);return true;}
      catch(_){this.session?.dispose();this.session=null;this.screen='home';this.profile.discardCheckpoint();this.say('关卡内容已更新，已保留金币与装扮，请重新开张');return false;}
    }
    requestStart(level, menu) {
      const saved=this.profile.state.suspended,oldMenu=this.profile.state.activeAttempt?.menu;
      if(saved){
        if(saved.level===level&&JSON.stringify(oldMenu||null)===JSON.stringify(menu||null)){this.resume();return;}
        this.modal={type:'replace-run',level,menu:menu||null};return;
      }
      this.start(level,false,menu);
    }
    credit() {
      if (!this.pending || this.settlement) return true;
      if (this.sandbox) { this.settlement = { credited: 0, rewards: [], newly: [], sandbox: true }; return true; }
      const receipt = this.profile.settle(this.attempt, this.pending);
      if (!receipt) { this.say(this.profile.error || '结算尚未完成，请重试'); return false; }
      this.settlement = receipt;
      this.track('level_end',{attempt:this.attempt,level:this.pending.level,result:'won',mode:this.menu?'daily':'main',elapsed:this.session?.engine.playTime||0});
      if(receipt.rewards.length)this.track('reward_unlocked',{items:receipt.rewardIds.join(',')});
      return true;
    }
    home(confirm) {
      if (this.session?.engine.status === 'playing' && !confirm) { this.session.setPanel('pause'); this.modal = { type: 'leave' }; return; }
      if (!this.credit()) return;
      if(this.session&&this.session.engine.status==='playing'&&!this.session.saveCheckpoint()){this.say(this.profile.error);return;}
      if(this.session&&this.session.engine.status==='failed'&&!this.profile.discardCheckpoint()){this.say(this.profile.error);return;}
      if (this.session) this.session.dispose();
      this.session = null; this.screen = 'home'; this.tab = 'home'; this.page = 0; this.modal = null; this.preview=null;this.previewFamily=null;this.selection=null;this.hits = [];
      if (this.settlement?.first && this.profile.state.cleared.length === 1 && !this.profile.state.tutorialDone) this.modal = { type: 'first' };
    }
    setHidden(value) { this.hidden = !!value;this.options.audio?.stop(); this.pointerCancel(); if (this.session) this.session.setHidden(value); }
    syncSidebar() {
      if (this.hidden || !this.options.sidebar) return;
      this.sidebarSaveError = false;
      const visit = this.options.sidebar.state();
      if (!this.profile.canRewardSidebar(visit)) return;
      if (this.modal?.type === 'sidebar') this.modal = { type: 'sidebar' };
      const receipt = this.profile.rewardSidebar(visit);
      this.sidebarSaveError = !receipt && !!this.profile.error;
      if (receipt) {
        this.say('复访有礼 +' + receipt.credited + ' 金币，已自动到账');
        this.sidebarReceiptPending = { credited: receipt.credited, day: this.profile.state.sidebarRewardDay }; this.showSidebarReceipt();
      }
      else if (this.sidebarSaveError) this.say(this.profile.error);
    }
    showSidebarReceipt() {
      if (!this.hidden && this.sidebarReceiptPending && this.screen === 'home' && (!this.modal || this.modal.type === 'sidebar')) {
        this.modal = { type: 'sidebar', receipt: this.sidebarReceiptPending }; this.sidebarReceiptPending = null; this.toast = null; this.hits = [];
      }
    }
    view() {
      const state = this.profile.state;
      const date=Profiles.day(this.options.now?this.options.now():Date.now()),done=this.profile.menuDone(date);
      const sidebar = this.options.sidebar ? this.options.sidebar.state() : null;
      const themePreview = this.screen === 'home' && this.tab === 'decor' && this.sub.decor === 'themes' && this.previewTheme;
      const previewEquipment = themePreview ? Object.fromEntries(C.slots.map(slot => [slot, this.theme + '-' + slot])) :
        this.previewFamily ? Object.fromEntries(C.slots.map(slot=>[slot,this.previewFamily+'-'+slot])) :
        this.preview ? Object.assign({}, state.equipped, { [C.byId[this.preview].slot]: this.preview }) : null;
      return { screen: this.screen, tab: this.tab, sub: this.sub, category: this.category, theme: this.theme, rareMode:this.rareMode, page: this.page, categoryPage: this.categoryPage, decorScroll:this.decorScroll,
        preview: this.preview, previewFamily:this.previewFamily, selection: this.selection, modal: this.modal, state, nextLevel: this.profile.nextLevel, settlement: this.settlement,
        daily: this.profile.daily(),dailyMenu:{day:date,done,names:Daily.names,rewards:Daily.rewards,cards:[0,1,2].map(i=>{
          const def=Daily.definition(this.options.recipes,date,i),ids=[...new Set(def.orders)];return {ids,names:ids.map(id=>this.options.recipes.find(r=>r.id===id).displayName)};
        })},goal:this.profile.nextGoal(),canResume:!!state.suspended,
        savedAppearance:this.profile.appearance(), appearance: this.profile.appearance(previewEquipment), themePreview, themeOffer: this.profile.themeOffer(this.theme),
        themeOffers:Object.fromEntries(C.shopThemes.map(t=>[t.id,this.profile.themeOffer(t.id)])),
        rareOffers:Object.fromEntries(C.rareItems.map(i=>[i.id,this.profile.rareOffer(i.id)])),
        game: this.session ? Object.assign(this.session.view(), { appearance: this.profile.appearance(), settlement: this.settlement,
          wallet: state.coins,sound:state.sound,menu:this.menu,dailyMenuDone:done,goal:this.profile.nextGoal(),homeEnabled: true, introduceStore: this.settlement?.first===true && this.settlement.level===1 && !state.tutorialDone, saveError: !!this.profile.error, sandbox: this.sandbox }) : null,
        toast: this.toast && this.toast.until > (this.options.now ? this.options.now() : Date.now()) ? this.toast.text : '',
        released: C.event.books.map((_, i) => this.profile.released(i)), memories: this.profile.memories(), adAvailable: !!this.options.rewardedAd,
        sidebar: sidebar ? Object.assign({}, sidebar, {
          amount: C.economy.sidebar, rewarded: this.profile.sidebarRewarded(), saveError: !!this.sidebarSaveError && this.profile.canRewardSidebar(sidebar) }) : null };
    }
    frame(ms) { if (this.screen === 'game') this.session.frame(ms); this.showSidebarReceipt(); return this.view(); }
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
      if (this.session?.adPending) return true;
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
      if(action==='next-run'){this.session?.options.onNext();return;}
      if(action==='first-reward'){this.home(true);this.modal={type:'first'};return;}
      if(action==='result-reward'){this.home(true);this.handle('event-reward',value);return;}
      if(action==='easy-daily'){this.home(true);if(this.screen==='home')this.handle('daily-menu');return;}
      if (action === 'sidebar-reward') {
        this.track('sidebar_guide',{});
        if (this.options.sidebar?.state().available && this.screen === 'home') { this.modal = { type: 'sidebar', receipt: this.sidebarReceiptPending }; this.sidebarReceiptPending = null; this.toast = null; }
        return;
      }
      if (action === 'sidebar-retry') { this.syncSidebar(); return; }
      if (action === 'sidebar') {
        if (!this.options.sidebar?.state().available || this.sidebarNavigating || this.profile.sidebarRewarded()) return;
        this.modal = null; this.hits = []; this.sidebarNavigating = true;
        this.options.sidebar.open().then(ok => {
          if (!ok) {
            if (this.screen === 'home' && !this.modal) this.modal = { type: 'sidebar' };
            this.say('暂时无法打开，请重试');
          }
        }).finally(() => { this.sidebarNavigating = false; });
        return;
      }
      if(['tab','sub','category','category-page','tutorial'].includes(action)){this.decorScroll=0;this.pointerCancel();}
      if (action === 'sound') { this.toggleSound(); return; }
      if(action==='daily-menu'){this.tab='market';this.sub.market='daily';this.modal=null;return;}
      if(action==='daily-play'){
        const date=Profiles.day(this.options.now?this.options.now():Date.now());
        if(!s.cleared.length){this.say('先完成第一锅，再来尝尝今日小炒');return;}
        this.requestStart(1,{day:date,index:value});return;
      }
      if(action==='resume-run'){this.resume();return;}
      if(action==='replace-run'){const m=this.modal;if(m?.type!=='replace-run')return;this.start(m.level,false,m.menu);return;}
      if(action==='goal'){
        const goal=this.profile.nextGoal();if(!goal)return;
        if(goal.id==='mastery'){this.tab='recipes';this.sub.recipes='recipes';return;}
        if(goal.owned){this.handle('preview-owned-rare',goal.id);this.tab='decor';this.sub.decor='rares';this.profile.finishTutorial();}
        else {this.tab='decor';this.sub.decor='rares';this.modal={type:'rare-details',item:goal.id};}
        return;
      }
      if (action === 'category-page') { this.categoryPage = value ? 1 : 0; this.category = value ? 'plate' : 'lamp'; this.page = 0; this.selection = null; this.preview = null; return; }
      if (action === 'event-reward') {
        const item = C.byId[value]; if (!item || !s.owned.includes(item.id)) return;
        this.tab = 'decor'; this.category='series';this.rareMode='owned'; this.sub.decor = 'rares';this.previewFamily=null;this.previewTheme=false;
        this.selection = item.id; this.preview = null; this.decorScroll=null; this.page=0;this.modal=null;return;
      }
      if (action === 'tab') {
        this.track('tab_view',{tab:value});
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
        this.track('outfit_preview',{item:value,source:'owned'});
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
        if(this.check(this.profile.equip(value))){this.feedback('match');this.rareMode='owned';this.selection=value;this.preview=null;this.previewFamily=null;this.previewTheme=false;this.modal=null;this.say(C.byId[value].name+'已换上');}return;
      }
      if(action==='rare-families'){this.category='series';this.previewFamily=null;this.preview=null;this.selection=null;this.decorScroll=0;this.pointerCancel();return;}
      if(action==='preview-rare-family'){
        if(!C.byTheme[value]?.rare)return;
        this.previewFamily=value;this.preview=null;this.selection=null;return;
      }
      if (action === 'page') { this.page = Math.max(0, this.page + value); return; }
      if (action === 'play') { if(s.suspended)this.resume();else this.start(this.profile.nextLevel); return; }
      if (action === 'level') { this.requestStart(value); return; }
      if (action === 'map') { this.page = Math.floor((this.profile.nextLevel - 1) / 20); this.modal = { type: 'map' }; return; }
      if (action === 'ledger' || action === 'settings') { this.toast = null; this.page = 0; this.modal = { type: action }; return; }
      if (action === 'close') { if(this.modal?.type==='first'&&!this.check(this.profile.finishTutorial()))return;this.modal = null;if(this.session?.panel==='pause')this.session.setPanel(null);return; }
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
        const price=this.profile.themeOffer(value)?.price;
        if (this.check(this.profile.purchaseTheme(value), '金币不足或主题已拥有')) {
          this.track('outfit_purchase',{item:value,price,balance:this.profile.state.coins});this.feedback('win');
          this.modal = null; this.preview = null; this.selection = null;
          this.say('整套已经配齐并换上啦');
        } return;
      }
      if (action === 'equip-theme') { if (this.check(this.profile.equipTheme(value), '先配齐主题再换上')) { this.preview = null; this.selection = null; this.say('已换上整套主题'); } return; }
      if (action === 'photo') { if (this.check(this.profile.photo(), s.photos.length >= 24 ? '相册已满，请先删除一张照片' : '首通10关后可以拍照')) this.say('小摊的模样已存进经营相册'); return; }
      if (action === 'photo-view') { this.modal = { type: 'photo', id: value }; return; }
      if (action === 'memory') { this.modal = { type: 'memory', id: value }; return; }
      if (action === 'delete-photo') { this.modal = { type: 'delete-photo', id: value }; return; }
      if (action === 'confirm-delete') { this.check(this.profile.removePhoto(value)); this.modal = null; return; }
      if (action === 'book') {this.sub.market='current'; if (s.cleared.length < 1) this.say('第一锅完成后就能参加夜市'); else if (this.check(this.profile.selectBook(value), '这本活动册尚未开放')) this.say('已选中，下次通关继续累计'); return; }
      if (action === 'tutorial') {this.modal=null;this.profile.finishTutorial();this.tab='decor';this.sub.decor='rares';this.handle('preview-owned-rare','star-lamp');return;}
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
