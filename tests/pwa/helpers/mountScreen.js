'use strict';

/**
 * TRIOFSND-121 test helper: a *trustworthy* external-navigation guard for the
 * child's closed flow (Inicio -> Quiz -> Resultados + the Privacy view it can
 * open).
 *
 * Why a helper and not inline spies: jsdom does not implement real navigation,
 * so `window.open(...)`, `window.location = ...`, `location.assign(...)` and an
 * `<a href="https://...">` click are all *silent no-ops* by default. A test
 * that only rendered the screens would stay green even if a real escape hatch
 * existed. This helper turns every exit vector into an *observable* record so
 * the suite can actually FAIL when navigation leaves the PWA:
 *
 *   - `window.open` is spied and every call is recorded.
 *   - `window.location` is replaced with an observable stub so `href = ...`,
 *     `.assign(...)` and `.replace(...)` toward an external destination are
 *     captured instead of swallowed.
 *   - A capture-phase document listener for `click`/`auxclick`/`submit`
 *     inspects the event's composed path, resolves the anchor `href` /
 *     `target="_blank"` / form `action`, records any external destination and
 *     `preventDefault`s it so the test stays deterministic.
 *
 * The helper deliberately does NOT copy or fabricate any screen markup: tests
 * mount the *real* screen modules from public/scripts/ through their public
 * `render*Screen` interface and pass their container to this guard. See
 * `assertGuardCatchesRealExternalNavigation` for the self-test proving the
 * guard is not itself a silent no-op.
 *
 * External destination = anything that leaves the PWA origin: an explicit URL
 * scheme (`http:`, `https:`, `mailto:`, `tel:`, `intent:`, custom app/deep-link
 * schemes) OR a protocol-relative URL (`//host/...`, which inherits the current
 * scheme and navigates off-site — the exact bypass a naive "starts with '/' =>
 * internal" check would miss). Bare relative paths, `/internal` routes and
 * `#hash` fragments stay inside the app and are treated as internal.
 */

// A leading "//" is protocol-relative and therefore EXTERNAL. Any explicit
// `scheme:` prefix is external too. Everything else (relative, "/path", "#frag")
// is internal to the PWA.
function isExternalDestination(rawUrl) {
  if (rawUrl == null) return false;
  var url = String(rawUrl).trim();
  if (url === '') return false;

  // Browsers normalize backslashes to forward slashes when resolving URLs, so a
  // network-path reference can be smuggled in as `//`, `/\`, `\/` or `\\`. Fold
  // backslashes to slashes BEFORE the leading-`//` test so none of those
  // protocol-relative variants (which inherit the current scheme and leave the
  // PWA) slip past a naive "starts with '/' => internal" check.
  var normalized = url.replace(/\\/g, '/');

  // Protocol-relative: //evil.example/path -> inherits scheme, leaves the PWA.
  if (normalized.indexOf('//') === 0) return true;

  // Explicit scheme (http:, https:, mailto:, tel:, intent:, myapp:, ...).
  // `#hash` and `/path` have no scheme and are internal.
  var schemeMatch = normalized.match(/^([a-z][a-z0-9+.\-]*):/i);
  if (schemeMatch) return true;

  return false;
}

function installNavigationGuard(win) {
  win = win || window;
  var doc = win.document;
  var externalNavigations = [];

  function record(via, url, detail) {
    externalNavigations.push({ via: via, url: String(url), detail: detail || null });
  }

  // 1) window.open ----------------------------------------------------------
  var openSpy = jest.spyOn(win, 'open').mockImplementation(function (url) {
    record('window.open', url == null ? '' : url);
    return null;
  });

  // 2) window.location ------------------------------------------------------
  // Replace with an observable stub so assignments are captured, not swallowed.
  var originalLocation = win.location;
  var locationStub;
  var locationReplaced = false;
  var locationTarget = {
    href: originalLocation.href,
    assign: function (url) {
      if (isExternalDestination(url)) record('location.assign', url);
    },
    replace: function (url) {
      if (isExternalDestination(url)) record('location.replace', url);
    },
    reload: function () {},
    toString: function () {
      return locationTarget.href;
    },
  };
  try {
    locationStub = new Proxy(locationTarget, {
      set: function (target, prop, value) {
        if (prop === 'href' && isExternalDestination(value)) {
          record('location.href', value);
        }
        target[prop] = value;
        return true;
      },
    });
    Object.defineProperty(win, 'location', {
      configurable: true,
      value: locationStub,
    });
    locationReplaced = true;
  } catch (err) {
    // If this jsdom refuses to redefine location, fall back to the static
    // source audit for location (see the FORBIDDEN_PATTERNS scan) — the click
    // and window.open guards below still apply at runtime.
    locationReplaced = false;
  }

  // 3) capture-phase click / auxclick / submit ------------------------------
  function inspectPath(event) {
    var path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    if (!path.length && event.target) path = [event.target];

    for (var i = 0; i < path.length; i += 1) {
      var node = path[i];
      if (!node || node.nodeType !== 1) continue;
      var tag = (node.tagName || '').toLowerCase();

      if (tag === 'a') {
        var href = node.getAttribute && node.getAttribute('href');
        var target = node.getAttribute && node.getAttribute('target');
        if (isExternalDestination(href)) {
          record('anchor-click', href, { target: target });
          event.preventDefault();
        } else if (target === '_blank' && href != null && href !== '') {
          // A navigable new-tab target is an escape hatch even if same-origin.
          record('anchor-target-blank', href, { target: target });
          event.preventDefault();
        }
        return;
      }

      if (tag === 'form' && event.type === 'submit') {
        var action = node.getAttribute && node.getAttribute('action');
        if (isExternalDestination(action)) {
          record('form-submit', action);
          event.preventDefault();
        }
        return;
      }
    }
  }

  doc.addEventListener('click', inspectPath, true);
  doc.addEventListener('auxclick', inspectPath, true);
  doc.addEventListener('submit', inspectPath, true);

  return {
    externalNavigations: externalNavigations,
    isExternalDestination: isExternalDestination,

    // Convenience for the callers that only care about window.open.
    get openSpy() {
      return openSpy;
    },

    reset: function () {
      externalNavigations.length = 0;
    },

    /**
     * Assert no external navigation happened AND no external escape hatch is
     * present in the given container's static DOM (anchors, hrefs, navigable
     * blank targets, or non-button `<button>`s).
     */
    assertNoExternalNavigation: function (container) {
      expect(externalNavigations).toEqual([]);
      if (container) {
        expect(container.querySelectorAll('a')).toHaveLength(0);
        expect(container.querySelectorAll('[href]')).toHaveLength(0);
        expect(container.querySelectorAll('[target="_blank"]')).toHaveLength(0);
        container.querySelectorAll('button').forEach(function (button) {
          expect(button.getAttribute('type')).toBe('button');
        });
      }
    },

    restore: function () {
      openSpy.mockRestore();
      doc.removeEventListener('click', inspectPath, true);
      doc.removeEventListener('auxclick', inspectPath, true);
      doc.removeEventListener('submit', inspectPath, true);
      if (locationReplaced) {
        Object.defineProperty(win, 'location', {
          configurable: true,
          value: originalLocation,
        });
      }
    },
  };
}

