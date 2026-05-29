// app.js — Main game controller for Aussie Word Challenge
import { WORDS_4 } from './words/words-4.js';
import { WORDS_5 } from './words/words-5.js';
import { WORDS_6 } from './words/words-6.js';
import { WORDS_7 } from './words/words-7.js';
import { VALID_GUESSES_4 } from './words/valid-guesses-4.js';
import { VALID_GUESSES_5 } from './words/valid-guesses-5.js';
import { VALID_GUESSES_6 } from './words/valid-guesses-6.js';
import { VALID_GUESSES_7 } from './words/valid-guesses-7.js';
import { storageGet, storageSet, getWordsPlayed, addWordPlayed, resetWordsPlayed } from './utils/storage.js';
import { calculateScore, getScoreBreakdown, getScoreLabel } from './utils/scoring.js';
import { recordGame } from './utils/stats.js';
import { renderStats } from './utils/stats.js';
import { pronounceWord, loadVoices, isSpeechSupported } from './utils/speech.js';

// ── Word lookup map for validation ───────────────────────────────────────────
const ALL_WORDS = {
  4: WORDS_4,
  5: WORDS_5,
  6: WORDS_6,
  7: WORDS_7,
};

// Build a fast Set of all words for guess validation (answers + extended guesses)
const VALID_WORDS_SET = new Set([
  ...WORDS_4.map(w => w.word),
  ...WORDS_5.map(w => w.word),
  ...WORDS_6.map(w => w.word),
  ...WORDS_7.map(w => w.word),
  ...VALID_GUESSES_4,
  ...VALID_GUESSES_5,
  ...VALID_GUESSES_6,
  ...VALID_GUESSES_7,
]);

// ── Game State ────────────────────────────────────────────────────────────────
let state = {
  screen: 'home',         // 'home' | 'game' | 'postgame' | 'stats' | 'howto'
  wordLength: null,       // 4 | 5 | 6 | 7
  targetWord: null,       // the word entry object
  maxGuesses: null,       // wordLength + 1
  currentGuess: [],       // letters typed so far
  guesses: [],            // array of submitted guess strings
  results: [],            // array of result arrays (['correct','present','absent', ...])
  cluesUsed: 0,           // 0-3
  clueRevealed: [false, false, false],
  gameOver: false,
  won: false,
  statsTab: 'all',        // 'all'|'4'|'5'|'6'|'7'
  letterStates: {},       // keyboard letter states
};

// ── Screen navigation ─────────────────────────────────────────────────────────
function showScreen(name) {
  state.screen = name;
  document.querySelectorAll('.screen').forEach(el => {
    el.hidden = el.dataset.screen !== name;
  });
}

// ── Word selection ────────────────────────────────────────────────────────────
function pickWord(length) {
  const list = ALL_WORDS[length];
  let played = getWordsPlayed(length);

  // Reset if all words have been played
  if (played.length >= list.length) {
    resetWordsPlayed(length);
    played = [];
  }

  // Filter unplayed words
  const unplayed = list.filter(w => !played.includes(w.word));
  const entry = unplayed[Math.floor(Math.random() * unplayed.length)];
  addWordPlayed(length, entry.word);
  return entry;
}

// ── Wordle guess evaluation ────────────────────────────────────────────────────
function evaluateGuess(guess, target) {
  const result = Array(guess.length).fill('absent');
  const targetArr = target.split('');
  const guessArr = guess.split('');

  // Pass 1: mark correct positions
  const usedTarget = Array(target.length).fill(false);
  const usedGuess = Array(guess.length).fill(false);

  for (let i = 0; i < guessArr.length; i++) {
    if (guessArr[i] === targetArr[i]) {
      result[i] = 'correct';
      usedTarget[i] = true;
      usedGuess[i] = true;
    }
  }

  // Pass 2: mark present (wrong position)
  for (let i = 0; i < guessArr.length; i++) {
    if (usedGuess[i]) continue;
    for (let j = 0; j < targetArr.length; j++) {
      if (!usedTarget[j] && guessArr[i] === targetArr[j]) {
        result[i] = 'present';
        usedTarget[j] = true;
        break;
      }
    }
  }

  return result;
}

