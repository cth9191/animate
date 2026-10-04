// =====================================================================
//  SCENES — pixel demo. Each scene draws inside lowres(ERA_RES[e], ...) in low-res PIXELS; TT on 2s.
//  Era 1: 90x160, 4 handheld greens, 12 px per pixel.  Era 2: 180x320, 16 colours, 6 px per pixel.
// =====================================================================
const [H0, H1, H2, H3] = HANDHELD;
const Q = PAL16;
const beatN = () => Math.floor(TT / BEAT + 1e-6);
const pingpong = (v, n) => { const m = mod(v, 2 * n); return m < n ? m : 2 * n - m; };

// ---- era 1 sprites and props
const BEETLE = [
  ['..aa..', '.abba.', 'abbbba', 'a.a.a.'],
  ['..aa..', '.abba.', 'abbbba', '.a.a.a'],
];
const TUFT = [['a..a', '.aa.'], ['.a.a', 'aa..']];
function pine(x, base, h, w, k) {
  const sway = (beatN() + k) % 2;   // the tip leans one pixel on alternate beats
  prect(x - 1, base - Math.round(h * 0.22), 2, Math.round(h * 0.22) + 1, H0);
  for (let t = 0; t < 3; t++) {
    const top = base - h + Math.round(t * h * 0.24), bot = top + Math.round(h * 0.42), hw = w * (0.42 + 0.29 * t), tip = t === 0 ? sway : 0;
    ppoly([[x + 0.5 + tip, top], [x + 0.5 + hw, bot], [x + 0.5 - hw, bot]], H0);
    pline(x + tip, top, Math.round(x + hw - 0.5), bot - 1, H1);   // moonlit edge keeps the silhouette readable on a dark sky
  }
}

function sceneDusk() {
  const GY = 104, cu = TIMELINE.cues;
  lowres(ERA_RES[0], () => {
    // sky: dithered dusk, darkest at the top, a pale glow at the horizon
    pgrad(0, 0, 90, GY, [H0, H0, H1, H2], { ease: (u) => u * u });
    // stars: blink on the boil
    for (let i = 0; i < 18; i++) {
      const R = RNG('st1', i), x = R.i(2, 87), y = R.i(3, 70);
      if (Math.hypot(x - 62, y - 40) < 14 || (B + i * 5) % 13 === 0) continue;
      if (i % 5 === 0 && (B + i) % 6 < 3) sprite(SPR.twinkle, { a: H2, b: H3 }, x - 1, y - 1);
      else pset(x, y, i % 3 ? H2 : H3);
    }
    // the moon (the bridge object): a halo, craters, a dithered shadow side
    pglow(62, 40, 9, 15, H1, 0.6);
    pcircle(62, 40, 8, H3);
    pdither(54, 32, 17, 17, null, H2, (i, j) => ((i - 62) ** 2 + (j - 40) ** 2 <= 72 && i - 62 > 3 ? 0.55 : 0));
    prect(58, 36, 2, 2, H2); prect(64, 43, 2, 1, H2); prect(65, 36, 1, 1, H2); prect(60, 44, 1, 1, H2);
    // far hills, then pines
    const hill = [[-1, GY + 1]];
    for (let x = 0; x <= 90; x += 3) hill.push([x, GY - 9 + 4 * Math.sin(x * 0.09) + 3 * Math.sin(x * 0.23 + 1)]);
    hill.push([91, GY + 1]);
    ppoly(hill, H1);
    pine(5, GY, 62, 9, 0); pine(16, GY, 40, 7, 1); pine(77, GY, 46, 8, 1); pine(87, GY, 68, 10, 0); pine(49, GY, 22, 5, 0);
    // ground: a bright grass edge, tufts that flip on the beat, pebbles, darker towards the bottom
    pgrad(0, GY, 90, 160 - GY, [H1, H1, H0]);
    prect(0, GY, 90, 1, H2);
    for (let x = 2; x < 90; x += 9) sprite(TUFT[(beatN() + x) % 2], { a: H2 }, x, GY - 2);
    for (let i = 0; i < 10; i++) { const R = RNG('peb', i); prect(R.i(2, 86), R.i(GY + 6, 150), R.i(1, 2), 1, H2); }
    // fireflies: whole-pixel wander, blinking
    for (let i = 0; i < 8; i++) {
      const R = RNG('ff', i), bx = R.i(6, 84), by = R.i(62, 100);
      const x = bx + Math.round(3 * Math.sin(TT * 1.3 + i * 2)), y = by + Math.round(2 * Math.sin(TT * 1.9 + i));
      if ((B + i * 3) % 8 >= 5) continue;
      if ((B + i) % 8 < 2) sprite(SPR.twinkle, { a: H2, b: H3 }, x - 1, y - 1); else pset(x, y, H3);
    }
    // a beetle walks in from the right, one pixel per boil, legs flipping
    const bxp = 92 - Math.floor(TT * 10 + 1e-6);
    sprite(BEETLE[Math.floor(TT * 12 + 1e-6) % 2], { a: H0, b: H2 }, bxp, GY - 4, { flip: true });
    // the hero: watches the beetle, spots the moon ('!'), hops on the beat, stays amazed
    const hop = Math.round(4 * Math.sin(Math.PI * seg(TT, cu.hop, cu.hop + 1 / 3)));
    prect(23, GY, 15, 1, H0);
    const hh = pixHero(30, GY - 9, 7, { pal: HERO_HH, look: TT < cu.spot ? [1, 1] : [1, -1], hop, mood: TT >= cu.hop ? 'wow' : 'smile', key: 'hero' });
    if (TT >= cu.spot && TT < cu.spot + 0.75) pixBubble('!', 30, hh.top - 1, { bg: H3, edge: H0, fg: H0 });
    pixTag('LV1', { fg: H3, bg: H0, edge: H2 });
    pixCaption('MOON IS UP', { fg: H3, bg: H0, edge: H2, y: 1380 });
  }, { fx: { pal: HANDHELD } });
}

