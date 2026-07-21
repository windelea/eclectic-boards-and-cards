// Pointer gesture handling for a die element:
//   drag = move, tap = reroll, double-tap = lock, long-press = menu.

const DRAG_PX = 8;
const DOUBLE_MS = 300;
const LONGPRESS_MS = 500;

export function makeInteractive(el, die, handlers) {
  let startX = 0, startY = 0, origX = 0, origY = 0;
  let active = false, dragging = false, longPressed = false;
  let pressTimer = null, tapTimer = null, lastTap = 0;

  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // NB: no preventDefault here. WebKit synthesizes pointer events from the
    // touch stream, so canceling pointerdown suppresses touchstart/touchend for
    // the whole sequence — which silently disabled the double-tap-zoom guard in
    // app.js. Scrolling and selection are already handled by touch-action: none
    // and -webkit-user-select: none on .die.
    if (e.pointerType === 'mouse') e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    active = true; dragging = false; longPressed = false;
    startX = e.clientX; startY = e.clientY;
    origX = die.x; origY = die.y;
    pressTimer = setTimeout(() => {
      longPressed = true;
      handlers.onLongPress(die, el, e.clientX, e.clientY);
    }, LONGPRESS_MS);
  });

  el.addEventListener('pointermove', (e) => {
    if (!active || longPressed) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (!dragging && Math.hypot(dx, dy) > DRAG_PX) {
      dragging = true;
      clearTimeout(pressTimer);
      el.classList.add('dragging');
    }
    if (dragging) handlers.onMove(die, origX + dx, origY + dy);
  });

  const finish = (e) => {
    if (!active) return;
    active = false;
    clearTimeout(pressTimer);
    el.classList.remove('dragging');
    try { el.releasePointerCapture(e.pointerId); } catch (_) {}
    if (longPressed) return;
    if (dragging) { handlers.onMoveEnd(die); return; }
    const now = Date.now();
    if (now - lastTap < DOUBLE_MS) {
      lastTap = 0;
      clearTimeout(tapTimer);
      handlers.onDoubleTap(die);
    } else {
      lastTap = now;
      // wait long enough to know it wasn't a double-tap
      tapTimer = setTimeout(() => handlers.onTap(die), DOUBLE_MS);
    }
  };

  el.addEventListener('pointerup', finish);
  el.addEventListener('pointercancel', (e) => {
    active = false; dragging = false;
    clearTimeout(pressTimer);
    el.classList.remove('dragging');
    try { el.releasePointerCapture(e.pointerId); } catch (_) {}
  });
}