// ── Update keyboard letter states ─────────────────────────────────────────────
function updateLetterStates(guess, result) {
  const priority = { correct: 3, present: 2, absent: 1 };
  for (let i = 0; i < guess.length; i++) {
    const letter = guess[i];
    const newState = result[i];
    const current = state.letterStates[letter];
    if (!current || priority[newState] > priority[current]) {
      state.letterStates[letter] = newState;
    }
  }
}

// ── Live score preview ────────────────────────────────────────────────────────
function previewScore() {
  const guessesUsed = state.guesses.length + 1;
  return Math.max(0, 100 - (guessesUsed - 1) * 10 - state.cluesUsed * 15);
}

// ── Start a new game ──────────────────────────────────────────────────────────
function startGame(length) {
  state.wordLength = length;
  state.targetWord = pickWord(length);
  state.maxGuesses = length + 1;
  state.currentGuess = [];
  state.guesses = [];
  state.results = [];
  state.cluesUsed = 0;
  state.clueRevealed = [false, false, false];
  state.gameOver = false;
  state.won = false;
  state.letterStates = {};

  renderGame();
  showScreen('game');
}

// ── Render game screen ────────────────────────────────────────────────────────
function renderGame() {
  const screen = document.querySelector('[data-screen="game"]');

  // Header info
  screen.querySelector('.word-length-badge').textContent = `${state.wordLength} letters`;
  screen.querySelector('.guesses-left').textContent = `${state.maxGuesses - state.guesses.length} guesses left`;
  screen.querySelector('.score-preview').textContent = `Score: ${previewScore()}`;

  // Render clue buttons
  renderClues();

  // Render grid
  renderGrid();

  // Render keyboard
  renderKeyboard();
}

function renderClues() {
  const clueContainer = document.querySelector('.clue-buttons');
  const clueData = [
    { label: '🔒 Repeating letters?', answer: state.targetWord.hasRepeatingLetters ? 'Yes — it has repeating letters!' : 'No — all letters are unique.' },
    { label: '🔒 Rare letters?', answer: state.targetWord.hasRareLetters ? 'Yes — it contains a rare letter (Z, Q, X, J, K, V or W)!' : 'No — no rare letters.' },
    { label: '🔒 Definition', answer: state.targetWord.definition },
  ];

  clueContainer.innerHTML = clueData.map((c, i) => {
    const used = state.clueRevealed[i];
    return `
      <div class="clue-item ${used ? 'revealed' : ''}">
        ${used
          ? `<span class="clue-answer" aria-live="polite">${c.answer}</span>`
          : `<button class="clue-btn" data-clue="${i}" aria-label="Use clue ${i + 1}: ${c.label}">${c.label}</button>`
        }
      </div>
    `;
  }).join('');

  // Attach click events
  clueContainer.querySelectorAll('.clue-btn').forEach(btn => {
    btn.addEventListener('click', () => useClue(parseInt(btn.dataset.clue)));
  });

  // Show clues remaining
  const remaining = document.querySelector('.clues-remaining');
  if (remaining) {
    remaining.textContent = `${3 - state.cluesUsed} clue${3 - state.cluesUsed !== 1 ? 's' : ''} remaining`;
  }
}

function renderGrid() {
  const grid = document.querySelector('.guess-grid');
  grid.style.setProperty('--word-length', state.wordLength);
  grid.style.setProperty('--max-guesses', state.maxGuesses);
  grid.innerHTML = '';

  for (let row = 0; row < state.maxGuesses; row++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'grid-row';
    rowEl.setAttribute('role', 'row');

    for (let col = 0; col < state.wordLength; col++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.setAttribute('role', 'gridcell');

      if (row < state.guesses.length) {
        // Submitted row
        const letter = state.guesses[row][col] || '';
        const result = state.results[row][col];
        tile.textContent = letter.toUpperCase();
        tile.dataset.state = result;
        tile.setAttribute('aria-label', `${letter.toUpperCase()}: ${result}`);
        tile.style.animationDelay = `${col * 100}ms`;
        tile.classList.add('flip');
      } else if (row === state.guesses.length && !state.gameOver) {
        // Current row
        const letter = state.currentGuess[col] || '';
        tile.textContent = letter.toUpperCase();
        if (letter) tile.dataset.state = 'tbd';
        tile.setAttribute('aria-label', letter ? letter.toUpperCase() : 'empty');
      } else {
        tile.setAttribute('aria-label', 'empty');
      }

      rowEl.appendChild(tile);
    }

    grid.appendChild(rowEl);
  }
}

