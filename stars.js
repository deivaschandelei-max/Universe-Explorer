/*
 * Static star field, drawn once (and again if the width changes).
 * No animation, so it costs nothing while the page is idle.
 */

function mulberry32(seed) {
  var a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

var TINTS = [
  [223, 232, 255],
  [223, 232, 255],
  [223, 232, 255],
  [223, 232, 255],
  [139, 233, 255],
  [195, 176, 255]
];

export function initStars(canvas) {
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  var drawnWidth = 0;

  function draw() {
    var width = window.innerWidth;
    var screenH = window.screen && window.screen.height ? window.screen.height : 0;
    var height = Math.min(Math.max(window.innerHeight, screenH), 2400);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    var rand = mulberry32(7919);
    var count = Math.min(Math.round((width * height) / 1800), 900);

    for (var i = 0; i < count; i++) {
      var x = rand() * width;
      var y = rand() * height;
      var size = 0.35 + Math.pow(rand(), 6) * 1.5;
      var alpha = 0.25 + rand() * 0.65;
      var tint = TINTS[Math.floor(rand() * TINTS.length)];
      var rgb = tint[0] + ',' + tint[1] + ',' + tint[2];

      if (size > 1.1) {
        var halo = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
        halo.addColorStop(0, 'rgba(' + rgb + ',' + (alpha * 0.35).toFixed(3) + ')');
        halo.addColorStop(1, 'rgba(' + rgb + ',0)');
        ctx.fillStyle = halo;
        ctx.fillRect(x - size * 4, y - size * 4, size * 8, size * 8);
      }
      ctx.fillStyle = 'rgba(' + rgb + ',' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    drawnWidth = width;
  }

  draw();

  /* Height changes when Safari's toolbar collapses; only a width change needs a redraw. */
  window.addEventListener('resize', function () {
    if (window.innerWidth !== drawnWidth) draw();
  });
}
