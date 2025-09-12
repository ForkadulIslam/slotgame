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
        "bell": 30,
        "bar": 15,
        "melon": 12,
        "orange": 8,
        "plum": 6,
        "cherry": 5,
        "lemon": 3,
        "banana": 3,
        "seven": 2,
      },
      // These are the virtual reels. The distribution of symbols on these reels
      // determines the game's odds and RTP. This is the core of the business logic.
      REEL_1_STRIP = [
        "cherry", "plum", "orange",
        "melon", "melon", "melon",
        "seven", "seven", "seven", "seven", // Added 2
        "bar", "bar", "bar",
        "bell", "bell", "bell", "bell",
        "banana", "lemon"
      ],
      REEL_2_STRIP = [
        "cherry", "plum", "orange",
        "melon",
        "seven", "seven", "seven", // Added 2
        "bar",
        "bell", "bell", "bell", "bell", "bell", "bell", "bell", "bell", "bell", "bell", "bell", "bell", "bell", "bell",
        "banana", "lemon"
      ],
      REEL_3_STRIP = [
        "cherry", "plum", "orange",
        "melon", "melon", "melon",
        "seven", "seven", "seven", "seven", // Added 2
        "bar", "bar", "bar",
        "bell", "bell", "bell", "bell",
        "banana", "lemon"
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
let currentMultiplier = 1;
let lastBonusAmount = 0;
let currentFreeSpinWinnings = 0;

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
 * Check for a win on a line of 3 symbols.
 * @param {Array<string>} line - An array of 3 symbols.
 * @returns {Array<Object>} - An array of winning objects, each with symbol and indices.
 */
function checkWin(line) {
  const wins = [];
  const symbols = [...new Set(line)]; // Get unique symbols

  for (const symbol of symbols) {
    if (symbol === wildSymbol) continue;

    const count = line.filter(s => s === symbol).length;
    const wildCount = line.filter(s => s === wildSymbol).length;

    if (count + wildCount >= 3) {
      const indices = [];
      for (let i = 0; i < 3; i++) {
        if (line[i] === symbol || line[i] === wildSymbol) {
          indices.push(i);
        }
      }
      wins.push({ symbol: symbol, indices: indices });
    }
  }

  if (line.every(s => s === wildSymbol)) {
    wins.push({ symbol: wildSymbol, indices: [0, 1, 2] });
  }

  return wins;
}

/**
 * Process wins, remove winning symbols, and drop new ones.
 * @param {Array<Object>} wins - Array of winning objects from checkWin.
 * @param {Array<string>} line - The current line of symbols.
 * @returns {Promise<Array<string>>} - The new line of symbols after the drop.
 */
async function processWins(wins, line) {
  if (wins.length === 0) return line;

  const reelsList = document.querySelectorAll('.slots > .reel');
  const newSymbols = generateOutcome();
  const newLine = [...line];

  for (const win of wins) {
    for (const index of win.indices) {
      const reel = reelsList[index];
      reel.classList.add('win');
    }
  }

  await new Promise(resolve => setTimeout(resolve, 500)); // Time for win highlight

  for (let i = 0; i < 3; i++) {
    const reel = reelsList[i];
    const isWin = wins.some(win => win.indices.includes(i));
    if (isWin) {
      // Animate out
      reel.style.transition = 'transform 0.3s ease-in';
      reel.style.transform = 'translateY(-100%)';
      await new Promise(resolve => setTimeout(resolve, 300));

      // Replace symbol and animate in
      newLine[i] = newSymbols[i];
      const targetIndex = iconMap.indexOf(newLine[i]);
      reel.style.transition = 'none';
      reel.style.backgroundPositionY = `${-targetIndex * icon_height}px`;
      reel.style.transform = 'translateY(100%)';
      await new Promise(resolve => setTimeout(resolve, 50));
      reel.style.transition = 'transform 0.3s ease-out';
      reel.style.transform = 'translateY(0)';
      reel.classList.remove('win');
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  return newLine;
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
async function rollAll() {
  debugEl.textContent = 'rolling...';
  if (!isInFreeSpins) {
    currentMultiplier = 1; // Reset multiplier only if not in free spins
  }
  let totalWinningsThisSpin = 0;

  let finalLine = generateOutcome();
  let finalIndexes = finalLine.map(symbol => iconMap.indexOf(symbol));

  console.log("Initial Result:", finalLine.join(' - '));

  const reelsList = document.querySelectorAll('.slots > .reel');
  await Promise.all([...reelsList].map((reel, i) => roll(reel, i, finalIndexes[i])));

  indexes = finalIndexes;

  if (isInFreeSpins) {
    freeSpinsRemaining--;
  }

  let wins = checkWin(finalLine);
  let hadWins = wins.length > 0;

  while (wins.length > 0) {
    for (const win of wins) {
      const payout = payTable[win.symbol];
      const lineWinnings = ((payout * betAmount) / 10) * currentMultiplier;
      totalWinningsThisSpin += lineWinnings;
      if (isInFreeSpins) {
        currentFreeSpinWinnings += lineWinnings;
      }
      debugEl.textContent = `Win: ${win.symbol} (${lineWinnings}) | Multiplier: x${currentMultiplier}`;
    }

    finalLine = await processWins(wins, finalLine);
    console.log("New Line:", finalLine.join(' - '));
    wins = checkWin(finalLine);
    if (wins.length > 0) {
      currentMultiplier++;
    }
  }

  if (hadWins) {
    balance += totalWinningsThisSpin;
    updateDisplays();
    document.querySelector(".slots").classList.add("win2");
    setTimeout(() => document.querySelector(".slots").classList.remove("win2"), 2000);
  }

  // Scatter check (only once per spin)
  const scatterCount = checkScatterWin(finalLine);
  if (scatterCount >= 3 && !isInFreeSpins) {
    const overlay = document.getElementById('free-spins-overlay');
    overlay.classList.remove('hidden');
    setTimeout(() => {
      overlay.classList.add('hidden');
    }, 3000);

    isInFreeSpins = true;
    freeSpinsRemaining = 10;
    currentMultiplier = 1; // Start multiplier at 1 for free spins
    document.body.classList.add('free-spins-active');
    debugEl.textContent = `10 FREE SPINS! Multiplier doesn't reset!`;
    currentFreeSpinWinnings = 0;
    isAutoSpinActive = false;
  }

  // Handle free spins state and messaging
  if (isInFreeSpins) {
    if (freeSpinsRemaining <= 0) {
      isInFreeSpins = false;
      // Don't reset multiplier here, let it be reset at the start of the next normal spin
      document.body.classList.remove('free-spins-active');
      lastBonusAmount = currentFreeSpinWinnings;
      currentFreeSpinWinnings = 0;
      debugEl.textContent = `Free spins over! Total Bonus: ${lastBonusAmount}`;
    } else {
      debugEl.textContent = `${freeSpinsRemaining} FS left | Multiplier: x${currentMultiplier} | Bonus: ${currentFreeSpinWinnings}`;
    }
  } else if (lastBonusAmount > 0) {
    debugEl.textContent += ` | Last Bonus: ${lastBonusAmount}`;
  }

  if (isAutoSpinActive) {
    setTimeout(spin, 1000);
  } else {
    spinButton.disabled = false;
    autoSpinButton.textContent = 'AUTO';
  }
};;

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
