// cards.js — Card data fetching, filtering, and autocomplete search

const CARD_API = 'https://api.hearthstonejson.com/v1/latest/{LOCALE}/cards.collectible.json';
const CACHE_KEY_PREFIX = 'hearthblur_cards_v2_';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const ALLOWED_TYPES = new Set(['MINION', 'SPELL', 'WEAPON', 'LOCATION']);

// Sets to exclude (placeholders, hero skins, missions, etc.)
const EXCLUDED_SETS = new Set([
  'PLACEHOLDER',
  'PLACEHOLDER_202204',
  'HERO_SKINS',
  'CREDITS',
  'MISSIONS',
  'CHEAT',
  'TB',
  'TAVERNS_OF_TIME',
  'INVALID',
]);

let _cards = [];
let _currentLang = 'fr';

function getLocale(lang) {
  return lang === 'fr' ? 'frFR' : 'enUS';
}

async function loadCards(lang) {
  _currentLang = lang;
  const locale = getLocale(lang);
  const cacheKey = CACHE_KEY_PREFIX + locale;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        _cards = data;
        return _cards;
      }
    }
  } catch (e) {}

  const url = CARD_API.replace('{LOCALE}', locale);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch cards: ${response.status}`);
  const raw = await response.json();

  // Filter: only collectible types, exclude bad sets, exclude hero skins
  let filtered = raw.filter(c => {
    if (!ALLOWED_TYPES.has(c.type)) return false;
    if (!c.set || EXCLUDED_SETS.has(c.set)) return false;
    if (c.set && c.set.toUpperCase().includes('HERO_SKIN')) return false;
    if (c.set && c.set.toUpperCase().includes('PLACEHOLDER')) return false;
    if (!c.name || !c.id) return false;
    return true;
  });

  // Deduplicate by name (keep first occurrence)
  const seen = new Set();
  _cards = [];
  for (const c of filtered) {
    const key = c.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    _cards.push(c);
  }

  try {
    localStorage.setItem(cacheKey, JSON.stringify({ data: _cards, timestamp: Date.now() }));
  } catch (e) {}

  return _cards;
}

function getCards() {
  return _cards;
}

function getCardById(id) {
  return _cards.find(c => c.id === id) || null;
}

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

  prefixMatches.sort((a, b) => a.name.localeCompare(b.name));
  substringMatches.sort((a, b) => a.name.localeCompare(b.name));

  const combined = [...prefixMatches, ...substringMatches].slice(0, limit);
  return combined.map(card => ({
    card,
    alreadyGuessed: excludeIds.has(card.id),
  }));
}

function getRandomCard() {
  if (_cards.length === 0) return null;
  return _cards[Math.floor(Math.random() * _cards.length)];
}

function getArtUrl(cardId) {
  return `https://art.hearthstonejson.com/v1/512x/${cardId}.jpg`;
}

