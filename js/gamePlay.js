// ==================== ESTADO DEL JUEGO ====================
let gameState = {
    game: null,
    currentRoundIndex: 0,
    currentTeamIndex: 0,
    roundScore: 0,
    roundStrikes: 0,
    revealedAnswerCount: 0,
    answeredCorrectly: false,
    isRoundActive: true
};

// ==================== INICIALIZACIÓN ====================
window.initializeGamePlay = function() {
    // Cargar el juego activo
    window.initializeStorage();
    gameState.game = window.getActiveGame();

    if (!gameState.game) {
        alert('No hay un juego activo. Por favor, crea uno primero.');
        window.location.href = '../index.html';
        return;
    }

    // Inicializar interfaz
    updateGameUI();
    renderCurrentRound();
    focusAnswerInput();
};

// ==================== ACTUALIZAR UI ====================
function updateGameUI() {
    const { game, currentRoundIndex, currentTeamIndex, roundScore } = gameState;
    const currentTeam = game.teams[currentTeamIndex];
    const otherTeam = game.teams[1 - currentTeamIndex];
    const round = game.rounds[currentRoundIndex];

    // Actualizar encabezado
    document.getElementById('game-title').textContent = game.name;
    document.getElementById('round-info').textContent = 
        `Ronda ${currentRoundIndex + 1} de ${game.rounds.length} • ${currentTeam.name}`;

    // Actualizar equipos
    document.getElementById('team1-name').textContent = game.teams[0].name;
    document.getElementById('team1-total').textContent = `Total: ${game.teams[0].totalScore}`;
    document.getElementById('team1-score').textContent = String(game.teams[0].totalScore).padStart(3, '0');

    document.getElementById('team2-name').textContent = game.teams[1].name;
    document.getElementById('team2-total').textContent = `Total: ${game.teams[1].totalScore}`;
    document.getElementById('team2-score').textContent = String(game.teams[1].totalScore).padStart(3, '0');

    // Actualizar marcador de ronda actual
    document.getElementById('current-round-score').textContent = String(roundScore).padStart(3, '0');

    // Actualizar pregunta
    document.getElementById('question-text').textContent = `Pregunta ${currentRoundIndex + 1}`;
}