// ---- era 2 sprites and props
const SLIME = [
  ['..aaaa..', '.acbbba.', 'abwkbwka', 'abbbbbba', 'abbbbbba', '.aaaaaa.'],
  ['........', '..aaaa..', '.acbbba.', 'abwkbwka', 'abbbbbba', 'aaaaaaaa'],
];
const SCOIN = [
  ['.aaa.', 'awyya', 'awyya', 'awyya', 'awyya', 'awyya', '.aaa.'],
  ['.a.', 'awa', 'aya', 'aya', 'aya', 'aya', '.a.'],
  ['a', 'a', 'a', 'a', 'a', 'a', 'a'],
];
const STAR7 = ['...a...', '...a...', 'aaaaaaa', '.aaaaa.', '..aaa..', '.aa.aa.', 'a.....a'];
const coinFrame = (k = 0) => SCOIN[[0, 1, 2, 1][(Math.floor(TT * 6 + 1e-6) + k) % 4]];
function cloud(x, y, k) {
  for (const [dx, dy, r] of [[0, 0, 5], [6, -3, 6], [13, 0, 5], [6, 2, 5]]) pcircle(x + dx, y + dy, r, Q.slate);
  prect(x - 2, y - 7, 7, 1, Q.grey); prect(x + 4, y - 9, 6, 1, Q.grey);
  prect(x - 5, y + 4, 24, 3, Q.slate);
}
function bricks(x, y, w, h) {   // brown bricks with ink mortar and a lit top-left corner
  prect(x, y, w, h, Q.brown);
  for (let r = 0, yy = y; yy < y + h; r++, yy += 6) {
    prect(x, yy + 5, w, 1, Q.ink);
    for (let xx = x - (r % 2 ? 6 : 0); xx < x + w; xx += 12) {
      if (xx >= x) prect(xx, yy, 1, 5, Q.ink);
      if (xx + 1 >= x && xx + 4 <= x + w) prect(xx + 1, yy, 3, 1, Q.orange);
    }
  }
}

