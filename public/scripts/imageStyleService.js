'use strict';

/**
 * Image style resolution service (TRIOFSND-194).
 *
 * Given the age band selected in the age gate (public/scripts/ageGateScreen.js,
 * TRIOFSND-193: 'under-7' | '7-plus'), resolves which visual variant of a
 * question's dinosaur illustration to show -- 'dibujo' (cartoon, matches the
 * PRD's overall visual_direction and today's only shipped asset set under
 * public/assets/images/dinosaurs/) for the youngest players, or 'realista'
 * for the 7-plus band, who can handle a more lifelike depiction.
 *
 * Local fallback (AC: "sin bloquear la partida"): only the flat
 * `dinosaurs/<name>.svg` path is guaranteed to exist today, so it is always
 * returned as `fallbackUrl` alongside the resolved `url`. The caller
 * (questionScreen.js) wires that fallback to the `<img>`'s `onerror`, so a
 * missing/broken 'realista' asset (no such variant ships yet) degrades to
 * the existing 'dibujo' illustration instead of a broken image -- the game
 * never stalls waiting on an image. An unrecognized/missing age band (e.g.
 * the age gate was skipped) also resolves to 'dibujo', keeping the game
 * showing exactly the illustrations it always has.
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

  /** Inserts a style segment before the filename, e.g. "dinosaurs/trex.svg" + "realista" -> "dinosaurs/realista/trex.svg". */
  function styledImagePath(imagePath, style) {
    if (typeof imagePath !== 'string' || imagePath === '') {
      return imagePath;
    }
    var lastSlash = imagePath.lastIndexOf('/');
    var dir = lastSlash === -1 ? '' : imagePath.slice(0, lastSlash + 1);
    var file = lastSlash === -1 ? imagePath : imagePath.slice(lastSlash + 1);
    return dir + style + '/' + file;
  }

  /**
   * Resolves the visual style and image URL for a question, plus the local
   * fallback URL to use if that style's image fails to load.
   */
  function resolveQuestionImage(question, ageBand) {
    var basePath = question && typeof question.image === 'string' ? question.image : '';
    var style = resolveImageStyle(ageBand);
    var fallbackUrl = basePath;
    var url = style === DEFAULT_IMAGE_STYLE ? basePath : styledImagePath(basePath, style);

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
