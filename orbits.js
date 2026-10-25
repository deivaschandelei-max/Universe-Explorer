/*
 * Planet positions for the home-page map.
 *
 * Orbital elements are the JPL "Keplerian elements for approximate positions
 * of the major planets" (valid 1800-2050). Each planet's heliocentric ecliptic
 * longitude is found by solving Kepler's equation; orbital inclination is
 * ignored because the map is a top-down view. Earth uses the Earth-Moon
 * barycenter elements.
 *
 * Positions are approximate. tools/check-orbits.mjs compares them with known
 * events (equinoxes, solstices, oppositions).
 */

var DEG = Math.PI / 180;
var DAY_MS = 86400000;

export var J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
export var DAYS_PER_CENTURY = 36525;
export var LIGHT_SECONDS_PER_AU = 499.00478;

/*
 * a: semi-major axis (AU)           e: eccentricity
 * L, Lr: mean longitude at J2000 and its rate (deg, deg per century)
 * w, wr: longitude of perihelion at J2000 and its rate (deg, deg per century)
 * periodDays: sidereal orbital period, for display
 * size: dot radius in CSS px on a 175 px map radius
 */
export var PLANETS = [
  { id: 'mercury', name: 'Mercury', a: 0.38709927, e: 0.20563593, L: 252.2503235, Lr: 149472.67411175, w: 77.45779628, wr: 0.16047689, periodDays: 87.969, color: '#b9b3ab', size: 2.4 },
  { id: 'venus', name: 'Venus', a: 0.72333566, e: 0.00677672, L: 181.9790995, Lr: 58517.81538729, w: 131.60246718, wr: 0.00268329, periodDays: 224.701, color: '#f0d9a6', size: 3.6 },
  { id: 'earth', name: 'Earth', a: 1.00000261, e: 0.01671123, L: 100.46457166, Lr: 35999.37244981, w: 102.93768193, wr: 0.32327364, periodDays: 365.256, color: '#5ab4ff', size: 3.8 },
  { id: 'mars', name: 'Mars', a: 1.52371034, e: 0.0933941, L: -4.55343205, Lr: 19140.30268499, w: -23.94362959, wr: 0.44441088, periodDays: 686.98, color: '#e3774f', size: 3.0 },
  { id: 'jupiter', name: 'Jupiter', a: 5.202887, e: 0.04838624, L: 34.39644051, Lr: 3034.74612775, w: 14.72847983, wr: 0.21252668, periodDays: 4332.589, color: '#e0b98c', size: 6.2 },
  { id: 'saturn', name: 'Saturn', a: 9.53667594, e: 0.05386179, L: 49.95424423, Lr: 1222.49362201, w: 92.59887831, wr: -0.41897216, periodDays: 10759.22, color: '#ecd592', size: 5.6 },
  { id: 'uranus', name: 'Uranus', a: 19.18916464, e: 0.04725744, L: 313.23810451, Lr: 428.48202785, w: 170.9542763, wr: 0.40805281, periodDays: 30688.5, color: '#8fe3ea', size: 4.6 },
  { id: 'neptune', name: 'Neptune', a: 30.06992276, e: 0.00859048, L: -55.12002969, Lr: 218.45945325, w: 44.96476227, wr: -0.32241464, periodDays: 60182, color: '#6f86ff', size: 4.6 }
];

export function getPlanet(id) {
  for (var i = 0; i < PLANETS.length; i++) {
    if (PLANETS[i].id === id) return PLANETS[i];
  }
  return null;
}

function wrap360(deg) {
  var x = deg % 360;
  return x < 0 ? x + 360 : x;
}

/* Solve E - e*sin(E) = M for E (radians). */
export function solveKepler(M, e) {
  var E = M + e * Math.sin(M);
  for (var i = 0; i < 8; i++) {
    var d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  return E;
}

/* Heliocentric ecliptic longitude (degrees, 0-360, J2000 frame) at a time in ms. */
export function helioLongitude(planet, ms) {
  var T = (ms - J2000_MS) / DAY_MS / DAYS_PER_CENTURY;
  var L = planet.L + planet.Lr * T;
  var w = planet.w + planet.wr * T;
  var M = wrap360(L - w) * DEG;
  if (M > Math.PI) M -= 2 * Math.PI;
  var E = solveKepler(M, planet.e);
  var nu = 2 * Math.atan2(
    Math.sqrt(1 + planet.e) * Math.sin(E / 2),
    Math.sqrt(1 - planet.e) * Math.cos(E / 2)
  );
  return wrap360(nu / DEG + w);
}

export function lightTimeSeconds(planet) {
  return planet.a * LIGHT_SECONDS_PER_AU;
}

/* "8 min 19 s", "1 h 19 min" */
export function formatLightTime(seconds) {
  var s = Math.round(seconds);
  if (s < 3600) {
    return Math.floor(s / 60) + ' min ' + (s % 60) + ' s';
  }
  var m = Math.round(s / 60);
  return Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
}

/* "88 Earth days", "11.9 Earth years" */
export function formatPeriod(days) {
  if (days < 1000) return Math.round(days) + ' Earth days';
  var years = days / 365.25;
  var text = years >= 100 ? String(Math.round(years)) : String(+years.toFixed(1));
  return text + ' Earth years';
}

export function formatAU(a) {
  return a.toFixed(2) + ' AU';
}
