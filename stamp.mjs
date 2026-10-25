/*
 * Prepares the app for deploy. Run it after every change to the app's files:
 *
 *   node tools/stamp.mjs          update sw.js and js/version.js
 *   node tools/stamp.mjs --check  exit with an error if they are out of date
 *
 * It does two things:
 *  1. Writes the list of files the service worker should store for offline use
 *     (everything except tools, docs and git files).
 *  2. Writes a version id made from a hash of those files. When any file changes
 *     the id changes, so phones that have the app installed fetch the update
 *     instead of keeping the old cached copy.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

var root = fileURLToPath(new URL('..', import.meta.url));
var check = process.argv.indexOf('--check') !== -1;

var SKIP_DIRS = ['.git', '.github', 'node_modules', 'tools', 'tests'];
var SKIP_FILES = ['sw.js', 'README.md', 'LICENSE', '.nojekyll', '.gitignore', '.DS_Store'];
var UNHASHED = ['js/version.js'];

function walk(dir, out) {
  readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    var full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.indexOf(entry.name) === -1) walk(full, out);
    } else {
      var rel = relative(root, full).split(sep).join('/');
      if (SKIP_FILES.indexOf(rel) === -1 && SKIP_FILES.indexOf(entry.name) === -1) out.push(rel);
    }
  });
  return out;
}

var files = walk(root, []).sort();
if (files.indexOf('js/version.js') === -1) files.push('js/version.js');
files.sort();

var hash = createHash('sha256');
files.forEach(function (rel) {
  if (UNHASHED.indexOf(rel) !== -1) return;
  hash.update(rel + '\0');
  hash.update(readFileSync(join(root, rel)));
  hash.update('\0');
});
var version = hash.digest('hex').slice(0, 10);

var versionJs = "/* Written by tools/stamp.mjs. Do not edit. */\nexport var BUILD = '" + version + "';\n";
var precache = ['./'].concat(files.map(function (rel) {
  return './' + rel;
}));

var swPath = join(root, 'sw.js');
var sw = readFileSync(swPath, 'utf8');
var begin = sw.indexOf('/* STAMP:BEGIN */');
var end = sw.indexOf('/* STAMP:END */');
if (begin === -1 || end === -1) {
  console.error('sw.js is missing its STAMP:BEGIN / STAMP:END markers.');
  process.exit(1);
}
var block =
  '/* STAMP:BEGIN */\n' +
  "var VERSION = '" + version + "';\n" +
  'var PRECACHE = [\n' +
  precache.map(function (p) {
    return "  '" + p + "'";
  }).join(',\n') +
  '\n];\n';
var nextSw = sw.slice(0, begin) + block + sw.slice(end);

var versionPath = join(root, 'js/version.js');
var currentVersionJs = existsSync(versionPath) ? readFileSync(versionPath, 'utf8') : '';

if (check) {
  if (nextSw !== sw || versionJs !== currentVersionJs) {
    console.error('sw.js or js/version.js is out of date. Run: node tools/stamp.mjs');
    process.exit(1);
  }
  console.log('Up to date (' + version + ', ' + precache.length + ' entries).');
} else {
  writeFileSync(versionPath, versionJs);
  writeFileSync(swPath, nextSw);
  console.log('Stamped ' + version + ' with ' + precache.length + ' cached entries.');
}
