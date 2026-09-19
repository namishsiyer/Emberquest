/* ===== logic.js — pure game rules, no DOM ===== */
let S = null, IDX = null, BODY = null, NOW = null, onSave = null;
const LS_KEY = 'emberquest.save.v1';
const today = () => NOW || fmtDate(new Date());
function setToday(d) { NOW = d; IDX = null; BODY = null; }
const invalidate = () => { IDX = null; BODY = null; };
const ZERO = Object.freeze({ workout: 0, run: 0, study: 0, mcq: 0, water: 0, sleep: 0, junk: 0, diary: 0, xp: 0, n: 0 });

const ACT_ORDER = ['workout', 'run', 'study', 'mcq', 'water', 'sleep', 'junk'];
const ACT = {
  workout: { label: 'Workout',   ico: '🏋️', unit: 'min',     step: 5,   chips: [15, 30, 45, 60, 90],   max: 300, dec: 0, verb: 'Worked out', defaultPriority: 'high' },
  run:     { label: 'Run',       ico: '🏃', unit: 'km',      step: 0.5, chips: [1, 2, 3, 5, 10],       max: 60,  dec: 1, verb: 'Ran',        defaultPriority: 'med' },
  study:   { label: 'Study',     ico: '📖', unit: 'hrs',     step: 0.5, chips: [0.5, 1, 2, 3, 4],      max: 16,  dec: 1, verb: 'Studied',    defaultPriority: 'high' },
  mcq:     { label: 'MCQs',      ico: '📝', unit: 'solved',  step: 5,   chips: [10, 20, 30, 50, 100],  max: 500, dec: 0, verb: 'Solved',     defaultPriority: 'high' },
  water:   { label: 'Water',     ico: '💧', unit: 'glasses', step: 1,   chips: [1, 2, 3, 4],           max: 12,  dec: 0, verb: 'Drank',      defaultPriority: 'med' },
  sleep:   { label: 'Sleep',     ico: '😴', unit: 'hrs',     step: 0.5, chips: [5, 6, 7, 8, 9],        max: 16,  dec: 1, verb: 'Slept',      defaultPriority: 'med' },
  junk:    { label: 'Junk food', ico: '🍔', unit: 'meals',   step: 1,   chips: [1, 2],                 max: 10,  dec: 0, verb: 'Ate',        defaultPriority: 'low' },
};

const RANKS = [
  { min: 1,  name: 'Rookie',     color: '#b59a80' },
  { min: 3,  name: 'Grinder',    color: '#d08a4a' },
  { min: 5,  name: 'Challenger', color: '#ff7a1a' },
  { min: 8,  name: 'Warrior',    color: '#ff9d3d' },
  { min: 11, name: 'Elite',      color: '#ffc24b' },
  { min: 15, name: 'Master',     color: '#ff5a2a' },
  { min: 20, name: 'Legend',     color: '#fff0d2' },
];
const rankOf = L => {
  let r = RANKS[0];
  for (const k of RANKS) if (L >= k.min) r = k;
  return r;
};

const GEAR = [
  { lvl: 2,  key: 'band',  name: 'Sweatband',     ico: '🎗️' },
  { lvl: 3,  key: 'shoes', name: 'Fire sneakers', ico: '👟' },
  { lvl: 5,  key: 'wrist', name: 'Wristbands',    ico: '🥊' },
  { lvl: 7,  key: 'cape',  name: 'Hero cape',     ico: '🦸' },
  { lvl: 10, key: 'aura',  name: 'Flame aura',    ico: '✨' },
  { lvl: 15, key: 'crown', name: 'Golden crown',  ico: '👑' },
];

/* Priority multiplier for XP */
const PRIORITY_MULT = {
  high: 1.35,
  med: 1.0,
  low: 0.8
};

/* ---------- state ---------- */
function defaultGoals(age) {
  return { run: 2, workout: 30, study: 3, mcq: 30, water: 6, sleep: age && age <= 17 ? 8.5 : 7 };
}

function defaultPriorities() {
  const p = {};
  for (const key of Object.keys(ACT)) {
    p[key] = ACT[key].defaultPriority || 'med';
  }
  return p;
}

