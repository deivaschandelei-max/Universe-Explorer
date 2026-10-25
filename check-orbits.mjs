/*
 * Checks js/orbits.js against events with known dates.
 *
 *   node tools/check-orbits.mjs
 *
 * 1. Earth at equinoxes and solstices. The elements use the J2000 ecliptic,
 *    but equinoxes are defined on the ecliptic of date, which has precessed
 *    about 0.37 degrees since 2000. Earth's J2000 longitude on those dates is
 *    therefore the nominal value (0, 90, 180 or 270) minus 0.37 degrees.
 * 2. Oppositions and inferior conjunctions. The planet and Earth must have
 *    nearly the same heliocentric longitude on those dates.
 */
import { PLANETS, getPlanet, helioLongitude } from '../js/orbits.js';

function diff(a, b) {
  var d = ((a - b + 540) % 360) - 180;
  return d;
}

var failures = 0;
function report(label, actual, expected, tolerance) {
  var err = diff(actual, expected);
  var ok = Math.abs(err) <= tolerance;
  if (!ok) failures++;
  console.log(
    (ok ? 'ok   ' : 'FAIL ') + label.padEnd(44) +
    ' got ' + actual.toFixed(2).padStart(7) +
    '  want ' + expected.toFixed(2).padStart(7) +
    '  off ' + err.toFixed(2).padStart(6) + ' deg (limit ' + tolerance + ')'
  );
}

var earth = getPlanet('earth');
var PRECESSION_2026 = 0.373;

console.log('Earth at equinoxes and solstices (2026, UTC)');
[
  ['March equinox  2026-03-20 14:46', '2026-03-20T14:46:00Z', 180],
  ['June solstice  2026-06-21 08:24', '2026-06-21T08:24:00Z', 270],
  ['Sept equinox   2026-09-23 00:05', '2026-09-23T00:05:00Z', 0],
  ['Dec solstice   2026-12-21 20:50', '2026-12-21T20:50:00Z', 90]
].forEach(function (row) {
  var lon = helioLongitude(earth, Date.parse(row[1]));
  report(row[0], lon, row[2] - PRECESSION_2026, 0.15);
});

console.log('\nPlanet and Earth share a heliocentric longitude at opposition');
[
  ['Mars opposition      2025-01-16', 'mars', '2025-01-16T12:00:00Z', 2],
  ['Saturn opposition    2025-09-21', 'saturn', '2025-09-21T12:00:00Z', 2],
  ['Neptune opposition   2025-09-23', 'neptune', '2025-09-23T12:00:00Z', 2],
  ['Uranus opposition    2025-11-21', 'uranus', '2025-11-21T12:00:00Z', 2],
  ['Jupiter opposition   2024-12-07', 'jupiter', '2024-12-07T12:00:00Z', 2],
  ['Jupiter opposition   2026-01-10', 'jupiter', '2026-01-10T12:00:00Z', 2],
  ['Venus inferior conj. 2025-03-23', 'venus', '2025-03-23T12:00:00Z', 3],
  ['Venus inferior conj. 2026-10-24', 'venus', '2026-10-24T12:00:00Z', 3],
  ['Mercury inferior conj. 2025-03-24', 'mercury', '2025-03-24T12:00:00Z', 5],
  ['Mercury inferior conj. 2025-11-20', 'mercury', '2025-11-20T12:00:00Z', 5]
].forEach(function (row) {
  var ms = Date.parse(row[2]);
  report(row[0], helioLongitude(getPlanet(row[1]), ms), helioLongitude(earth, ms), row[3]);
});

console.log('\nSidereal period from the mean-longitude rate vs the listed period');
PLANETS.forEach(function (p) {
  var fromRate = 360 / (p.Lr / 36525);
  var pct = Math.abs(fromRate - p.periodDays) / p.periodDays * 100;
  var ok = pct < 0.1;
  if (!ok) failures++;
  console.log((ok ? 'ok   ' : 'FAIL ') + p.name.padEnd(8) + fromRate.toFixed(1).padStart(10) + ' d vs ' + String(p.periodDays).padStart(9) + ' d (' + pct.toFixed(3) + '%)');
});

console.log(failures ? '\n' + failures + ' check(s) failed' : '\nAll checks passed');
process.exit(failures ? 1 : 0);
