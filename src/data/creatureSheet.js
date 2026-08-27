'use strict';

/**
 * Per-creature verified diet and shadow-mode (silhouette) compatibility
 * metadata, keyed by `DINOSAURS` (src/data/questionBank.js).
 *
 * This is a slice of the PRD foundation "Ficha única y verificable para
 * todas las criaturas jugables": a single source of truth other modes read
 * instead of each re-deriving/duplicating a fact per creature. Modes needing
 * more fields (size, era, sounds, etc. -- see src/game/modesCatalog.js's
 * `buildCurrentResourceCatalog`) should extend `CREATURE_SHEETS` in place
 * rather than adding a second per-creature data source.
 *
 * Diets mirror the facts already told to the player in
 * public/i18n/es.json's `funFacts` (e.g. "trex-16": "El T-Rex era
 * carnívoro", "estegosaurio-21": "El Estegosaurio era herbívoro...") so the
 * Laberinto goal food never contradicts what Quiz/dato curioso teaches about
 * the same creature (PRD G4: no false scientific claims).
 *
 * `shadowMeta` backs the "Adivina la sombra" mode (MODE_IDS.SOMBRA in
 * public/scripts/modesCatalog.js), which requires >=12 visually
 * differentiable creatures before it unlocks. It does NOT re-declare diet,
 * size or era -- only silhouette-specific facts: whether a creature's
 * outline has been visually approved as unambiguous, which body-plan
 * `compatibilityGroup` it belongs to (creatures sharing a group have
 * similar-enough outlines that a round should favor cross-group decoys),
 * and which transforms (mirroring/rotating the silhouette) keep it
 * identifiable. `SHADOW_INDISTINGUISHABLE_PAIRS` separately lists specific
 * pairs whose outlines are so close that they must never appear together as
 * target/decoy in the same round even though each is individually approved.
 */

const { DINOSAURS } = require('./questionBank');

const DIETS = Object.freeze({
  CARNIVORO: 'carnivoro',
  HERBIVORO: 'herbivoro',
  OMNIVORO: 'omnivoro',
});

// Body-plan buckets used to judge silhouette similarity: two approved
// creatures in the same group are the ones most likely to be confused as
// shadows and should be preferred as cross-group decoys in a round.
const SHADOW_COMPATIBILITY_GROUPS = Object.freeze({
  BIPED_CARNIVORE_LARGE: 'biped_carnivore_large',
  BIPED_CARNIVORE_MEDIUM: 'biped_carnivore_medium',
  BIPED_CARNIVORE_SMALL: 'biped_carnivore_small',
  QUADRUPED_LONGNECK: 'quadruped_longneck',
  QUADRUPED_ARMORED: 'quadruped_armored',
  QUADRUPED_HORNED: 'quadruped_horned',
  QUADRUPED_PLATED: 'quadruped_plated',
  QUADRUPED_DUCKBILL: 'quadruped_duckbill',
  DOME_HEAD: 'dome_head',
  FLYER: 'flyer',
});

// Transforms a creature's silhouette may undergo (e.g. to vary a round's
// presentation) without losing identity or legibility for the target
// audience (niños de 6 a 8 años, PRD constraint on WCAG-legible controls).
const SHADOW_TRANSFORMS = Object.freeze({
  // Mirroring a side-profile outline (facing the other way) keeps every
  // shape cue intact, so it is safe for any approved creature.
  FLIP_HORIZONTAL: 'flipHorizontal',
  // Rotating a grounded creature onto its side/head destroys the silhouette
  // a child would recognize; only granted to the flyer, whose profile stays
  // legible at a bank angle.
  ROTATE_90: 'rotate90',
  ROTATE_180: 'rotate180',
});

// Every approved creature may be mirrored; only the flyer additionally
// tolerates a partial rotation without becoming unrecognizable.
const GROUND_TRANSFORMS = Object.freeze([SHADOW_TRANSFORMS.FLIP_HORIZONTAL]);
const FLYER_TRANSFORMS = Object.freeze([
  SHADOW_TRANSFORMS.FLIP_HORIZONTAL,
  SHADOW_TRANSFORMS.ROTATE_90,
]);

function approvedShadow(compatibilityGroup, allowedTransforms) {
  return Object.freeze({
    approved: true,
    compatibilityGroup,
    allowedTransforms: allowedTransforms || GROUND_TRANSFORMS,
  });
}

// Not every shipped creature has cleared visual review yet: Compsognathus's
// small, feature-light outline reads as a generic "small biped" blob at
// silhouette scale, so it stays unapproved until a clearer asset lands
// rather than being counted toward the >=12 the mode needs.
const UNAPPROVED_SHADOW = Object.freeze({
  approved: false,
  compatibilityGroup: null,
  allowedTransforms: Object.freeze([]),
});

