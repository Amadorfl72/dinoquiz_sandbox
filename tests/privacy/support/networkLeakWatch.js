'use strict';

/**
 * Shared network/egress leak-detection helper for the privacy test suite
 * (tests/privacy/*.test.js). Not a test itself -- jest's testMatch only
 * picks up `*.test.js`, so this plain module can be `require`d by every
 * privacy test without being collected as an (empty) suite of its own.
 *
 * Design notes (TRIOFSND-304 rework -- "Qué salió mal antes"):
 *
 * - `fetch(url, init)` and `fetch(request)` are BOTH normalized into the
 *   same record shape. A `Request`-shaped first argument is detected by
 *   duck-typing (`clone`/`text`/`url`), not `instanceof Request` -- jsdom
 *   does not define a global `Request`/`fetch`, so tests that want to
 *   exercise the `fetch(Request)` path hand in their own Request-shaped
 *   object (or a real one, in a real-fetch environment); either is
 *   detected identically.
 * - The body of a Request-shaped argument is read off a *clone*
 *   (`input.clone().text()`), never the original -- the original stays
 *   fully readable by whatever code (the app, or the delegated-to real
 *   fetch) consumes it next.
 * - Every body read that has to happen asynchronously (a Request/Response
 *   clone, a Blob) is tracked in a pending-promises list; `settle()` must
 *   be awaited before any assertion runs, or a still-pending/empty
 *   capture could read as "no leak" simply because nothing finished yet.
 * - `wrapFetch(fn)` lets a test instrument a fetch-like function that is
 *   passed as an explicit argument (e.g. `renderHome(doc, renderer,
 *   fetchFn)`) instead of read off `global.fetch` -- DinoQuiz's own screens
 *   are always called with an injected fetch function, so watching only
 *   `global.fetch` would observe nothing in that real code path. Records
 *   from `wrapFetch` land in the exact same shared list as `install()`'s.
 */

let records = [];
let pending = [];
let installed = false;
let originals = null;

function isRequestLike(input) {
  return (
    !!input &&
    typeof input === 'object' &&
    typeof input.clone === 'function' &&
    typeof input.text === 'function' &&
    typeof input.url === 'string'
  );
}

function headersToEntries(headersLike) {
  if (!headersLike) return [];
  if (typeof headersLike.forEach === 'function' && typeof headersLike.get === 'function') {
    // Headers-like (real Headers instance, or anything duck-typed the same way).
    const out = [];
    headersLike.forEach((value, key) => out.push([String(key), String(value)]));
    return out;
  }
  if (Array.isArray(headersLike)) {
    return headersLike.map(([key, value]) => [String(key), String(value)]);
  }
  if (typeof headersLike === 'object') {
    return Object.keys(headersLike).map((key) => [key, String(headersLike[key])]);
  }
  return [];
}

function splitUrl(rawUrl) {
  const url = String(rawUrl == null ? '' : rawUrl);
  const queryIndex = url.indexOf('?');
  return { url, query: queryIndex === -1 ? '' : url.slice(queryIndex + 1) };
}

/** Reads a Blob's text via FileReader -- jsdom's `Blob` (unlike a real browser's or Node's) does not implement the newer `.text()` method. */
function readBlobAsText(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
    reader.readAsText(blob);
  });
}

function readAsyncBodyInto(record, source) {
  const textPromise =
    typeof Blob !== 'undefined' && source instanceof Blob && typeof source.text !== 'function'
      ? readBlobAsText(source)
      : Promise.resolve().then(() => source.text());

  const promise = textPromise
    .then((text) => {
      record.body = text;
    })
    .catch(() => {
      record.body = '<unreadable body>';
    });
  pending.push(promise);
}

