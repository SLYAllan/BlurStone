// cards.js — Card data fetching, filtering, and autocomplete search

const CARD_API = 'https://api.hearthstonejson.com/v1/latest/{LOCALE}/cards.collectible.json';
const CACHE_KEY_PREFIX = 'hearthblur_cards_';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const ALLOWED_TYPES = new Set(['MINION', 'SPELL', 'WEAPON', 'LOCATION', 'HERO']);

let _cards = [];
let _currentLang = 'fr';

function getLocale(lang) {
  return lang === 'fr' ? 'frFR' : 'enUS';
}

async function loadCards(lang) {
  _currentLang = lang;
  const locale = getLocale(lang);
  const cacheKey = CACHE_KEY_PREFIX + locale;

  // Try cache first
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        _cards = data;
        return _cards;
      }
    }
  } catch (e) {
    // Cache read failed, proceed to fetch
  }

  const url = CARD_API.replace('{LOCALE}', locale);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch cards: ${response.status}`);
  const raw = await response.json();

  _cards = raw.filter(c => ALLOWED_TYPES.has(c.type));

  // Cache the filtered data
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ data: _cards, timestamp: Date.now() }));
  } catch (e) {
    // Storage might be full — ignore
  }

  return _cards;
}

function getCards() {
  return _cards;
}

function getCardById(id) {
  return _cards.find(c => c.id === id) || null;
}

/**
 * Search cards by name.
 * Returns up to `limit` results, prefix matches ranked before substring matches.
 * @param {string} query
 * @param {number} limit
 * @param {Set<string>} excludeIds - card ids already guessed (shown greyed out)
 * @returns {{ card: object, alreadyGuessed: boolean }[]}
 */
function searchCards(query, limit = 8, excludeIds = new Set()) {
  if (!query || query.trim().length === 0) return [];

  const q = query.trim().toLowerCase();
  const prefixMatches = [];
  const substringMatches = [];

  for (const card of _cards) {
    const name = (card.name || '').toLowerCase();
    if (name.startsWith(q)) {
      prefixMatches.push(card);
    } else if (name.includes(q)) {
      substringMatches.push(card);
    }
  }

  // Sort each group alphabetically for consistency
  prefixMatches.sort((a, b) => a.name.localeCompare(b.name));
  substringMatches.sort((a, b) => a.name.localeCompare(b.name));

  const combined = [...prefixMatches, ...substringMatches].slice(0, limit);
  return combined.map(card => ({
    card,
    alreadyGuessed: excludeIds.has(card.id),
  }));
}

/**
 * Pick a random card from the loaded set.
 */
function getRandomCard() {
  if (_cards.length === 0) return null;
  return _cards[Math.floor(Math.random() * _cards.length)];
}

/**
 * Pick a deterministic card based on a seed (for daily mode).
 * @param {function} rng - seeded random function returning [0,1)
 */
function getSeededCard(rng) {
  if (_cards.length === 0) return null;
  const idx = Math.floor(rng() * _cards.length);
  return _cards[idx];
}

function getArtUrl(cardId) {
  return `https://art.hearthstonejson.com/v1/256x/${cardId}.jpg`;
}

function getRenderUrl(cardId, lang) {
  const locale = getLocale(lang);
  return `https://art.hearthstonejson.com/v1/render/latest/${locale}/256x/${cardId}.png`;
}
