// storage.js — localStorage helpers for Aussie Word Challenge

const NS = 'aussieWordChallenge_';

export function storageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function storageSet(key, value) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch (e) {
    console.warn('Storage write failed:', e);
  }
}

export function storageRemove(key) {
  localStorage.removeItem(NS + key);
}

// Default stats shape for one word-length bucket
export function makeDefaultStats() {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    bestStreak: 0,
    totalScore: 0,
    guessDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 },
    clueUsageDistribution: { 0: 0, 1: 0, 2: 0, 3: 0 },
    wordsPlayed: [],
  };
}

// Get stats for a specific word length (4-7) or 'all'
export function getStats(length) {
  const key = `stats_${length}`;
  return storageGet(key, makeDefaultStats());
}

export function saveStats(length, stats) {
  storageSet(`stats_${length}`, stats);
}

// Compute combined stats across all lengths
export function getCombinedStats() {
  const combined = makeDefaultStats();
  let bestStreak = 0;
  let currentStreak = 0;

  for (const len of [4, 5, 6, 7]) {
    const s = getStats(len);
    combined.gamesPlayed += s.gamesPlayed;
    combined.gamesWon += s.gamesWon;
    combined.totalScore += s.totalScore;
    bestStreak = Math.max(bestStreak, s.bestStreak);
    currentStreak += s.currentStreak; // sum as approximation
    for (let i = 1; i <= 8; i++) {
      combined.guessDistribution[i] = (combined.guessDistribution[i] || 0) + (s.guessDistribution[i] || 0);
    }
    for (let i = 0; i <= 3; i++) {
      combined.clueUsageDistribution[i] = (combined.clueUsageDistribution[i] || 0) + (s.clueUsageDistribution[i] || 0);
    }
  }

  combined.bestStreak = bestStreak;
  combined.currentStreak = currentStreak;
  return combined;
}

// Track which words have been played per length to avoid repeats
export function getWordsPlayed(length) {
  return storageGet(`wordsPlayed_${length}`, []);
}

export function addWordPlayed(length, word) {
  const played = getWordsPlayed(length);
  if (!played.includes(word)) played.push(word);
  storageSet(`wordsPlayed_${length}`, played);
}

export function resetWordsPlayed(length) {
  storageSet(`wordsPlayed_${length}`, []);
}
