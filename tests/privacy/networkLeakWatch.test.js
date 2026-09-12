'use strict';

/**
 * Self-tests for the shared leak/comms watcher (tests/privacy/support/networkLeakWatch.js).
 *
 * TRIOFSND-304 rework: the previous jsdom watcher (still visible in
 * tests/pwa/nickname-flow.test.js's "privacidad" describe block) only
 * serialized a jest mock's `.mock.calls` -- so a payload carried inside a
 * `fetch(new Request(url, { body }))` call never showed up (the body lives
 * on the Request object, not on `init`), and the suite passed despite a real
 * leak. Every test here is isolated from tests/privacy/nickname-privacy-flow.js's
 * real product scenario: the deliberately-poisoned requests below exist only
 * to prove the detector itself works, and never run alongside (or pollute)
 * the zero-leak product assertions.
 */

const {
  install,
  restore,
  settle,
  getRecords,
  wrapFetch,
  containsValue,
  stringContainsValue,
} = require('./support/networkLeakWatch');

/** A minimal Request-shaped double: exposes `.url`/`.method`/`.headers`/`.clone()`/`.text()` exactly like a real Fetch API `Request`, without depending on a global `Request` constructor (jsdom defines none). `.clone()` returns an independent instance with its own body-consumption state, mirroring how a real Request's body stream is `tee()`d. */
function makeFakeRequest(url, init) {
  init = init || {};
  let bodyConsumed = false;
  const bodyText = init.body === undefined ? '' : String(init.body);

  return {
    url,
    method: init.method || 'GET',
    headers: init.headers || {},
    clone() {
      return makeFakeRequest(url, init);
    },
    text() {
      if (bodyConsumed) {
        return Promise.reject(new Error('fake Request body already consumed'));
      }
      bodyConsumed = true;
      return Promise.resolve(bodyText);
    },
  };
}