function newState(profile) {
  const t = today();
  return normalizeState({
    v: 2,
    profile,
    createdAt: t,
    createdTs: Date.now(),
    xp: 0,
    level: 1,
    maxLevel: 1,
    shields: 1,
    lastCheck: t,
    missStreak: 0,
    entries: [],
    diary: [],
    penalties: [],
    clearDays: {},
    bossClaimed: {},
    challenges: {},
    customActivities: [],
    priorities: defaultPriorities(),
    badHabits: [
      { id: 'bh-doomscroll', name: 'Doomscrolling Social Media', ico: '📱', startedTs: Date.now(), resists: 0, relapses: [] },
      { id: 'bh-junk', name: 'Binging Junk Food', ico: '🍔', startedTs: Date.now(), resists: 0, relapses: [] }
    ],
    lifeAchievements: [],
    goals: defaultGoals(profile.age),
    settings: { sound: true },
    updatedAt: Date.now(),
  });
}

function normalizeState(s) {
  s.profile = Object.assign({ name: 'Hero', age: 20, skin: 0, hair: 0 }, s.profile || {});
  s.createdAt = s.createdAt || today();
  s.createdTs = s.createdTs || Date.now();
  s.xp = Math.max(0, s.xp || 0);
  s.level = s.level || 1;
  s.maxLevel = Math.max(s.maxLevel || 1, s.level);
  s.shields = clamp(s.shields == null ? 1 : s.shields, 0, 3);
  s.lastCheck = s.lastCheck || s.createdAt;
  s.missStreak = s.missStreak || 0;
  s.entries = s.entries || [];
  s.diary = s.diary || [];
  s.penalties = s.penalties || [];
  s.clearDays = s.clearDays || {};
  s.bossClaimed = s.bossClaimed || {};
  s.challenges = s.challenges || {};
  s.customActivities = s.customActivities || [];
  s.priorities = Object.assign(defaultPriorities(), s.priorities || {});
  s.badHabits = s.badHabits || [];
  s.lifeAchievements = s.lifeAchievements || [];
  s.goals = Object.assign(defaultGoals(s.profile.age), s.goals || {});
  s.settings = Object.assign({ sound: true }, s.settings || {});
  s.updatedAt = s.updatedAt || Date.now();
  return s;
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return normalizeState(JSON.parse(raw));
  } catch (e) {
    console.error('Failed to load save:', e);
  }
  return null;
}

function save() {
  S.updatedAt = Date.now();
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(S));
  } catch (e) {
    console.error('Failed to save:', e);
  }
  if (onSave) onSave();
}

/* Helper to get definition for any activity (built-in or custom) */
function getActivityDef(key) {
  if (ACT[key]) return Object.assign({ key }, ACT[key]);
  if (S && S.customActivities) {
    const custom = S.customActivities.find(c => c.key === key);
    if (custom) return Object.assign({}, custom);
  }
  return { key, label: key, ico: '⚡', unit: '', step: 1, chips: [1, 2, 5], max: 999, dec: 0 };
}

function getAllActivities() {
  const list = [];
  for (const key of ACT_ORDER) {
    list.push(getActivityDef(key));
  }
  if (S && S.customActivities) {
    for (const c of S.customActivities) {
      if (!list.some(a => a.key === c.key)) {
        list.push(c);
      }
    }
  }
  return list;
}

/* ---------- daily index ---------- */
function idx() {
  if (IDX) return IDX;
  const days = {}, shield = new Set();
  const get = d => days[d] || (days[d] = { workout: 0, run: 0, study: 0, mcq: 0, water: 0, sleep: 0, junk: 0, diary: 0, xp: 0, n: 0 });
  for (const e of S.entries) {
    const a = get(e.date);
    a[e.type] = (a[e.type] || 0) + e.val;
    a.xp += e.xp;
    a.n++;
  }
  for (const d of S.diary) {
    const a = get(d.date);
    a.diary++;
    a.xp += d.xp;
    a.n++;
  }
  for (const p of S.penalties) {
    if (p.kind === 'shield') shield.add(p.date);
  }
  IDX = { days, shield };
  return IDX;
}

const agg = d => idx().days[d] || ZERO;

function streak() {
  const A = idx();
  let d = today(), s = 0;
  if (!(A.days[d] && A.days[d].n > 0)) d = addDays(d, -1);
  while (d >= S.createdAt && s < 5000) {
    const has = (A.days[d] && A.days[d].n > 0) || A.shield.has(d);
    if (!has) break;
    s++;
    d = addDays(d, -1);
  }
  return s;
}

/* ---------- xp & levels ---------- */
const cumXp = L => L <= 1 ? 0 : Math.round(250 * Math.pow(L - 1, 1.75) / 10) * 10;

