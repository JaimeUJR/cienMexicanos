// ==================== ESTADO DEL JUEGO ====================
let gameState = {
    game: null,
    gameTemplate: null,
    pendingHistoryEntry: null,
    resultSaved: false,
    currentRoundIndex: 0,
    startingTeamIndex: 0,
    currentTeamIndex: 0,
    roundScore: 0,
    roundStrikes: 0,
    revealedAnswerCount: 0,
    answeredCorrectly: false,
    isRoundActive: true,
    isPaused: false,
    isStealPhase: false,
    stealTeamIndex: null,
    potOwnerTeamIndex: 0
};

const soundBank = {
    start: new Audio('../sources/sounds/a-jugar-100-mexicanos-dijeron_uzh3r4B.mp3'),
    correct: new Audio('../sources/sounds/correcto-100-mexicanos-dijeron.mp3'),
    incorrect: new Audio('../sources/sounds/incorrecto-100-mexicanos-dijeron.mp3'),
    win: new Audio('../sources/sounds/triunfo-100-mexicanos-dijeron.mp3')
};

let hasPlayedStartSound = false;

// ==================== INICIALIZACION ====================
window.initializeGamePlay = function() {
    window.initializeStorage();
    gameState.game = window.getActiveGame();

    if (!gameState.game) {
        alert('No hay un juego activo. Por favor, crea uno primero.');
        window.location.href = '../index.html';
        return;
    }

    gameState.gameTemplate = createReplayTemplate(gameState.game);

    updateGameUI();
    renderCurrentRound();
    updateStrikeDisplay();
    hideStealBanner();
    openStartTeamModal();
};

function isSoundEnabled() {
    return Boolean(gameState.game?.config?.soundEnabled);
}

function playGameSound(type) {
    if (!isSoundEnabled()) {
        return;
    }

    const sound = soundBank[type];
    if (!sound) {
        return;
    }

    sound.currentTime = 0;
    sound.play().catch(() => {
        // Ignore blocked autoplay errors.
    });
}

// ==================== UI ====================
function updateGameUI() {
    const { game, currentRoundIndex, roundScore } = gameState;

    const team1Base = Number(game.teams[0].totalScore) || 0;
    const team2Base = Number(game.teams[1].totalScore) || 0;
    const activeTurnTeamIndex = gameState.isStealPhase && gameState.stealTeamIndex !== null
        ? gameState.stealTeamIndex
        : gameState.currentTeamIndex;

    document.getElementById('team1-name').textContent = game.teams[0].name;
    document.getElementById('team1-total').textContent = `Total: ${game.teams[0].totalScore}`;
    document.getElementById('team1-score').textContent = String(team1Base).padStart(3, '0');

    document.getElementById('team2-name').textContent = game.teams[1].name;
    document.getElementById('team2-total').textContent = `Total: ${game.teams[1].totalScore}`;
    document.getElementById('team2-score').textContent = String(team2Base).padStart(3, '0');

    document.getElementById('current-round-score').textContent = String(roundScore).padStart(3, '0');
    document.getElementById('question-text').textContent = `Pregunta ${currentRoundIndex + 1}`;

    const leftPanel = document.getElementById('team-panel-0');
    const rightPanel = document.getElementById('team-panel-1');
    leftPanel?.classList.toggle('active-turn', activeTurnTeamIndex === 0);
    rightPanel?.classList.toggle('active-turn', activeTurnTeamIndex === 1);
}

function renderCurrentRound() {
    const { game, currentRoundIndex } = gameState;
    const round = game.rounds[currentRoundIndex];
    const container = document.getElementById('answers-container');

    container.innerHTML = round.answers.map((answer, index) => {
        const classes = ['answer-item'];
        if (answer.revealed) {
            classes.push('revealed');
        }

        return `
            <div class="${classes.join(' ')}" data-answer-id="${answer.id}">
                <span class="answer-number">${index + 1}.</span>
                <div class="answer-content">
                    <span class="answer-text" style="display: ${answer.revealed ? 'inline' : 'none'};">${answer.text || '---'}</span>
                </div>
                <span class="answer-points" style="display: ${answer.revealed ? 'inline-block' : 'none'};">${answer.points}</span>
            </div>
        `;
    }).join('');
}

