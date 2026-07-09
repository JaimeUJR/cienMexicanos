const STORAGE_KEY = 'mexicanos-dijeron-v1';
const DEFAULT_DATA = {
  games: [],
  history: [],
  activeGameId: null,
  settings: {
    version: 1,
  }
};
let appData = { ...DEFAULT_DATA };

window.initializeStorage = function() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.persist();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    appData = {
      ...DEFAULT_DATA,
      ...parsed,
      games: Array.isArray(parsed.games) ? parsed.games : [],
      history: Array.isArray(parsed.history) ? parsed.history : []
    };
  } catch {
    appData = { ...DEFAULT_DATA };
    window.persist();
  }
}

window.persist = function() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
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