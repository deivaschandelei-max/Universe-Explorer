/*
 * The live map on the home page: the Sun and eight planets seen from above
 * the ecliptic, at their approximate positions on the simulated date.
 *
 * Angles are real; distances are compressed on a log scale so that Mercury
 * and Neptune both fit on a phone screen. Orbits are drawn as circles.
 */
import {
  PLANETS,
  getPlanet,
  helioLongitude,
  lightTimeSeconds,
  formatLightTime,
  formatPeriod,
  formatAU
} from './orbits.js';

var TAU = Math.PI * 2;
var DEG = Math.PI / 180;
var DAY_MS = 86400000;

var RATES = [10, 100, 0]; /* simulated days per real second */
var INTRO_MS = 1500;
var HIT_RADIUS = 30;
var BAR_GAP = 12; /* space between the map and the date and speed controls under it */
var ACCURATE_UNTIL = Date.UTC(2050, 11, 31);
var STOP_AT = Date.UTC(2500, 0, 1);

var dateFormat = window.Intl && window.Intl.DateTimeFormat
  ? new window.Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  : null;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function hexToRgb(hex) {
  var n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function formatDate(ms) {
  var d = new Date(ms);
  return dateFormat ? dateFormat.format(d) : d.toDateString().slice(4);
}

function plural(n, word) {
  return n + ' ' + word + (n === 1 ? '' : 's');
}

function formatDelta(deltaMs) {
  var days = Math.abs(deltaMs) / DAY_MS;
  if (days < 1) return 'Today';
  var amount;
  if (days < 60) {
    amount = plural(Math.round(days), 'day');
  } else if (days < 730) {
    amount = plural(Math.round(days / 30.44), 'month');
  } else {
    var years = days / 365.25;
    amount = (years >= 10 ? String(Math.round(years)) : String(+years.toFixed(1))) + ' years';
  }
  return deltaMs > 0 ? 'in ' + amount : amount + ' ago';
}

/* Distance from the Sun on screen: log scale, Mercury at 14% of the radius, Neptune at 100%. */
function ringFraction(a) {
  var t = Math.log(a / 0.3) / Math.log(30.07 / 0.3);
  return 0.14 + 0.86 * t;
}

export function initHero(els, options) {
  var canvas = els.canvas;
  var ctx = canvas.getContext('2d');
  if (!ctx) return null;

  var displayFont = (window.getComputedStyle(document.documentElement).getPropertyValue('--display') || '').trim() ||
    'sans-serif';

  var rgb = {};
  PLANETS.forEach(function (p) {
    rgb[p.id] = hexToRgb(p.color);
  });

  var state = {
    w: 0,
    h: 0,
    bar: 84,
    dpr: 1,
    cx: 0,
    cy: 0,
    R: 0,
    simMs: Date.now(),
    rateIndex: 0,
    selected: 'earth',
    introMs: 0,
    inView: true,
    raf: 0,
    last: 0,
    shownDate: '',
    shownDelta: ''
  };
  var reduceMotion = !!options.reduceMotion;

  /* ---------- layout ---------- */

  function layout() {
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.w = rect.width;
    state.h = rect.height;
    state.dpr = dpr;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    state.bar = (els.barEl ? els.barEl.offsetHeight : 72) + BAR_GAP;
    var usable = rect.height - state.bar;
    state.R = Math.max(60, Math.min(rect.width / 2 - 14, usable / 2 - 14));
    state.cx = rect.width / 2;
    state.cy = usable / 2 + 4;
  }

  function positions(ms) {
    return PLANETS.map(function (p) {
      var r = state.R * ringFraction(p.a);
      var angle = helioLongitude(p, ms) * DEG;
      return { planet: p, r: r, angle: angle, x: state.cx + r * Math.cos(angle), y: state.cy - r * Math.sin(angle) };
    });
  }

  /* ---------- drawing ---------- */

  function drawSun(alpha) {
    var R = state.R;
    var core = Math.max(7, R * 0.062);
    var glow = core * 5.2;
    ctx.globalAlpha = alpha;
    var g = ctx.createRadialGradient(state.cx, state.cy, 0, state.cx, state.cy, glow);
    g.addColorStop(0, 'rgba(255,226,160,0.95)');
    g.addColorStop(0.16, 'rgba(255,196,106,0.6)');
    g.addColorStop(0.45, 'rgba(255,150,70,0.14)');
    g.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(state.cx, state.cy, glow, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff3d6';
    ctx.beginPath();
    ctx.arc(state.cx, state.cy, core, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawLabel(pt, dotR) {
    var text = pt.planet.name;
    ctx.font = '700 14px ' + displayFont;
    var width = ctx.measureText(text).width;
    var dx = Math.cos(pt.angle);
    var dy = -Math.sin(pt.angle);
    var offset = dotR + 12;
    var x = pt.x + dx * offset;
    var y = pt.y + dy * offset;
    if (dx < -0.25) x -= width;
    else if (dx <= 0.25) x -= width / 2;
    x = clamp(x, 8, state.w - width - 8);
    y = clamp(y, 16, state.h - state.bar - 4);
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(4,5,13,0.85)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = '#e8edff';
    ctx.fillText(text, x, y);
  }

  function draw() {
    var dpr = state.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, state.w, state.h);

    var intro = state.introMs;
    drawSun(clamp(intro / 400, 0, 1));

    var scale = clamp(state.R / 175, 0.8, 1.7);
    var pts = positions(state.simMs);
    var selectedPt = null;

    pts.forEach(function (pt, i) {
      var p = pt.planet;
      var progress = clamp((intro - 150 - i * 90) / 650, 0, 1);
      if (progress <= 0) return;
      var e = easeOut(progress);
      var ringR = pt.r * (0.6 + 0.4 * e);
      var isSelected = p.id === state.selected;

      ctx.globalAlpha = e;
      ctx.beginPath();
      ctx.arc(state.cx, state.cy, ringR, 0, TAU);
      ctx.lineWidth = isSelected ? 1.5 : 1;
      ctx.strokeStyle = isSelected ? 'rgba(79,227,255,0.6)' : 'rgba(140,190,255,0.17)';
      ctx.stroke();

      var angle = pt.angle - (1 - e) * 1.7;
      var x = state.cx + ringR * Math.cos(angle);
      var y = state.cy - ringR * Math.sin(angle);
      var dotR = Math.max(2, p.size * scale);
      var c = rgb[p.id];

      ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0.2)';
      ctx.beginPath();
      ctx.arc(x, y, dotR * 2.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x, y, dotR, 0, TAU);
      ctx.fill();

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, dotR + 5, 0, TAU);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#4fe3ff';
        ctx.stroke();
        selectedPt = { planet: p, x: x, y: y, angle: angle, dotR: dotR };
      }
      ctx.globalAlpha = 1;
    });

    if (selectedPt) drawLabel(selectedPt, selectedPt.dotR + 5);
  }

  /* ---------- readouts ---------- */

  function updateClock() {
    var dateText = formatDate(state.simMs);
    if (dateText !== state.shownDate) {
      state.shownDate = dateText;
      els.dateEl.textContent = dateText;
    }
    var delta = formatDelta(state.simMs - Date.now());
    if (state.simMs > ACCURATE_UNTIL) delta += ' · less exact';
    if (delta !== state.shownDelta) {
      state.shownDelta = delta;
      els.deltaEl.textContent = delta;
      els.todayBtn.hidden = Math.abs(state.simMs - Date.now()) < DAY_MS;
    }
  }

  function updateRateButton() {
    var rate = RATES[state.rateIndex];
    var label = rate === 0 ? 'Paused' : '1 sec = ' + plural(rate, 'day');
    els.rateLabel.textContent = label;
    els.rateBtn.setAttribute(
      'aria-label',
      'Time speed: ' + (rate === 0 ? 'paused' : '1 second equals ' + plural(rate, 'day')) + '. Activate to change.'
    );
  }

  function updateReadout() {
    var p = getPlanet(state.selected);
    if (!p) return;
    els.ro.name.textContent = p.name;
    els.ro.dot.style.backgroundColor = p.color;
    els.ro.distance.textContent = formatAU(p.a);
    els.ro.year.textContent = formatPeriod(p.periodDays);
    els.ro.light.textContent = formatLightTime(lightTimeSeconds(p));
    var buttons = els.chipsEl.children;
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', buttons[i].getAttribute('data-id') === p.id ? 'true' : 'false');
    }
  }

  /* ---------- loop ---------- */

  function shouldAnimate() {
    if (!state.inView || document.hidden) return false;
    return RATES[state.rateIndex] !== 0 || state.introMs < INTRO_MS;
  }

  function frame(ts) {
    state.raf = 0;
    var dt = state.last ? Math.min(ts - state.last, 100) : 0;
    state.last = ts;

    if (state.introMs < INTRO_MS) state.introMs = Math.min(INTRO_MS, state.introMs + dt);
    var rate = RATES[state.rateIndex];
    if (rate !== 0) {
      state.simMs += (dt / 1000) * rate * DAY_MS;
      if (state.simMs >= STOP_AT) {
        state.simMs = STOP_AT;
        state.rateIndex = RATES.length - 1;
        updateRateButton();
      }
    }
    draw();
    updateClock();

    if (shouldAnimate()) {
      state.raf = window.requestAnimationFrame(frame);
    } else {
      state.last = 0;
    }
  }

  function requestDraw() {
    if (!state.raf) state.raf = window.requestAnimationFrame(frame);
  }

  /* ---------- actions ---------- */

  function select(id) {
    if (!getPlanet(id)) return;
    state.selected = id;
    updateReadout();
    requestDraw();
  }

  function cycleRate() {
    state.rateIndex = (state.rateIndex + 1) % RATES.length;
    updateRateButton();
    requestDraw();
  }

  function backToToday() {
    state.simMs = Date.now();
    requestDraw();
  }

  function setReducedMotion(flag) {
    reduceMotion = !!flag;
    if (reduceMotion) {
      state.introMs = INTRO_MS;
      state.rateIndex = RATES.length - 1;
    } else if (RATES[state.rateIndex] === 0) {
      state.rateIndex = 0;
    }
    updateRateButton();
    requestDraw();
  }

  /* ---------- wiring ---------- */

  PLANETS.forEach(function (p) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.setAttribute('data-id', p.id);
    b.setAttribute('aria-pressed', 'false');
    var dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.backgroundColor = p.color;
    dot.setAttribute('aria-hidden', 'true');
    b.appendChild(dot);
    b.appendChild(document.createTextNode(p.name));
    b.addEventListener('click', function () {
      select(p.id);
    });
    els.chipsEl.appendChild(b);
  });

  canvas.addEventListener('click', function (event) {
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    var best = null;
    var bestDist = HIT_RADIUS;
    positions(state.simMs).forEach(function (pt) {
      var d = Math.sqrt((pt.x - x) * (pt.x - x) + (pt.y - y) * (pt.y - y));
      if (d < bestDist) {
        bestDist = d;
        best = pt.planet.id;
      }
    });
    if (best) select(best);
  });

  els.rateBtn.addEventListener('click', cycleRate);
  els.todayBtn.addEventListener('click', backToToday);

  var resizeQueued = false;
  function onResize() {
    if (resizeQueued) return;
    resizeQueued = true;
    window.requestAnimationFrame(function () {
      resizeQueued = false;
      layout();
      requestDraw();
    });
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      state.last = 0;
      requestDraw();
    }
  });

  if ('IntersectionObserver' in window) {
    new window.IntersectionObserver(function (entries) {
      state.inView = entries[entries.length - 1].isIntersecting;
      if (state.inView) {
        state.last = 0;
        requestDraw();
      }
    }).observe(canvas);
  }

  layout();
  if (reduceMotion) {
    state.introMs = INTRO_MS;
    state.rateIndex = RATES.length - 1;
  }
  updateReadout();
  updateRateButton();
  updateClock();
  requestDraw();

  return {
    select: select,
    setReducedMotion: setReducedMotion,
    getState: function () {
      return { selected: state.selected, simMs: state.simMs, rate: RATES[state.rateIndex], animating: !!state.raf };
    }
  };
}
