'use strict';

/**
 * Per-creature verified diet and visual family, keyed by `DINOSAURS`
 * (src/data/questionBank.js).
 *
 * This is a slice of the PRD foundation "Ficha única y verificable para
 * todas las criaturas jugables": a single source of truth other modes read
 * instead of each re-deriving/duplicating a field per creature. Modes
 * needing more fields (size, era, sounds, etc. -- see
 * src/game/modesCatalog.js's `buildCurrentResourceCatalog`) should extend
 * `CREATURE_SHEETS` in place rather than adding a second per-creature data
 * source.
 *
 * Diets mirror the facts already told to the player in
 * public/i18n/es.json's `funFacts` (e.g. "trex-16": "El T-Rex era
 * carnívoro", "estegosaurio-21": "El Estegosaurio era herbívoro...") so the
 * Laberinto goal food never contradicts what Quiz/dato curioso teaches about
 * the same creature (PRD G4: no false scientific claims).
 *
 * `visualFamily` groups creatures by real body-plan/silhouette (biped
 * carnivore, biped herbivore, armored quadruped, long-necked quadruped,
 * flying reptile) -- the same categories a child could tell apart by shape
 * alone. Parejas jurásicas (src/game/parejasGame.js) reads this to scale a
 * round's visual difficulty: a low round mixes families (easy to tell
 * cards apart even before matching), a high round draws several creatures
 * from the same family (harder to distinguish at a glance).
 */

const { DINOSAURS } = require('./questionBank');

const DIETS = Object.freeze({
  CARNIVORO: 'carnivoro',
  HERBIVORO: 'herbivoro',
  OMNIVORO: 'omnivoro',
});

const VISUAL_FAMILIES = Object.freeze({
  BIPED_CARNIVORE: 'biped_carnivore',
  BIPED_HERBIVORE: 'biped_herbivore',
  ARMORED_QUADRUPED: 'armored_quadruped',
  LONG_NECK_QUADRUPED: 'long_neck_quadruped',
  FLYING_REPTILE: 'flying_reptile',
});

const CREATURE_SHEETS = Object.freeze({
  [DINOSAURS.TREX]: Object.freeze({ id: DINOSAURS.TREX, diet: DIETS.CARNIVORO, visualFamily: VISUAL_FAMILIES.BIPED_CARNIVORE }),
  [DINOSAURS.TRICERATOPS]: Object.freeze({ id: DINOSAURS.TRICERATOPS, diet: DIETS.HERBIVORO, visualFamily: VISUAL_FAMILIES.ARMORED_QUADRUPED }),
  [DINOSAURS.VELOCIRAPTOR]: Object.freeze({ id: DINOSAURS.VELOCIRAPTOR, diet: DIETS.CARNIVORO, visualFamily: VISUAL_FAMILIES.BIPED_CARNIVORE }),
  [DINOSAURS.ESTEGOSAURIO]: Object.freeze({ id: DINOSAURS.ESTEGOSAURIO, diet: DIETS.HERBIVORO, visualFamily: VISUAL_FAMILIES.ARMORED_QUADRUPED }),
  [DINOSAURS.BRAQUIOSAURIO]: Object.freeze({ id: DINOSAURS.BRAQUIOSAURIO, diet: DIETS.HERBIVORO, visualFamily: VISUAL_FAMILIES.LONG_NECK_QUADRUPED }),
  [DINOSAURS.ANKYLOSAURUS]: Object.freeze({ id: DINOSAURS.ANKYLOSAURUS, diet: DIETS.HERBIVORO, visualFamily: VISUAL_FAMILIES.ARMORED_QUADRUPED }),
  [DINOSAURS.PTERANODON]: Object.freeze({ id: DINOSAURS.PTERANODON, diet: DIETS.CARNIVORO, visualFamily: VISUAL_FAMILIES.FLYING_REPTILE }),
  [DINOSAURS.SPINOSAURUS]: Object.freeze({ id: DINOSAURS.SPINOSAURUS, diet: DIETS.CARNIVORO, visualFamily: VISUAL_FAMILIES.BIPED_CARNIVORE }),
  [DINOSAURS.DILOPHOSAURUS]: Object.freeze({ id: DINOSAURS.DILOPHOSAURUS, diet: DIETS.CARNIVORO, visualFamily: VISUAL_FAMILIES.BIPED_CARNIVORE }),
  [DINOSAURS.PACHYCEPHALOSAURUS]: Object.freeze({ id: DINOSAURS.PACHYCEPHALOSAURUS, diet: DIETS.HERBIVORO, visualFamily: VISUAL_FAMILIES.BIPED_HERBIVORE }),
  [DINOSAURS.COMPSOGNATHUS]: Object.freeze({ id: DINOSAURS.COMPSOGNATHUS, diet: DIETS.CARNIVORO, visualFamily: VISUAL_FAMILIES.BIPED_CARNIVORE }),
  [DINOSAURS.DIPLODOCUS]: Object.freeze({ id: DINOSAURS.DIPLODOCUS, diet: DIETS.HERBIVORO, visualFamily: VISUAL_FAMILIES.LONG_NECK_QUADRUPED }),
  [DINOSAURS.IGUANODON]: Object.freeze({ id: DINOSAURS.IGUANODON, diet: DIETS.HERBIVORO, visualFamily: VISUAL_FAMILIES.BIPED_HERBIVORE }),
  [DINOSAURS.PARASAUROLOPHUS]: Object.freeze({ id: DINOSAURS.PARASAUROLOPHUS, diet: DIETS.HERBIVORO, visualFamily: VISUAL_FAMILIES.BIPED_HERBIVORE }),
});

/** The creature's single verified card, or `undefined` for an unknown id -- never guessed/derived. */
function getCreatureSheet(dinosaurId) {
  return CREATURE_SHEETS[dinosaurId];
}

/** Convenience accessor for just the `diet` field of `getCreatureSheet(dinosaurId)`. */
function getCreatureDiet(dinosaurId) {
  const sheet = getCreatureSheet(dinosaurId);
  return sheet ? sheet.diet : undefined;
}

/** Convenience accessor for just the `visualFamily` field of `getCreatureSheet(dinosaurId)`. */
function getCreatureVisualFamily(dinosaurId) {
  const sheet = getCreatureSheet(dinosaurId);
  return sheet ? sheet.visualFamily : undefined;
}

module.exports = {
  DIETS,
  VISUAL_FAMILIES,
  CREATURE_SHEETS,
  getCreatureSheet,
  getCreatureDiet,
  getCreatureVisualFamily,
};
