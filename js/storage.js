const STORAGE_KEY = 'mexicanos-dijeron-v1';
const LEGACY_STORAGE_KEYS = [
  'mexicanos-dijeron',
  'cien-mexicanos',
  'cienMexicanos'
];
const DEFAULT_DATA = {
  games: [],
  history: [],
  activeGameId: null,
  settings: {
    version: 1,
  }
};
let appData = { ...DEFAULT_DATA };

function normalizeGame(game) {
  if (!game || typeof game !== 'object') {
    return null;
  }

  const normalizedId = typeof game.id === 'string' && game.id
    ? game.id
    : window.generateId();

  return {
    ...game,
    id: normalizedId,
    name: typeof game.name === 'string' ? game.name : 'Partida sin nombre',
    createdAt: game.createdAt || new Date().toISOString(),
    updatedAt: game.updatedAt || new Date().toISOString(),
    status: typeof game.status === 'string' ? game.status : 'setup',
    teams: Array.isArray(game.teams) ? game.teams : [],
    rounds: Array.isArray(game.rounds) ? game.rounds : []
  };
}

function normalizeData(parsed) {
  const rawGames = Array.isArray(parsed?.games)
    ? parsed.games
    : (parsed?.games && typeof parsed.games === 'object' ? Object.values(parsed.games) : []);
  const games = rawGames.map(normalizeGame).filter(Boolean);

  const history = Array.isArray(parsed?.history)
    ? parsed.history
    : (parsed?.history && typeof parsed.history === 'object' ? Object.values(parsed.history) : []);
  const activeGameId = typeof parsed?.activeGameId === 'string' ? parsed.activeGameId : null;

  return {
    ...DEFAULT_DATA,
    ...parsed,
    games,
    history,
    activeGameId,
    settings: {
      ...DEFAULT_DATA.settings,
      ...(parsed?.settings || {})
    }
  };
}

function safeReadStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWriteStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveStorage(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Intentionally ignored if storage is not writable.
  }
}

function findStoredPayload() {
  const primaryRaw = safeReadStorage(STORAGE_KEY);
  if (primaryRaw) {
    return { raw: primaryRaw, sourceKey: STORAGE_KEY };
  }

  for (const key of LEGACY_STORAGE_KEYS) {
    const legacyRaw = safeReadStorage(key);
    if (legacyRaw) {
      return { raw: legacyRaw, sourceKey: key };
    }
  }

  return { raw: null, sourceKey: null };
}

window.initializeStorage = function() {
  const { raw, sourceKey } = findStoredPayload();

  if (!raw) {
    window.persist();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    appData = normalizeData(parsed);

    // Migrate legacy keys forward to the current key.
    if (sourceKey && sourceKey !== STORAGE_KEY) {
      window.persist();
      safeRemoveStorage(sourceKey);
    }
  } catch {
    appData = { ...DEFAULT_DATA };
    window.persist();
  }
}

window.persist = function() {
  safeWriteStorage(STORAGE_KEY, JSON.stringify(appData));
}

window.getGames = function() {
  return [...appData.games];
}

window.loadSavedGames = function() {
  return window.getGames();
}

window.getHistoryEntries = function() {
  return [...appData.history];
}

window.saveGame = function(game) {
  const idx = appData.games.findIndex(item => item.id === game.id);
  if (idx >= 0) {
    appData.games[idx] = { ...game };
  } else {
    appData.games.push(game);
  }
  window.persist();
}

window.removeGame = function(id) {
  appData.games = appData.games.filter(game => game.id !== id);
  if (appData.activeGameId === id) {
    appData.activeGameId = null;
  }
  window.persist();
}

window.setActiveGame = function(id) {
  appData.activeGameId = id;
  window.persist();
}

window.getActiveGame = function() {
  return appData.games.find(game => game.id === appData.activeGameId) || null;
}

window.saveHistoryEntry = function(entry) {
  appData.history.unshift(entry);
  window.persist();
}

window.clearHistory = function() {
  appData.history = [];
  window.persist();
}

window.saveCurrentGame = function(game) {
  window.saveGame(game);
}

window.generateId = function() {
  return '_' + Math.random().toString(36).slice(2, 10);
}