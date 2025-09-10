# Slot Game Development Plan

This document outlines the step-by-step plan to evolve the simple slot machine into a feature-rich, Jili/PG-style game.

## Current State
- A 3-reel slot machine with a visual-only spinning animation.
- A "Spin" button initiates a single spin.
- Win logic is basic: a win is triggered on any two adjacent matching symbols.
- The "win" is a simple flashing animation with no payout.
- No currency, betting, or player balance.

## Development Roadmap

We will implement the following features in phases.

### Step 1: Introduce a Currency System
- **Goal:** Add a player balance and a betting system.
- **Tasks:**
    - [ ] Add variables in `custom.js` for `balance` and `betAmount`.
    - [ ] Add UI elements in `mobile_slot.html` to display the balance and bet.
    - [ ] On every spin, subtract the `betAmount` from the `balance`.

### Step 2: Implement a Real Payline and Pay Table
- **Goal:** Define specific win conditions and payout values.
- **Tasks:**
    - [ ] Change the win logic to check for 3 identical symbols on the center horizontal payline.
    - [ ] Create a `payTable` data structure in `custom.js` to map symbols to payout multipliers.
    - [ ] When a win occurs, calculate the winnings (`betAmount * multiplier`) and add it to the player's `balance`.

### Step 3: Introduce a "Wild" Symbol
- **Goal:** Add a Wild symbol to increase win frequency.
- **Tasks:**
    - [ ] Designate a symbol as the **Wild**.
    - [ ] Update the win-checking logic to allow the Wild to substitute for other symbols.

### Step 4: Add a "Free Spins" Feature with a "Scatter" Symbol
- **Goal:** Implement a bonus round.
- **Tasks:**
    - [ ] Designate a symbol as the **Scatter**.
    - [ ] Add logic to trigger a bonus mode when 3 or more Scatters appear anywhere on the reels.
    - [ ] Create a "free spins" mode where the player gets a set number of spins for free, accumulating wins.

### Step 5: UI/UX and Design Polish
- **Goal:** Make the game more visually appealing and user-friendly.
- **Tasks:**
    - [ ] Improve the design of the reels, background, and buttons.
    - [ ] Add animations for wins and other events.
    - [ ] Add sound effects for spinning, winning, and other actions.