function updateStrikeDisplay() {
    const marks = document.querySelectorAll('#strike-count .strike-mark');
    marks.forEach((mark, index) => {
        mark.classList.toggle('active', index < gameState.roundStrikes);
    });
}

function showStrikeBurst() {
    const burst = document.getElementById('strike-burst');
    if (!burst) return;

    burst.classList.remove('show');
    void burst.offsetWidth;
    burst.classList.add('show');
}

function showStealBanner() {
    const banner = document.getElementById('steal-banner');
    if (!banner) return;
    banner.classList.add('show');
}

function hideStealBanner() {
    const banner = document.getElementById('steal-banner');
    if (!banner) return;
    banner.classList.remove('show');
}

// ==================== LOGICA BASE ====================
function normalizeAnswerText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

function startStealPhase() {
    if (gameState.isStealPhase) {
        return;
    }

    gameState.isStealPhase = true;
    gameState.stealTeamIndex = 1 - gameState.currentTeamIndex;
    gameState.potOwnerTeamIndex = gameState.currentTeamIndex;

    showStealBanner();
    showFeedbackMessage('ROBO DE PUNTOS', 'warning');
}

function finalizeRound(winnerTeamIndex, message, type = 'success') {
    const winnerTeam = gameState.game.teams[winnerTeamIndex];
    const pointsWon = Number(gameState.roundScore) || 0;
    const winnerBaseScore = Number(winnerTeam?.totalScore) || 0;

    winnerTeam.totalScore = winnerBaseScore + pointsWon;
    gameState.game.updatedAt = new Date().toISOString();

    gameState.isStealPhase = false;
    gameState.stealTeamIndex = null;
    hideStealBanner();

    updateGameUI();
    window.saveCurrentGame(gameState.game);
    playGameSound('win');

    if (message) {
        showFeedbackMessage(message, type);
    }

    setTimeout(() => {
        endRound();
    }, 1500);
}

function resolveStealAttempt(inputText) {
    const { game, currentRoundIndex, stealTeamIndex, potOwnerTeamIndex } = gameState;
    const round = game.rounds[currentRoundIndex];
    const normalizedInput = normalizeAnswerText(inputText);

    const stealMatchedAnswer = round.answers.find(answer => {
        if (answer.revealed) {
            return false;
        }
        return normalizeAnswerText(answer.text) === normalizedInput;
    });

    if (stealMatchedAnswer) {
        stealMatchedAnswer.revealed = true;
        gameState.roundScore += stealMatchedAnswer.points;
        gameState.revealedAnswerCount++;
        gameState.potOwnerTeamIndex = stealTeamIndex;

        renderCurrentRound();
        updateGameUI();

        const teamName = game.teams[stealTeamIndex].name;
        finalizeRound(
            stealTeamIndex,
            `¡Robo exitoso! ${teamName} gana ${gameState.roundScore} puntos (incluyendo la respuesta del robo).`,
            'success'
        );
        return;
    }

    const ownerIndex = Number.isInteger(potOwnerTeamIndex)
        ? potOwnerTeamIndex
        : gameState.currentTeamIndex;
    const ownerName = game.teams[ownerIndex].name;
    finalizeRound(
        ownerIndex,
        `Robo fallido. ${ownerName} conserva ${gameState.roundScore} puntos revelados.`,
        'error'
    );
}

