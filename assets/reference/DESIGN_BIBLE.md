# OVERTHINK-O-MATIC 5000
## DESIGN_BIBLE.md

Version: 1.0

Status: LOCKED

References:
- PRODUCT_BIBLE.md

If DESIGN_BIBLE.md conflicts with PRODUCT_BIBLE.md:

PRODUCT_BIBLE.md wins.

---

# DESIGN MISSION

The user should feel like they are interacting with a mysterious arcade machine that should not exist.

The machine feels:

- old
- dangerous
- over-engineered
- magical
- mechanical
- unpredictable

The machine is attempting to look professional.

Barry is attempting to operate it.

These goals conflict constantly.

---

# VISUAL NORTH STAR

Reference images are locked.

Primary style references should live in:

```text
assets/reference/design/
```

Recommended filenames:

```text
style-reference-01.png
style-reference-02.png
style-reference-03.png
style-reference-04.png
style-reference-05.png
```

These references define:

- colour palette
- visual density
- machine styling
- mood
- lighting
- material treatment
- Barry energy
- arcade/fortune-teller tone

Do not drift from them.

---

# VISUAL GENRE

OVERTHINK-O-MATIC 5000 is:

Retro Arcade

+

Fortune Teller Machine

+

Carnival Attraction

+

Mad Scientist Workshop

+

Steampunk Machinery

+

Neon 1980s Cabinet

+

Quantum Accident

---

# DESIGN RULE

The machine must feel:

Chaotic

WITHOUT becoming cluttered.

The machine is loud.

The UI is clear.

---

# SCREEN EXPERIENCE

Users are never “inside an app”.

Users are standing in front of a machine.

Every screen exists within the machine.

---

# EXTERNAL MACHINE VIEW

External machine view is used when:

- entering information
- selecting options
- choosing protocols
- viewing menus
- viewing history
- reading About The Machine
- sharing results

The machine is visible.

Barry is mostly hidden.

The user interacts with the front panel.

---

# INTERNAL MACHINE VIEW

Internal machine view is used when:

- Barry is working
- protocols are running
- calculations occur
- loading sequences occur
- final decision events occur
- Barry has taken control

Users see inside the machine.

Users see Barry operating machinery.

---

# BARRY VISIBILITY RULE

Barry is not always visible.

Barry appears when needed.

Barry is the operator.

Not the mascot.

Not the narrator.

Not the assistant.

---

# BARRY APPEARANCE

Barry is:

- a honey badger
- slightly radioactive
- wild-eyed
- sleep deprived
- energy drink powered
- mechanically dangerous
- one bad decision away from disaster

Visual inspirations:

- Rocket Raccoon
- carnival mechanic
- mad scientist
- gremlin engineer
- sugar-loaded toddler rage

Barry should always look like he is trying too hard.

---

# COLOUR SYSTEM

Primary Background / Deep Machine Black:

```css
#0D0B0A
```

Machine Brass:

```css
#B27A2B
```

Machine Copper:

```css
#D48942
```

Neon Cyan:

```css
#26F7FF
```

Neon Pink:

```css
#FF3EB5
```

Neon Green:

```css
#7CFF4D
```

Neon Yellow:

```css
#FFD447
```

Warning Red:

```css
#FF4444
```

Containment Purple:

```css
#6A3DFF
```

Panel Black:

```css
#11101A
```

CRT Green:

```css
#B6FF72
```

---

# COLOUR USAGE

Gold / Brass:

- machine frame
- main cabinet
- premium/primary “Barry” actions

Pink:

- energetic primary actions
- playful high-attention buttons

Cyan:

- display panels
- active machine states
- informational highlights

Green:

- accepted decisions
- success states
- “ready” state

Yellow:

- warning but not danger
- energy
- attention

Red:

- Barry Has Taken Control
- lockdown
- containment warnings
- emergency states

Purple:

- magical/quantum elements
- machine mystery
- protocol highlights

---

# MATERIAL SYSTEM

Machine Frame:

- brass
- copper
- scratched metal
- rivets
- bolts
- layered plates

Panels:

- dark steel
- LCD display panels
- CRT screens
- riveted construction

Glass:

- dirty
- glowing
- reflective
- slightly distorted

Controls:

- chunky
- physical
- tactile
- arcade-inspired

---

# LIGHTING

Everything glows.

Nothing is flat.

Use:

- rim lights
- panel glows
- indicator lights
- warning lights
- neon tubing
- glowing signs