// ==================== RENDERIZAR RESPUESTAS ====================
function renderCurrentRound() {
    const { game, currentRoundIndex } = gameState;
    const round = game.rounds[currentRoundIndex];
    const container = document.getElementById('answers-container');

    container.innerHTML = round.answers.map((answer, index) => {
        const classes = ['answer-item'];
        if (answer.revealed) {
            classes.push('revealed');
        } else if (answer.isCorrect === false && answer.revealed === true) {
            classes.push('incorrect');
        }

        return `
            <div class="${classes.join(' ')}" data-answer-id="${answer.id}">
                <span class="answer-number">${index + 1}.</span>
                <div class="answer-content">
                    <span class="answer-text">${answer.text || '---'}</span>
                    <span class="answer-points">${answer.points}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== MANEJAR RESPUESTA INGRESADA ====================
function handleAnswerSubmission(inputText) {
    const { game, currentRoundIndex, currentTeamIndex } = gameState;
    const round = game.rounds[currentRoundIndex];
    const inputLower = inputText.toLowerCase().trim();

    // Buscar respuesta correcta (coincidencia exacta o parcial)
    const matchedAnswer = round.answers.find(answer => {
        const answerLower = answer.text.toLowerCase().trim();
        return answerLower === inputLower || 
               answerLower.includes(inputLower) || 
               inputLower.includes(answerLower);
    });

    const answerInput = document.getElementById('answer-input');

    if (!matchedAnswer) {
        // Respuesta incorrecta
        gameState.roundStrikes++;
        gameState.answeredCorrectly = false;

        // Mostrar feedback visual
        answerInput.classList.add('error');
        setTimeout(() => answerInput.classList.remove('error'), 500);

        // Si se alcanzaron 3 strikes, pasar turno
        if (gameState.roundStrikes >= 3) {
            showFeedbackMessage(`¡3 Errores! Turno del equipo ${game.teams[1 - currentTeamIndex].name}`, 'error');
            setTimeout(() => {
                switchTeam();
            }, 2000);
        } else {
            showFeedbackMessage(`Incorrecto. Errores: ${gameState.roundStrikes}/3`, 'error');
        }
    } else if (matchedAnswer.revealed) {
        // Ya fue revelada
        showFeedbackMessage('Esa respuesta ya fue revelada', 'warning');
    } else {
        // Respuesta correcta
        matchedAnswer.revealed = true;
        gameState.roundScore += matchedAnswer.points;
        gameState.revealedAnswerCount++;
        gameState.answeredCorrectly = true;
        game.teams[currentTeamIndex].totalScore += matchedAnswer.points;

        // Actualizar puntuación
        updateGameUI();
        renderCurrentRound();

        showFeedbackMessage(`¡Correcto! +${matchedAnswer.points} puntos`, 'success');

        // Verificar si se revelaron todas
        if (gameState.revealedAnswerCount === round.answers.length) {
            setTimeout(() => {
                showFeedbackMessage('¡Ronda completada!', 'success');
                setTimeout(() => {
                    endRound();
                }, 1500);
            }, 1000);
        }
    }

    // Limpiar input
    answerInput.value = '';
    focusAnswerInput();
}

// ==================== CAMBIAR EQUIPO ====================
function switchTeam() {
    gameState.currentTeamIndex = 1 - gameState.currentTeamIndex;
    gameState.roundStrikes = 0;
    gameState.roundScore = 0;
    updateGameUI();
    renderCurrentRound();
    focusAnswerInput();
}

// ==================== FIN DE RONDA ====================
function endRound() {
    const { game, currentRoundIndex } = gameState;

    if (currentRoundIndex < game.rounds.length - 1) {
        // Siguiente ronda
        gameState.currentRoundIndex++;
        gameState.currentTeamIndex = 0;
        gameState.roundScore = 0;
        gameState.roundStrikes = 0;
        gameState.revealedAnswerCount = 0;
        gameState.answeredCorrectly = false;

        updateGameUI();
        renderCurrentRound();
        focusAnswerInput();
    } else {
        // Fin del juego
        endGame();
    }
}

// ==================== FIN DEL JUEGO ====================
function endGame() {
    const { game } = gameState;
    const modal = document.getElementById('game-end-modal');
    const finalScoresDiv = document.getElementById('final-scores');

    // Determinar ganador
    const team1Score = game.teams[0].totalScore;
    const team2Score = game.teams[1].totalScore;
    const winner = team1Score > team2Score ? 0 : (team2Score > team1Score ? 1 : -1);

    // Mostrar puntuaciones finales
    finalScoresDiv.innerHTML = game.teams.map((team, index) => {
        const isWinner = index === winner;
        return `
            <div class="final-score-item ${isWinner ? 'winner' : ''}">
                ${team.name}: ${team.totalScore} puntos
                ${isWinner ? ' ✓' : ''}
            </div>
        `;
    }).join('');

    // Mostrar modal
    modal.classList.remove('hidden');

    // Guardar en historial
    const historyEntry = {
        gameId: game.id,
        gameName: game.name,
        date: new Date().toISOString(),
        finalScores: game.teams.map(t => ({ name: t.name, score: t.totalScore })),
        winner: winner >= 0 ? game.teams[winner].name : 'Empate'
    };
    window.saveHistoryEntry(historyEntry);
}

// ==================== MOSTRAR MENSAJE ====================
function showFeedbackMessage(message, type = 'info') {
    // Crear elemento temporal para feedback
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

// ==================== FOCUS EN INPUT ====================
function focusAnswerInput() {
    document.getElementById('answer-input').focus();
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', function() {
    window.initializeGamePlay();

    // Enviar respuesta con botón
    document.getElementById('submit-answer-btn').addEventListener('click', function() {
        const input = document.getElementById('answer-input');
        if (input.value.trim()) {
            handleAnswerSubmission(input.value);
        }
    });

    // Enviar respuesta con Enter
    document.getElementById('answer-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && this.value.trim()) {
            handleAnswerSubmission(this.value);
        }
    });

    // Botón siguiente ronda
    document.getElementById('btn-next-round').addEventListener('click', function() {
        endRound();
    });

    // Botón pasar turno
    document.getElementById('btn-skip').addEventListener('click', function() {
        switchTeam();
    });

    // Botón continuar en modal
    document.getElementById('btn-continue-modal').addEventListener('click', function() {
        document.getElementById('round-end-modal').classList.add('hidden');
        endRound();
    });

    // Botón volver al home
    document.getElementById('btn-back-home').addEventListener('click', function() {
        window.location.href = '../index.html';
    });
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
