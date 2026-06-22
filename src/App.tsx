import { useMemo, useState } from 'react';
import { createDecisionOption, createLockedDecision } from './domain/helpers';
import { AppState, GameId, GameRun } from './domain/model';
import { getCreditsRemaining, getEscalationMessage, getLockdownMessage, recordGameAttempt, triggerSuddenDeathIfNeeded } from './services/overthinkingEngine';
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
  const [demoState, setDemoState] = useState<AppState>({
    previousDecisions: [],
    currentDecision: createLockedDecision('P4 placeholder decision', [
      createDecisionOption('A', 'Option A'),
      createDecisionOption('B', 'Option B'),
    ]),
  });

  const nextScreen = useMemo(() => getNextScreen(currentScreen), [currentScreen]);
  const previousScreen = useMemo(() => getPreviousScreen(currentScreen), [currentScreen]);
  const demoDecision = demoState.currentDecision;
  const creditsRemaining = demoDecision ? getCreditsRemaining(demoDecision) : 0;
  const overthinkingMessage = demoDecision ? getEscalationMessage(demoDecision) : 'No overthink currently loaded.';
  const lockdownMessage = demoDecision ? getLockdownMessage(demoDecision, new Date()) : '';

  function recordFakeAttempt() {
    if (!demoDecision) {
      return;
    }

    const now = new Date();
    const selectedOption = demoDecision.options[demoDecision.gamesPlayed.length % demoDecision.options.length];
    const fakeRun: GameRun = {
      id: `fake_run_${demoDecision.gamesPlayed.length + 1}`,
      gameId: GameId.CoinToss,
      selectedOptionId: selectedOption.id,
      selectedOptionText: selectedOption.text,
      machineQuote: 'Placeholder game says this one. Very official.',
      createdAt: now.toISOString(),
    };

    setDemoState(triggerSuddenDeathIfNeeded(recordGameAttempt(demoState, fakeRun), now));
  }

  return (
    <main className="app-shell" aria-labelledby="app-title">
      <section className="screen-card">
        <p className="eyebrow">Let&apos;s Underthink This</p>
        <h1 id="app-title">OVERTHINK-O-MATIC</h1>
        <p className="screen-name">Current screen: {screenLabels[currentScreen]}</p>
        <p className="placeholder-copy">Temporary P4 placeholder only. Game engines, visual polish, animations, and share rendering arrive later.</p>

        {(currentScreen === 'game-play' || currentScreen === 'result' || currentScreen === 'lockdown') && (
          <section aria-label="P4 overthinking status">
            <p>Credits remaining: {creditsRemaining}</p>
            <p>{overthinkingMessage}</p>
            {currentScreen === 'lockdown' && <p>{lockdownMessage}</p>}
            {currentScreen === 'game-play' && (
              <button type="button" onClick={recordFakeAttempt} disabled={creditsRemaining === 0}>
                Record fake attempt
              </button>
            )}
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
            <button
              type="button"
              key={screen}
              onClick={() => setCurrentScreen(screen)}
              aria-current={screen === currentScreen ? 'page' : undefined}
            >
              {screenLabels[screen]}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