function levelInfo(xp) {
  let L = 1;
  while (cumXp(L + 1) <= xp && L < 99) L++;
  const base = cumXp(L), next = cumXp(L + 1);
  return {
    L,
    base,
    next,
    into: xp - base,
    span: next - base,
    pct: clamp((xp - base) / (next - base), 0, 1)
  };
}

function applyXp(d) {
  const before = S.xp;
  S.xp = Math.max(0, S.xp + d);
  return S.xp - before;
}

function xpFor(type, val, date) {
  const priority = (S.priorities && S.priorities[type]) || 'med';
  const mult = PRIORITY_MULT[priority] || 1.0;

  let base = 0;
  switch (type) {
    case 'workout': base = Math.round(val * 1.5); break;
    case 'run':     base = Math.round(val * 30); break;
    case 'study':   base = Math.round(val * 40); break;
    case 'mcq':     base = Math.round(val * 2); break;
    case 'water':   base = clamp(8 - agg(date).water, 0, val) * 5; break;
    case 'sleep':   base = val >= 7 && val <= 9.5 ? 40 : val >= 6 ? 20 : 0; break;
    case 'junk':    return -15 * val; // negative not amplified
    default:
      // Custom activity XP estimate
      base = Math.round(val * 10);
      break;
  }
  return Math.round(base * mult);
}

/* ---------- 7-day detailed trend analysis for any activity ---------- */
function calcActivityTrend(type) {
  const t = today();
  const recentDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(t, -i);
    const dayAgg = agg(d);
    const parsed = parseDate(d);
    const label = parsed.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
    const val = dayAgg[type] || 0;
    recentDays.push({ date: d, label, val });
  }

  const prevDays = [];
  for (let i = 13; i >= 7; i--) {
    const d = addDays(t, -i);
    const dayAgg = agg(d);
    prevDays.push(dayAgg[type] || 0);
  }

  const currTotal = recentDays.reduce((acc, cur) => acc + cur.val, 0);
  const prevTotal = prevDays.reduce((acc, cur) => acc + cur, 0);

  const currAvg = Number((currTotal / 7).toFixed(1));
  const prevAvg = Number((prevTotal / 7).toFixed(1));

  let pctChange = 0;
  if (prevAvg === 0 && currAvg > 0) {
    pctChange = 100;
  } else if (prevAvg > 0) {
    pctChange = Math.round(((currAvg - prevAvg) / prevAvg) * 100);
  }

  let status = 'yellow'; // neutral or stable
  if (pctChange >= 5) {
    status = 'green'; // improvement!
  } else if (pctChange < -5) {
    status = 'red'; // decrement
  } else if (currTotal > 0 && prevTotal === 0) {
    status = 'green';
  }

  const bestDay = recentDays.reduce((m, d) => Math.max(m, d.val), 0);
  const recentEntries = S.entries.filter(e => e.type === type).slice(-7).reverse();

  return {
    type,
    def: getActivityDef(type),
    priority: (S.priorities && S.priorities[type]) || 'med',
    recentDays,
    currTotal,
    currAvg,
    prevTotal,
    prevAvg,
    pctChange,
    status,
    bestDay,
    recentEntries
  };
}

/* ---------- daily quests ---------- */
const QUESTS = [
  { id: 'workout', ico: '🏋️', label: 'Workout',  unit: 'min',  get: a => a.workout, goal: () => S.goals.workout },
  { id: 'run',     ico: '🏃', label: 'Run',      unit: 'km',   get: a => a.run,     goal: () => S.goals.run },
  { id: 'study',   ico: '📖', label: 'Study',    unit: 'hrs',  get: a => a.study,   goal: () => S.goals.study },
  { id: 'mcq',     ico: '📝', label: 'MCQs',     unit: '',     get: a => a.mcq,     goal: () => S.goals.mcq },
  { id: 'water',   ico: '💧', label: 'Water',    unit: 'gl',   get: a => a.water,   goal: () => S.goals.water },
  { id: 'sleep',   ico: '😴', label: 'Sleep',    unit: 'hrs',  get: a => a.sleep,   goal: () => S.goals.sleep },
  { id: 'diary',   ico: '✍️',  label: 'Diary',    unit: '',     get: a => a.diary,   goal: () => 1 },
];
const CLEAR_MIN = 5, CLEAR_BONUS = 50;

