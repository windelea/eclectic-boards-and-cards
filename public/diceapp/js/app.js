// EBC Dice — wiring: table rendering, rolls, clustering, persistence.

import { state, save, load, addHistory } from './state.js';
import { DIE_SIZE, createDie, rollValue, dieShapeSVG, textColorFor } from './dice.js';
import { makeInteractive } from './interactions.js';
import { computeClusters, chipAnchor } from './clusters.js';
import { initUI, showDieMenu } from './ui.js';

const table = document.getElementById('table');
const grandTotal = document.getElementById('grandTotal');
const emptyHint = document.getElementById('emptyHint');
const rollBtn = document.getElementById('rollBtn');

const els = new Map(); // die.id -> element

// iOS Safari ignores user-scalable=no and doesn't reliably honor touch-action
// for the double-tap-zoom gesture, so double-tapping a die to lock it zooms the
// page. Swallow the second tap of a rapid pair on both touchstart and touchend
// (touchend alone wasn't enough), at document level in the capture phase so a
// tap that lands between elements is still caught. The dock and any open sheet
// are exempt so ROLL keeps its normal fast repeat taps.
//
// dbg counts what actually happened on-device, surfaced in Settings: if seen>0
// but blocked==0 the timing window is wrong; if blocked>0 and it still zooms,
// preventDefault isn't stopping WebKit; noncancelable>0 means preventDefault is
// a silent no-op on this event.
const dbg = { pd: 0, ts: 0, seen: 0, blocked: 0, noncancelable: 0, lastGap: -1 };
window.__diceZoomDbg = dbg; // readable from Safari Web Inspector on-device
let lastTapAt = 0;

// Count what actually reaches the document so a silent gap is visible rather
// than inferred: pointerdown vs touchstart vs touchend. pd>0 with ts==0 means
// something upstream is canceling pointerdown and killing the touch stream.
document.addEventListener('pointerdown', () => { dbg.pd++; paintDbg(); }, { passive: true, capture: true });
document.addEventListener('touchstart', () => { dbg.ts++; }, { passive: true, capture: true });

function paintDbg() {
  const line = document.getElementById('zoomDebug');
  if (!line) return;
  const scale = window.visualViewport ? window.visualViewport.scale.toFixed(2) : '?';
  line.textContent = `pd ${dbg.pd} · ts ${dbg.ts} · te ${dbg.seen} · blk ${dbg.blocked} · nc ${dbg.noncancelable} · zoom ${scale}`;
}
window.visualViewport?.addEventListener('resize', paintDbg);

function guardDoubleTapZoom(e) {
  if (e.touches && e.touches.length > 1) return; // leave pinch-zoom alone
  const t = e.target;
  if (t instanceof Element && t.closest('#dock, .sheet, .popover')) return;

  if (e.type === 'touchend') {
    dbg.seen++;
    const now = Date.now();
    dbg.lastGap = now - lastTapAt;
    if (now - lastTapAt < 350) {
      if (!e.cancelable) dbg.noncancelable++;
      else { e.preventDefault(); dbg.blocked++; }
    }
    lastTapAt = now;
  } else if (Date.now() - lastTapAt < 350) {
    // second tap of a pair: kill the gesture before WebKit recognizes it
    if (!e.cancelable) dbg.noncancelable++;
    else { e.preventDefault(); dbg.blocked++; }
  }
  paintDbg();
}

document.addEventListener('touchstart', guardDoubleTapZoom, { passive: false, capture: true });
document.addEventListener('touchend', guardDoubleTapZoom, { passive: false, capture: true });

/* ---------- geometry ---------- */

function clampPos(x, y) {
  const w = table.clientWidth, h = table.clientHeight;
  return {
    x: Math.max(4, Math.min(x, w - DIE_SIZE - 4)),
    y: Math.max(4, Math.min(y, h - DIE_SIZE - 16)),
  };
}

function dropSpot() {
  const w = table.clientWidth, h = table.clientHeight;
  const x = w / 2 - DIE_SIZE / 2 + (Math.random() - 0.5) * w * 0.5;
  const y = h / 2 - DIE_SIZE / 2 + (Math.random() - 0.5) * h * 0.4;
  return clampPos(x, y);
}

/* ---------- die DOM ---------- */

function setFace(die, value) {
  const el = els.get(die.id);
  const span = el.querySelector('.value');
  span.textContent = value;
  span.classList.toggle('long', String(value).length > 2);
  span.style.color = textColorFor(die.color);
}

const restingTilt = () =>
  state.settings.tilt ? `${(Math.random() * 16 - 8).toFixed(1)}deg` : '0deg';

function applyTilts() {
  for (const d of state.dice) {
    els.get(d.id)?.style.setProperty('--rot', restingTilt());
  }
}

function renderDie(die) {
  const el = document.createElement('div');
  el.className = `die d${die.sides}${die.locked ? ' locked' : ''}`;
  el.style.setProperty('--rot', restingTilt());
  el.innerHTML =
    dieShapeSVG(die.sides, die.color) +
    `<span class="value"></span>` +
    `<span class="kind">d${die.sides}</span>` +
    `<span class="lock">&#128274;</span>`;
  el.style.left = `${die.x}px`;
  el.style.top = `${die.y}px`;
  table.appendChild(el);
  els.set(die.id, el);
  setFace(die, die.value);

  makeInteractive(el, die, {
    onTap: (d) => { if (!d.locked) doRoll([d]); },
    onDoubleTap: (d) => {
      d.locked = !d.locked;
      els.get(d.id).classList.toggle('locked', d.locked);
      save();
    },
    onLongPress: (d, dieEl) => showDieMenu(d, dieEl),
    onMove: (d, x, y) => {
      const p = clampPos(x, y);
      d.x = p.x; d.y = p.y;
      const de = els.get(d.id);
      de.style.left = `${p.x}px`;
      de.style.top = `${p.y}px`;
      scheduleChips();
    },
    onMoveEnd: () => { save(); refreshTotals(); },
  });
}

