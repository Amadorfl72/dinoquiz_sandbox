'use strict';

/**
 * Launch-gate status screen (TRIOFSND-325): an adult/QA-only view of whether
 * the current candidate version can ship -- every gate `src/services/
 * launchGate.js` evaluates (verde/ámbar/rojo, always paired with text, per
 * PRD "ningún estado puede comunicarse únicamente mediante color"), the
 * candidate app version, SW_VERSION and precache status, and whether each
 * PRD product goal (`src/services/productGoals.js`) has been reviewed and
 * approved. Reachable only via the hidden `#/gates-lanzamiento` hash route
 * (see public/scripts/main.js), the same pattern as `DIAGNOSTICS_HASH` --
 * there is no visible link to it from Home or the mode selector.
 *
 * Two different data sources feed this screen, because they have two
 * different shapes of "liveness":
 *
 *  - Gates are a property of the shipped CODE/DATA, identical on every
 *    device running a given release -- `evaluateLaunchGates()` alone pulls
 *    in ~15 further `src/data|game|theme` modules that have no browser
 *    bridge (no bundler, so re-deriving all of that in the browser a second
 *    time would duplicate -- and risk drifting from -- the one real rule
 *    each gate already tests). So, like SW_VERSION itself, the gates report
 *    is precomputed once at release time by
 *    `scripts/generateLaunchGateReport.js` into
 *    `public/data/launchGateReport.json`, which `main.js`'s `renderLaunchGate`
 *    fetches and passes in as `options.gatesReport`/`options.candidateVersion`
 *    before this screen ever renders. Under Node/Jest, `resolveGatesReport`
 *    below still falls back to calling `evaluateLaunchGates()` live via
 *    `require` when no `options.gatesReport` was supplied (e.g. this
 *    screen's own tests).
 *  - Product goals are genuine per-device runtime state (approved via
 *    localStorage), so they ARE read live in the browser, through
 *    `productGoals.js`'s real dual CommonJS/`window.DinoQuiz.services.
 *    productGoals` bridge (public/scripts/productGoals.js), the same
 *    pattern public/scripts/offlineStatus.js already uses for SW_VERSION/
 *    precache status.
 *
 * Every data source can also be overridden through `options` so tests
 * exercise the rendering with plain fixtures instead of these services.
 */

