// Pointer gesture handling for a die element:
//   drag = move, tap = reroll, double-tap = lock, long-press = menu.
//
// iOS double-tap-to-zoom is suppressed here, on the die's own touchend, rather
// than page-wide on touchstart. An earlier attempt canceled the *second*
// touchstart from a document capture listener; that is both too late (WebKit has
// claimed the gesture, so the event isn't cancelable) and destructive, because
// canceling the start of a touch sequence suppresses the rest of it. touchend is
// the event whose default action is the tap gesture, so that is where to stop it.

const DRAG_PX = 8;
const LONGPRESS_MS = 500;
const DOUBLETAP_MS = 270;
const DOUBLETAP_PX = 24;

export function makeInteractive(el, die, handlers) {
  let startX = 0, startY = 0, origX = 0, origY = 0;
  let active = false, dragging = false, longPressed = false;
  let pressTimer = null;
  // a single tap can't fire until the double-tap window has passed without a
  // second tap, so it waits in tapTimer
  let tapTimer = null;
  let lastTapAt = 0, lastTapX = 0, lastTapY = 0;

  const cancelPendingTap = () => {
    clearTimeout(tapTimer);
    tapTimer = null;
  };

  // Kills the double-tap-zoom gesture (and the synthetic click, which nothing on
  // .die listens for). Multi-touch is left alone so pinch-zoom still works.
  el.addEventListener('touchend', (e) => {
    if (e.touches.length || e.changedTouches.length > 1) return;
    if (e.cancelable) e.preventDefault();
  }, { passive: false });

  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // NB: no preventDefault here. WebKit synthesizes pointer events from the
    // touch stream, so canceling pointerdown suppresses touchstart/touchend for
    // the whole sequence — including the touchend guard above. Scrolling and
    // selection are already handled by touch-action: none and
    // -webkit-user-select: none on .die.
    if (e.pointerType === 'mouse') e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    active = true; dragging = false; longPressed = false;
    startX = e.clientX; startY = e.clientY;
    origX = die.x; origY = die.y;
    pressTimer = setTimeout(() => {
      longPressed = true;
      cancelPendingTap(); // the gesture turned out to be a hold, not a tap
      lastTapAt = 0;
      handlers.onLongPress(die, el, e.clientX, e.clientY);
    }, LONGPRESS_MS);
  });

  el.addEventListener('pointermove', (e) => {
    if (!active || longPressed) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (!dragging && Math.hypot(dx, dy) > DRAG_PX) {
      dragging = true;
      clearTimeout(pressTimer);
      cancelPendingTap(); // the gesture turned out to be a drag, not a tap
      lastTapAt = 0;
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
    const near = Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < DOUBLETAP_PX;
    if (now - lastTapAt < DOUBLETAP_MS && near) {
      cancelPendingTap(); // swallow the first tap's reroll
      lastTapAt = 0;
      handlers.onDoubleTap(die);
      return;
    }
    lastTapAt = now; lastTapX = e.clientX; lastTapY = e.clientY;
    tapTimer = setTimeout(() => {
      tapTimer = null;
      handlers.onTap(die);
    }, DOUBLETAP_MS);
  };

  el.addEventListener('pointerup', finish);
  el.addEventListener('pointercancel', (e) => {
    active = false; dragging = false;
    clearTimeout(pressTimer);
    cancelPendingTap();
    lastTapAt = 0;
    el.classList.remove('dragging');
    try { el.releasePointerCapture(e.pointerId); } catch (_) {}
  });
}