const CREATURE_SHEETS = Object.freeze({
  [DINOSAURS.TREX]: Object.freeze({
    id: DINOSAURS.TREX,
    diet: DIETS.CARNIVORO,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.BIPED_CARNIVORE_LARGE),
  }),
  [DINOSAURS.TRICERATOPS]: Object.freeze({
    id: DINOSAURS.TRICERATOPS,
    diet: DIETS.HERBIVORO,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.QUADRUPED_HORNED),
  }),
  [DINOSAURS.VELOCIRAPTOR]: Object.freeze({
    id: DINOSAURS.VELOCIRAPTOR,
    diet: DIETS.CARNIVORO,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.BIPED_CARNIVORE_MEDIUM),
  }),
  [DINOSAURS.ESTEGOSAURIO]: Object.freeze({
    id: DINOSAURS.ESTEGOSAURIO,
    diet: DIETS.HERBIVORO,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.QUADRUPED_PLATED),
  }),
  [DINOSAURS.BRAQUIOSAURIO]: Object.freeze({
    id: DINOSAURS.BRAQUIOSAURIO,
    diet: DIETS.HERBIVORO,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.QUADRUPED_LONGNECK),
  }),
  [DINOSAURS.ANKYLOSAURUS]: Object.freeze({
    id: DINOSAURS.ANKYLOSAURUS,
    diet: DIETS.HERBIVORO,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.QUADRUPED_ARMORED),
  }),
  [DINOSAURS.PTERANODON]: Object.freeze({
    id: DINOSAURS.PTERANODON,
    diet: DIETS.CARNIVORO,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.FLYER, FLYER_TRANSFORMS),
  }),
  [DINOSAURS.SPINOSAURUS]: Object.freeze({
    id: DINOSAURS.SPINOSAURUS,
    diet: DIETS.CARNIVORO,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.BIPED_CARNIVORE_LARGE),
  }),
  [DINOSAURS.DILOPHOSAURUS]: Object.freeze({
    id: DINOSAURS.DILOPHOSAURUS,
    diet: DIETS.CARNIVORO,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.BIPED_CARNIVORE_MEDIUM),
  }),
  [DINOSAURS.PACHYCEPHALOSAURUS]: Object.freeze({
    id: DINOSAURS.PACHYCEPHALOSAURUS,
    diet: DIETS.HERBIVORO,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.DOME_HEAD),
  }),
  [DINOSAURS.COMPSOGNATHUS]: Object.freeze({
    id: DINOSAURS.COMPSOGNATHUS,
    diet: DIETS.CARNIVORO,
    shadowMeta: UNAPPROVED_SHADOW,
  }),
  [DINOSAURS.DIPLODOCUS]: Object.freeze({
    id: DINOSAURS.DIPLODOCUS,
    diet: DIETS.HERBIVORO,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.QUADRUPED_LONGNECK),
  }),
  [DINOSAURS.IGUANODON]: Object.freeze({
    id: DINOSAURS.IGUANODON,
    diet: DIETS.HERBIVORO,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.QUADRUPED_DUCKBILL),
  }),
  [DINOSAURS.PARASAUROLOPHUS]: Object.freeze({
    id: DINOSAURS.PARASAUROLOPHUS,
    diet: DIETS.HERBIVORO,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.QUADRUPED_DUCKBILL),
  }),
});

// Pairs whose silhouettes are cataloged as indistinguishable even though
// each member is individually approved (same `compatibilityGroup`, near
// -identical outline): a shadow round must never present one as the target
// with the other as a decoy, since a correct guess would be unverifiable.
const SHADOW_INDISTINGUISHABLE_PAIRS = Object.freeze([
  Object.freeze([DINOSAURS.BRAQUIOSAURIO, DINOSAURS.DIPLODOCUS]),
  Object.freeze([DINOSAURS.VELOCIRAPTOR, DINOSAURS.DILOPHOSAURUS]),
  Object.freeze([DINOSAURS.IGUANODON, DINOSAURS.PARASAUROLOPHUS]),
]);

const SHADOW_MODE_MIN_APPROVED = 12;

/** The creature's single verified card, or `undefined` for an unknown id -- never guessed/derived. */
function getCreatureSheet(dinosaurId) {
  return CREATURE_SHEETS[dinosaurId];
}

/** Convenience accessor for just the `diet` field of `getCreatureSheet(dinosaurId)`. */
function getCreatureDiet(dinosaurId) {
  const sheet = getCreatureSheet(dinosaurId);
  return sheet ? sheet.diet : undefined;
}

/**
 * Ids of every creature whose `shadowMeta.approved` is true, in
 * `CREATURE_SHEETS` order. `sheets` defaults to the canonical
 * `CREATURE_SHEETS` map; callers may pass a filtered/overridden map (same
 * shape: id -> sheet with a `shadowMeta`) to evaluate a hypothetical roster.
 */
function getApprovedShadowCreatures(sheets) {
  const source = sheets || CREATURE_SHEETS;
  return Object.keys(source).filter((id) => {
    const sheet = source[id];
    return Boolean(sheet && sheet.shadowMeta && sheet.shadowMeta.approved);
  });
}

/**
 * Whether "Adivina la sombra" has enough approved creatures to unlock
 * (PRD/MODES_CATALOG requirement: >=12 visually differentiable creatures).
 * `catalog` is optional and follows the same shape as `sheets` in
 * `getApprovedShadowCreatures` -- omit it to evaluate the live roster.
 */
function isShadowModeUnlocked(catalog) {
  return getApprovedShadowCreatures(catalog).length >= SHADOW_MODE_MIN_APPROVED;
}

module.exports = {
  DIETS,
  SHADOW_COMPATIBILITY_GROUPS,
  SHADOW_TRANSFORMS,
  SHADOW_INDISTINGUISHABLE_PAIRS,
  SHADOW_MODE_MIN_APPROVED,
  CREATURE_SHEETS,
  getCreatureSheet,
  getCreatureDiet,
  getApprovedShadowCreatures,
  isShadowModeUnlocked,
};
