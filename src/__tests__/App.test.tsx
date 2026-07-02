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
  const found = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === label || candidate.textContent?.startsWith(label) || candidate.getAttribute('aria-label') === label || candidate.getAttribute('aria-label')?.startsWith(label));
  if (!found) throw new Error(`Button not found: ${label}`);
  return found;
}

async function clickButton(container: HTMLElement, label: string) {
  await act(async () => {
    button(container, label).dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}


async function waitForThinkingToFinish() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 700));
  });
}

async function runCoinTossProtocol(container: HTMLElement) {
  await clickButton(container, 'Run Coin Toss protocol');
  expect(container.textContent).toContain('BARRY IS THINKING');
  await waitForThinkingToFinish();
}

async function changeField(container: HTMLElement, label: string, value: string) {
  const labels = Array.from(container.querySelectorAll('label'));
  const found = labels.find((candidate) => candidate.textContent?.startsWith(label));
  const field = (found?.querySelector('input, textarea') ?? container.querySelector(`input[aria-label^="${label}"], textarea[aria-label^="${label}"]`)) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!field) throw new Error(`Field not found: ${label}`);
  await act(async () => {
    const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    valueSetter?.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function setupUser(container: HTMLElement, realityCheckerName = 'Sam') {
  await changeField(container, 'User name', 'Alex');
  await changeField(container, 'Optional reality checker name', realityCheckerName);
  await clickButton(container, 'Save setup');
}

async function enterProblem(container: HTMLElement) {
  await changeField(container, 'State your overthink', 'Pick dinner');
  await clickButton(container, 'INSERT INTO MACHINE');
}

async function lockTwoOptions(container: HTMLElement) {
  await changeField(container, 'Option 1', 'Pizza');
  await changeField(container, 'Option 2', 'Tacos');
  await clickButton(container, 'LOCK IN OPTIONS');
}

describe('P6 text user journey', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { document.body.innerHTML = ''; localStorage.clear(); });

  it('admin controls are hidden for normal reality checker', async () => {
    const { container, root } = await renderApp();
    await setupUser(container, 'Sam');
    expect(container.textContent).not.toContain('Admin Test Controls');
    expect(container.textContent).not.toContain('ADMIN');
    act(() => root.unmount());
  });

  it('admin button only appears for adminjohn and opens admin controls', async () => {
    const { container, root } = await renderApp();
    await setupUser(container, ' Admin John ');
    expect(container.textContent).toContain('ADMIN');
    expect(container.textContent).not.toContain('Clear active decision / lockdown');
    await clickButton(container, 'ADMIN');
    expect(container.querySelector('[aria-label="Admin Test Controls"]')).not.toBe(null);
    expect(container.textContent).toContain('Clear active decision / lockdown');
    expect(container.textContent).toContain('Admin QA Runner');
    act(() => root.unmount());
  });

  it('admin clear active decision removes lockdown and returns home', async () => {
    const decision = createLockedDecision('Pick dinner', [createDecisionOption('Option', 'Pizza'), createDecisionOption('Option', 'Tacos')]);
    decision.status = DecisionStatus.Lockdown;
    decision.lockdown = { startedAt: new Date().toISOString(), endsAt: new Date(Date.now() + 300000).toISOString(), finalOptionId: decision.options[0].id, finalAnswer: 'Pizza', rotatingMessageIndex: 0 };
    localStorage.setItem('overthink-o-matic:user-profile', JSON.stringify(createUserSetup('Alex', 'adminjohn')));
    localStorage.setItem('overthink-o-matic:current-decision', JSON.stringify(decision));

    const { container, root } = await renderApp();
    expect(container.textContent).toContain('DECISION LOCKED');
    await clickButton(container, 'ADMIN');
    await clickButton(container, 'Clear active decision / lockdown');

    expect(localStorage.getItem('overthink-o-matic:current-decision')).toBe(null);
    expect(container.textContent).toContain('STATE YOUR OVERTHINK');
    expect(container.textContent).not.toContain('DECISION LOCKED');
    act(() => root.unmount());
  });

  it('admin clear all resets setup history and active decision', async () => {
    const decision = createLockedDecision('Pick dinner', [createDecisionOption('Option', 'Pizza'), createDecisionOption('Option', 'Tacos')]);
    const previous = createLockedDecision('Old dinner', [createDecisionOption('Option', 'Soup'), createDecisionOption('Option', 'Salad')]);
    localStorage.setItem('overthink-o-matic:user-profile', JSON.stringify(createUserSetup('Alex', 'adminjohn')));
    localStorage.setItem('overthink-o-matic:current-decision', JSON.stringify(decision));
    localStorage.setItem('overthink-o-matic:previous-decisions', JSON.stringify([previous]));

    const { container, root } = await renderApp();
    await clickButton(container, 'ADMIN');
    await clickButton(container, 'Clear all local app data');

    expect(localStorage.getItem('overthink-o-matic:user-profile')).toBe(null);
    expect(localStorage.getItem('overthink-o-matic:current-decision')).toBe(null);
    expect(localStorage.getItem('overthink-o-matic:previous-decisions')).toBe(null);
    expect(container.textContent).toContain('Setup');
    expect(container.textContent).not.toContain('Admin Test Controls');
    act(() => root.unmount());
  });

  it('setup flow saves user', async () => {
    const { container, root } = await renderApp();
    expect(container.textContent).toContain('Setup');
    await setupUser(container);
    expect(container.textContent).toContain('STATE YOUR OVERTHINK');
    expect(JSON.parse(localStorage.getItem('overthink-o-matic:user-profile') ?? '{}').name).toBe('Alex');
    act(() => root.unmount());
  });

  it('home validates problem', async () => {
    const { container, root } = await renderApp();
    await setupUser(container);
    await clickButton(container, 'INSERT INTO MACHINE');
    expect(container.textContent).toContain('Please enter something to overthink.');
    act(() => root.unmount());
  });

  it('options require at least 2 non-empty values', async () => {
    const { container, root } = await renderApp();
    await setupUser(container);
    await enterProblem(container);
    await changeField(container, 'Option 1', 'Pizza');
    await clickButton(container, 'LOCK IN OPTIONS');
    expect(container.textContent).toContain('Please enter at least 2 options.');
    act(() => root.unmount());
  });

  it('adding/removing options works', async () => {
    const { container, root } = await renderApp();
    await setupUser(container);
    await enterProblem(container);
    await clickButton(container, 'ADD ANOTHER OPTION');
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
    expect(container.textContent).toContain('CHOOSE YOUR PROTOCOL');
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
    await clickButton(second.container, 'ADD ANOTHER OPTION');
    await changeField(second.container, 'Option 1', 'Pizza');
    await changeField(second.container, 'Option 2', 'Tacos');
    await changeField(second.container, 'Option 3', 'Soup');
    await clickButton(second.container, 'LOCK IN OPTIONS');
    expect(second.container.textContent).toContain('Wheel of Fate');
    act(() => second.root.unmount());
  });

  it('running a game shows result and try another game decrements credits through attempts', async () => {
    const { container, root } = await renderApp();
    await setupUser(container);
    await enterProblem(container);
    await lockTwoOptions(container);
    await runCoinTossProtocol(container);
    expect(container.textContent).toContain('THE MACHINE SAYS...');
    expect(container.textContent).toContain('BARRY COMMITMENT INDEX: 4');
    await clickButton(container, 'TRY ANOTHER PROTOCOL');
    await runCoinTossProtocol(container);
    expect(container.textContent).toContain('BARRY COMMITMENT INDEX: 3');
    act(() => root.unmount());
  });

  it('accepting decision opens receipt, saves history, shows final decision, and allows a new overthink', async () => {
    const { container, root } = await renderApp();
    await setupUser(container);
    await enterProblem(container);
    await lockTwoOptions(container);
    await runCoinTossProtocol(container);
    const finalAnswer = container.querySelector('.result-answer')?.textContent ?? '';
    await clickButton(container, 'ACCEPT THE ANSWER');
    const history = JSON.parse(localStorage.getItem('overthink-o-matic:previous-decisions') ?? '[]') as DecisionRecord[];
    expect(history).toHaveLength(1);
    expect(container.textContent).toContain('SHARE YOUR OVERTHINK');
    expect(container.textContent).toContain('Cursed Arcade Receipt');
    expect(container.textContent).toContain(finalAnswer);
    await clickButton(container, 'NEW OVERTHINK');
    expect(container.textContent).toContain('STATE YOUR OVERTHINK');
    act(() => root.unmount());
  });

  it('lockdown screen blocks reroll', async () => {
    const decision = createLockedDecision('Pick dinner', [createDecisionOption('Option', 'Pizza'), createDecisionOption('Option', 'Tacos')]);
    decision.status = DecisionStatus.Lockdown;
    decision.lockdown = { startedAt: new Date().toISOString(), endsAt: new Date(Date.now() + 300000).toISOString(), finalOptionId: decision.options[0].id, finalAnswer: 'Pizza', rotatingMessageIndex: 0 };
    localStorage.setItem('overthink-o-matic:user-profile', JSON.stringify(createUserSetup('Alex')));
    localStorage.setItem('overthink-o-matic:current-decision', JSON.stringify(decision));
    const { container, root } = await renderApp();
    expect(container.textContent).toContain('BARRY IS RECOVERING');
    expect(container.textContent).toContain('Final decision');
    expect(container.querySelector('.lockdown-machine-content')).not.toBe(null);
    expect(container.textContent).not.toContain('TRY ANOTHER PROTOCOL');
    expect(container.textContent).not.toContain('New Overthink');
    act(() => root.unmount());
  });




  it('about machine can be opened during lockdown while machine remains blocked', async () => {
    const decision = createLockedDecision('Pick dinner', [createDecisionOption('Option', 'Pizza'), createDecisionOption('Option', 'Tacos')]);
    decision.status = DecisionStatus.Lockdown;
    decision.lockdown = { startedAt: new Date().toISOString(), endsAt: new Date(Date.now() + 300000).toISOString(), finalOptionId: decision.options[0].id, finalAnswer: 'Pizza', rotatingMessageIndex: 0 };
    localStorage.setItem('overthink-o-matic:user-profile', JSON.stringify(createUserSetup('Alex')));
    localStorage.setItem('overthink-o-matic:current-decision', JSON.stringify(decision));
    const { container, root } = await renderApp();

    await clickButton(container, 'ABOUT THE MACHINE');
    expect(container.textContent).toContain('The OVERTHINK-O-MATIC 5000 was discovered behind an arcade in 1987.');
    await clickButton(container, 'MACHINE');
    expect(container.textContent).toContain('DECISION LOCKED');
    expect(container.textContent).not.toContain('STATE YOUR OVERTHINK');
    act(() => root.unmount());
  });

  it('admin controls are accessible from admin deck during lockdown for admin mode', async () => {
    const decision = createLockedDecision('Pick dinner', [createDecisionOption('Option', 'Pizza'), createDecisionOption('Option', 'Tacos')]);
    decision.status = DecisionStatus.Lockdown;
    decision.lockdown = { startedAt: new Date().toISOString(), endsAt: new Date(Date.now() + 300000).toISOString(), finalOptionId: decision.options[0].id, finalAnswer: 'Pizza', rotatingMessageIndex: 0 };
    localStorage.setItem('overthink-o-matic:user-profile', JSON.stringify(createUserSetup('Alex', 'adminjohn')));
    localStorage.setItem('overthink-o-matic:current-decision', JSON.stringify(decision));
    const { container, root } = await renderApp();

    await clickButton(container, 'ADMIN');
    expect(container.textContent).toContain('Clear active decision / lockdown');
    expect(container.textContent).toContain('Admin QA Runner');
    act(() => root.unmount());
  });

  it('protocol modules keep run buttons and accessible labels after compacting', async () => {
    const { container, root } = await renderApp();
    await setupUser(container);
    await enterProblem(container);
    await lockTwoOptions(container);

    expect(button(container, 'Run Coin Toss protocol').getAttribute('disabled')).toBe(null);
    expect(container.textContent).toContain('Coin Toss');
    expect(container.textContent).not.toContain('A tiny binary oracle with pocket change energy.');
    expect(container.textContent).not.toContain('Module eligible and loaded.');
    await clickButton(container, 'Show Coin Toss protocol details');
    expect(container.textContent).toContain('A tiny binary oracle with pocket change energy.');
    expect(container.textContent).toContain('Module eligible and loaded.');
    await clickButton(container, 'Hide Coin Toss protocol details');
    expect(container.textContent).not.toContain('A tiny binary oracle with pocket change energy.');
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
    await clickButton(container, 'LOCK IN OPTIONS');

    expect(container.textContent).toContain('Hmm. This feels familiar.');
    expect(container.textContent).toContain('The last decision landed on: Soup.');
    expect(button(container, 'Run Coin Toss protocol')).not.toBe(null);
    await runCoinTossProtocol(container);
    expect(container.textContent).toContain('THE MACHINE SAYS...');
    act(() => root.unmount());
  });

  it('accepted decision is not duplicated in history after navigation', async () => {
    const { container, root } = await renderApp();
    await setupUser(container);
    await enterProblem(container);
    await lockTwoOptions(container);
    await runCoinTossProtocol(container);
    await clickButton(container, 'ACCEPT THE ANSWER');

    const history = JSON.parse(localStorage.getItem('overthink-o-matic:previous-decisions') ?? '[]') as DecisionRecord[];
    expect(history).toHaveLength(1);
    act(() => root.unmount());
  });



  it('5th completed game attempt automatically shows DECISION LOCKED and saves history once', async () => {
    const { container, root } = await renderApp();
    await setupUser(container);
    await enterProblem(container);
    await lockTwoOptions(container);

    for (let index = 0; index < 4; index += 1) {
      await runCoinTossProtocol(container);
      await clickButton(container, 'TRY ANOTHER PROTOCOL');
    }
    await runCoinTossProtocol(container);

    expect(container.textContent).toContain('BARRY HAS TAKEN CONTROL');
    expect(container.textContent).toContain('Barry has become too committed. Barry made the final decision.');
    expect(container.querySelector('.lockdown-machine-content--takeover')).not.toBe(null);
    expect(container.textContent).toContain('DECISION LOCKED');
    expect(container.textContent).toContain('LOCKDOWN REMAINING');
    expect(container.textContent).toContain('Barry is recovering.');
    expect(container.textContent).toContain('SHARE YOUR OVERTHINK');
    expect(container.textContent).toContain('PREVIOUS OVERTHINKS');
    expect(container.textContent).not.toContain('ENTER LOCKDOWN');
    expect(container.textContent).not.toContain('START LOCKDOWN');
    expect(container.textContent).not.toContain('BEGIN LOCKDOWN');
    expect(container.textContent).not.toContain('TRY ANOTHER PROTOCOL');
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

  it('hydrates active lockdown back to DECISION LOCKED', async () => {
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

    expect(container.textContent).toContain('DECISION LOCKED');
    expect(container.textContent).toContain('Pizza');
    expect(container.textContent).not.toContain('CHOOSE YOUR PROTOCOL');
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
    expect(container.textContent).toContain('STATE YOUR OVERTHINK');
    expect(container.textContent).not.toContain('DECISION LOCKED');

    await enterProblem(container);
    expect(container.textContent).toContain('OPTIONS DETECTED');
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
    await clickButton(container, 'PREVIOUS OVERTHINKS');
    expect(container.textContent).toContain('Pick dinner');
    expect(container.textContent).toContain('Pizza');
    expect(container.textContent).toContain('Options: Pizza, Tacos');
    expect(container.textContent).toContain('Barry Commitment Index: 1');
    act(() => root.unmount());
  });

  it('about machine renders static lore from home navigation', async () => {
    const { container, root } = await renderApp();
    await setupUser(container);
    await clickButton(container, 'ABOUT THE MACHINE');
    expect(container.textContent).toContain('The OVERTHINK-O-MATIC 5000 was discovered behind an arcade in 1987.');
    expect(container.textContent).toContain('Inside was Barry.');
    expect(container.textContent).toContain('very confident pigeon');
    act(() => root.unmount());
  });

});
