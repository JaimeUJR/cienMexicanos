// ==================== ESTADO MODULO ====================
let state = null;

// ==================== FACTORY DE PARTIDA ====================
window.createGameState = function(payload) {
  const gameId = window.generateId();
  const teams = [
    {
      id: 'teamA',
      name: payload.teamAName,
      totalScore: 0,
      roundScore: 0,
      strikes: 0,
      isActive: true
    },
    {
      id: 'teamB',
      name: payload.teamBName,
      totalScore: 0,
      roundScore: 0,
      strikes: 0,
      isActive: false
    }
  ];

  const rounds = Array.from({ length: payload.roundsCount }, (_, index) => {
    const configuredRound = Array.isArray(payload.roundsData) ? payload.roundsData[index] || [] : [];

    return {
      id: `round-${index + 1}`,
      question: `Pregunta ${index + 1}`,
      roundType: payload.enableDoubleRound && index === 1 ? 'double' : 'normal',
      answers: Array.from({ length: 5 }, (_, answerIndex) => {
        const entry = configuredRound[answerIndex] || {};
        return {
          id: window.generateId(),
          text: entry.text || '',
          points: Number(entry.points) || 0,
          revealed: false,
          isCorrect: false
        };
      }),
      currentRoundPot: 0,
      status: 'pending',
      revealedCount: 0,
      strikeCount: 0,
      stealAttempted: false,
      winnerTeamId: null
    };
  });

  const game = {
    id: gameId,
    name: payload.gameName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'setup',
    config: {
      roundsCount: payload.roundsCount,
      enableDoubleRound: payload.enableDoubleRound,
      soundEnabled: payload.enableSounds,
      fullscreenEnabled: false
    },
    teams,
    rounds,
    currentRoundIndex: 0,
    historyEntry: null
  };

  window.saveCurrentGame(game);
  window.setActiveGame(gameId);
  state = game;
  return game;
}