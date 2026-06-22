import { createDecisionOption, createLockedDecision } from '../domain/helpers';
import { AppState, DecisionStatus, GameId, GameRun } from '../domain/model';
import { gameRegistry, getEligibleGames } from '../games/gameRegistry';
import { runGame } from '../services/gameRunner';
import { startLockdown } from '../services/overthinkingEngine';

const now = new Date('2026-06-22T12:00:00.000Z');

function decision(optionTexts: string[]) {
  return createLockedDecision('Choose', optionTexts.map((text, index) => createDecisionOption(String(index), text)));
}

function state(optionTexts: string[]): AppState {
  return { currentDecision: decision(optionTexts), previousDecisions: [] };
}

function optionTexts(appState: AppState): string[] {
  return appState.currentDecision?.options.map((option) => option.text) ?? [];
}

function fakeRun(index: number): GameRun {
  return {
    id: `run_${index}`,
    gameId: GameId.CoinToss,
    selectedOptionId: `option_${index}`,
    selectedOptionText: 'Alpha',
    machineQuote: 'Fake but polite.',
    createdAt: new Date(now.getTime() + index).toISOString(),
  };
}

describe('P5 game logic modules', () => {
  it('registers exactly the 9 V1 games', () => {
    expect(gameRegistry.map((game) => game.id)).toEqual([
      GameId.CoinToss,
      GameId.BestOf5,
      GameId.WheelOfFate,
      GameId.GutCheck,
      GameId.ChaosGoblin,
      GameId.BrutalHonesty,
      GameId.RealityChecker,
      GameId.EliminationChamber,
      GameId.BattleRoyale,
    ]);
  });

  it('eligibility works for 2 options', () => {
    expect(getEligibleGames(decision(['Alpha', 'Beta'])).map((game) => game.id)).toEqual([
      GameId.CoinToss,
      GameId.BestOf5,
      GameId.GutCheck,
      GameId.ChaosGoblin,
      GameId.BrutalHonesty,
      GameId.RealityChecker,
    ]);
  });

  it('eligibility works for 3+ options', () => {
    expect(getEligibleGames(decision(['Alpha', 'Beta', 'Gamma'])).map((game) => game.id)).toEqual([
      GameId.WheelOfFate,
      GameId.GutCheck,
      GameId.ChaosGoblin,
      GameId.BrutalHonesty,
      GameId.RealityChecker,
      GameId.EliminationChamber,
      GameId.BattleRoyale,
    ]);
  });

  it('each game selects only user-entered options', () => {
    for (const game of gameRegistry) {
      const testDecision = game.minimumOptions === 2 && game.maximumOptions === 2 ? decision(['Alpha', 'Beta']) : decision(['Alpha', 'Beta', 'Gamma']);
      const result = game.run(testDecision, now);

      expect(testDecision.options.map((option) => option.text)).toContain(result.selectedOption);
    }
  });

  it('Best of 5 creates 5 rounds and majority winner', () => {
    const game = gameRegistry.find((candidate) => candidate.id === GameId.BestOf5)!;
    const result = game.run(decision(['Alpha', 'Beta']), now);
    const score = result.details.score!;

    expect(result.details.rounds).toHaveLength(5);
    expect(score[result.selectedOptionId]).toBeGreaterThanOrEqual(3);
  });

  it('Elimination Chamber eliminates down to one', () => {
    const result = gameRegistry.find((candidate) => candidate.id === GameId.EliminationChamber)!.run(decision(['Alpha', 'Beta', 'Gamma', 'Delta']), now);

    expect(result.details.eliminatedOptions).toHaveLength(3);
    expect(['Alpha', 'Beta', 'Gamma', 'Delta']).toContain(result.selectedOption);
  });

  it('Battle Royale creates at least one matchup and champion', () => {
    const result = gameRegistry.find((candidate) => candidate.id === GameId.BattleRoyale)!.run(decision(['Alpha', 'Beta', 'Gamma']), now);

    expect(result.details.matchups!.length).toBeGreaterThan(0);
    expect(result.details.champion).toBe(result.selectedOption);
  });

  it('Reality Checker uses configured name if present', () => {
    const testDecision = { ...decision(['Alpha', 'Beta']), realityCheckerName: 'Riley' };
    const result = gameRegistry.find((candidate) => candidate.id === GameId.RealityChecker)!.run(testDecision, now);

    expect(result.machineQuote).toBe('Riley says: just pick one.');
  });

  it('runGame consumes one credit', () => {
    const outcome = runGame(state(['Alpha', 'Beta']), GameId.CoinToss, now);

    expect(outcome.state.currentDecision?.credits.used).toBe(1);
    expect(outcome.state.currentDecision?.credits.remaining).toBe(4);
    expect(optionTexts(outcome.state)).toContain(outcome.result.selectedOption);
  });

  it('runGame blocks ineligible games', () => {
    expect(() => runGame(state(['Alpha', 'Beta']), GameId.WheelOfFate, now)).toThrow(/not eligible/);
  });

  it('runGame blocks during lockdown', () => {
    const lockedDown = startLockdown(decision(['Alpha', 'Beta']), 'Alpha', now);

    expect(() => runGame({ currentDecision: lockedDown, previousDecisions: [] }, GameId.CoinToss, now)).toThrow(/locked/);
  });

  it('runGame triggers Sudden Death after 5th attempt', () => {
    const currentDecision = decision(['Alpha', 'Beta']);
    currentDecision.gamesPlayed = [fakeRun(0), fakeRun(1), fakeRun(2), fakeRun(3)];
    const outcome = runGame({ currentDecision, previousDecisions: [] }, GameId.CoinToss, now);

    expect(outcome.suddenDeathTriggered).toBe(true);
    expect(outcome.state.currentDecision?.status).toBe(DecisionStatus.Lockdown);
    expect(outcome.state.currentDecision?.gamesPlayed).toHaveLength(5);
  });
});