describe('networkLeakWatch: pruebas del propio detector (aisladas del escenario real)', () => {
  afterEach(() => {
    // Runs even when an assertion above throws (afterEach always fires),
    // so a failed self-test can never leave fetch/XHR/sendBeacon patched.
    restore();
  });

  test('control positivo: un payload inocuo conocido se registra tal cual (la vigilancia no aprueba por no observar nada)', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    install();

    await fetch('/telemetry?x=1', { method: 'POST', body: 'HARMLESS_SENTINEL_7Q' }).catch(() => {});
    await settle();

    expect(containsValue('HARMLESS_SENTINEL_7Q')).toBe(true);
    const records = getRecords();
    expect(records.some((record) => record.transport === 'fetch' && record.method === 'POST')).toBe(true);
  });

  test('fuga deliberada vía fetch(new Request(..., { body })): se detecta el cuerpo aunque viaje dentro del propio objeto Request', async () => {
    install();
    const leakyRequest = makeFakeRequest('/leak-attempt', {
      method: 'POST',
      body: JSON.stringify({ note: 'LEAKY_NICKNAME_9F2X' }),
    });

    await fetch(leakyRequest).catch(() => {});
    await settle();

    expect(containsValue('LEAKY_NICKNAME_9F2X')).toBe(true);

    // The original Request handed to fetch() must stay fully readable
    // afterward -- proving the watcher read a CLONE, not the original.
    await expect(leakyRequest.text()).resolves.toContain('LEAKY_NICKNAME_9F2X');
  });

  test('sin esperar settle(), una lectura de cuerpo todavía pendiente no puede leerse como "sin fuga" (falso aprobado)', async () => {
    install();
    const leakyRequest = makeFakeRequest('/leak-attempt-async', {
      method: 'POST',
      body: 'PENDING_BODY_LEAK_4K1',
    });

    const fetchPromise = fetch(leakyRequest).catch(() => {});
    // Deliberately NOT awaiting settle() yet: the record exists, but its
    // async body read may still be in flight.
    const stillPendingRecord = getRecords().find((record) => record.url === '/leak-attempt-async');
    expect(stillPendingRecord).toBeDefined();

    await fetchPromise;
    await settle();

    expect(containsValue('PENDING_BODY_LEAK_4K1')).toBe(true);
  });

  test('cobertura de XMLHttpRequest: método, URL, cabeceras y cuerpo enviados vía xhr.send se registran', async () => {
    install();

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/xhr-leak?q=1');
    xhr.setRequestHeader('X-Test', 'XHR_HEADER_LEAK_2Z');
    xhr.send('XHR_BODY_LEAK_2Z');

    expect(containsValue('XHR_BODY_LEAK_2Z')).toBe(true);
    expect(containsValue('XHR_HEADER_LEAK_2Z')).toBe(true);
  });

  test('cobertura de navigator.sendBeacon cuando está disponible en el entorno', () => {
    const hadSendBeacon = typeof navigator.sendBeacon === 'function';
    if (!hadSendBeacon) {
      // Documented per AC: "no se exige interceptar APIs que no existan ni
      // se utilicen en el producto" -- this jsdom environment does not
      // implement sendBeacon at all (confirmed: typeof === 'undefined').
      navigator.sendBeacon = () => true;
    }

    install();
    navigator.sendBeacon('/beacon-leak', 'BEACON_BODY_LEAK_3Y');

    expect(containsValue('BEACON_BODY_LEAK_3Y')).toBe(true);
    restore();

    if (!hadSendBeacon) {
      delete navigator.sendBeacon;
    }
  });

  test('normalización compleja: URLSearchParams, FormData y Blob se leen igual de bien que un string plano', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    install();

    await fetch('/params-leak', { method: 'POST', body: new URLSearchParams({ nombre: 'PARAMS_LEAK_A1' }) }).catch(
      () => {}
    );

    const form = new FormData();
    form.append('nombre', 'FORMDATA_LEAK_B2');
    await fetch('/formdata-leak', { method: 'POST', body: form }).catch(() => {});

    await fetch('/blob-leak', { method: 'POST', body: new Blob(['BLOB_LEAK_C3'], { type: 'text/plain' }) }).catch(
      () => {}
    );

    await settle();

    expect(containsValue('PARAMS_LEAK_A1')).toBe(true);
    expect(containsValue('FORMDATA_LEAK_B2')).toBe(true);
    expect(containsValue('BLOB_LEAK_C3')).toBe(true);
  });

  test('wrapFetch instrumenta una función fetch inyectada explícitamente (no solo global.fetch) sin alterar su resultado', async () => {
    const innerFetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ ok: true }) });
    const watchedFetch = wrapFetch(innerFetch);

    const result = await watchedFetch('/injected?token=INJECTED_LEAK_5W', { method: 'GET' });

    expect(await result.json()).toEqual({ ok: true });
    expect(innerFetch).toHaveBeenCalledTimes(1);
    expect(containsValue('INJECTED_LEAK_5W')).toBe(true);
  });

  test('la comparación detecta variantes recortadas, URL-encoded, JSON-escaped y con mayúsculas distintas, incrustadas dentro de una cadena mayor', () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    install();

    const secret = '  Zaphod "Q" Rex  ';
    const trimmed = secret.trim();

    // Embedded inside a larger JSON body, case-flipped, quotes escaped.
    return Promise.all([
      fetch('/case-leak', { method: 'POST', body: JSON.stringify({ note: `prefix-${trimmed.toUpperCase()}-suffix` }) }),
      fetch(`/query-leak?nombre=${encodeURIComponent(trimmed)}`),
      fetch('/plain-json-leak', { method: 'POST', body: JSON.stringify({ nombre: trimmed }) }),
    ])
      .catch(() => {})
      .then(async () => {
        await settle();
        expect(containsValue(secret)).toBe(true);
      });
  });

  test('un valor que realmente no aparece en ninguna superficie no produce un falso positivo', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    install();

    await fetch('/unrelated', { method: 'POST', body: JSON.stringify({ other: 'nothing-to-see-here' }) }).catch(
      () => {}
    );
    await settle();

    expect(containsValue('TotallyUnrelatedNickname99')).toBe(false);
  });

  test('restore() devuelve fetch/XMLHttpRequest/sendBeacon a sus originales, incluso tras una aserción fallida previa', async () => {
    const originalFetch = global.fetch;
    const originalXhrOpen = XMLHttpRequest.prototype.open;

    install();
    expect(global.fetch).not.toBe(originalFetch);
    expect(XMLHttpRequest.prototype.open).not.toBe(originalXhrOpen);

    restore();

    expect(global.fetch).toBe(originalFetch);
    expect(XMLHttpRequest.prototype.open).toBe(originalXhrOpen);
  });

  test('stringContainsValue es reutilizable de forma independiente (para buzones de llamadas ya serializados, no solo para records propios)', () => {
    const serializedMockCalls = JSON.stringify([[{ event: 'gameStarted', meta: { nombreDelJugador: 'RexEmbebido' } }]]);
    expect(stringContainsValue(serializedMockCalls, 'RexEmbebido')).toBe(true);
    expect(stringContainsValue(serializedMockCalls, 'rexembebido')).toBe(true);
    expect(stringContainsValue(serializedMockCalls, 'NoEstaAqui')).toBe(false);
  });
});
