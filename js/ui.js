// ui.js — DOM rendering, autocomplete, animations

let _autocompleteDebounce = null;
let _autocompleteHighlight = -1;
let _autocompleteResults = [];
let _onGuessSubmit = null; // callback(card)
let _onSkip = null;        // callback()
let _onNextCard = null;    // callback()
let _onModeChange = null;  // callback(mode)
let _onLangChange = null;  // callback(lang)
let _onShare = null;       // callback()
let _onHowTo = null;       // callback()

// DOM element refs (set in initUI)
const el = {};

function initUI(callbacks) {
  _onGuessSubmit = callbacks.onGuessSubmit;
  _onSkip = callbacks.onSkip;
  _onNextCard = callbacks.onNextCard;
  _onModeChange = callbacks.onModeChange;
  _onLangChange = callbacks.onLangChange;
  _onShare = callbacks.onShare;
  _onHowTo = callbacks.onHowTo;

  // Cache DOM refs
  el.canvas = document.getElementById('card-canvas');
  el.tryCounter = document.getElementById('try-counter');
  el.guessDots = document.getElementById('guess-dots');
  el.hintsContainer = document.getElementById('hints-container');
  el.wrongGuesses = document.getElementById('wrong-guesses');
  el.searchInput = document.getElementById('search-input');
  el.autocompleteList = document.getElementById('autocomplete-list');
  el.skipBtn = document.getElementById('skip-btn');
  el.nextBtn = document.getElementById('next-btn');
  el.shareBtn = document.getElementById('share-btn');
  el.modeBtns = document.querySelectorAll('.mode-btn'); // empty after daily removal
  el.langBtn = document.getElementById('lang-btn');
  el.loadingOverlay = document.getElementById('loading-overlay');
  el.resultOverlay = document.getElementById('result-overlay');
  el.resultText = document.getElementById('result-text');
  el.resultCard = document.getElementById('result-card');
  el.howToBtn = document.getElementById('how-to-btn');
  el.howToModal = document.getElementById('how-to-modal');
  el.howToClose = document.getElementById('how-to-close');
  el.scoreEl = document.getElementById('score-value');
  el.streakEl = document.getElementById('streak-value');
  el.subtitle = document.getElementById('subtitle');
  el.searchWrapper = document.getElementById('search-wrapper');
  el.shareToast = document.getElementById('share-toast');

  // Bind events
  el.searchInput.addEventListener('input', onSearchInput);
  el.searchInput.addEventListener('keydown', onSearchKeydown);
  el.searchInput.addEventListener('focus', () => {
    if (el.searchInput.value.trim()) triggerSearch(el.searchInput.value);
  });

  document.addEventListener('click', (e) => {
    if (!el.searchWrapper.contains(e.target)) closeAutocomplete();
  });

  el.skipBtn.addEventListener('click', () => _onSkip && _onSkip());
  el.nextBtn.addEventListener('click', () => _onNextCard && _onNextCard());
  el.shareBtn.addEventListener('click', () => _onShare && _onShare());
  el.howToBtn.addEventListener('click', () => toggleHowTo(true));
  el.howToClose.addEventListener('click', () => toggleHowTo(false));

  el.modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      _onModeChange && _onModeChange(mode);
    });
  });

  el.langBtn.addEventListener('click', () => {
    const current = el.langBtn.dataset.lang;
    const next = current === 'fr' ? 'en' : 'fr';
    _onLangChange && _onLangChange(next);
  });

  el.howToModal.addEventListener('click', (e) => {
    if (e.target === el.howToModal) toggleHowTo(false);
  });
}

// ---- Loading ----

function showLoading(lang) {
  const t = i18n[lang];
  el.loadingOverlay.querySelector('.loading-text').textContent = t.loading;
  el.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  el.loadingOverlay.classList.add('hidden');
}

// ---- Score / Streak ----

function updateScore(score, streak) {
  el.scoreEl.textContent = score;
  el.streakEl.textContent = streak;
}

// ---- Mode buttons ----

function setActiveMode(mode, lang) {
  const t = i18n[lang];
  el.modeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
    btn.textContent = btn.dataset.mode === 'daily' ? t.daily : t.unlimited;
  });
}

// ---- Language button ----

function setLang(lang) {
  el.langBtn.dataset.lang = lang;
  el.langBtn.textContent = '🌐 ' + lang.toUpperCase();
}

// ---- Try counter ----

