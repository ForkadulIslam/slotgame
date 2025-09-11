### Slot Game Development Plan

This plan breaks down the development into logical phases, starting with the user interface and progressively building the core game mechanics.

---

#### **Phase 1: UI Scaffolding & Initial Setup**

*Goal: Create the basic visual structure of the slot game.*

1.  **HTML Structure (`mobile_slot.html`):**
    *   Define the main game container.
    *   Create areas for the header (displaying balance, bet amount) and footer (game controls).
    *   Build the slot machine grid (e.g., 5 columns for reels, 3 rows for visible symbols).

2.  **CSS Styling (`custom.css`):**
    *   Apply initial styles to the layout, reels, and buttons to create a basic slot machine appearance.
    *   Define placeholder styles for symbols (e.g., different colors for A, K, Q, J).

3.  **JavaScript Setup (`custom.js`):**
    *   Define initial variables for player state (e.g., `balance`, `currentBet`).
    *   Select and store references to key HTML elements (reels, spin button, balance display).

---

#### **Phase 2: Core Logic - The Spin Mechanism**

*Goal: Implement the non-visual, mathematical core of the game.*

1.  **Game Configuration (`custom.js`):**
    *   Define the game's symbol set (e.g., `['A', 'K', 'Q', 'J', 'WILD', 'SCATTER']`).
    *   Create the **weighted reel strips** as arrays, representing the probability of each symbol appearing, as described in your business logic.

2.  **Secure RNG (`custom.js`):**
    *   Implement a function that uses `window.crypto.getRandomValues()` to generate a secure random number. This will be used to determine the stopping point for each reel.

3.  **Outcome Generation (`custom.js`):**
    *   Create the main `spin()` function.
    *   Inside `spin()`, use the secure RNG to calculate the final, predetermined outcome for all reels based on the weighted strips.
    *   Store this result in a variable. **Crucially, do not update the UI yet.**

---

#### **Phase 3: Visuals & Animation**

*Goal: Connect the core logic to the user interface with engaging animations.*

1.  **Spin Animation (`custom.js` & `custom.css`):**
    *   Create a function to handle the visual spinning of the reels (e.g., using CSS transitions or `requestAnimationFrame`). This is the "theater."
    *   When the user clicks the spin button, call this animation function.

2.  **Revealing the Outcome (`custom.js`):**
    *   After a set duration (e.g., 2-3 seconds), stop the animation.
    *   Update the reel elements in the HTML to display the symbols from the predetermined outcome calculated in Phase 2.

---

#### **Phase 4: Payouts & State Management**

*Goal: Calculate wins and update the player's balance.*

1.  **Payout Logic (`custom.js`):**
    *   Write a `calculateWinnings()` function that reads the final symbol grid.
    *   Implement the "Ways-to-Win" or payline logic to check for winning combinations.
    *   Return the total win amount for the spin.

2.  **State Updates (`custom.js`):**
    *   After a spin completes and winnings are calculated:
        *   Subtract the `currentBet` from the `balance`.
        *   Add the winnings to the `balance`.
        *   Update the balance and win displays in the HTML.

---

#### **Phase 5: Polish & Advanced Features**

*Goal: Add features that enhance player engagement.*

1.  **Feature Triggers:**
    *   In your `calculateWinnings()` function, add logic to detect bonus triggers (e.g., 3 or more Scatter symbols).
2.  **Sound Effects:**
    *   Integrate audio for key events: reel spin, symbol landing, small win, big win, and background music.
3.  **UI/UX Refinements:**
    *   Add visual feedback for winning lines.
    *   Ensure the interface is responsive and user-friendly on mobile devices.
    *   Implement bet adjustment controls.