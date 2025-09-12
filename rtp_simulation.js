const wildSymbol = "bell";
const scatterSymbol = "seven";

const payTable = {
  "bell": 30,
  "bar": 15,
  "melon": 12,
  "orange": 8,
  "plum": 6,
  "cherry": 5,
  "lemon": 3,
  "banana": 3,
  "seven": 2,
};

const REEL_1_STRIP = [
  "cherry", "plum", "orange",
  "melon", "melon", "melon",
  "seven", "seven",
  "bar", "bar", "bar",
  "bell", "bell", "bell", "bell",
  "banana", "lemon"
];

const REEL_2_STRIP = [
  "cherry", "plum", "orange",
  "melon",
  "seven",
  "bar",
  "bell", "bell", "bell", "bell", "bell", "bell", "bell", "bell", "bell", "bell", "bell", "bell", "bell", "bell",
  "banana", "lemon"
];

const REEL_3_STRIP = [
  "cherry", "plum", "orange",
  "melon", "melon", "melon",
  "seven", "seven",
  "bar", "bar", "bar",
  "bell", "bell", "bell", "bell",
  "banana", "lemon"
];

function checkWin(line) {
  const wins = [];
  const symbols = [...new Set(line)];

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

const getSecureRandom = (max) => {
  return Math.floor(Math.random() * max);
};

const generateOutcome = () => {
  const finalLine = [
    REEL_1_STRIP[getSecureRandom(REEL_1_STRIP.length)],
    REEL_2_STRIP[getSecureRandom(REEL_2_STRIP.length)],
    REEL_3_STRIP[getSecureRandom(REEL_3_STRIP.length)],
  ];
  return finalLine;
};

async function simulateSpins(numSpins) {
  let totalBet = 0;
  let totalWon = 0;
  const betAmount = 10; // Assuming a constant bet of 10 for simulation

  for (let i = 0; i < numSpins; i++) {
    totalBet += betAmount;
    let currentSpinWinnings = 0;
    let currentMultiplier = 1;

    let line = generateOutcome();
    let wins = checkWin(line);

    while (wins.length > 0) {
      for (const win of wins) {
        const payout = payTable[win.symbol];
        const lineWinnings = ((payout * betAmount) / 10) * currentMultiplier;
        currentSpinWinnings += lineWinnings;
      }

      // Simulate cascade
      const newLine = [...line];
      const winningIndices = [...new Set(wins.flatMap(win => win.indices))];
      for (const index of winningIndices) {
        // In a simple 3-reel slot, we can just generate a new symbol from the corresponding reel strip
        if (index === 0) {
          newLine[index] = REEL_1_STRIP[getSecureRandom(REEL_1_STRIP.length)];
        } else if (index === 1) {
          newLine[index] = REEL_2_STRIP[getSecureRandom(REEL_2_STRIP.length)];
        } else {
          newLine[index] = REEL_3_STRIP[getSecureRandom(REEL_3_STRIP.length)];
        }
      }
      line = newLine;
      wins = checkWin(line);
      if (wins.length > 0) {
        currentMultiplier++;
      }
    }
    totalWon += currentSpinWinnings;
  }

  const rtp = (totalWon / totalBet) * 100;

  console.log(`Simulated ${numSpins} spins.`);
  console.log(`Total Bet: ${totalBet}`);
  console.log(`Total Won: ${totalWon.toFixed(2)}`);
  console.log(`Return to Player (RTP): ${rtp.toFixed(2)}%`);
}

// Simulate 1 million spins
simulateSpins(1000000);
