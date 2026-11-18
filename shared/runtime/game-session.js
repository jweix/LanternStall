(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(
    require('../core/game-core.js'), require('../core/motion.js'), require('../core/levels.js'), require('../data/game-ui.js'));
  else root.DapaidangSession = factory(root.DapaidangCore, root.DapaidangMotion, root.DapaidangLevels, root.DapaidangGameUI);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Core, Motion, Levels, UI) {
  'use strict';
  const inside = (p, r) => p.x >= r[0] && p.y >= r[1] && p.x <= r[0] + r[2] && p.y <= r[1] + r[3];
  const buttons = UI.buttons;

  class Session {
    constructor(options) {
      this.options = options;
      this.hidden = false;
      this.reducedMotion = !!options.reducedMotion;
      this.restart(options.level || 1);
    }
    restart(level) {
      if (this.options.onStart && this.options.onStart(level) === false) return false;
      this.level = level;
      this.config = Levels.createLevel(this.options.recipes, this.options.layout, level, this.options.levelOptions);
      this.engine = new Core.Engine(this.config);
      this.adPending = false; this.rescueOffer = null; this.requestSequence = (this.requestSequence || 0) + 1; this.disposed = false;
      this.effects = [];
      this.slots = {};
      this.prepItems = [];
      this.panel = null;
      this.lastFrame = null;
      this.toast = null;
      this.wonAt = null;
      this.engine.pause(this.hidden);
    }
    setHidden(value) {
      this.hidden = !!value;
      this.engine.pause(this.hidden || !!this.panel || this.adPending);
      this.lastFrame = null;
    }
    setPanel(panel) {
      this.panel = panel;
      this.engine.pause(this.hidden || !!panel);
      this.lastFrame = null;
    }
    say(text) { this.toast = { text, until: this.engine.now + 1.8 }; }
    alignPrep() {
      this.prepItems = this.prepItems.filter(i => i.arrived).concat(this.prepItems.filter(i => !i.arrived));
      this.slots = Object.fromEntries(this.prepItems.map((item, slot) => [item.id, slot]));
    }
    collectEvents() {
      let eventTime = null, acceptedSlots = null;
      for (const event of this.engine.drainEvents()) {
        if (event.levelId !== this.engine.levelId) continue;
        if (event.time !== eventTime) {
          this.alignPrep(); eventTime = event.time; acceptedSlots = null;
        }
        let origins = null;
        if (event.type === 'recipeAccepted') {
          // Simultaneous recipes leave from their original cells. Compact only
          // after capturing those immutable origins, including across late frames.
          if (!acceptedSlots) acceptedSlots = Object.assign({}, this.slots);
          origins = event.items.map(item => acceptedSlots[item.id]);
          this.prepItems = this.prepItems.filter(item => !event.consumedItemIds.includes(item.id));
        } else if (event.type === 'ingredientPicked' || event.type === 'ingredientReturned') {
          this.prepItems.push({ id: event.item.id, arrived: event.type === 'ingredientReturned' });
          this.alignPrep();
        } else if (event.type === 'ingredientArrived') {
          const item = this.prepItems.find(item => item.id === event.item.id);
          if (item) item.arrived = true;
          this.alignPrep();
        } else if (event.type === 'ingredientUndone' || event.type === 'ingredientStashed') {
          this.prepItems = this.prepItems.filter(item => item.id !== event.item.id);
          this.alignPrep();
        }
        this.effects.push({ event, born: event.time, origins });
        if (event.type === 'levelFailed' && this.options.rewardedRescue && this.options.rewardedRescue.available?.() !== false) this.rescueOffer = this.engine.rescueOptions()[0] || null;
        if (event.type === 'levelWon') {
          this.wonAt = event.time;
          if (this.options.onProgress) this.options.onProgress({ level: this.level + 1, completedLevel: this.level,
            revenue: event.revenue, dishes: this.engine.jobs.filter(j => j.state === 'served').map(j => j.recipeId) });
        }
      }
      this.alignPrep();
      this.effects = this.effects.filter(e => this.engine.now - e.born <= 2.5);
    }
    advance(seconds) {
      this.engine.tick(seconds);
      this.collectEvents();
    }
    frame(ms) {
      const delta = this.lastFrame === null ? 0 : Math.max(0, Math.min(.1, (ms - this.lastFrame) / 1000));
      this.lastFrame = ms;
      this.advance(delta);
      return this.view();
    }
    view() {
      return { state: this.engine.snapshot(), effects: this.effects, slots: this.slots,
        rescueOffer: this.rescueOffer, adPending: this.adPending,
        panel: this.panel, reducedMotion: this.reducedMotion, level: this.level, difficultyName: this.config.difficultyName,
        toast: this.toast && this.toast.until > this.engine.now ? this.toast.text : '',
        resultReady: this.engine.status === 'failed' ||
          (this.engine.status === 'won' && this.engine.now >= this.wonAt + Motion.timing.resultDelay) };
    }
    pointer(point) {
      if (this.hidden || this.disposed) return false;
      if (this.adPending) return true;
      const p = point, e = this.engine, result = this.options.layout.result;
      if (this.panel) {
        if (inside(p, buttons.resume)) this.setPanel(null);
        else if (inside(p, buttons.reduced)) {
          this.reducedMotion = !this.reducedMotion;
          if (this.options.onSettings) this.options.onSettings({ reducedMotion: this.reducedMotion });
        } else if (inside(p, buttons.restart)) this.restart(this.level);
        else if (this.options.onHome && inside(p, buttons.home)) this.options.onHome();
        return true;
      }
      if (e.status !== 'playing') {
        if (!this.view().resultReady) return true;
        if (e.status === 'failed' && this.rescueOffer && inside(p, buttons.rescueRetry)) this.restart(this.level);
        else if (inside(p, result.nextButton)) {
          if (e.status === 'failed' && this.rescueOffer) this.requestRescue();
          else this.restart(this.level + (e.status === 'won' ? 1 : 0));
        } else if (inside(p, this.rescueOffer ? buttons.rescueHome : result.restButton)) {
          if (this.options.onHome) this.options.onHome(); else this.setPanel('rest');
        }
        return true;
      }
      if (inside(p, buttons.settings)) { this.setPanel('pause'); return true; }
      if (inside(p, buttons.sound)) { this.say('音效素材待接入，当前为静音试玩'); return true; }
      for (let i = 0; i < buttons.stored.length; i++) {
        if (e.stashItems[i] && inside(p, buttons.stored[i])) {
          if (!e.returnStash(i)) this.say('备菜栏放不下啦');
          this.collectEvents(); return true;
        }
      }
      for (const tool of ['undo', 'stash', 'hint']) {
        if (inside(p, buttons[tool])) {
          if (!e[tool]()) {
            if (tool !== 'hint' && this.options.rewardedRescue && e.rescueOptions().some(o => o.tool === tool)) {
              this.rescueOffer = { tool }; this.requestRescue();
            } else this.say(tool === 'hint' ? '暂时没有可提示的食材' : '当前无法使用这个道具');
          }
          this.collectEvents(); return true;
        }
      }
      const tile = e.nodes.slice().reverse().find(n => e.available(n.id) &&
        Math.abs(p.x - n.x) <= n.w / 2 && Math.abs(p.y - n.y) <= n.h / 2);
      if (!tile) return false;
      const selected = e.selectTile(tile.id);
      if (!selected.ok) this.say('备菜栏已满，等食材到位再试试');
      this.collectEvents();
      return selected.ok;
    }
    async requestRescue() {
      if (!this.options.rewardedRescue || !this.rescueOffer || this.adPending) return false;
      const engine = this.engine, request = ++this.requestSequence, tool = this.rescueOffer.tool;
      this.adPending = true; engine.pause(true); this.lastFrame = null;
      try {
        const completed = await this.options.rewardedRescue({ levelId: engine.levelId, tool });
        if (this.disposed || this.engine !== engine || request !== this.requestSequence) return false;
        if (completed !== true || !engine.applyRewardedRescue(tool, engine.levelId + '/' + request)) {
          this.say('视频未完成，仍可免费再试'); return false;
        }
        const advice=engine.events.find(e=>e.type==='rescueSuggestedAction');
        if(advice&&advice.action.type!=='pick')this.say(advice.action.index!==undefined?'先取回暂存食材再继续':'可点撤回或暂存继续整理');
        this.rescueOffer = null; this.collectEvents(); return true;
      } catch (_) {
        if (!this.disposed && this.engine === engine) this.say('视频暂不可用，仍可免费再试');
        return false;
      } finally {
        if (!this.disposed && this.engine === engine && request === this.requestSequence) {
          this.adPending = false; engine.pause(this.hidden || !!this.panel); this.lastFrame = null;
        }
      }
    }
    dispose() { this.disposed = true; this.requestSequence++; this.engine.pause(true); }
  }
  return { Session, buttons };
});
