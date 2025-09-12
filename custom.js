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
const roll = (reel, offset = 0, targetIndex, anticipation = false) => {
  const numRotations = offset + 2; // Number of full spins for animation
  const currentIndex = indexes[offset];
  const randomRotations = Math.round(Math.random() * 2); // Add some randomness to the spin duration

  // Calculate the difference to the target, ensuring it spins forward
  const diff = (targetIndex - currentIndex + num_icons) % num_icons;
  const delta = ((numRotations + randomRotations) * num_icons) + diff;
  const spinDuration = (8 + 1 * delta) * time_per_icon + offset * 150;

  // At the start of the next spin, normalize the position immediately. This preserves the bounce from the last spin.
  const style = getComputedStyle(reel);
  const backgroundPositionY = parseFloat(style["background-position-y"]);
  reel.style.transition = 'none';
  reel.style.backgroundPositionY = `${backgroundPositionY % (num_icons * icon_height)}px`;

  return new Promise((resolve) => {
    if (anticipation) {
      reel.classList.add('anticipation');
    }
    
    // We need to use a timeout to allow the browser to apply the 'transition: none' before re-adding the transition.
    setTimeout(() => {
      // Read the NORMALIZED position to calculate the final target.
      const normalizedPositionY = parseFloat(getComputedStyle(reel)["background-position-y"]);
      const targetBackgroundPositionY = normalizedPositionY + delta * icon_height;

      reel.style.transition = `background-position-y ${spinDuration}ms cubic-bezier(.41,-0.01,.63,1.09)`;
      reel.style.backgroundPositionY = `${targetBackgroundPositionY}px`;

      // The resolve now happens when the animation visually ends. The normalization for the *next* spin will happen at the start of that spin.
      setTimeout(() => {
        if (anticipation) {
          reel.classList.remove('anticipation');
        }
        resolve(targetIndex);
      }, spinDuration);
    }, 10); // A very short delay is sufficient for the browser to apply the style change.
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
  const slotsContainer = document.querySelector('.slots');
  const newSymbols = generateOutcome();
  let newLine = [...line];

  // 1. Create and animate win overlays (pop)
  const winningIndices = [...new Set(wins.flatMap(win => win.indices))];
  const overlays = [];
  for (const index of winningIndices) {
    const reel = reelsList[index];
    const symbol = line[index];
    const symbolIndex = iconMap.indexOf(symbol);

    const overlay = document.createElement('div');
    overlay.className = 'win-overlay win'; 
    overlay.style.position = 'absolute';
    overlay.style.top = reel.offsetTop + icon_height + 'px';
    overlay.style.left = reel.offsetLeft + 'px';
    overlay.style.width = reel.offsetWidth + 'px';
    overlay.style.height = icon_height + 'px';
    overlay.style.backgroundPositionY = `${-symbolIndex * icon_height}px`;
    
    slotsContainer.appendChild(overlay);
    overlays.push(overlay);
  }

  await new Promise(resolve => setTimeout(resolve, 600));

  // 2. Explode winning symbols
  const explosionPromises = overlays.map(overlay => {
    return new Promise(resolve => {
      overlay.className = 'win-overlay exploding';
      setTimeout(() => {
        slotsContainer.removeChild(overlay);
        resolve();
      }, 400);
    });
  });

  // 3. Fly in new symbols
  const flyInPromises = winningIndices.map(index => {
    return new Promise(resolve => {
      const reel = reelsList[index];
      const newSymbol = newSymbols[index];
      const targetIndex = iconMap.indexOf(newSymbol);

      // Hide the original reel while the new symbol flies in
      reel.style.opacity = '0';

      const flyingSymbol = document.createElement('div');
      flyingSymbol.className = 'flying-symbol';
      flyingSymbol.style.width = reel.offsetWidth + 'px';
      flyingSymbol.style.height = icon_height + 'px';
      flyingSymbol.style.top = reel.offsetTop + icon_height + 'px';
      flyingSymbol.style.left = reel.offsetLeft + 'px';
      flyingSymbol.style.backgroundPositionY = `${-targetIndex * icon_height}px`;

      // Set random starting position and state
      const startX = (Math.random() - 0.5) * 500;
      const startY = -250;
      const startRot = (Math.random() - 0.5) * 720;
      flyingSymbol.style.opacity = '0';
      flyingSymbol.style.transform = `translateX(${startX}px) translateY(${startY}px) scale(0.5) rotate(${startRot}deg)`;
      
      slotsContainer.appendChild(flyingSymbol);

      // Trigger the animation
      requestAnimationFrame(() => {
        setTimeout(() => {
          flyingSymbol.style.opacity = '1';
          flyingSymbol.style.transform = 'none';
        }, 50); // Delay to ensure transition is applied
      });

      // After animation, cleanup and update the real reel
      setTimeout(() => {
        slotsContainer.removeChild(flyingSymbol);
        reel.style.transition = 'none';
        reel.style.backgroundPositionY = `${-targetIndex * icon_height}px`;
        reel.style.opacity = '1';
        resolve();
      }, 650); // Slightly longer than the CSS transition
    });
  });

  // Update the line with new symbols for the next check
  for (const index of winningIndices) {
    newLine[index] = newSymbols[index];
  }

  await Promise.all([...explosionPromises, ...flyInPromises]);

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
  const anticipation = finalLine[0] === scatterSymbol && finalLine[1] === scatterSymbol;

  await Promise.all([
    roll(reelsList[0], 0, finalIndexes[0]),
    roll(reelsList[1], 1, finalIndexes[1]),
    roll(reelsList[2], 2, finalIndexes[2], anticipation)
  ]);

  // Add a brief pause for visual clarity before win checking
  await new Promise(resolve => setTimeout(resolve, 100));

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
      const slotsContainer = document.querySelector('.slots');
      const popup = document.createElement('div');
      popup.className = 'multiplier-popup';
      popup.textContent = `x${currentMultiplier}!`;
      slotsContainer.appendChild(popup);
      // Await the multiplier animation to prevent overlap
      await new Promise(resolve => setTimeout(() => {
        slotsContainer.removeChild(popup);
        resolve();
      }, 1000)); // Animation duration
    }
  }

  if (hadWins) {
    balance += totalWinningsThisSpin;
    updateDisplays();
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
