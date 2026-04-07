// hints.js — Hint computation for each card type

// Base info (always visible from the start)
const BASE_INFO = ['set', 'type', 'rarity'];

// Progressive hints revealed at specific wrong guess counts
const HINT_SEQUENCE = ['cost', 'class', 'text'];
const HINT_UNLOCK_AT = [2, 3, 4]; // wrong guess # needed to unlock each hint

/**
 * Compute a hint's display data for a card.
 * @param {object} card - card data object
 * @param {string} hintType - 'type'|'set'|'cost'|'class'|'text'
 * @param {string} lang - 'fr'|'en'
 * @returns {{ label: string, value: string, note: string|null, icon: string, iconImg: string|null }}
 */
function getHintData(card, hintType, lang) {
  const t = i18n[lang];

  switch (hintType) {
    case 'type': {
      const typeMap = {
        MINION: t.typeMinion,
        SPELL: t.typeSpell,
        WEAPON: t.typeWeapon,
        LOCATION: t.typeLocation,
        HERO: t.typeHero,
      };
      return {
        label: t.hintType,
        value: typeMap[card.type] || card.type,
        note: null,
        icon: '🃏',
        iconImg: null,
      };
    }

    case 'set': {
      const setName = SET_NAMES[card.set]?.[lang] || card.set;
      const setIcon = SET_ICONS[card.set] || null;
      return {
        label: t.hintSet,
        value: setName,
        note: null,
        icon: '📦',
        iconImg: setIcon,
      };
    }

    case 'cost': {
      return {
        label: t.hintCost,
        value: card.cost != null ? String(card.cost) : '?',
        note: null,
        icon: '💎',
        iconImg: STAT_ICONS.mana || null,
      };
    }

    case 'class': {
      const className = card.cardClass || 'NEUTRAL';
      const classIcon = CLASS_ICONS[className] || null;
      const displayName = CLASS_NAMES[className]?.[lang] || className;
      return {
        label: t.hintClass,
        value: displayName,
        note: null,
        icon: '⚔️',
        iconImg: classIcon,
      };
    }

    case 'text': {
      const rawText = card.text || '';
      const cleanText = rawText.replace(/<[^>]+>/g, '').replace(/\n/g, ' ').trim();
      return {
        label: t.hintText,
        value: cleanText || t.hintNA,
        note: null,
        icon: '📜',
        iconImg: null,
      };
    }

    case 'rarity': {
      const rarity = card.rarity || 'FREE';
      const rarityIcon = RARITY_ICONS[rarity] || null;
      const rarityName = (RARITY_NAMES[rarity] && RARITY_NAMES[rarity][lang]) || rarity;
      return {
        label: t.hintRarity,
        value: rarityName,
        note: null,
        icon: '⭐',
        iconImg: rarityIcon,
      };
    }

    default:
      return { label: hintType, value: '?', note: null, icon: '❓', iconImg: null };
  }
}

/**
 * Get base info that is always visible (extension + type).
 * @param {object} card
 * @param {string} lang
 * @returns {Array<{ type: string, revealed: boolean, label: string, value: string, icon: string, iconImg: string|null }>}
 */
function getBaseInfo(card, lang) {
  return BASE_INFO.map(type => ({
    type,
    revealed: true,
    ...getHintData(card, type, lang),
  }));
}

/**
 * Get all progressive hints with their revealed/locked state.
 * Hints unlock at wrong guess counts defined in HINT_UNLOCK_AT.
 * @param {object} card
 * @param {number} wrongGuessCount - number of wrong guesses so far
 * @param {string} lang
 * @returns {Array<{ type: string, revealed: boolean, unlockAt: number, label: string, value: string, icon: string, iconImg: string|null }>}
 */
function getAllHints(card, wrongGuessCount, lang) {
  return HINT_SEQUENCE.map((hintType, idx) => {
    const unlockAt = HINT_UNLOCK_AT[idx];
    const revealed = wrongGuessCount >= unlockAt;
    const data = revealed
      ? getHintData(card, hintType, lang)
      : { label: getLabelForType(hintType, lang), value: '?', note: null, icon: '🔒', iconImg: null };
    return {
      type: hintType,
      revealed,
      unlockAt,
      ...data,
    };
  });
}

function getLabelForType(hintType, lang) {
  const t = i18n[lang];
  const map = {
    type: t.hintType,
    cost: t.hintCost,
    set: t.hintSet,
    class: t.hintClass,
    text: t.hintText,
  };
  return map[hintType] || hintType;
}
