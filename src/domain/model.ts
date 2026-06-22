/**
 * OVERTHINK-O-MATIC P1 system definition.
 *
 * This file intentionally contains only domain types, constants, and pure rule
 * signatures. UI components and browser storage implementations are out of
 * scope for P1.
 */

export enum DecisionStatus {
  Draft = 'draft',
  Locked = 'locked',
  Lockdown = 'lockdown',
  Complete = 'complete',
}

export enum GameId {
  CoinToss = 'coin_toss',
  BestOf5 = 'best_of_5',
  WheelOfFate = 'wheel_of_fate',
  GutCheck = 'gut_check',
  ChaosGoblin = 'chaos_goblin',
  BrutalHonesty = 'brutal_honesty',
  RealityChecker = 'reality_checker',
  EliminationChamber = 'elimination_chamber',
  BattleRoyale = 'battle_royale',
  SuddenDeath = 'sudden_death',
}

export enum DecisionEventType {
  Created = 'created',
  OptionsUpdated = 'options_updated',
  Locked = 'locked',
  GameRun = 'game_run',
  ResultRejected = 'result_rejected',
  SuddenDeathTriggered = 'sudden_death_triggered',
  LockdownStarted = 'lockdown_started',
  LockdownEnded = 'lockdown_ended',
  Completed = 'completed',
}

export const REQUIRED_OPTION_COUNT = 2;
export const MAX_DECISION_CREDITS = 5;
export const LOCKDOWN_DURATION_MS = 5 * 60 * 1000;

export const TWO_OPTION_GAME_IDS = [
  GameId.CoinToss,
  GameId.BestOf5,
  GameId.GutCheck,
  GameId.ChaosGoblin,
  GameId.BrutalHonesty,
  GameId.RealityChecker,
] as const;

export const MULTI_OPTION_GAME_IDS = [
  GameId.WheelOfFate,
  GameId.EliminationChamber,
  GameId.BattleRoyale,
  GameId.ChaosGoblin,
  GameId.BrutalHonesty,
  GameId.RealityChecker,
] as const;

export interface UserProfile {
  id: string;
  name: string;
  realityCheckerName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DecisionOption {
  id: string;
  text: string;
  createdAt: string;
}

export interface GameRun {
  id: string;
  gameId: GameId;
  selectedOptionId: string;
  selectedOptionText: string;
  machineQuote: string;
  createdAt: string;
}

export interface GameResultDetails {
  coinSide?: string;
  rounds?: Array<{ round: number; winnerOptionId: string; winnerOptionText: string }>;
  score?: Record<string, number>;
  wheelSegmentCount?: number;
  prompt?: string;
  goblinMood?: string;
  tone?: string;
  realityCheckerName?: string;
  eliminatedOptions?: string[];
  matchups?: Array<{ round: number; options: string[]; winner: string }>;
  champion?: string;
}

export interface GameResult {
  id: string;
  gameId: GameId;
  selectedOptionId: string;
  selectedOption: string;
  resultLabel: string;
  machineQuote: string;
  details: GameResultDetails;
  createdAt: string;
}

export interface DecisionEvent {
  id: string;
  type: DecisionEventType;
  createdAt: string;
  message?: string;
  gameRunId?: string;
}

export interface DecisionCredits {
  total: typeof MAX_DECISION_CREDITS;
  used: number;
  remaining: number;
}

export interface LockdownState {
  startedAt: string;
  endsAt: string;
  lockdownUntil?: string;
  finalOptionId: string;
  finalAnswer: string;
  finalMachineQuote?: string;
  rotatingMessageIndex: number;
}

export interface DecisionRecord {
  id: string;
  problem: string;
  options: DecisionOption[];
  status: DecisionStatus;
  credits: DecisionCredits;
  gamesPlayed: GameRun[];
  rejectedResultIds: string[];
  finalOptionId?: string;
  finalAnswer?: string;
  finalisedAt?: string;
  finalMachineQuote?: string;
  lockdown?: LockdownState;
  events: DecisionEvent[];
  createdAt: string;
  updatedAt: string;
  lockedAt?: string;
  realityCheckerName?: string;
  completedAt?: string;
}

export interface AppState {
  user?: UserProfile;
  currentDecision?: DecisionRecord;
  previousDecisions: DecisionRecord[];
  goalpostWarning?: GoalpostDetectionResult;
}

export interface GoalpostDetectionResult {
  hasShift: boolean;
  repeatedOptions: string[];
  previousFinalAnswer?: string;
  message: string;
}

export interface PreviousOverthinkSummary {
  problem: string;
  finalAnswer: string;
  options: string[];
  gamesPlayedCount: number;
  attemptsUsed: number;
  createdDate: string;
  lockdownStatus?: string;
  machineQuote?: string;
}

export interface ShareCardData {
  decisionProblem: string;
  options: string[];
  selectedGameId: GameId;
  finalAnswer: string;
  decisionStatus: DecisionStatus;
  machineQuote: string;
  isSuddenDeath: boolean;
  createdAt: string;
}

export interface StorageService {
  getUserProfile(): Promise<UserProfile | undefined>;
  saveUserProfile(profile: UserProfile): Promise<void>;
  getCurrentDecision(): Promise<DecisionRecord | undefined>;
  saveCurrentDecision(decision: DecisionRecord | undefined): Promise<void>;
  listPreviousDecisions(): Promise<DecisionRecord[]>;
  savePreviousDecision(decision: DecisionRecord): Promise<void>;
  savePreviousDecisions?(decisions: DecisionRecord[]): Promise<void>;
  clearCurrentDecision?(): Promise<void>;
  reset?(): Promise<void>;
}

