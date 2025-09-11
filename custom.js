/**
 * Setup
 */
const debugEl = document.getElementById('debug'),
      spinButton = document.getElementById('spinButton'),
      balanceDisplay = document.getElementById('balance-display'),
      betDisplay = document.getElementById('bet-display'),
      betUpButton = document.getElementById('bet-up-button'),
      betDownButton = document.getElementById('bet-down-button'),
      // Mapping of indexes to icons
      iconMap = ["banana", "seven", "cherry", "plum", "orange", "bell", "bar", "lemon", "melon"],
      // Paytable: symbol -> payout multiplier
      payTable = {
        "bell": 200, // Wild symbol payout
        "seven": 100,
        "bar": 50,
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
        "banana", "banana", "lemon", "lemon", "cherry", "cherry", "cherry", "plum", "plum",
        "orange", "orange", "melon", "bar", "seven", "bell", "lemon", "lemon", "banana", "banana",
        "cherry", "cherry", "plum", "plum", "orange", "melon", "bar", "seven", "banana", "lemon",
        "cherry", "plum", "orange", "melon", "bar", "banana", "lemon", "cherry", "plum", "orange",
        "banana", "lemon", "cherry", "banana", "lemon", "cherry", "plum", "orange", "melon", "bar", "seven", "bell"
      ],
      REEL_2_STRIP = [
        "banana", "banana", "lemon", "lemon", "cherry", "cherry", "plum", "plum", "orange",
        "melon", "bar", "seven", "bell", "bell", "bell", "lemon", "banana", "cherry", "plum",
        "orange", "melon", "bar", "seven", "banana", "lemon", "cherry", "plum", "orange", "melon",
        "bar", "banana", "lemon", "cherry", "plum", "orange", "banana", "lemon", "cherry", "banana",
        "lemon", "cherry", "plum", "orange", "melon", "bar", "seven", "bell", "bell"
      ],
      REEL_3_STRIP = [
        "banana", "banana", "lemon", "lemon", "cherry", "cherry", "cherry", "plum", "plum",
        "orange", "orange", "melon", "bar", "seven", "bell", "lemon", "lemon", "banana", "banana",
        "cherry", "cherry", "plum", "plum", "orange", "melon", "bar", "seven", "banana", "lemon",
        "cherry", "plum", "orange", "melon", "bar", "banana", "lemon", "cherry", "plum", "orange",
        "banana", "lemon", "cherry", "banana", "lemon", "cherry", "plum", "orange", "melon", "bar", "seven", "bell"
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
const winPercentage = 20; // 20% chance of winning for testing
const winnableSymbols = Object.keys(payTable).filter(s => s !== wildSymbol);
let forcedWinIndex = 0;

let balance = 1000;
let betAmount = 10;

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

  // Calculate the difference to the target, ensuring it spins forward
  const diff = (targetIndex - currentIndex + num_icons) % num_icons;
  const delta = (numRotations * num_icons) + diff;

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

      // Use the predetermined line to check for a win
      const winningSymbol = checkWin(finalLine);

      if (winningSymbol) {
        const payout = payTable[winningSymbol];
        const winnings = payout * (betAmount / 10); // Payouts are based on bet amount

        balance += winnings;
        updateDisplays();

        // Overwrite the debug text again to show the win details
        debugEl.textContent = `WIN: ${winningSymbol} - Payout: ${winnings}`;
        document.querySelector(".slots").classList.add("win2");
        setTimeout(() => document.querySelector(".slots").classList.remove("win2"), 2000);
      }
      // If there is no win, the debug text already shows the result, so no 'else' is needed.
    });
};

/**
 * Spin function
 */
const spin = () => {
  // Check balance
  if (balance < betAmount) {
    debugEl.textContent = "Not enough balance!";
    return;
  }

  // Deduct bet
  balance -= betAmount;
  updateDisplays();

  // Disable buttons
  spinButton.disabled = true;
  betUpButton.disabled = true;
  betDownButton.disabled = true;

  // Roll all reels
  rollAll().then(() => {
    // Enable buttons
    spinButton.disabled = false;
    betUpButton.disabled = false;
    betDownButton.disabled = false;
  });
};

// Event listeners
spinButton.addEventListener('click', spin);
betUpButton.addEventListener('click', handleBetUp);
betDownButton.addEventListener('click', handleBetDown);

// Initial display update
updateDisplays();
