import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createDecisionOption, createLockedDecision, createUserSetup, detectGoalpostShift, formatPreviousOverthinkSummary, getMostRecentDecision, isAdminTestMode, normaliseDecisionText, validateOptions, validateProblemText } from './domain/helpers';
import { AppState, DecisionRecord, GameId, GameResult } from './domain/model';
import { ShareResultCard } from './share/ShareResultCard';
import { buildShareResultData } from './share/shareResultBuilder';
import { SHARE_EXPORT_FALLBACK, downloadShareCardImage, isShareImageExportSupported } from './share/shareImageExporter';
import { addDecisionToHistory, clearActiveDecision, clearAllAppData, clearPreviousOverthinks, createInitialAppState, hydrateAppState, saveAppState } from './state/appState';
import { createLocalStorageService } from './storage/localStorageService';
import { acceptDecisionResult, getCreditsRemaining, getEscalationMessage, getLockdownMessage, getLockdownRemainingMs } from './services/overthinkingEngine';
import { AdminQaResult, resetAdminQaTestData, runFullAdminQaSimulation } from './services/adminQaRunner';
import { getEligibleGames, runGame } from './services/gameRunner';
import './styles/base.css';

export const screens = ['setup', 'home', 'options', 'game-selection', 'result', 'lockdown', 'previous-overthinks', 'share-result', 'admin-qa-runner', 'about-machine'] as const;
export type AppScreen = (typeof screens)[number];

const storageService = createLocalStorageService();

function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function isLockdownActive(decision: DecisionRecord | undefined, now: Date): boolean {
  return Boolean(decision?.lockdown && getLockdownRemainingMs(decision, now) > 0);
}

