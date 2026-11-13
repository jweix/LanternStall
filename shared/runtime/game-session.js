(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(
    require('../core/game-core.js'), require('../core/motion.js'), require('../core/levels.js'));
  else root.DapaidangSession = factory(root.DapaidangCore, root.DapaidangMotion, root.DapaidangLevels);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Core, Motion, Levels) {
  'use strict';
  const inside = (p, r) => p.x >= r[0] && p.y >= r[1] && p.x <= r[0] + r[2] && p.y <= r[1] + r[3];
  const buttons = {
    sound: [25, 15, 80, 80], settings: [120, 15, 80, 80],
    undo: [65, 1530, 255, 95], stash: [337, 1530, 255, 95], hint: [609, 1530, 255, 95],
    stored: [[624, 1260, 96, 65], [730, 1260, 96, 65]],
    resume: [204, 770, 520, 110], reduced: [204, 900, 520, 100], restart: [204, 1030, 520, 100]
  };

  class Session {
    constructor(options) {
      this.options = options;
      this.hidden = false;
      this.reducedMotion = !!options.reducedMotion;
      this.restart(options.level || 1);
    }
    restart(level) {
      this.level = level;
      this.config = Levels.createLevel(this.options.recipes, this.options.layout, level);
      this.engine = new Core.Engine(this.config);
      this.effects = [];
      this.slots = {};
      this.panel = null;
      this.lastFrame = null;
      this.toast = null;
      this.wonAt = null;
      this.engine.pause(this.hidden);
    }
    setHidden(value) {
      this.hidden = !!value;
      this.engine.pause(this.hidden || !!this.panel);
      this.lastFrame = null;
    }
    setPanel(panel) {
      this.panel = panel;
      this.engine.pause(this.hidden || !!panel);
      this.lastFrame = null;
    }
    say(text) { this.toast = { text, until: this.engine.now + 1.8 }; }
    collectEvents() {
      for (const event of this.engine.drainEvents()) {
        if (event.type === 'ingredientPicked') {
          const occupied = this.engine.buffer.concat(this.engine.incoming)
            .filter(i => i.id !== event.item.id).map(i => this.slots[i.id]);
          this.slots[event.item.id] = Array.from({ length: 7 }, (_, i) => i).find(i => !occupied.includes(i));
        }
        this.effects.push({ event, born: event.time });
        if (event.type === 'levelWon') {
          this.wonAt = event.time;
          if (this.options.onProgress) this.options.onProgress({ level: this.level + 1, revenue: event.revenue });
        }
      }
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
        panel: this.panel, reducedMotion: this.reducedMotion, level: this.level, difficultyName: this.config.difficultyName,
        toast: this.toast && this.toast.until > this.engine.now ? this.toast.text : '',
        resultReady: this.engine.status === 'failed' ||
          (this.engine.status === 'won' && this.engine.now >= this.wonAt + Motion.timing.resultDelay) };
    }
    pointer(point) {
      if (this.hidden) return false;
      const p = point, e = this.engine, result = this.options.layout.result;
      if (this.panel) {
        if (inside(p, buttons.resume)) this.setPanel(null);
        else if (this.panel === 'pause' && inside(p, buttons.reduced)) {
          this.reducedMotion = !this.reducedMotion;
          if (this.options.onSettings) this.options.onSettings({ reducedMotion: this.reducedMotion });
        } else if (inside(p, buttons.restart)) this.restart(this.level);
        return true;
      }
      if (e.status !== 'playing') {
        if (!this.view().resultReady) return true;
        if (inside(p, result.nextButton)) this.restart(this.level + (e.status === 'won' ? 1 : 0));
        else if (inside(p, result.restButton)) this.setPanel('rest');
        return true;
      }
      if (inside(p, buttons.settings)) { this.setPanel('pause'); return true; }
      if (inside(p, buttons.sound)) { this.say('音效素材待接入，当前为静音试玩'); return true; }
      for (let i = 0; i < buttons.stored.length; i++) {
        if (e.stashItems[i] && inside(p, buttons.stored[i])) {
          const item = e.stashItems[i];
          const occupied = e.buffer.concat(e.incoming).map(i => this.slots[i.id]);
          const slot = Array.from({ length: 7 }, (_, j) => j).find(j => !occupied.includes(j));
          if (e.returnStash(i)) this.slots[item.id] = slot;
          else this.say('备菜栏放不下啦');
          this.collectEvents(); return true;
        }
      }
      for (const tool of ['undo', 'stash', 'hint']) {
        if (inside(p, buttons[tool])) {
          if (!e[tool]()) this.say(tool === 'hint' ? '暂时没有可提示的食材' : '当前无法使用这个道具');
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
  }
  return { Session, buttons };
});
