// stats.js — Statistics tracking, update, and rendering

import { getStats, saveStats, getCombinedStats } from './storage.js';

/**
 * Update stats after a game completes.
 * @param {number} length - Word length (4-7)
 * @param {object} result - { won, guessesUsed, cluesUsed, score, word }
 */
export function recordGame(length, { won, guessesUsed, cluesUsed, score }) {
  const stats = getStats(length);

  stats.gamesPlayed += 1;

  if (won) {
    stats.gamesWon += 1;
    stats.currentStreak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    stats.guessDistribution[guessesUsed] = (stats.guessDistribution[guessesUsed] || 0) + 1;
  } else {
    stats.currentStreak = 0;
  }

  stats.totalScore += score;
  stats.clueUsageDistribution[cluesUsed] = (stats.clueUsageDistribution[cluesUsed] || 0) + 1;

  saveStats(length, stats);
}

// Compute average score (avoid division by zero)
function averageScore(stats) {
  if (stats.gamesWon === 0) return 0;
  return Math.round(stats.totalScore / stats.gamesWon);
}

// Win rate percentage
function winRate(stats) {
  if (stats.gamesPlayed === 0) return 0;
  return Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
}

/**
 * Render the full stats panel into a container element.
 * @param {HTMLElement} container
 * @param {string|number} activeLength - '4','5','6','7', or 'all'
 */
export function renderStats(container, activeLength = 'all') {
  const stats = activeLength === 'all' ? getCombinedStats() : getStats(Number(activeLength));

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-box">
        <span class="stat-number">${stats.gamesPlayed}</span>
        <span class="stat-label">Played</span>
      </div>
      <div class="stat-box">
        <span class="stat-number">${winRate(stats)}%</span>
        <span class="stat-label">Win Rate</span>
      </div>
      <div class="stat-box">
        <span class="stat-number">${stats.currentStreak}</span>
        <span class="stat-label">Streak</span>
      </div>
      <div class="stat-box">
        <span class="stat-number">${stats.bestStreak}</span>
        <span class="stat-label">Best Streak</span>
      </div>
      <div class="stat-box">
        <span class="stat-number">${stats.totalScore}</span>
        <span class="stat-label">Total Score</span>
      </div>
      <div class="stat-box">
        <span class="stat-number">${averageScore(stats)}</span>
        <span class="stat-label">Avg Score</span>
      </div>
    </div>

    <div class="chart-section">
      <h3 class="chart-title">Guess Distribution</h3>
      ${renderBarChart(stats.guessDistribution, stats.gamesWon, 8, 'guess')}
    </div>

    <div class="chart-section">
      <h3 class="chart-title">Clue Usage</h3>
      ${renderBarChart(stats.clueUsageDistribution, stats.gamesPlayed, 3, 'clue')}
    </div>
  `;
}

function renderBarChart(distribution, total, maxKey, type) {
  const maxVal = Math.max(1, ...Object.values(distribution));
  let html = '<div class="bar-chart">';

  for (let i = (type === 'clue' ? 0 : 1); i <= maxKey; i++) {
    const count = distribution[i] || 0;
    const pct = Math.round((count / maxVal) * 100);
    const label = type === 'clue'
      ? (i === 0 ? 'No clues' : `${i} clue${i > 1 ? 's' : ''}`)
      : `${i}`;

    html += `
      <div class="bar-row">
        <span class="bar-label">${label}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%" aria-valuenow="${count}" aria-valuemax="${total}"></div>
        </div>
        <span class="bar-count">${count}</span>
      </div>
    `;
  }

  html += '</div>';
  return html;
}
