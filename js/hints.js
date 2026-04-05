// hints.js — Hint computation for each card type

// Hint sequence (revealed after wrong guess #N)
// Index 0 = revealed after 1st wrong guess, etc.
const HINT_SEQUENCE = ['type', 'cost', 'set', 'attack', 'health'];

/**
 * Compute a hint's display data for a card.
 * @param {object} card - card data object
 * @param {string} hintType - 'type'|'cost'|'set'|'attack'|'health'
 * @param {string} lang - 'fr'|'en'
 * @returns {{ label: string, value: string, note: string|null }}
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
      };
    }

    case 'cost': {
      return {
        label: t.hintCost,
        value: card.cost != null ? String(card.cost) : '?',
        note: null,
        icon: '💎',
      };
    }

    case 'set': {
      const setName = SET_NAMES[card.set]?.[lang] || card.set;
      return {
        label: t.hintSet,
        value: setName,
        note: null,
        icon: '📦',
      };
    }

    case 'attack': {
      if (['SPELL', 'LOCATION', 'HERO'].includes(card.type)) {
        return {
          label: t.hintAttack,
          value: t.hintNA,
          note: card.type === 'SPELL' ? t.hintNoStats : null,
          icon: '⚔️',
        };
      }
      return {
        label: t.hintAttack,
        value: card.attack != null ? String(card.attack) : '0',
        note: null,
        icon: '⚔️',
      };
    }

    case 'health': {
      if (card.type === 'SPELL') {
        return {
          label: t.hintHealth,
          value: t.hintNA,
          note: t.hintNoStats,
          icon: '❤️',
        };
      }
      if (card.type === 'WEAPON') {
        return {
          label: t.hintDurability,
          value: card.durability != null ? String(card.durability) : (card.health != null ? String(card.health) : '0'),
          note: null,
          icon: '🛡️',
        };
      }
      if (card.type === 'HERO') {
        return {
          label: t.hintArmor,
          value: card.armor != null ? String(card.armor) : '0',
          note: null,
          icon: '🛡️',
        };
      }
      // MINION, LOCATION
      return {
        label: t.hintHealth,
        value: card.health != null ? String(card.health) : '0',
        note: null,
        icon: '❤️',
      };
    }

    default:
      return { label: hintType, value: '?', note: null, icon: '❓' };
  }
}

/**
 * Get all hints with their revealed/locked state.
 * @param {object} card
 * @param {number} revealedCount - how many hints have been revealed (= wrong guesses so far)
 * @param {string} lang
 * @returns {Array<{ type: string, revealed: boolean, label: string, value: string, note: string|null, icon: string }>}
 */
function getAllHints(card, revealedCount, lang) {
  return HINT_SEQUENCE.map((hintType, idx) => {
    const revealed = idx < revealedCount;
    const data = revealed ? getHintData(card, hintType, lang) : { label: getLabelForType(hintType, lang), value: '?', note: null, icon: '🔒' };
    return {
      type: hintType,
      revealed,
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
    attack: t.hintAttack,
    health: t.hintHealth,
  };
  return map[hintType] || hintType;
}