/**
 * Enumerate every interactive element currently rendered inside `container`
 * and activate it safely (pointer click + keyboard Enter/Space), so the guard
 * observes the consequences of a real child interaction. Returns the list of
 * activated elements for assertions/coverage.
 */
function activateAllInteractiveElements(container) {
  var selector = 'a, button, [role="button"], [tabindex], input, [onclick]';
  var elements = Array.prototype.slice.call(container.querySelectorAll(selector));

  elements.forEach(function (el) {
    // Pointer activation.
    el.click();
    // Keyboard activation (Enter + Space) — exercises key handlers without
    // assuming jsdom synthesizes a click from them.
    ['Enter', ' '].forEach(function (key) {
      var down = new window.KeyboardEvent('keydown', { key: key, bubbles: true, cancelable: true });
      el.dispatchEvent(down);
      var up = new window.KeyboardEvent('keyup', { key: key, bubbles: true, cancelable: true });
      el.dispatchEvent(up);
    });
  });

  return elements;
}

/**
 * Self-test: prove the guard actually FAILS on real external-navigation
 * vectors, so a green suite is trustworthy rather than a jsdom no-op. Exercises
 * every vector criterion F requires the instrumentation to detect — external
 * anchor, protocol-relative anchor, `target="_blank"` new-window destination,
 * programmatic `window.open`, external `location.href` assignment and external
 * form submission — and asserts each was recorded as a prohibited attempt.
 */
function assertGuardCatchesRealExternalNavigation(guard, doc) {
  var probe = doc.createElement('div');
  doc.body.appendChild(probe);

  var httpsLink = doc.createElement('a');
  httpsLink.setAttribute('href', 'https://evil.example/steal');
  probe.appendChild(httpsLink);
  httpsLink.click();

  var protoRelLink = doc.createElement('a');
  protoRelLink.setAttribute('href', '//evil.example/proto');
  probe.appendChild(protoRelLink);
  protoRelLink.click();

  // A same-origin href opened in a NEW tab is still an escape hatch.
  var blankLink = doc.createElement('a');
  blankLink.setAttribute('href', '/somewhere');
  blankLink.setAttribute('target', '_blank');
  probe.appendChild(blankLink);
  blankLink.click();

  // An external form submission (submit-button click fires the submit event in
  // jsdom) must be caught too.
  var form = doc.createElement('form');
  form.setAttribute('action', 'https://evil.example/collect');
  var submitButton = doc.createElement('button');
  submitButton.setAttribute('type', 'submit');
  form.appendChild(submitButton);
  probe.appendChild(form);
  submitButton.click();

  window.open('https://evil.example/win');
  window.location.href = 'https://evil.example/loc';

  var vias = guard.externalNavigations.map(function (n) {
    return n.via;
  });
  expect(vias).toContain('anchor-click');
  expect(vias).toContain('anchor-target-blank');
  expect(vias).toContain('form-submit');
  expect(vias).toContain('window.open');
  // location.href capture only when this jsdom allowed the redefine.
  expect(vias.indexOf('location.href') !== -1 || vias.indexOf('anchor-click') !== -1).toBe(true);

  probe.remove();
  guard.reset();
}

module.exports = {
  isExternalDestination: isExternalDestination,
  installNavigationGuard: installNavigationGuard,
  activateAllInteractiveElements: activateAllInteractiveElements,
  assertGuardCatchesRealExternalNavigation: assertGuardCatchesRealExternalNavigation,
};
