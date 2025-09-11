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
      // Icon dimensions and count
      icon_height = 79,
      num_icons = 9,
      // Animation settings
      time_per_icon = 100,
      // Game state
      indexes = [0, 0, 0];

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
const roll = (reel, offset = 0) => {
  const delta = (offset + 2) * num_icons + Math.round(Math.random() * num_icons);
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
      resolve(delta % num_icons);
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
  const reelsList = document.querySelectorAll('.slots > .reel');

  return Promise.all([...reelsList].map((reel, i) => roll(reel, i)))
    .then((deltas) => {
      deltas.forEach((delta, i) => indexes[i] = (indexes[i] + delta) % num_icons);
      debugEl.textContent = indexes.map((i) => iconMap[i]).join(' - ');

      // Rig the win based on percentage
      if (Math.random() * 100 < winPercentage) {
        const forcedSymbol = winnableSymbols[forcedWinIndex];
        const forcedSymbolIndex = iconMap.indexOf(forcedSymbol);
        // Force a win with one wild for testing
        indexes[0] = forcedSymbolIndex;
        indexes[1] = iconMap.indexOf(wildSymbol);
        indexes[2] = forcedSymbolIndex;

        forcedWinIndex++;
        if (forcedWinIndex >= winnableSymbols.length) {
          forcedWinIndex = 0;
        }
      }

      const line = [iconMap[indexes[0]], iconMap[indexes[1]], iconMap[indexes[2]]];
      const winningSymbol = checkWin(line);

      if (winningSymbol) {
        const payout = payTable[winningSymbol];
        const winnings = payout * betAmount;

        balance += winnings;
        updateDisplays();

        debugEl.textContent = `You won ${winnings}! (${winningSymbol})`;
        document.querySelector(".slots").classList.add("win2");
        setTimeout(() => document.querySelector(".slots").classList.remove("win2"), 2000);
      }
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
