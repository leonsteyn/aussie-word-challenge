// scoring.js — Score calculation for Aussie Word Challenge

/**
 * Calculate the score for a completed game.
 * base_score = 100
 * guess_penalty = (guessesUsed - 1) * 10
 * clue_penalty = cluesUsed * 15
 * score = max(0, base_score - guess_penalty - clue_penalty)
 * Loss = 0 points always.
 */
export function calculateScore({ won, guessesUsed, cluesUsed }) {
  if (!won) return 0;
  const base = 100;
  const guessPenalty = (guessesUsed - 1) * 10;
  const cluePenalty = cluesUsed * 15;
  return Math.max(0, base - guessPenalty - cluePenalty);
}

export function getScoreBreakdown({ won, guessesUsed, cluesUsed }) {
  if (!won) {
    return { base: 100, guessPenalty: 0, cluePenalty: 0, total: 0, won: false };
  }
  const base = 100;
  const guessPenalty = (guessesUsed - 1) * 10;
  const cluePenalty = cluesUsed * 15;
  const total = Math.max(0, base - guessPenalty - cluePenalty);
  return { base, guessPenalty, cluePenalty, total, won: true };
}

// Descriptive label for score ranges
export function getScoreLabel(score) {
  if (score === 100) return "Perfect! 🌟";
  if (score >= 80) return "Ripper! 🎉";
  if (score >= 60) return "Good on ya! 👍";
  if (score >= 40) return "Not bad! 😊";
  if (score >= 20) return "Keep at it! 💪";
  if (score > 0)  return "You got there! 🦘";
  return "Better luck next time! 🤙";
}