function renderKeyboard() {
  const rows = [
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l'],
    ['Enter','z','x','c','v','b','n','m','⌫'],
  ];

  const kb = document.querySelector('.keyboard');
  kb.innerHTML = rows.map(row =>
    `<div class="key-row">${row.map(key => {
      const isAction = key === 'Enter' || key === '⌫';
      const state_ = state.letterStates[key] || '';
      return `<button class="key ${isAction ? 'key-action' : ''}"
        data-key="${key}"
        data-state="${state_}"
        aria-label="${key === '⌫' ? 'Backspace' : key}">
        ${key === 'Enter' ? 'Enter' : key.toUpperCase()}
      </button>`;
    }).join('')}</div>`
  ).join('');

  kb.querySelectorAll('.key').forEach(btn => {
    btn.addEventListener('click', () => handleKey(btn.dataset.key));
  });
}

// ── Screen readers: announce guess result ─────────────────────────────────────
function announceResult(guess, result) {
  const announcer = document.getElementById('aria-announcer');
  const msg = guess.split('').map((letter, i) => {
    const label = { correct: 'correct position', present: 'wrong position', absent: 'not in word' }[result[i]];
    return `${letter.toUpperCase()}: ${label}`;
  }).join('. ');
  announcer.textContent = msg;
}

// ── Targeted row renderers (avoid re-animating submitted rows on every keystroke) ──

/** Update only the current (active) row — called while typing. */
function renderCurrentRow() {
  const rows = document.querySelectorAll('.grid-row');
  const row = rows[state.guesses.length];
  if (!row) return;
  const tiles = row.querySelectorAll('.tile');
  tiles.forEach((tile, col) => {
    const letter = state.currentGuess[col] || '';
    tile.textContent = letter.toUpperCase();
    if (letter) {
      tile.dataset.state = 'tbd';
    } else {
      delete tile.dataset.state;
    }
    tile.setAttribute('aria-label', letter ? letter.toUpperCase() : 'empty');
  });
}

/** Flip-reveal the row that was just submitted (called once per submission). */
function revealSubmittedRow(rowIndex) {
  const rows = document.querySelectorAll('.grid-row');
  const row = rows[rowIndex];
  if (!row) return;
  const guess = state.guesses[rowIndex];
  const result = state.results[rowIndex];
  const tiles = row.querySelectorAll('.tile');
  tiles.forEach((tile, col) => {
    tile.textContent = guess[col].toUpperCase();
    tile.dataset.state = result[col];
    tile.setAttribute('aria-label', `${guess[col].toUpperCase()}: ${result[col]}`);
    tile.style.animationDelay = `${col * 100}ms`;
    tile.classList.add('flip');
  });
}

// ── Key input ─────────────────────────────────────────────────────────────────
function handleKey(key) {
  if (state.gameOver) return;

  if (key === '⌫' || key === 'Backspace') {
    state.currentGuess.pop();
    renderCurrentRow();
    return;
  }

  if (key === 'Enter') {
    submitGuess();
    return;
  }

  if (/^[a-zA-Z]$/.test(key) && state.currentGuess.length < state.wordLength) {
    state.currentGuess.push(key.toLowerCase());
    renderCurrentRow();
  }
}

function submitGuess() {
  if (state.currentGuess.length < state.wordLength) {
    showToast('Not enough letters! 😊');
    shakeCurrentRow();
    return;
  }

  const guess = state.currentGuess.join('');

  // Validate against word lists
  if (!VALID_WORDS_SET.has(guess)) {
    showToast("Not a word I know! Try again 😊");
    shakeCurrentRow();
    return;
  }

  const result = evaluateGuess(guess, state.targetWord.word);
  state.guesses.push(guess);
  state.results.push(result);
  updateLetterStates(guess, result);
  const submittedRowIndex = state.guesses.length - 1;
  state.currentGuess = [];

  revealSubmittedRow(submittedRowIndex);
  renderCurrentRow();
  renderKeyboard();

  // SR announcement
  setTimeout(() => announceResult(guess, result), 800);

  // Update score preview
  const scoreEl = document.querySelector('.score-preview');
  if (scoreEl) scoreEl.textContent = `Score: ${previewScore()}`;

  // Update guesses left
  const guessesLeftEl = document.querySelector('.guesses-left');
  if (guessesLeftEl) guessesLeftEl.textContent = `${state.maxGuesses - state.guesses.length} guesses left`;

  // Check win/loss
  if (guess === state.targetWord.word) {
    state.won = true;
    state.gameOver = true;
    setTimeout(triggerWin, 600);
  } else if (state.guesses.length >= state.maxGuesses) {
    state.gameOver = true;
    setTimeout(triggerLoss, 600);
  }
}