function questsFor(date) {
  const a = agg(date);
  return QUESTS.map(q => {
    const g = q.goal(), v = q.get(a);
    return Object.assign({}, q, { g, v, done: v >= g, pct: clamp(v / (g || 1), 0, 1) });
  });
}

function reconcileClear(date, evts) {
  const ok = questsFor(date).filter(q => q.done).length >= CLEAR_MIN;
  const has = !!S.clearDays[date];
  if (ok && !has) {
    S.clearDays[date] = true;
    applyXp(CLEAR_BONUS);
    evts.push({ t: 'clear', bonus: CLEAR_BONUS });
  } else if (!ok && has) {
    delete S.clearDays[date];
    applyXp(-CLEAR_BONUS);
  }
}

/* ---------- level challenges ---------- */
const CH = [
  { lvl: 1,  title: 'First Sweat',   ico: '🏋️', m: { k: 'days', t: 'workout', min: 1 },  target: 3,   desc: t => `Work out on ${t} different days` },
  { lvl: 1,  title: 'Bookworm',      ico: '📚', m: { k: 'total', t: 'study' },           target: 5,   desc: t => `Study ${t} hours in total` },
  { lvl: 2,  title: 'Road Warrior',  ico: '👟', m: { k: 'total', t: 'run' },             target: 10,  desc: t => `Run ${t} km in total` },
  { lvl: 3,  title: 'MCQ Machine',   ico: '📝', m: { k: 'total', t: 'mcq' },             target: 100, desc: t => `Solve ${t} MCQs in total` },
  { lvl: 4,  title: 'Clean Plate',   ico: '🥗', m: { k: 'clean' },                       target: 5,   desc: t => `Log ${t} days with zero junk food` },
  { lvl: 5,  title: 'Dear Diary',    ico: '📓', m: { k: 'diary' },                       target: 5,   desc: t => `Write diary notes on ${t} different days` },
  { lvl: 6,  title: 'Iron Week',     ico: '💪', m: { k: 'days', t: 'workout', min: 20 }, target: 5,   desc: t => `Work out 20+ min on ${t} different days` },
  { lvl: 7,  title: 'Deep Focus',    ico: '⚡', m: { k: 'best', t: 'study' },            target: 4,   desc: t => `Study ${t} hours in a single day` },
  { lvl: 8,  title: 'On Fire',       ico: '🔥', m: { k: 'streak' },                      target: 7,   desc: t => `Reach a ${t}-day streak` },
  { lvl: 9,  title: 'Century Club',  ico: '💯', m: { k: 'total', t: 'mcq' },             target: 200, desc: t => `Solve ${t} MCQs in total` },
  { lvl: 10, title: 'Half Marathon', ico: '🏃', m: { k: 'total', t: 'run' },             target: 21,  desc: t => `Run ${t} km in total` },
  { lvl: 11, title: 'Hydro Hero',    ico: '💧', m: { k: 'days', t: 'water', min: 8 },    target: 5,   desc: t => `Drink 8+ glasses on ${t} different days` },
  { lvl: 12, title: 'Sleep Scholar', ico: '😴', m: { k: 'days', t: 'sleep', min: 7 },    target: 5,   desc: t => `Sleep 7+ hours on ${t} different days` },
  { lvl: 13, title: 'Marathon Mind', ico: '🧠', m: { k: 'total', t: 'study' },           target: 25,  desc: t => `Study ${t} hours in total` },
  { lvl: 14, title: 'Two-a-Day',     ico: '⚡', m: { k: 'both' },                        target: 3,   desc: t => `Work out and run on the same day, ${t} times` },
  { lvl: 15, title: 'MCQ Marathon',  ico: '🎯', m: { k: 'best', t: 'mcq' },              target: 100, desc: t => `Solve ${t} MCQs in a single day` },
  { lvl: 16, title: 'Unbroken',      ico: '🛡️', m: { k: 'streak' },                      target: 21,  desc: t => `Reach a ${t}-day streak` },
  { lvl: 17, title: 'Ultra Runner',  ico: '🏔️', m: { k: 'total', t: 'run' },             target: 50,  desc: t => `Run ${t} km in total` },
  { lvl: 18, title: 'Spotless',      ico: '✨', m: { k: 'clean' },                       target: 14,  desc: t => `Log ${t} days with zero junk food` },
];

