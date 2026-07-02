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
import { BarryWindow, FooterStatusPanel, MachineLcd, MachinePrimaryCta, MachineReadout, MachineShell, MachineWarning } from './components/MachineUI';
import './styles/base.css';

export const screens = ['setup', 'home', 'options', 'game-selection', 'thinking', 'result', 'barry-takeover', 'lockdown', 'previous-overthinks', 'share-result', 'admin', 'about-machine'] as const;
export type AppScreen = (typeof screens)[number];

const storageService = createLocalStorageService();

const optionsFooterStatusPanels: FooterStatusPanel[] = [
  { label: 'STATUS', text: 'Options detected' },
  { label: 'QUEUE', text: 'Input queue active' },
  { label: 'LOCK', text: 'Awaiting lock-in' },
];

const protocolFooterStatusPanels: FooterStatusPanel[] = [
  { label: 'STATUS', text: 'Protocols loaded' },
  { label: 'ENGINE', text: 'Decision engine ready' },
  { label: 'QUEUE', text: 'Awaiting protocol' },
];

const thinkingFooterStatusPanels: FooterStatusPanel[] = [
  { label: 'STATUS', text: 'Processing' },
  { label: 'QUEUE', text: 'Protocol active' },
  { label: 'BARRY', text: 'Barry engaged' },
];

const resultFooterStatusPanels: FooterStatusPanel[] = [
  { label: 'STATUS', text: 'Decision generated' },
  { label: 'QUEUE', text: 'Awaiting acceptance' },
  { label: 'STABILITY', text: 'Machine stable' },
];

const receiptFooterStatusPanels: FooterStatusPanel[] = [
  { label: 'STATUS', text: 'Receipt printed' },
  { label: 'ARCHIVE', text: 'Decision archived' },
  { label: 'SHARE', text: 'Share system ready' },
];

const takeoverFooterStatusPanels: FooterStatusPanel[] = [
  { label: 'STATUS', text: 'Barry takeover' },
  { label: 'CONTAINMENT', text: 'Containment active' },
  { label: 'STABILITY', text: 'System unstable' },
];

