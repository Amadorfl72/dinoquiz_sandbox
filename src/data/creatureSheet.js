'use strict';

/**
 * Per-creature verified diet and body length, keyed by `DINOSAURS`
 * (src/data/questionBank.js).
 *
 * This is a slice of the PRD foundation "Ficha única y verificable para
 * todas las criaturas jugables": a single source of truth other modes read
 * instead of each re-deriving/duplicating a fact per creature. Modes needing
 * more fields (era, sounds, etc. -- see src/game/modesCatalog.js's
 * `buildCurrentResourceCatalog`) should extend `CREATURE_SHEETS` in place
 * rather than adding a second per-creature data source.
 *
 * Diets mirror the facts already told to the player in
 * public/i18n/es.json's `funFacts` (e.g. "trex-16": "El T-Rex era
 * carnívoro", "estegosaurio-21": "El Estegosaurio era herbívoro...") so the
 * Laberinto goal food never contradicts what Quiz/dato curioso teaches about
 * the same creature (PRD G4: no false scientific claims).
 *
 * `lengthMeters` (nose-to-tail body length, used by the Ordena por tamaño
 * generator -- src/game/sizeOrderRoundGenerator.js) mirrors the same
 * `funFacts` whenever they state one (e.g. "trex-08": "...unos 12 metros de
 * largo", "diplodocus-06": "...hasta unos 25 metros de largo"); for a
 * creature whose facts only give a range or a different measurement
 * (Braquiosaurio's facts state neck *height*, Pteranodon's state wingspan),
 * the midpoint of the widely-documented body length is used instead so no
 * mode ever contradicts the dato curioso shown for the same creature.
 */

const { DINOSAURS } = require('./questionBank');

const DIETS = Object.freeze({
  CARNIVORO: 'carnivoro',
  HERBIVORO: 'herbivoro',
  OMNIVORO: 'omnivoro',
});

const CREATURE_SHEETS = Object.freeze({
  [DINOSAURS.TREX]: Object.freeze({ id: DINOSAURS.TREX, diet: DIETS.CARNIVORO, lengthMeters: 12 }),
  [DINOSAURS.TRICERATOPS]: Object.freeze({ id: DINOSAURS.TRICERATOPS, diet: DIETS.HERBIVORO, lengthMeters: 9 }),
  [DINOSAURS.VELOCIRAPTOR]: Object.freeze({ id: DINOSAURS.VELOCIRAPTOR, diet: DIETS.CARNIVORO, lengthMeters: 2 }),
  [DINOSAURS.ESTEGOSAURIO]: Object.freeze({ id: DINOSAURS.ESTEGOSAURIO, diet: DIETS.HERBIVORO, lengthMeters: 9 }),
  [DINOSAURS.BRAQUIOSAURIO]: Object.freeze({ id: DINOSAURS.BRAQUIOSAURIO, diet: DIETS.HERBIVORO, lengthMeters: 21 }),
  [DINOSAURS.ANKYLOSAURUS]: Object.freeze({ id: DINOSAURS.ANKYLOSAURUS, diet: DIETS.HERBIVORO, lengthMeters: 7 }),
  [DINOSAURS.PTERANODON]: Object.freeze({ id: DINOSAURS.PTERANODON, diet: DIETS.CARNIVORO, lengthMeters: 1.8 }),
  [DINOSAURS.SPINOSAURUS]: Object.freeze({ id: DINOSAURS.SPINOSAURUS, diet: DIETS.CARNIVORO, lengthMeters: 15 }),
  [DINOSAURS.DILOPHOSAURUS]: Object.freeze({ id: DINOSAURS.DILOPHOSAURUS, diet: DIETS.CARNIVORO, lengthMeters: 6.5 }),
  [DINOSAURS.PACHYCEPHALOSAURUS]: Object.freeze({
    id: DINOSAURS.PACHYCEPHALOSAURUS,
    diet: DIETS.HERBIVORO,
    lengthMeters: 4.5,
  }),
  [DINOSAURS.COMPSOGNATHUS]: Object.freeze({ id: DINOSAURS.COMPSOGNATHUS, diet: DIETS.CARNIVORO, lengthMeters: 1 }),
  [DINOSAURS.DIPLODOCUS]: Object.freeze({ id: DINOSAURS.DIPLODOCUS, diet: DIETS.HERBIVORO, lengthMeters: 25 }),
  [DINOSAURS.IGUANODON]: Object.freeze({ id: DINOSAURS.IGUANODON, diet: DIETS.HERBIVORO, lengthMeters: 10 }),
  [DINOSAURS.PARASAUROLOPHUS]: Object.freeze({
    id: DINOSAURS.PARASAUROLOPHUS,
    diet: DIETS.HERBIVORO,
    lengthMeters: 10,
  }),
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

/** Convenience accessor for just the `lengthMeters` field of `getCreatureSheet(dinosaurId)`. */
function getCreatureLengthMeters(dinosaurId) {
  const sheet = getCreatureSheet(dinosaurId);
  return sheet ? sheet.lengthMeters : undefined;
}

module.exports = {
  DIETS,
  CREATURE_SHEETS,
  getCreatureSheet,
  getCreatureDiet,
  getCreatureLengthMeters,
};
