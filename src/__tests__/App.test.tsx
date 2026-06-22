import { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App';

function renderApp() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<App />);
  });

  return { container, root };
}

function clickButton(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === label);
  if (!button) {
    throw new Error(`Button not found: ${label}`);
  }

  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('App shell', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the mobile-first placeholder app shell', () => {
    const { container, root } = renderApp();

    expect(container.querySelector('h1')?.textContent).toBe('OVERTHINK-O-MATIC');
    expect(container.textContent).toContain('Current screen: Setup screen');

    act(() => root.unmount());
  });

  it('allows placeholder navigation between screens', () => {
    const { container, root } = renderApp();

    clickButton(container, 'Forward');
    expect(container.textContent).toContain('Current screen: Home / New Overthink screen');

    clickButton(container, 'Game Selection screen');
    expect(container.textContent).toContain('Current screen: Game Selection screen');

    clickButton(container, 'New Overthink');
    expect(container.textContent).toContain('Current screen: Home / New Overthink screen');

    act(() => root.unmount());
  });
});
