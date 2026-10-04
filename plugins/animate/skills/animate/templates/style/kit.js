// =====================================================================
//  styles/<name>/kit.js — a blank style to start a new look from (new-style.md), when no shipped kit is close.
//  Built on kit/core.js (RNG, EZ, geometry, wobble, trace, cameras, TT / ev / popS / DEFER / E0 / SPARK_AT).
//  Replace the look of every function below; keep the names the piece calls and the STYLE contract at the end.
//  Never redeclare a core name (styles/README.md -> Names a kit must not reuse): prefix your own helpers (`nx...`).
//  Needs from the piece head: HAND (a font stack), CX (caption centre x).
// =====================================================================
const NX = { ground: '#101014', ink: '#f0eee6', accent: '#d97757', paper: '#1a1a1f' };   // the measured palette

// a filled shape in the medium: outline points P (world coords), fill colour c
function nxShape(P, c, o = {}) {
  ctx.save(); trace(o.raw ? P : wobble(P, true, o.amt ?? 0, o.key ?? 'nx', 9), true);
  ctx.fillStyle = c; ctx.fill();
  if (o.line !== false) { ctx.lineWidth = o.w ?? 4; ctx.strokeStyle = o.line || NX.ink; ctx.lineJoin = 'round'; ctx.stroke(); }
  ctx.restore();
}
function nxText(str, x, y, size, color, o = {}) {   // write-on with o.frac (0..1)
  ctx.save(); ctx.font = `${o.weight ?? 600} ${size}px ${o.font ?? HAND}`; ctx.fillStyle = color; ctx.textAlign = o.align ?? 'left';
  const w = ctx.measureText(str).width, frac = clamp(o.frac ?? 1);
  if (frac < 1) { ctx.beginPath(); ctx.rect(x - (o.align === 'center' ? w / 2 : 0) - 4, y - size * 1.2, w * frac + 4, size * 1.7); ctx.clip(); }
  if (frac > 0) ctx.fillText(str, x, y);
  ctx.restore(); return w;
}

// the hero: one shape, one reserved colour, two eyes that blink, an idle bob. Sets SPARK_AT for the anchor check.
function nxHero(x, y, r, o = {}) {
  const key = o.key ?? 'hero';
  y += Math.sin(TT * TAU * 0.9 + key.length) * r * 0.04;
  SPARK_AT = toScreen(x, y);
  nxShape(ellipsePts(x, y, r, r, 0, 48), NX.accent, { key, line: NX.ink, w: Math.max(3, r * 0.06) });
  const blink = (B + key.length * 7) % 41 < 2;
  for (const s of [-1, 1]) { ctx.fillStyle = NX.ground; ctx.beginPath(); ctx.ellipse(x + s * r * 0.3, y - r * 0.05, r * 0.08, blink ? r * 0.015 : r * 0.11, 0, 0, TAU); ctx.fill(); }
}

// captions: drawn after the camera, at screen size (DEFER). Shots under ~1s should not call them (they appear late).
const nxTag = (str) => { const f = () => nxText(str, 70, 330, 64, NX.ink, { frac: ev(E0 + 0.15, 0.3) }); if (DEFER) DEFER.push(f); else f(); };
const nxCaption = (str) => { const f = () => nxText(str, CX, 1440, 52, NX.ink, { align: 'center', frac: ev(E0 + 0.4, 0.5) }); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (styles/README.md has the contract). Make every one look like the medium.
// =====================================================================
const STYLE = {
  name: 'blank',
  paper: NX.paper,                                                      // the sheet a morph happens on (6-digit hex)
  backdrop(c) { fillAll(c); },                                          // the frame filled with c
  window(P, key, src) {                                                 // the world seen through outline P
    ctx.save(); trace(P, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    ctx.save(); trace(P, true); ctx.lineWidth = 5; ctx.strokeStyle = NX.ink; ctx.stroke(); ctx.restore();
  },
  blob(P, c, key) { nxShape(P, c, { key, raw: true }); },              // the morphing shape
  hero(x, y, r, o) { nxHero(x, y, r * 0.6, o); },                       // r = half the hero's size
  heroColor: NX.accent,
  post() {},                                                            // grain, a print pass, an upscale ...
  ones: false,                                                          // true = motion on 1s
};