// ── Clue handling ─────────────────────────────────────────────────────────────
function useClue(index) {
  if (state.clueRevealed[index] || state.gameOver) return;
  state.clueRevealed[index] = true;
  state.cluesUsed++;
  renderClues();

  // Update score preview
  const scoreEl = document.querySelector('.score-preview');
  if (scoreEl) scoreEl.textContent = `Score: ${previewScore()}`;
}

// ── Win / Loss ────────────────────────────────────────────────────────────────
function triggerWin() {
  const breakdown = getScoreBreakdown({ won: true, guessesUsed: state.guesses.length, cluesUsed: state.cluesUsed });
  recordGame(state.wordLength, { won: true, guessesUsed: state.guesses.length, cluesUsed: state.cluesUsed, score: breakdown.total });
  showConfetti();
  showPostGame(breakdown);
}

function triggerLoss() {
  const breakdown = getScoreBreakdown({ won: false, guessesUsed: state.guesses.length, cluesUsed: state.cluesUsed });
  recordGame(state.wordLength, { won: false, guessesUsed: state.guesses.length, cluesUsed: state.cluesUsed, score: 0 });
  showPostGame(breakdown);
}

function showPostGame(breakdown) {
  const screen = document.querySelector('[data-screen="postgame"]');

  // Outcome banner
  const banner = screen.querySelector('.outcome-banner');
  banner.className = `outcome-banner ${state.won ? 'win' : 'loss'}`;
  banner.innerHTML = state.won
    ? `<span class="outcome-icon">✅</span><span class="outcome-text">Ripper! You got it!</span>`
    : `<span class="outcome-icon">❌</span><span class="outcome-text">Better luck next time! 🤙</span>`;

  // Word reveal
  screen.querySelector('.word-reveal').textContent = state.targetWord.word.toUpperCase();

  // Definition
  screen.querySelector('.word-definition').textContent = state.targetWord.definition;

  // Pronunciation
  const phonetic = screen.querySelector('.phonetic-hint');
  phonetic.textContent = `How to say it: "${state.targetWord.pronunciation}"`;

  const speakBtn = screen.querySelector('.speak-btn');
  if (isSpeechSupported()) {
    speakBtn.hidden = false;
    speakBtn.onclick = () => pronounceWord(state.targetWord.word);
  } else {
    speakBtn.hidden = true;
  }

  // Score breakdown
  const scoreSection = screen.querySelector('.score-breakdown');
  if (state.won) {
    scoreSection.innerHTML = `
      <div class="score-total">${breakdown.total} points</div>
      <div class="score-label">${getScoreLabel(breakdown.total)}</div>
      <ul class="score-details">
        <li>Base score: <strong>100</strong></li>
        <li>Guess penalty: <strong>−${breakdown.guessPenalty}</strong> (${state.guesses.length} guess${state.guesses.length !== 1 ? 'es' : ''})</li>
        <li>Clue penalty: <strong>−${breakdown.cluePenalty}</strong> (${state.cluesUsed} clue${state.cluesUsed !== 1 ? 's' : ''} used)</li>
      </ul>
    `;
  } else {
    scoreSection.innerHTML = `
      <div class="score-total">0 points</div>
      <div class="score-label">Don't give up — have another crack! 💪</div>
    `;
  }

  showScreen('postgame');
}

// ── Confetti ──────────────────────────────────────────────────────────────────
function showConfetti() {
  const colours = ['#FFD166', '#EF476F', '#06A6D1', '#3CB371', '#E9C46A', '#7C3AED'];
  const container = document.body;

  for (let i = 0; i < 100; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left: ${Math.random() * 100}vw;
      background: ${colours[Math.floor(Math.random() * colours.length)]};
      width: ${6 + Math.random() * 8}px;
      height: ${10 + Math.random() * 8}px;
      animation-delay: ${Math.random() * 0.6}s;
      animation-duration: ${1.2 + Math.random() * 1.2}s;
      transform: rotate(${Math.random() * 360}deg);
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    container.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove());
  }
}

