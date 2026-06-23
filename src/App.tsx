import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createDecisionOption, createLockedDecision, createUserSetup, detectGoalpostShift, formatPreviousOverthinkSummary, getMostRecentDecision, isAdminTestMode, normaliseDecisionText, validateOptions, validateProblemText } from './domain/helpers';
import { AppState, DecisionRecord, GameId, GameResult } from './domain/model';
import { ShareResultCard } from './share/ShareResultCard';
import { buildShareResultData } from './share/shareResultBuilder';
import { SHARE_EXPORT_FALLBACK, downloadShareCardImage, isShareImageExportSupported } from './share/shareImageExporter';
import { addDecisionToHistory, clearActiveDecision, clearAllAppData, clearPreviousOverthinks, createInitialAppState, hydrateAppState, saveAppState } from './state/appState';
import { createLocalStorageService } from './storage/localStorageService';
import { acceptDecisionResult, rejectDecisionResult, getAttemptsRemaining, getEscalationMessage, getLockdownMessage, getLockdownRemainingMs, getBarryCommitment } from './services/overthinkingEngine';
import { AdminQaResult, resetAdminQaTestData, runFullAdminQaSimulation } from './services/adminQaRunner';
import { getEligibleGames, runGame } from './services/gameRunner';
import { BarryCommentary, BarryStatus, BarryWindow, MachineReadout, MachineShell, MachineWarning, ProtocolModuleCard } from './components/MachineUI';
import './styles/base.css';

