'use strict';

/**
 * Per-creature verified diet, body length, visual family, and shadow-mode
 * (silhouette) compatibility metadata, keyed by `DINOSAURS`
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
 *
 * `visualFamily` groups creatures by real body-plan/silhouette (biped
 * carnivore, biped herbivore, armored quadruped, long-necked quadruped,
 * flying reptile) -- the same categories a child could tell apart by shape
 * alone. Parejas jurásicas (src/game/parejasGame.js) reads this to scale a
 * round's visual difficulty: a low round mixes families (easy to tell
 * cards apart even before matching), a high round draws several creatures
 * from the same family (harder to distinguish at a glance).
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
 *
 * `mainPeriod` and `classification` back the "Línea del tiempo" mode
 * (src/game/timelineRound.js): the geologic period the creature is
 * best-known from (one of PERIODS -- Triásico/Jurásico/Cretácico) and
 * whether it is a true dinosaur, a flying reptile (e.g. Pteranodon, a
 * pterosaur -- not a dinosaur, PRD G4: no false scientific claims) or
 * something else. Both mirror the same `funFacts` used for `lengthMeters`
 * (e.g. "trex-14": "...hace 66 millones de años..." + "trex-03": "...hace
 * unos 68 millones de años..." -> Cretácico; "pteranodon-10": "...Cretácico
 * Superior" together with Pteranodon being a pterosaur, not a dinosaur, ->
 * `CLASSIFICATIONS.REPTIL_VOLADOR`), so no mode ever contradicts the dato
 * curioso shown for the same creature. `temporalRangeMillionsOfYears` is
 * only ever set when `funFacts` states an explicit "hace unos X a Y
 * millones de años" range for that creature (e.g. "diplodocus-05": "...hace
 * unos 154 a 152 millones de años") -- never a single approximate figure,
 * so a mode can show a precise interval only when one is actually verified
 * instead of inventing precision the source data doesn't have.
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

// Línea del tiempo's three answer categories -- a creature's `mainPeriod`
// must be exactly one of these to be eligible for that mode's rounds.
const PERIODS = Object.freeze({
  TRIASICO: 'triasico',
  JURASICO: 'jurasico',
  CRETACICO: 'cretacico',
});

// Línea del tiempo's classification explanation categories. REPTIL_VOLADOR
// covers pterosaurs (e.g. Pteranodon), which lived alongside dinosaurs but
// are not dinosaurs -- kept distinct so the mode never states that as fact.
const CLASSIFICATIONS = Object.freeze({
  DINOSAURIO: 'dinosaurio',
  REPTIL_VOLADOR: 'reptil_volador',
  OTRO: 'otro',
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
// tolerates a partial/full rotation without becoming unrecognizable.
const GROUND_TRANSFORMS = Object.freeze([SHADOW_TRANSFORMS.FLIP_HORIZONTAL]);
const FLYER_TRANSFORMS = Object.freeze([
  SHADOW_TRANSFORMS.FLIP_HORIZONTAL,
  SHADOW_TRANSFORMS.ROTATE_90,
  SHADOW_TRANSFORMS.ROTATE_180,
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

/** `{ startMya, endMya }`, or `undefined` when funFacts only gives a single approximate figure -- never fabricated precision. */
function temporalRange(startMya, endMya) {
  return Object.freeze({ startMya, endMya });
}

