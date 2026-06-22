import { useMemo, useState } from 'react';
import { createDecisionOption, createLockedDecision } from './domain/helpers';
import { AppState, GameId, GameResult } from './domain/model';
import { acceptDecisionResult, getCreditsRemaining, getEscalationMessage, getLockdownMessage } from './services/overthinkingEngine';
import { getEligibleGames, runGame } from './services/gameRunner';
import './styles/base.css';

export const screens = [
  'setup',
  'home',
  'options',
  'game-selection',
  'game-play',
  'result',
  'lockdown',
  'previous-overthinks',
  'share-result',
] as const;

export type AppScreen = (typeof screens)[number];

const screenLabels: Record<AppScreen, string> = {
  setup: 'Setup screen',
  home: 'Home / New Overthink screen',
  options: 'Options screen',
  'game-selection': 'Game Selection screen',
  'game-play': 'Game Play screen',
  result: 'Result screen',
  lockdown: 'Lockdown screen',
  'previous-overthinks': 'Previous Overthinks screen',
  'share-result': 'Share Result screen',
};

function getNextScreen(currentScreen: AppScreen): AppScreen {
  const currentIndex = screens.indexOf(currentScreen);
  return screens[Math.min(currentIndex + 1, screens.length - 1)];
}

function getPreviousScreen(currentScreen: AppScreen): AppScreen {
  const currentIndex = screens.indexOf(currentScreen);
  return screens[Math.max(currentIndex - 1, 0)];
}

export function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('setup');
  const [latestResult, setLatestResult] = useState<GameResult | undefined>(undefined);
  const [demoState, setDemoState] = useState<AppState>({
    user: { id: 'demo_user', name: 'Demo Human', realityCheckerName: 'Sam', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    previousDecisions: [],
    currentDecision: createLockedDecision('P5 placeholder decision', [
      createDecisionOption('A', 'Option A'),
      createDecisionOption('B', 'Option B'),
      createDecisionOption('C', 'Option C'),
    ]),
  });

  const nextScreen = useMemo(() => getNextScreen(currentScreen), [currentScreen]);
  const previousScreen = useMemo(() => getPreviousScreen(currentScreen), [currentScreen]);
  const demoDecision = demoState.currentDecision;
  const creditsRemaining = demoDecision ? getCreditsRemaining(demoDecision) : 0;
  const overthinkingMessage = demoDecision ? getEscalationMessage(demoDecision) : 'No overthink currently loaded.';
  const lockdownMessage = demoDecision ? getLockdownMessage(demoDecision, new Date()) : '';
  const eligibleGames = demoDecision ? getEligibleGames(demoDecision) : [];
  const latestGame = latestResult ? eligibleGames.find((game) => game.id === latestResult.gameId) : undefined;

  function runSelectedGame(gameId: GameId) {
    const outcome = runGame(demoState, gameId, new Date());
    setDemoState(outcome.state);
    setLatestResult(outcome.result);
    setCurrentScreen(outcome.suddenDeathTriggered ? 'lockdown' : 'result');
  }

  function acceptLatestDecision() {
    if (!latestResult) {
      return;
    }
    setDemoState(acceptDecisionResult(demoState, latestResult.selectedOption, new Date()));
    setCurrentScreen('lockdown');
  }

  return (
    <main className="app-shell" aria-labelledby="app-title">
      <section className="screen-card">
        <p className="eyebrow">Let&apos;s Underthink This</p>
        <h1 id="app-title">OVERTHINK-O-MATIC</h1>
        <p className="screen-name">Current screen: {screenLabels[currentScreen]}</p>
        <p className="placeholder-copy">Text-only P5 game logic hookup. No visual polish. No share card rendering. Everybody breathe normally.</p>

        {(currentScreen === 'game-selection' || currentScreen === 'game-play') && (
          <section aria-label="Eligible games">
            <h2>Pick a game</h2>
            {eligibleGames.map((game) => (
              <article key={game.id}>
                <h3>{game.name}</h3>
                <p>{game.description}</p>
                <button type="button" onClick={() => runSelectedGame(game.id)} disabled={creditsRemaining === 0 || Boolean(demoDecision?.lockdown)}>
                  Run {game.name}
                </button>
              </article>
            ))}
          </section>
        )}

        {currentScreen === 'result' && latestResult && (
          <section aria-label="Game result">
            <h2>{latestGame?.name ?? latestResult.gameId}</h2>
            <p>Selected option: {latestResult.selectedOption}</p>
            <p>{latestResult.machineQuote}</p>
            <p>Credits remaining: {creditsRemaining}</p>
            <p>{overthinkingMessage}</p>
            <button type="button" onClick={acceptLatestDecision}>Accept Decision</button>
            <button type="button" onClick={() => setCurrentScreen('game-selection')} disabled={creditsRemaining === 0 || Boolean(demoDecision?.lockdown)}>
              Try Another Game
            </button>
          </section>
        )}

        {currentScreen === 'lockdown' && (
          <section aria-label="Lockdown status">
            <p>Credits remaining: {creditsRemaining}</p>
            <p>{overthinkingMessage}</p>
            <p>{lockdownMessage}</p>
          </section>
        )}

        <nav className="screen-actions" aria-label="Placeholder navigation">
          <button type="button" onClick={() => setCurrentScreen(previousScreen)} disabled={currentScreen === screens[0]}>
            Back
          </button>
          <button type="button" onClick={() => setCurrentScreen('home')}>
            New Overthink
          </button>
          <button type="button" onClick={() => setCurrentScreen(nextScreen)} disabled={currentScreen === screens[screens.length - 1]}>
            Forward
          </button>
        </nav>

        <div className="screen-jump-list" aria-label="All placeholder screens">
          {screens.map((screen) => (
            <button type="button" key={screen} onClick={() => setCurrentScreen(screen)} aria-current={screen === currentScreen ? 'page' : undefined}>
              {screenLabels[screen]}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
