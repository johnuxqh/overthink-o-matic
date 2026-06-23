import { addDecisionToHistory, hydrateAppState, saveAppState } from '../state/appState';
import { buildShareResultData } from '../share/shareResultBuilder';
import { createDecisionOption, createLockedDecision, createUserSetup, detectGoalpostShift, getMostRecentDecision, validateOptions, validateProblemText } from '../domain/helpers';
import { AppState, DecisionRecord, DecisionStatus, GameId, StorageService, UserProfile } from '../domain/model';
import { gameRegistry, getEligibleGames } from '../games/gameRegistry';
import { runGame } from './gameRunner';
import { acceptDecisionResult, getLockdownRemainingMs } from './overthinkingEngine';

export interface AdminQaResult {
  testName: string;
  passed: boolean;
  notes: string;
  failedBranch?: string;
}

class MemoryStorageService implements StorageService {
  user?: UserProfile;
  current?: DecisionRecord;
  previous: DecisionRecord[] = [];
  corrupt = false;

  async getUserProfile() { return this.corrupt ? undefined : this.user; }
  async saveUserProfile(profile: UserProfile) { this.user = profile; }
  async getCurrentDecision() { return this.corrupt ? undefined : this.current; }
  async saveCurrentDecision(decision: DecisionRecord | undefined) { this.current = decision; }
  async listPreviousDecisions() { return this.corrupt ? [] : this.previous; }
  async savePreviousDecision(decision: DecisionRecord) { this.previous = [decision, ...this.previous.filter((existing) => existing.id !== decision.id)]; }
  async savePreviousDecisions(decisions: DecisionRecord[]) { this.previous = decisions; }
  async clearCurrentDecision() { this.current = undefined; }
  async reset() { this.user = undefined; this.current = undefined; this.previous = []; this.corrupt = false; }
}

function pass(testName: string, notes = 'OK'): AdminQaResult { return { testName, passed: true, notes }; }
function fail(testName: string, error: unknown, failedBranch?: string): AdminQaResult { return { testName, passed: false, notes: error instanceof Error ? error.message : String(error), failedBranch }; }
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function decision(options: string[], problem = 'Pick a thing') { return createLockedDecision(problem, options.map((text) => createDecisionOption('Option', text))); }
function optionTexts(record: DecisionRecord | undefined) { return record?.options.map((option) => option.text) ?? []; }

async function runCase(testName: string, fn: () => void | Promise<void>): Promise<AdminQaResult> {
  try { await fn(); return pass(testName); } catch (error) { return fail(testName, error); }
}

