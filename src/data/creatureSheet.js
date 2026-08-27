'use strict';

/**
 * Per-creature verified diet, keyed by `DINOSAURS` (src/data/questionBank.js).
 *
 * This is a first slice of the PRD foundation "Ficha única y verificable
 * para todas las criaturas jugables" (only the field the Laberinto mode
 * needs today, `diet`): a single source of truth other modes read instead of
 * each re-deriving/duplicating diet per creature. Modes needing more fields
 * (size, era, sounds, etc. -- see src/game/modesCatalog.js's
 * `buildCurrentResourceCatalog`) should extend `CREATURE_SHEETS` in place
 * rather than adding a second per-creature data source.
 *
 * Diets mirror the facts already told to the player in
 * public/i18n/es.json's `funFacts` (e.g. "trex-16": "El T-Rex era
 * carnívoro", "estegosaurio-21": "El Estegosaurio era herbívoro...") so the
 * Laberinto goal food never contradicts what Quiz/dato curioso teaches about
 * the same creature (PRD G4: no false scientific claims).
 */

const { DINOSAURS } = require('./questionBank');

const DIETS = Object.freeze({
  CARNIVORO: 'carnivoro',
  HERBIVORO: 'herbivoro',
  OMNIVORO: 'omnivoro',
});

const CREATURE_SHEETS = Object.freeze({
  [DINOSAURS.TREX]: Object.freeze({ id: DINOSAURS.TREX, diet: DIETS.CARNIVORO }),
  [DINOSAURS.TRICERATOPS]: Object.freeze({ id: DINOSAURS.TRICERATOPS, diet: DIETS.HERBIVORO }),
  [DINOSAURS.VELOCIRAPTOR]: Object.freeze({ id: DINOSAURS.VELOCIRAPTOR, diet: DIETS.CARNIVORO }),
  [DINOSAURS.ESTEGOSAURIO]: Object.freeze({ id: DINOSAURS.ESTEGOSAURIO, diet: DIETS.HERBIVORO }),
  [DINOSAURS.BRAQUIOSAURIO]: Object.freeze({ id: DINOSAURS.BRAQUIOSAURIO, diet: DIETS.HERBIVORO }),
  [DINOSAURS.ANKYLOSAURUS]: Object.freeze({ id: DINOSAURS.ANKYLOSAURUS, diet: DIETS.HERBIVORO }),
  [DINOSAURS.PTERANODON]: Object.freeze({ id: DINOSAURS.PTERANODON, diet: DIETS.CARNIVORO }),
  [DINOSAURS.SPINOSAURUS]: Object.freeze({ id: DINOSAURS.SPINOSAURUS, diet: DIETS.CARNIVORO }),
  [DINOSAURS.DILOPHOSAURUS]: Object.freeze({ id: DINOSAURS.DILOPHOSAURUS, diet: DIETS.CARNIVORO }),
  [DINOSAURS.PACHYCEPHALOSAURUS]: Object.freeze({ id: DINOSAURS.PACHYCEPHALOSAURUS, diet: DIETS.HERBIVORO }),
  [DINOSAURS.COMPSOGNATHUS]: Object.freeze({ id: DINOSAURS.COMPSOGNATHUS, diet: DIETS.CARNIVORO }),
  [DINOSAURS.DIPLODOCUS]: Object.freeze({ id: DINOSAURS.DIPLODOCUS, diet: DIETS.HERBIVORO }),
  [DINOSAURS.IGUANODON]: Object.freeze({ id: DINOSAURS.IGUANODON, diet: DIETS.HERBIVORO }),
  [DINOSAURS.PARASAUROLOPHUS]: Object.freeze({ id: DINOSAURS.PARASAUROLOPHUS, diet: DIETS.HERBIVORO }),
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

module.exports = {
  DIETS,
  CREATURE_SHEETS,
  getCreatureSheet,
  getCreatureDiet,
};
