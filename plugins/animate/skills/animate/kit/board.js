
// =====================================================================
//  kit/board.js — the storyboard: every beat in TIMELINE.board drawn as a 9:16 key frame with its notes.
//  The panels ARE the piece: each one is renderFrame(t) at the beat's key time, so an approved board
//  carries straight into the video.  TIMELINE.board = [{ t, title, sound, next }]
//  Render: node tools/storyboard.mjs <piece dir> [out.png] [panel numbers...]
// =====================================================================
function drawPanel(k) { renderFrame(TIMELINE.board[k].t, ctx.canvas); }
function renderBoard() {
  const BD = TIMELINE.board || [], COLS = 5, PW = 360, PH = Math.round(PW * H / W), GAP = 30, NOTE = 130, HEAD = 150;
  const rows = Math.ceil(BD.length / COLS), bc = document.createElement('canvas');
  bc.width = GAP + COLS * (PW + GAP); bc.height = HEAD + rows * (PH + NOTE + GAP);
  const g = bc.getContext('2d'), SANS = '"Segoe UI", Arial, sans-serif';
  g.fillStyle = '#2a211b'; g.fillRect(0, 0, bc.width, bc.height);
  g.fillStyle = '#efe5cf'; g.font = `400 60px ${HAND}`; g.fillText(`${document.title}: storyboard`, GAP, 80);
  g.font = `600 22px ${SANS}`; g.fillStyle = '#d9c9a8';
  g.fillText(`${TIMELINE.duration}s · ${W}×${H} · ${TIMELINE.bpm} BPM · ${BD.length} beats. Thumbs up or down by panel number.`, GAP, 122);
  const wrap = (str, x, y, maxW, lh) => { let line = ''; for (const w of str.split(' ')) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); y += lh; line = w; } else line = t; } if (line) g.fillText(line, x, y); return y + lh; };
  const pc = document.createElement('canvas'); pc.width = W; pc.height = H;
  BD.forEach((b, k) => {
    renderFrame(b.t, pc);
    const x = GAP + (k % COLS) * (PW + GAP), y = HEAD + Math.floor(k / COLS) * (PH + NOTE + GAP);
    g.drawImage(pc, x, y, PW, PH);
    g.fillStyle = '#f0b27c'; g.font = `700 26px ${SANS}`; g.fillText(`${k + 1}`, x, y + PH + 32);
    g.fillStyle = '#efe5cf'; g.font = `600 20px ${SANS}`;
    let ttl = `${b.t.toFixed(1)}s · ${b.title || ''}`; while (ttl.length > 4 && g.measureText(ttl).width > PW - 44) ttl = ttl.slice(0, -2) + '…';   // fits the panel
    g.fillText(ttl, x + 40, y + PH + 30);
    g.font = `400 18px ${SANS}`; g.fillStyle = '#cdbd9c';
    const yy = b.sound ? wrap('sound: ' + b.sound, x, y + PH + 58, PW, 22) : y + PH + 58;
    if (b.next) { g.fillStyle = '#a8977a'; wrap('→ ' + b.next, x, yy + 2, PW, 22); }
  });
  return bc;
}
window.renderBoard = renderBoard; window.drawPanel = drawPanel;
