// =============================================
//   MANAGE GAME - ADMINISTRAR PARTIDAS
//   Funcionalidad para listar, editar y gestionar
// =============================================

let allGames = [];
let filteredGames = [];
let pendingAction = null;
let selectedGameForAction = null;

// =============================================
// INICIALIZACIÓN
// =============================================
window.initializeManageGame = function() {
    window.initializeStorage();
    loadAllGames();
    attachEventListeners();
    renderGamesList();
};

// =============================================
// CARGA DE DATOS
// =============================================
function loadAllGames() {
    allGames = window.getGames();
    filteredGames = [...allGames];
}

function attachEventListeners() {
    const filterSelect = document.getElementById('filter-status');
    const searchInput = document.getElementById('search-games');

    if (filterSelect) {
        filterSelect.addEventListener('change', applyFilters);
    }

    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }
}

// =============================================
// FILTRADO Y BÚSQUEDA
// =============================================
function applyFilters() {
    const statusFilter = document.getElementById('filter-status')?.value || '';
    const searchTerm = document.getElementById('search-games')?.value.toLowerCase() || '';

    filteredGames = allGames.filter(game => {
        const matchStatus = !statusFilter || game.status === statusFilter;
        const matchSearch = !searchTerm || game.name.toLowerCase().includes(searchTerm);
        return matchStatus && matchSearch;
    });

    renderGamesList();
}