/** Normalizes every body shape `fetch`/XHR/`sendBeacon` accept into a searchable string, on `record.body`. Async-only shapes (Blob) are queued into `pending`. */
function normalizeBodyInto(record, body) {
  if (body === undefined || body === null) {
    record.body = '';
    return;
  }
  if (typeof body === 'string') {
    record.body = body;
    return;
  }
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
    record.body = body.toString();
    return;
  }
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const parts = [];
    body.forEach((value, key) => parts.push(`${key}=${value}`));
    record.body = parts.join('&');
    return;
  }
  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    record.body = '';
    readAsyncBodyInto(record, body);
    return;
  }
  if (typeof body.text === 'function') {
    // Any other body-bearing object exposing an async .text() reader.
    record.body = '';
    readAsyncBodyInto(record, body);
    return;
  }
  try {
    record.body = JSON.stringify(body);
  } catch (error) {
    record.body = String(body);
  }
}

function buildFetchRecord(input, init) {
  const record = { transport: 'fetch', method: 'GET', url: '', query: '', headers: [], body: '' };

  if (isRequestLike(input)) {
    record.method = input.method || 'GET';
    Object.assign(record, splitUrl(input.url));
    record.headers = headersToEntries(input.headers);
    // Read the CLONE's body, never the original's -- the original must stay
    // fully readable by whatever this call delegates to next (the app / the
    // real network stack), see this module's doc comment.
    readAsyncBodyInto(record, input.clone());
    return record;
  }

  const initObj = init || {};
  record.method = initObj.method || 'GET';
  Object.assign(record, splitUrl(typeof input === 'string' ? input : String(input)));
  record.headers = headersToEntries(initObj.headers);
  normalizeBodyInto(record, initObj.body);
  return record;
}

/** Wraps an arbitrary fetch-like function (e.g. one injected into a screen as `fetchFn`) so every call it makes lands in this module's shared, searchable record list -- without touching `global.fetch`. */
function wrapFetch(fetchImpl) {
  return function watchedFetch(input, init) {
    const record = buildFetchRecord(input, init);
    records.push(record);
    return fetchImpl.apply(this, arguments);
  };
}

function install() {
  if (installed) {
    throw new Error('networkLeakWatch: install() called while already installed -- call restore() first.');
  }
  records = [];
  pending = [];
  originals = {};
  installed = true;

  const target = typeof window !== 'undefined' ? window : global;

  // fetch -- patched even when absent (jsdom defines no `fetch` by default)
  // so a test that assigns `global.fetch` *before* calling install() still
  // gets it wrapped, and one that never touches fetch is unaffected.
  originals.hadFetch = typeof target.fetch === 'function';
  originals.fetch = originals.hadFetch ? target.fetch : undefined;
  const delegateFetch =
    originals.fetch ||
    function stubFetch() {
      return Promise.reject(new Error('networkLeakWatch: no real fetch implementation was installed'));
    };
  const watched = wrapFetch(delegateFetch);
  target.fetch = watched;
  global.fetch = watched;

  // XMLHttpRequest -- guarded, per AC: only instrumented when present.
  const XHR = target.XMLHttpRequest || (typeof XMLHttpRequest !== 'undefined' ? XMLHttpRequest : undefined);
  if (XHR && XHR.prototype) {
    originals.XHR = XHR;
    originals.xhrOpen = XHR.prototype.open;
    originals.xhrSend = XHR.prototype.send;
    originals.xhrSetRequestHeader = XHR.prototype.setRequestHeader;

    XHR.prototype.open = function watchedOpen(method, url) {
      this.__networkLeakWatchRecord = Object.assign(
        { transport: 'xhr', method: String(method || 'GET'), headers: [], body: '' },
        splitUrl(url)
      );
      return originals.xhrOpen.apply(this, arguments);
    };
    XHR.prototype.setRequestHeader = function watchedSetRequestHeader(name, value) {
      if (this.__networkLeakWatchRecord) {
        this.__networkLeakWatchRecord.headers.push([String(name), String(value)]);
      }
      return originals.xhrSetRequestHeader.apply(this, arguments);
    };
    XHR.prototype.send = function watchedSend(body) {
      const record = this.__networkLeakWatchRecord;
      if (record) {
        normalizeBodyInto(record, body);
        records.push(record);
      }
      return originals.xhrSend.apply(this, arguments);
    };
  }

  // navigator.sendBeacon -- guarded, per AC: only instrumented when present.
  const nav = target.navigator || (typeof navigator !== 'undefined' ? navigator : undefined);
  if (nav && typeof nav.sendBeacon === 'function') {
    originals.navigator = nav;
    originals.sendBeacon = nav.sendBeacon;
    nav.sendBeacon = function watchedSendBeacon(url, data) {
      const record = Object.assign({ transport: 'sendBeacon', method: 'POST', headers: [], body: '' }, splitUrl(url));
      normalizeBodyInto(record, data);
      records.push(record);
      return originals.sendBeacon.call(this, url, data);
    };
  }

  return { getRecords, settle, restore, containsValue };
}

