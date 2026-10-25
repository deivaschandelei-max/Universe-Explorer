import { BUILD } from './version.js';
import * as store from './storage.js';
import { MODULES, STATUS_LABEL } from './modules.js';
import { initStars } from './stars.js';
import { initHero } from './hero.js';
import { createSheets, createToast } from './ui.js';
import { registerServiceWorker, applyUpdate, createInstaller, isIOS } from './pwa.js';

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ---------- motion preference ---------- */

var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
var hero = null;

function wantsReducedMotion() {
  var setting = store.getMotion();
  if (setting === 'reduce') return true;
  if (setting === 'full') return false;
  return !!(motionQuery && motionQuery.matches);
}

function applyMotionSetting() {
  document.documentElement.setAttribute('data-motion', store.getMotion());
  if (hero) hero.setReducedMotion(wantsReducedMotion());
}

if (motionQuery) {
  var onMotionChange = function () {
    if (store.getMotion() === 'auto') applyMotionSetting();
  };
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotionChange);
  else if (motionQuery.addListener) motionQuery.addListener(onMotionChange);
}

document.documentElement.setAttribute('data-motion', store.getMotion());

/* ---------- background and map ---------- */

initStars($('stars'));

hero = initHero(
  {
    canvas: $('orrery'),
    barEl: $('stage-bar'),
    dateEl: $('sim-date'),
    deltaEl: $('sim-delta'),
    rateBtn: $('rate-btn'),
    rateLabel: $('rate-label'),
    todayBtn: $('today-btn'),
    chipsEl: $('chips'),
    ro: {
      name: $('ro-name'),
      dot: $('ro-dot'),
      distance: $('ro-distance'),
      year: $('ro-year'),
      light: $('ro-light')
    }
  },
  { reduceMotion: wantsReducedMotion() }
);

/* ---------- sections ---------- */

function glyph(icon) {
  return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + icon + '</svg>';
}

function statusChip(mod) {
  return '<span class="status status-' + mod.status + '">' + escapeHtml(STATUS_LABEL[mod.status]) + '</span>';
}

function renderModules() {
  var lead = MODULES[0];
  var rest = MODULES.slice(1);

  var leadHtml =
    '<div class="glyph">' + glyph(lead.icon) + '</div>' +
    '<h3>' + escapeHtml(lead.title) + '</h3>' +
    '<p>' + escapeHtml(lead.blurb) + '</p>' +
    '<div class="lead-foot">' + statusChip(lead) +
    (lead.status === 'ready' && lead.href
      ? '<a class="btn btn-primary" href="' + escapeHtml(lead.href) + '">Open ' + escapeHtml(lead.title) + '</a>'
      : '') +
    '</div>';
  $('module-lead').innerHTML = leadHtml;

  $('module-list').innerHTML = rest.map(function (mod) {
    var inner =
      '<div class="glyph">' + glyph(mod.icon) + '</div>' +
      '<div class="row-text"><h3>' + escapeHtml(mod.title) + '</h3><p>' + escapeHtml(mod.blurb) + '</p></div>' +
      statusChip(mod);
    if (mod.status === 'ready' && mod.href) {
      return '<li><a class="row" href="' + escapeHtml(mod.href) + '">' + inner + '</a></li>';
    }
    return '<li><div class="row">' + inner + '</div></li>';
  }).join('');
}

renderModules();
$('build').textContent = BUILD;

/* ---------- sheets and toast ---------- */

var sheets = createSheets({
  scrim: $('scrim'),
  background: [$('app')]
});
var toast = createToast($('toast'), $('toast-text'), $('toast-action'));

/* ---------- settings ---------- */

var dataStatus = $('data-status');

function setDataStatus(text) {
  dataStatus.textContent = text;
}

function syncSettingsForm() {
  var value = store.getMotion();
  var radios = document.querySelectorAll('input[name="motion"]');
  for (var i = 0; i < radios.length; i++) radios[i].checked = radios[i].value === value;
  $('storage-note').hidden = store.isPersistent();
}

