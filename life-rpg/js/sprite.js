/* ===== sprite.js — parametric pixel hero ===== */
const SKINS = [
  { base: '#f3c9a3', shade: '#d29d73' }, { base: '#e2a878', shade: '#bd8054' },
  { base: '#b97b4f', shade: '#94593a' }, { base: '#7c4b2e', shade: '#5c361f' },
].map(s => Object.assign(s, { limb: mixHex(s.base, s.shade, 0.35), limbShade: mixHex(s.base, s.shade, 0.8), hi: mixHex(s.base, '#ffffff', 0.35) }));
const HAIRS = [
  { name: 'Black',  base: '#2d2622', shade: '#1a1512' }, { name: 'Brown',  base: '#7a4422', shade: '#552d14' },
  { name: 'Blond',  base: '#e3b84f', shade: '#b98c28' }, { name: 'Ginger', base: '#e2551f', shade: '#a83a12' },
  { name: 'Silver', base: '#d9d4ca', shade: '#a59f93' },
];
const COL = {
  outline: '#0c0b0a', shortsO: '#ff7a1a', shortsD: '#b8470a', cream: '#f5e6cc', eye: '#17110e', mouth: '#6b2a1a', teeth: '#f6ecd9',
  shoe: '#7a7268', shoeD: '#5a544c', sole: '#e0d9cc', shoeO: '#ff7a1a', shoeOD: '#c2500b', gold: '#ffc94d', goldD: '#c98a17',
  capeA: '#c9440c', capeB: '#8f2f08', band: '#ff7a1a', bandD: '#b8470a', sweat: '#cfe8ff', bar: '#2a2622', plate: '#ff7a1a',
  book: '#c9440c', page: '#f6ecd9', cup: '#efe3cc', straw: '#ff7a1a', bun: '#e0a13c', patty: '#6a3418', cheese: '#ffd25a', zz: '#ffd28a',
};