function handleAnswerSubmission(inputText) {
    if (gameState.isPaused) {
        return;
    }

    const { game, currentRoundIndex, currentTeamIndex } = gameState;
    const round = game.rounds[currentRoundIndex];
    const answerInput = document.getElementById('answer-input');

    if (gameState.isStealPhase) {
        resolveStealAttempt(inputText);
        answerInput.value = '';
        focusAnswerInput();
        return;
    }

    const normalizedInput = normalizeAnswerText(inputText);
    const matchedAnswer = round.answers.find(answer => {
        const normalizedAnswer = normalizeAnswerText(answer.text);
        return normalizedAnswer.length > 0 && normalizedAnswer === normalizedInput;
    });

    if (!matchedAnswer) {
        gameState.roundStrikes++;
        gameState.answeredCorrectly = false;
        updateStrikeDisplay();
        showStrikeBurst();
        playGameSound('incorrect');

        answerInput.classList.add('error');
        setTimeout(() => answerInput.classList.remove('error'), 500);

        if (gameState.roundStrikes >= 3) {
            startStealPhase();
        } else {
            showFeedbackMessage(`Incorrecto. Errores: ${gameState.roundStrikes}/3`, 'error');
        }
    } else if (matchedAnswer.revealed) {
        showFeedbackMessage('Esa respuesta ya fue revelada', 'warning');
    } else {
        matchedAnswer.revealed = true;
        gameState.roundScore += matchedAnswer.points;
        gameState.revealedAnswerCount++;
        gameState.answeredCorrectly = true;
        playGameSound('correct');

        updateGameUI();
        renderCurrentRound();
        showFeedbackMessage(`¡Correcto! +${matchedAnswer.points} puntos`, 'success');

        if (gameState.revealedAnswerCount === round.answers.length) {
            const winnerName = game.teams[currentTeamIndex].name;
            finalizeRound(
                currentTeamIndex,
                `¡Ronda completada! ${winnerName} gana ${gameState.roundScore} puntos.`,
                'success'
            );
        }
    }

    answerInput.value = '';
    focusAnswerInput();
}

function endRound() {
    const { game, currentRoundIndex } = gameState;

    if (currentRoundIndex < game.rounds.length - 1) {
        gameState.currentRoundIndex++;
        gameState.currentTeamIndex = gameState.startingTeamIndex;
        gameState.roundScore = 0;
        gameState.roundStrikes = 0;
        gameState.revealedAnswerCount = 0;
        gameState.answeredCorrectly = false;
        gameState.isStealPhase = false;
        gameState.stealTeamIndex = null;
        gameState.potOwnerTeamIndex = gameState.currentTeamIndex;

        hideStealBanner();
        updateStrikeDisplay();
        updateGameUI();
        renderCurrentRound();
        openStartTeamModal();
    } else {
        endGame();
    }
}

function endGame() {
    const { game } = gameState;
    const modal = document.getElementById('game-end-modal');
    const finalScoresDiv = document.getElementById('final-scores');

    const team1Score = game.teams[0].totalScore;
    const team2Score = game.teams[1].totalScore;
    const winner = team1Score > team2Score ? 0 : (team2Score > team1Score ? 1 : -1);

    finalScoresDiv.innerHTML = game.teams.map((team, index) => {
        const isWinner = index === winner;
        return `
            <div class="final-score-item ${isWinner ? 'winner' : ''}">
                ${team.name}: ${team.totalScore} puntos
                ${isWinner ? ' ✓' : ''}
            </div>
        `;
    }).join('');

    modal.classList.remove('hidden');

    game.status = 'completed';
    game.updatedAt = new Date().toISOString();
    window.saveCurrentGame(game);

    gameState.pendingHistoryEntry = buildHistoryEntry();
    gameState.resultSaved = false;
    saveHistoryResultIfNeeded();
}

// ==================== REPLAY + HISTORIAL ====================
function cloneData(value) {
    return JSON.parse(JSON.stringify(value));
}

