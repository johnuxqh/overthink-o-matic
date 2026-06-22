# OVERTHINK-O-MATIC

**Let's Underthink This.**

OVERTHINK-O-MATIC is a mobile-first, text-first decision game for getting unstuck from low-stakes overthinking. V1 is the Shelley private-testing version: a small browser app that lets someone name a decision, lock in options, play a silly decision game, accept the result, and cool down during a short lockdown.

## V1 purpose

V1 exists to validate the full text-only journey before broader sharing:

- Can a first-time user understand setup and start an overthink?
- Can they add/remove options and lock a decision without confusion?
- Do the games feel playful, cheeky, and affectionate rather than harsh?
- Does the five-credit limit stop endless rerolling?
- Does the five-minute lockdown make the final answer feel done?
- Can a result be shared or captured with a screenshot fallback?

## Local setup

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in your terminal.

## Test commands

```bash
npm run typecheck
npm test
```

## Build command

```bash
npm run build
```

## V1 feature list

- First-time setup with user name and optional reality checker name.
- Returning-user hydration from browser local storage.
- New overthink entry for the current decision/problem.
- Option creation with add/remove controls.
- Locked decisions with exactly five decision credits.
- Exactly nine selectable V1 games:
  - Coin Toss
  - Best of 5
  - Wheel of Fate
  - Gut Check
  - Chaos Goblin
  - Brutal Honesty
  - Reality Checker
  - Elimination Chamber
  - Battle Royale
- Two-option and three-plus-option game eligibility.
- Game result screen with selected answer, machine quote, credits remaining, accept, and try-another-game flow.
- Automatic Sudden Death on the fifth used credit.
- Five-minute decision lockdown with countdown and rotating text.
- Reload-safe lockdown hydration.
- Previous overthinks history.
- Goalpost warning for repeated options from the last decision.
- Share result card with download support where the browser allows it.
- Screenshot/copy fallback when share image export is unavailable.

## Known limitations

- Text-first UI.
- Local storage only.
- No backend.
- No account system.
- No AI semantic matching.
- No social API integration.
