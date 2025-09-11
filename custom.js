/**
 * Setup
 */
const debugEl = document.getElementById('debug'),
      spinButton = document.getElementById('spinButton'),
      balanceDisplay = document.getElementById('balance-display'),
      betDisplay = document.getElementById('bet-display'),
      betUpButton = document.getElementById('bet-up-button'),
      betDownButton = document.getElementById('bet-down-button'),
      autoSpinButton = document.getElementById('autoSpinButton'),
      // Mapping of indexes to icons
      iconMap = ["banana", "seven", "cherry", "plum", "orange", "bell", "bar", "lemon", "melon"],
      // Paytable: symbol -> payout multiplier
      payTable = {
        "bell": 150, // Wild symbol payout (was 200)
        "seven": 75,   // (was 100)
        "bar": 40,     // (was 50)
        "melon": 30,
        "orange": 20,
        "plum": 15,
        "cherry": 10,
        "lemon": 5,
        "banana": 5,
      },
      // These are the virtual reels. The distribution of symbols on these reels
      // determines the game's odds and RTP. This is the core of the business logic.
      REEL_1_STRIP = [
        // High frequency low-tier symbols
        "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry",
        "plum", "plum", "plum", "plum", "plum", "plum", "plum", "plum", "plum", "plum",
        "orange", "orange", "orange", "orange",
        "melon", "melon",
        // Low frequency high-tier symbols
        "bar", "bar",
        "seven",
        "bell",
        // Non-winning symbols
        "banana", "banana",
        "lemon", "lemon"
      ],
      REEL_2_STRIP = [
        // High frequency low-tier symbols
        "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry",
        "plum", "plum", "plum", "plum", "plum", "plum", "plum", "plum", "plum", "plum",
        "orange", "orange", "orange", "orange",
        "melon", "melon",
        // More wilds on middle reel
        "bar", "bar",
        "seven",
        "bell", "bell", "bell",
        // Non-winning symbols
        "banana", "banana",
        "lemon", "lemon"
      ],
      REEL_3_STRIP = [
        // High frequency low-tier symbols
        "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry", "cherry",
        "plum", "plum", "plum", "plum", "plum", "plum", "plum", "plum", "plum", "plum",
        "orange", "orange", "orange", "orange",
        "melon", "melon",
        // Low frequency high-tier symbols
        "bar", "bar",
        "seven",
        "bell",
        // Non-winning symbols
        "banana", "banana",
        "lemon", "lemon"
      ],
      // Icon dimensions and count
      icon_height = 79,
      num_icons = 9,
      // Animation settings
      time_per_icon = 100;

// Game state
let indexes = [0, 0, 0];

// Game settings
const wildSymbol = "bell";
const scatterSymbol = "seven";

let balance = 1000;
let betAmount = 10;
let freeSpinsRemaining = 0;
let isInFreeSpins = false;
let isAutoSpinActive = false;

/**
 * Update UI displays
 */
const updateDisplays = () => {
  balanceDisplay.textContent = balance;
  betDisplay.textContent = betAmount;
};

/**
 * Handle bet changes
 */
const handleBetUp = () => {
  if (betAmount < 100) { // Max bet
    betAmount += 10;
    updateDisplays();
  }
};

const handleBetDown = () => {
  if (betAmount > 10) { // Min bet
    betAmount -= 10;
    updateDisplays();
  }
};

/** 
 * Roll one reel
 */
const generateOutcome = () => {
  const getSecureRandom = (max) => {
    const randomBytes = new Uint32Array(1);
    window.crypto.getRandomValues(randomBytes);
    return randomBytes[0] % max;
  };

  const finalLine = [
    REEL_1_STRIP[getSecureRandom(REEL_1_STRIP.length)],
    REEL_2_STRIP[getSecureRandom(REEL_2_STRIP.length)],
    REEL_3_STRIP[getSecureRandom(REEL_3_STRIP.length)],
  ];

  return finalLine;
};

/** 
 * Roll one reel
 */
const roll = (reel, offset = 0, targetIndex) => {
  const numRotations = offset + 2; // Number of full spins for animation
  const currentIndex = indexes[offset];
  const randomRotations = Math.round(Math.random() * 2); // Add some randomness to the spin duration

  // Calculate the difference to the target, ensuring it spins forward
  const diff = (targetIndex - currentIndex + num_icons) % num_icons;
  const delta = ((numRotations + randomRotations) * num_icons) + diff;

  return new Promise((resolve, reject) => {
    const style = getComputedStyle(reel),
          backgroundPositionY = parseFloat(style["background-position-y"]),
          targetBackgroundPositionY = backgroundPositionY + delta * icon_height,
          normTargetBackgroundPositionY = targetBackgroundPositionY % (num_icons * icon_height);

    setTimeout(() => {
      reel.style.transition = `background-position-y ${(8 + 1 * delta) * time_per_icon}ms cubic-bezier(.41,-0.01,.63,1.09)`;
      reel.style.backgroundPositionY = `${targetBackgroundPositionY}px`;
    }, offset * 150);

    setTimeout(() => {
      reel.style.transition = `none`;
      reel.style.backgroundPositionY = `${normTargetBackgroundPositionY}px`;
      // Resolve with the final index
      resolve(targetIndex);
    }, (8 + 1 * delta) * time_per_icon + offset * 150);
  });
};

