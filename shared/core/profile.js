(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../data/progression.js'));
  else root.DapaidangProfile = factory(root.DapaidangProgression);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (C) {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const integer = (n, max) => Number.isSafeInteger(n) && n >= 0 && n <= max;
  const day = time => new Date(time + 8 * 3600000).toISOString().slice(0, 10);
  const validDay = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));
  function fresh() {
    return { version: C.schema, coins: 0, cleared: [], owned: C.slots.map(s => 'base-' + s),
      equipped: Object.fromEntries(C.slots.map(s => [s, 'base-' + s])), wish: 'warm-lamp', dishes: {},
      daily: { day: '', wins: 0, practice: false, ads: 0, eventWins: 0 }, activity: [0, 0, 0, 0],
      activeBook: 0, daysOpen: 0, photos: [], ledger: [], nextAttempt: 1, activeAttempt: null,
      reducedMotion: false, tutorialDone: false };
  }
  function hydrate(raw, legacy) {
    const s = fresh();
    if (!raw || raw.version !== C.schema) {
      const unlocked = legacy && integer(legacy.level, 10000) ? Math.max(1, legacy.level) : 1;
      s.cleared = Array.from({ length: unlocked - 1 }, (_, n) => n + 1);
      s.tutorialDone = unlocked > 1;
      return s;
    }
    if (integer(raw.coins, 1000000000)) s.coins = raw.coins;
    s.cleared = Array.isArray(raw.cleared) ? [...new Set(raw.cleared.filter(n => integer(n, 10000) && n > 0))].sort((a, b) => a - b) : [];
    if (Array.isArray(raw.owned)) s.owned = [...new Set(s.owned.concat(raw.owned.filter(id => C.byId[id])))];
    C.slots.forEach(slot => { const id = raw.equipped && raw.equipped[slot]; if (s.owned.includes(id) && C.byId[id].slot === slot) s.equipped[slot] = id; });
    if (C.byId[raw.wish]) s.wish = raw.wish;
    for (const [id, count] of Object.entries(raw.dishes || {})) if (/^d\d\d$/.test(id) && integer(count, 10000000)) s.dishes[id] = count;
    if (raw.daily && validDay(raw.daily.day)) {
      s.daily.day = raw.daily.day;
      for (const key of ['wins', 'ads', 'eventWins']) if (integer(raw.daily[key], key === 'wins' ? 100000 : 3)) s.daily[key] = raw.daily[key];
      s.daily.practice = raw.daily.practice === true;
    }
    if (Array.isArray(raw.activity)) s.activity = s.activity.map((_, i) => integer(raw.activity[i], 14) ? raw.activity[i] : 0);
    if (integer(raw.activeBook, 3)) s.activeBook = raw.activeBook;
    if (integer(raw.daysOpen, 100000)) s.daysOpen = raw.daysOpen;
    if (integer(raw.nextAttempt, Number.MAX_SAFE_INTEGER - 1) && raw.nextAttempt > 0) s.nextAttempt = raw.nextAttempt;
    // In-progress games are deliberately not restored. A fresh attempt gets a new durable identity.
    if (Array.isArray(raw.photos)) s.photos = raw.photos.filter(p => p && typeof p.id === 'string' && p.equipped && C.slots.every(slot => C.byId[p.equipped[slot]] && C.byId[p.equipped[slot]].slot === slot)).slice(-24).map(p => ({ id: p.id, date: String(p.date).slice(0, 10), level: integer(p.level, 10000) ? p.level : 0, equipped: copy(p.equipped) }));
    if (Array.isArray(raw.ledger)) s.ledger = raw.ledger.filter(l => l && typeof l.label === 'string' && Number.isSafeInteger(l.amount)).slice(-30).map(l => ({ label: l.label.slice(0, 50), amount: l.amount, date: String(l.date).slice(0, 10) }));
    s.reducedMotion = !!raw.reducedMotion; s.tutorialDone = !!raw.tutorialDone;
    return s;
  }
  class Profile {
    constructor(options) {
      this.options = options || {}; this.now = this.options.now || (() => Date.now());
      this.state = hydrate(this.options.data, this.options.legacy); this.error = '';
      if (!this.options.data && this.options.settings) this.state.reducedMotion = !!this.options.settings.reducedMotion;
    }
    get nextLevel() { let n = 1; const cleared = new Set(this.state.cleared); while (cleared.has(n)) n++; return n; }
    commit(next) {
      try {
        if (this.options.save && this.options.save(copy(next)) === false) throw Error('save failed');
        this.state = next; this.error = ''; return true;
      } catch (_) { this.error = '存档未成功，请检查存储空间后重试'; return false; }
    }
    transact(change) { const s = copy(this.state), result = change(s); if (result === false) return false; return this.commit(s) ? result === undefined ? true : result : false; }
    rollDay(s) {
      const today = day(this.now());
      // Local saves resist clock rollback; a trusted server date is required for production anti-cheat.
      if (!s.daily.day || today > s.daily.day) s.daily = { day: today, wins: 0, practice: false, ads: 0, eventWins: 0 };
    }
    daily() { const s = copy(this.state); this.rollDay(s); return s.daily; }
    released(book) { return day(this.now()) >= day(Date.parse(C.event.start + 'T00:00:00+08:00') + book * 7 * 86400000); }
    begin(level) {
      if (!integer(level, 10000) || level < 1 || level > this.nextLevel) return false;
      return this.transact(s => { const id = s.nextAttempt++; s.activeAttempt = { id, level }; return id; });
    }
    log(s, label, amount) { if (!amount) return; s.coins += amount; s.ledger.push({ label, amount, date: day(this.now()) }); s.ledger = s.ledger.slice(-30); }
    grant(s, id, rewards) { if (!s.owned.includes(id)) { s.owned.push(id); rewards.push(C.byId[id].name); } }
    settle(attempt, result) {
      if (!this.state.activeAttempt || this.state.activeAttempt.id !== attempt || this.state.activeAttempt.level !== result.level ||
        !integer(result.revenue, 1000000) || !Array.isArray(result.dishes)) return false;
      return this.transact(s => {
        this.rollDay(s);
        const first = !s.cleared.includes(result.level), practice = !first && !s.daily.practice;
        const before = s.coins, rewards = [], newly = [];
        if (first) { s.cleared.push(result.level); this.log(s, '第' + result.level + '关首通', result.revenue); }
        else if (practice) { s.daily.practice = true; this.log(s, '每日重玩补贴', C.economy.practice); }
        s.daily.wins++;
        if (s.daily.wins === 1) { s.daysOpen++; this.log(s, '每日首胜', C.economy.firstWin); }
        if (s.daily.wins === 3) this.log(s, '每日三胜', C.economy.threeWins);
        if (first || practice) for (const id of result.dishes) {
          if (!/^d\d\d$/.test(id)) continue;
          if (!s.dishes[id]) newly.push(id);
          s.dishes[id] = (s.dishes[id] || 0) + 1;
        }
        const count = Object.keys(s.dishes).length;
        if (count >= 6) this.grant(s, 'recipe-menu', rewards);
        if (count >= 12) this.grant(s, 'recipe-plate', rewards);
        let book = s.activeBook;
        if (s.activity[book] >= 14 || !this.released(book)) book = s.activity.findIndex((n, i) => n < 14 && this.released(i));
        if (s.cleared.length >= 5 && s.daily.eventWins < 3 && book >= 0) {
          s.activeBook = book; s.daily.eventWins++; s.activity[book]++;
          if (s.activity[book] >= 6) this.grant(s, 'festival-' + C.event.small[book], rewards);
          if (s.activity[book] >= 14) this.grant(s, 'festival-' + C.event.large[book], rewards);
        }
        if (s.activity.every(n => n === 14)) this.grant(s, 'festival-chef', rewards);
        s.activeAttempt = null;
        return { first, practice, credited: s.coins - before, revenue: result.revenue, newly: [...new Set(newly)], rewards, activity: s.activity.slice(), level: result.level, adTaken: false };
      });
    }
    purchase(id) {
      const item = C.byId[id];
      if (!item || item.source !== 'coins' || this.state.cleared.length < item.unlock || this.state.owned.includes(id) || this.state.coins < item.price) return false;
      return this.transact(s => {
        this.log(s, '购买' + item.name, -item.price); s.owned.push(id); s.equipped[item.slot] = id;
        if (s.wish === id) s.wish = (C.items.find(i => i.theme === item.theme && !s.owned.includes(i.id)) ||
          C.items.find(i => i.source === 'coins' && i.unlock <= s.cleared.length && !s.owned.includes(i.id)) ||
          C.items.find(i => i.source === 'coins' && !s.owned.includes(i.id)) || item).id;
      });
    }
    equip(id) { const i = C.byId[id]; return !!i && this.state.owned.includes(id) && this.transact(s => { s.equipped[i.slot] = id; }); }
    wish(id) { return C.byId[id] && C.byId[id].source === 'coins' && this.transact(s => { s.wish = id; }); }
    selectBook(book) { return integer(book, 3) && this.released(book) && this.transact(s => { s.activeBook = book; }); }
    settings(value) { return this.transact(s => { s.reducedMotion = !!value; }); }
    photo() { return this.state.cleared.length >= 10 && this.state.photos.length < 24 && this.transact(s => { s.photos.push({ id: 'photo-' + s.nextAttempt + '-' + this.now(), date: day(this.now()), level: s.cleared.length, equipped: copy(s.equipped) }); }); }
    removePhoto(id) { return this.transact(s => { s.photos = s.photos.filter(p => p.id !== id); }); }
    memories() {
      const out = [], s = this.state;
      for (let chapter = 1; chapter <= Math.floor(s.cleared.length / 20); chapter++) out.push({ id: 'chapter-' + chapter, title: '第' + chapter + '章开摊纪念', description: '完成' + chapter * 20 + '关的灯火回忆', theme: C.themes[Math.min(chapter, 3)].id });
      for (const theme of C.themes.filter(t => t.scale)) {
        const n = C.items.filter(i => i.theme === theme.id && i.source === 'coins' && s.owned.includes(i.id)).length;
        for (const threshold of [3, 6, 9]) if (n >= threshold) out.push({ id: theme.id + '-' + threshold, title: theme.name + ['贴纸', '相框', '纪念照'][[3, 6, 9].indexOf(threshold)], description: '收藏' + threshold + '件主题装扮', theme: theme.id });
      }
      if (Object.keys(s.dishes).length >= 20) out.push({ id: 'recipes-20', title: '完整家常菜谱纪念框', description: '点亮全部20道家常菜', theme: 'sea' });
      s.activity.forEach((n, i) => { for (const threshold of [3, 10]) if (n >= threshold) out.push({ id: 'event-' + i + '-' + threshold, title: C.event.books[i] + (threshold === 3 ? '贴纸' : '相框'), description: '活动册累计' + threshold + '进度', theme: 'festival' }); });
      return out;
    }
    finishTutorial() { return this.transact(s => { s.tutorialDone = true; }); }
    appearance(equipped) { return Object.fromEntries(C.slots.map(slot => [slot, C.byTheme[C.byId[(equipped || this.state.equipped)[slot]].theme]])); }
    // Real ad completion is injected by a platform adapter, never simulated as a reward.
    adReward() { return this.daily().ads < C.economy.adLimit && this.transact(s => { this.rollDay(s); if (s.daily.ads >= C.economy.adLimit) return false; s.daily.ads++; this.log(s, '视频经营补贴', C.economy.ad); }); }
  }
  return { Profile, hydrate, day };
});
