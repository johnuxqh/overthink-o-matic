import {
  calculateCreditsRemaining,
  createDecisionOption,
  createDraftDecision,
  createLockedDecision,
  detectGoalpostShift,
  isDecisionLockedDown,
  normaliseOptionText,
  validateOptions,
  validateProblemText,
} from '../domain/helpers';
import { DecisionStatus, MAX_DECISION_CREDITS } from '../domain/model';
import { LocalStorageService } from '../storage/localStorageService';

const fixedDate = new Date('2026-06-22T00:00:00.000Z');

describe('P3 domain helpers', () => {
  it('validates problem text', () => {
    expect(validateProblemText('  Should I order tacos?  ')).toBe(true);
    expect(validateProblemText('    ')).toBe(false);
  });

  it('validates minimum 2 non-empty options', () => {
    expect(validateOptions([createDecisionOption('A', 'pizza'), createDecisionOption('B', 'tacos')])).toBe(true);
    expect(validateOptions([createDecisionOption('A', 'pizza'), createDecisionOption('B', '   ')])).toBe(false);
  });

  it('normalises option text', () => {
    expect(normaliseOptionText('  Pizza   Again  ')).toBe('pizza again');
  });

  it('creates locked decision with 5 credits', () => {
    const decision = createLockedDecision('Choose lunch', [createDecisionOption('A', 'Pizza'), createDecisionOption('B', 'Tacos')]);

    expect(decision.status).toBe(DecisionStatus.Locked);
    expect(decision.credits.total).toBe(MAX_DECISION_CREDITS);
    expect(decision.credits.remaining).toBe(5);
  });

  it('calculates credits remaining', () => {
    const decision = createDraftDecision('Choose lunch');
    decision.credits.used = 3;

    expect(calculateCreditsRemaining(decision)).toBe(2);
  });

  it('detects lockdown correctly', () => {
    const decision = createDraftDecision('Choose lunch');
    decision.status = DecisionStatus.Lockdown;
    decision.lockdown = {
      startedAt: fixedDate.toISOString(),
      endsAt: new Date('2026-06-22T00:05:00.000Z').toISOString(),
      finalOptionId: 'option_a',
      finalAnswer: 'Pizza',
      rotatingMessageIndex: 0,
    };

    expect(isDecisionLockedDown(decision, new Date('2026-06-22T00:04:59.000Z'))).toBe(true);
    expect(isDecisionLockedDown(decision, new Date('2026-06-22T00:05:00.000Z'))).toBe(false);
  });

  it('detects repeated normalised option text as a goalpost shift', () => {
    const previousDecision = createLockedDecision('Old lunch', [createDecisionOption('A', '  Pizza Again  '), createDecisionOption('B', 'Tacos')]);
    const result = detectGoalpostShift([createDecisionOption('A', 'pizza   again')], previousDecision);

    expect(result.isGoalpostMove).toBe(true);
    expect(result.matchedOptionTexts.join(',')).toBe('pizza again');
  });
});

describe('LocalStorageService', () => {
  it('handles empty values safely', async () => {
    localStorage.clear();
    const service = new LocalStorageService();

    expect(await service.getUserProfile()).toBe(undefined);
    expect(await service.getCurrentDecision()).toBe(undefined);
    expect((await service.listPreviousDecisions()).length).toBe(0);
  });

  it('handles corrupt values safely', async () => {
    localStorage.clear();
    const service = new LocalStorageService();
    localStorage.setItem('overthink-o-matic:user-profile', '{nope');
    localStorage.setItem('overthink-o-matic:current-decision', '{nope');
    localStorage.setItem('overthink-o-matic:previous-decisions', '{nope');

    expect(await service.getUserProfile()).toBe(undefined);
    expect(await service.getCurrentDecision()).toBe(undefined);
    expect((await service.listPreviousDecisions()).length).toBe(0);
  });
});
