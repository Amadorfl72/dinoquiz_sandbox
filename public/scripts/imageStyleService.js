'use strict';

/**
 * Image style resolution service (TRIOFSND-194).
 *
 * Given the age band selected in the age gate (public/scripts/ageGateScreen.js,
 * TRIOFSND-193: 'under-7' | '7-plus'), resolves which visual variant of a
 * question's dinosaur illustration to show -- 'dibujo' (`question.image`,
 * cartoon, matching the PRD's overall visual_direction) for the youngest
 * players, or 'realista' (`question.imageRealistic`) for the 7-plus band,
 * who can handle a more lifelike depiction. Both fields are asset paths that
 * already come straight from the question bank (src/data/questionBank.js,
 * public/data/questions.json) -- this service only picks which field to use,
 * it never derives a path itself.
 *
 * The 'realista' URL comes straight from the question bank's own
 * `imageRealistic` field (e.g. "realistic/trex.jpg", see
 * src/data/questionBank.js and public/data/questions.json), which is where
 * the actual realistic assets ship (public/assets/images/realistic/*.jpg) --
 * NOT derived by inserting a "realista" segment into the base `image` path,
 * which has no corresponding asset directory. Only a question missing
 * `imageRealistic` (e.g. hand-built test fixtures) falls back to the
 * cartoon `image` path, purely so callers without the field still get *a*
 * URL instead of `undefined`.
 *
 * Local fallback (AC: "sin bloquear la partida"): `question.imageFallback`
 * (public/assets/images/fallback/) is always returned as `fallbackUrl`
 * alongside the resolved `url`. The caller (questionScreen.js) wires that
 * fallback to the `<img>`'s `onerror`, so a missing/broken style asset
 * degrades to the guaranteed fallback illustration instead of a broken image
 * -- the game never stalls waiting on an image. An unrecognized/missing age
 * band (e.g. the age gate was skipped) resolves to 'dibujo', keeping the
 * game showing exactly the illustrations it always has.
 *
 * Pure logic, no DOM access, so it is trivial to unit test directly. Browser
 * bridge: DinoQuiz has no bundler, so this file follows the same dual
 * CommonJS/global pattern as public/scripts/network.js -- it registers on
 * `window.DinoQuiz.services.imageStyleService` for the `<script>`-loaded PWA
 * and also `module.exports`s for Node/Jest. The canonical
 * `src/services/imageStyleService.js` module re-exports this file.
 */

(function () {
  var IMAGE_STYLES = Object.freeze({
    DIBUJO: 'dibujo',
    REALISTA: 'realista',
  });

  var DEFAULT_IMAGE_STYLE = IMAGE_STYLES.DIBUJO;

  var AGE_BAND_IMAGE_STYLES = {
    'under-7': IMAGE_STYLES.DIBUJO,
    '7-plus': IMAGE_STYLES.REALISTA,
  };

  /** Resolves the visual style ('dibujo' | 'realista') for an age band, defaulting to 'dibujo'. */
  function resolveImageStyle(ageBand) {
    return AGE_BAND_IMAGE_STYLES[ageBand] || DEFAULT_IMAGE_STYLE;
  }

  function stringOrEmpty(value) {
    return typeof value === 'string' ? value : '';
  }

  /**
   * Resolves the visual style and image URL for a question, plus the local
   * fallback URL to use if that style's image fails to load.
   */
  function resolveQuestionImage(question, ageBand) {
    var cartoonUrl = stringOrEmpty(question && question.image);
    var realisticUrl = stringOrEmpty(question && question.imageRealistic);
    var fallbackUrl = stringOrEmpty(question && question.imageFallback) || cartoonUrl;
    var style = resolveImageStyle(ageBand);
    var url = cartoonUrl;

    if (style === IMAGE_STYLES.REALISTA) {
      url = realisticUrl || cartoonUrl;
    }

    return {
      style: style,
      url: url,
      fallbackUrl: fallbackUrl,
    };
  }

  var api = {
    IMAGE_STYLES: IMAGE_STYLES,
    DEFAULT_IMAGE_STYLE: DEFAULT_IMAGE_STYLE,
    resolveImageStyle: resolveImageStyle,
    resolveQuestionImage: resolveQuestionImage,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.services = window.DinoQuiz.services || {};
    window.DinoQuiz.services.imageStyleService = api;
  }
})();
