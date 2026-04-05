// game.js — Game state management and logic

const MAX_GUESSES = 6;

// Game state
let state = {
  card: null,          // current card object
  mode: 'unlimited',   // 'unlimited' | 'daily'
  lang: 'fr',
  guessesLeft: MAX_GUESSES,
  wrongGuesses: [],    // array of { id, name } for wrong guesses
  wrongIds: new Set(), // set of wrong guess card IDs (for fast lookup)
  status: 'playing',   // 'playing' | 'won' | 'lost'
  score: 0,
  streak: 0,
  hintsRevealed: 0,    // number of hints currently shown
  dailyDate: null,     // date string for daily mode
};

// localStorage keys
const LS_SCORE = 'hearthblur_score';
const LS_STREAK = 'hearthblur_streak';
const LS_DAILY_PREFIX = 'hearthblur_daily_';
const LS_MODE = 'hearthblur_mode';

// Seeded PRNG
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateToSeed(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function getTodayString() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Initialize a new game round.
 * @param {string} mode - 'unlimited' | 'daily'
 * @param {string} lang
 */
function initGame(mode, lang) {
  state.mode = mode;
  state.lang = lang;
  state.guessesLeft = MAX_GUESSES;
  state.wrongGuesses = [];
  state.wrongIds = new Set();
  state.hintsRevealed = 0;
  state.status = 'playing';

  // Load persisted score/streak
  state.score = parseInt(localStorage.getItem(LS_SCORE) || '0', 10);
  state.streak = parseInt(localStorage.getItem(LS_STREAK) || '0', 10);

  if (mode === 'daily') {
    const dateStr = getTodayString();
    state.dailyDate = dateStr;

    // Check for saved daily state
    const savedDaily = loadDailyState(dateStr);
    if (savedDaily) {
      // Already played today — restore final state
      Object.assign(state, savedDaily);
      state.wrongIds = new Set(state.wrongGuesses.map(g => g.id));
      return { restored: true };
    }

    // Pick today's card using seeded PRNG
    const seed = dateToSeed(dateStr);
    const rng = mulberry32(seed);
    state.card = getSeededCard(rng);
  } else {
    state.card = getRandomCard();
  }

  return { restored: false };
}

/**
 * Submit a guess.
 * @param {object} card - the guessed card object
 * @returns {{ result: 'correct'|'wrong'|'already_guessed'|'game_over' }}
 */
function submitGuess(card) {
  if (state.status !== 'playing') return { result: 'game_over' };
  if (state.wrongIds.has(card.id)) return { result: 'already_guessed' };

  const isCorrect = card.id === state.card.id;

  if (isCorrect) {
    state.status = 'won';
    state.score++;
    state.streak++;
    saveScore();
    if (state.mode === 'daily') saveDailyState();
    return { result: 'correct' };
  }

  // Wrong guess
  state.wrongGuesses.push({ id: card.id, name: card.name });
  state.wrongIds.add(card.id);
  state.guessesLeft--;
  state.hintsRevealed = Math.min(state.hintsRevealed + 1, HINT_SEQUENCE.length);

  if (state.guessesLeft === 0) {
    state.status = 'lost';
    state.streak = 0;
    saveScore();
    if (state.mode === 'daily') saveDailyState();
    return { result: 'lost' };
  }

  if (state.mode === 'daily') saveDailyState();
  return { result: 'wrong', hintsRevealed: state.hintsRevealed };
}

/**
 * Skip the current card (counts as a loss for streak, but no score change).
 */
function skipCard() {
  if (state.status !== 'playing') return;
  state.status = 'lost';
  state.streak = 0;
  saveScore();
  if (state.mode === 'daily') saveDailyState();
}

function getState() {
  return state;
}

function saveScore() {
  localStorage.setItem(LS_SCORE, String(state.score));
  localStorage.setItem(LS_STREAK, String(state.streak));
}

function saveDailyState() {
  const key = LS_DAILY_PREFIX + state.dailyDate;
  const toSave = {
    card: state.card,
    status: state.status,
    guessesLeft: state.guessesLeft,
    wrongGuesses: state.wrongGuesses,
    hintsRevealed: state.hintsRevealed,
    score: state.score,
    streak: state.streak,
    mode: state.mode,
    dailyDate: state.dailyDate,
  };
  try {
    localStorage.setItem(key, JSON.stringify(toSave));
  } catch (e) {}
}

function loadDailyState(dateStr) {
  try {
    const key = LS_DAILY_PREFIX + dateStr;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function getSavedMode() {
  return localStorage.getItem(LS_MODE) || 'unlimited';
}

function saveMode(mode) {
  localStorage.setItem(LS_MODE, mode);
}
