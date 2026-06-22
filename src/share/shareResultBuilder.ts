import { DecisionRecord, DecisionStatus, GameId, GameResult, ShareCardData } from '../domain/model';

const FALLBACK_MACHINE_QUOTE = 'The machine has spoken. Please pretend this was efficient.';

function isSuddenDeathDecision(decision: DecisionRecord): boolean {
  return decision.events.some((event) => event.type === 'sudden_death_triggered')
    || decision.gamesPlayed[decision.gamesPlayed.length - 1]?.gameId === GameId.SuddenDeath;
}

function getSelectedGameId(decision: DecisionRecord, lastGameResult?: GameResult): GameId {
  if (lastGameResult?.gameId) return lastGameResult.gameId;
  const latestRun = decision.gamesPlayed[decision.gamesPlayed.length - 1];
  if (latestRun?.gameId) return latestRun.gameId;
  if (decision.lockdown && decision.events.some((event) => event.type === 'sudden_death_triggered')) return GameId.SuddenDeath;
  return GameId.SuddenDeath;
}

function getFinalAnswer(decision: DecisionRecord, lastGameResult?: GameResult): string {
  return decision.finalAnswer
    ?? decision.lockdown?.finalAnswer
    ?? lastGameResult?.selectedOption
    ?? decision.gamesPlayed[decision.gamesPlayed.length - 1]?.selectedOptionText
    ?? 'Pending tiny machine verdict';
}

function getMachineQuote(decision: DecisionRecord, lastGameResult?: GameResult): string {
  return decision.finalMachineQuote
    ?? decision.lockdown?.finalMachineQuote
    ?? lastGameResult?.machineQuote
    ?? decision.gamesPlayed[decision.gamesPlayed.length - 1]?.machineQuote
    ?? FALLBACK_MACHINE_QUOTE;
}

function getDecisionStatus(decision: DecisionRecord): DecisionStatus {
  if (decision.lockdown) return DecisionStatus.Lockdown;
  if (decision.finalAnswer) return DecisionStatus.Complete;
  return decision.status;
}

export function buildShareResultData(decision: DecisionRecord, lastGameResult?: GameResult): ShareCardData {
  return {
    decisionProblem: decision.problem,
    options: decision.options.map((option) => option.text),
    selectedGameId: getSelectedGameId(decision, lastGameResult),
    finalAnswer: getFinalAnswer(decision, lastGameResult),
    decisionStatus: getDecisionStatus(decision),
    machineQuote: getMachineQuote(decision, lastGameResult),
    isSuddenDeath: isSuddenDeathDecision(decision),
    createdAt: decision.finalisedAt ?? decision.completedAt ?? decision.updatedAt ?? decision.createdAt,
  };
}

export { FALLBACK_MACHINE_QUOTE };
