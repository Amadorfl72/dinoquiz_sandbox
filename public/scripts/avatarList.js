'use strict';

/**
 * Catalog of selectable dinosaur avatars for the nickname screen's avatar
 * picker (player-avatars convention): one entry per illustration already
 * shipped under public/assets/images/dinosaurs/ -- no new image files, and
 * `id` matches both that filename (minus extension) and a key in the
 * `dinosaurNames` i18n block (public/i18n/es.json / en.json), so a consumer
 * can resolve an accessible, localized name with no second lookup table.
 *
 * The implementation lives here in public/scripts/ (not only in src/data/)
 * because, without a bundler, the browser can only run code it loads as a
 * plain `<script>` (see public/index.html) -- public/scripts/nicknameScreen.js
 * renders the picker live in the browser and needs this list there. It
 * registers on `window.DinoQuiz.data.avatarList`, the same require-or-
 * `window.DinoQuiz` bridge every other browser-facing data/service module
 * uses (modesCatalog.js, nicknameService.js). The canonical
 * `src/data/avatarList.js` module re-exports this file so Node/Jest keep a
 * single source of truth, mirroring how src/game/modesCatalog.js re-exports
 * public/scripts/modesCatalog.js.
 */

(function () {
  var AVATAR_LIST = Object.freeze(
    [
      'trex',
      'triceratops',
      'velociraptor',
      'estegosaurio',
      'braquiosaurio',
      'ankylosaurus',
      'pteranodon',
      'spinosaurus',
      'dilophosaurus',
      'pachycephalosaurus',
      'compsognathus',
      'diplodocus',
      'iguanodon',
      'parasaurolophus',
    ].map(function (id) {
      return Object.freeze({
        id: id,
        image: '/assets/images/dinosaurs/' + id + '.svg',
        nameKey: id,
      });
    })
  );

  var api = {
    AVATAR_LIST: AVATAR_LIST,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.data = window.DinoQuiz.data || {};
    window.DinoQuiz.data.avatarList = api;
  }
})();