function defsForLevel(L) {
  if (L <= 18) {
    return CH.filter(c => c.lvl === L).map((c, i) => ({
      id: 'L' + L + '-' + i,
      lvl: L,
      title: c.title,
      ico: c.ico,
      m: c.m,
      target: c.target,
      text: c.desc(c.target)
    }));
  }
  const c = CH[(L - 19) % CH.length], mult = 1 + 0.5 * (1 + Math.floor((L - 19) / CH.length));
  const target = Math.ceil(c.target * mult);
  return [{
    id: 'L' + L + '-0',
    lvl: L,
    title: c.title + ' II',
    ico: c.ico,
    m: c.m,
    target,
    text: c.desc(target)
  }];
}

const rewardOf = L => 30 + 10 * L;

function activeDefs() {
  const out = [];
  for (let L = 1; L <= S.maxLevel; L++) out.push(...defsForLevel(L));
  return out;
}

function ensureChallenges() {
  for (let L = 1; L <= S.maxLevel; L++) {
    for (const d of defsForLevel(L)) {
      if (!S.challenges[d.id]) {
        S.challenges[d.id] = { start: L === 1 ? S.createdTs : Date.now(), done: false };
      }
    }
  }
}

function evalChallenge(def, start) {
  const m = def.m;
  if (m.k === 'streak') return streak();
  if (m.k === 'diary') return new Set(S.diary.filter(d => d.ts >= start).map(d => d.date)).size;
  const byDay = {};
  for (const e of S.entries) {
    if (e.ts < start) continue;
    const o = byDay[e.date] || (byDay[e.date] = { workout: 0, run: 0, study: 0, mcq: 0, water: 0, sleep: 0, junk: 0 });
    o[e.type] = (o[e.type] || 0) + e.val;
  }
  const dd = Object.keys(byDay).map(k => byDay[k]);
  switch (m.k) {
    case 'total': return dd.reduce((s, o) => s + (o[m.t] || 0), 0);
    case 'days':  return dd.filter(o => (o[m.t] || 0) >= m.min).length;
    case 'best':  return dd.reduce((s, o) => Math.max(s, o[m.t] || 0), 0);
    case 'clean': return dd.filter(o => (o.junk || 0) === 0).length;
    case 'both':  return dd.filter(o => (o.workout || 0) > 0 && (o.run || 0) > 0).length;
  }
  return 0;
}

function challengeProgress(def) {
  const st = S.challenges[def.id];
  if (!st) return { v: 0, pct: 0, done: false };
  const v = st.done ? def.target : Math.min(evalChallenge(def, st.start), def.target);
  return { v, pct: clamp(v / def.target, 0, 1), done: st.done, doneOn: st.doneOn };
}

/* ---------- weekly boss ---------- */
const BOSSES = [
  { name: 'Procrastination Slime', ico: '👾', title: 'The Lethargy Lurker', pal: ['#6fa8dc', '#3f6f9e', '#d6ecff'] },
  { name: 'Couch Golem',           ico: '🗿', title: 'The Inertia Titan',   pal: ['#b0916f', '#7a6249', '#f0dfc8'] },
  { name: 'Doomscroll Wraith',     ico: '📱', title: 'The Phantom of Feeds', pal: ['#8f86c9', '#5b5390', '#e2ddff'] },
  { name: 'Snooze Blob',           ico: '💤', title: 'The Alarm Eater',      pal: ['#6dbfa8', '#3f8a76', '#d2f5ea'] },
];

const weekKey = (d = today()) => addDays(d, -((parseDate(d).getDay() + 6) % 7));

function weekXp(wk) {
  let s = 0;
  for (let i = 0; i < 7; i++) s += agg(addDays(wk, i)).xp;
  return Math.max(0, s);
}

function bossInfo() {
  const wk = weekKey(), n = Math.floor(diffDays('2024-01-01', wk) / 7);
  const b = BOSSES[((n % BOSSES.length) + BOSSES.length) % BOSSES.length];
  const hp = 600 + 220 * S.level;
  const dmg = weekXp(wk);
  const dead = !!S.bossClaimed[wk] || dmg >= hp;
  return Object.assign({}, b, {
    wk,
    hp,
    dmg,
    dead,
    reward: 100 + 10 * S.level,
    daysLeft: 6 - ((parseDate(today()).getDay() + 6) % 7)
  });
}

function checkBoss(evts) {
  const b = bossInfo();
  if (b.dmg >= b.hp && !S.bossClaimed[b.wk]) {
    S.bossClaimed[b.wk] = true;
    applyXp(b.reward);
    evts.push({ t: 'boss', name: b.name, reward: b.reward });
    return true;
  }
  return false;
}

