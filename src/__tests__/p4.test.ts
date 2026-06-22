import { createDecisionOption, createLockedDecision } from '../domain/helpers';
import { AppState, DecisionStatus, GameId, GameRun, LOCKDOWN_DURATION_MS } from '../domain/model';
import {
  getCreditsRemaining,
  getEscalationMessage,
  getLockdownMessage,
  getLockdownRemainingMs,
  recordGameAttempt,
  runSuddenDeath,
  shouldTriggerSuddenDeath,
  startLockdown,
  triggerSuddenDeathIfNeeded,
} from '../services/overthinkingEngine';

const now = new Date('2026-06-22T12:00:00.000Z');

function decisionWithAttempts(count: number) {
  const decision = createLockedDecision('Choose lunch', [createDecisionOption('A', 'Pizza'), createDecisionOption('B', 'Tacos')]);
  decision.gamesPlayed = Array.from({ length: count }, (_, index) => fakeRun(index));
  return decision;
}

function fakeRun(index: number): GameRun {
  return {
    id: `run_${index}`,
    gameId: GameId.CoinToss,
    selectedOptionId: 'option_a',
    selectedOptionText: 'Pizza',
    machineQuote: 'Tiny coin says yes.',
    createdAt: new Date(now.getTime() + index).toISOString(),
  };
}

describe('P4 overthinking engine', () => {
  it('reports 0 attempts as 5 credits', () => {
    expect(getCreditsRemaining(decisionWithAttempts(0))).toBe(5);
  });

  it('reports 4 attempts as 1 credit', () => {
    expect(getCreditsRemaining(decisionWithAttempts(4))).toBe(1);
  });

  it('requires sudden death at 5 attempts', () => {
    expect(shouldTriggerSuddenDeath(decisionWithAttempts(5))).toBe(true);
  });

  it('picks sudden death from existing options', () => {
    const decision = decisionWithAttempts(5);
    const result = runSuddenDeath(decision, now);

    expect(decision.options.map((option) => option.id)).toContain(result.selectedOptionId);
    expect(decision.options.map((option) => option.text)).toContain(result.selectedOptionText);
  });

  it('starts a 5 minute lockdown', () => {
    const lockedDown = startLockdown(decisionWithAttempts(5), 'Pizza', now);

    expect(lockedDown.status).toBe(DecisionStatus.Lockdown);
    expect(getLockdownRemainingMs(lockedDown, now)).toBe(LOCKDOWN_DURATION_MS);
    expect(getLockdownRemainingMs(lockedDown, new Date(now.getTime() + LOCKDOWN_DURATION_MS))).toBe(0);
  });

  it('does not record games during lockdown', () => {
    const lockedDown = startLockdown(decisionWithAttempts(1), 'Pizza', now);
    const state: AppState = { currentDecision: lockedDown, previousDecisions: [] };
    const nextState = recordGameAttempt(state, fakeRun(2));

    expect(nextState).toBe(state);
    expect(nextState.currentDecision?.gamesPlayed.length).toBe(1);
  });

  it('returns safe playful escalation messages', () => {
    const message = getEscalationMessage(decisionWithAttempts(4));

    expect(message).toBe('Overthinking levels are approaching silly.');
    expect(message.toLowerCase().includes('panic')).toBe(false);
  });

  it('returns safe playful lockdown messages', () => {
    const lockedDown = startLockdown(decisionWithAttempts(5), 'Pizza', now);
    const message = getLockdownMessage(lockedDown, now);

    expect(typeof message).toBe('string');
    expect(message.length > 0).toBe(true);
    expect(message.toLowerCase().includes('doom')).toBe(false);
  });

  it('records game attempts and triggers sudden death at attempt 5', () => {
    let state: AppState = { currentDecision: decisionWithAttempts(4), previousDecisions: [] };
    state = recordGameAttempt(state, fakeRun(4));
    state = triggerSuddenDeathIfNeeded(state, now);

    expect(state.currentDecision?.status).toBe(DecisionStatus.Lockdown);
    expect(Boolean(state.currentDecision?.finalAnswer)).toBe(true);
    expect(state.currentDecision?.gamesPlayed.length).toBe(5);
  });
});