/** Awaits every async body read queued so far, draining any new ones a read might itself have queued, so a still-pending capture can never read as "no leak found". */
async function settle() {
  let previousLength = -1;
  while (pending.length !== previousLength) {
    previousLength = pending.length;
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(pending.slice());
  }
}

function getRecords() {
  return records.slice();
}

function restore() {
  if (installed && originals) {
    const target = typeof window !== 'undefined' ? window : global;

    if (originals.hadFetch) {
      target.fetch = originals.fetch;
      global.fetch = originals.fetch;
    } else {
      delete target.fetch;
      delete global.fetch;
    }

    if (originals.XHR) {
      originals.XHR.prototype.open = originals.xhrOpen;
      originals.XHR.prototype.send = originals.xhrSend;
      originals.XHR.prototype.setRequestHeader = originals.xhrSetRequestHeader;
    }

    if (originals.navigator) {
      originals.navigator.sendBeacon = originals.sendBeacon;
    }
  }

  installed = false;
  originals = null;
  records = [];
  pending = [];
}

/** Every representation of `value` a leak could plausibly take on the wire: the literal, its trimmed form, both lower-cased, URL-encoded, and JSON-escaped (a string value embedded inside a serialized object/query). */
function buildValueVariants(value) {
  const raw = String(value == null ? '' : value);
  const trimmed = raw.trim();
  const variants = new Set([raw, trimmed]);
  variants.add(encodeURIComponent(trimmed));
  try {
    variants.add(JSON.stringify(trimmed).slice(1, -1));
  } catch (error) {
    // Non-serializable input (shouldn't happen for a string secret) -- skip.
  }
  return Array.from(variants)
    .filter((variant) => variant.length > 0)
    .map((variant) => variant.toLowerCase());
}

/** Case-insensitive substring search for `value` (or any of its leak variants) inside an arbitrary haystack string -- finds it embedded within a larger string/serialized structure, not just an exact match. */
function stringContainsValue(haystack, value) {
  const lowerHaystack = String(haystack == null ? '' : haystack).toLowerCase();
  return buildValueVariants(value).some((variant) => lowerHaystack.includes(variant));
}

function serializeRecord(record) {
  return [
    record.transport,
    record.method,
    record.url,
    record.query,
    record.headers.map(([key, val]) => `${key}:${val}`).join(';'),
    record.body,
  ].join(' ');
}

/** Every captured record whose serialized method/url/query/headers/body contains `value` (or a leak variant). */
function findLeaks(value, recordsToSearch) {
  const target = recordsToSearch || records;
  return target.filter((record) => stringContainsValue(serializeRecord(record), value));
}

function containsValue(value, recordsToSearch) {
  return findLeaks(value, recordsToSearch).length > 0;
}

module.exports = {
  install,
  restore,
  settle,
  getRecords,
  wrapFetch,
  containsValue,
  findLeaks,
  buildValueVariants,
  stringContainsValue,
};