/* ---------- settle: levels, challenges, boss ---------- */
function syncLevel(evts) {
  const L = levelInfo(S.xp).L;
  if (L > S.level) {
    for (let l = S.level + 1; l <= L; l++) {
      if (l > S.maxLevel) {
        S.maxLevel = l;
        S.shields = Math.min(3, S.shields + 1);
        ensureChallenges();
        evts.push({
          t: 'levelup',
          level: l,
          gear: GEAR.filter(g => g.lvl === l),
          defs: defsForLevel(l),
          rankUp: rankOf(l).name !== rankOf(l - 1).name ? rankOf(l) : null
        });
      }
    }
  } else if (L < S.level) {
    evts.push({ t: 'leveldown', level: L });
  }
  S.level = L;
}

function settle(evts) {
  let guard = 0, changed = true;
  while (changed && guard++ < 12) {
    changed = false;
    syncLevel(evts);
    for (const def of activeDefs()) {
      const st = S.challenges[def.id];
      if (st && !st.done && evalChallenge(def, st.start) >= def.target) {
        st.done = true;
        st.doneOn = today();
        const r = rewardOf(def.lvl);
        applyXp(r);
        evts.push({ t: 'challenge', def, reward: r });
        changed = true;
      }
    }
    if (checkBoss(evts)) changed = true;
  }
  syncLevel(evts);
}

/* ---------- mutations ---------- */
function refundPenalty(date) {
  const i = S.penalties.findIndex(p => p.date === date);
  if (i < 0 || agg(date).n === 0) return;
  const p = S.penalties[i];
  if (p.kind === 'missed') applyXp(p.xp);
  else S.shields = Math.min(3, S.shields + 1);
  S.penalties.splice(i, 1);
  invalidate();
}

function afterChange(date, evts) {
  refundPenalty(date);
  reconcileClear(date, evts);
  settle(evts);
  save();
}

function addEntry(type, val, date, note) {
  const a = getActivityDef(type);
  val = Number(val);
  if (!(val > 0)) return null;
  val = Number(Math.min(val, a.max || 9999).toFixed(a.dec || 0));
  if (!(val > 0)) return null;
  if (type === 'sleep') {
    for (const e of S.entries.slice()) {
      if (e.type === 'sleep' && e.date === date) {
        applyXp(-e.xp);
        S.entries.splice(S.entries.indexOf(e), 1);
      }
    }
    invalidate();
  }
  const applied = applyXp(xpFor(type, val, date));
  const e = { id: uid(), date, ts: Date.now(), type, val, xp: applied };
  if (note) e.note = note;
  S.entries.push(e);
  invalidate();
  const evts = [];
  afterChange(date, evts);
  return { entry: e, evts };
}

function deleteEntry(id) {
  const i = S.entries.findIndex(e => e.id === id);
  if (i < 0) return null;
  const e = S.entries[i];
  S.entries.splice(i, 1);
  applyXp(-e.xp);
  invalidate();
  const evts = [];
  afterChange(e.date, evts);
  return { entry: e, evts };
}

function addDiary(text, mood, date) {
  text = String(text || '').trim().slice(0, 300);
  if (!text) return null;
  const isFirstToday = agg(date).diary === 0;
  const applied = applyXp(isFirstToday ? 20 : 0);
  const e = { id: uid(), date, ts: Date.now(), text, mood: mood || 'ok', xp: applied };
  S.diary.push(e);
  invalidate();
  const evts = [];
  afterChange(date, evts);
  return { entry: e, evts };
}

function deleteDiary(id) {
  const i = S.diary.findIndex(e => e.id === id);
  if (i < 0) return null;
  const e = S.diary[i];
  S.diary.splice(i, 1);
  applyXp(-e.xp);
  invalidate();
  const evts = [];
  afterChange(e.date, evts);
  return { entry: e, evts };
}

/* Custom Activity Mutations */
function addCustomActivity(label, ico, unit, step, chips, max, priority) {
  label = String(label || '').trim();
  if (!label) return null;
  const key = 'cust_' + uid();
  const def = {
    key,
    label,
    ico: ico || '⚡',
    unit: unit || '',
    step: Number(step) || 1,
    chips: chips && chips.length ? chips : [1, 2, 5],
    max: Number(max) || 999,
    dec: (step % 1 !== 0) ? 1 : 0,
    isCustom: true
  };
  S.customActivities.push(def);
  S.priorities[key] = priority || 'med';
  save();
  return def;
}

