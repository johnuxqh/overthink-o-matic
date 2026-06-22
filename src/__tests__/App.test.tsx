import { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App';
import { createDecisionOption, createLockedDecision, createUserSetup } from '../domain/helpers';
import { DecisionRecord, DecisionStatus } from '../domain/model';

async function renderApp() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<App />);
  });

  await act(async () => {
    await Promise.resolve();
  });

  return { container, root };
}

function button(container: HTMLElement, label: string) {
  const found = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === label || candidate.textContent?.startsWith(label));
  if (!found) throw new Error(`Button not found: ${label}`);
  return found;
}

async function clickButton(container: HTMLElement, label: string) {
  await act(async () => {
    button(container, label).dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

async function changeField(container: HTMLElement, label: string, value: string) {
  const labels = Array.from(container.querySelectorAll('label'));
  const found = labels.find((candidate) => candidate.textContent?.startsWith(label));
  const field = found?.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement | null;
  if (!field) throw new Error(`Field not found: ${label}`);
  await act(async () => {
    const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    valueSetter?.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function setupUser(container: HTMLElement) {
  await changeField(container, 'User name', 'Alex');
  await changeField(container, 'Optional reality checker name', 'Sam');
  await clickButton(container, 'Save setup');
}

async function enterProblem(container: HTMLElement) {
  await changeField(container, 'Problem or decision', 'Pick dinner');
  await clickButton(container, 'Next');
}

async function lockTwoOptions(container: HTMLElement) {
  await changeField(container, 'Option 1', 'Pizza');
  await changeField(container, 'Option 2', 'Tacos');
  await clickButton(container, 'Lock it in');
}

describe('P6 text user journey', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { document.body.innerHTML = ''; localStorage.clear(); });

  it('setup flow saves user', async () => {
    const { container, root } = await renderApp();
    expect(container.textContent).toContain('Setup');
    await setupUser(container);
    expect(container.textContent).toContain('Hi Alex, what are we overthinking today?');
    expect(JSON.parse(localStorage.getItem('overthink-o-matic:user-profile') ?? '{}').name).toBe('Alex');
    act(() => root.unmount());
  });

  it('home validates problem', async () => {
    const { container, root } = await renderApp();
    await setupUser(container);
    await clickButton(container, 'Next');
    expect(container.textContent).toContain('Please enter something to overthink.');
    act(() => root.unmount());
  });

  it('options require at least 2 non-empty values', async () => {
    const { container, root } = await renderApp();
    await setupUser(container);
    await enterProblem(container);
    await changeField(container, 'Option 1', 'Pizza');
    await clickButton(container, 'Lock it in');
    expect(container.textContent).toContain('Please enter at least 2 options.');
    act(() => root.unmount());
  });

  it('adding/removing options works', async () => {
    const { container, root } = await renderApp();
    await setupUser(container);
    await enterProblem(container);
    await clickButton(container, 'Add another option');
    expect(container.textContent).toContain('Option 3');
    await clickButton(container, 'Remove');
    expect(container.textContent).not.toContain('Option 3');
    act(() => root.unmount());
  });

  it('locking decision creates active locked decision', async () => {
    const { container, root } = await renderApp();
    await setupUser(container);
    await enterProblem(container);
    await lockTwoOptions(container);
    const decision = JSON.parse(localStorage.getItem('overthink-o-matic:current-decision') ?? '{}') as DecisionRecord;
    expect(decision.status).toBe(DecisionStatus.Locked);
    expect(container.textContent).toContain('Choose a game');
    act(() => root.unmount());
  });

  it('eligible games shown based on 2 vs 3+ options', async () => {
    const { container, root } = await renderApp();
    await setupUser(container);
    await enterProblem(container);
    await lockTwoOptions(container);
    expect(container.textContent).toContain('Coin Toss');
    expect(container.textContent).not.toContain('Wheel of Fate');
    act(() => root.unmount());

    document.body.innerHTML = '';
    localStorage.clear();
    const second = await renderApp();
    await setupUser(second.container);
    await enterProblem(second.container);
    await clickButton(second.container, 'Add another option');
    await changeField(second.container, 'Option 1', 'Pizza');
    await changeField(second.container, 'Option 2', 'Tacos');
    await changeField(second.container, 'Option 3', 'Soup');
    await clickButton(second.container, 'Lock it in');
    expect(second.container.textContent).toContain('Wheel of Fate');
    act(() => second.root.unmount());
  });

  it('running a game shows result and try another game decrements credits through attempts', async () => {
    const { container, root } = await renderApp();
    await setupUser(container);
    await enterProblem(container);
    await lockTwoOptions(container);
    await clickButton(container, 'Select Coin Toss');
    expect(container.textContent).toContain('Selected answer:');
    expect(container.textContent).toContain('Credits remaining: 4');
    await clickButton(container, 'Try Another Game');
    await clickButton(container, 'Select Coin Toss');
    expect(container.textContent).toContain('Credits remaining: 3');
    act(() => root.unmount());
  });

  it('accepting decision adds it to history', async () => {
    const { container, root } = await renderApp();
    await setupUser(container);
    await enterProblem(container);
    await lockTwoOptions(container);
    await clickButton(container, 'Select Coin Toss');
    await clickButton(container, 'Accept Decision');
    const history = JSON.parse(localStorage.getItem('overthink-o-matic:previous-decisions') ?? '[]') as DecisionRecord[];
    expect(history).toHaveLength(1);
    expect(container.textContent).toContain('Lockdown');
    act(() => root.unmount());
  });

  it('lockdown screen blocks reroll', async () => {
    const decision = createLockedDecision('Pick dinner', [createDecisionOption('Option', 'Pizza'), createDecisionOption('Option', 'Tacos')]);
    decision.status = DecisionStatus.Lockdown;
    decision.lockdown = { startedAt: new Date().toISOString(), endsAt: new Date(Date.now() + 300000).toISOString(), finalOptionId: decision.options[0].id, finalAnswer: 'Pizza', rotatingMessageIndex: 0 };
    localStorage.setItem('overthink-o-matic:user-profile', JSON.stringify(createUserSetup('Alex')));
    localStorage.setItem('overthink-o-matic:current-decision', JSON.stringify(decision));
    const { container, root } = await renderApp();
    expect(container.textContent).toContain('Lockdown');
    expect(container.textContent).not.toContain('Try Another Game');
    expect(container.textContent).not.toContain('New Overthink');
    act(() => root.unmount());
  });


  it('goalpost warning appears after locking a decision with repeated option and does not block game selection', async () => {
    const previous = createLockedDecision('Old dinner', [createDecisionOption('Option', 'Pizza'), createDecisionOption('Option', 'Soup')]);
    previous.finalAnswer = 'Soup';
    previous.lockdown = { startedAt: new Date().toISOString(), endsAt: new Date(Date.now() + 300000).toISOString(), finalOptionId: previous.options[1].id, finalAnswer: 'Soup', rotatingMessageIndex: 0 };
    localStorage.setItem('overthink-o-matic:user-profile', JSON.stringify(createUserSetup('Alex')));
    localStorage.setItem('overthink-o-matic:previous-decisions', JSON.stringify([previous]));

    const { container, root } = await renderApp();
    await enterProblem(container);
    await changeField(container, 'Option 1', '  pizza  ');
    await changeField(container, 'Option 2', 'Tacos');
    await clickButton(container, 'Lock it in');

    expect(container.textContent).toContain('moving the goal posts has been detected');
    expect(container.textContent).toContain('The last decision landed on: Soup.');
    expect(container.textContent).toContain('Select Coin Toss');
    await clickButton(container, 'Select Coin Toss');
    expect(container.textContent).toContain('Selected answer:');
    act(() => root.unmount());
  });

  it('accepted decision is not duplicated in history after navigation', async () => {
    const { container, root } = await renderApp();
    await setupUser(container);
    await enterProblem(container);
    await lockTwoOptions(container);
    await clickButton(container, 'Select Coin Toss');
    await clickButton(container, 'Accept Decision');

    const history = JSON.parse(localStorage.getItem('overthink-o-matic:previous-decisions') ?? '[]') as DecisionRecord[];
    expect(history).toHaveLength(1);
    act(() => root.unmount());
  });



  it('5th completed game attempt automatically shows Decision Locked and saves history once', async () => {
    const { container, root } = await renderApp();
    await setupUser(container);
    await enterProblem(container);
    await lockTwoOptions(container);

    for (let index = 0; index < 4; index += 1) {
      await clickButton(container, 'Select Coin Toss');
      await clickButton(container, 'Try Another Game');
    }
    await clickButton(container, 'Select Coin Toss');

    expect(container.textContent).toContain('Decision Locked');
    expect(container.textContent).toContain('Sudden Death made the call');
    expect(container.textContent).toContain('Countdown:');
    expect(container.textContent).not.toContain('Try Another Game');
    expect(container.textContent).not.toContain('New Overthink');

    const current = JSON.parse(localStorage.getItem('overthink-o-matic:current-decision') ?? '{}') as DecisionRecord;
    const history = JSON.parse(localStorage.getItem('overthink-o-matic:previous-decisions') ?? '[]') as DecisionRecord[];
    expect(current.status).toBe(DecisionStatus.Lockdown);
    expect(Boolean(current.finalAnswer)).toBe(true);
    expect(current.options.map((option) => option.text)).toContain(current.finalAnswer!);
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe(current.id);
    act(() => root.unmount());
  });

  it('hydrates active lockdown back to Decision Locked', async () => {
    const decision = createLockedDecision('Pick dinner', [createDecisionOption('Option', 'Pizza'), createDecisionOption('Option', 'Tacos')]);
    decision.status = DecisionStatus.Lockdown;
    decision.finalAnswer = 'Pizza';
    decision.finalOptionId = decision.options[0].id;
    decision.finalisedAt = new Date().toISOString();
    decision.finalMachineQuote = 'The tiny decision goblin has spoken.';
    decision.lockdown = { startedAt: decision.finalisedAt, endsAt: new Date(Date.now() + 300000).toISOString(), lockdownUntil: new Date(Date.now() + 300000).toISOString(), finalOptionId: decision.options[0].id, finalAnswer: 'Pizza', finalMachineQuote: decision.finalMachineQuote, rotatingMessageIndex: 0 };
    localStorage.setItem('overthink-o-matic:user-profile', JSON.stringify(createUserSetup('Alex')));
    localStorage.setItem('overthink-o-matic:current-decision', JSON.stringify(decision));

    const { container, root } = await renderApp();

    expect(container.textContent).toContain('Decision Locked');
    expect(container.textContent).toContain('Final answer: Pizza');
    expect(container.textContent).not.toContain('Choose a game');
    act(() => root.unmount());
  });

  it('shows New Overthink after hydrated lockdown expires without deleting history', async () => {
    const previous = createLockedDecision('Old dinner', [createDecisionOption('Option', 'Soup'), createDecisionOption('Option', 'Salad')]);
    previous.finalAnswer = 'Soup';
    const decision = createLockedDecision('Pick dinner', [createDecisionOption('Option', 'Pizza'), createDecisionOption('Option', 'Tacos')]);
    decision.status = DecisionStatus.Lockdown;
    decision.finalAnswer = 'Pizza';
    decision.finalOptionId = decision.options[0].id;
    decision.finalisedAt = new Date(Date.now() - 300001).toISOString();
    decision.finalMachineQuote = 'Done means done, gently.';
    decision.lockdown = { startedAt: decision.finalisedAt, endsAt: new Date(Date.now() - 1).toISOString(), lockdownUntil: new Date(Date.now() - 1).toISOString(), finalOptionId: decision.options[0].id, finalAnswer: 'Pizza', finalMachineQuote: decision.finalMachineQuote, rotatingMessageIndex: 0 };
    localStorage.setItem('overthink-o-matic:user-profile', JSON.stringify(createUserSetup('Alex')));
    localStorage.setItem('overthink-o-matic:current-decision', JSON.stringify(decision));
    localStorage.setItem('overthink-o-matic:previous-decisions', JSON.stringify([previous]));

    const { container, root } = await renderApp();
    expect(container.textContent).toContain('Hi Alex');
    expect(container.textContent).not.toContain('Decision Locked');

    await enterProblem(container);
    expect(container.textContent).toContain('What are our options?');
    const history = JSON.parse(localStorage.getItem('overthink-o-matic:previous-decisions') ?? '[]') as DecisionRecord[];
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe(previous.id);
    act(() => root.unmount());
  });

  it('previous overthinks renders stored decisions', async () => {
    const previous = createLockedDecision('Pick dinner', [createDecisionOption('Option', 'Pizza'), createDecisionOption('Option', 'Tacos')]);
    previous.finalAnswer = 'Pizza';
    previous.gamesPlayed = [{ id: 'run_1', gameId: 'coin_toss' as never, selectedOptionId: previous.options[0].id, selectedOptionText: 'Pizza', machineQuote: 'quote', createdAt: new Date().toISOString() }];
    localStorage.setItem('overthink-o-matic:user-profile', JSON.stringify(createUserSetup('Alex')));
    localStorage.setItem('overthink-o-matic:previous-decisions', JSON.stringify([previous]));
    const { container, root } = await renderApp();
    await clickButton(container, 'Previous Overthinks');
    expect(container.textContent).toContain('Pick dinner');
    expect(container.textContent).toContain('Final answer: Pizza');
    expect(container.textContent).toContain('Options: Pizza, Tacos');
    expect(container.textContent).toContain('Attempts used: 1');
    act(() => root.unmount());
  });
});
