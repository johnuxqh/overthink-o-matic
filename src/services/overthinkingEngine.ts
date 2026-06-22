import {
  AppState,
  DecisionEventType,
  DecisionRecord,
  DecisionStatus,
  GameId,
  GameRun,
  LOCKDOWN_DURATION_MS,
  MAX_DECISION_CREDITS,
} from '../domain/model';

export type OverthinkingLevel = 'calm' | 'warm-up' | 'suspicion' | 'warning' | 'red-zone' | 'sudden-death';

const ESCALATION_MESSAGES: Record<OverthinkingLevel, string> = {
  calm: 'The machine is calm. Suspiciously reasonable, honestly.',
  'warm-up': 'Interesting. We appear to be collecting answers now.',
  suspicion: 'We have discussed this.',
  warning: 'The machine is starting to suspect shenanigans.',
  'red-zone': 'Overthinking levels are approaching silly.',
  'sudden-death': 'Sudden Death has entered the chat.',
};

const LOCKDOWN_MESSAGES = [
  'Decision machine cooling down...',
  'The answer is still the answer.',
  'No new evidence has been discovered.',
  'Nice try.',
  'Touch grass gently.',
] as const;

function createId(prefix: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${prefix}_${random}`;
}

function clampAttempts(attempts: number): number {
  return Math.min(MAX_DECISION_CREDITS, Math.max(0, attempts));
}

function withCredits(decision: DecisionRecord): DecisionRecord {
  const used = getAttemptsUsed(decision);
  return {
    ...decision,
    credits: {
      total: MAX_DECISION_CREDITS,
      used,
      remaining: getCreditsRemaining(decision),
    },
  };
}

export function getAttemptsUsed(decision: DecisionRecord): number {
  return clampAttempts(decision.gamesPlayed.length);
}

export function getCreditsRemaining(decision: DecisionRecord): number {
  return Math.max(0, MAX_DECISION_CREDITS - getAttemptsUsed(decision));
}

export function hasCreditsRemaining(decision: DecisionRecord): boolean {
  return getCreditsRemaining(decision) > 0;
}

export function shouldTriggerSuddenDeath(decision: DecisionRecord): boolean {
  return decision.status === DecisionStatus.Locked && getAttemptsUsed(decision) >= MAX_DECISION_CREDITS;
}

export function runSuddenDeath(decision: DecisionRecord, now: Date): GameRun {
  const options = decision.options.filter((option) => option.text.trim().length > 0);
  if (options.length === 0) {
    throw new Error('Sudden Death needs at least one option to choose from.');
  }

  const selectedOption = options[now.getTime() % options.length];

  return {
    id: createId('game_run'),
    gameId: GameId.SuddenDeath,
    selectedOptionId: selectedOption.id,
    selectedOptionText: selectedOption.text,
    machineQuote: 'The tiny decision goblin has spoken, gently but firmly.',
    createdAt: now.toISOString(),
  };
}

export function startLockdown(decision: DecisionRecord, finalAnswer: string, now: Date, finalMachineQuote?: string): DecisionRecord {
  const finalOption = decision.options.find((option) => option.text === finalAnswer) ?? decision.options.find((option) => option.id === decision.finalOptionId);
  const startedAt = now.toISOString();
  const endsAt = new Date(now.getTime() + LOCKDOWN_DURATION_MS).toISOString();
  const machineQuote = finalMachineQuote ?? decision.finalMachineQuote ?? decision.gamesPlayed[decision.gamesPlayed.length - 1]?.machineQuote ?? 'The machine has made a tiny, firm decision.';

  return withCredits({
    ...decision,
    status: DecisionStatus.Lockdown,
    finalOptionId: finalOption?.id ?? decision.finalOptionId,
    finalAnswer,
    finalisedAt: startedAt,
    finalMachineQuote: machineQuote,
    lockdown: {
      startedAt,
      endsAt,
      lockdownUntil: endsAt,
      finalOptionId: finalOption?.id ?? decision.finalOptionId ?? '',
      finalAnswer,
      finalMachineQuote: machineQuote,
      rotatingMessageIndex: getAttemptsUsed(decision) % LOCKDOWN_MESSAGES.length,
    },
    events: [
      ...decision.events,
      {
        id: createId('event'),
        type: DecisionEventType.LockdownStarted,
        createdAt: startedAt,
        message: 'Final answer accepted. The machine is cooling down.',
      },
    ],
    updatedAt: startedAt,
    completedAt: startedAt,
  });
}

export function getLockdownRemainingMs(decision: DecisionRecord, now: Date): number {
  if (!decision.lockdown) {
    return 0;
  }

  return Math.max(0, new Date(decision.lockdown.lockdownUntil ?? decision.lockdown.endsAt).getTime() - now.getTime());
}

export function getOverthinkingLevel(decision: DecisionRecord): OverthinkingLevel {
  const attempts = getAttemptsUsed(decision);
  if (attempts <= 0) return 'calm';
  if (attempts === 1) return 'warm-up';
  if (attempts === 2) return 'suspicion';
  if (attempts === 3) return 'warning';
  if (attempts === 4) return 'red-zone';
  return 'sudden-death';
}

export function getEscalationMessage(decision: DecisionRecord): string {
  return ESCALATION_MESSAGES[getOverthinkingLevel(decision)];
}

export function getLockdownMessage(decision: DecisionRecord, now: Date): string {
  const baseIndex = decision.lockdown?.rotatingMessageIndex ?? 0;
  const minuteOffset = Math.floor(now.getTime() / 60000);
  return LOCKDOWN_MESSAGES[(baseIndex + minuteOffset) % LOCKDOWN_MESSAGES.length];
}

export function recordGameAttempt(state: AppState, gameRun: GameRun): AppState {
  const decision = state.currentDecision;
  if (!decision || decision.status !== DecisionStatus.Locked || !hasCreditsRemaining(decision)) {
    return state;
  }

  const updatedDecision = withCredits({
    ...decision,
    gamesPlayed: [...decision.gamesPlayed, gameRun],
    events: [
      ...decision.events,
      {
        id: createId('event'),
        type: DecisionEventType.GameRun,
        createdAt: gameRun.createdAt,
        gameRunId: gameRun.id,
        message: 'A game attempt has been logged. The machine is taking notes.',
      },
    ],
    updatedAt: gameRun.createdAt,
  });

  return {
    ...state,
    currentDecision: updatedDecision,
  };
}

export function acceptDecisionResult(state: AppState, finalAnswer: string, now: Date): AppState {
  if (!state.currentDecision || state.currentDecision.status === DecisionStatus.Lockdown) {
    return state;
  }

  return {
    ...state,
    currentDecision: startLockdown(state.currentDecision, finalAnswer, now),
  };
}

export function rejectDecisionResult(state: AppState): AppState {
  const decision = state.currentDecision;
  const latestRun = decision?.gamesPlayed[decision.gamesPlayed.length - 1];
  if (!decision || !latestRun || decision.status !== DecisionStatus.Locked) {
    return state;
  }

  return {
    ...state,
    currentDecision: {
      ...decision,
      rejectedResultIds: [...decision.rejectedResultIds, latestRun.id],
      events: [
        ...decision.events,
        {
          id: createId('event'),
          type: DecisionEventType.ResultRejected,
          createdAt: new Date().toISOString(),
          gameRunId: latestRun.id,
          message: 'Result rejected. The machine has raised one tiny eyebrow.',
        },
      ],
    },
  };
}

export function triggerSuddenDeathIfNeeded(state: AppState, now: Date): AppState {
  const decision = state.currentDecision;
  if (!decision || !shouldTriggerSuddenDeath(decision)) {
    return state;
  }

  const suddenDeathRun = runSuddenDeath(decision, now);
  const withSuddenDeathEvent: DecisionRecord = {
    ...decision,
    finalOptionId: suddenDeathRun.selectedOptionId,
    finalAnswer: suddenDeathRun.selectedOptionText,
    events: [
      ...decision.events,
      {
        id: createId('event'),
        type: DecisionEventType.SuddenDeathTriggered,
        createdAt: now.toISOString(),
        gameRunId: suddenDeathRun.id,
        message: getEscalationMessage(decision),
      },
    ],
    updatedAt: now.toISOString(),
  };

  return {
    ...state,
    currentDecision: startLockdown(withSuddenDeathEvent, suddenDeathRun.selectedOptionText, now, suddenDeathRun.machineQuote),
  };
}
