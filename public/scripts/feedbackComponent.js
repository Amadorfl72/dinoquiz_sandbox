'use strict';

/**
 * Common accessible feedback component (TRIOFSND-243).
 *
 * Generalizes the acierto/fallo feedback pattern questionScreen.js already
 * uses (a short message, a decorative icon, a single `aria-live` region, an
 * optional muted-aware sound) into one component the other seven modes can
 * mount instead of each hand-rolling it again.
 *
 * Redundant channels (PRD: "ninguna instrucción o estado puede comunicarse
 * únicamente mediante color, sonido o animación"): every `showResult()` call
 * always renders the SAME outcome through three independent, always-present
 * channels -- a visible text `message` (never empty), a decorative
 * `aria-hidden` icon (never the only carrier of meaning) and an accessible
 * `announcement` region -- plus an optional sound. The background color
 * modifier (`--correct`/`--incorrect`) is purely a fourth, redundant cue on
 * top of those three, exactly like questionScreen.js's green/neutral option
 * borders; removing color, sound or the icon alone never removes the state.
 *
 * Sound (PRD: "todo audio debe respetar dinoquiz:muted antes de cualquier
 * reproducción"): playback is delegated entirely to soundService.js's
 * `playCorrect`/`playIncorrect`, which already reads the `dinoquiz:muted`
 * localStorage flag fresh before every play -- the mute check is never
 * duplicated here, so there is exactly one place that can get it wrong.
 *
 * roundContract integration (PRD: "contrato técnico ... común para los
 * modos"): `attachToSession` subscribes to the session's
 * `HOOK_EVENTS.ANSWER_EVALUATED` hook (emitted by `evaluateAnswer`, see
 * roundContract.js) and drives `showResult` from it, and to
 * `HOOK_EVENTS.ROUND_STARTED` to clear the previous round's feedback so it
 * never lingers into the next round. A mode only needs to render the
 * component once and call `attachToSession` -- it never has to read
 * `session.round.isCorrect` or wire the hook itself.
 *
 * Browser bridge: no bundler, so this file follows the same dual
 * CommonJS/`window.DinoQuiz` pattern as soundService.js/roundContract.js. It
 * registers on `window.DinoQuiz.components.feedbackComponent`; the canonical
 * `src/services/feedbackComponent.js` re-exports this file for Node/Jest.
 */