Avoid:

- flat modern SaaS styling
- soft corporate gradients
- minimalist whitespace-first interfaces

---

# TYPOGRAPHY

Headers:

- arcade
- marquee
- machine labels
- bold
- uppercase
- high impact

Body:

- simple
- readable
- mobile-first
- never tiny
- never over-styled

Status Text:

- digital display feel
- CRT/LCD feel
- high contrast

---

# BUTTONS

Buttons are physical controls.

Not web buttons.

Each button should feel pressable.

Each button should feel mechanical.

Each button should be thumb-friendly.

---

# BUTTON TYPES

Primary Button:

- gold or pink
- used for major forward actions
- examples:
  - INSERT INTO MACHINE
  - LOCK IN OPTIONS
  - RUN PROTOCOL

Success Button:

- green
- used for commitment actions
- examples:
  - ACCEPT THE ANSWER
  - NEW OVERTHINK

Protocol Button:

- purple/cyan
- used for protocol selection
- should feel like inserting a cartridge or activating a machine function

Danger Button:

- red
- used for emergency/lockdown/admin destructive actions

Secondary Button:

- dark metal
- used for navigation
- examples:
  - Previous Overthinks
  - About The Machine
  - Back

---

# DISPLAY PANELS

Machine screens should appear as:

- LCD
- CRT
- mechanical displays
- information panels
- machine readouts

Never plain cards.

---

# MACHINE FRAME

The machine frame is the primary visual container.

Every major screen should sit inside the machine.

The user should feel they are operating the Overthink-O-Matic 5000, not browsing a normal mobile app.

---

# MAIN SCREEN LAYOUT

Mobile-first layout:

1. Machine marquee
2. Barry/machine subtitle
3. Central display panel
4. Primary interaction area
5. Control deck/buttons
6. Secondary navigation

Desktop layout:

- centered mobile-width cabinet
- desktop is secondary
- do not design desktop first

---

# HOME SCREEN

Purpose:

Let the user state the overthink.

Visual mode:

External machine view.

Barry may be visible through a hatch/window, but should not dominate.

Required feeling:

The machine is waiting.

Recommended heading:

```text
STATE YOUR OVERTHINK
```

Recommended helper:

```text
Feed Barry one low-stakes decision. He will pretend this is science.
```

Primary action:

```text
INSERT INTO MACHINE
```

---

# OPTIONS SCREEN

Purpose:

Let the user enter the options Barry may choose from.

Visual mode:

External machine view.

Recommended heading:

```text
OPTIONS DETECTED
```

Recommended helper:

```text
Barry only chooses from what you feed him. Do not blame the badger.
```

Primary action:

```text
LOCK IN OPTIONS
```

Secondary action:

```text
ADD ANOTHER OPTION
```

---

# PROTOCOL SCREEN

Purpose:

Let the user choose how Barry should produce the answer.

Visual mode:

External machine view.

Protocols should feel like:

- machine cartridges
- control modules
- mechanical operations
- arcade cabinet functions

Not menu items.

Recommended heading:

```text
CHOOSE YOUR PROTOCOL
```

Special button:

```text
BARRY, YOU PICK
```

This should be a prominent gold button.

---

# PROTOCOL CARD RULES

Each protocol card should include:

- protocol name
- small icon or emblem
- one-line description
- activation button
- clear eligibility

Cards should feel physical.

Examples:

- Coin Toss Protocol
- Best Of Five Analyzer
- Wheel Of Fate
- Gut Check Module
- Chaos Engine
- Brutal Honesty Protocol
- Reality Checker Module
- Elimination Chamber
- Battle Royale Simulator

---

# BARRY MODE

“BARRY, YOU PICK” is a special visual moment.

Barry chooses the protocol.

This exists because sometimes choosing how to decide is still too much decision-making.

Barry may comment on the user's lack of confidence.

---

# THINKING / LOADING STATES

Results must not appear instantly.

The delay is part of the joke.

The user should believe Barry is doing unnecessary work.

Thinking states should show:

- Barry working
- machine noise
- levers
- switches
- sparks
- fake calculations
- warning labels
- round-by-round progress for relevant protocols

---

# ANIMATION PHILOSOPHY

Animations must create anticipation.

The machine should never instantly reveal answers.

Users should feel:

Barry is actually doing something.

Even when nothing meaningful is occurring.

---

# ANIMATION RULE

The delay is part of the product.

Protect it.

---

# THINKING SEQUENCE EXAMPLES

