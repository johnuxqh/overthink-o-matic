import {
  AppState,
  BarryEscalationStage,
  DecisionEventType,
  DecisionRecord,
  DecisionStatus,
  GameRun,
  LOCKDOWN_DURATION_MS,
  MAX_DECISION_ATTEMPTS,
} from '../domain/model';

export type OverthinkingLevel = 'calm' | 'helpful' | 'determined' | 'concerned' | 'obsessed' | 'unhinged';

const ESCALATION_MESSAGES: Record<OverthinkingLevel, string> = {
  calm: 'Barry is ready to help. Suspiciously confident, honestly.',
  helpful: 'Barry is helpful and confident. This is probably fine.',
  determined: 'Barry is determined now. The badger has focus.',
  concerned: 'Barry is concerned you are ignoring perfectly good machinery.',
  obsessed: 'Barry is obsessed. Containment is monitoring enthusiasm levels.',
  unhinged: 'BARRY HAS TAKEN CONTROL.',
};

const LOCKDOWN_MESSAGES = [
  'Barry is cooling down.',
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
  return Math.min(MAX_DECISION_ATTEMPTS, Math.max(0, attempts));
}

function withCredits(decision: DecisionRecord): DecisionRecord {
  const used = getAttemptsUsed(decision);
  return {
    ...decision,
    credits: {
      total: MAX_DECISION_ATTEMPTS,
      used,
      remaining: getAttemptsRemaining(decision),
    },
    barryCommitment: getBarryCommitment(decision),
  };
}

export function getBarryCommitment(decision: DecisionRecord) {
  const currentAttempt = getAttemptsUsed(decision);
  const stage: BarryEscalationStage = currentAttempt >= 5 ? 'unhinged' : currentAttempt === 4 ? 'obsessed' : currentAttempt === 3 ? 'concerned' : currentAttempt === 2 ? 'determined' : 'helpful';
  return {
    maxAttempts: 5 as typeof MAX_DECISION_ATTEMPTS,
    currentAttempt,
    remainingAttempts: getAttemptsRemaining(decision),
    stage,
    hasTakenControl: Boolean(decision.takeoverAt || currentAttempt >= MAX_DECISION_ATTEMPTS),
  };
}

export function getAttemptsUsed(decision: DecisionRecord): number {
  return clampAttempts(decision.gamesPlayed.length);
}

export function getAttemptsRemaining(decision: DecisionRecord): number {
  return Math.max(0, MAX_DECISION_ATTEMPTS - getAttemptsUsed(decision));
}

export function hasAttemptsRemaining(decision: DecisionRecord): boolean {
  return getAttemptsRemaining(decision) > 0;
}

export function shouldBarryTakeControl(decision: DecisionRecord): boolean {
  return decision.status === DecisionStatus.Locked && getAttemptsUsed(decision) >= MAX_DECISION_ATTEMPTS;
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
        message: 'Barry has taken control. Recovery is underway.',
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
  if (attempts === 1) return 'helpful';
  if (attempts === 2) return 'determined';
  if (attempts === 3) return 'concerned';
  if (attempts === 4) return 'obsessed';
  return 'unhinged';
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
  if (!decision || decision.status !== DecisionStatus.Locked || !hasAttemptsRemaining(decision)) {
    return state;
  }

  const updatedDecision = withCredits({
    ...decision,
    gamesPlayed: [...decision.gamesPlayed, gameRun],
    currentResult: gameRun,
    selectedProtocolId: gameRun.gameId,
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

export function completeDecision(decision: DecisionRecord, finalAnswer: string, now: Date, finalMachineQuote?: string): DecisionRecord {
  const finalOption = decision.options.find((option) => option.text === finalAnswer) ?? decision.options.find((option) => option.id === decision.finalOptionId);
  const completedAt = now.toISOString();
  const machineQuote = finalMachineQuote ?? decision.finalMachineQuote ?? decision.gamesPlayed[decision.gamesPlayed.length - 1]?.machineQuote ?? 'The machine has made a tiny, firm decision.';

  return withCredits({
    ...decision,
    status: DecisionStatus.Complete,
    finalOptionId: finalOption?.id ?? decision.finalOptionId,
    finalAnswer,
    finalisedAt: completedAt,
    finalMachineQuote: machineQuote,
    acceptedResultId: decision.currentResult?.id ?? decision.gamesPlayed[decision.gamesPlayed.length - 1]?.id,
    completedAt,
    events: [
      ...decision.events,
      {
        id: createId('event'),
        type: DecisionEventType.Completed,
        createdAt: completedAt,
        message: 'Final answer accepted. The machine is releasing you back into the world.',
      },
    ],
    updatedAt: completedAt,
  });
}

export function acceptDecisionResult(state: AppState, finalAnswer: string, now: Date): AppState {
  if (!state.currentDecision || state.currentDecision.status === DecisionStatus.Lockdown) {
    return state;
  }

  return {
    ...state,
    currentDecision: completeDecision(state.currentDecision, finalAnswer, now),
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

export function triggerBarryTakeoverIfNeeded(state: AppState, now: Date): AppState {
  const decision = state.currentDecision;
  if (!decision || !shouldBarryTakeControl(decision)) {
    return state;
  }

  const finalRun = decision.gamesPlayed[decision.gamesPlayed.length - 1];
  if (!finalRun) {
    return state;
  }

  const takeoverAt = now.toISOString();
  const withTakeoverEvent: DecisionRecord = withCredits({
    ...decision,
    finalOptionId: finalRun.selectedOptionId,
    finalAnswer: finalRun.selectedOptionText,
    finalMachineQuote: finalRun.machineQuote,
    currentResult: finalRun,
    selectedProtocolId: finalRun.gameId,
    takeoverAt,
    events: [
      ...decision.events,
      {
        id: createId('event'),
        type: DecisionEventType.BarryTookControl,
        createdAt: takeoverAt,
        gameRunId: finalRun.id,
        message: getEscalationMessage(decision),
      },
    ],
    updatedAt: takeoverAt,
  });

  return {
    ...state,
    currentDecision: startLockdown(withTakeoverEvent, finalRun.selectedOptionText, now, finalRun.machineQuote),
  };
}