(function () {
  var ROOT_CLASS = 'feedback-component';
  var ICON_CLASS = 'feedback-component__icon';
  var MESSAGE_CLASS = 'feedback-component__message';
  var ANNOUNCEMENT_CLASS = 'feedback-component__announcement';
  var CORRECT_MODIFIER = 'feedback-component--correct';
  var INCORRECT_MODIFIER = 'feedback-component--incorrect';

  // Decorative only (aria-hidden below) -- the accessible name always comes
  // from the visible `message`/`announcement` text, never from the glyph.
  var CORRECT_ICON = '✅';
  var INCORRECT_ICON = '💡';

  function resolveStrings(options) {
    options = options || {};
    if (options.strings) {
      return options.strings;
    }
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(options.locale || i18n.DEFAULT_LOCALE).feedback;
    }
    var bundle = (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.strings) || null;
    return bundle ? bundle.feedback : null;
  }

  function resolveSoundService(options) {
    options = options || {};
    if (options.soundService) {
      return options.soundService;
    }
    if (typeof require === 'function') {
      return require('./soundService').soundService;
    }
    return (
      (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.services && window.DinoQuiz.services.soundService) ||
      null
    );
  }

  function resolveRoundContract(options) {
    options = options || {};
    if (options.roundContract) {
      return options.roundContract;
    }
    if (typeof require === 'function') {
      return require('./roundContract');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.game && window.DinoQuiz.game.roundContract) || null;
  }

  function formatTemplate(template, values) {
    if (typeof template !== 'string') {
      return '';
    }
    return Object.keys(values || {}).reduce(function (result, key) {
      return result.split('{' + key + '}').join(values[key]);
    }, template);
  }

  /**
   * Mounts the feedback fragment into `container`. Nothing is visible until
   * the first `showResult()` -- `root.hidden` starts `true` so an unanswered
   * round never shows a stale/empty state (mirrors `nextButton.hidden` in
   * questionScreen.js).
   */
  function renderFeedbackComponent(container, options) {
    options = options || {};
    var strings = resolveStrings(options) || {};
    var soundService = resolveSoundService(options);
    var playSound = options.playSound !== false;

    var root = document.createElement('div');
    root.className = ROOT_CLASS;
    root.hidden = true;

    var icon = document.createElement('span');
    icon.className = ICON_CLASS;
    icon.setAttribute('aria-hidden', 'true');

    var message = document.createElement('p');
    message.className = MESSAGE_CLASS;
    message.setAttribute('aria-live', 'polite');

    // Single role="status" region per outcome (same reasoning as
    // questionScreen.js's `announcementEl`): two live regions changing in
    // the same tick announce in an unpredictable order to a screen reader.
    var announcement = document.createElement('p');
    announcement.className = ANNOUNCEMENT_CLASS + ' sr-only';
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');

    root.appendChild(icon);
    root.appendChild(message);
    root.appendChild(announcement);
    container.appendChild(root);

    /** Clears the fragment back to its pre-answer state (e.g. on a new round). */
    function reset() {
      root.hidden = true;
      root.classList.remove(CORRECT_MODIFIER, INCORRECT_MODIFIER);
      icon.textContent = '';
      message.textContent = '';
      announcement.textContent = '';
    }

    /**
     * Renders one round's outcome. `result.isCorrect` drives every channel
     * from the single source of truth the caller already computed (usually
     * `roundContract`'s `evaluateAnswer`) -- never re-derived here.
     * `result.detail` (already-localized text from the caller, e.g. "La
     * respuesta correcta era: Triceratops") and `result.score` are optional
     * and only ever folded into the sr-only `announcement`, never into the
     * icon or the color modifier.
     */
    function showResult(result) {
      result = result || {};
      var isCorrect = Boolean(result.isCorrect);
      var outcomeStrings = (isCorrect ? strings.correct : strings.incorrect) || {};
      var messageText = outcomeStrings.message || '';

      root.hidden = false;
      root.classList.remove(CORRECT_MODIFIER, INCORRECT_MODIFIER);
      root.classList.add(isCorrect ? CORRECT_MODIFIER : INCORRECT_MODIFIER);

      icon.textContent = isCorrect ? CORRECT_ICON : INCORRECT_ICON;
      message.textContent = messageText;

      var parts = [messageText];
      if (typeof result.detail === 'string' && result.detail.trim() !== '') {
        parts.push(result.detail);
      }
      if (typeof result.score === 'number' && strings.scoreAnnouncementFormat) {
        parts.push(formatTemplate(strings.scoreAnnouncementFormat, { score: result.score }));
      }
      announcement.textContent = parts.filter(Boolean).join(' ');

      // Muted-aware sound (PRD: "todo audio debe respetar dinoquiz:muted
      // antes de cualquier reproducción"): soundService already re-reads the
      // `dinoquiz:muted` flag fresh on every play() call, so a mid-game
      // mute toggle is respected on the very next result without this
      // component caching or re-checking the flag itself.
      if (playSound && soundService) {
        if (isCorrect && typeof soundService.playCorrect === 'function') {
          soundService.playCorrect();
        } else if (!isCorrect && typeof soundService.playIncorrect === 'function') {
          soundService.playIncorrect();
        }
      }

      return { isCorrect: isCorrect, message: messageText };
    }

    return {
      root: root,
      icon: icon,
      message: message,
      announcement: announcement,
      showResult: showResult,
      reset: reset,
    };
  }

  /**
   * Hooks a rendered `component` to a live roundContract `session` (PRD:
   * "enganchado al paso de evaluación de roundContract"): every round a mode
   * scores via `evaluateAnswer` drives `showResult` automatically, and every
   * new round (`advanceRound`) clears the previous outcome via `reset()`
   * before the child answers again. `options.buildDetail(payload)` lets a
   * mode add its own localized "correct answer was X" sentence to the
   * sr-only announcement without the component knowing anything about that
   * mode's round shape.
   *
   * Returns a single `off()` that detaches both subscriptions, mirroring
   * `hooks.on`'s own unsubscribe function so a screen can clean up on
   * teardown exactly like it would for a hook it registered directly.
   */
  function attachToSession(component, session, options) {
    options = options || {};

    if (!component || typeof component.showResult !== 'function') {
      throw new Error('attachToSession requires a component rendered by renderFeedbackComponent');
    }
    if (!session || !session.hooks || typeof session.hooks.on !== 'function') {
      throw new Error('attachToSession requires an active roundContract session (see startGame)');
    }

    var roundContract = resolveRoundContract(options);
    if (!roundContract || !roundContract.HOOK_EVENTS) {
      throw new Error('attachToSession requires roundContract to be available');
    }

    var offEvaluated = session.hooks.on(roundContract.HOOK_EVENTS.ANSWER_EVALUATED, function (payload) {
      var detail = typeof options.buildDetail === 'function' ? options.buildDetail(payload) : null;
      component.showResult({
        isCorrect: payload.answer.isCorrect,
        detail: detail,
        score: payload.state.score,
      });
    });

    var offStarted = session.hooks.on(roundContract.HOOK_EVENTS.ROUND_STARTED, function (payload) {
      // The session's own game-start ROUND_STARTED (roundIndex 0) fires
      // before a caller can attach -- this only ever clears the fragment
      // for rounds that start *after* attaching, i.e. never on an already-
      // empty, not-yet-shown fragment.
      if (payload.roundIndex > 0) {
        component.reset();
      }
    });

    return function off() {
      offEvaluated();
      offStarted();
    };
  }

  var api = {
    CORRECT_ICON: CORRECT_ICON,
    INCORRECT_ICON: INCORRECT_ICON,
    renderFeedbackComponent: renderFeedbackComponent,
    attachToSession: attachToSession,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.components = window.DinoQuiz.components || {};
    window.DinoQuiz.components.feedbackComponent = api;
  }
})();
