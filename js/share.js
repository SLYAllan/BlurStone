// share.js — Share text generation and clipboard copy

/**
 * Build the share emoji string showing guess progression.
 * 🟦 = correct guess, 🟥 = wrong guess, ⬛ = unused attempt
 */
function buildGuessEmoji(wrongCount, won) {
  const total = 7;
  const squares = [];
  for (let i = 0; i < total; i++) {
    if (i < wrongCount) {
      squares.push('🟥');
    } else if (i === wrongCount && won) {
      squares.push('🟦');
    } else {
      squares.push('⬛');
    }
  }
  return squares.join('');
}

/**
 * Generate the share text string.
 * @param {object} params
 * @param {boolean} params.won
 * @param {number} params.wrongCount
 * @param {string} params.cardName
 * @param {number} params.streak
 * @param {string} params.lang
 */
function buildShareText({ won, wrongCount, cardName, streak, lang }) {
  const t = i18n[lang];
  const guessEmoji = buildGuessEmoji(wrongCount, won);
  const guessNumber = won ? wrongCount + 1 : null;

  let text;
  if (won) {
    text = t.shareText
      .replace('{n}', guessNumber)
      .replace('{streak}', streak);
  } else {
    text = t.shareFail
      .replace('{card}', cardName);
  }

  // Insert emoji line before the first newline
  return guessEmoji + '\n' + text;
}

/**
 * Copy text to clipboard, returns Promise<boolean> (success/fail)
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // Fallback for older browsers
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch (e2) {
      return false;
    }
  }
}
