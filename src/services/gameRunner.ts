import { AppState, DecisionStatus, GameId, GameResult, GameRun } from '../domain/model';
import { getGameById, getEligibleGames } from '../games/gameRegistry';
import { getAttemptsRemaining, recordGameAttempt, triggerBarryTakeoverIfNeeded } from './overthinkingEngine';

export interface RunGameResult {
  state: AppState;
  result: GameResult;
  barryTakeoverTriggered: boolean;
}

function toGameRun(result: GameResult): GameRun {
  return {
    id: result.id,
    gameId: result.gameId,
    selectedOptionId: result.selectedOptionId,
    selectedOptionText: result.selectedOption,
    machineQuote: result.machineQuote,
    createdAt: result.createdAt,
  };
}

function decisionWithRealityChecker(state: AppState): NonNullable<AppState['currentDecision']> {
  return {
    ...state.currentDecision!,
    realityCheckerName: state.currentDecision?.realityCheckerName ?? state.user?.realityCheckerName,
  };
}

export function runGame(state: AppState, gameId: GameId, now: Date): RunGameResult {
  if (!state.currentDecision) {
    throw new Error('No active decision exists. The machine cannot overthink a void.');
  }

  if (state.currentDecision.status !== DecisionStatus.Locked) {
    throw new Error('Decision must be locked before a game can run. Rules are annoying like that.');
  }

  if (state.currentDecision.lockdown) {
    throw new Error('No games may run during lockdown. Nice try.');
  }

  const game = getGameById(gameId);
  if (!game) {
    throw new Error('Selected game does not exist. Suspicious.');
  }

  const decision = decisionWithRealityChecker(state);
  if (!game.eligibility(decision)) {
    throw new Error('That game is not eligible for this option count. The machine is being fussy but fair.');
  }

  if (getAttemptsRemaining(decision) <= 0) {
    throw new Error('No decision attempts remain. Barry is cutting you off affectionately.');
  }

  const result = game.run(decision, now);
  const stateAfterAttempt = recordGameAttempt({ ...state, currentDecision: decision }, toGameRun(result));
  const stateAfterTakeover = triggerBarryTakeoverIfNeeded(stateAfterAttempt, now);

  return {
    state: stateAfterTakeover,
    result,
    barryTakeoverTriggered: stateAfterAttempt.currentDecision?.status !== DecisionStatus.Lockdown && stateAfterTakeover.currentDecision?.status === DecisionStatus.Lockdown,
  };
}

export { getEligibleGames };
