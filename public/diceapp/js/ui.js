// Chrome around the table: dice tray, popovers, sheets, settings, presets, history.

import { state, save } from './state.js';
import { COLORS, STANDARD, dieShapeSVG } from './dice.js';

const $ = (id) => document.getElementById(id);
let actions = null;
let menuDie = null;

export function initUI(a) {
  actions = a;
  buildTray();
  buildSwatches();
  bindPopovers();
  bindSheets();
  bindSettings();
  bindPresets();
  applySettings();
}

/* ---------- tray ---------- */

function buildTray() {
  const tray = $('tray');
  for (const sides of STANDARD) {
    const b = document.createElement('button');
    b.className = 'tray-btn';
    b.innerHTML = `${dieShapeSVG(sides, '#f9f4e2')}<span>d${sides}</span>`;
    b.addEventListener('click', () => actions.addDie(sides));
    tray.appendChild(b);
  }
  const custom = document.createElement('button');
  custom.className = 'tray-btn';
  custom.id = 'customBtn';
  custom.innerHTML = `${dieShapeSVG(7, '#f9f4e2')}<span>d?</span>`;
  custom.addEventListener('click', (e) => {
    e.stopPropagation();
    openDnPopover(custom);
  });
  tray.appendChild(custom);

  // "more dice this way" affordance on whichever edges can still scroll
  const wrap = $('trayWrap');
  const updateScrollHint = () => {
    const max = tray.scrollWidth - tray.clientWidth;
    wrap.classList.toggle('can-left', max > 4 && tray.scrollLeft > 4);
    wrap.classList.toggle('can-right', max > 4 && tray.scrollLeft < max - 4);
  };
  tray.addEventListener('scroll', updateScrollHint, { passive: true });
  window.addEventListener('resize', updateScrollHint);
  requestAnimationFrame(updateScrollHint);
}

function openDnPopover(anchor) {
  hidePopovers();
  const pop = $('dnPopover');
  pop.hidden = false;
  const r = anchor.getBoundingClientRect();
  place(pop, r.left + r.width / 2, r.top - 10, 'above');
  $('dnInput').focus();
}

/* ---------- die long-press menu ---------- */

function buildSwatches() {
  const row = $('swatchRow');
  for (const c of COLORS) {
    const s = document.createElement('button');
    s.className = 'swatch';
    s.style.background = c;
    s.setAttribute('aria-label', `Color ${c}`);
    s.addEventListener('click', () => {
      if (menuDie) actions.recolor(menuDie, c);
      hidePopovers();
    });
    row.appendChild(s);
  }
}

export function showDieMenu(die, el) {
  hidePopovers();
  menuDie = die;
  el.classList.add('showkind'); // reveal the die's type label while the menu is open
  const pop = $('dieMenu');
  pop.hidden = false;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  // open below the type label; if there's no room, open above the die instead
  const below = r.bottom + 24;
  if (below + pop.offsetHeight > window.innerHeight - 8) {
    place(pop, cx, r.top - 10, 'above');
  } else {
    place(pop, cx, below, 'below');
  }
}

function bindPopovers() {
  $('dupBtn').addEventListener('click', () => {
    if (menuDie) actions.duplicate(menuDie);
    hidePopovers();
  });
  $('removeBtn').addEventListener('click', () => {
    if (menuDie) actions.removeDie(menuDie);
    hidePopovers();
  });
  $('dnAddBtn').addEventListener('click', () => {
    const n = parseInt($('dnInput').value, 10);
    if (Number.isInteger(n) && n >= 2 && n <= 999) {
      actions.addDie(n);
      hidePopovers();
    } else {
      $('dnInput').select();
    }
  });
  $('dnInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('dnAddBtn').click();
  });
  // tap anywhere else closes popovers
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.popover') && !e.target.closest('#customBtn')) hidePopovers();
  });
}

export function hidePopovers() {
  $('dieMenu').hidden = true;
  $('dnPopover').hidden = true;
  menuDie = null;
  document.querySelectorAll('.die.showkind').forEach((e) => e.classList.remove('showkind'));
}

// Position a fixed popover horizontally centered on x, above or below y.
function place(pop, x, y, mode) {
  const w = pop.offsetWidth, h = pop.offsetHeight;
  let left = x - w / 2;
  let top = mode === 'above' ? y - h : y;
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
  top = Math.max(8, Math.min(top, window.innerHeight - h - 8));
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}

/* ---------- sheets ---------- */

function openSheet(id) {
  hidePopovers();
  $('backdrop').hidden = false;
  $(id).hidden = false;
}

