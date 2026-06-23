# OVERTHINK-O-MATIC 5000

## CODE_GUARDRAILS.md

Version: 1.0

Status: LOCKED

References:

* PRODUCT_BIBLE.md
* DESIGN_BIBLE.md
* LORE_BIBLE.md
* PROJECT_CONTEXT.md

If conflicts occur:

PRODUCT_BIBLE.md wins.

---

# PURPOSE

This document prevents implementation drift.

It defines what Codex may change and what Codex may not change.

---

# NEVER CHANGE WITHOUT EXPLICIT APPROVAL

The following are locked:

## Decision Lifecycle

* 5 attempts per decision
* Barry Has Taken Control on attempt 5
* 5-minute lockdown
* Lockdown blocks all new decisions
* Accepted decisions before attempt 5 return user to Home

---

## Product Identity

OVERTHINK-O-MATIC 5000 is:

* a machine
* an arcade experience
* a comedy product

It is NOT:

* a productivity app
* a coaching platform
* a wellness platform
* a decision science platform
* a therapist
* an AI advisor

---

## Barry

Barry must remain:

* a honey badger
* mostly unseen
* emotionally invested
* trying too hard

Barry must never become:

* a wizard
* a superhero
* a mentor
* an AI assistant

---

## Platform Direction

Mobile-first.

Future native conversion must remain possible.

Avoid architecture that makes React Native or Capacitor difficult.

---

# IMPLEMENTATION RULES

## Logic

Keep game logic separate from UI.

Keep state separate from UI.

Keep storage separate from UI.

Avoid coupling.

---

## Storage

V1 uses:

localStorage only.

No backend.

No database.

No account system.

No authentication.

---

## Design

Design implementation must follow:

DESIGN_BIBLE.md

Do not invent new visual directions.

Do not redesign the product.

---

## Lore

Lore implementation must follow:

LORE_BIBLE.md

Do not invent contradictory canon.

---

# ALLOWED CHANGES

Codex may:

* improve code quality
* refactor safely
* improve maintainability
* improve accessibility
* improve mobile responsiveness
* improve performance
* add tests
* add animations when requested
* add visual assets when requested

Provided behaviour remains unchanged.

---

# NOT ALLOWED WITHOUT APPROVAL

Do not:

* add new game modes
* add new protocols
* add AI features
* add chat features
* add social networks
* add accounts
* add achievements
* add leaderboards
* add points systems
* add monetisation systems
* add backend services

---

# TESTING REQUIREMENTS

Every implementation prompt should require:

npm run typecheck

npm test

npm run build

before completion.

---

# DEPLOYMENT REQUIREMENTS

GitHub Pages deployment must remain functional.

Do not break deployment.

Do not remove deployment workflows.

---

# ADMIN REQUIREMENTS

Admin mode exists for testing.

Admin tooling must remain hidden from normal users.

Admin tooling must not affect normal gameplay.

---

# REPOSITORY REFERENCES

Visual references:

assets/reference/

All future reference imagery should be stored here unless explicitly approved otherwise.

---

# THE FINAL RULE

When uncertain:

Do not invent.

Ask.

Preserving the product is more important than adding to it.
