import {
  addDecisionToHistory,
  createDecisionOption,
  createDraftDecision,
  createLockedDecision,
  detectGoalpostShift,
  getMostRecentDecision,
  validateOptions,
  validateProblemText,
} from '../domain/helpers';
import { AppState, DecisionRecord, StorageService } from '../domain/model';

export function createInitialAppState(): AppState {
  return {
    previousDecisions: [],
  };
}

export async function hydrateAppState(storageService: StorageService): Promise<AppState> {
  const [user, currentDecision, previousDecisions] = await Promise.all([
    storageService.getUserProfile(),
    storageService.getCurrentDecision(),
    storageService.listPreviousDecisions(),
  ]);

  return {
    user,
    currentDecision,
    previousDecisions,
  };
}

export async function saveAppState(storageService: StorageService, state: AppState): Promise<void> {
  if (state.user) {
    await storageService.saveUserProfile(state.user);
  }

  await storageService.saveCurrentDecision(state.currentDecision);

  for (const decision of [...state.previousDecisions].reverse()) {
    await storageService.savePreviousDecision(decision);
  }
}

export function startNewDecision(state: AppState, problemText: string): AppState {
  if (!validateProblemText(problemText)) {
    return state;
  }

  return {
    ...state,
    currentDecision: createDraftDecision(problemText),
    goalpostWarning: undefined,
  };
}

export function updateDraftOption(state: AppState, optionId: string, value: string): AppState {
  if (!state.currentDecision) {
    return state;
  }

  const currentDecision: DecisionRecord = {
    ...state.currentDecision,
    options: state.currentDecision.options.map((option) => (option.id === optionId ? { ...option, text: value } : option)),
    updatedAt: new Date().toISOString(),
  };

  return {
    ...state,
    currentDecision,
    goalpostWarning: detectGoalpostShift(currentDecision.options, getMostRecentDecision(state)),
  };
}

export function addDraftOption(state: AppState): AppState {
  if (!state.currentDecision) {
    return state;
  }

  return {
    ...state,
    currentDecision: {
      ...state.currentDecision,
      options: [...state.currentDecision.options, createDecisionOption('Option', '')],
      updatedAt: new Date().toISOString(),
    },
  };
}

export function removeDraftOption(state: AppState, optionId: string): AppState {
  if (!state.currentDecision) {
    return state;
  }

  return {
    ...state,
    currentDecision: {
      ...state.currentDecision,
      options: state.currentDecision.options.filter((option) => option.id !== optionId),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function lockDraftDecision(state: AppState): AppState {
  if (!state.currentDecision || !validateProblemText(state.currentDecision.problem) || !validateOptions(state.currentDecision.options)) {
    return state;
  }

  return {
    ...state,
    currentDecision: createLockedDecision(state.currentDecision.problem, state.currentDecision.options),
  };
}

export function returnToNewOverthink(state: AppState): AppState {
  return {
    ...state,
    currentDecision: undefined,
    goalpostWarning: undefined,
  };
}

export { addDecisionToHistory, detectGoalpostShift, getMostRecentDecision };
export {
  acceptDecisionResult,
  recordGameAttempt,
  rejectDecisionResult,
  triggerSuddenDeathIfNeeded,
} from '../services/overthinkingEngine';