function updateTryCounter(guessesLeft, totalGuesses, lang) {
  const t = i18n[lang];
  const used = totalGuesses - guessesLeft;
  el.tryCounter.textContent = `${t.tryLabel} ${used}/${totalGuesses}`;

  // Update dots
  let dots = '';
  for (let i = 0; i < totalGuesses; i++) {
    if (i < used) {
      dots += '<span class="dot dot-used"></span>';
    } else {
      dots += '<span class="dot dot-empty"></span>';
    }
  }
  el.guessDots.innerHTML = dots;

  // Update remaining text
  const remaining = document.getElementById('remaining-text');
  if (remaining) remaining.textContent = `${guessesLeft} ${t.remaining}`;
}

// ---- Hints ----

function renderHints(card, wrongGuessCount, lang) {
  const baseInfo = getBaseInfo(card, lang);
  const hints = getAllHints(card, wrongGuessCount, lang);

  // Render base info ABOVE the card (set + type + rarity)
  const baseContainer = document.getElementById('card-info-items');
  if (baseContainer) {
    baseContainer.innerHTML = '';
    baseInfo.forEach(info => {
      const item = document.createElement('div');
      item.className = 'card-info-item';
      const iconHtml = info.iconImg
        ? `<img src="${info.iconImg}" class="info-icon-img" alt="">`
        : `<span class="hint-icon">${info.icon}</span>`;
      item.innerHTML = `${iconHtml}<span class="info-label">${escHtml(info.label)}:</span><span class="info-value">${escHtml(info.value)}</span>`;
      baseContainer.appendChild(item);
    });
  }

  el.hintsContainer.innerHTML = '';

  // Render progressive hints
  hints.forEach(hint => {
    const chip = document.createElement('div');
    chip.className = 'hint-chip' + (hint.revealed ? ' hint-revealed' : ' hint-locked');

    if (hint.type === 'text' && hint.revealed) {
      chip.classList.add('hint-text-full');
    }

    chip.setAttribute('aria-label', hint.revealed ? `${hint.label}: ${hint.value}` : `${hint.label} verrouillé`);

    if (hint.revealed) {
      const iconHtml = hint.iconImg
        ? `<span class="hint-icon"><img src="${hint.iconImg}" class="hint-icon-img" alt=""></span>`
        : `<span class="hint-icon">${hint.icon}</span>`;
      chip.innerHTML = `${iconHtml}<span class="hint-label">${escHtml(hint.label)}:</span><span class="hint-value">${escHtml(hint.value)}</span>`;
    } else {
      const unlockLabel = lang === 'fr' ? `essai ${hint.unlockAt}` : `guess ${hint.unlockAt}`;
      chip.innerHTML = `<span class="hint-icon">🔒</span><span class="hint-label">${escHtml(hint.label)}</span><span class="hint-unlock">(${unlockLabel})</span>`;
    }

    el.hintsContainer.appendChild(chip);
  });
}

// ---- Wrong guesses ----

function renderWrongGuesses(wrongGuesses) {
  el.wrongGuesses.innerHTML = '';
  wrongGuesses.forEach(g => {
    const pill = document.createElement('span');
    pill.className = 'wrong-pill';
    pill.textContent = '✕ ' + g.name;
    el.wrongGuesses.appendChild(pill);
  });
}

// ---- Result overlay ----

function showResult(won, card, lang) {
  const t = i18n[lang];
  el.resultOverlay.className = 'result-overlay ' + (won ? 'result-win' : 'result-lose');
  el.resultText.textContent = won ? t.win : t.lose;
  el.resultCard.textContent = won ? '' : card.name;
  el.resultOverlay.classList.remove('hidden');

  // Show share + next buttons
  el.shareBtn.classList.remove('hidden');
  el.nextBtn.classList.remove('hidden');
  el.nextBtn.textContent = t.next;
  el.shareBtn.textContent = t.share;

  // Hide skip + search
  el.skipBtn.classList.add('hidden');
  el.searchWrapper.classList.add('hidden');
}

function hideResult() {
  el.resultOverlay.classList.add('hidden');
  el.shareBtn.classList.add('hidden');
  el.nextBtn.classList.add('hidden');
  el.skipBtn.classList.remove('hidden');
  el.searchWrapper.classList.remove('hidden');
}

// ---- How-to modal ----

function toggleHowTo(show) {
  el.howToModal.classList.toggle('hidden', !show);
  if (show) el.howToModal.focus();
}

function updateHowToText(lang) {
  const t = i18n[lang];
  document.getElementById('how-to-title').textContent = t.howTo;
  document.getElementById('how-to-body').textContent = t.howToText;
  el.howToClose.textContent = t.howToClose;
}

// ---- UI strings update (on lang switch) ----

