# OVERTHINK-O-MATIC P1 System Definition

## Product boundary

OVERTHINK-O-MATIC is a mobile-first React/TypeScript web app for fast MVP testing. P1 defines the system shape only: domain models, rules, storage boundaries, and acceptance criteria. P1 does **not** implement the full UI, visual polish, or extra features.

The machine only chooses from user-supplied options. It is not therapy, mental health advice, medical advice, legal advice, financial advice, or life-changing decision advice.

## Recommended folder structure

```text
src/
  domain/          # Types, enums, lifecycle, pure domain rules
  games/           # Pure game engines and eligibility helpers
  services/        # Application services that orchestrate domain + storage
  storage/         # Local-storage-backed StorageService implementation for V1
  state/           # App state model, reducers/actions, selectors
  share/           # ShareCardData builders and eventual card rendering adapter
  __tests__/       # Unit tests for domain rules and services
docs/
  SYSTEM_DEFINITION.md
```

Core decision/game logic should live in `src/domain` and `src/games`, not in React components. Storage must stay behind `StorageService`; V1 uses local storage only.

## TypeScript model

The P1 TypeScript definitions live in `src/domain/model.ts` and include:

- `UserProfile` for first-time setup with user name and optional reality checker name.
- `DecisionRecord` for draft, locked, lockdown, and completed decisions.
- `DecisionOption` for user-entered options.
- `GameRun` for each credit-consuming game result.
- `DecisionCredits` for the exactly-five-credit limit.
- `LockdownState` for the five-minute final-answer timeout.
- `AppState` for user, current decision, previous decisions, and goalpost warnings.
- `StorageService` for local-storage abstraction.
- `ShareCardData` for screenshot-style share results.

## Constants and enums

- `DecisionStatus`: `draft`, `locked`, `lockdown`, `complete`.
- `GameId`: the nine games plus `sudden_death` for the forced final answer.
- `DecisionEventType`: lifecycle events for auditability and testing.
- `REQUIRED_OPTION_COUNT = 2`.
- `MAX_DECISION_CREDITS = 5`.
- `LOCKDOWN_DURATION_MS = 300000`.
- `TWO_OPTION_GAME_IDS`: Coin Toss, Best of 5, Gut Check, Chaos Goblin, Brutal Honesty, Reality Checker.
- `MULTI_OPTION_GAME_IDS`: Wheel of Fate, Elimination Chamber, Battle Royale, Chaos Goblin, Brutal Honesty, Reality Checker.

## App state model

`AppState` should contain only serializable data:

1. `user`: saved setup profile, if setup is complete.
2. `currentDecision`: the active draft, locked decision, or lockdown decision.
3. `previousDecisions`: locally stored completed or timed-out decisions.
4. `goalpostWarning`: optional result from exact/normalised option matching.

React UI should derive display state from selectors instead of duplicating lifecycle flags.

## Decision lifecycle model

1. **Setup**: collect `name` and optional `realityCheckerName`.
2. **Draft**: collect problem text and at least two non-empty options. Option 3+ can be added.
3. **Locked**: `Lock it in` freezes problem/options and initializes exactly five credits.
4. **Game run**: an eligible game selects one of the locked options and consumes one credit.
5. **Reject result**: rejected result ids are tracked for cheeky escalation, but rejection does not restore credit.
6. **Sudden Death**: after the fifth used credit, the next forced resolution is `sudden_death`, which picks the final answer.
7. **Lockdown**: final answer is shown with a five-minute countdown and rotating playful messages. No reroll is allowed.
8. **Complete**: once lockdown expires, the decision can be archived in previous overthinks.
9. **New Overthink**: always available as a path back to the first screen, but it must not allow rerolling or escaping lockdown for the same locked decision.

## Game eligibility rules

- Exactly two options: show only `TWO_OPTION_GAME_IDS`.
- Three or more options: show only `MULTI_OPTION_GAME_IDS`.
- Fewer than two valid options: no games are eligible.
- `sudden_death` is not manually selectable; it is system-triggered after all five credits are used.

## Credit rules

- Every locked decision has exactly five attempts/credits.
- Every game run consumes one credit.
- Remaining credits are `5 - used` and must never drop below zero.
- Rejected results are counted separately and never refund credits.
- When the fifth credit is consumed, Sudden Death Mode must produce the final answer and start lockdown.

## Lockdown rules

- Lockdown lasts exactly five minutes: `LOCKDOWN_DURATION_MS`.
- During lockdown, show the final decision, countdown, and playful rotating messages.
- During lockdown, no reroll or additional game run is allowed.
- A new overthink path may navigate away, but it must not mutate or reopen the locked-down decision.

## Goalpost detection rule

For V1, compare only exact normalised option text against the immediately previous decision:

1. Trim leading/trailing whitespace.
2. Collapse internal whitespace.
3. Convert to lowercase.
4. Compare new option texts to previous option texts.
5. If any match, show a playful “moving the goal posts” warning.

No AI or semantic matching is required in V1.

## Share card data model

`ShareCardData` contains only the fields needed to generate a shareable card or screenshot-style result:

- decision/problem text
- option texts
- selected game id, including `sudden_death` when applicable
- final answer
- decision status
- funny machine quote
- creation timestamp

Rendering/export format is intentionally left to later UI work.

## Acceptance criteria

- P1 provides a clear recommended folder structure.
- Domain types and constants compile as standalone TypeScript definitions.
- The nine locked V1 games and Sudden Death are represented.
- Eligibility rules differ correctly between two-option and three-plus-option decisions.
- Credit rules enforce exactly five attempts per locked decision.
- Lockdown rules define a five-minute no-reroll period.
- Goalpost detection is limited to exact normalised option matching with the previous decision.
- Storage is represented by a service interface and is not coupled to UI.
- Share card data is represented without implementing visual card rendering.
- No full UI, visual design, or extra features are introduced in P1.

## Basic unit test plan

1. `getEligibleGames(options)` returns no games for fewer than two valid options.
2. `getEligibleGames(options)` returns the two-option list for exactly two options.
3. `getEligibleGames(options)` returns the multi-option list for three or more options.
4. `consumeCredit(decision)` increments used credits and decrements remaining credits.
5. `consumeCredit(decision)` never allows remaining credits below zero.
6. Fifth game run triggers Sudden Death and creates a final answer.
7. Lockdown end time is exactly five minutes after lockdown start.
8. Game runs are blocked during lockdown.
9. Rejected results are tracked without refunding credits.
10. Goalpost detection matches trimmed, lowercased, whitespace-collapsed option text.
11. Goalpost detection ignores non-matching option text and does not use semantic matching.
12. Share card builder includes problem, options, game, final answer, status, quote, and timestamp.
13. Storage service can save/load user profile, current decision, and previous decisions using local storage in V1 implementation tests.