Barry may be:

- pulling levers
- flipping switches
- hitting machinery
- spinning wheels
- rewiring components
- yelling at gauges
- dropping coins
- arguing with a toaster
- running fake simulations

The machine appears busy.

The work is mostly nonsense.

---

# RANDOMISED PROCESS TIME

Protocol reveal times should feel variable.

Example:

Coin Toss may take 2 seconds once.

Another time it may take 8 seconds because Barry dropped the coin.

Retries should generally feel more intense and take longer.

The goal is anticipation, not efficiency.

---

# RESULT SCREEN

Most important screen in the product.

Requirements:

- large answer
- glowing answer
- machine signage
- clear hierarchy
- Barry commentary
- visible Overthink Spiral if applicable

Recommended heading:

```text
THE MACHINE SAYS...
```

Recommended commentary label:

```text
Barry's Notes
```

The answer is the hero.

---

# OVERTHINK SPIRAL

The Overthink Spiral should feel like:

Machine audit trail.

Not analytics.

Not history.

The machine is documenting the user's descent into indecision.

It should show:

- attempt number
- protocol used
- result
- rejection state
- Barry's increasing commitment

Rejected results may look crossed out like a cursed machine receipt.

---

# BARRY COMMITMENT INDEX

Visual progression.

Should feel increasingly unstable.

More lights.

More warnings.

More machine activity.

Never feel like a traditional progress bar.

Do not visually present this as “credits”.

The backend may still use credits.

The user sees Barry becoming dangerously invested.

---

# BARRY ESCALATION VISUALS

Attempt 1:

- confident
- controlled
- helpful

Attempt 2:

- focused
- mildly offended

Attempt 3:

- concerned
- suspicious
- more machine activity

Attempt 4:

- obsessed
- overheating
- unsafe levels of effort

Attempt 5:

- unhinged
- containment failing
- system overload

---

# BARRY HAS TAKEN CONTROL

Visual mode shift.

Machine enters emergency state.

Red lighting.

Containment warnings.

Emergency signage.

Machine takeover feel.

Barry is no longer operating within normal limits.

Recommended heading:

```text
BARRY HAS TAKEN CONTROL
```

Recommended supporting copy:

```text
Your decision-making privileges have been temporarily revoked.
```

---

# LOCKDOWN SCREEN

Lockdown is Barry recovering.

Not punishment.

Visual inspiration:

- post-explosion workshop
- overheated machine
- containment recovery
- Barry unconscious
- smoke
- burn marks
- cooling systems active

Countdown must be prominent.

Recommended heading:

```text
BARRY IS RECOVERING
```

or:

```text
DECISION LOCKED
```

Recommended copy:

```text
Barry exceeded recommended operating limits.
Recovery is underway.
```

---

# SHARE CARD

Share card must feel like:

A receipt from a cursed arcade machine.

Visual style:

- thermal receipt
- machine ticket
- arcade prize slip
- decision record

Never corporate.

Required contents:

- app name
- decision/problem
- options
- protocol
- final decision
- Barry's comment
- Overthink Spiral if space allows

---

# ABOUT PAGE

About page is machine lore.

Not documentation.

Not product information.

Not company information.

Machine mythology.

It should feel like reading a plaque attached to a cursed arcade machine.

---

# ADMIN / QA SCREENS

Admin and QA screens must remain usable.

They may use the machine visual system, but clarity wins.

Admin controls are for testing only.

Do not over-theme admin screens to the point that testing becomes harder.

---

# ACCESSIBILITY

Maintain:

- high contrast
- readable text
- touch-friendly controls
- visible focus states
- clear input labels
- one primary action per screen

Do not rely on colour alone for meaning.

---

# MOBILE FIRST RULE

All design must be mobile-first.

Desktop support is secondary.

Design for thumb interaction.

Large buttons.

Clear tap targets.

Avoid crowded screens.

---

# FUTURE NATIVE APP RULE

Design and layout should remain suitable for future wrapping into:

- Capacitor
- React Native
- native mobile shells

Avoid hard-coding desktop assumptions.

---

# DESIGN GUARDRAILS

Do NOT drift into:

- SaaS
- productivity app
- mental health app
- wellness app
- corporate dashboard
- minimalist design
- Apple-style utility app
- generic neon form UI

This is an arcade machine.

Always.

---

# FINAL DESIGN RULE

The machine should look like it was built by brilliant engineers.

Barry should look like the reason it keeps failing.
