'use strict';

const {
  ROUNDS_PER_GAME,
  HOOK_EVENTS,
  createHooks,
  startGame,
  evaluateAnswer,
  advanceRound,
  pauseGame,
  resumeGame,
} = require('./roundContract');

function buildGenerateRound() {
  let calls = 0;
  const generateRound = (roundIndex, context) => {
    calls += 1;
    return { prompt: `round-${roundIndex}`, context: context || null };
  };
  generateRound.callCount = () => calls;
  return generateRound;
}

function recordedHooks() {
  const hooks = createHooks();
  const events = [];
  Object.keys(HOOK_EVENTS).forEach((key) => {
    hooks.on(HOOK_EVENTS[key], (payload) => events.push({ event: HOOK_EVENTS[key], payload }));
  });
  return { hooks, events };
}

/** Plays a full round: evaluate `isCorrect`, then advance -- the shape every mode's screen drives the contract with. */
function playRound(session, isCorrect) {
  const evaluated = evaluateAnswer(session, { isCorrect });
  const advanced = advanceRound(evaluated.session);
  return advanced;
}

function playRounds(session, outcomes) {
  let current = session;
  let last;
  outcomes.forEach((isCorrect) => {
    last = playRound(current, isCorrect);
    current = last.session;
  });
  return { session: current, lastResult: last };
}

describe('startGame', () => {
  test('starts a session of exactly ROUNDS_PER_GAME rounds via the injected generator', () => {
    expect(ROUNDS_PER_GAME).toBe(10);
    const generateRound = buildGenerateRound();
    const session = startGame({ generateRound, context: { level: 3 } });

    expect(session.roundCount).toBe(10);
    expect(session.status).toBe('playing');
    expect(session.roundIndex).toBe(0);
    expect(session.state).toEqual({ score: 0, questionIndex: 0, answers: [] });
    expect(session.round).toMatchObject({ prompt: 'round-0', roundIndex: 0, answered: false });
    expect(generateRound.callCount()).toBe(1);
  });

  test('throws when generateRound is not injected', () => {
    expect(() => startGame({})).toThrow(/generateRound/);
  });

  test('emits game:started then round:started for the first round', () => {
    const { hooks, events } = recordedHooks();
    startGame({ generateRound: buildGenerateRound(), hooks });

    expect(events.map((entry) => entry.event)).toEqual([HOOK_EVENTS.GAME_STARTED, HOOK_EVENTS.ROUND_STARTED]);
    expect(events[1].payload.roundIndex).toBe(0);
  });
});

describe('evaluateAnswer', () => {
  test('updates score/aciertos exactly once and marks the round answered, without advancing it', () => {
    const session = startGame({ generateRound: buildGenerateRound() });

    const result = evaluateAnswer(session, { isCorrect: true, selected: 'a' });

    expect(result.accepted).toBe(true);
    expect(result.session.state.score).toBe(1);
    expect(result.session.state.questionIndex).toBe(1);
    expect(result.session.state.answers).toEqual([{ isCorrect: true, selected: 'a', roundIndex: 0 }]);
    expect(result.session.roundIndex).toBe(0);
    expect(result.session.round).toMatchObject({ roundIndex: 0, answered: true, isCorrect: true });
  });

  test('a wrong answer never subtracts', () => {
    const session = startGame({ generateRound: buildGenerateRound() });
    const result = evaluateAnswer(session, { isCorrect: false });

    expect(result.session.state.score).toBe(0);
    expect(result.session.round.answered).toBe(true);
  });

  test('blocks a duplicate submission for the same round: it is not counted twice', () => {
    const session = startGame({ generateRound: buildGenerateRound() });
    const first = evaluateAnswer(session, { isCorrect: true });
    const second = evaluateAnswer(first.session, { isCorrect: true });

    expect(first.accepted).toBe(true);
    expect(second.accepted).toBe(false);
    expect(second.session).toBe(first.session);
    expect(second.session.state.score).toBe(1);
    expect(second.session.state.answers).toHaveLength(1);
  });

  test('rejects submissions once the game is finished', () => {
    const session = startGame({ generateRound: buildGenerateRound() });
    const { session: finished } = playRounds(session, new Array(10).fill(true));

    const result = evaluateAnswer(finished, { isCorrect: true });

    expect(result.accepted).toBe(false);
    expect(finished.state.score).toBe(10);
  });

  test('emits answer:rejected instead of round:evaluated for a duplicate submission', () => {
    const { hooks, events } = recordedHooks();
    const session = startGame({ generateRound: buildGenerateRound(), hooks });
    const first = evaluateAnswer(session, { isCorrect: true });
    events.length = 0;

    evaluateAnswer(first.session, { isCorrect: true });

    expect(events).toHaveLength(1);
    expect(events[0].event).toBe(HOOK_EVENTS.ANSWER_REJECTED);
    expect(events[0].payload.reason).toBe('duplicate');
  });
});