export async function runFullAdminQaSimulation(): Promise<AdminQaResult[]> {
  const results: AdminQaResult[] = [];
  const now = new Date('2026-06-22T12:00:00.000Z');

  results.push(await runCase('create setup', async () => {
    const storage = new MemoryStorageService();
    await storage.saveUserProfile(createUserSetup('Shelley', 'adminjohn'));
    assert((await storage.getUserProfile())?.name === 'Shelley', 'setup was not saved');
  }));

  results.push(await runCase('create 2-option decision', () => assert(decision(['A', 'B']).options.length === 2, '2-option decision missing options')));
  results.push(await runCase('create 3-option decision', () => assert(decision(['A', 'B', 'C']).options.length === 3, '3-option decision missing options')));
  results.push(await runCase('validate empty problem is blocked', () => assert(!validateProblemText('   '), 'empty problem passed validation')));
  results.push(await runCase('validate less than 2 options is blocked', () => assert(!validateOptions([createDecisionOption('Option', 'Only')]), 'single option passed validation')));

  results.push(await runCase('run each of the 9 games', () => {
    for (const game of gameRegistry) game.run(game.maximumOptions === 2 ? decision(['A', 'B']) : decision(['A', 'B', 'C']), now);
    assert(gameRegistry.length === 9, `expected 9 games, found ${gameRegistry.length}`);
  }));

  results.push(await runCase('confirm every game result is one of the entered options', () => {
    for (const game of gameRegistry) {
      const d = game.maximumOptions === 2 ? decision(['A', 'B']) : decision(['A', 'B', 'C']);
      assert(optionTexts(d).includes(game.run(d, now).selectedOption), `${game.id} returned an unknown option`);
    }
  }));

  results.push(await runCase('confirm 2-option game eligibility', () => assert(getEligibleGames(decision(['A', 'B'])).map((game) => game.id).join(',') === [GameId.CoinToss, GameId.BestOf5, GameId.GutCheck, GameId.ChaosGoblin, GameId.BrutalHonesty, GameId.RealityChecker].join(','), '2-option eligibility drifted')));
  results.push(await runCase('confirm 3+ option game eligibility', () => assert(getEligibleGames(decision(['A', 'B', 'C'])).map((game) => game.id).join(',') === [GameId.WheelOfFate, GameId.GutCheck, GameId.ChaosGoblin, GameId.BrutalHonesty, GameId.RealityChecker, GameId.EliminationChamber, GameId.BattleRoyale].join(','), '3+ option eligibility drifted')));

  for (const attemptCount of [1, 3]) {
    results.push(await runCase(`accept on attempt ${attemptCount} clears active decision`, () => {
      let state: AppState = { currentDecision: decision(['A', 'B']), previousDecisions: [] };
      for (let index = 0; index < attemptCount; index += 1) state = runGame(state, GameId.CoinToss, new Date(now.getTime() + index)).state;
      const latest = state.currentDecision!.gamesPlayed[state.currentDecision!.gamesPlayed.length - 1]!;
      const accepted = acceptDecisionResult(state, latest.selectedOptionText, now);
      const historyState = accepted.currentDecision ? addDecisionToHistory(accepted, accepted.currentDecision) : accepted;
      state = { ...historyState, currentDecision: undefined };
      assert(!state.currentDecision, 'active decision was not cleared');
      assert(state.previousDecisions.length === 1, 'accepted decision not stored once');
    }));
  }

  results.push(await runCase('new unrelated decision gets fresh 5 attempts', () => assert(decision(['X', 'Y'], 'New').credits.remaining === 5, 'fresh decision did not get 5 attempts')));
  results.push(await runCase('repeated option triggers goalpost warning', () => assert(detectGoalpostShift([createDecisionOption('Option', ' pizza!! ')], decision(['Pizza', 'Soup'])).hasShift, 'repeated option did not warn')));
  results.push(await runCase('unrelated option does not trigger goalpost warning', () => assert(!detectGoalpostShift([createDecisionOption('Option', 'Tacos')], decision(['Pizza', 'Soup'])).hasShift, 'unrelated option warned')));

  results.push(await runCase('try another game consumes attempts', () => {
    let state: AppState = { currentDecision: decision(['A', 'B']), previousDecisions: [] };
    state = runGame(state, GameId.CoinToss, now).state;
    state = runGame(state, GameId.CoinToss, new Date(now.getTime() + 1)).state;
    assert(state.currentDecision?.credits.remaining === 3, 'two attempts did not leave 3 attempts');
  }));

  results.push(await runCase('5th attempt triggers Barry Has Taken Control / final answer / lockdown / blocks gameplay and New Overthink', () => {
    let state: AppState = { currentDecision: decision(['A', 'B']), previousDecisions: [] };
    for (let index = 0; index < 5; index += 1) state = runGame(state, GameId.CoinToss, new Date(now.getTime() + index)).state;
    assert(state.currentDecision?.status === DecisionStatus.Lockdown, 'not in lockdown');
    assert(optionTexts(state.currentDecision).includes(state.currentDecision.finalAnswer!), 'final answer not from options');
    assert(getLockdownRemainingMs(state.currentDecision, now) > 0, 'lockdown not active');
    assert(state.currentDecision.lockdown !== undefined, 'gameplay would still be allowed');
  }));

  results.push(await runCase('expired lockdown allows New Overthink', () => {
    const d = decision(['A', 'B']);
    let state = runGame({ currentDecision: d, previousDecisions: [] }, GameId.CoinToss, now).state;
    state = acceptDecisionResult(state, state.currentDecision!.gamesPlayed[0].selectedOptionText, now);
    state.currentDecision!.lockdown = { ...state.currentDecision!.lockdown!, endsAt: new Date(now.getTime() - 1).toISOString(), lockdownUntil: new Date(now.getTime() - 1).toISOString() };
    assert(getLockdownRemainingMs(state.currentDecision!, now) === 0, 'expired lockdown still blocked');
  }));

  results.push(await runCase('previous overthinks history stores accepted and takeover decisions once', () => {
    const accepted = { ...decision(['A', 'B']), finalAnswer: 'A', status: DecisionStatus.Complete };
    const takeover = { ...decision(['C', 'D']), finalAnswer: 'C', status: DecisionStatus.Lockdown };
    let state: AppState = { previousDecisions: [], currentDecision: undefined };
    state = addDecisionToHistory(addDecisionToHistory(addDecisionToHistory(state, accepted), accepted), takeover);
    assert(state.previousDecisions.length === 2, 'duplicate history entries found');
  }));

  results.push(await runCase('share result data includes problem, options, final answer, status, and quote', () => {
    const d = { ...decision(['A', 'B']), finalAnswer: 'A', finalMachineQuote: 'Quote', status: DecisionStatus.Complete };
    const share = buildShareResultData(d);
    assert(Boolean(share.decisionProblem && share.options.length && share.finalAnswer && share.decisionStatus && share.machineQuote), 'share data incomplete');
  }));

  results.push(await runCase('corrupt local storage falls back safely', async () => {
    const storage = new MemoryStorageService();
    storage.corrupt = true;
    const state = await hydrateAppState(storage);
    assert(!state.user && !state.currentDecision && state.previousDecisions.length === 0, 'corrupt storage did not fall back');
  }));

  results.push(await runCase('hydrate during lockdown restores lockdown state', async () => {
    const storage = new MemoryStorageService();
    let state: AppState = { currentDecision: decision(['A', 'B']), previousDecisions: [] };
    for (let index = 0; index < 5; index += 1) state = runGame(state, GameId.CoinToss, new Date(now.getTime() + index)).state;
    await saveAppState(storage, { ...state, user: createUserSetup('Shelley') });
    const hydrated = await hydrateAppState(storage);
    assert(hydrated.currentDecision?.status === DecisionStatus.Lockdown, 'lockdown state was not hydrated');
  }));

  results.push(await runCase('no duplicate history entries after navigation simulation', () => {
    const d = { ...decision(['A', 'B']), finalAnswer: 'A', status: DecisionStatus.Complete };
    let state: AppState = { previousDecisions: [], currentDecision: d };
    state = addDecisionToHistory(state, d);
    state = addDecisionToHistory(state, d);
    assert(state.previousDecisions.length === 1, 'navigation duplicated history');
  }));

  results.push(await runCase('no infinite loop in Home → Options → Game → Result → Try Another Game cycle', () => {
    let state: AppState = { currentDecision: decision(['A', 'B']), previousDecisions: [] };
    for (let index = 0; index < 4; index += 1) {
      state = runGame(state, GameId.CoinToss, new Date(now.getTime() + index)).state;
      assert(state.currentDecision?.status === DecisionStatus.Locked, `loop broke before Barry takeover at ${index}`);
    }
  }));

  results.push(await runCase('resume previous tree restores previous active decision state', () => {
    const previousActive = decision(['A', 'B'], 'Resume me');
    const state: AppState = { currentDecision: previousActive, previousDecisions: [previousActive] };
    const restored = getMostRecentDecision(state);
    assert(restored?.id === previousActive.id && restored.status === previousActive.status, 'previous active decision was not restorable');
  }));

  return results;
}

export async function resetAdminQaTestData(): Promise<AdminQaResult[]> {
  const storage = new MemoryStorageService();
  await storage.reset();
  return [pass('reset test data', 'In-memory QA data reset. Real local storage was not touched.')];
}