function removeDieEl(die) {
  els.get(die.id)?.remove();
  els.delete(die.id);
}

/* ---------- rolling ---------- */

let rolling = false;

function doRoll(diceToRoll) {
  if (rolling || !diceToRoll.length) return;
  rolling = true;
  for (const d of diceToRoll) els.get(d.id).classList.add('rolling');
  const cosmetic = setInterval(() => {
    for (const d of diceToRoll) setFace(d, rollValue(d.sides));
  }, 60);
  setTimeout(() => {
    clearInterval(cosmetic);
    let total = 0;
    const rolls = [];
    for (const d of diceToRoll) {
      d.value = rollValue(d.sides);
      total += d.value;
      rolls.push({ sides: d.sides, value: d.value });
      setFace(d, d.value);
      const el = els.get(d.id);
      el.classList.remove('rolling');
      el.style.setProperty('--rot', restingTilt());
    }
    // snapshot the whole table so this roll can be restored from history
    const snap = state.dice.map((d) => ({
      sides: d.sides, color: d.color, locked: d.locked, x: d.x, y: d.y, value: d.value,
    }));
    addHistory(rolls, total, snap);
    save();
    refreshTotals();
    rolling = false;
  }, 450);
}

/* ---------- totals + clusters ---------- */

let chipRaf = 0;
function scheduleChips() {
  if (chipRaf) return;
  chipRaf = requestAnimationFrame(() => { chipRaf = 0; drawChips(); });
}

function drawChips() {
  table.querySelectorAll('.cluster-chip').forEach((c) => c.remove());
  if (!state.settings.showSubtotals || state.dice.length < 2) return;
  for (const cluster of computeClusters(state.dice)) {
    if (cluster.length < 2) continue;
    const sum = cluster.reduce((s, d) => s + d.value, 0);
    const a = chipAnchor(cluster);
    const chip = document.createElement('div');
    chip.className = 'cluster-chip';
    chip.textContent = sum;
    chip.style.left = `${Math.max(20, Math.min(a.x, table.clientWidth - 20))}px`;
    chip.style.top = `${Math.max(22, a.y)}px`;
    table.appendChild(chip);
  }
}

function refreshTotals() {
  grandTotal.textContent = state.dice.reduce((s, d) => s + d.value, 0);
  emptyHint.style.display = state.dice.length ? 'none' : 'flex';
  drawChips();
}

/* ---------- actions (shared with ui.js) ---------- */

function addDie(sides) {
  const p = dropSpot();
  const die = createDie(sides, '#f9f4e2', p.x, p.y);
  state.dice.push(die);
  renderDie(die);
  save();
  refreshTotals();
}

function removeDie(die) {
  state.dice = state.dice.filter((d) => d.id !== die.id);
  removeDieEl(die);
  save();
  refreshTotals();
}

function duplicate(die) {
  const p = clampPos(die.x + 24, die.y + 24);
  const copy = createDie(die.sides, die.color, p.x, p.y);
  state.dice.push(copy);
  renderDie(copy);
  save();
  refreshTotals();
}

function recolor(die, color) {
  die.color = color;
  const el = els.get(die.id);
  el.querySelector('svg').outerHTML = dieShapeSVG(die.sides, color);
  setFace(die, die.value);
  save();
}

function clearTable() {
  for (const d of state.dice) removeDieEl(d);
  state.dice = [];
  save();
  refreshTotals();
}

function restoreSnapshot(snap) {
  clearTable();
  for (const s of snap) {
    const p = clampPos(s.x, s.y);
    const die = createDie(s.sides, s.color, p.x, p.y);
    die.value = s.value;
    die.locked = !!s.locked;
    state.dice.push(die);
    renderDie(die);
  }
  save();
  refreshTotals();
}

function loadPreset(name) {
  const specs = state.presets[name];
  if (!specs) return;
  clearTable();
  for (const s of specs) {
    const p = clampPos(s.x, s.y);
    const die = createDie(s.sides, s.color, p.x, p.y);
    die.locked = !!s.locked;
    state.dice.push(die);
    renderDie(die);
  }
  save();
  refreshTotals();
}

/* ---------- boot ---------- */

load();
initUI({
  addDie, removeDie, duplicate, recolor, clearTable, loadPreset, restoreSnapshot,
  settingsChanged: () => { applyTilts(); refreshTotals(); },
});

rollBtn.addEventListener('click', () => doRoll(state.dice.filter((d) => !d.locked)));

window.addEventListener('resize', () => {
  for (const d of state.dice) {
    const p = clampPos(d.x, d.y);
    d.x = p.x; d.y = p.y;
    const el = els.get(d.id);
    el.style.left = `${p.x}px`;
    el.style.top = `${p.y}px`;
  }
  refreshTotals();
});

// restore saved table once layout has real dimensions
requestAnimationFrame(() => {
  for (const d of state.dice) {
    const p = clampPos(d.x, d.y);
    d.x = p.x; d.y = p.y;
    renderDie(d);
  }
  refreshTotals();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'VERSION') {
      const el = document.getElementById('appVersion');
      if (el) el.textContent = `Version: ${e.data.version}`;
    }
  });
  navigator.serviceWorker.ready.then((reg) => {
    reg.active?.postMessage('GET_VERSION');
  });
}