function deleteCustomActivity(key) {
  const idx = S.customActivities.findIndex(c => c.key === key);
  if (idx >= 0) {
    S.customActivities.splice(idx, 1);
    delete S.priorities[key];
    save();
    return true;
  }
  return false;
}

function setActivityPriority(key, priority) {
  if (!S.priorities) S.priorities = defaultPriorities();
  S.priorities[key] = priority;
  save();
}

/* Bad Habit Quitter Mutations */
function addBadHabit(name, ico, reason) {
  name = String(name || '').trim();
  if (!name) return null;
  const habit = {
    id: 'bh_' + uid(),
    name,
    ico: ico || '🚫',
    reason: reason || 'Build better self-discipline',
    startedTs: Date.now(),
    resists: 0,
    relapses: []
  };
  S.badHabits.push(habit);
  save();
  return habit;
}

function deleteBadHabit(id) {
  const idx = S.badHabits.findIndex(h => h.id === id);
  if (idx >= 0) {
    S.badHabits.splice(idx, 1);
    save();
    return true;
  }
  return false;
}

function resistBadHabit(id) {
  const h = S.badHabits.find(h => h.id === id);
  if (!h) return null;
  h.resists = (h.resists || 0) + 1;
  const bonusXp = applyXp(15);
  const evts = [];
  settle(evts);
  save();
  return { habit: h, xp: bonusXp, evts };
}

function relapseBadHabit(id, note) {
  const h = S.badHabits.find(h => h.id === id);
  if (!h) return null;
  const prevDurationMs = Date.now() - h.startedTs;
  h.relapses.push({
    ts: Date.now(),
    date: today(),
    durationCleanMs: prevDurationMs,
    note: note || ''
  });
  h.startedTs = Date.now(); // reset clean timer
  const penalty = applyXp(-15);
  const evts = [];
  settle(evts);
  save();
  return { habit: h, xp: penalty, evts };
}

function getBadHabitDuration(h) {
  const ms = Math.max(0, Date.now() - (h.startedTs || Date.now()));
  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, mins, totalHours, ms };
}

/* Life Achievements Mutations */
function addLifeAchievement(title, category, date, desc) {
  title = String(title || '').trim();
  if (!title) return null;
  const ach = {
    id: 'ach_' + uid(),
    title,
    category: category || 'General',
    date: date || today(),
    desc: String(desc || '').trim(),
    xp: 100
  };
  S.lifeAchievements.push(ach);
  applyXp(100);
  const evts = [];
  settle(evts);
  save();
  return { achievement: ach, evts };
}

function deleteLifeAchievement(id) {
  const idx = S.lifeAchievements.findIndex(a => a.id === id);
  if (idx >= 0) {
    const ach = S.lifeAchievements[idx];
    S.lifeAchievements.splice(idx, 1);
    applyXp(-ach.xp);
    const evts = [];
    settle(evts);
    save();
    return true;
  }
  return false;
}

/* Missed-day penalties. Runs on open and when date rolls over */
function processMissed() {
  const y = addDays(today(), -1);
  if (S.lastCheck >= y) return null;
  const out = { lost: 0, days: 0, shielded: 0 };
  let d = addDays(S.lastCheck, 1);
  while (d <= y) {
    if (agg(d).n > 0) {
      S.missStreak = 0;
    } else {
      S.missStreak++;
      if (S.shields > 0) {
        S.shields--;
        S.penalties.push({ date: d, xp: 0, kind: 'shield' });
        out.shielded++;
      } else {
        const amt = Math.min(30 + 15 * (S.missStreak - 1), 60);
        const lost = -applyXp(-amt);
        S.penalties.push({ date: d, xp: lost, kind: 'missed' });
        out.lost += lost;
        out.days++;
      }
    }
    d = addDays(d, 1);
  }
  S.lastCheck = y;
  invalidate();
  const evts = [];
  settle(evts);
  save();
  return (out.days || out.shielded) ? Object.assign(out, { evts }) : null;
}

/* ---------- body model: muscle & fat evolve day by day ---------- */
function bodyModel() {
  if (BODY) return BODY;
  const A = idx().days, end = today(), gw = S.goals.workout || 30, gr = S.goals.run || 2;
  let fit = 30, fat = 20, d = S.createdAt, n = 0;
  while (d <= end && n++ < 5000) {
    const a = A[d] || ZERO;
    const w = a.workout / gw, r = a.run / gr;
    const ratio = clamp(Math.max(w, r, 0.6 * w + 0.4 * r), 0, 1.25);
    fit = clamp(fit * 0.96 + 4.5 * ratio, 0, 100);
    fat = clamp(fat * 0.94 + a.junk * 4.5 + (ratio < 0.25 ? 0.8 : 0) - ratio * 1.2, 0, 100);
    d = addDays(d, 1);
  }
  BODY = { fit, fat };
  return BODY;
}

