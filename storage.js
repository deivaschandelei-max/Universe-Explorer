/*
 * Local-only storage. Everything lives in one JSON document in localStorage.
 * If localStorage is blocked (some private modes), data is kept in memory
 * for the current visit and persistent() returns false.
 */

var KEY = 'ue:data';
export var SCHEMA = 1;
export var APP_ID = 'universe-explorer';

var MOTION_VALUES = ['auto', 'reduce', 'full'];
var MAX_IMPORT_CHARS = 500000;
var BLOCKED_KEYS = ['__proto__', 'constructor', 'prototype'];

var data = null;
var persistent = true;

function blank() {
  return {
    app: APP_ID,
    schema: SCHEMA,
    createdAt: new Date().toISOString(),
    settings: { motion: 'auto' },
    progress: {}
  };
}

function readRaw() {
  try {
    return window.localStorage.getItem(KEY);
  } catch (err) {
    persistent = false;
    return null;
  }
}

function writeRaw(text) {
  try {
    window.localStorage.setItem(KEY, text);
    persistent = true;
    return true;
  } catch (err) {
    persistent = false;
    return false;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/* Build a clean document from untrusted input, or return an error string. */
function sanitize(input) {
  if (!isPlainObject(input)) return { error: 'This file is not a Universe Explorer backup.' };
  if (input.app !== APP_ID) return { error: 'This file is not a Universe Explorer backup.' };
  if (typeof input.schema !== 'number' || input.schema < 1) {
    return { error: 'This backup has no version number.' };
  }
  if (input.schema > SCHEMA) {
    return { error: 'This backup comes from a newer version of the app. Update the app and try again.' };
  }

  var clean = blank();
  if (typeof input.createdAt === 'string' && input.createdAt.length < 40) {
    clean.createdAt = input.createdAt;
  }

  if (isPlainObject(input.settings) && MOTION_VALUES.indexOf(input.settings.motion) !== -1) {
    clean.settings.motion = input.settings.motion;
  }

  if (input.progress !== undefined) {
    if (!isPlainObject(input.progress)) return { error: 'The progress section of this backup is damaged.' };
    var keys = Object.keys(input.progress);
    if (keys.length > 500) return { error: 'This backup holds more progress entries than expected.' };
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (BLOCKED_KEYS.indexOf(key) !== -1 || key.length > 80) continue;
      clean.progress[key] = JSON.parse(JSON.stringify(input.progress[key]));
    }
  }
  return { value: clean };
}

export function load() {
  if (data) return data;
  var raw = readRaw();
  if (raw) {
    try {
      var result = sanitize(JSON.parse(raw));
      if (result.value) {
        data = result.value;
        return data;
      }
    } catch (err) {
      /* fall through to a fresh document */
    }
  }
  data = blank();
  return data;
}

function save() {
  return writeRaw(JSON.stringify(load()));
}

export function isPersistent() {
  load();
  return persistent;
}

export function getMotion() {
  return load().settings.motion;
}

export function setMotion(value) {
  if (MOTION_VALUES.indexOf(value) === -1) return;
  load().settings.motion = value;
  save();
}

export function getProgress(moduleId) {
  var value = load().progress[moduleId];
  return value === undefined ? null : JSON.parse(JSON.stringify(value));
}

export function setProgress(moduleId, value) {
  if (BLOCKED_KEYS.indexOf(moduleId) !== -1) return;
  load().progress[moduleId] = JSON.parse(JSON.stringify(value));
  save();
}

export function exportJSON() {
  var doc = JSON.parse(JSON.stringify(load()));
  doc.exportedAt = new Date().toISOString();
  return JSON.stringify(doc, null, 2);
}

/* Replace all data with the contents of a backup. Returns { ok, message }. */
export function importJSON(text) {
  if (typeof text !== 'string' || text.length > MAX_IMPORT_CHARS) {
    return { ok: false, message: 'This file is too large to be a backup.' };
  }
  var parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return { ok: false, message: 'This file is not valid JSON.' };
  }
  var result = sanitize(parsed);
  if (!result.value) return { ok: false, message: result.error };
  data = result.value;
  save();
  return { ok: true, message: 'Backup restored.' };
}

export function reset() {
  data = blank();
  try {
    window.localStorage.removeItem(KEY);
  } catch (err) {
    persistent = false;
  }
}