/**
 * Check for a win on a line of 3 symbols
 * @param {Array<string>} line - An array of 3 symbols
 * @returns {string|null} - The winning symbol, or null if no win
 */
function checkWin(line) {
  const nonWild = line.filter(s => s !== wildSymbol);
  if (nonWild.length === 0) return wildSymbol; // All wilds
  if (nonWild.length === 1) return nonWild[0]; // Two wilds, one other
  if (nonWild.length === 2) {
    if (nonWild[0] === nonWild[1]) return nonWild[0]; // One wild, two others that match
  }
  if (nonWild.length === 3) {
    if (nonWild[0] === nonWild[1] && nonWild[1] === nonWild[2]) return nonWild[0]; // Three of a kind
  }
  return null;
}

/**
 * Check for a scatter win.
 * @param {Array<string>} line - An array of 3 symbols.
 * @returns {number} - The number of scatter symbols found.
 */
function checkScatterWin(line) {
  return line.filter(s => s === scatterSymbol).length;
}

/**
 * Roll all reels and check for wins
 */
function rollAll() {
  debugEl.textContent = 'rolling...';

  const finalLine = generateOutcome();
  const finalIndexes = finalLine.map(symbol => iconMap.indexOf(symbol));

  // Update debug text immediately with the predetermined result
  debugEl.textContent = `Result: ${finalLine.join(' - ')}`;

  const reelsList = document.querySelectorAll('.slots > .reel');

  return Promise.all([...reelsList].map((reel, i) => roll(reel, i, finalIndexes[i])))
    .then(() => {
      // Update the master indexes array with the final, correct result
      indexes = finalIndexes;

      // Decrement free spins counter if in free spins mode
      if (isInFreeSpins) {
        freeSpinsRemaining--;
      }

      let totalWinnings = 0;
      const winMessages = [];

      // Check for standard line wins
      const winningSymbol = checkWin(finalLine);
      if (winningSymbol) {
        const payout = payTable[winningSymbol];
        const lineWinnings = (payout * betAmount) / 10;
        totalWinnings += lineWinnings;
        winMessages.push(`Line Win: ${winningSymbol} (${lineWinnings})`);
      }

      // Check for scatter wins (3 or more)
      const scatterCount = checkScatterWin(finalLine);
      if (scatterCount >= 3) {
        const payout = payTable[scatterSymbol];
        const scatterWinnings = (payout * betAmount) / 10;
        totalWinnings += scatterWinnings;
        
        // Award free spins if not already in free spins mode
        if (!isInFreeSpins) {
          isInFreeSpins = true;
          freeSpinsRemaining = 10;
          winMessages.push(`10 FREE SPINS WON!`);
          // --- Stop auto-spin on feature win ---
          isAutoSpinActive = false;
        }
      }

      // Handle win display and balance update
      if (totalWinnings > 0) {
        balance += totalWinnings;
        updateDisplays();
        winMessages.unshift(`WIN!`); // Add WIN! to the start of the message
        document.querySelector(".slots").classList.add("win2");
        setTimeout(() => document.querySelector(".slots").classList.remove("win2"), 2000);
      }

      // Handle free spins state and messaging
      if (isInFreeSpins) {
        if (freeSpinsRemaining <= 0) {
          isInFreeSpins = false;
          winMessages.push("Free spins round over!");
        } else {
          winMessages.push(`${freeSpinsRemaining} free spins left.`);
        }
      }

      // Update debug text if there are any messages to show
      if (winMessages.length > 0) {
        debugEl.textContent = winMessages.join(' | ');
      }

      // --- Handle auto-spin loop ---
      if (isAutoSpinActive) {
        setTimeout(spin, 1000); // 1-second delay before next auto-spin
      } else {
        // If auto-spin was turned off, re-enable manual spin button
        spinButton.disabled = false;
        autoSpinButton.textContent = 'AUTO';
      }
    });
};

/**
 * Spin function
 */
const spin = () => {
  // Handle bet deduction for normal spins, or do nothing for free spins
  if (!isInFreeSpins) {
    if (balance < betAmount) {
      debugEl.textContent = "Not enough balance!";
      // --- Stop auto-spin on low balance ---
      isAutoSpinActive = false;
      autoSpinButton.textContent = 'AUTO';
      spinButton.disabled = false;
      return;
    }
    balance -= betAmount;
    updateDisplays();
  }

  // Disable buttons during spin
  spinButton.disabled = true;
  betUpButton.disabled = true;
  betDownButton.disabled = true;

  rollAll().then(() => {
    // Always re-enable spin button
    spinButton.disabled = false;
    
    // Only re-enable bet buttons if we are not in a free spins cycle
    if (!isInFreeSpins) {
      betUpButton.disabled = false;
      betDownButton.disabled = false;
    }
  });
};

const toggleAutoSpin = () => {
  isAutoSpinActive = !isAutoSpinActive;

  if (isAutoSpinActive) {
    autoSpinButton.textContent = 'STOP';
    spinButton.disabled = true; // Disable manual spin during auto-spin
    spin();
  } else {
    autoSpinButton.textContent = 'AUTO';
    spinButton.disabled = false;
  }
};

// Event listeners
spinButton.addEventListener('click', spin);
autoSpinButton.addEventListener('click', toggleAutoSpin);
betUpButton.addEventListener('click', handleBetUp);
betDownButton.addEventListener('click', handleBetDown);

// Initial display update
updateDisplays();