export function App() {
  const [appState, setAppState] = useState<AppState>(() => createInitialAppState());
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('setup');
  const [hasHydrated, setHasHydrated] = useState(false);
  const [userName, setUserName] = useState('');
  const [realityCheckerName, setRealityCheckerName] = useState('');
  const [problemText, setProblemText] = useState('');
  const [optionTexts, setOptionTexts] = useState(['', '']);
  const [latestResult, setLatestResult] = useState<GameResult | undefined>(undefined);
  const [shareDecision, setShareDecision] = useState<DecisionRecord | undefined>(undefined);
  const [shareFallbackMessage, setShareFallbackMessage] = useState(SHARE_EXPORT_FALLBACK);
  const [adminQaResults, setAdminQaResults] = useState<AdminQaResult[]>([]);
  let shareCardElement: HTMLElement | null = null;
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let isMounted = true;
    hydrateAppState(storageService).then((hydratedState) => {
      if (!isMounted) return;
      setAppState(hydratedState);
      setCurrentScreen(hydratedState.user ? (isLockdownActive(hydratedState.currentDecision, new Date()) ? 'lockdown' : 'home') : 'setup');
      setHasHydrated(true);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const decision = appState.currentDecision;
  const creditsRemaining = decision ? getCreditsRemaining(decision) : 0;
  const eligibleGames = decision ? getEligibleGames(decision) : [];
  const latestGame = latestResult ? eligibleGames.find((game) => game.id === latestResult.gameId) : undefined;
  const lockdownRemainingMs = decision ? getLockdownRemainingMs(decision, now) : 0;
  const activeLockdown = isLockdownActive(decision, now);
  const canTryAgain = Boolean(decision && creditsRemaining > 0 && !activeLockdown);
  const shareData = shareDecision ? buildShareResultData(shareDecision, shareDecision.id === decision?.id ? latestResult : undefined) : undefined;
  const canDownloadShareImage = isShareImageExportSupported();
  const adminTestMode = isAdminTestMode(appState.user);

  useEffect(() => {
    if (activeLockdown && !['lockdown', 'share-result', 'previous-overthinks'].includes(currentScreen)) {
      setCurrentScreen('lockdown');
    }
  }, [activeLockdown, currentScreen]);
  const optionRows = useMemo(() => optionTexts.map((value, index) => ({ id: `option-${index}`, label: `Option ${index + 1}`, value })), [optionTexts]);

  function persist(nextState: AppState) {
    setAppState(nextState);
    void saveAppState(storageService, nextState);
  }

  function openShareResult(targetDecision: DecisionRecord | undefined) {
    if (!targetDecision) return;
    setShareDecision(targetDecision);
    setShareFallbackMessage(SHARE_EXPORT_FALLBACK);
    setCurrentScreen('share-result');
  }

  async function downloadShareImage() {
    const result = await downloadShareCardImage(shareCardElement);
    if (result.fallbackMessage) setShareFallbackMessage(result.fallbackMessage);
  }

  async function handleClearActiveDecision() {
    const nextState = await clearActiveDecision(storageService, appState);
    setAppState(nextState);
    setProblemText('');
    setOptionTexts(['', '']);
    setLatestResult(undefined);
    setShareDecision(undefined);
    setError('');
    setCurrentScreen(nextState.user ? 'home' : 'setup');
  }

  async function handleClearPreviousOverthinks() {
    const nextState = await clearPreviousOverthinks(storageService, appState);
    setAppState(nextState);
    setShareDecision(undefined);
    setError('');
    setCurrentScreen(nextState.user ? 'home' : 'setup');
  }

  async function handleRunAdminQaSimulation() {
    setAdminQaResults([{ testName: 'Admin QA Runner', passed: true, notes: 'Running full QA simulation...' }]);
    setAdminQaResults(await runFullAdminQaSimulation());
  }

  async function handleResetAdminQaData() {
    setAdminQaResults(await resetAdminQaTestData());
  }

  async function handleClearAllAppData() {
    const nextState = await clearAllAppData(storageService);
    setAppState(nextState);
    setUserName('');
    setRealityCheckerName('');
    setProblemText('');
    setOptionTexts(['', '']);
    setLatestResult(undefined);
    setShareDecision(undefined);
    setError('');
    setCurrentScreen('setup');
  }

  function goHome() {
    if (activeLockdown) {
      setCurrentScreen('lockdown');
      return;
    }
    persist({ ...appState, currentDecision: undefined, goalpostWarning: undefined });
    setProblemText('');
    setOptionTexts(['', '']);
    setLatestResult(undefined);
    setShareDecision(undefined);
    setError('');
    setCurrentScreen('home');
  }

  function saveSetup(event: FormEvent) {
    event.preventDefault();
    if (!validateProblemText(userName)) {
      setError('Please enter your name.');
      return;
    }
    const nextState = { ...appState, user: createUserSetup(userName, realityCheckerName) };
    persist(nextState);
    setError('');
    setCurrentScreen('home');
  }

  function submitProblem(event: FormEvent) {
    event.preventDefault();
    if (activeLockdown) {
      setCurrentScreen('lockdown');
      return;
    }
    if (!validateProblemText(problemText)) {
      setError('Please enter something to overthink.');
      return;
    }
    setOptionTexts(['', '']);
    setError('');
    setCurrentScreen('options');
  }

  function lockOptions(event: FormEvent) {
    event.preventDefault();
    const options = optionTexts.map((text) => createDecisionOption('Option', text));
    if (!validateOptions(options)) {
      setError('Please enter at least 2 options.');
      return;
    }
    const lockedDecision = createLockedDecision(problemText, options.filter((option) => normaliseDecisionText(option.text).length > 0));
    const goalpostWarning = detectGoalpostShift(lockedDecision.options, getMostRecentDecision(appState));
    persist({ ...appState, currentDecision: lockedDecision, goalpostWarning });
    setLatestResult(undefined);
    setShareDecision(undefined);
    setError('');
    setCurrentScreen('game-selection');
  }

  function updateOption(index: number, value: string) {
    setOptionTexts((current) => current.map((option, optionIndex) => (optionIndex === index ? value : option)));
  }

  function removeOption(index: number) {
    setOptionTexts((current) => (current.length > 2 ? current.filter((_, optionIndex) => optionIndex !== index) : current));
  }

  function resumeMostRecentPreviousDecision() {
    const previous = getMostRecentDecision(appState);
    if (!previous || isLockdownActive(previous, now)) return;
    persist({ ...appState, currentDecision: previous, goalpostWarning: undefined });
    setLatestResult(undefined);
    setShareDecision(undefined);
    setError('');
    setCurrentScreen('game-selection');
  }

  function runSelectedGame(gameId: GameId) {
    if (activeLockdown) {
      setCurrentScreen('lockdown');
      return;
    }
    const runAt = new Date();
    const outcome = runGame(appState, gameId, runAt);
    setNow(runAt);
    const nextState = outcome.suddenDeathTriggered && outcome.state.currentDecision
      ? addDecisionToHistory(outcome.state, outcome.state.currentDecision)
      : outcome.state;
    persist(nextState);
    setLatestResult(outcome.result);
    setCurrentScreen(outcome.suddenDeathTriggered ? 'lockdown' : 'result');
  }

  function acceptLatestDecision() {
    if (!latestResult) return;
    const acceptedAt = new Date();
    const lockedDownState = acceptDecisionResult(appState, latestResult.selectedOption, acceptedAt);
    setNow(acceptedAt);
    const finalDecision = lockedDownState.currentDecision;
    const historyState = finalDecision ? addDecisionToHistory(lockedDownState, finalDecision) : lockedDownState;
    persist({ ...historyState, currentDecision: undefined, goalpostWarning: undefined });
    if (finalDecision) setShareDecision(finalDecision);
    setLatestResult(undefined);
    setProblemText('');
    setOptionTexts(['', '']);
    setCurrentScreen('home');
  }

  if (!hasHydrated) {
    return <main className="app-shell">Loading the machine...</main>;
  }

  return (
    <main className="app-shell" aria-labelledby="app-title">
      <section className="screen-card machine-frame">
        <p className="eyebrow">Questionable Arcade Oracle</p>
        <h1 id="app-title">OVERTHINK-O-MATIC 5000</h1>
        <p className="machine-subtitle">Powered by Barry the Honey Badger 🐾</p>

        {error && <p className="error-alert" role="alert">⚠ {error}</p>}

        {adminTestMode && currentScreen !== 'share-result' && (
          <section className="admin-panel" aria-label="Admin Test Controls">
            <h2>Admin Test Controls</h2>
            <button type="button" onClick={handleClearActiveDecision}>Clear active decision / lockdown</button>
            <button type="button" onClick={handleClearPreviousOverthinks}>Clear previous overthinks</button>
            <button type="button" onClick={handleClearAllAppData}>Clear all local app data</button>
            <button type="button" onClick={() => setCurrentScreen('admin-qa-runner')}>Admin QA Runner</button>
            <button type="button" onClick={() => setCurrentScreen('about-machine')}>About The Machine</button>
          </section>
        )}


        {adminTestMode && currentScreen === 'admin-qa-runner' && (
          <section className="admin-panel" aria-label="Admin QA Runner">
            <h2>Admin QA Runner</h2>
            <button type="button" onClick={handleRunAdminQaSimulation}>Run Full QA Simulation</button>
            <button type="button" onClick={handleResetAdminQaData}>Reset Test Data</button>
            {adminQaResults.length > 0 && (
              <div>
                <p>Test name | Pass/fail | Notes | Failed state/branch</p>
                <ul>{adminQaResults.map((result) => (
                  <li key={result.testName}>
                    {result.testName} | {result.passed ? 'PASS' : 'FAIL'} | {result.notes} | {result.failedBranch ?? ''}
                  </li>
                ))}</ul>
              </div>
            )}
            <button type="button" onClick={() => setCurrentScreen('home')}>Back to Home</button>
          </section>
        )}

        {currentScreen === 'setup' && (
          <form onSubmit={saveSetup}>
            <h2>Operator Setup</h2><p>Barry is thinking... please identify yourself before touching the glowing buttons.</p>
            <label>User name<input value={userName} onChange={(event: Event) => setUserName((event.target as HTMLInputElement).value)} /></label>
            <label>Optional reality checker name<input value={realityCheckerName} onChange={(event: Event) => setRealityCheckerName((event.target as HTMLInputElement).value)} /></label>
            <button type="submit">Save setup / Power Up Machine</button>
          </form>
        )}

        {currentScreen === 'home' && appState.user && (
          <form onSubmit={submitProblem}>
            <h2>STATE YOUR OVERTHINK</h2><p className="quote-panel">Feed Barry one low-stakes decision. He will pretend this is science.</p>
            <label>Decision input<textarea value={problemText} onChange={(event: Event) => setProblemText((event.target as HTMLTextAreaElement).value)} /></label>
            <button type="submit">INSERT INTO MACHINE</button>
            <button type="button" onClick={() => setCurrentScreen('previous-overthinks')}>PREVIOUS OVERTHINKS</button>
            <button type="button" onClick={() => setCurrentScreen('about-machine')}>ABOUT THE MACHINE</button>
            {shareDecision && <button type="button" onClick={() => openShareResult(shareDecision)}>Share Result</button>}
          </form>
        )}

        {currentScreen === 'options' && (
          <form onSubmit={lockOptions}>
            <h2>OPTIONS DETECTED</h2><p>Barry only chooses from what you feed him. Do not blame the badger.</p>
            {optionRows.map((option, index) => (
              <div key={option.id}>
                <label>{option.label}<input value={option.value} onChange={(event: Event) => updateOption(index, (event.target as HTMLInputElement).value)} /></label>
                <button type="button" onClick={() => removeOption(index)} disabled={optionTexts.length <= 2}>Remove</button>
              </div>
            ))}
            <button type="button" onClick={() => setOptionTexts((current) => [...current, ''])}>ADD ANOTHER OPTION</button>
            <button type="submit">LOCK IN OPTIONS</button>
          </form>
        )}

        {currentScreen === 'game-selection' && decision && (
          <section>
            <h2>OPTIONS DETECTED</h2><p>Barry only chooses from what you feed him. Do not blame the badger.</p>
            {appState.goalpostWarning?.hasShift && (
              <section className="warning-panel" aria-label="Goalpost warning">
                <p>{appState.goalpostWarning.message}</p>
                <p>Repeated option: {appState.goalpostWarning.repeatedOptions.join(', ')}</p>
                {appState.goalpostWarning.previousFinalAnswer && <p>The last decision landed on: {appState.goalpostWarning.previousFinalAnswer}.</p>}
                {(() => {
                  const previous = getMostRecentDecision(appState);
                  return previous && !isLockdownActive(previous, now) ? (
                    <p><button type="button" onClick={resumeMostRecentPreviousDecision}>Resume previous decision tree if available</button></p>
                  ) : null;
                })()}
              </section>
            )}
            <p>Decision: {decision.problem}</p>
            <ul>{decision.options.map((option) => <li key={option.id}>{option.text}</li>)}</ul>
            <div className="stat-chip">Credits remaining: {creditsRemaining}</div>
            <div className="protocol-grid">{eligibleGames.map((game, index) => {
              const protocolName = game.id === GameId.ChaosGoblin ? 'Chaos Engine' : game.name;
              const emblems = ['◈', '⬡', '✦', '⚙', '◆', '◉', '✹', '▣'];
              return (
                <article className="protocol-card" key={game.id}>
                  <div className="protocol-emblem" aria-hidden="true">{emblems[index % emblems.length]}</div>
                  <div>
                    <h3>{protocolName} Protocol</h3>
                    <p>{game.description}</p>
                  </div>
                  <button type="button" onClick={() => runSelectedGame(game.id)}>Select {protocolName}</button>
                </article>
              );
            })}</div>
          </section>
        )}

        {currentScreen === 'result' && latestResult && decision && (
          <section>
            <div className="result-sign"><h2>THE MACHINE SAYS...</h2><p className="result-answer">{latestResult.selectedOption}</p></div>
            <p>The Machine Played: {latestGame?.id === GameId.ChaosGoblin ? 'Chaos Engine' : latestGame?.name ?? latestResult.gameId} Protocol</p>
            <div className="quote-panel"><h3>Barry’s notes</h3><p>{latestResult.machineQuote}</p></div>
            <div className="stat-chip">Credits remaining: {creditsRemaining}</div>
            <div className="attempt-spiral"><h3>YOUR OVERTHINK SPIRAL</h3>{decision.gamesPlayed.map((attempt, index) => <p key={attempt.id}>Attempt {index + 1}: {attempt.gameId === GameId.ChaosGoblin ? 'Chaos Engine' : attempt.gameId} → {attempt.selectedOptionText}</p>)}{decision.gamesPlayed.length >= 3 && <p>You appear to be circling the bowl.</p>}{decision.gamesPlayed.length >= 5 && <p>Barry has reviewed the spiral and is now taking control.</p>}<p>{getEscalationMessage(decision)}</p></div>
            <button type="button" onClick={acceptLatestDecision}>ACCEPT THE ANSWER</button>
            <button type="button" onClick={() => setCurrentScreen('game-selection')} disabled={!canTryAgain}>TRY ANOTHER PROTOCOL</button>
          </section>
        )}

        {currentScreen === 'lockdown' && decision?.lockdown && (
          <section className="lockdown-panel">
            <h2>SUDDEN DEATH</h2>
            <p className="emergency-kicker">BARRY HAS TAKEN CONTROL</p>
            <p>You asked five times. The machine is done.</p>
            <p>Final decision</p>
            <p className="result-answer">{decision.lockdown.finalAnswer}</p>
            <p>RED CARD ISSUED</p>
            <p>5 minute cool down activated</p>
            {decision.lockdown.finalMachineQuote && <p>{decision.lockdown.finalMachineQuote}</p>}
            <p>DECISION LOCKED</p><div className="countdown">{formatCountdown(lockdownRemainingMs)}</div><p>No new overthinks allowed</p><p>Seriously. Go do something else.</p>
            <p>{getLockdownMessage(decision, now)}</p>
            {decision.lockdown.finalAnswer && <button type="button" onClick={() => openShareResult(decision)}>Share Result</button>}
            <button type="button" onClick={() => setCurrentScreen('previous-overthinks')}>Previous Overthinks</button>
            {lockdownRemainingMs <= 0 && <button type="button" onClick={goHome}>New Overthink</button>}
          </section>
        )}

        {currentScreen === 'previous-overthinks' && (
          <section>
            <h2>Your Overthink Spiral</h2>
            {appState.previousDecisions.length === 0 ? <p>No previous overthinks yet.</p> : appState.previousDecisions.map((previous) => {
              const summary = formatPreviousOverthinkSummary(previous);
              return (
                <article className="history-card" key={previous.id}>
                  <h3>{summary.problem}</h3>
                  <p>Final answer: {summary.finalAnswer}</p>
                  <p>Options: {summary.options.join(', ')}</p>
                  <p>Protocols played: {summary.gamesPlayedCount}</p>
                  <p>Attempt number: {summary.attemptsUsed}</p>
                  <p>Created: {formatDate(summary.createdDate)}</p>
                  {summary.lockdownStatus && <p>Lockdown status: {summary.lockdownStatus}</p>}
                  {summary.machineQuote && <p>Machine quote: {summary.machineQuote}</p>}
                  <button type="button" onClick={() => openShareResult(previous)}>Share</button>
                </article>
              );
            })}
            <button type="button" onClick={() => setCurrentScreen('home')}>Back to Home</button>
          </section>
        )}

        {currentScreen === 'share-result' && shareData && (
          <section>
            <h2>Share Result</h2><p className="quote-panel">The machine says... publish this questionable wisdom responsibly.</p>
            <div ref={(element: HTMLDivElement | null) => { shareCardElement = element; }}>
              <ShareResultCard data={shareData} />
            </div>
            {canDownloadShareImage ? (
              <button type="button" onClick={downloadShareImage}>Download Image</button>
            ) : (
              <p>{shareFallbackMessage}</p>
            )}
            <p>Copy/share fallback: {shareFallbackMessage}.</p>
            <button type="button" onClick={() => setCurrentScreen('previous-overthinks')}>Back to Previous Overthinks</button>
            {!activeLockdown && <button type="button" onClick={goHome}>New Overthink</button>}
          </section>
        )}

        {currentScreen === 'about-machine' && (
          <section className="about-lore">
            <h2>About The Machine</h2>
            <p>The Overthink-O-Matic 5000 was discovered behind an arcade in 1987.</p>
            <p>Inside was Barry.</p>
            <p>Nobody knows how long he had been there.</p>
            <p>Nobody has successfully counted the number of energy drinks consumed.</p>
            <p>The machine is powered by a questionable blend of pocket change, panic, static electricity, and one extremely confident honey badger.</p>
            <p>Scientific accuracy: somewhere between a fortune cookie and a very confident pigeon.</p>
            <p>Independent testing shows the machine is approximately 14% more accurate than Facebook, 22% more accurate than asking the group chat, and 37% more accurate than changing your mind six times.</p>
            <p>Warning: results may be wildly unqualified but strangely useful.</p>
            <button type="button" onClick={() => setCurrentScreen(appState.user ? 'home' : 'setup')}>Back to Home</button>
          </section>
        )}
      </section>
    </main>
  );
}

export default App;