export const screens = ['setup', 'home', 'options', 'game-selection', 'thinking', 'result', 'barry-takeover', 'lockdown', 'previous-overthinks', 'share-result', 'admin-qa-runner', 'about-machine'] as const;
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
  const [thinkingRun, setThinkingRun] = useState<{ protocolName: string; progress: string; result: GameResult; outcome: ReturnType<typeof runGame> } | undefined>(undefined);
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
  const attemptsRemaining = decision ? getAttemptsRemaining(decision) : 0;
  const eligibleGames = decision ? getEligibleGames(decision) : [];
  const latestGame = latestResult ? eligibleGames.find((game) => game.id === latestResult.gameId) : undefined;
  const lockdownRemainingMs = decision ? getLockdownRemainingMs(decision, now) : 0;
  const activeLockdown = isLockdownActive(decision, now);
  const canTryAgain = Boolean(decision && attemptsRemaining > 0 && !activeLockdown);
  const shareData = shareDecision ? buildShareResultData(shareDecision, shareDecision.id === decision?.id ? latestResult : undefined) : undefined;
  const canDownloadShareImage = isShareImageExportSupported();
  const adminTestMode = isAdminTestMode(appState.user);

  useEffect(() => {
    if (activeLockdown && !['barry-takeover', 'lockdown', 'share-result', 'previous-overthinks'].includes(currentScreen)) {
      setCurrentScreen('lockdown');
    }
  }, [activeLockdown, currentScreen]);


  useEffect(() => {
    if (currentScreen !== 'thinking' || !thinkingRun) return;
    const timer = window.setTimeout(revealThinkingResult, 650);
    return () => window.clearTimeout(timer);
  }, [currentScreen, thinkingRun]);
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
    setThinkingRun(undefined);
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
    setThinkingRun(undefined);
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
    setThinkingRun(undefined);
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
    setThinkingRun(undefined);
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
    setThinkingRun(undefined);
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
    const game = eligibleGames.find((candidate) => candidate.id === gameId);
    const protocolName = gameId === GameId.ChaosGoblin ? 'Chaos Engine' : game?.name ?? outcome.result.gameId;
    setNow(runAt);
    setLatestResult(undefined);
    setThinkingRun({
      protocolName,
      progress: `Barry is running the ${protocolName} Protocol with unnecessary confidence.`,
      result: outcome.result,
      outcome,
    });
    setCurrentScreen('thinking');
  }

  function revealThinkingResult() {
    if (!thinkingRun) return;
    const nextState = thinkingRun.outcome.barryTakeoverTriggered && thinkingRun.outcome.state.currentDecision
      ? addDecisionToHistory(thinkingRun.outcome.state, thinkingRun.outcome.state.currentDecision)
      : thinkingRun.outcome.state;
    persist(nextState);
    setLatestResult(thinkingRun.result);
    setThinkingRun(undefined);
    setCurrentScreen(thinkingRun.outcome.barryTakeoverTriggered ? 'barry-takeover' : 'result');
  }


  function rejectLatestDecision() {
    if (!latestResult || !canTryAgain) return;
    const rejectedState = rejectDecisionResult(appState);
    persist(rejectedState);
    setCurrentScreen('game-selection');
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
    setThinkingRun(undefined);
    setProblemText('');
    setOptionTexts(['', '']);
    setCurrentScreen('home');
  }

  if (!hasHydrated) {
    return <main className="app-shell">Loading the machine...</main>;
  }

  return (
    <main className="app-shell" aria-labelledby="app-title">
      <MachineShell statusLine="Powered by Barry the Honey Badger 🐾" emergency={currentScreen === 'barry-takeover' || currentScreen === 'lockdown'} controls={currentScreen !== 'admin-qa-runner' && currentScreen !== 'setup' ? (<>
          <button className="machine-button machine-button--secondary" type="button" onClick={goHome}>MACHINE</button>
          <button className="machine-button machine-button--secondary" type="button" onClick={() => setCurrentScreen('previous-overthinks')}>PREVIOUS OVERTHINKS</button>
          <button className="machine-button machine-button--secondary" type="button" onClick={() => setCurrentScreen('about-machine')}>ABOUT THE MACHINE</button>
        </>) : undefined}>
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
            <button type="button" onClick={() => setCurrentScreen('home')}>MACHINE</button>
          </section>
        )}

        {currentScreen === 'setup' && (
          <form onSubmit={saveSetup}>
            <h2>Operator Setup</h2><p>Barry is thinking... please identify yourself before touching the glowing buttons.</p>
            <label>User name<input value={userName} onChange={(event: Event) => setUserName((event.target as HTMLInputElement).value)} /></label>
            <label>Optional reality checker name<input value={realityCheckerName} onChange={(event: Event) => setRealityCheckerName((event.target as HTMLInputElement).value)} /></label>
            <button className="machine-button machine-button--primary" type="submit">Save setup / Power Up Machine</button>
          </form>
        )}

        {currentScreen === 'home' && appState.user && (
          <form onSubmit={submitProblem}>
            <h2>STATE YOUR OVERTHINK</h2><BarryWindow><BarryStatus>OPERATOR WINDOW: Barry is behind the glass pretending this is science.</BarryStatus></BarryWindow><BarryCommentary><p>Feed Barry one low-stakes decision. He will pretend this is science.</p></BarryCommentary>
            <label>Decision input<textarea value={problemText} onChange={(event: Event) => setProblemText((event.target as HTMLTextAreaElement).value)} /></label>
            <button className="machine-button machine-button--primary" type="submit">INSERT INTO MACHINE</button>
            {shareDecision && <button type="button" onClick={() => openShareResult(shareDecision)}>SHARE YOUR OVERTHINK</button>}
          </form>
        )}

        {currentScreen === 'options' && (
          <form onSubmit={lockOptions}>
            <h2>OPTIONS DETECTED</h2><BarryStatus>Barry only chooses from what you feed him. Do not blame the badger.</BarryStatus>
            {optionRows.map((option, index) => (
              <div key={option.id}>
                <label>{option.label}<input value={option.value} onChange={(event: Event) => updateOption(index, (event.target as HTMLInputElement).value)} /></label>
                <button type="button" onClick={() => removeOption(index)} disabled={optionTexts.length <= 2}>Remove</button>
              </div>
            ))}
            <button className="machine-button machine-button--secondary" type="button" onClick={() => setOptionTexts((current) => [...current, ''])}>ADD ANOTHER OPTION</button>
            <button className="machine-button machine-button--primary" type="submit">LOCK IN OPTIONS</button>
          </form>
        )}

        {currentScreen === 'game-selection' && decision && (
          <section>
            <h2>CHOOSE YOUR PROTOCOL</h2><BarryWindow><BarryStatus>OPERATOR WINDOW: Barry is selecting machinery with unnecessary confidence.</BarryStatus></BarryWindow>
            {appState.goalpostWarning?.hasShift && (
              <MachineWarning className="warning-panel">
                <p>{appState.goalpostWarning.message}</p>
                <p>Repeated option: {appState.goalpostWarning.repeatedOptions.join(', ')}</p>
                {appState.goalpostWarning.previousFinalAnswer && <p>The last decision landed on: {appState.goalpostWarning.previousFinalAnswer}.</p>}
                {(() => {
                  const previous = getMostRecentDecision(appState);
                  return previous && !isLockdownActive(previous, now) ? (
                    <p><button type="button" onClick={resumeMostRecentPreviousDecision}>Resume previous overthink spiral if available</button></p>
                  ) : null;
                })()}
              </MachineWarning>
            )}
            <p>Overthink: {decision.problem}</p>
            <ul>{decision.options.map((option) => <li key={option.id}>{option.text}</li>)}</ul>
            <MachineReadout><span>COMMITMENT LEVEL:</span><span className="readout-value">{getBarryCommitment(decision).stage}</span><span className="readout-detail">ATTEMPTS REMAINING: {attemptsRemaining}</span><span className="visually-hidden">BARRY COMMITMENT INDEX: {attemptsRemaining}</span></MachineReadout>
            <div className="protocol-grid">{eligibleGames.map((game, index) => {
              const protocolName = game.id === GameId.ChaosGoblin ? 'Chaos Engine' : game.name;
              const emblems = ['◈', '⬡', '✦', '⚙', '◆', '◉', '✹', '▣'];
              return (
                <ProtocolModuleCard key={game.id} name={protocolName} description={game.description} emblem={emblems[index % emblems.length]} onActivate={() => runSelectedGame(game.id)} />
              );
            })}</div>
          </section>
        )}

        {currentScreen === 'thinking' && thinkingRun && (
          <section className="thinking-panel" aria-live="polite">
            <h2>BARRY IS THINKING</h2>
            <BarryWindow><BarryStatus>OPERATOR WINDOW: Barry is somewhere inside the cabinet making this worse.</BarryStatus></BarryWindow>
            <MachineReadout><span>STATUS:</span><span className="readout-value">PROCESSING</span><span className="readout-detail">PROTOCOL: {thinkingRun.protocolName}</span></MachineReadout>
            <div className="machine-progress" aria-label="Machine processing progress"><span /></div>
            <p>{thinkingRun.progress}</p>
            <p>Barry is consulting highly questionable science.</p>
            <p>Switches are flipping. Gauges are moving. This may or may not help.</p>
          </section>
        )}

        {currentScreen === 'result' && latestResult && decision && (
          <section>
            <div className="result-sign"><h2>THE MACHINE SAYS...</h2><p className="result-answer">{latestResult.selectedOption}</p></div>
            <MachineReadout><span>PROTOCOL:</span><span className="readout-value">{latestGame?.id === GameId.ChaosGoblin ? 'Chaos Engine' : latestGame?.name ?? latestResult.gameId}</span><span className="readout-detail">STATUS: OUTPUT STABLE</span></MachineReadout>
            <BarryCommentary><p>{latestResult.machineQuote}</p></BarryCommentary>
            <MachineReadout><span>COMMITMENT LEVEL:</span><span className="readout-value">{getBarryCommitment(decision).stage}</span><span className="readout-detail">ATTEMPTS REMAINING: {attemptsRemaining}</span><span className="visually-hidden">BARRY COMMITMENT INDEX: {attemptsRemaining}</span></MachineReadout>
            <div className="attempt-spiral"><p className="module-label">MACHINE AUDIT LOG</p><h3>OVERTHINK SPIRAL</h3>{decision.gamesPlayed.map((attempt, index) => { const commitment = getBarryCommitment({ ...decision, gamesPlayed: decision.gamesPlayed.slice(0, index + 1) }); const rejected = decision.rejectedResultIds.includes(attempt.id); return <p key={attempt.id}>Attempt {index + 1}: {attempt.gameId === GameId.ChaosGoblin ? 'Chaos Engine' : attempt.gameId} → {attempt.selectedOptionText} — {rejected ? 'Rejected' : 'Current result'} — Barry is {commitment.stage}</p>; })}{decision.gamesPlayed.length >= 3 && <p>You appear to be circling the bowl.</p>}{decision.gamesPlayed.length >= 5 && <p>Barry has reviewed the spiral and is now taking control.</p>}<p>{getEscalationMessage(decision)}</p></div>
            <button className="machine-button machine-button--success" type="button" onClick={acceptLatestDecision}>ACCEPT THE ANSWER</button>
            <button className="machine-button machine-button--protocol" type="button" onClick={rejectLatestDecision} disabled={!canTryAgain}>TRY ANOTHER PROTOCOL</button>
          </section>
        )}

        {currentScreen === 'barry-takeover' && decision?.lockdown && (
          <section className="lockdown-panel">
            <h2>BARRY HAS TAKEN CONTROL</h2>
            <p className="emergency-kicker">Your decision-making privileges have been temporarily revoked.</p>
            <p>Barry has concluded additional user input is no longer helping.</p>
            <p>Final decision</p>
            <p className="result-answer">{decision.lockdown.finalAnswer}</p>
            {decision.lockdown.finalMachineQuote && <p>{decision.lockdown.finalMachineQuote}</p>}
            <div className="attempt-spiral"><p className="module-label">MACHINE AUDIT LOG</p><h3>OVERTHINK SPIRAL</h3>{decision.gamesPlayed.map((attempt, index) => { const commitment = getBarryCommitment({ ...decision, gamesPlayed: decision.gamesPlayed.slice(0, index + 1) }); return <p key={attempt.id}>Attempt {index + 1}: {attempt.gameId === GameId.ChaosGoblin ? 'Chaos Engine' : attempt.gameId} → {attempt.selectedOptionText} — {index < decision.gamesPlayed.length - 1 ? 'Rejected' : 'Final protocol'} — Barry is {commitment.stage}</p>; })}</div>
            <p>The machine is entering containment recovery.</p>
            <button className="machine-button machine-button--danger" type="button" onClick={() => setCurrentScreen('lockdown')}>ENTER LOCKDOWN</button>
          </section>
        )}

        {currentScreen === 'lockdown' && decision?.lockdown && (
          <section className="lockdown-panel">
            <h2>BARRY HAS TAKEN CONTROL</h2>
            <p className="emergency-kicker">BARRY IS RECOVERING</p>
            <p>Barry has become too committed. Barry made the final decision.</p>
            <p>Final decision</p>
            <p className="result-answer">{decision.lockdown.finalAnswer}</p>
            <p>Containment recovery has begun.</p>
            {decision.lockdown.finalMachineQuote && <p>{decision.lockdown.finalMachineQuote}</p>}
            <p>DECISION LOCKED</p><p>LOCKDOWN REMAINING</p><div className="countdown">{formatCountdown(lockdownRemainingMs)}</div><p>No new overthinks until Barry recovers.</p><p>Recovery is underway.</p>
            <p>{getLockdownMessage(decision, now)}</p>
            {decision.lockdown.finalAnswer && <button type="button" onClick={() => openShareResult(decision)}>SHARE YOUR OVERTHINK</button>}
            <button type="button" onClick={() => setCurrentScreen('previous-overthinks')}>PREVIOUS OVERTHINKS</button>
            {lockdownRemainingMs <= 0 && <button type="button" onClick={goHome}>MACHINE</button>}
          </section>
        )}

        {currentScreen === 'previous-overthinks' && (
          <section>
            <h2>PREVIOUS OVERTHINKS</h2>
            {appState.previousDecisions.length === 0 ? <p>No previous overthinks yet.</p> : appState.previousDecisions.map((previous) => {
              const summary = formatPreviousOverthinkSummary(previous);
              return (
                <article className="history-card" key={previous.id}>
                  <h3>{summary.problem}</h3>
                  <p>Final decision: {summary.finalAnswer}</p>
                  <p>Options: {summary.options.join(', ')}</p>
                  <p>Overthink Spiral entries: {summary.gamesPlayedCount}</p>
                  <p>Barry Commitment Index: {summary.attemptsUsed}</p>
                  <p>Created: {formatDate(summary.createdDate)}</p>
                  {summary.lockdownStatus && <p>Barry recovery status: {summary.lockdownStatus}</p>}
                  {summary.machineQuote && <p>Barry's comment: {summary.machineQuote}</p>}
                  <button type="button" onClick={() => openShareResult(previous)}>SHARE YOUR OVERTHINK</button>
                </article>
              );
            })}
            <button type="button" onClick={() => setCurrentScreen('home')}>MACHINE</button>
          </section>
        )}

        {currentScreen === 'share-result' && shareData && (
          <section>
            <h2>SHARE YOUR OVERTHINK</h2><p className="quote-panel">Print a cursed arcade receipt for this overthink.</p>
            <div ref={(element: HTMLDivElement | null) => { shareCardElement = element; }}>
              <ShareResultCard data={shareData} />
            </div>
            {canDownloadShareImage ? (
              <button type="button" onClick={downloadShareImage}>DOWNLOAD RECEIPT</button>
            ) : (
              <p>{shareFallbackMessage}</p>
            )}
            <p>Receipt fallback: {shareFallbackMessage}.</p>
            <button type="button" onClick={() => setCurrentScreen('previous-overthinks')}>BACK TO PREVIOUS OVERTHINKS</button>
            {!activeLockdown && <button type="button" onClick={goHome}>MACHINE</button>}
          </section>
        )}

        {currentScreen === 'about-machine' && (
          <section className="about-lore">
            <h2>ABOUT THE MACHINE</h2>
            <p>The OVERTHINK-O-MATIC 5000 was discovered behind an arcade in 1987.</p>
            <p>Inside was Barry.</p>
            <p>Nobody knows how long he had been there.</p>
            <p>Nobody has successfully counted the number of energy drinks consumed.</p>
            <p>The machine is powered by a questionable blend of pocket change, panic, static electricity, and one extremely confident honey badger.</p>
            <p>Scientific accuracy: somewhere between a fortune cookie and a very confident pigeon.</p>
            <p>Independent testing shows the machine is approximately 14% more accurate than Facebook, 22% more accurate than asking the group chat, and 37% more accurate than changing your mind six times.</p>
            <p>Warning: results may be wildly unqualified but strangely useful.</p>
            <button type="button" onClick={() => setCurrentScreen(appState.user ? 'home' : 'setup')}>MACHINE</button>
          </section>
        )}
      </MachineShell>
    </main>
  );
}

export default App;
