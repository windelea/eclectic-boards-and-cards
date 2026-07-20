// Table state + localStorage persistence. Everything lives on-device.

const KEY = 'ebc-dice-v1';

export const state = {
  dice: [],           // {id, sides, color, value, locked, x, y}
  settings: { showTotal: true, showSubtotals: true, showHistory: true, tilt: true },
  history: [],        // {t, rolls:[{sides, value}], total} newest first
  presets: {},        // name -> [{sides, color, locked, x, y}]
};

let saveTimer = null;

export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) { /* storage full or unavailable — app still works */ }
  }, 150);
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (Array.isArray(s.dice)) state.dice = s.dice;
    if (Array.isArray(s.history)) state.history = s.history;
    if (s.presets && typeof s.presets === 'object') state.presets = s.presets;
    if (s.settings) Object.assign(state.settings, s.settings);
  } catch (e) { /* corrupt state — start fresh */ }
}

export function addHistory(rolls, total, snap) {
  state.history.unshift({ t: Date.now(), rolls, total, snap });
  if (state.history.length > 50) state.history.length = 50;
  save();
}
