import { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App';
import { createDecisionOption, createLockedDecision, createUserSetup } from '../domain/helpers';
import { DecisionRecord, DecisionStatus, GameId } from '../domain/model';
import { startLockdown } from '../services/overthinkingEngine';
import { buildShareResultData, FALLBACK_MACHINE_QUOTE } from '../share/shareResultBuilder';
import { downloadShareCardImage } from '../share/shareImageExporter';

async function renderApp() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => { root.render(<App />); });
  await act(async () => { await Promise.resolve(); });
  return { container, root };
}

function button(container: HTMLElement, label: string) {
  const found = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === label || candidate.textContent?.startsWith(label));
  if (!found) throw new Error(`Button not found: ${label}`);
  return found;
}

async function clickButton(container: HTMLElement, label: string) {
  await act(async () => { button(container, label).dispatchEvent(new MouseEvent('click', { bubbles: true })); });
}

async function changeField(container: HTMLElement, label: string, value: string) {
  const found = Array.from(container.querySelectorAll('label')).find((candidate) => candidate.textContent?.startsWith(label));
  const field = found?.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement | null;
  if (!field) throw new Error(`Field not found: ${label}`);
  await act(async () => {
    const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function makeAcceptedDecision(container: HTMLElement) {
  await changeField(container, 'User name', 'Alex');
  await clickButton(container, 'Save setup');
  await changeField(container, 'Decision input', 'Pick dinner');
  await clickButton(container, 'INSERT INTO MACHINE');
  await changeField(container, 'Option 1', 'Pizza');
  await changeField(container, 'Option 2', 'Tacos');
  await clickButton(container, 'LOCK IN OPTIONS');
  await clickButton(container, 'Select Coin Toss');
  await clickButton(container, 'ACCEPT THE ANSWER');
}

function lockedDecision(): DecisionRecord {
  return createLockedDecision('Pick dinner', [createDecisionOption('Option', 'Pizza'), createDecisionOption('Option', 'Tacos')]);
}

describe('P9 share result', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { document.body.innerHTML = ''; localStorage.clear(); });

  it('share data includes problem, options, final answer, game, and machine quote fallback', () => {
    const decision = lockedDecision();
    decision.finalAnswer = 'Pizza';
    const data = buildShareResultData(decision);
    expect(data.decisionProblem).toBe('Pick dinner');
    expect(data.options).toEqual(['Pizza', 'Tacos']);
    expect(data.finalAnswer).toBe('Pizza');
    expect(data.selectedGameId).toBe(GameId.SuddenDeath);
    expect(data.machineQuote).toBe(FALLBACK_MACHINE_QUOTE);
  });

  it('share screen renders card after accepted decision', async () => {
    const { container, root } = await renderApp();
    await makeAcceptedDecision(container);
    await clickButton(container, 'Share Result');
    expect(container.textContent).toContain('OVERTHINK-O-MATIC');
    expect(container.textContent).toContain("Mini Arcade Ticket");
    expect(container.textContent).toContain('The Overthink');
    expect(container.textContent).toContain('Pick dinner');
    expect(container.textContent).toContain('The Options');
    expect(container.textContent).toContain('Pizza');
    expect(container.textContent).toContain('Final Decision');
    act(() => root.unmount());
  });

  it('share screen renders card during lockdown if final decision exists', async () => {
    const decision = startLockdown(lockedDecision(), 'Pizza', new Date(), 'Goblin approved.');
    localStorage.setItem('overthink-o-matic:user-profile', JSON.stringify(createUserSetup('Alex')));
    localStorage.setItem('overthink-o-matic:current-decision', JSON.stringify(decision));
    const { container, root } = await renderApp();
    await clickButton(container, 'Share Result');
    expect(container.textContent).toContain('Share Result');
    expect(container.textContent).toContain('Goblin approved.');
    expect(container.textContent).toContain('Decision Locked');
    act(() => root.unmount());
  });

  it('previous overthink share action opens correct card', async () => {
    const first = startLockdown(lockedDecision(), 'Pizza', new Date(), 'Pizza quote.');
    const second = startLockdown(createLockedDecision('Pick movie', [createDecisionOption('Option', 'Alien'), createDecisionOption('Option', 'Clue')]), 'Clue', new Date(), 'Clue quote.');
    localStorage.setItem('overthink-o-matic:user-profile', JSON.stringify(createUserSetup('Alex')));
    localStorage.setItem('overthink-o-matic:previous-decisions', JSON.stringify([second, first]));
    const { container, root } = await renderApp();
    await clickButton(container, 'PREVIOUS OVERTHINKS');
    const articles = Array.from(container.querySelectorAll('article'));
    const dinnerArticle = articles.find((article) => article.textContent?.includes('Pick dinner'));
    await act(async () => { (dinnerArticle?.querySelector('button') as HTMLButtonElement).dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(container.textContent).toContain('Pick dinner');
    expect(container.textContent).toContain('Pizza quote.');
    expect(container.textContent).not.toContain('Pick movie');
    act(() => root.unmount());
  });


  it('share screen shows screenshot fallback when image export is unsupported', async () => {
    const { container, root } = await renderApp();
    await makeAcceptedDecision(container);
    await clickButton(container, 'Share Result');
    expect(container.textContent).toContain('Copy/share fallback: Take a screenshot of this card.');
    act(() => root.unmount());
  });

  it('exporter gracefully handles unsupported browser APIs', async () => {
    const result = await downloadShareCardImage(document.createElement('div'));
    expect(result.downloaded).toBe(false);
    expect(result.fallbackMessage).toBe('Take a screenshot of this card');
  });
});