// =============================================
// RENDERIZADO DE LISTA
// =============================================
function renderGamesList() {
    const container = document.getElementById('games-list');

    if (!container) return;

    if (filteredGames.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>${allGames.length === 0 ? 'No hay partidas guardadas' : 'No se encontraron partidas'}</p>
                <a href="./newGame.html" class="btn-primary">${allGames.length === 0 ? 'Crear Primera Partida' : 'Crear Nueva Partida'}</a>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredGames.map(game => createGameCard(game)).join('');
}

function createGameCard(game) {
    const statusClass = game.status || 'setup';
    const statusLabel = getStatusLabel(statusClass);
    const createdDate = new Date(game.createdAt).toLocaleDateString('es-ES');
    const teamA = game.teams?.[0] || { name: 'Equipo A', totalScore: 0 };
    const teamB = game.teams?.[1] || { name: 'Equipo B', totalScore: 0 };
    const roundCount = game.rounds?.length || 0;
    const hiddenClass = game.hidden ? 'hidden' : '';
    const activeGameId = window.getActiveGame()?.id;
    const isActive = game.id === activeGameId;

    return `
        <div class="game-card ${hiddenClass}" data-game-id="${game.id}">
            <div class="game-card-header">
                <h3 class="game-card-title">${escapeHtml(game.name)}</h3>
                <span class="game-status ${statusClass}">${statusLabel}</span>
            </div>

            <div class="game-card-info">
                <div class="info-row">
                    <span class="info-label">Rondas:</span>
                    <span class="info-value">${roundCount}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Creada:</span>
                    <span class="info-value">${createdDate}</span>
                </div>
                ${isActive ? '<div class="info-row"><span class="info-label">Estado:</span><span class="info-value">⭐ Activa</span></div>' : ''}
            </div>

            <div class="game-teams">
                <div class="team-badge-mini">
                    <div>${escapeHtml(teamA.name)}</div>
                    <div style="font-size: 11px; color: var(--yellow-bright);">${teamA.totalScore || 0} pts</div>
                </div>
                <div class="team-badge-mini">
                    <div>${escapeHtml(teamB.name)}</div>
                    <div style="font-size: 11px; color: var(--yellow-bright);">${teamB.totalScore || 0} pts</div>
                </div>
            </div>

            <div class="game-card-actions">
                <button class="btn-card-action btn-play" onclick="playGame('${game.id}')">
                    ▶ Jugar
                </button>
                <button class="btn-card-action btn-details" onclick="showGameDetails('${game.id}')">
                    ℹ Detalles
                </button>
                <button class="btn-card-action btn-hide" onclick="toggleHideGame('${game.id}')">
                    ${game.hidden ? '👁 Mostrar' : '👁‍🗨 Ocultar'}
                </button>
                <button class="btn-card-action btn-delete" onclick="deleteGame('${game.id}')">
                    🗑 Eliminar
                </button>
            </div>
        </div>
    `;
}

function getStatusLabel(status) {
    const labels = {
        'setup': 'Configuración',
        'active': 'En Juego',
        'completed': 'Completada'
    };
    return labels[status] || 'Desconocido';
}

// =============================================
// ACCIONES DE JUEGO
// =============================================
function playGame(gameId) {
    window.setActiveGame(gameId);
    window.location.href = './game.html';
}

function playFromModal() {
    if (selectedGameForAction) {
        playGame(selectedGameForAction);
    }
}

// =============================================
// DETALLES DEL JUEGO
// =============================================
function showGameDetails(gameId) {
    const game = allGames.find(g => g.id === gameId);
    if (!game) return;

    selectedGameForAction = gameId;
    const modal = document.getElementById('detail-modal');
    const titleEl = document.getElementById('modal-title');
    const contentEl = document.getElementById('modal-body-content');

    titleEl.textContent = `Detalles: ${game.name}`;

    const teamA = game.teams?.[0] || { name: 'Equipo A', totalScore: 0 };
    const teamB = game.teams?.[1] || { name: 'Equipo B', totalScore: 0 };
    const createdDate = new Date(game.createdAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    let html = `
        <div class="detail-row">
            <span class="detail-label">Nombre:</span>
            <span class="detail-value">${escapeHtml(game.name)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Estado:</span>
            <span class="detail-value">${getStatusLabel(game.status || 'setup')}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Creada:</span>
            <span class="detail-value">${createdDate}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Rondas:</span>
            <span class="detail-value">${game.rounds?.length || 0}</span>
        </div>

        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255, 215, 0, 0.2);">
            <h4 style="color: var(--yellow-bright); margin: 0 0 12px 0; font-size: 14px;">Equipos</h4>
            <div class="detail-row">
                <span class="detail-label">${escapeHtml(teamA.name)}:</span>
                <span class="detail-value">${teamA.totalScore || 0} puntos</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">${escapeHtml(teamB.name)}:</span>
                <span class="detail-value">${teamB.totalScore || 0} puntos</span>
            </div>
        </div>
    `;

    // Mostrar preguntas
    if (game.rounds && game.rounds.length > 0) {
        html += `<div class="answers-preview">`;
        game.rounds.forEach((round, roundIdx) => {
            html += `<h4 style="color: var(--yellow-bright); margin: 12px 0 8px 0; font-size: 13px;">Ronda ${roundIdx + 1}</h4>`;
            round.answers?.forEach(answer => {
                const revealed = answer.revealed ? '✓' : '○';
                html += `
                    <div class="answer-preview-item">
                        <span>${revealed}</span>
                        <span class="answer-preview-text">${escapeHtml(answer.text)}</span>
                        <div class="answer-preview-points">${answer.points} pts</div>
                    </div>
                `;
            });
        });
        html += `</div>`;
    }

    contentEl.innerHTML = html;
    modal.classList.remove('hidden');
}

function closeDetailModal() {
    document.getElementById('detail-modal').classList.add('hidden');
    selectedGameForAction = null;
}

// =============================================
// OCULTAR/MOSTRAR PARTIDA
// =============================================
function toggleHideGame(gameId) {
    const game = allGames.find(g => g.id === gameId);
    if (!game) return;

    const action = game.hidden ? 'mostrar' : 'ocultar';
    showConfirmModal(
        `¿Deseas ${action} la partida "${game.name}"?`,
        () => {
            game.hidden = !game.hidden;
            window.saveGame(game);
            loadAllGames();
            applyFilters();
            showFeedbackMessage(`Partida ${action}da correctamente`, 'success');
        }
    );
}

// =============================================
// ELIMINAR PARTIDA
// =============================================
function deleteGame(gameId) {
    const game = allGames.find(g => g.id === gameId);
    if (!game) return;

    showConfirmModal(
        `⚠️ ¿Eliminar "${game.name}"?<br><br>Esta acción no se puede deshacer.`,
        () => {
            window.removeGame(gameId);
            loadAllGames();
            applyFilters();
            showFeedbackMessage('Partida eliminada correctamente', 'success');
        }
    );
}

// =============================================
// MODALES DE CONFIRMACIÓN
// =============================================
function showConfirmModal(message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    const messageEl = document.getElementById('confirm-message');
    const confirmBtn = document.getElementById('btn-confirm-action');

    messageEl.innerHTML = message;
    pendingAction = onConfirm;

    confirmBtn.onclick = () => {
        if (pendingAction) {
            pendingAction();
        }
        closeConfirmModal();
    };

    modal.classList.remove('hidden');
}

function closeConfirmModal() {
    document.getElementById('confirm-modal').classList.add('hidden');
    pendingAction = null;
}

// =============================================
// UTILIDADES
// =============================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showFeedbackMessage(message, type = 'info') {
    // Toast simple
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#00b25e' : '#ffd700'};
        color: ${type === 'success' ? '#fff' : '#000'};
        border-radius: 4px;
        font-weight: 700;
        z-index: 2000;
        animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// =============================================
// INICIALIZAR AL CARGAR
// =============================================
document.addEventListener('DOMContentLoaded', window.initializeManageGame);