// ── Toast notifications ───────────────────────────────────────────────────────
let toastTimer;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2200);
}

// ── Shake animation for invalid guesses ──────────────────────────────────────
function shakeCurrentRow() {
  const rows = document.querySelectorAll('.grid-row');
  const currentRow = rows[state.guesses.length];
  if (!currentRow) return;
  currentRow.classList.remove('shake');
  void currentRow.offsetWidth; // reflow
  currentRow.classList.add('shake');
  currentRow.addEventListener('animationend', () => currentRow.classList.remove('shake'), { once: true });
}

// ── Stats screen ──────────────────────────────────────────────────────────────
function showStats() {
  renderStats(document.querySelector('.stats-content'), state.statsTab);

  // Update tab buttons
  document.querySelectorAll('.stats-tab').forEach(btn => {
    btn.setAttribute('aria-selected', btn.dataset.tab === state.statsTab ? 'true' : 'false');
    btn.classList.toggle('active', btn.dataset.tab === state.statsTab);
  });

  showScreen('stats');
}

// ── How to Play ───────────────────────────────────────────────────────────────
function showHowToPlay() {
  showScreen('howto');
}

// ── Home screen streak badge ──────────────────────────────────────────────────
function updateHomeStreak() {
  const { getCombinedStats } = window._statsModule || {};
  try {
    const stats = JSON.parse(localStorage.getItem('aussieWordChallenge_stats_all') || 'null');
    // We just use a simple badge
    const badge = document.querySelector('.streak-badge');
    if (badge) {
      const s4 = JSON.parse(localStorage.getItem('aussieWordChallenge_stats_4') || '{}');
      const s5 = JSON.parse(localStorage.getItem('aussieWordChallenge_stats_5') || '{}');
      const s6 = JSON.parse(localStorage.getItem('aussieWordChallenge_stats_6') || '{}');
      const s7 = JSON.parse(localStorage.getItem('aussieWordChallenge_stats_7') || '{}');
      const totalScore = (s4.totalScore || 0) + (s5.totalScore || 0) + (s6.totalScore || 0) + (s7.totalScore || 0);
      const bestStreak = Math.max(s4.bestStreak || 0, s5.bestStreak || 0, s6.bestStreak || 0, s7.bestStreak || 0);
      badge.innerHTML = `🔥 Streak: ${bestStreak} &nbsp;|&nbsp; 🏆 Score: ${totalScore}`;
    }
  } catch { /* ignore */ }
}

// ── Keyboard event listener ───────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (state.screen !== 'game') return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  handleKey(e.key);
});

// ── Button event wiring ───────────────────────────────────────────────────────
function wireButtons() {
  // Home screen — word length selection
  document.querySelectorAll('.length-btn').forEach(btn => {
    btn.addEventListener('click', () => startGame(parseInt(btn.dataset.length)));
  });

  // Game screen — back to home
  document.querySelector('.btn-home')?.addEventListener('click', () => showScreen('home'));

  // Game screen — show stats
  document.querySelector('.btn-stats-game')?.addEventListener('click', showStats);

  // Post-game buttons
  document.querySelector('.btn-play-again')?.addEventListener('click', () => startGame(state.wordLength));
  document.querySelector('.btn-change-length')?.addEventListener('click', () => showScreen('home'));
  document.querySelector('.btn-view-stats')?.addEventListener('click', showStats);

  // Stats screen tabs
  document.querySelectorAll('.stats-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.statsTab = btn.dataset.tab;
      showStats();
    });
  });

  // Stats back button
  document.querySelector('.btn-stats-back')?.addEventListener('click', () => {
    if (state.gameOver) {
      showScreen('postgame');
    } else if (state.guesses.length > 0) {
      showScreen('game');
    } else {
      showScreen('home');
    }
  });

  // How to play
  document.querySelector('.btn-howto')?.addEventListener('click', showHowToPlay);
  document.querySelector('.btn-howto-back')?.addEventListener('click', () => showScreen('home'));

  // Home — stats button
  document.querySelector('.btn-home-stats')?.addEventListener('click', showStats);
}

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  // Wire buttons immediately — don't block on speech API
  wireButtons();
  updateHomeStreak();
  showScreen('home');
  // Load voices in background so pronunciation is ready when needed
  loadVoices().catch(() => {});
}

init();