function createSprite(canvas) {
  const GW = 64, GH = 60, FLOOR = 56, B = FLOOR - 48;
  const ctx = canvas ? canvas.getContext('2d') : null;
  const grid = new Array(GW * GH).fill(null);
  const me = {
    GW, GH, FLOOR, B, grid, scale: 6, cx: GW / 2, tx: GW / 2, pose: 'idle', pStart: 0, pUntil: 0,
    look: { skin: 0, hair: 0, level: 1 }, body: { m: 0.3, f: 0.2 }, cur: { m: 0.3, f: 0.2 }, mood: 'ok',
    J: { aL1: 10, aL2: 6, aR1: 10, aR2: 6, lL1: 4, lL2: 0, lR1: 4, lR2: 0, dy: 0 },
    blinkAt: 2, blinkUntil: 0, lookX: 0, lookAt: 3, pump: 0, pumpT: 0, t: 0, shadowHW: 8, mouth: 'smile', eyes: 'open', prop: null, fx: null,
  };
  const P = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < GW && y >= 0 && y < GH) grid[y * GW + x] = c; };
  const R = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) P(x + i, y + j, c); };
  const thick = (x0, y0, x1, y1, t, c) => {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let s = 0; s <= steps; s++) {
      const k = s / steps, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k;
      for (let j = 0; j < t; j++) for (let i = 0; i < t; i++) P(x - t / 2 + i, y - t / 2 + j, c);
    }
  };
  const limb = (ax, ay, a1, a2, l1, l2, dir) => {
    const r = Math.PI / 180, ex = ax + dir * Math.sin(a1 * r) * l1, ey = ay + Math.cos(a1 * r) * l1, b = (a1 + a2) * r;
    return { ex, ey, hx: ex + dir * Math.sin(b) * l2, hy: ey + Math.cos(b) * l2 };
  };

  function target(name, t, u) {
    const s = Math.sin;
    const p = { aL1: 10, aL2: 6, aR1: 10, aR2: 6, lL1: 4, lL2: 0, lR1: 4, lR2: 0, dy: 0, mouth: 'smile', eyes: 'open', prop: null, fx: null, pump: 0 };
    switch (name) {
      case 'idle': { const b = s(t * 2); p.aL1 = p.aR1 = 10 + b * 2; p.dy = b > 0.35 ? 1 : 0; break; }
      case 'tired': p.aL1 = p.aR1 = 5; p.aL2 = p.aR2 = 3; p.dy = 1; p.mouth = 'frown'; p.eyes = 'droop'; p.fx = 'sweat'; break;
      case 'walk': { const ph = s(t * 10), L = Math.max(0, ph), Rr = Math.max(0, -ph); p.lL1 = 6 + 8 * L; p.lL2 = -60 * L; p.lR1 = 6 + 8 * Rr; p.lR2 = -60 * Rr; p.aL1 = 10 + 16 * ph; p.aR1 = 10 - 16 * ph; p.dy = Math.abs(ph) > 0.75 ? 0 : 1; break; }
      case 'run': { const ph = s(t * 13), L = Math.max(0, ph), Rr = Math.max(0, -ph); p.lL1 = 8 + 10 * L; p.lL2 = -95 * L; p.lR1 = 8 + 10 * Rr; p.lR2 = -95 * Rr; p.aL1 = 25 + 22 * ph; p.aL2 = -75; p.aR1 = 25 - 22 * ph; p.aR2 = -75; p.dy = Math.abs(ph) > 0.6 ? -1 : 1; p.mouth = 'grin'; p.fx = 'sweat'; break; }
      case 'jump': { const k = clamp(u / 0.9, 0, 1), air = s(Math.PI * k); p.dy = (k < 0.12 || k > 0.9) ? 2 : -Math.round(air * 9); p.aL1 = p.aR1 = lerp(25, 155, air); p.aL2 = p.aR2 = 0; p.lL1 = p.lR1 = 8 + 16 * air; p.lL2 = p.lR2 = -45 * air; p.mouth = 'grin'; break; }
      case 'cheer': { const k = (u * 1.15) % 1, air = s(Math.PI * k); p.dy = -Math.round(air * 8); p.aL1 = p.aR1 = lerp(40, 160, air); p.aL2 = p.aR2 = 0; p.lL1 = p.lR1 = 8 + 12 * air; p.lL2 = p.lR2 = -35 * air; p.mouth = 'grin'; break; }
      case 'flex': p.aL1 = p.aR1 = 92; p.aL2 = p.aR2 = 90; p.lL1 = p.lR1 = 10; p.mouth = 'grin'; p.pump = 1; break;
      case 'wave': p.aR1 = 142; p.aR2 = s(u * 12) * 28; break;
      case 'press': { const w = 0.5 + 0.5 * s(u * 5); p.aL1 = p.aR1 = lerp(72, 165, w); p.aL2 = p.aR2 = lerp(88, 3, w); p.lL1 = p.lR1 = 8; p.dy = Math.round((1 - w) * 2); p.prop = 'dumbbell'; p.mouth = w > 0.6 ? 'grin' : 'flat'; p.pump = 1; p.fx = 'sweat'; break; }
      case 'read': p.aL1 = p.aR1 = 50; p.aL2 = p.aR2 = -133; p.prop = 'book'; p.eyes = 'down'; p.mouth = 'flat'; break;
      case 'drink': p.aR1 = 143; p.aR2 = -240; p.prop = 'cup'; p.eyes = 'closed'; break;
      case 'munch': p.aR1 = 143; p.aR2 = -240; p.prop = 'burger'; p.eyes = 'closed'; p.mouth = s(u * 14) > 0 ? 'open' : 'flat'; break;
      case 'sleep': p.aL1 = p.aR1 = 6; p.dy = 1; p.eyes = 'closed'; p.mouth = 'flat'; p.fx = 'zzz'; break;
    }
    return p;
  }

  function compose(t) {
    grid.fill(null);
    const skin = SKINS[me.look.skin] || SKINS[0], hair = HAIRS[me.look.hair] || HAIRS[0], lv = me.look.level;
    const gear = { band: lv >= 2, shoes: lv >= 3, wrist: lv >= 5, cape: lv >= 7, crown: lv >= 15 };
    const m = clamp(me.cur.m + me.pump * 0.14, 0, 1), f = clamp(me.cur.f, 0, 1);
    const cx = Math.round(me.cx), oy = Math.round(me.J.dy), J = me.J;
    const shHW = Math.round(5 + 3 * m + 1.2 * f), wHW = Math.round(3.6 + 0.9 * m + 4.2 * f);
    const armT = Math.round(2 + 3 * m + f), legT = Math.round(3 + 1.5 * m + 1.5 * f), headHW = f > 0.55 ? 6 : 5;
    const yb = B + oy, hipY = yb + 30, ay = yb + 17;
    me.shadowHW = Math.max(shHW, wHW, legT * 2 + 1) + 3;
    const rowHW = [];
    for (let j = 0; j < 15; j++) {
      const tt = j / 14, sm = tt * tt * (3 - 2 * tt);
      let hw = lerp(shHW, wHW, sm);
      if (j >= 1 && j <= 5) hw += 0.6 * m;
      if (j >= 7) hw += 3.2 * Math.pow(f, 1.2) * Math.sin(Math.PI * clamp((j - 6) / 9, 0, 1));
      rowHW.push(Math.max(3, Math.round(hw)));
    }

    // cape (behind everything)
    if (gear.cape) for (let j = 0; j < 27; j++) {
      const spread = shHW + 2 + j * 0.32, wave = Math.sin(t * 3 + j * 0.3) * j * 0.07;
      R(Math.round(cx - spread + wave), yb + 16 + j, Math.round(2 * spread), 1, (j % 7 < 4) ? COL.capeA : COL.capeB);
    }

    // legs, shorts, shoes
    const legScale = (17 - Math.max(0, oy)) / 17, feet = [];
    for (const dir of [-1, 1]) {
      const a1 = dir < 0 ? J.lL1 : J.lR1, a2 = dir < 0 ? J.lL2 : J.lR2, hx = cx + dir * (legT / 2 + 1);
      const L = limb(hx, hipY, a1, a2, 9 * legScale, 8 * legScale, dir);
      thick(hx, hipY, L.ex, L.ey, legT, skin.limb);
      thick(L.ex, L.ey, L.hx, L.hy, Math.max(2, legT - 1), skin.limb);
      thick(hx, hipY, hx + (L.ex - hx) * 0.78, hipY + (L.ey - hipY) * 0.78, legT + 1, COL.shortsO);
      feet.push({ x: L.hx, y: L.hy, dir });
    }
    for (const ft of feet) {
      const w = legT + 3, x0 = Math.round(ft.x - w / 2 + ft.dir * 0.5), y1 = Math.round(ft.y);
      R(x0, y1 - 1, w, 1, gear.shoes ? COL.shoeO : COL.shoe); R(x0, y1, w, 1, COL.sole);
      if (gear.shoes) P(x0 + (ft.dir < 0 ? 0 : w - 1), y1 - 1, COL.shoeOD);
    }

    // torso
    for (let j = 0; j < 15; j++) R(cx - rowHW[j], yb + 15 + j, 2 * rowHW[j], 1, skin.base);
    if (m > 0.45 && f < 0.5) {
      const hw = rowHW[6];
      R(cx - hw + 1, yb + 21, hw - 2, 1, skin.shade); R(cx + 1, yb + 21, hw - 2, 1, skin.shade);
      for (let j = 2; j <= 6; j++) { P(cx - 1, yb + 15 + j, skin.shade); P(cx, yb + 15 + j, skin.shade); }
      R(cx - rowHW[2] + 1, yb + 17, 2, 1, skin.hi); R(cx + rowHW[2] - 3, yb + 17, 2, 1, skin.hi);
    }
    if (m > 0.6 && f < 0.35) {
      for (const j of [8, 10, 12]) R(cx - rowHW[j] + 2, yb + 15 + j, 2 * rowHW[j] - 4, 1, skin.shade);
      for (let j = 7; j <= 13; j++) { P(cx - 1, yb + 15 + j, skin.shade); P(cx, yb + 15 + j, skin.shade); }
    }
    if (m < 0.2 && f < 0.3) for (const j of [4, 6]) R(cx - rowHW[j] + 2, yb + 15 + j, 2 * rowHW[j] - 4, 1, skin.shade);
    if (f > 0.35) { R(cx - rowHW[12] + 1, yb + 27, 2 * rowHW[12] - 2, 1, skin.shade); P(cx - 1, yb + 25, skin.shade); }
    // shorts band + hip
    R(cx - rowHW[13], yb + 28, 2 * rowHW[13], 1, COL.cream);
    R(cx - rowHW[14], yb + 29, 2 * rowHW[14], 1, COL.shortsD);
    const fhw = Math.max(wHW, legT + 1); R(cx - fhw, yb + 30, 2 * fhw, 2, COL.shortsO);

    // arms
    const hands = [];
    for (const dir of [-1, 1]) {
      const a1 = dir < 0 ? J.aL1 : J.aR1, a2 = dir < 0 ? J.aL2 : J.aR2, ax = cx + dir * (rowHW[1] - armT / 2);
      const A = limb(ax, ay, a1, a2, 6.5, 6.5, dir);
      thick(ax, ay, A.ex, A.ey, armT + (m > 0.6 ? 1 : 0), skin.limb);
      thick(A.ex, A.ey, A.hx, A.hy, Math.max(2, armT - 1), skin.limb);
      R(Math.round(A.hx) - 1, Math.round(A.hy) - 1, 2, 2, skin.base);
      if (m > 0.5) P((ax + A.ex) / 2 - dir * 0.5, (ay + A.ey) / 2 - 1, skin.hi);
      hands.push({ x: A.hx, y: A.hy, dir });
    }

    // neck + head
    const hy0 = yb + 3, nHW = m > 0.6 ? 3 : 2;
    R(cx - nHW, hy0 + 9, 2 * nHW, 4, skin.base);
    R(cx - headHW, hy0, 2 * headHW, 10, skin.base);
    if (f > 0.55) R(cx - headHW + 1, hy0 + 10, 2 * headHW - 2, 1, skin.base);
    R(cx - headHW - 1, hy0 + 4, 1, 2, skin.limb); R(cx + headHW, hy0 + 4, 1, 2, skin.limb);
    P(cx - headHW, hy0 + 9, null); P(cx + headHW - 1, hy0 + 9, null);
    // hair
    R(cx - headHW, hy0 - 1, 2 * headHW, 4, hair.base);
    R(cx - headHW, hy0 + 3, 1, 3, hair.base); R(cx + headHW - 1, hy0 + 3, 1, 3, hair.base);
    for (let i = 0; i < 2 * headHW; i++) if (i % 3 !== 1) P(cx - headHW + i, hy0 + 3, hair.base);
    for (const dx of [-4, -1, 2]) P(cx + dx, hy0 - 2, hair.base);
    P(cx - 2, hy0 - 3, hair.base); P(cx + 1, hy0 - 3, hair.base); P(cx, hy0 - 2, hair.base);
    R(cx - headHW, hy0 - 1, 2 * headHW, 1, hair.shade);
    // face
    const ex = headHW === 6 ? 4 : 3, lx = me.lookX, eyeL = cx - ex + lx, eyeR = cx + ex - 1 + lx;
    let eyes = me.eyes; if (eyes === 'open' && t < me.blinkUntil) eyes = 'closed';
    const eyeY = hy0 + 5;
    if (eyes === 'open') { R(eyeL, eyeY, 1, 2, COL.eye); R(eyeR, eyeY, 1, 2, COL.eye); }
    else if (eyes === 'droop') { R(eyeL, eyeY + 1, 1, 1, COL.eye); R(eyeR, eyeY + 1, 1, 1, COL.eye); }
    else if (eyes === 'down') { R(eyeL, eyeY + 1, 1, 1, COL.eye); R(eyeR, eyeY + 1, 1, 1, COL.eye); }
    else { R(eyeL - 1, eyeY + 1, 3, 1, COL.eye); R(eyeR - 1, eyeY + 1, 3, 1, COL.eye); }
    R(eyeL - 1, hy0 + 4, 3, 1, hair.shade); R(eyeR - 1, hy0 + 4, 3, 1, hair.shade);
    const my = hy0 + 7;
    switch (me.mouth) {
      case 'smile': P(cx - 2, my, COL.mouth); P(cx + 1, my, COL.mouth); R(cx - 1, my + 1, 2, 1, COL.mouth); break;
      case 'grin': R(cx - 2, my, 4, 2, COL.mouth); R(cx - 2, my, 4, 1, COL.teeth); break;
      case 'frown': P(cx - 2, my + 1, COL.mouth); P(cx + 1, my + 1, COL.mouth); R(cx - 1, my, 2, 1, COL.mouth); break;
      case 'open': R(cx - 1, my, 2, 2, COL.mouth); break;
      default: R(cx - 1, my + 1, 2, 1, COL.mouth);
    }
    if (me.fx === 'sweat') P(cx + headHW + 1, hy0 + 3 + ((t * 5) % 6 | 0), COL.sweat);
    // gear on head/hands
    if (gear.band) {
      R(cx - headHW, hy0 + 2, 2 * headHW, 2, COL.band); R(cx - headHW, hy0 + 3, 2 * headHW, 1, COL.bandD);
      const w = Math.round(Math.sin(t * 6)); R(cx + headHW, hy0 + 2, 2, 1, COL.band); P(cx + headHW + 1 + w, hy0 + 3, COL.bandD); P(cx + headHW + w, hy0 + 4, COL.band);
    }
    if (gear.crown) {
      R(cx - 4, hy0 - 4, 8, 2, COL.gold); R(cx - 4, hy0 - 3, 8, 1, COL.goldD);
      for (const dx of [-4, -1, 0, 3]) P(cx + dx, hy0 - 5, COL.gold);
      P(cx - 1, hy0 - 3, COL.capeA); P(cx, hy0 - 3, COL.capeA);
    }
    if (gear.wrist) for (const h of hands) R(Math.round(h.x) - 1, Math.round(h.y) - 2, 3, 1, COL.cream);

    // props
    const rh = hands[1], lh = hands[0];
    if (me.prop === 'dumbbell') for (const h of hands) {
      const x = Math.round(h.x), y = Math.round(h.y);
      R(x - 3, y, 7, 1, COL.bar); R(x - 4, y - 1, 2, 3, COL.plate); R(x + 3, y - 1, 2, 3, COL.plate);
    }
    if (me.prop === 'book') {
      const by = yb + 19;
      R(cx - 5, by, 10, 7, COL.book); R(cx - 4, by + 1, 8, 5, COL.page); R(cx - 1, by + 1, 2, 5, '#d8c7a4');
      for (const dy of [2, 4]) { R(cx - 4 + 1, by + dy, 2, 1, '#b9a887'); R(cx + 1, by + dy, 2, 1, '#b9a887'); }
    }
    if (me.prop === 'cup') { const x = Math.round(rh.x), y = Math.round(rh.y); R(x - 1, y - 4, 3, 4, COL.cup); P(x, y - 5, COL.straw); P(x + 1, y - 6, COL.straw); }
    if (me.prop === 'burger') { const x = Math.round(rh.x), y = Math.round(rh.y); R(x - 2, y - 4, 5, 1, COL.bun); R(x - 2, y - 3, 5, 1, COL.patty); R(x - 2, y - 2, 5, 1, COL.cheese); R(x - 2, y - 1, 5, 1, COL.bun); }
    if (me.fx === 'zzz') {
      const k = (t * 1.3) % 3;
      for (let i = 0; i < 3; i++) {
        const kk = (k + i) % 3, zx = cx + headHW + 2 + i * 2, zy = hy0 - Math.round(kk * 3) - i, sz = 2 + (i > 0 ? 1 : 0);
        R(zx, zy, sz, 1, COL.zz); R(zx, zy + sz - 1, sz, 1, COL.zz); P(zx + sz - 1, zy + (sz > 2 ? 1 : 0), COL.zz);
      }
    }

    // shading pass (light from the left) then outline pass
    const shadeMap = {}; shadeMap[skin.base] = skin.shade; shadeMap[skin.limb] = skin.limbShade; shadeMap[hair.base] = hair.shade;
    shadeMap[COL.shortsO] = COL.shortsD; shadeMap[COL.capeA] = COL.capeB; shadeMap[COL.shoe] = COL.shoeD; shadeMap[COL.shoeO] = COL.shoeOD;
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW - 1; x++) {
      const i = y * GW + x, c = grid[i];
      if (c && shadeMap[c] && grid[i + 1] === null) grid[i] = shadeMap[c];
    }
    const out = [];
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const i = y * GW + x; if (grid[i] !== null) continue;
      if ((x > 0 && grid[i - 1] !== null) || (x < GW - 1 && grid[i + 1] !== null) || (y > 0 && grid[i - GW] !== null) || (y < GH - 1 && grid[i + GW] !== null)) out.push(i);
    }
    for (const i of out) grid[i] = COL.outline;
  }

  function paint() {
    if (!ctx) return;
    const s = me.scale, w = GW * s, h = GH * s;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.clearRect(0, 0, w, h);
    const air = clamp(-me.J.dy, 0, 10), sw = Math.round(me.shadowHW * 2 * (1 - air / 24)), cx = Math.round(me.cx);
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.fillRect((cx - sw / 2) * s, FLOOR * s, sw * s, s);
    ctx.fillRect((cx - sw / 2 + 2) * s, (FLOOR + 1) * s, Math.max(0, sw - 4) * s, s);
    for (let y = 0; y < GH; y++) {
      let x = 0;
      while (x < GW) {
        const c = grid[y * GW + x];
        if (c === null) { x++; continue; }
        let x2 = x + 1; while (x2 < GW && grid[y * GW + x2] === c) x2++;
        ctx.fillStyle = c; ctx.fillRect(x * s, y * s, (x2 - x) * s, s); x = x2;
      }
    }
  }

  me.setLook = (skin, hair, level) => { me.look.skin = skin; me.look.hair = hair; me.look.level = level; };
  me.setBody = (m, f, instant) => { me.body.m = m; me.body.f = f; if (instant) { me.cur.m = m; me.cur.f = f; } };
  me.play = (name, dur) => { me.pose = name; me.pStart = me.t; me.pUntil = me.t + dur; if (name === 'jump' || name === 'cheer') me.pStart = me.t; };
  me.walkTo = gx => { me.tx = clamp(gx, 14, GW - 14); };
  me.poke = () => { const opts = ['wave', 'flex', 'jump']; const n = opts[(Math.random() * opts.length) | 0]; me.play(n, n === 'jump' ? 0.95 : 1.8); return n; };
  me.hit = (gx, gy) => Math.abs(gx - me.cx) <= 11 && gy >= B && gy <= FLOOR;
  me.update = (t, dt) => {
    me.t = t;
    const dx = me.tx - me.cx;
    if (Math.abs(dx) > 0.6) me.cx += Math.sign(dx) * Math.min(Math.abs(dx), dt * 15); else me.cx = me.tx;
    let name;
    if (Math.abs(me.tx - me.cx) > 0.6) name = 'walk';
    else if (t < me.pUntil) name = me.pose;
    else name = me.mood === 'tired' ? 'tired' : 'idle';
    const p = target(name, t, t - me.pStart);
    const k = 1 - Math.exp(-dt * 22);
    for (const key of Object.keys(me.J)) me.J[key] += (p[key] - me.J[key]) * k;
    me.mouth = p.mouth; me.eyes = p.eyes; me.prop = p.prop; me.fx = p.fx;
    me.pump += ((p.pump ? 1 : 0) - me.pump) * (1 - Math.exp(-dt * 6));
    const kb = 1 - Math.exp(-dt * 2.2);
    me.cur.m += (me.body.m - me.cur.m) * kb; me.cur.f += (me.body.f - me.cur.f) * kb;
    if (t > me.blinkAt) { me.blinkUntil = t + 0.14; me.blinkAt = t + 2.4 + Math.random() * 3; }
    if (t > me.lookAt) { me.lookX = name === 'idle' ? ((Math.random() * 3) | 0) - 1 : 0; me.lookAt = t + 2.5 + Math.random() * 3; }
    compose(t); paint();
  };
  me.forcePose = (name, t, u) => { // test hook: snap to a pose
    const p = target(name, t, u == null ? 0.5 : u);
    for (const key of Object.keys(me.J)) me.J[key] = p[key];
    me.mouth = p.mouth; me.eyes = p.eyes; me.prop = p.prop; me.fx = p.fx; me.pump = p.pump; me.t = t;
    compose(t);
  };
  return me;
}
