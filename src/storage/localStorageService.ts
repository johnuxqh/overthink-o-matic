import { DecisionRecord, StorageService, UserProfile } from '../domain/model';

const USER_PROFILE_KEY = 'overthink-o-matic:user-profile';
const CURRENT_DECISION_KEY = 'overthink-o-matic:current-decision';
const PREVIOUS_DECISIONS_KEY = 'overthink-o-matic:previous-decisions';

function readJson<T>(key: string, fallback: T): T {
  try {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) {
      return fallback;
    }

    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUserProfile(value: unknown): value is UserProfile {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string';
}

function isDecisionRecord(value: unknown): value is DecisionRecord {
  return isRecord(value) && typeof value.id === 'string' && typeof value.problem === 'string' && Array.isArray(value.options);
}

export class LocalStorageService implements StorageService {
  async getUserProfile(): Promise<UserProfile | undefined> {
    const profile = readJson<unknown>(USER_PROFILE_KEY, undefined);
    return isUserProfile(profile) ? profile : undefined;
  }

  async saveUserProfile(profile: UserProfile): Promise<void> {
    writeJson(USER_PROFILE_KEY, profile);
  }

  async getCurrentDecision(): Promise<DecisionRecord | undefined> {
    const decision = readJson<unknown>(CURRENT_DECISION_KEY, undefined);
    return isDecisionRecord(decision) ? decision : undefined;
  }

  async saveCurrentDecision(decision: DecisionRecord | undefined): Promise<void> {
    if (!decision) {
      localStorage.removeItem(CURRENT_DECISION_KEY);
      return;
    }

    writeJson(CURRENT_DECISION_KEY, decision);
  }

  async listPreviousDecisions(): Promise<DecisionRecord[]> {
    const decisions = readJson<unknown>(PREVIOUS_DECISIONS_KEY, []);
    return Array.isArray(decisions) ? decisions.filter(isDecisionRecord) : [];
  }

  async savePreviousDecision(decision: DecisionRecord): Promise<void> {
    const existingDecisions = await this.listPreviousDecisions();
    writeJson(PREVIOUS_DECISIONS_KEY, [decision, ...existingDecisions.filter((existing) => existing.id !== decision.id)]);
  }

  async savePreviousDecisions(decisions: DecisionRecord[]): Promise<void> {
    writeJson(PREVIOUS_DECISIONS_KEY, decisions.filter(isDecisionRecord));
  }

  async clearCurrentDecision(): Promise<void> {
    localStorage.removeItem(CURRENT_DECISION_KEY);
  }

  async reset(): Promise<void> {
    localStorage.removeItem(USER_PROFILE_KEY);
    localStorage.removeItem(CURRENT_DECISION_KEY);
    localStorage.removeItem(PREVIOUS_DECISIONS_KEY);
  }
}

export function createLocalStorageService(): LocalStorageService {
  return new LocalStorageService();
}
