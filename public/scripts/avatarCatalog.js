'use strict';

/**
 * Catalog of player avatars offered on the nickname screen's avatar picker
 * (trioforge-dinoquiz-player-avatars skill): one entry per illustration
 * already shipped under public/assets/images/dinosaurs/ -- no new assets are
 * introduced here, this module only lists the existing ones.
 *
 * Entry shape:
 * {
 *   id: string,     // matches the dinosaur's svg filename (no extension)
 *   image: string,  // reference under public/assets/images/, same
 *                    // "<subfolder>/<file>" convention as questionBank.js's
 *                    // `image` field (resolved against IMAGES_DIR by callers
 *                    // that check the asset exists on disk)
 *   nameKey: string, // i18n key under the top-level "dinosaurNames" catalog
 *                     // (public/i18n/*.json), reused rather than duplicated
 * }
 *
 * The implementation lives here in public/scripts/ (not only in src/data/)
 * because, without a bundler, the browser can only run code it loads as a
 * plain `<script>` (see public/index.html) -- the avatar picker screen
 * reads this catalog live. It registers itself on
 * `window.DinoQuiz.data.avatarCatalog`, the same `window.DinoQuiz.data`
 * bridge public/scripts/gameFlow.js's `resolveQuestionBank` already falls
 * back to for data-domain modules. The canonical `src/data/avatarCatalog.js`
 * re-exports this file so Node/Jest keep a single source of truth,
 * mirroring how src/services/nicknameService.js re-exports
 * public/scripts/nicknameService.js.
 */

(function () {
  var AVATAR_CATALOG = Object.freeze([
    Object.freeze({ id: 'trex', image: 'dinosaurs/trex.svg', nameKey: 'dinosaurNames.trex' }),
    Object.freeze({ id: 'triceratops', image: 'dinosaurs/triceratops.svg', nameKey: 'dinosaurNames.triceratops' }),
    Object.freeze({ id: 'velociraptor', image: 'dinosaurs/velociraptor.svg', nameKey: 'dinosaurNames.velociraptor' }),
    Object.freeze({ id: 'estegosaurio', image: 'dinosaurs/estegosaurio.svg', nameKey: 'dinosaurNames.estegosaurio' }),
    Object.freeze({
      id: 'braquiosaurio',
      image: 'dinosaurs/braquiosaurio.svg',
      nameKey: 'dinosaurNames.braquiosaurio',
    }),
    Object.freeze({ id: 'ankylosaurus', image: 'dinosaurs/ankylosaurus.svg', nameKey: 'dinosaurNames.ankylosaurus' }),
    Object.freeze({ id: 'pteranodon', image: 'dinosaurs/pteranodon.svg', nameKey: 'dinosaurNames.pteranodon' }),
    Object.freeze({ id: 'spinosaurus', image: 'dinosaurs/spinosaurus.svg', nameKey: 'dinosaurNames.spinosaurus' }),
    Object.freeze({
      id: 'dilophosaurus',
      image: 'dinosaurs/dilophosaurus.svg',
      nameKey: 'dinosaurNames.dilophosaurus',
    }),
    Object.freeze({
      id: 'pachycephalosaurus',
      image: 'dinosaurs/pachycephalosaurus.svg',
      nameKey: 'dinosaurNames.pachycephalosaurus',
    }),
    Object.freeze({
      id: 'compsognathus',
      image: 'dinosaurs/compsognathus.svg',
      nameKey: 'dinosaurNames.compsognathus',
    }),
    Object.freeze({ id: 'diplodocus', image: 'dinosaurs/diplodocus.svg', nameKey: 'dinosaurNames.diplodocus' }),
    Object.freeze({ id: 'iguanodon', image: 'dinosaurs/iguanodon.svg', nameKey: 'dinosaurNames.iguanodon' }),
    Object.freeze({
      id: 'parasaurolophus',
      image: 'dinosaurs/parasaurolophus.svg',
      nameKey: 'dinosaurNames.parasaurolophus',
    }),
  ]);

  /** Returns the catalog entry for `id`, or undefined if `id` is unknown. */
  function getAvatarById(id) {
    return AVATAR_CATALOG.find(function (avatar) {
      return avatar.id === id;
    });
  }

  var api = {
    AVATAR_CATALOG: AVATAR_CATALOG,
    getAvatarById: getAvatarById,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.data = window.DinoQuiz.data || {};
    window.DinoQuiz.data.avatarCatalog = api;
  }
})();