describe('advanceRound', () => {
  test('is a no-op until the current round has been evaluated', () => {
    const session = startGame({ generateRound: buildGenerateRound() });
    const result = advanceRound(session);

    expect(result.accepted).toBe(false);
    expect(result.session).toBe(session);
    expect(result.session.roundIndex).toBe(0);
  });

  test('generates the next round via the injected generator after an evaluated round', () => {
    const generateRound = buildGenerateRound();
    const session = startGame({ generateRound });
    const evaluated = evaluateAnswer(session, { isCorrect: true });

    const result = advanceRound(evaluated.session);

    expect(result.accepted).toBe(true);
    expect(result.gameOver).toBe(false);
    expect(result.session.roundIndex).toBe(1);
    expect(result.session.round).toMatchObject({ prompt: 'round-1', roundIndex: 1, answered: false });
    expect(generateRound.callCount()).toBe(2);
  });

  test('advancing twice in a row only moves one round: the second call finds a fresh, unanswered round', () => {
    const session = startGame({ generateRound: buildGenerateRound() });
    const evaluated = evaluateAnswer(session, { isCorrect: true });
    const first = advanceRound(evaluated.session);
    const second = advanceRound(first.session);

    expect(first.accepted).toBe(true);
    expect(second.accepted).toBe(false);
    expect(second.session.roundIndex).toBe(1);
  });

  test('ends the game after exactly the 10th round, never before', () => {
    const generateRound = buildGenerateRound();
    const session = startGame({ generateRound });
    const outcomes = [true, true, false, true, true, false, true, false, true, true];

    const { session: finalSession, lastResult } = playRounds(session, outcomes);

    expect(lastResult.gameOver).toBe(true);
    expect(finalSession.status).toBe('finished');
    expect(finalSession.state.questionIndex).toBe(10);
    expect(finalSession.state.answers).toHaveLength(10);
    expect(finalSession.state.score).toBe(outcomes.filter(Boolean).length);
    // The generator is called once per round started (round 0 by startGame,
    // rounds 1-9 by advanceRound) -- never an 11th time.
    expect(generateRound.callCount()).toBe(10);
  });

  test('emits round:evaluated for every round and game:over only on the last one', () => {
    const { hooks, events } = recordedHooks();
    const session = startGame({ generateRound: buildGenerateRound(), hooks });
    playRounds(session, new Array(10).fill(true));

    const evaluated = events.filter((entry) => entry.event === HOOK_EVENTS.ANSWER_EVALUATED);
    const gameOver = events.filter((entry) => entry.event === HOOK_EVENTS.GAME_OVER);
    expect(evaluated).toHaveLength(10);
    expect(gameOver).toHaveLength(1);
  });
});

describe('pauseGame / resumeGame', () => {
  test('a paused session rejects both evaluate and advance until resumed', () => {
    const session = startGame({ generateRound: buildGenerateRound() });
    const evaluated = evaluateAnswer(session, { isCorrect: true });
    const paused = pauseGame(evaluated.session);

    expect(paused.status).toBe('paused');
    const rejectedAdvance = advanceRound(paused);
    expect(rejectedAdvance.accepted).toBe(false);
    expect(rejectedAdvance.session.roundIndex).toBe(0);

    const resumed = resumeGame(paused);
    expect(resumed.status).toBe('playing');
    const advanced = advanceRound(resumed);
    expect(advanced.accepted).toBe(true);
    expect(advanced.session.roundIndex).toBe(1);
  });

  test('evaluateAnswer is rejected while paused', () => {
    const session = startGame({ generateRound: buildGenerateRound() });
    const paused = pauseGame(session);

    const result = evaluateAnswer(paused, { isCorrect: true });

    expect(result.accepted).toBe(false);
    expect(result.session.state.score).toBe(0);
  });

  test('pausing/resuming a session in the wrong state is a no-op', () => {
    const session = startGame({ generateRound: buildGenerateRound() });
    expect(resumeGame(session)).toBe(session);

    const paused = pauseGame(session);
    expect(pauseGame(paused)).toBe(paused);
  });

  test('emits game:paused and game:resumed', () => {
    const { hooks, events } = recordedHooks();
    const session = startGame({ generateRound: buildGenerateRound(), hooks });
    events.length = 0;

    const paused = pauseGame(session);
    resumeGame(paused);

    expect(events.map((entry) => entry.event)).toEqual([HOOK_EVENTS.GAME_PAUSED, HOOK_EVENTS.GAME_RESUMED]);
  });
});

describe('createHooks', () => {
  test('on() returns an unsubscribe function', () => {
    const hooks = createHooks();
    const calls = [];
    const off = hooks.on('custom', (payload) => calls.push(payload));

    hooks.emit('custom', 1);
    off();
    hooks.emit('custom', 2);

    expect(calls).toEqual([1]);
  });

  test('a throwing handler does not stop other handlers or the caller', () => {
    const hooks = createHooks();
    const calls = [];
    hooks.on('custom', () => {
      throw new Error('boom');
    });
    hooks.on('custom', () => calls.push('second'));

    expect(() => hooks.emit('custom', null)).not.toThrow();
    expect(calls).toEqual(['second']);
  });
});