function createReplayTemplate(game) {
    return {
        id: game.id,
        name: game.name,
        createdAt: game.createdAt,
        config: cloneData(game.config || {}),
        teams: (game.teams || []).map((team, index) => ({
            id: team.id || `team-${index + 1}`,
            name: team.name || `Equipo ${index + 1}`
        })),
        rounds: (game.rounds || []).map((round, roundIndex) => ({
            id: round.id || `round-${roundIndex + 1}`,
            question: round.question || `Pregunta ${roundIndex + 1}`,
            roundType: round.roundType || 'normal',
            answers: (round.answers || []).map((answer, answerIndex) => ({
                id: answer.id || `answer-${roundIndex + 1}-${answerIndex + 1}`,
                text: answer.text || '',
                points: Number(answer.points) || 0
            }))
        }))
    };
}

function createFreshGameFromTemplate() {
    const template = gameState.gameTemplate || createReplayTemplate(gameState.game);
    return {
        id: template.id,
        name: template.name,
        createdAt: template.createdAt,
        updatedAt: new Date().toISOString(),
        status: 'setup',
        config: cloneData(template.config || {}),
        teams: (template.teams || []).map((team, index) => ({
            id: team.id || `team-${index + 1}`,
            name: team.name || `Equipo ${index + 1}`,
            totalScore: 0,
            roundScore: 0,
            strikes: 0,
            isActive: index === 0
        })),
        rounds: (template.rounds || []).map((round, roundIndex) => ({
            id: round.id || `round-${roundIndex + 1}`,
            question: round.question || `Pregunta ${roundIndex + 1}`,
            roundType: round.roundType || 'normal',
            answers: (round.answers || []).map((answer, answerIndex) => ({
                id: answer.id || `answer-${roundIndex + 1}-${answerIndex + 1}`,
                text: answer.text || '',
                points: Number(answer.points) || 0,
                revealed: false,
                isCorrect: false
            })),
            currentRoundPot: 0,
            status: 'pending',
            revealedCount: 0,
            strikeCount: 0,
            stealAttempted: false,
            winnerTeamId: null
        })),
        currentRoundIndex: 0,
        historyEntry: null
    };
}

function buildHistoryEntry() {
    const game = gameState.game;
    const team1Score = game.teams[0].totalScore;
    const team2Score = game.teams[1].totalScore;
    const winner = team1Score > team2Score ? 0 : (team2Score > team1Score ? 1 : -1);

    return {
        gameId: game.id,
        gameName: game.name,
        date: new Date().toISOString(),
        finalScores: game.teams.map(team => ({ name: team.name, score: team.totalScore })),
        winner: winner >= 0 ? game.teams[winner].name : 'Empate'
    };
}

function saveHistoryResultIfNeeded() {
    if (!gameState.pendingHistoryEntry || gameState.resultSaved) {
        return;
    }

    window.saveHistoryEntry(gameState.pendingHistoryEntry);
    gameState.resultSaved = true;
}

function resetMatchState() {
    gameState.currentRoundIndex = 0;
    gameState.currentTeamIndex = gameState.startingTeamIndex;
    gameState.roundScore = 0;
    gameState.roundStrikes = 0;
    gameState.revealedAnswerCount = 0;
    gameState.answeredCorrectly = false;
    gameState.isRoundActive = true;
    gameState.isStealPhase = false;
    gameState.stealTeamIndex = null;
    gameState.potOwnerTeamIndex = gameState.startingTeamIndex;
    gameState.pendingHistoryEntry = null;
    gameState.resultSaved = false;
}

function replayCurrentGame() {
    saveHistoryResultIfNeeded();

    gameState.game = createFreshGameFromTemplate();
    hasPlayedStartSound = false;
    gameState.startingTeamIndex = 0;
    resetMatchState();

    window.saveCurrentGame(gameState.game);
    window.setActiveGame(gameState.game.id);

    document.getElementById('game-end-modal').classList.add('hidden');
    hideStealBanner();
    updateGameUI();
    renderCurrentRound();
    updateStrikeDisplay();
    openStartTeamModal();
}

function openPauseModal() {
    gameState.isPaused = true;
    document.getElementById('pause-modal').classList.remove('hidden');
}

function closePauseModal() {
    gameState.isPaused = false;
    document.getElementById('pause-modal').classList.add('hidden');
    focusAnswerInput();
}