function sceneArcade() {
  const GY = 216, cu = TIMELINE.cues;
  lowres(ERA_RES[1], () => {
    pgrad(0, 0, 180, GY, [Q.ink, Q.ink, Q.night, Q.purple], { ease: (u) => u ** 1.4 });
    for (let i = 0; i < 40; i++) {
      const R = RNG('st2', i), x = R.i(2, 177), y = R.i(4, 150);
      if (Math.hypot(x - 125, y - 81) < 28 || (B + i * 7) % 11 === 0) continue;
      if (i % 6 === 0 && (B + i) % 6 < 3) sprite(SPR.twinkle, { a: Q.sky, b: Q.white }, x - 1, y - 1);
      else pset(x, y, i % 4 ? Q.grey : Q.white);
    }
    // clouds drift left a pixel every other boil
    [[20, 120, 0], [110, 40, 1], [160, 140, 2]].forEach(([bx, y, k]) => cloud(mod(bx - Math.floor(TT * 6 + 1e-6), 230) - 30, y, k));
    // the big coin (the bridge's counterpart): face-on through the morph, then spins on 8ths
    pglow(125, 81, 19, 27, Q.purple, 0.7);
    const spin = TT < 3.6 ? 0 : Math.floor((TT - 3.6) / E8 + 1e-6) % 6, rx = Math.round(18 * [1, 0.72, 0.36, 0.06, 0.36, 0.72][spin]);
    if (rx <= 2) { prect(123, 63, 5, 37, Q.orange); prect(125, 64, 1, 35, Q.yellow); }
    else {
      pellipse(125, 81, rx, 18, Q.orange);
      pellipse(125, 81, rx - 2, 16, Q.yellow);
      if (rx >= 10) sprite(STAR7, { a: Q.orange }, 122, 78);
      if (rx >= 6) { prect(125 - rx + 3, 72, 2, 14, Q.white); prect(125 - rx + 4, 68, 1, 3, Q.white); }
    }
    for (let k = 0; k < 4; k++) {   // sparkles around it, on alternate 8ths
      const [sx, sy] = [[97, 76], [153, 72], [104, 106], [149, 101]][k];
      if ((Math.floor(TT / E8 + 1e-6) + k) % 4 < 2) sprite(SPR.spark, { a: Q.white, b: Q.yellow }, sx - 2, sy - 2);
    }
    // a city on the horizon, its windows changing on the beat
    for (let k = 0; k < 10; k++) {
      const R = RNG('bld', k), bx = k * 19 + R.i(-3, 3), bw = R.i(13, 18), bh = R.i(26, 58);
      prect(bx, GY - bh, bw, bh, Q.night); prect(bx, GY - bh, bw, 1, Q.slate);
      for (let j = 0; j * 5 + 4 < bh - 2; j++) for (let i = 0; i * 4 + 3 < bw - 1; i++) {
        const lit = RNG('win', k, i, j, beatN()).f() < 0.3;
        prect(bx + 2 + i * 4, GY - bh + 3 + j * 5, 2, 2, lit ? Q.yellow : Q.ink);
      }
    }
    // ground: grass, bricks; a floating platform with a patrolling slime and three coins
    bricks(0, GY + 4, 180, 104); prect(0, GY, 180, 3, Q.lime); prect(0, GY + 3, 180, 1, Q.green);
    bricks(100, 168, 48, 6); prect(100, 167, 48, 1, Q.lime);
    for (let k = 0; k < 3; k++) sprite(coinFrame(k), { a: Q.orange, y: Q.yellow, w: Q.white }, 112 + k * 12, 156, { anchor: 'c' });
    const sp = Math.floor(TT * 12 + 1e-6), sxp = 102 + pingpong(sp, 36), dir = mod(sp, 72) < 36;
    sprite(SLIME[Math.floor(sp / 3) % 2], { a: Q.ink, b: Q.green, c: Q.lime, w: Q.white, k: Q.ink }, sxp + 4, 167, { anchor: 'bc', flip: !dir });
    // the hero: looks up, jumps for a coin, walks over, jumps for another
    const jump = (t0) => { const u = seg(TT, t0, t0 + 0.5); return u > 0 && u < 1 ? Math.round(52 * 4 * u * (1 - u)) : 0; };
    const hop = jump(cu.jump1) + jump(cu.jump2), walking = TT >= cu.walk && TT < cu.walk + 0.5;
    const hx = 50 + Math.round(30 * EZ.io(seg(TT, cu.walk, cu.walk + 0.5)));
    [[50, cu.jump1 + 0.25], [80, cu.jump2 + 0.25]].forEach(([cx, tc]) => {
      if (TT < tc) { sprite(coinFrame(cx), { a: Q.orange, y: Q.yellow, w: Q.white }, cx, 150, { anchor: 'c' }); return; }
      const a = TT - tc; if (a > 0.6) return;
      pixText('+100', cx, 136 - Math.floor(a * 30), Q.white, { align: 'center', shadow: Q.ink });
      const rr = 4 + Math.floor(a * 40); if (a < 0.25) for (let k = 0; k < 4; k++) sprite(SPR.twinkle, { a: Q.yellow, b: Q.white }, cx - 1 + Math.round(Math.cos(k * TAU / 4 + 0.8) * rr), 149 + Math.round(Math.sin(k * TAU / 4 + 0.8) * rr));
    });
    prect(hx - 9 + Math.floor(hop / 8), GY, 19 - Math.floor(hop / 4), 1, Q.green);   // shadow shrinks as it rises
    const happy = (TT >= cu.jump1 + 0.25 && TT < cu.walk) || TT >= cu.jump2 + 0.25;
    pixHero(hx, GY - 15, 13, {
      key: 'hero', hop, frame: walking ? Math.floor(TT * 8 + 1e-6) % 2 : undefined,
      look: walking ? [1, 0] : TT < cu.jump1 ? [1, -1] : [0, -1], mood: hop > 0 ? 'wow' : happy ? 'happy' : 'smile',
    });
    // HUD and caption
    const score = 1200 + 100 * ((TT >= cu.jump1 + 0.25) + (TT >= cu.jump2 + 0.25));
    pixOverlay(() => {
      pixText('SCORE ' + String(score).padStart(6, '0'), 154, 51, Q.white, { align: 'right', shadow: Q.ink });
      sprite(SCOIN[0], { a: Q.orange, y: Q.yellow, w: Q.white }, 83, 61);
      pixText('X' + String(2 + (score - 1200) / 100).padStart(2, '0'), 90, 61, Q.yellow, { shadow: Q.ink });
    });
    pixTag('LV2');
    pixCaption('NOW GRAB THE COINS');
  }, { fx: { pal: PAL16 } });
}