function bodyLabel(b) {
  if (b.fat >= 65) return ['Heavy', 'Junk food is dominating. Move more and eat cleaner.'];
  if (b.fat >= 40) return ['Soft', 'A bit soft around the edges. Cardio will tighten you up.'];
  if (b.fit >= 85 && b.fat < 25) return ['Shredded', 'Peak aesthetic physique! Steel abs and broad shoulders.'];
  if (b.fit >= 65) return ['Athletic', 'Strong, defined, and consistently active!'];
  if (b.fit >= 40) return ['Toned', 'Solid progress. Muscles are showing definition.'];
  if (b.fit >= 20) return ['Average', 'Decent baseline. Regular workouts will shape your body.'];
  return ['Frail', 'Muscles are fading without training. Lift or run today!'];
}

/* ---------- radar chart data ---------- */
const AREAS = [
  { key: 'strength',   label: 'Strength',   ico: '🏋️' },
  { key: 'stamina',    label: 'Stamina',    ico: '🏃' },
  { key: 'focus',      label: 'Focus',      ico: '📖' },
  { key: 'knowledge',  label: 'Knowledge',  ico: '📝' },
  { key: 'recovery',   label: 'Recovery',   ico: '😴' },
  { key: 'fuel',       label: 'Fuel',       ico: '💧' },
  { key: 'reflection', label: 'Reflection', ico: '✍️' },
];

function areaScores(W, off) {
  const end = addDays(today(), -off * W), g = S.goals, t = today();
  let eff = 0;
  const s = { w: 0, r: 0, st: 0, m: 0, sl: 0, wa: 0, clean: 0, dia: 0 };
  for (let i = 0; i < W; i++) {
    const d = addDays(end, -i);
    if (d < S.createdAt || d > t) continue;
    eff++;
    const a = agg(d);
    s.w += Math.min(a.workout, g.workout * 1.5);
    s.r += Math.min(a.run, g.run * 1.5);
    s.st += Math.min(a.study, g.study * 1.5);
    s.m += Math.min(a.mcq, g.mcq * 1.5);
    s.sl += Math.min(a.sleep, 9);
    s.wa += Math.min(a.water, g.water);
    if (a.n > 0 && a.junk === 0) s.clean++;
    if (a.diary > 0) s.dia++;
  }
  if (!eff) return null;
  const c = v => Math.round(clamp(v, 0, 1) * 100);
  return [
    c(s.w / (g.workout * eff)),
    c(s.r / (g.run * eff)),
    c(s.st / (g.study * eff)),
    c(s.m / (g.mcq * eff)),
    c(s.sl / (g.sleep * eff)),
    c(0.6 * s.wa / (g.water * eff) + 0.4 * s.clean / eff),
    c(s.dia / eff)
  ];
}

function radarSeries(W) {
  const nm = W === 7 ? ['This week', 'Last week', '2 wks ago'] : ['This month', 'Last month', '2 mos ago'];
  return nm.map((label, i) => ({ label, vals: areaScores(W, i) }));
}

/* ---------- rivals (simulated ghosts) ---------- */
const RIVALS = [
  ['Ember', 330],
  ['Nova',  300],
  ['Kai',   270],
  ['Rook',  240],
  ['Mika',  210],
  ['Blaze', 180],
  ['Sage',  150],
  ['Zed',   120],
  ['Ash',   90]
];

function leaderboard() {
  const wk = weekKey(), t = today(), rows = [];
  for (const [name, base] of RIVALS) {
    let xp = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDays(wk, i);
      if (d > t) break;
      const r = rng(hashStr(wk + '|' + name + '|' + i));
      xp += r() < 0.12 ? 0 : Math.round(base * (0.35 + r() * 0.95));
    }
    rows.push({ name, xp, me: false });
  }
  rows.push({ name: S.profile.name || 'Hero', xp: weekXp(wk), me: true });
  rows.sort((a, b) => b.xp - a.xp);
  rows.forEach((r, i) => r.rank = i + 1);
  return rows;
}
