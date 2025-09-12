const wildSymbol = "bell";
const scatterSymbol = "seven";

const REEL_1_STRIP = [
  "cherry", "plum", "orange",
  "melon", "melon", "melon",
  "seven", "seven", "seven", "seven", // Added 2
  "bar", "bar", "bar",
  "bell", "bell", "bell", "bell",
  "banana", "lemon"
];

const REEL_2_STRIP = [
  "cherry", "plum", "orange",
  "melon",
  "seven", "seven", "seven", // Added 2
  "bar",
  "bell", "bell", "bell", "bell", "bell", "bell", "bell", "bell", "bell", "bell", "bell", "bell", "bell", "bell",
  "banana", "lemon"
];

const REEL_3_STRIP = [
  "cherry", "plum", "orange",
  "melon", "melon", "melon",
  "seven", "seven", "seven", "seven", // Added 2
  "bar", "bar", "bar",
  "bell", "bell", "bell", "bell",
  "banana", "lemon"
];

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

function calculateHitFrequency() {
  const totalCombinations = REEL_1_STRIP.length * REEL_2_STRIP.length * REEL_3_STRIP.length;
  let winningCombinations = 0;

  for (const s1 of REEL_1_STRIP) {
    for (const s2 of REEL_2_STRIP) {
      for (const s3 of REEL_3_STRIP) {
        const line = [s1, s2, s3];
        if (checkWin(line).length > 0) {
          winningCombinations++;
        }
      }
    }
  }

  const hitFrequency = (winningCombinations / totalCombinations) * 100;

  console.log(`Total Combinations: ${totalCombinations}`);
  console.log(`Winning Combinations: ${winningCombinations}`);
  console.log(`Hit Frequency: ${hitFrequency.toFixed(2)}%`);
}

function calculateScatterFrequency() {
  const totalCombinations = REEL_1_STRIP.length * REEL_2_STRIP.length * REEL_3_STRIP.length;
  let scatterWins = 0;

  for (const s1 of REEL_1_STRIP) {
    for (const s2 of REEL_2_STRIP) {
      for (const s3 of REEL_3_STRIP) {
        const line = [s1, s2, s3];
        if (line.filter(s => s === scatterSymbol).length >= 3) {
          scatterWins++;
        }
      }
    }
  }

  const scatterFrequency = totalCombinations / scatterWins;
  console.log(`
--- Scatter Trigger ---`);
  console.log(`1 in ${scatterFrequency.toFixed(0)} spins`);
}

calculateHitFrequency();
calculateScatterFrequency();
