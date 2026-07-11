window.initializeStorage();

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text || '');
    return div.innerHTML;
}

function formatDate(isoValue) {
    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) {
        return 'Fecha no disponible';
    }
    return date.toLocaleString('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
}

function renderHistory() {
    const container = document.getElementById('history-container');
    if (!container) {
        return;
    }

    const history = window.getHistoryEntries();

    if (!history.length) {
        container.innerHTML = `
            <article class="empty-state">
                <h2>Aun no hay resultados guardados</h2>
                <p>Juega una partida completa para verla en el historial.</p>
            </article>
        `;
        return;
    }

    container.innerHTML = history.map((entry, index) => {
        const scores = Array.isArray(entry.finalScores) ? entry.finalScores : [];
        const scoreMarkup = scores.map(score => {
            const teamName = escapeHtml(score.name || 'Equipo');
            const scoreValue = Number(score.score) || 0;
            return `<span class="score-pill">${teamName}: ${scoreValue}</span>`;
        }).join('');

        const linkedGame = entry.gameId
            ? (window.getGames().find(game => game.id === entry.gameId) || null)
            : null;

        const playAgainButton = linkedGame
            ? `<button class="btn btn-play" data-game-id="${linkedGame.id}">Jugar de nuevo</button>`
            : '';

        return `
            <article class="history-item" data-history-index="${index}">
                <div class="history-item-header">
                    <h3 class="history-item-title">${escapeHtml(entry.gameName || 'Partida sin nombre')}</h3>
                    <span class="history-item-date">${formatDate(entry.date)}</span>
                </div>
                <div class="history-item-meta">
                    <div>
                        <div class="scores">${scoreMarkup || '<span class="score-pill">Sin puntuaciones</span>'}</div>
                        <p class="winner">Ganador: ${escapeHtml(entry.winner || 'No definido')}</p>
                    </div>
                    ${playAgainButton}
                </div>
            </article>
        `;
    }).join('');

    container.querySelectorAll('.btn-play').forEach(button => {
        button.addEventListener('click', function() {
            const gameId = this.dataset.gameId;
            if (!gameId) {
                return;
            }

            if (window.resetGameProgress) {
                window.resetGameProgress(gameId);
            }
            window.setActiveGame(gameId);
            window.location.href = './game.html';
        });
    });
}

function confirmClearHistory() {
    if (!window.getHistoryEntries().length) {
        return;
    }

    const confirmed = window.confirm('Se borrara todo el historial de partidas. Esta accion no se puede deshacer.');
    if (!confirmed) {
        return;
    }

    window.clearHistory();
    renderHistory();
}

document.addEventListener('DOMContentLoaded', function() {
    const clearButton = document.getElementById('btn-clear-history');
    if (clearButton) {
        clearButton.addEventListener('click', confirmClearHistory);
    }

    renderHistory();
});