export function closeSheets() {
  $('backdrop').hidden = true;
  $('settingsSheet').hidden = true;
  $('historySheet').hidden = true;
  $('helpSheet').hidden = true;
  disarmClear();
}

function bindSheets() {
  $('settingsBtn').addEventListener('click', () => { renderPresets(); openSheet('settingsSheet'); });
  $('historyBtn').addEventListener('click', () => { renderHistory(); openSheet('historySheet'); });
  $('helpBtn').addEventListener('click', () => openSheet('helpSheet'));
  $('backdrop').addEventListener('click', closeSheets);
  $('closeSettings').addEventListener('click', closeSheets);
  $('closeHistory').addEventListener('click', closeSheets);
  $('closeHelp').addEventListener('click', closeSheets);
}

/* ---------- settings ---------- */

function bindSettings() {
  const map = { optTotal: 'showTotal', optSubtotals: 'showSubtotals', optHistory: 'showHistory', optTilt: 'tilt' };
  for (const [id, key] of Object.entries(map)) {
    const box = $(id);
    box.checked = state.settings[key];
    box.addEventListener('change', () => {
      state.settings[key] = box.checked;
      save();
      applySettings();
    });
  }

  const clearBtn = $('clearBtn');
  clearBtn.addEventListener('click', () => {
    if (clearBtn.dataset.armed) {
      disarmClear();
      actions.clearTable();
      closeSheets();
    } else {
      clearBtn.dataset.armed = '1';
      clearBtn.textContent = 'Tap again to confirm';
      clearBtn._timer = setTimeout(disarmClear, 2500);
    }
  });
}

function disarmClear() {
  const clearBtn = $('clearBtn');
  clearTimeout(clearBtn._timer);
  delete clearBtn.dataset.armed;
  clearBtn.textContent = 'Clear table';
}

export function applySettings() {
  $('grandTotal').classList.toggle('hidden', !state.settings.showTotal);
  $('historyBtn').classList.toggle('hidden', !state.settings.showHistory);
  actions.settingsChanged();
}

/* ---------- presets ---------- */

function bindPresets() {
  $('presetSaveBtn').addEventListener('click', () => {
    const input = $('presetName');
    let name = input.value.trim();
    if (!name) name = `Setup ${Object.keys(state.presets).length + 1}`;
    state.presets[name] = state.dice.map((d) => ({
      sides: d.sides, color: d.color, locked: d.locked, x: d.x, y: d.y,
    }));
    save();
    input.value = '';
    renderPresets();
  });
}

export function renderPresets() {
  const list = $('presetList');
  list.innerHTML = '';
  const names = Object.keys(state.presets);
  if (!names.length) {
    list.innerHTML = '<li class="empty-note">No presets saved yet.</li>';
    return;
  }
  for (const name of names) {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.className = 'pname';
    label.textContent = `${name} (${state.presets[name].length} dice)`;
    const loadB = document.createElement('button');
    loadB.textContent = 'Load';
    loadB.addEventListener('click', () => { actions.loadPreset(name); closeSheets(); });
    const delB = document.createElement('button');
    delB.textContent = 'Delete';
    delB.className = 'danger';
    delB.addEventListener('click', () => { delete state.presets[name]; save(); renderPresets(); });
    li.append(label, loadB, delB);
    list.appendChild(li);
  }
}

/* ---------- history ---------- */

export function renderHistory() {
  const list = $('historyList');
  list.innerHTML = '';
  if (!state.history.length) {
    list.innerHTML = '<li class="empty-note">No rolls yet.</li>';
    return;
  }
  state.history.forEach((h, i) => {
    const li = document.createElement('li');
    const t = new Date(h.t);
    const hh = String(t.getHours()).padStart(2, '0');
    const mm = String(t.getMinutes()).padStart(2, '0');
    li.innerHTML =
      `<span class="htime">${hh}:${mm}</span>` +
      `<span class="hdice">${h.rolls.map((r) => `d${r.sides}&thinsp;<b>${r.value}</b>`).join(' · ')}</span>` +
      `<span class="htotal">${h.total}</span>`;
    // the three most recent rolls can restore the table to that exact moment
    if (i < 3 && h.snap) {
      const b = document.createElement('button');
      b.className = 'restore-btn';
      b.textContent = 'Restore';
      b.addEventListener('click', () => {
        if (b.dataset.armed) {
          actions.restoreSnapshot(h.snap);
          closeSheets();
        } else {
          b.dataset.armed = '1';
          b.textContent = 'Sure?';
          b.classList.add('danger');
          setTimeout(() => {
            delete b.dataset.armed;
            b.textContent = 'Restore';
            b.classList.remove('danger');
          }, 2500);
        }
      });
      li.appendChild(b);
    }
    list.appendChild(li);
  });
}
