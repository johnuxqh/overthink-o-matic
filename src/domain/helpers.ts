import {
  AppState,
  DecisionEventType,
  DecisionOption,
  DecisionRecord,
  DecisionStatus,
  PreviousOverthinkSummary,
  LOCKDOWN_DURATION_MS,
  MAX_DECISION_CREDITS,
  REQUIRED_OPTION_COUNT,
  UserProfile,
} from './model';

function createId(prefix: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${prefix}_${random}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function normaliseDecisionText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

export function normaliseOptionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"()\[\]{}\-]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function validateProblemText(text: string): boolean {
  return normaliseDecisionText(text).length > 0;
}

export function validateOptions(options: DecisionOption[]): boolean {
  const nonEmptyOptions = options.filter((option) => normaliseOptionText(option.text).length > 0);
  return nonEmptyOptions.length >= REQUIRED_OPTION_COUNT;
}

export function isAdminTestMode(userSetup: UserProfile | undefined): boolean {
  return normaliseOptionText(userSetup?.realityCheckerName ?? '').replace(/\s+/g, '') === 'adminjohn';
}

export function createUserSetup(name: string, realityCheckerName?: string): UserProfile {
  const createdAt = nowIso();
  const trimmedRealityCheckerName = realityCheckerName?.trim();

  return {
    id: createId('user'),
    name: normaliseDecisionText(name),
    realityCheckerName: trimmedRealityCheckerName ? normaliseDecisionText(trimmedRealityCheckerName) : undefined,
    createdAt,
    updatedAt: createdAt,
  };
}

export function createDecisionOption(label: string, value: string = label): DecisionOption {
  return {
    id: createId('option'),
    text: normaliseDecisionText(value),
    createdAt: nowIso(),
  };
}

export function createDraftDecision(problemText: string): DecisionRecord {
  const createdAt = nowIso();

  return {
    id: createId('decision'),
    problem: normaliseDecisionText(problemText),
    options: [],
    status: DecisionStatus.Draft,
    credits: {
      total: MAX_DECISION_CREDITS,
      used: 0,
      remaining: MAX_DECISION_CREDITS,
    },
    gamesPlayed: [],
    rejectedResultIds: [],
    events: [
      {
        id: createId('event'),
        type: DecisionEventType.Created,
        createdAt,
      },
    ],
    createdAt,
    updatedAt: createdAt,
  };
}

export function createLockedDecision(problemText: string, options: DecisionOption[]): DecisionRecord {
  const lockedAt = nowIso();
  const decision = createDraftDecision(problemText);

  return {
    ...decision,
    options: options.map((option) => ({ ...option, text: normaliseDecisionText(option.text) })),
    status: DecisionStatus.Locked,
    lockedAt,
    updatedAt: lockedAt,
    events: [
      ...decision.events,
      {
        id: createId('event'),
        type: DecisionEventType.Locked,
        createdAt: lockedAt,
      },
    ],
  };
}

export function calculateCreditsRemaining(decision: DecisionRecord): number {
  return Math.max(0, MAX_DECISION_CREDITS - decision.credits.used);
}

export function isDecisionLockedDown(decision: DecisionRecord, now: Date): boolean {
  if (!decision.lockdown || decision.status !== DecisionStatus.Lockdown) {
    return false;
  }

  return now.getTime() < new Date(decision.lockdown.lockdownUntil ?? decision.lockdown.endsAt).getTime();
}

export function canRunGame(decision: DecisionRecord, now: Date): boolean {
  return decision.status === DecisionStatus.Locked && calculateCreditsRemaining(decision) > 0 && !isDecisionLockedDown(decision, now);
}

export function addDecisionToHistory(state: AppState, decision: DecisionRecord): AppState {
  return {
    ...state,
    previousDecisions: [decision, ...state.previousDecisions.filter((previous) => previous.id !== decision.id)],
  };
}

export function getMostRecentDecision(state: AppState): DecisionRecord | undefined {
  return [...state.previousDecisions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
}

export function detectGoalpostShift(currentOptions: DecisionOption[], previousDecision?: DecisionRecord) {
  const noShiftMessage = 'No goalpost wobble detected. The machine remains politely suspicious.';

  if (!previousDecision) {
    return { hasShift: false, repeatedOptions: [], message: noShiftMessage };
  }

  const previousTexts = new Set(previousDecision.options.map((option) => normaliseOptionText(option.text)).filter(Boolean));
  const repeatedOptions = Array.from(
    new Set(
      currentOptions
        .filter((option) => {
          const normalisedText = normaliseOptionText(option.text);
          return normalisedText.length > 0 && previousTexts.has(normalisedText);
        })
        .map((option) => normaliseDecisionText(option.text)),
    ),
  );
  const previousFinalAnswer = previousDecision.finalAnswer ?? previousDecision.lockdown?.finalAnswer;

  return {
    hasShift: repeatedOptions.length > 0,
    repeatedOptions,
    previousFinalAnswer,
    message: repeatedOptions.length > 0
      ? 'Hold up. We have been here before. One of these options has mysteriously reappeared. Referee note: moving the goal posts has been detected. Proceed if this is genuinely new. The machine is watching.'
      : noShiftMessage,
  };
}

export function formatPreviousOverthinkSummary(decision: DecisionRecord): PreviousOverthinkSummary {
  const finalAnswer = decision.finalAnswer ?? decision.lockdown?.finalAnswer ?? 'Not accepted yet';
  const latestMachineQuote = decision.finalMachineQuote ?? decision.lockdown?.finalMachineQuote ?? decision.gamesPlayed[decision.gamesPlayed.length - 1]?.machineQuote;

  return {
    problem: decision.problem,
    finalAnswer,
    options: decision.options.map((option) => option.text),
    gamesPlayedCount: decision.gamesPlayed.length,
    attemptsUsed: decision.gamesPlayed.length,
    createdDate: decision.createdAt,
    lockdownStatus: decision.lockdown ? `Lockdown until ${decision.lockdown.lockdownUntil ?? decision.lockdown.endsAt}` : undefined,
    machineQuote: latestMachineQuote,
  };
}