(function () {
  function resolveDefaultStrings(locale) {
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(locale || i18n.DEFAULT_LOCALE).launchGate;
    }
    return null;
  }

  function resolveLaunchGateService(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    if (win && win.DinoQuiz && win.DinoQuiz.services && win.DinoQuiz.services.launchGate) {
      return win.DinoQuiz.services.launchGate;
    }
    if (typeof require === 'function') {
      return require('../../src/services/launchGate');
    }
    return null;
  }

  function resolveProductGoalsService(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    if (win && win.DinoQuiz && win.DinoQuiz.services && win.DinoQuiz.services.productGoals) {
      return win.DinoQuiz.services.productGoals;
    }
    if (typeof require === 'function') {
      return require('../../src/services/productGoals');
    }
    return null;
  }

  function resolveOfflineStatusService(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    if (win && win.DinoQuiz && win.DinoQuiz.services && win.DinoQuiz.services.offlineStatus) {
      return win.DinoQuiz.services.offlineStatus;
    }
    if (typeof require === 'function') {
      return require('./offlineStatus');
    }
    return null;
  }

  /** The app's own package.json `version` field, treated as "the version currently a launch candidate". `package.json` itself isn't served under public/, so a real browser only knows this because main.js's renderLaunchGate already read it off the precomputed launch-gate report and passed it in as `options.candidateVersion`; without that (e.g. a failed fetch), this falls back to a direct Node/Jest `require`, or finally `version.unknownValue`. */
  function resolveCandidateVersion(options) {
    if (typeof options.candidateVersion !== 'undefined') {
      return options.candidateVersion;
    }
    if (typeof require === 'function') {
      try {
        return require('../../package.json').version || null;
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  function resolveSwVersion(options, offlineStatusService) {
    if (typeof options.swVersion !== 'undefined') {
      return options.swVersion;
    }
    if (offlineStatusService && typeof offlineStatusService.getSwVersion === 'function') {
      return offlineStatusService.getSwVersion();
    }
    return null;
  }

  function resolveLastPreloadAt(options, offlineStatusService) {
    if (typeof options.lastPreloadAt !== 'undefined') {
      return options.lastPreloadAt;
    }
    if (offlineStatusService && typeof offlineStatusService.getLastPreloadAt === 'function') {
      return offlineStatusService.getLastPreloadAt();
    }
    return null;
  }

  /** `options.gatesReport` (the browser path: main.js's renderLaunchGate already fetched the precomputed report and passed it in), else `{ pass, gates }` from a live `evaluateLaunchGates()` call (the Node/Jest path, when a `launchGateService` was resolved via `require`), else `null` -- the screen then renders every gate as 'unknown' instead of crashing. */
  function resolveGatesReport(options, launchGateService) {
    if (typeof options.gatesReport !== 'undefined') {
      return options.gatesReport;
    }
    if (launchGateService && typeof launchGateService.evaluateLaunchGates === 'function') {
      try {
        return launchGateService.evaluateLaunchGates();
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  /** Every `GOAL_IDS` mapped to its `{ status, target, approvedAt }` record, or `{}` when the service is unavailable or throws -- the screen then shows every goal as 'pendiente'. */
  function resolveProductGoals(options, productGoalsService) {
    if (typeof options.productGoals !== 'undefined') {
      return options.productGoals;
    }
    if (productGoalsService && typeof productGoalsService.getAllGoals === 'function') {
      try {
        return productGoalsService.getAllGoals();
      } catch (error) {
        return {};
      }
    }
    return {};
  }

  // Fixed display order, matching src/services/launchGate.js's GATE_IDS --
  // kept as a literal fallback (rather than only reading `gatesReport.gates`
  // keys) so every gate still lists as 'unknown' when the report itself
  // couldn't be produced at all (e.g. a real no-bundler browser).
  var GATE_DISPLAY_ORDER = [
    'fichas',
    'generadores',
    'resolubilidad',
    'siluetas',
    'tamanos',
    'rejillas',
    'precache',
    'offline',
    'accesibilidad',
    'regresionQuiz',
  ];

  // Fixed display order, matching src/services/productGoals.js's GOAL_IDS.
  var GOAL_DISPLAY_ORDER = ['distribucionPorModo', 'finalizacion', 'retencion7dias'];

  /** 'pass' (verde), 'fail' (rojo) or 'unknown' (ámbar) -- never inferred from color alone in the render, only ever paired with `strings.gates.statusLabels[status]`. */
  function classifyGateStatus(gate) {
    if (!gate || typeof gate.pass !== 'boolean') {
      return 'unknown';
    }
    return gate.pass ? 'pass' : 'fail';
  }

  function classifyOverallStatus(gatesReport) {
    if (!gatesReport || typeof gatesReport.pass !== 'boolean') {
      return 'unknown';
    }
    return gatesReport.pass ? 'pass' : 'fail';
  }

  function formatTimestamp(value) {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return null;
    }
    if (typeof value === 'string' && value.length === 0) {
      return null;
    }
    var date = new Date(value);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toLocaleString();
  }

  function renderDefinitionRow(doc, dl, term, description) {
    var dt = doc.createElement('dt');
    dt.textContent = term;
    var dd = doc.createElement('dd');
    dd.textContent = description;
    dl.appendChild(dt);
    dl.appendChild(dd);
  }

  function renderVersionSection(doc, strings, version) {
    var section = doc.createElement('section');
    section.className = 'launch-gate-screen__section';

    var heading = doc.createElement('h2');
    heading.id = 'launch-gate-version-heading';
    heading.textContent = strings.version.heading;
    section.setAttribute('aria-labelledby', heading.id);
    section.appendChild(heading);

    var dl = doc.createElement('dl');
    dl.className = 'launch-gate-screen__definition-list';

    renderDefinitionRow(doc, dl, strings.version.candidateVersionLabel, version.candidateVersion || strings.version.unknownValue);
    renderDefinitionRow(doc, dl, strings.version.swVersionLabel, version.swVersion || strings.version.unknownValue);
    renderDefinitionRow(
      doc,
      dl,
      strings.version.precacheStatusLabel,
      version.lastPreloadAt ? strings.version.precacheStatus.complete : strings.version.precacheStatus.pending
    );
    renderDefinitionRow(
      doc,
      dl,
      strings.version.lastPreloadLabel,
      formatTimestamp(version.lastPreloadAt) || strings.version.unknownValue
    );

    section.appendChild(dl);
    return section;
  }

  function renderGatesSection(doc, strings, gatesReport) {
    var section = doc.createElement('section');
    section.className = 'launch-gate-screen__section';

    var heading = doc.createElement('h2');
    heading.id = 'launch-gate-gates-heading';
    heading.textContent = strings.gates.heading;
    section.setAttribute('aria-labelledby', heading.id);
    section.appendChild(heading);

    var overallStatus = classifyOverallStatus(gatesReport);
    var overall = doc.createElement('p');
    overall.className = 'launch-gate-screen__overall launch-gate-screen__overall--' + overallStatus;
    overall.textContent = strings.gates.overall[overallStatus];
    section.appendChild(overall);

    var list = doc.createElement('ul');
    list.className = 'launch-gate-screen__gate-list';

    var gates = (gatesReport && gatesReport.gates) || {};
    GATE_DISPLAY_ORDER.forEach(function (gateId) {
      var status = classifyGateStatus(gates[gateId]);

      var item = doc.createElement('li');
      item.className = 'launch-gate-screen__gate-item launch-gate-screen__gate-item--' + status;

      var name = doc.createElement('span');
      name.className = 'launch-gate-screen__gate-name';
      name.textContent = strings.gates.names[gateId] || gateId;
      item.appendChild(name);

      var statusEl = doc.createElement('span');
      statusEl.className = 'launch-gate-screen__gate-status';
      statusEl.textContent = strings.gates.statusLabels[status];
      item.appendChild(statusEl);

      list.appendChild(item);
    });

    section.appendChild(list);
    return section;
  }

  function renderProductGoalsSection(doc, strings, goals) {
    var section = doc.createElement('section');
    section.className = 'launch-gate-screen__section';

    var heading = doc.createElement('h2');
    heading.id = 'launch-gate-goals-heading';
    heading.textContent = strings.productGoals.heading;
    section.setAttribute('aria-labelledby', heading.id);
    section.appendChild(heading);

    var list = doc.createElement('ul');
    list.className = 'launch-gate-screen__goal-list';

    GOAL_DISPLAY_ORDER.forEach(function (goalId) {
      var goal = goals[goalId] || { status: 'pendiente', target: null, approvedAt: null };
      var approved = goal.status === 'aprobado';

      var item = doc.createElement('li');
      item.className =
        'launch-gate-screen__goal-item launch-gate-screen__goal-item--' + (approved ? 'aprobado' : 'pendiente');

      var name = doc.createElement('span');
      name.className = 'launch-gate-screen__goal-name';
      name.textContent = strings.productGoals.names[goalId] || goalId;
      item.appendChild(name);

      var statusEl = doc.createElement('span');
      statusEl.className = 'launch-gate-screen__goal-status';
      statusEl.textContent = strings.productGoals.statusLabels[approved ? 'aprobado' : 'pendiente'];
      item.appendChild(statusEl);

      if (approved) {
        var detail = doc.createElement('span');
        detail.className = 'launch-gate-screen__goal-detail';
        var targetText = typeof goal.target === 'number' ? String(goal.target) : strings.productGoals.unknownValue;
        var approvedAtText = formatTimestamp(goal.approvedAt) || strings.productGoals.unknownValue;
        detail.textContent =
          strings.productGoals.targetLabel + ': ' + targetText + ' · ' + strings.productGoals.approvedAtLabel + ' ' + approvedAtText;
        item.appendChild(detail);
      }

      list.appendChild(item);
    });

    section.appendChild(list);
    return section;
  }

  function renderLaunchGateScreen(container, options) {
    options = options || {};
    var doc = container.ownerDocument || (typeof document !== 'undefined' ? document : undefined);
    var strings = options.strings || resolveDefaultStrings(options.locale);

    var launchGateService = options.launchGateService || resolveLaunchGateService();
    var productGoalsService = options.productGoalsService || resolveProductGoalsService();
    var offlineStatusService = options.offlineStatusService || resolveOfflineStatusService();

    var gatesReport = resolveGatesReport(options, launchGateService);
    var goals = resolveProductGoals(options, productGoalsService);
    var version = {
      candidateVersion: resolveCandidateVersion(options),
      swVersion: resolveSwVersion(options, offlineStatusService),
      lastPreloadAt: resolveLastPreloadAt(options, offlineStatusService),
    };

    container.innerHTML = '';

    var root = doc.createElement('div');
    root.className = 'launch-gate-screen';

    var backButton = doc.createElement('button');
    backButton.type = 'button';
    backButton.className = 'launch-gate-screen__back-button';
    backButton.textContent = strings.backButtonLabel;
    backButton.setAttribute('aria-label', strings.backButtonLabel);
    if (typeof options.onBack === 'function') {
      backButton.addEventListener('click', options.onBack);
    }

    var title = doc.createElement('h1');
    title.className = 'launch-gate-screen__title';
    title.textContent = strings.screenTitle;
    title.tabIndex = -1;

    var intro = doc.createElement('p');
    intro.className = 'launch-gate-screen__intro';
    intro.textContent = strings.intro;

    root.appendChild(backButton);
    root.appendChild(title);
    root.appendChild(intro);
    root.appendChild(renderVersionSection(doc, strings, version));
    root.appendChild(renderGatesSection(doc, strings, gatesReport));
    root.appendChild(renderProductGoalsSection(doc, strings, goals));

    container.appendChild(root);

    if (typeof title.focus === 'function') {
      title.focus();
    }

    return { root: root, backButton: backButton, title: title };
  }

  var api = {
    renderLaunchGateScreen: renderLaunchGateScreen,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.screens = window.DinoQuiz.screens || {};
    window.DinoQuiz.screens.renderLaunchGateScreen = renderLaunchGateScreen;
  }
})();
