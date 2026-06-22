# V1 QA Checklist — OVERTHINK-O-MATIC

Use this checklist before first private sharing/testing with Shelley. Keep the pass/fail notes practical and avoid expanding V1 scope during QA.

## Scope guardrails

- [ ] App remains mobile-first and text-first.
- [ ] No visual polish, animations, extra modes, or new feature drift were added.
- [ ] Copy is playful, cheeky, affectionate, and not harsh.
- [ ] Copy does not frame the app as medical, legal, financial, or life-changing advice.
- [ ] Storage remains browser local storage only.
- [ ] No backend, account system, social API integration, or AI semantic matching exists.

## Full journey QA

- [ ] First-time setup: enter a user name and optional reality checker name, then land on Home.
- [ ] Returning user hydrate: reload and confirm setup is skipped for the saved user.
- [ ] New overthink: enter a low-stakes problem/decision and continue to options.
- [ ] Option creation: fill the two default options and add a third option.
- [ ] Option removal: remove an added option; confirm the app never drops below two option rows.
- [ ] Lock decision: lock valid options and confirm the game selection screen appears.
- [ ] Two-option eligible games: confirm only the two-option-compatible game set appears.
- [ ] Three-plus-option eligible games: confirm multi-option-compatible games appear.
- [ ] Game result: select a game and confirm selected answer, machine quote, and credits remaining are shown.
- [ ] Accept decision: accept the result and confirm lockdown starts.
- [ ] Try another game: run a game, choose Try Another Game, and confirm credits decrement.
- [ ] Fifth attempt triggers Sudden Death: use the fifth credit and confirm automatic Decision Locked / Sudden Death lockdown.
- [ ] Lockdown countdown: confirm countdown displays and no reroll/game action is available.
- [ ] Reload during lockdown: reload and confirm the app returns to Decision Locked.
- [ ] Post-lockdown new overthink: after expiry, confirm New Overthink returns to Home.
- [ ] Previous overthinks: confirm accepted/locked-down decisions appear with summaries.
- [ ] Goalpost warning: repeat a previous option and confirm the warning appears without blocking games.
- [ ] Share result card: open Share Result and confirm problem, options, final answer, quote, and status appear.
- [ ] Share/download fallback: in unsupported browsers, confirm screenshot/copy fallback text appears.

## V1 invariants

- [ ] Exactly 9 selectable games are present.
- [ ] Sudden Death is system-triggered only, not manually selectable.
- [ ] Exactly 5 decision credits are available per locked decision.
- [ ] Lockdown duration is exactly 5 minutes.
- [ ] Share result card exists.
- [ ] No temporary P4-only fake attempt controls remain in the UI.

## Required commands

- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.

## QA notes

- Tester:
- Date:
- Device/browser:
- Result:
- Follow-up issues:
