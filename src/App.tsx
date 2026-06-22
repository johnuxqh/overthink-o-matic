import { useMemo, useState } from 'react';
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

  const nextScreen = useMemo(() => getNextScreen(currentScreen), [currentScreen]);
  const previousScreen = useMemo(() => getPreviousScreen(currentScreen), [currentScreen]);

  return (
    <main className="app-shell" aria-labelledby="app-title">
      <section className="screen-card">
        <p className="eyebrow">Let&apos;s Underthink This</p>
        <h1 id="app-title">OVERTHINK-O-MATIC</h1>
        <p className="screen-name">Current screen: {screenLabels[currentScreen]}</p>
        <p className="placeholder-copy">
          Temporary P2 placeholder only. Game logic, visual polish, animations, and storage wiring arrive later.
        </p>

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