const CREATURE_SHEETS = Object.freeze({
  [DINOSAURS.TREX]: Object.freeze({
    id: DINOSAURS.TREX,
    diet: DIETS.CARNIVORO,
    lengthMeters: 12,
    visualFamily: VISUAL_FAMILIES.BIPED_CARNIVORE,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.BIPED_CARNIVORE_LARGE),
    mainPeriod: PERIODS.CRETACICO,
    classification: CLASSIFICATIONS.DINOSAURIO,
    temporalRangeMillionsOfYears: temporalRange(68, 66),
  }),
  [DINOSAURS.TRICERATOPS]: Object.freeze({
    id: DINOSAURS.TRICERATOPS,
    diet: DIETS.HERBIVORO,
    lengthMeters: 9,
    visualFamily: VISUAL_FAMILIES.ARMORED_QUADRUPED,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.QUADRUPED_HORNED),
    mainPeriod: PERIODS.CRETACICO,
    classification: CLASSIFICATIONS.DINOSAURIO,
  }),
  [DINOSAURS.VELOCIRAPTOR]: Object.freeze({
    id: DINOSAURS.VELOCIRAPTOR,
    diet: DIETS.CARNIVORO,
    lengthMeters: 2,
    visualFamily: VISUAL_FAMILIES.BIPED_CARNIVORE,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.BIPED_CARNIVORE_MEDIUM),
    mainPeriod: PERIODS.CRETACICO,
    classification: CLASSIFICATIONS.DINOSAURIO,
  }),
  [DINOSAURS.ESTEGOSAURIO]: Object.freeze({
    id: DINOSAURS.ESTEGOSAURIO,
    diet: DIETS.HERBIVORO,
    lengthMeters: 9,
    visualFamily: VISUAL_FAMILIES.ARMORED_QUADRUPED,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.QUADRUPED_PLATED),
    mainPeriod: PERIODS.JURASICO,
    classification: CLASSIFICATIONS.DINOSAURIO,
  }),
  [DINOSAURS.BRAQUIOSAURIO]: Object.freeze({
    id: DINOSAURS.BRAQUIOSAURIO,
    diet: DIETS.HERBIVORO,
    lengthMeters: 21,
    visualFamily: VISUAL_FAMILIES.LONG_NECK_QUADRUPED,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.QUADRUPED_LONGNECK),
    mainPeriod: PERIODS.JURASICO,
    classification: CLASSIFICATIONS.DINOSAURIO,
  }),
  [DINOSAURS.ANKYLOSAURUS]: Object.freeze({
    id: DINOSAURS.ANKYLOSAURUS,
    diet: DIETS.HERBIVORO,
    lengthMeters: 7,
    visualFamily: VISUAL_FAMILIES.ARMORED_QUADRUPED,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.QUADRUPED_ARMORED),
    mainPeriod: PERIODS.CRETACICO,
    classification: CLASSIFICATIONS.DINOSAURIO,
  }),
  [DINOSAURS.PTERANODON]: Object.freeze({
    id: DINOSAURS.PTERANODON,
    diet: DIETS.CARNIVORO,
    lengthMeters: 1.8,
    visualFamily: VISUAL_FAMILIES.FLYING_REPTILE,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.FLYER, FLYER_TRANSFORMS),
    mainPeriod: PERIODS.CRETACICO,
    // A pterosaur, not a dinosaur -- Línea del tiempo's classification
    // explanation must say so explicitly (PRD G4).
    classification: CLASSIFICATIONS.REPTIL_VOLADOR,
  }),
  [DINOSAURS.SPINOSAURUS]: Object.freeze({
    id: DINOSAURS.SPINOSAURUS,
    diet: DIETS.CARNIVORO,
    lengthMeters: 15,
    visualFamily: VISUAL_FAMILIES.BIPED_CARNIVORE,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.BIPED_CARNIVORE_LARGE),
    mainPeriod: PERIODS.CRETACICO,
    classification: CLASSIFICATIONS.DINOSAURIO,
    temporalRangeMillionsOfYears: temporalRange(99, 93),
  }),
  [DINOSAURS.DILOPHOSAURUS]: Object.freeze({
    id: DINOSAURS.DILOPHOSAURUS,
    diet: DIETS.CARNIVORO,
    lengthMeters: 6.5,
    visualFamily: VISUAL_FAMILIES.BIPED_CARNIVORE,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.BIPED_CARNIVORE_MEDIUM),
    mainPeriod: PERIODS.JURASICO,
    classification: CLASSIFICATIONS.DINOSAURIO,
  }),
  [DINOSAURS.PACHYCEPHALOSAURUS]: Object.freeze({
    id: DINOSAURS.PACHYCEPHALOSAURUS,
    // Omnivoro, not herbivoro: funFacts "pachycephalosaurus-02" ("se
    // alimentaba principalmente de plantas, aunque también pudo comer algún
    // insecto ocasional") and "-16" ("dientes ... sugieren que podía tener
    // una dieta mixta, con plantas y posiblemente pequeños animales o
    // insectos") already verify a mixed plant-and-animal diet -- this sheet
    // must match, per this file's own doc comment.
    diet: DIETS.OMNIVORO,
    lengthMeters: 4.5,
    visualFamily: VISUAL_FAMILIES.BIPED_HERBIVORE,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.DOME_HEAD),
    mainPeriod: PERIODS.CRETACICO,
    classification: CLASSIFICATIONS.DINOSAURIO,
    temporalRangeMillionsOfYears: temporalRange(70, 66),
  }),
  [DINOSAURS.COMPSOGNATHUS]: Object.freeze({
    id: DINOSAURS.COMPSOGNATHUS,
    diet: DIETS.CARNIVORO,
    lengthMeters: 1,
    visualFamily: VISUAL_FAMILIES.BIPED_CARNIVORE,
    shadowMeta: UNAPPROVED_SHADOW,
    mainPeriod: PERIODS.JURASICO,
    classification: CLASSIFICATIONS.DINOSAURIO,
  }),
  [DINOSAURS.DIPLODOCUS]: Object.freeze({
    id: DINOSAURS.DIPLODOCUS,
    diet: DIETS.HERBIVORO,
    lengthMeters: 25,
    visualFamily: VISUAL_FAMILIES.LONG_NECK_QUADRUPED,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.QUADRUPED_LONGNECK),
    mainPeriod: PERIODS.JURASICO,
    classification: CLASSIFICATIONS.DINOSAURIO,
    temporalRangeMillionsOfYears: temporalRange(154, 152),
  }),
  [DINOSAURS.IGUANODON]: Object.freeze({
    id: DINOSAURS.IGUANODON,
    diet: DIETS.HERBIVORO,
    lengthMeters: 10,
    visualFamily: VISUAL_FAMILIES.BIPED_HERBIVORE,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.QUADRUPED_DUCKBILL),
    mainPeriod: PERIODS.CRETACICO,
    classification: CLASSIFICATIONS.DINOSAURIO,
    temporalRangeMillionsOfYears: temporalRange(125, 120),
  }),
  [DINOSAURS.PARASAUROLOPHUS]: Object.freeze({
    id: DINOSAURS.PARASAUROLOPHUS,
    diet: DIETS.HERBIVORO,
    lengthMeters: 10,
    visualFamily: VISUAL_FAMILIES.BIPED_HERBIVORE,
    shadowMeta: approvedShadow(SHADOW_COMPATIBILITY_GROUPS.QUADRUPED_DUCKBILL),
    mainPeriod: PERIODS.CRETACICO,
    classification: CLASSIFICATIONS.DINOSAURIO,
    temporalRangeMillionsOfYears: temporalRange(76, 73),
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

/** Convenience accessor for just the `lengthMeters` field of `getCreatureSheet(dinosaurId)`. */
function getCreatureLengthMeters(dinosaurId) {
  const sheet = getCreatureSheet(dinosaurId);
  return sheet ? sheet.lengthMeters : undefined;
}

/** Convenience accessor for just the `visualFamily` field of `getCreatureSheet(dinosaurId)`. */
function getCreatureVisualFamily(dinosaurId) {
  const sheet = getCreatureSheet(dinosaurId);
  return sheet ? sheet.visualFamily : undefined;
}

/** Convenience accessor for just the `mainPeriod` field of `getCreatureSheet(dinosaurId)`. */
function getCreatureMainPeriod(dinosaurId) {
  const sheet = getCreatureSheet(dinosaurId);
  return sheet ? sheet.mainPeriod : undefined;
}

/** Convenience accessor for just the `classification` field of `getCreatureSheet(dinosaurId)`. */
function getCreatureClassification(dinosaurId) {
  const sheet = getCreatureSheet(dinosaurId);
  return sheet ? sheet.classification : undefined;
}

/** Convenience accessor for just the `temporalRangeMillionsOfYears` field of `getCreatureSheet(dinosaurId)` -- `undefined` when no precise range is verified. */
function getCreatureTemporalRange(dinosaurId) {
  const sheet = getCreatureSheet(dinosaurId);
  return sheet ? sheet.temporalRangeMillionsOfYears : undefined;
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

// Mirrors src/game/modesCatalog.js's MODES_CATALOG entry for MODE_IDS.CLASIFICA
// (minCreaturesWithField on "diet", minCount 6, requireAllCategories the
// three DIETS) -- kept here too so this module can answer "is Clasifica
// actually unlocked?" against the real, verified roster.
const CLASSIFY_MODE_MIN_CREATURES = 6;
const CLASSIFY_MODE_REQUIRED_DIETS = Object.freeze(Object.values(DIETS));

/**
 * Ids of every creature with a verified `diet` (one of DIETS' three values),
 * in `CREATURE_SHEETS` order. `sheets` follows the same optional-override
 * shape as `getApprovedShadowCreatures`.
 */
function getCreaturesWithVerifiedDiet(sheets) {
  const source = sheets || CREATURE_SHEETS;
  return Object.keys(source).filter((id) => {
    const sheet = source[id];
    return Boolean(sheet && Object.values(DIETS).includes(sheet.diet));
  });
}

/**
 * Whether "Clasifica" has enough verified creatures to unlock (PRD/
 * MODES_CATALOG requirement: >=6 creatures with a verified diet, covering
 * carnivoro/herbivoro/omnivoro so no round is ever unsolvable). `catalog` is
 * optional and follows the same shape as `sheets` in
 * `getCreaturesWithVerifiedDiet` -- omit it to evaluate the live roster.
 */
function isClassifyModeUnlocked(catalog) {
  const source = catalog || CREATURE_SHEETS;
  const withDiet = getCreaturesWithVerifiedDiet(source);
  if (withDiet.length < CLASSIFY_MODE_MIN_CREATURES) {
    return false;
  }
  return CLASSIFY_MODE_REQUIRED_DIETS.every((diet) =>
    withDiet.some((id) => source[id].diet === diet)
  );
}

module.exports = {
  DIETS,
  VISUAL_FAMILIES,
  PERIODS,
  CLASSIFICATIONS,
  SHADOW_COMPATIBILITY_GROUPS,
  SHADOW_TRANSFORMS,
  SHADOW_INDISTINGUISHABLE_PAIRS,
  SHADOW_MODE_MIN_APPROVED,
  CLASSIFY_MODE_MIN_CREATURES,
  CLASSIFY_MODE_REQUIRED_DIETS,
  CREATURE_SHEETS,
  getCreatureSheet,
  getCreatureDiet,
  getCreatureLengthMeters,
  getCreatureVisualFamily,
  getCreatureMainPeriod,
  getCreatureClassification,
  getCreatureTemporalRange,
  getApprovedShadowCreatures,
  isShadowModeUnlocked,
  getCreaturesWithVerifiedDiet,
  isClassifyModeUnlocked,
};
