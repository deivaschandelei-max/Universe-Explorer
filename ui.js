/*
 * Small UI helpers: bottom sheets (dialogs) and a toast.
 * Sheets are plain elements, not <dialog>, so they work on older iOS.
 */

var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

/* Focusable elements that are on screen (skips the hidden file input and hidden buttons). */
function focusableIn(root) {
  var all = root.querySelectorAll(FOCUSABLE);
  var out = [];
  for (var i = 0; i < all.length; i++) {
    if (all[i].getClientRects().length > 0) out.push(all[i]);
  }
  return out;
}

export function createSheets(options) {
  var scrim = options.scrim;
  var background = options.background;
  var current = null;
  var closing = null;
  var closeTimer = 0;
  var returnFocusTo = null;

  function finishClosing() {
    window.clearTimeout(closeTimer);
    if (closing) {
      closing.hidden = true;
      closing = null;
    }
    if (!current) scrim.hidden = true;
  }

  function open(sheet) {
    finishClosing();
    if (current) {
      current.classList.remove('open');
      current.hidden = true;
    } else {
      returnFocusTo = document.activeElement;
    }
    scrim.hidden = false;
    sheet.hidden = false;
    void sheet.offsetWidth; /* start the transition from the closed position */
    scrim.classList.add('open');
    sheet.classList.add('open');
    document.documentElement.classList.add('sheet-open');
    background.forEach(function (el) {
      el.setAttribute('aria-hidden', 'true');
    });
    current = sheet;
    var first = sheet.querySelector('[data-autofocus]') || focusableIn(sheet)[0];
    if (first) first.focus();
  }

  function close() {
    if (!current) return;
    var sheet = current;
    current = null;
    sheet.classList.remove('open');
    scrim.classList.remove('open');
    document.documentElement.classList.remove('sheet-open');
    background.forEach(function (el) {
      el.removeAttribute('aria-hidden');
    });
    closing = sheet;
    closeTimer = window.setTimeout(finishClosing, 300);
    if (returnFocusTo && returnFocusTo.focus) returnFocusTo.focus();
    returnFocusTo = null;
  }

  scrim.addEventListener('click', close);

  document.addEventListener('click', function (event) {
    var target = event.target;
    while (target && target !== document) {
      if (target.hasAttribute && target.hasAttribute('data-close')) {
        close();
        return;
      }
      target = target.parentNode;
    }
  });

  document.addEventListener('keydown', function (event) {
    if (!current) return;
    if (event.key === 'Escape' || event.key === 'Esc') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    var items = focusableIn(current);
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  return {
    open: open,
    close: close,
    isOpen: function () {
      return !!current;
    }
  };
}

export function createToast(root, textEl, actionBtn) {
  var timer = 0;
  var handler = null;

  actionBtn.addEventListener('click', function () {
    var fn = handler;
    hide();
    if (fn) fn();
  });

  function hide() {
    window.clearTimeout(timer);
    root.hidden = true;
    handler = null;
  }

  function show(text, action, onAction, autoHideMs) {
    window.clearTimeout(timer);
    textEl.textContent = text;
    actionBtn.hidden = !action;
    actionBtn.textContent = action || '';
    handler = onAction || null;
    root.hidden = false;
    if (autoHideMs) timer = window.setTimeout(hide, autoHideMs);
  }

  return { show: show, hide: hide };
}
