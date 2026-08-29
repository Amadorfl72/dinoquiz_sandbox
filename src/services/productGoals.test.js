'use strict';

const {
  PRODUCT_GOALS_STORAGE_KEY,
  GOAL_IDS,
  GOAL_STATUS,
  getGoal,
  isApproved,
  approve,
  resetGoal,
  getAllGoals,
} = require('./productGoals');

function makeStorage() {
  const store = {};
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
    _store: store,
  };
}

describe('productGoals — local sign-off registry for PRD numeric goals', () => {
  it('namespaces the key under dinoquiz:', () => {
    expect(PRODUCT_GOALS_STORAGE_KEY).toBe('dinoquiz:productGoals');
  });

  it('exposes the three PRD numeric goal ids', () => {
    expect(GOAL_IDS.DISTRIBUCION_POR_MODO).toBe('distribucionPorModo');
    expect(GOAL_IDS.FINALIZACION).toBe('finalizacion');
    expect(GOAL_IDS.RETENCION_7_DIAS).toBe('retencion7dias');
  });

  it('defaults an unrecorded goal to pendiente', () => {
    const storage = makeStorage();
    expect(getGoal(GOAL_IDS.FINALIZACION, storage)).toEqual({
      status: GOAL_STATUS.PENDIENTE,
      target: null,
      approvedAt: null,
    });
    expect(isApproved(GOAL_IDS.FINALIZACION, storage)).toBe(false);
  });

  it('approves a goal with its numeric target', () => {
    const storage = makeStorage();
    expect(approve(GOAL_IDS.RETENCION_7_DIAS, 0.3, storage)).toBe(true);

    const goal = getGoal(GOAL_IDS.RETENCION_7_DIAS, storage);
    expect(goal.status).toBe(GOAL_STATUS.APROBADO);
    expect(goal.target).toBe(0.3);
    expect(typeof goal.approvedAt).toBe('number');
    expect(isApproved(GOAL_IDS.RETENCION_7_DIAS, storage)).toBe(true);
  });

  it('persists goals under a single JSON object keyed by goalId', () => {
    const storage = makeStorage();
    approve(GOAL_IDS.DISTRIBUCION_POR_MODO, 0.5, storage);
    const raw = JSON.parse(storage._store[PRODUCT_GOALS_STORAGE_KEY]);
    expect(raw[GOAL_IDS.DISTRIBUCION_POR_MODO].status).toBe('aprobado');
  });

  it('keeps other goals untouched when approving one goal', () => {
    const storage = makeStorage();
    approve(GOAL_IDS.FINALIZACION, 0.8, storage);
    approve(GOAL_IDS.DISTRIBUCION_POR_MODO, 0.5, storage);

    expect(isApproved(GOAL_IDS.FINALIZACION, storage)).toBe(true);
    expect(isApproved(GOAL_IDS.DISTRIBUCION_POR_MODO, storage)).toBe(true);
    expect(isApproved(GOAL_IDS.RETENCION_7_DIAS, storage)).toBe(false);
  });

  it('rejects a non-numeric or missing target without throwing', () => {
    const storage = makeStorage();
    expect(approve(GOAL_IDS.FINALIZACION, undefined, storage)).toBe(false);
    expect(approve(GOAL_IDS.FINALIZACION, 'high', storage)).toBe(false);
    expect(approve(GOAL_IDS.FINALIZACION, NaN, storage)).toBe(false);
    expect(isApproved(GOAL_IDS.FINALIZACION, storage)).toBe(false);
  });

  it('rejects a blank or non-string goalId without throwing', () => {
    const storage = makeStorage();
    expect(approve('', 0.5, storage)).toBe(false);
    expect(approve(null, 0.5, storage)).toBe(false);
    expect(isApproved('', storage)).toBe(false);
    expect(getGoal(null, storage)).toEqual({ status: GOAL_STATUS.PENDIENTE, target: null, approvedAt: null });
  });

  it('resets an approved goal back to pendiente', () => {
    const storage = makeStorage();
    approve(GOAL_IDS.FINALIZACION, 0.8, storage);
    expect(resetGoal(GOAL_IDS.FINALIZACION, storage)).toBe(true);
    expect(isApproved(GOAL_IDS.FINALIZACION, storage)).toBe(false);
  });

  it('resetGoal on an already-pendiente goal still reports success', () => {
    const storage = makeStorage();
    expect(resetGoal(GOAL_IDS.FINALIZACION, storage)).toBe(true);
  });

  it('returns every known goal defaulted to pendiente when nothing was approved', () => {
    const storage = makeStorage();
    const goals = getAllGoals(storage);
    expect(Object.keys(goals).sort()).toEqual(
      [GOAL_IDS.DISTRIBUCION_POR_MODO, GOAL_IDS.FINALIZACION, GOAL_IDS.RETENCION_7_DIAS].sort()
    );
    for (const goalId of Object.keys(goals)) {
      expect(goals[goalId].status).toBe(GOAL_STATUS.PENDIENTE);
    }
  });

  it('reflects approved goals in getAllGoals', () => {
    const storage = makeStorage();
    approve(GOAL_IDS.RETENCION_7_DIAS, 0.3, storage);
    const goals = getAllGoals(storage);
    expect(goals[GOAL_IDS.RETENCION_7_DIAS].status).toBe(GOAL_STATUS.APROBADO);
    expect(goals[GOAL_IDS.FINALIZACION].status).toBe(GOAL_STATUS.PENDIENTE);
  });

  it('returns pendiente instead of throwing when the stored value is corrupted JSON', () => {
    const storage = makeStorage();
    storage.setItem(PRODUCT_GOALS_STORAGE_KEY, '{not-json');
    expect(getGoal(GOAL_IDS.FINALIZACION, storage)).toEqual({
      status: GOAL_STATUS.PENDIENTE,
      target: null,
      approvedAt: null,
    });
  });

  it('discards a corrupted individual goal record but keeps the rest', () => {
    const storage = makeStorage();
    approve(GOAL_IDS.FINALIZACION, 0.8, storage);
    const raw = JSON.parse(storage._store[PRODUCT_GOALS_STORAGE_KEY]);
    raw[GOAL_IDS.RETENCION_7_DIAS] = { status: 'bogus' };
    storage.setItem(PRODUCT_GOALS_STORAGE_KEY, JSON.stringify(raw));

    expect(isApproved(GOAL_IDS.FINALIZACION, storage)).toBe(true);
    expect(isApproved(GOAL_IDS.RETENCION_7_DIAS, storage)).toBe(false);
  });

  it('degrades to a no-op false/default when no storage is available at all', () => {
    const originalLocalStorage = window.localStorage;
    Object.defineProperty(window, 'localStorage', { value: undefined, configurable: true });
    try {
      expect(approve(GOAL_IDS.FINALIZACION, 0.8, null)).toBe(false);
      expect(isApproved(GOAL_IDS.FINALIZACION, null)).toBe(false);
      expect(getGoal(GOAL_IDS.FINALIZACION, null)).toEqual({
        status: GOAL_STATUS.PENDIENTE,
        target: null,
        approvedAt: null,
      });
      expect(resetGoal(GOAL_IDS.FINALIZACION, null)).toBe(false);
    } finally {
      Object.defineProperty(window, 'localStorage', { value: originalLocalStorage, configurable: true });
    }
  });

  it('surfaces a throwing setItem as a false return instead of throwing', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      },
      removeItem: () => {},
    };
    expect(approve(GOAL_IDS.FINALIZACION, 0.8, storage)).toBe(false);
  });

  it('surfaces a throwing getItem as pendiente instead of throwing', () => {
    const storage = {
      getItem: () => {
        throw new Error('boom');
      },
      setItem: () => {},
      removeItem: () => {},
    };
    expect(getGoal(GOAL_IDS.FINALIZACION, storage).status).toBe(GOAL_STATUS.PENDIENTE);
  });
});