function openStartTeamModal() {
    gameState.isPaused = true;
    document.getElementById('start-team-modal').classList.remove('hidden');

    const team0Name = gameState.game.teams?.[0]?.name || 'Equipo 1';
    const team1Name = gameState.game.teams?.[1]?.name || 'Equipo 2';
    const btn0 = document.getElementById('btn-start-team-0');
    const btn1 = document.getElementById('btn-start-team-1');
    const title = document.querySelector('#start-team-modal h2');
    const roundLabel = gameState.currentRoundIndex + 1;
    if (btn0) btn0.textContent = team0Name;
    if (btn1) btn1.textContent = team1Name;
    if (title) title.textContent = `¿Que equipo inicia la ronda ${roundLabel}?`;
}

function setStartingTeam(index) {
    gameState.startingTeamIndex = index;
    gameState.currentTeamIndex = index;
    gameState.potOwnerTeamIndex = index;
    gameState.isPaused = false;

    if (!hasPlayedStartSound && gameState.currentRoundIndex === 0) {
        playGameSound('start');
        hasPlayedStartSound = true;
    }

    document.getElementById('start-team-modal').classList.add('hidden');
    updateGameUI();
    focusAnswerInput();
}

// ==================== UTILIDADES ====================
function showFeedbackMessage(message, type = 'info') {
    const feedback = document.createElement('div');
    feedback.className = `feedback-message ${type}`;
    feedback.textContent = message;
    feedback.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        padding: 15px 25px;
        background: ${type === 'success' ? '#00b25e' : type === 'error' ? '#e60088' : '#666'};
        color: white;
        border-radius: 8px;
        font-weight: 700;
        z-index: 999;
        animation: slideUp 0.3s ease;
    `;

    document.body.appendChild(feedback);

    setTimeout(() => {
        feedback.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => feedback.remove(), 300);
    }, 2000);
}

function focusAnswerInput() {
    document.getElementById('answer-input').focus();
}

// ==================== EVENTOS ====================
document.addEventListener('DOMContentLoaded', function() {
    window.initializeGamePlay();

    const answerInput = document.getElementById('answer-input');
    if (answerInput) {
        answerInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && this.value.trim()) {
                handleAnswerSubmission(this.value);
            }
        });
    }

    const btnBackHome = document.getElementById('btn-back-home');
    if (btnBackHome) {
        btnBackHome.addEventListener('click', function() {
            saveHistoryResultIfNeeded();
            window.location.href = '../index.html';
        });
    }

    const btnReplay = document.getElementById('btn-replay');
    if (btnReplay) {
        btnReplay.addEventListener('click', function() {
            replayCurrentGame();
        });
    }

    const btnPause = document.getElementById('btn-pause');
    if (btnPause) {
        btnPause.addEventListener('click', function() {
            openPauseModal();
        });
    }

    const btnResume = document.getElementById('btn-resume');
    if (btnResume) {
        btnResume.addEventListener('click', function() {
            closePauseModal();
        });
    }

    const btnStartTeam0 = document.getElementById('btn-start-team-0');
    if (btnStartTeam0) {
        btnStartTeam0.addEventListener('click', function() {
            setStartingTeam(0);
        });
    }

    const btnStartTeam1 = document.getElementById('btn-start-team-1');
    if (btnStartTeam1) {
        btnStartTeam1.addEventListener('click', function() {
            setStartingTeam(1);
        });
    }
});

// ==================== ANIMACIONES CSS ====================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            transform: translateX(-50%) translateY(100px);
            opacity: 0;
        }
        to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
    }

    @keyframes slideDown {
        from {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        to {
            transform: translateX(-50%) translateY(100px);
            opacity: 0;
        }
    }

    .answer-input-hidden.error {
        background: rgba(230, 0, 0, 0.2);
        border-color: var(--red-carmine);
        animation: shake 0.3s ease;
    }

    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);
