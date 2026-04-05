// main.js — App initialization, language loading, mode switching

const LS_LANG = 'hearthblur_lang';
const MAX_GUESSES_UI = 7;

let _lang = 'fr';
let _mode = 'unlimited';
let _initialized = false;

async function boot() {
  // Read stored preferences
  _lang = localStorage.getItem(LS_LANG) || 'fr';
  _mode = getSavedMode();

  // Init canvas
  initCanvas(document.getElementById('card-canvas'));

  // Init UI event bindings
  initUI({
    onGuessSubmit: handleGuess,
    onSkip: handleSkip,
    onNextCard: handleNextCard,
    onModeChange: handleModeChange,
    onLangChange: handleLangChange,
    onShare: handleShare,
    onHowTo: null,
  });

  // Apply initial lang strings
  updateAllStrings(_lang);
  setActiveMode(_mode, _lang);

  // Load cards
  showLoading(_lang);
  try {
    await loadCards(_lang);
  } catch (e) {
    hideLoading();
    alert(i18n[_lang].loading + ' (erreur réseau)');
    return;
  }
  hideLoading();

  _initialized = true;
  startNewRound();
}

function startNewRound() {
  const result = initGame(_mode, _lang);

  const gs = getState();

  // Update score display
  updateScore(gs.score, gs.streak);
  setActiveMode(_mode, _lang);

  // Reset UI
  hideResult();
  renderWrongGuesses([]);
  renderHints(gs.card, 0, _lang);
  updateTryCounter(gs.guessesLeft, MAX_GUESSES_UI, _lang);
  setCardAreaState('playing');

  if (result.restored) {
    // Daily game already completed — show final state
    renderWrongGuesses(gs.wrongGuesses);
    renderHints(gs.card, gs.wrongGuesses.length, _lang);
    updateTryCounter(gs.guessesLeft, MAX_GUESSES_UI, _lang);

    // Load & reveal the card image
    loadImage(getArtUrl(gs.card.id)).then(() => {
      revealFull(() => {
        setCardAreaState(gs.status === 'won' ? 'win' : 'lose');
      });
      showResult(gs.status === 'won', gs.card, _lang);
    }).catch(() => {});
    return;
  }

  if (!gs.card) {
    console.error('No card available');
    return;
  }

  // Load card art at level 0
  loadImage(getArtUrl(gs.card.id)).then(() => {
    renderLevel(0);
  }).catch(() => {
    console.error('Failed to load card art');
  });
}

function handleGuess(card) {
  const gs = getState();
  if (gs.status !== 'playing') return;

  const result = submitGuess(card);
  const updatedGs = getState();

  if (result.result === 'already_guessed') return;

  if (result.result === 'correct') {
    updateScore(updatedGs.score, updatedGs.streak);
    renderLevel(7); // Full reveal
    revealFull(() => setCardAreaState('win'));
    renderHints(updatedGs.card, MAX_GUESSES_UI, _lang);
    renderWrongGuesses(updatedGs.wrongGuesses);
    updateTryCounter(updatedGs.guessesLeft, MAX_GUESSES_UI, _lang);
    showResult(true, updatedGs.card, _lang);
    return;
  }

  if (result.result === 'wrong' || result.result === 'lost') {
    // Advance pixelation level
    const used = MAX_GUESSES_UI - updatedGs.guessesLeft;
    renderLevel(Math.min(used, 6)); // levels 0-6 during wrong guesses

    renderWrongGuesses(updatedGs.wrongGuesses);
    renderHints(updatedGs.card, updatedGs.wrongGuesses.length, _lang);
    updateTryCounter(updatedGs.guessesLeft, MAX_GUESSES_UI, _lang);

    if (result.result === 'lost') {
      updateScore(updatedGs.score, updatedGs.streak);
      revealFull(() => setCardAreaState('lose'));
      showResult(false, updatedGs.card, _lang);
    }
  }
}

function handleSkip() {
  const gs = getState();
  if (gs.status !== 'playing') return;

  skipCard();
  const updatedGs = getState();
  updateScore(updatedGs.score, updatedGs.streak);
  revealFull(() => setCardAreaState('lose'));
  renderHints(updatedGs.card, MAX_GUESSES_UI, _lang);
  showResult(false, updatedGs.card, _lang);
}

function handleNextCard() {
  if (_mode === 'daily') {
    // Can't replay daily — just show the state
    return;
  }
  startNewRound();
}

function handleModeChange(mode) {
  if (mode === _mode) return;
  _mode = mode;
  saveMode(mode);
  setActiveMode(mode, _lang);

  if (!_initialized) return;
  startNewRound();
}

async function handleLangChange(lang) {
  if (lang === _lang) return;
  _lang = lang;
  localStorage.setItem(LS_LANG, lang);

  updateAllStrings(lang);

  // Reload card data in new locale (different card names)
  showLoading(lang);
  try {
    await loadCards(lang);
  } catch (e) {
    hideLoading();
    return;
  }
  hideLoading();

  // Re-render hints and other lang-sensitive UI with current game state
  const gs = getState();
  if (gs.card) {
    renderHints(gs.card, gs.wrongGuesses.length, lang);
    renderWrongGuesses(gs.wrongGuesses);
    updateTryCounter(gs.guessesLeft, MAX_GUESSES_UI, lang);
  }

  setActiveMode(_mode, lang);
}

function handleShare() {
  const gs = getState();
  const text = buildShareText({
    won: gs.status === 'won',
    wrongCount: gs.wrongGuesses.length,
    cardName: gs.card ? gs.card.name : '',
    streak: gs.streak,
    lang: _lang,
  });

  copyToClipboard(text).then(() => showShareToast(_lang));
}

// Boot on DOM ready
document.addEventListener('DOMContentLoaded', boot);