const lockdownFooterStatusPanels: FooterStatusPanel[] = [
  { label: 'STATUS', text: 'Barry recovering' },
  { label: 'COOLING', text: 'Machine cooling' },
  { label: 'INPUTS', text: 'Inputs locked' },
];


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
  const [expandedProtocolId, setExpandedProtocolId] = useState<GameId | undefined>(undefined);
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
    if (activeLockdown && !['barry-takeover', 'lockdown', 'share-result', 'previous-overthinks', 'about-machine', ...(adminTestMode ? ['admin' as AppScreen] : [])].includes(currentScreen)) {
      setCurrentScreen('lockdown');
    }
  }, [activeLockdown, adminTestMode, currentScreen]);


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
    setCurrentScreen('share-result');
  }

  if (!hasHydrated) {
    return <main className="app-shell">Loading the machine...</main>;
  }

  return (
    <main className="app-shell" aria-labelledby="app-title">
      <MachineShell statusLine={currentScreen === 'home' || currentScreen === 'options' || currentScreen === 'game-selection' || currentScreen === 'thinking' || currentScreen === 'result' || currentScreen === 'share-result' || currentScreen === 'barry-takeover' || currentScreen === 'lockdown' ? "POWERED BY BARRY THE HONEY BADGER" : "Powered by Barry the Honey Badger 🐾"} emergency={currentScreen === 'barry-takeover' || currentScreen === 'lockdown'} homeArt={currentScreen === 'home' || currentScreen === 'options' || currentScreen === 'game-selection' || currentScreen === 'thinking' || currentScreen === 'result' || currentScreen === 'share-result' || currentScreen === 'barry-takeover' || currentScreen === 'lockdown'} homeReset={currentScreen === 'home'} footerStatusPanels={currentScreen === 'options' ? optionsFooterStatusPanels : currentScreen === 'game-selection' ? protocolFooterStatusPanels : currentScreen === 'thinking' ? thinkingFooterStatusPanels : currentScreen === 'result' ? resultFooterStatusPanels : currentScreen === 'share-result' ? receiptFooterStatusPanels : currentScreen === 'barry-takeover' ? takeoverFooterStatusPanels : currentScreen === 'lockdown' ? lockdownFooterStatusPanels : undefined} controls={currentScreen !== 'setup' ? (<>
          {((currentScreen !== 'barry-takeover' && currentScreen !== 'lockdown') || lockdownRemainingMs <= 0) && <button className="machine-button machine-button--secondary footer-nav__button" type="button" onClick={goHome} aria-label="MACHINE"><span className="footer-nav__icon" aria-hidden="true">⚙</span><span className="footer-nav__label">MACHINE</span></button>}
          <button className="machine-button machine-button--secondary footer-nav__button" type="button" onClick={() => setCurrentScreen('previous-overthinks')} aria-label="PREVIOUS OVERTHINKS"><span className="footer-nav__icon" aria-hidden="true">◷</span><span className="footer-nav__label">PREVIOUS OVERTHINKS</span></button>
          <button className="machine-button machine-button--secondary footer-nav__button" type="button" onClick={() => setCurrentScreen('about-machine')} aria-label="ABOUT THE MACHINE"><span className="footer-nav__icon" aria-hidden="true">ⓘ</span><span className="footer-nav__label">ABOUT THE MACHINE</span></button>
          {adminTestMode && <button className="machine-button machine-button--secondary footer-nav__button" type="button" onClick={() => setCurrentScreen('admin')} aria-label="ADMIN"><span className="footer-nav__icon" aria-hidden="true">⚙</span><span className="footer-nav__label">ADMIN</span></button>}
        </>) : undefined}>
        {error && <p className="error-alert" role="alert">⚠ {error}</p>}

        {adminTestMode && currentScreen === 'admin' && (
          <section className="support-master-blueprint" aria-label="Admin Test Controls">
            <div className="support-master-blueprint__header">
              <h2>ADMIN</h2>
              <p>Testing controls. Hidden from normal operators.</p>
            </div>
            <div className="support-master-blueprint__actions">
              <button type="button" onClick={handleClearActiveDecision}>Clear active decision / lockdown</button>
              <button type="button" onClick={handleClearPreviousOverthinks}>Clear Previous Overthinks</button>
              <button type="button" onClick={handleClearAllAppData}>Clear all local app data</button>
            </div>
            <div className="support-master-blueprint__content" aria-label="Admin QA Runner">
              <h3>Admin QA Runner</h3>
              <button type="button" onClick={handleRunAdminQaSimulation}>Run Full QA Simulation</button>
              <button type="button" onClick={handleResetAdminQaData}>Reset Test Data</button>
              {adminQaResults.length > 0 && (
                <div>
                  <p>Test name | Pass/fail | Notes | Failed state/branch</p>
                  <ul className="support-master-blueprint__list">{adminQaResults.map((result) => (
                    <li className="support-master-blueprint__item" key={result.testName}>
                      {result.testName} | {result.passed ? 'PASS' : 'FAIL'} | {result.notes} | {result.failedBranch ?? ''}
                    </li>
                  ))}</ul>
                </div>
              )}
            </div>
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
          <form className="machine-home__lcd" onSubmit={submitProblem} aria-label="State your overthink">
            <BarryWindow>
              <p>OPERATOR WINDOW</p>
              <p>Barry is behind the glass pretending this is science.</p>
            </BarryWindow>

            <MachineLcd>
              <div className="lcd-content lcd-content--compact">
                <div className="lcd-content__header">
                  <h2 className="lcd-content__title">STATE YOUR OVERTHINK</h2>
                  <p className="lcd-content__eyebrow machine-home__lcd-subtitle">- WHAT ARE WE OVERTHINKING TODAY? -</p>
                </div>

                <p className="machine-home__divider" aria-hidden="true">◆ ◆ ◆</p>

                <p className="lcd-content__body machine-home__body">FEED THE MACHINE YOUR CRISIS, BARRY IS READY AND WAITING TO DO HIS THING AND PULL THE LEVERS, PUSH THE BUTTONS AND PRETEND THIS IS SUPER SCIENTIFIC!</p>

                <label className="machine-home__input">
                  <span className="sr-only">State your overthink</span>
                  <textarea aria-label="State your overthink" placeholder="Today’s decision is?" value={problemText} onChange={(event: Event) => setProblemText((event.target as HTMLTextAreaElement).value)} />
                </label>
              </div>
            </MachineLcd>

            <MachinePrimaryCta className="machine-home__cta" type="submit">INSERT INTO MACHINE</MachinePrimaryCta>

            {shareDecision && <button type="button" onClick={() => openShareResult(shareDecision)}>SHARE YOUR OVERTHINK</button>}
          </form>
        )}

        {currentScreen === 'options' && (
          <form className="options-machine-content" onSubmit={lockOptions} aria-label="Options detected">
            <BarryWindow>
              <p>OPERATOR WINDOW</p>
              <p>Barry only chooses from what you feed him. Do not blame the badger.</p>
            </BarryWindow>

            <MachineLcd>
              <div className="lcd-content__header options-machine-content__header">
                <p className="lcd-content__eyebrow machine-home__lcd-label">Main LCD Display</p>
                <h2 className="lcd-content__title">OPTIONS DETECTED</h2>
                <p>Feed Barry at least two possible outcomes. He will treat them all with inappropriate urgency.</p>
              </div>

              <div className="lcd-content__list options-machine-content__list">
                {optionRows.map((option, index) => (
                  <div className="lcd-content__row options-machine-content__row" key={option.id}>
                    <label className="options-machine-content__field">
                      <span>{option.label}</span>
                      <input value={option.value} onChange={(event: Event) => updateOption(index, (event.target as HTMLInputElement).value)} />
                    </label>
                    <button className="machine-button machine-button--secondary options-machine-content__remove" type="button" onClick={() => removeOption(index)} disabled={optionTexts.length <= 2}>Remove</button>
                  </div>
                ))}
              </div>

              <div className="lcd-content__actions options-machine-content__actions">
                <button className="machine-button machine-button--secondary" type="button" onClick={() => setOptionTexts((current) => [...current, ''])}>ADD ANOTHER OPTION</button>
                <button className="machine-button machine-button--primary" type="submit">LOCK IN OPTIONS</button>
              </div>
            </MachineLcd>
          </form>
        )}

        {currentScreen === 'game-selection' && decision && (
          <section className="protocol-machine-content" aria-label="Protocol selection">
            <BarryWindow>
              <p>OPERATOR WINDOW</p>
              <p>Barry has absolutely no qualifications. Choose whichever protocol sounds the most scientific.</p>
            </BarryWindow>

            <MachineLcd>
              <div className="lcd-content__header protocol-machine-content__header">
                <p className="lcd-content__eyebrow machine-home__lcd-label">Main LCD Display</p>
                <h2 className="lcd-content__title">CHOOSE YOUR PROTOCOL</h2>
                <p>Barry has analysed your terrible options.</p>
              </div>

              {appState.goalpostWarning?.hasShift && (
                <MachineWarning className="warning-panel protocol-machine-content__warning">
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

              <div className="lcd-content__readout protocol-machine-content__context">
                <p><span>Overthink:</span> {decision.problem}</p>
                <p><span>Options:</span> {decision.options.map((option) => option.text).join(' / ')}</p>
              </div>

              <MachineReadout className="protocol-machine-content__commitment protocol-commitment-readout"><span>COMMITMENT LEVEL:</span><span className="readout-value">{getBarryCommitment(decision).stage}</span><span className="readout-detail">ATTEMPTS REMAINING: {attemptsRemaining}</span><span className="visually-hidden">BARRY COMMITMENT INDEX: {attemptsRemaining}</span></MachineReadout>

              <div className="lcd-content__list protocol-machine-content__list">{eligibleGames.map((game, index) => {
                const protocolName = game.id === GameId.ChaosGoblin ? 'Chaos Engine' : game.name;
                const emblems = ['◈', '⬡', '✦', '⚙', '◆', '◉', '✹', '▣'];
                const detailsId = `protocol-details-${game.id}`;
                const expanded = expandedProtocolId === game.id;
                return (
                  <article className="lcd-content__row protocol-machine-content__row" key={game.id}>
                    <div className="protocol-machine-content__summary">
                      <span className="protocol-machine-content__emblem" aria-hidden="true">{emblems[index % emblems.length]}</span>
                      <h3 className="protocol-machine-content__name">{protocolName}</h3>
                      <div className="protocol-machine-content__actions">
                        <button className="machine-button machine-button--secondary protocol-machine-content__info" type="button" onClick={() => setExpandedProtocolId((current) => current === game.id ? undefined : game.id)} aria-expanded={expanded} aria-controls={detailsId} aria-label={`${expanded ? 'Hide' : 'Show'} ${protocolName} protocol details`}>i</button>
                        <button className="machine-button machine-button--protocol protocol-machine-content__run" type="button" onClick={() => runSelectedGame(game.id)} aria-label={`Run ${protocolName} protocol`}>RUN</button>
                      </div>
                    </div>
                    {expanded && (
                      <div id={detailsId} className="protocol-machine-content__details">
                        <p className="module-label">LOADABLE MACHINE MODULE</p>
                        <p>{game.description}</p>
                        <p className="protocol-eligibility">Module eligible and loaded.</p>
                      </div>
                    )}
                  </article>
                );
              })}</div>
            </MachineLcd>
          </section>
        )}

        {currentScreen === 'thinking' && thinkingRun && (
          <section className="thinking-machine-content" aria-live="polite" aria-label="Barry thinking">
            <BarryWindow>
              <p>OPERATOR WINDOW</p>
              <p>Barry is pulling levers, shaking things, and pretending this is a controlled process.</p>
            </BarryWindow>

            <MachineLcd>
              <div className="lcd-content__header thinking-machine-content__header">
                <p className="lcd-content__eyebrow machine-home__lcd-label">Main LCD Display</p>
                <h2 className="lcd-content__title">BARRY IS THINKING</h2>
              </div>

              <div className="lcd-content__readout thinking-machine-content__readout">
                <p><span>Protocol:</span> {thinkingRun.protocolName}</p>
                <p><span>Status:</span> Processing</p>
              </div>

              <section className="lcd-content__section thinking-machine-content__status" aria-label="Machine processing status">
                <p>Barry is pulling levers, shaking things, and ignoring best practices.</p>
              </section>

              <div className="lcd-content__section thinking-machine-content__progress" aria-label="Machine progress">
                <p>{thinkingRun.progress}</p>
                <p>Barry is consulting highly questionable science.</p>
                <p>Switches are flipping. Gauges are moving. This may or may not help.</p>
              </div>
            </MachineLcd>
          </section>
        )}

        {currentScreen === 'result' && latestResult && decision && (
          <section className="result-machine-content" aria-label="Machine result">
            <BarryWindow>
              <p>OPERATOR WINDOW</p>
              <p>Barry has completed the highly questionable analysis.</p>
            </BarryWindow>

            <MachineLcd>
              <div className="lcd-content__header result-machine-content__header">
                <p className="lcd-content__eyebrow machine-home__lcd-label">Main LCD Display</p>
                <h2 className="lcd-content__title">THE MACHINE SAYS...</h2>
                <p className="result-machine-content__answer">{latestResult.selectedOption}</p>
              </div>

              <section className="lcd-content__readout result-machine-content__details" aria-label="Result details">
                <p><span>PROTOCOL:</span> {latestGame?.id === GameId.ChaosGoblin ? 'Chaos Engine' : latestGame?.name ?? latestResult.gameId}</p>
                <p><span>STATUS:</span> OUTPUT STABLE</p>
                <h3>Barry's Notes</h3>
                <p>{latestResult.machineQuote}</p>
                <p><span>COMMITMENT LEVEL:</span> {getBarryCommitment(decision).stage}</p>
                <p><span>ATTEMPTS REMAINING:</span> {attemptsRemaining}</p>
                <p className="visually-hidden">BARRY COMMITMENT INDEX: {attemptsRemaining}</p>
              </section>

              <section className="lcd-content__section result-machine-content__spiral" aria-label="Machine audit log">
                <p className="module-label">MACHINE AUDIT LOG</p>
                <h3>OVERTHINK SPIRAL</h3>
                {decision.gamesPlayed.map((attempt, index) => { const commitment = getBarryCommitment({ ...decision, gamesPlayed: decision.gamesPlayed.slice(0, index + 1) }); const rejected = decision.rejectedResultIds.includes(attempt.id); return <p key={attempt.id}>Attempt {index + 1}: {attempt.gameId === GameId.ChaosGoblin ? 'Chaos Engine' : attempt.gameId} → {attempt.selectedOptionText} — {rejected ? 'Rejected' : 'Current result'} — Barry is {commitment.stage}</p>; })}
                {decision.gamesPlayed.length >= 3 && <p>You appear to be circling the bowl.</p>}
                {decision.gamesPlayed.length >= 5 && <p>Barry has reviewed the spiral and is now taking control.</p>}
                <p>{getEscalationMessage(decision)}</p>
              </section>

              <section className="lcd-content__actions result-machine-content__actions" aria-label="Result actions">
                <button className="machine-button machine-button--success" type="button" onClick={acceptLatestDecision}>ACCEPT THE ANSWER</button>
                <button className="machine-button machine-button--protocol" type="button" onClick={rejectLatestDecision} disabled={!canTryAgain}>TRY ANOTHER PROTOCOL</button>
              </section>
            </MachineLcd>
          </section>
        )}

        {currentScreen === 'barry-takeover' && decision?.lockdown && (
          <section className="lockdown-machine-content lockdown-machine-content--takeover" aria-label="Barry takeover lockdown">
            <BarryWindow>
              <p>OPERATOR WINDOW</p>
              <p>Barry has become too committed. Containment procedures are no longer theoretical.</p>
            </BarryWindow>

            <MachineLcd>
              <div className="lcd-content__header lockdown-machine-content__header">
                <p className="lcd-content__eyebrow machine-home__lcd-label">Main LCD Display</p>
                <h2 className="lcd-content__title">BARRY HAS TAKEN CONTROL</h2>
                <p>Barry has become too committed. Barry made the final decision.</p>
              </div>

              <section className="lcd-content__readout lockdown-machine-content__decision" aria-label="Final decision">
                <p>Final decision</p>
                <p className="lockdown-machine-content__answer">{decision.lockdown.finalAnswer}</p>
                {decision.lockdown.finalMachineQuote && <p>{decision.lockdown.finalMachineQuote}</p>}
              </section>

              <section className="lcd-content__readout lockdown-machine-content__timer" aria-label="Lockdown timer">
                <p>DECISION LOCKED</p>
                <p>LOCKDOWN REMAINING</p>
                <p className="lockdown-machine-content__countdown">{formatCountdown(lockdownRemainingMs)}</p>
                <p>Barry is recovering.</p>
                <p>{getLockdownMessage(decision, now)}</p>
              </section>

              <section className="lcd-content__actions lockdown-machine-content__actions" aria-label="Lockdown actions">
                <button className="machine-button machine-button--primary" type="button" onClick={() => openShareResult(decision)}>SHARE YOUR OVERTHINK</button>
                <button className="machine-button machine-button--secondary" type="button" onClick={() => setCurrentScreen('previous-overthinks')}>PREVIOUS OVERTHINKS</button>
              </section>
            </MachineLcd>
          </section>
        )}

        {currentScreen === 'lockdown' && decision?.lockdown && (
          <section className="lockdown-machine-content" aria-label="Barry recovery lockdown">
            <BarryWindow>
              <p>OPERATOR WINDOW</p>
              <p>Barry has become too committed. Containment procedures are no longer theoretical.</p>
            </BarryWindow>

            <MachineLcd>
              <div className="lcd-content__header lockdown-machine-content__header">
                <p className="lcd-content__eyebrow machine-home__lcd-label">Main LCD Display</p>
                <h2 className="lcd-content__title">BARRY IS RECOVERING</h2>
                <p>Barry has become too committed. Barry made the final decision.</p>
              </div>

              <section className="lcd-content__readout lockdown-machine-content__decision" aria-label="Final decision">
                <p>Final decision</p>
                <p className="lockdown-machine-content__answer">{decision.lockdown.finalAnswer}</p>
                {decision.lockdown.finalMachineQuote && <p>{decision.lockdown.finalMachineQuote}</p>}
              </section>

              <section className="lcd-content__readout lockdown-machine-content__timer" aria-label="Lockdown timer">
                <p>DECISION LOCKED</p>
                <p>LOCKDOWN REMAINING</p>
                <p className="lockdown-machine-content__countdown">{formatCountdown(lockdownRemainingMs)}</p>
                <p>No new overthinks until Barry recovers.</p>
                <p>{getLockdownMessage(decision, now)}</p>
              </section>

              <section className="lcd-content__actions lockdown-machine-content__actions" aria-label="Lockdown actions">
                {decision.lockdown.finalAnswer && <button className="machine-button machine-button--primary" type="button" onClick={() => openShareResult(decision)}>SHARE YOUR OVERTHINK</button>}
                <button className="machine-button machine-button--secondary" type="button" onClick={() => setCurrentScreen('previous-overthinks')}>PREVIOUS OVERTHINKS</button>
                {lockdownRemainingMs <= 0 && <button className="machine-button machine-button--success" type="button" onClick={goHome}>MACHINE</button>}
              </section>
            </MachineLcd>
          </section>
        )}

        {currentScreen === 'previous-overthinks' && (
          <section className="support-master-blueprint" aria-label="Previous Overthinks">
            <div className="support-master-blueprint__header">
              <h2>PREVIOUS OVERTHINKS</h2>
              <p>Past decisions Barry has already over-processed.</p>
            </div>
            <div className="support-master-blueprint__content">
              {appState.previousDecisions.length === 0 ? <p>No previous overthinks yet.</p> : (
                <div className="support-master-blueprint__list">
                  {appState.previousDecisions.map((previous) => {
                    const summary = formatPreviousOverthinkSummary(previous);
                    return (
                      <article className="support-master-blueprint__item" key={previous.id}>
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
                </div>
              )}
            </div>
            <div className="support-master-blueprint__actions">
              <button type="button" onClick={() => setCurrentScreen('home')}>MACHINE</button>
            </div>
          </section>
        )}

        {currentScreen === 'share-result' && shareData && (
          <section className="receipt-machine-content" aria-label="Share your overthink receipt">
            <BarryWindow>
              <p>OPERATOR WINDOW</p>
              <p>Barry printed a receipt because apparently this needed documentation.</p>
            </BarryWindow>

            <MachineLcd>
              <div className="lcd-content__header receipt-machine-content__header">
                <p className="lcd-content__eyebrow machine-home__lcd-label">Main LCD Display</p>
                <h2 className="lcd-content__title">SHARE YOUR OVERTHINK</h2>
                <p>Print a cursed arcade receipt for this overthink.</p>
              </div>

              <div className="receipt-machine-content__card" ref={(element: HTMLDivElement | null) => { shareCardElement = element; }}>
                <ShareResultCard data={shareData} />
              </div>

              <section className="lcd-content__actions receipt-machine-content__actions" aria-label="Receipt actions">
                {canDownloadShareImage ? (
                  <button className="machine-button machine-button--primary" type="button" onClick={downloadShareImage}>DOWNLOAD RECEIPT</button>
                ) : (
                  <p>{shareFallbackMessage}</p>
                )}
                <p>Receipt fallback: {shareFallbackMessage}.</p>
                <button className="machine-button machine-button--secondary" type="button" onClick={() => setCurrentScreen('previous-overthinks')}>BACK TO PREVIOUS OVERTHINKS</button>
                {!activeLockdown && <button className="machine-button machine-button--success" type="button" onClick={goHome}>NEW OVERTHINK</button>}
                {!activeLockdown && <button className="machine-button machine-button--secondary" type="button" onClick={goHome}>MACHINE</button>}
              </section>
            </MachineLcd>
          </section>
        )}

        {currentScreen === 'about-machine' && (
          <section className="support-master-blueprint" aria-label="About The Machine">
            <div className="support-master-blueprint__header">
              <h2>ABOUT THE MACHINE</h2>
              <p>Questionable lore from the support panel.</p>
            </div>
            <div className="support-master-blueprint__content">
              <p>The OVERTHINK-O-MATIC 5000 was discovered behind an arcade in 1987.</p>
              <p>Inside was Barry.</p>
              <p>Nobody knows how long he had been there.</p>
              <p>Nobody has successfully counted the number of energy drinks consumed.</p>
              <p>The machine is powered by a questionable blend of pocket change, panic, static electricity, and one extremely confident honey badger.</p>
              <p>Scientific accuracy: somewhere between a fortune cookie and a very confident pigeon.</p>
              <p>Independent testing shows the machine is approximately 14% more accurate than Facebook, 22% more accurate than asking the group chat, and 37% more accurate than changing your mind six times.</p>
              <p>Warning: results may be wildly unqualified but strangely useful.</p>
            </div>
            <div className="support-master-blueprint__actions">
              <button type="button" onClick={() => setCurrentScreen(appState.user ? 'home' : 'setup')}>MACHINE</button>
            </div>
          </section>
        )}
      </MachineShell>
    </main>
  );
}

export default App;