$('settings-btn').addEventListener('click', function () {
  syncSettingsForm();
  setDataStatus('');
  sheets.open($('sheet-settings'));
});

Array.prototype.forEach.call(document.querySelectorAll('input[name="motion"]'), function (radio) {
  radio.addEventListener('change', function () {
    if (!radio.checked) return;
    store.setMotion(radio.value);
    applyMotionSetting();
  });
});

function downloadBlob(blob, name) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  window.setTimeout(function () {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
  setDataStatus('Backup downloaded.');
}

$('export-btn').addEventListener('click', function () {
  var now = new Date();
  var pad = function (n) {
    return (n < 10 ? '0' : '') + n;
  };
  var name = 'universe-explorer-backup-' + now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + '.json';
  var blob = new Blob([store.exportJSON()], { type: 'application/json' });
  try {
    /* On iPhone the share sheet offers "Save to Files". */
    if (navigator.canShare && navigator.share && window.File) {
      var file = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'Universe Explorer backup' }).then(function () {
          setDataStatus('Backup exported.');
        }, function (err) {
          if (err && err.name === 'AbortError') setDataStatus('Export cancelled.');
          else downloadBlob(blob, name);
        });
        return;
      }
    }
  } catch (err) {
    /* fall back to a download */
  }
  downloadBlob(blob, name);
});

$('import-btn').addEventListener('click', function () {
  $('import-file').click();
});

$('import-file').addEventListener('change', function (event) {
  var input = event.target;
  var file = input.files && input.files[0];
  if (!file) return;
  if (file.size > 500000) {
    setDataStatus('This file is too large to be a backup.');
    input.value = '';
    return;
  }
  var reader = new FileReader();
  reader.onload = function () {
    var result = store.importJSON(String(reader.result));
    setDataStatus(result.message);
    if (result.ok) {
      syncSettingsForm();
      applyMotionSetting();
    }
  };
  reader.onerror = function () {
    setDataStatus('This file could not be read.');
  };
  reader.readAsText(file);
  input.value = '';
});

var eraseBtn = $('erase-btn');
var eraseTimer = 0;

function disarmErase() {
  window.clearTimeout(eraseTimer);
  eraseBtn.textContent = 'Erase data';
  eraseBtn.classList.remove('armed');
}

eraseBtn.addEventListener('click', function () {
  if (!eraseBtn.classList.contains('armed')) {
    eraseBtn.textContent = 'Tap again to erase';
    eraseBtn.classList.add('armed');
    eraseTimer = window.setTimeout(disarmErase, 4000);
    return;
  }
  disarmErase();
  store.reset();
  syncSettingsForm();
  applyMotionSetting();
  setDataStatus('All data on this device has been erased.');
});

/* ---------- install and offline ---------- */

var installer = createInstaller();
var installBtn = $('install-btn');

function updateInstallButton() {
  installBtn.hidden = !installer.available();
}
installer.onChange(updateInstallButton);
updateInstallButton();

installBtn.addEventListener('click', function () {
  if (installer.hasNativePrompt()) {
    installer.prompt();
  } else {
    $('install-ios').hidden = !isIOS();
    sheets.open($('sheet-install'));
  }
});

var offlineEl = $('offline-status');

registerServiceWorker({
  onUnsupported: function () {
    offlineEl.textContent = 'Offline mode is not available in this browser.';
  },
  onReady: function () {
    offlineEl.textContent = 'Ready to use offline.';
  },
  onError: function () {
    offlineEl.textContent = 'Offline mode could not start. The app still works while you are online.';
  },
  onUpdate: function (registration) {
    toast.show('A new version is ready.', 'Reload', function () {
      applyUpdate(registration);
    });
  }
});

/* Handy for testing from the console. */
window.universeExplorer = { build: BUILD, hero: hero, store: store };