function updateAllStrings(lang) {
  const t = i18n[lang];
  document.getElementById('app-title').textContent = t.title;
  el.subtitle.textContent = t.subtitle;
  el.searchInput.placeholder = t.search;
  el.skipBtn.textContent = t.skip;
  document.getElementById('score-label').textContent = t.score + ':';
  document.getElementById('streak-label').textContent = t.streak + ':';
  document.getElementById('hints-label').textContent = t.hints;
  document.getElementById('wrong-label').textContent = t.wrongGuesses;
  setLang(lang);
  updateHowToText(lang);
}

// ---- Autocomplete ----

function onSearchInput(e) {
  clearTimeout(_autocompleteDebounce);
  const q = e.target.value;
  if (!q.trim()) {
    closeAutocomplete();
    return;
  }
  _autocompleteDebounce = setTimeout(() => triggerSearch(q), 150);
}

function triggerSearch(q) {
  const gs = getState();
  const results = searchCards(q, 8, gs.wrongIds);
  _autocompleteResults = results;
  renderAutocomplete(results, gs.lang);
}

function renderAutocomplete(results, lang) {
  const t = i18n[lang];
  _autocompleteHighlight = -1;
  el.autocompleteList.innerHTML = '';

  if (results.length === 0) {
    el.autocompleteList.innerHTML = `<li class="autocomplete-empty">${t.noResults}</li>`;
    el.autocompleteList.classList.remove('hidden');
    return;
  }

  results.forEach((r, idx) => {
    const li = document.createElement('li');
    li.className = 'autocomplete-item' + (r.alreadyGuessed ? ' already-guessed' : '');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');
    li.dataset.idx = idx;

    const cost = r.card.cost != null ? r.card.cost : '?';
    const cls = r.card.cardClass || '';
    const alreadyLabel = r.alreadyGuessed ? `<span class="already-label">${t.alreadyGuessed}</span>` : '';

    li.innerHTML = `
      <span class="ac-cost">${escHtml(String(cost))}</span>
      <span class="ac-name">${escHtml(r.card.name)}</span>
      <span class="ac-class">${escHtml(cls)}</span>
      ${alreadyLabel}
    `;

    if (!r.alreadyGuessed) {
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectAutocomplete(idx);
      });
    }

    el.autocompleteList.appendChild(li);
  });

  el.autocompleteList.classList.remove('hidden');
}

function onSearchKeydown(e) {
  const items = el.autocompleteList.querySelectorAll('.autocomplete-item:not(.already-guessed)');

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    _autocompleteHighlight = Math.min(_autocompleteHighlight + 1, items.length - 1);
    updateHighlight(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    _autocompleteHighlight = Math.max(_autocompleteHighlight - 1, 0);
    updateHighlight(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (_autocompleteHighlight >= 0 && items[_autocompleteHighlight]) {
      const idx = parseInt(items[_autocompleteHighlight].dataset.idx, 10);
      selectAutocomplete(idx);
    } else if (_autocompleteResults.length > 0) {
      // Select first non-guessed
      const first = _autocompleteResults.findIndex(r => !r.alreadyGuessed);
      if (first >= 0) selectAutocomplete(first);
    }
  } else if (e.key === 'Escape') {
    closeAutocomplete();
  }
}

function updateHighlight(items) {
  items.forEach((item, i) => {
    item.classList.toggle('highlighted', i === _autocompleteHighlight);
    item.setAttribute('aria-selected', i === _autocompleteHighlight ? 'true' : 'false');
  });
  if (_autocompleteHighlight >= 0 && items[_autocompleteHighlight]) {
    items[_autocompleteHighlight].scrollIntoView({ block: 'nearest' });
  }
}

function selectAutocomplete(idx) {
  const result = _autocompleteResults[idx];
  if (!result || result.alreadyGuessed) return;
  closeAutocomplete();
  el.searchInput.value = '';
  _onGuessSubmit && _onGuessSubmit(result.card);
}

function closeAutocomplete() {
  el.autocompleteList.classList.add('hidden');
  el.autocompleteList.innerHTML = '';
  _autocompleteResults = [];
  _autocompleteHighlight = -1;
}

// ---- Share toast ----

function showShareToast(lang) {
  el.shareToast.textContent = lang === 'fr' ? 'Copié !' : 'Copied!';
  el.shareToast.classList.remove('hidden');
  el.shareToast.classList.add('show');
  setTimeout(() => {
    el.shareToast.classList.remove('show');
    setTimeout(() => el.shareToast.classList.add('hidden'), 300);
  }, 2000);
}

// ---- Canvas card area styling ----

function setCardAreaState(state) {
  const area = document.getElementById('card-area');
  area.classList.remove('state-win', 'state-lose', 'state-playing');
  area.classList.add('state-' + state);
}

// ---- Helpers ----

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
