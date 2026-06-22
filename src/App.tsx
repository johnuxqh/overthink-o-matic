import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createDecisionOption, createLockedDecision, createUserSetup, detectGoalpostShift, getMostRecentDecision, normaliseDecisionText, validateOptions, validateProblemText } from './domain/helpers';
import { AppState, DecisionRecord, GameId, GameResult } from './domain/model';
import { addDecisionToHistory, createInitialAppState, hydrateAppState, saveAppState } from './state/appState';
import { createLocalStorageService } from './storage/localStorageService';
import { acceptDecisionResult, getCreditsRemaining, getEscalationMessage, getLockdownMessage, getLockdownRemainingMs } from './services/overthinkingEngine';
import { getEligibleGames, runGame } from './services/gameRunner';
import './styles/base.css';

export const screens = ['setup', 'home', 'options', 'game-selection', 'result', 'lockdown', 'previous-overthinks', 'share-result'] as const;
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
  const optionRows = useMemo(() => optionTexts.map((value, index) => ({ id: `option-${index}`, label: `Option ${index + 1}`, value })), [optionTexts]);

  function persist(nextState: AppState) {
    setAppState(nextState);
    void saveAppState(storageService, nextState);
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
    setError('');
    setCurrentScreen('game-selection');
  }

  function updateOption(index: number, value: string) {
    setOptionTexts((current) => current.map((option, optionIndex) => (optionIndex === index ? value : option)));
  }

  function removeOption(index: number) {
    setOptionTexts((current) => (current.length > 2 ? current.filter((_, optionIndex) => optionIndex !== index) : current));
  }

  function runSelectedGame(gameId: GameId) {
    if (activeLockdown) {
      setCurrentScreen('lockdown');
      return;
    }
    const outcome = runGame(appState, gameId, new Date());
    persist(outcome.state);
    setLatestResult(outcome.result);
    setCurrentScreen(outcome.suddenDeathTriggered ? 'lockdown' : 'result');
  }

  function acceptLatestDecision() {
    if (!latestResult) return;
    const lockedDownState = acceptDecisionResult(appState, latestResult.selectedOption, new Date());
    const finalDecision = lockedDownState.currentDecision;
    persist(finalDecision ? addDecisionToHistory(lockedDownState, finalDecision) : lockedDownState);
    setCurrentScreen('lockdown');
  }

  if (!hasHydrated) {
    return <main className="app-shell">Loading the machine...</main>;
  }

  return (
    <main className="app-shell" aria-labelledby="app-title">
      <section className="screen-card">
        <p className="eyebrow">Let&apos;s Underthink This</p>
        <h1 id="app-title">OVERTHINK-O-MATIC</h1>

        {error && <p role="alert">{error}</p>}

        {currentScreen === 'setup' && (
          <form onSubmit={saveSetup}>
            <h2>Setup</h2>
            <label>User name<input value={userName} onChange={(event: Event) => setUserName((event.target as HTMLInputElement).value)} /></label>
            <label>Optional reality checker name<input value={realityCheckerName} onChange={(event: Event) => setRealityCheckerName((event.target as HTMLInputElement).value)} /></label>
            <button type="submit">Save setup</button>
          </form>
        )}

        {currentScreen === 'home' && appState.user && (
          <form onSubmit={submitProblem}>
            <h2>Hi {appState.user.name}, what are we overthinking today?</h2>
            <label>Problem or decision<textarea value={problemText} onChange={(event: Event) => setProblemText((event.target as HTMLTextAreaElement).value)} /></label>
            <button type="submit">Next</button>
            <button type="button" onClick={() => setCurrentScreen('previous-overthinks')}>Previous Overthinks</button>
          </form>
        )}

        {currentScreen === 'options' && (
          <form onSubmit={lockOptions}>
            <h2>What are our options?</h2>
            {optionRows.map((option, index) => (
              <div key={option.id}>
                <label>{option.label}<input value={option.value} onChange={(event: Event) => updateOption(index, (event.target as HTMLInputElement).value)} /></label>
                <button type="button" onClick={() => removeOption(index)} disabled={optionTexts.length <= 2}>Remove</button>
              </div>
            ))}
            <button type="button" onClick={() => setOptionTexts((current) => [...current, ''])}>Add another option</button>
            <button type="submit">Lock it in</button>
          </form>
        )}

        {currentScreen === 'game-selection' && decision && (
          <section>
            <h2>Choose a game</h2>
            {appState.goalpostWarning?.isGoalpostMove && <p>{appState.goalpostWarning.message} The goalposts brought snacks.</p>}
            <p>Decision: {decision.problem}</p>
            <ul>{decision.options.map((option) => <li key={option.id}>{option.text}</li>)}</ul>
            <p>Credits remaining: {creditsRemaining}</p>
            {eligibleGames.map((game) => <article key={game.id}><h3>{game.name}</h3><p>{game.description}</p><button type="button" onClick={() => runSelectedGame(game.id)}>Select {game.name}</button></article>)}
          </section>
        )}

        {currentScreen === 'result' && latestResult && decision && (
          <section>
            <h2>{latestGame?.name ?? latestResult.gameId}</h2>
            <p>Selected answer: {latestResult.selectedOption}</p>
            <p>{latestResult.machineQuote}</p>
            <p>Credits remaining: {creditsRemaining}</p>
            <p>{getEscalationMessage(decision)}</p>
            <button type="button" onClick={acceptLatestDecision}>Accept Decision</button>
            <button type="button" onClick={() => setCurrentScreen('game-selection')} disabled={!canTryAgain}>Try Another Game</button>
          </section>
        )}

        {currentScreen === 'lockdown' && decision?.lockdown && (
          <section>
            <h2>Lockdown</h2>
            <p>Final decision: {decision.lockdown.finalAnswer}</p>
            <p>Countdown: {formatCountdown(lockdownRemainingMs)}</p>
            <p>{getLockdownMessage(decision, now)}</p>
            {lockdownRemainingMs <= 0 && <button type="button" onClick={goHome}>New Overthink</button>}
          </section>
        )}

        {currentScreen === 'previous-overthinks' && (
          <section>
            <h2>Previous Overthinks</h2>
            {appState.previousDecisions.length === 0 ? <p>No previous overthinks yet.</p> : appState.previousDecisions.map((previous) => (
              <article key={previous.id}>
                <h3>{previous.problem}</h3>
                <p>Final answer: {previous.finalAnswer ?? 'Not accepted yet'}</p>
                <p>Attempts used: {previous.gamesPlayed.length}</p>
                <p>Created: {formatDate(previous.createdAt)}</p>
              </article>
            ))}
            <button type="button" onClick={() => setCurrentScreen('home')}>Back to Home</button>
          </section>
        )}

        {currentScreen === 'share-result' && (
          <section><h2>Share Result</h2><p>Share card rendering arrives in P9. Placeholder only.</p></section>
        )}
      </section>
    </main>
  );
}

export default App;
