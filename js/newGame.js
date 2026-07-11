const form = document.getElementById('new-game-form');
const descriptionText = document.getElementById('page-description-text');
const defaultDescription = descriptionText?.textContent || '';
const openModalButton = document.getElementById('open-answer-modal');
const closeModalButton = document.getElementById('close-answer-modal');
const saveAnswerButton = document.getElementById('save-answer');
const answerModal = document.getElementById('answer-modal');
const roundModalFeedback = document.getElementById('round-modal-feedback');
const prevRoundButton = document.getElementById('prev-round');
const nextRoundButton = document.getElementById('next-round');
const roundTitle = document.getElementById('round-title');
const roundsCountInput = document.getElementById('rounds-count');
const confirmModal = document.getElementById('confirm-modal');
const confirmSummary = document.getElementById('confirm-summary');
const cancelCreateButton = document.getElementById('cancel-create');
const confirmCreateButton = document.getElementById('confirm-create');
const resetFormButton = document.getElementById('reset-form-btn');

const roundsData = [];
let currentRound = 1;

window.initializeStorage();

function getFieldValue(id) {
  const input = document.getElementById(id);
  return input ? input.value.trim() : '';
}

function setFeedback(message, type = 'success') {
  if (!descriptionText) return;
  descriptionText.textContent = message;
  descriptionText.className = type;
  
  // Auto-restore default description after 3 seconds for success messages
  if (type === 'success') {
    setTimeout(() => {
      restoreDefaultDescription();
    }, 3000);
  }
}

function restoreDefaultDescription() {
  if (!descriptionText) return;
  descriptionText.textContent = defaultDescription;
  descriptionText.className = '';
}

function setRoundModalFeedback(message = '') {
  if (!roundModalFeedback) return;
  roundModalFeedback.textContent = message;
  roundModalFeedback.classList.toggle('show', Boolean(message));
}

function getRoundCount() {
  const value = Number(roundsCountInput?.value || 1);
  return Number.isInteger(value) && value > 0 ? value : 1;
}

function saveCurrentRound() {
  const entries = [];
  for (let index = 1; index <= 5; index += 1) {
    const answerInput = document.getElementById(`answer-${index}`);
    const pointsInput = document.getElementById(`points-${index}`);
    entries.push({
      text: answerInput?.value.trim() || '',
      points: Number(pointsInput?.value || 0)
    });
  }
  roundsData[currentRound - 1] = entries;
}

function getRoundPointsTotal(entries) {
  return (entries || []).reduce((sum, entry) => sum + (Number(entry?.points) || 0), 0);
}

function validateRoundPointsLimit(entries, roundNumber = currentRound) {
  const totalPoints = getRoundPointsTotal(entries);
  if (totalPoints > 100) {
    return `La suma de puntos de la ronda ${roundNumber} no puede sobrepasar 100 (actual: ${totalPoints}).`;
  }
  return '';
}

function validateAllRoundsPointsLimit(payload) {
  const rounds = Array.isArray(payload?.roundsData) ? payload.roundsData : [];
  for (let index = 0; index < rounds.length; index += 1) {
    const error = validateRoundPointsLimit(rounds[index], index + 1);
    if (error) {
      return error;
    }
  }
  return '';
}

function loadCurrentRound() {
  const entries = roundsData[currentRound - 1] || [];
  for (let index = 1; index <= 5; index += 1) {
    const answerInput = document.getElementById(`answer-${index}`);
    const pointsInput = document.getElementById(`points-${index}`);
    const entry = entries[index - 1] || { text: '', points: 0 };
    if (answerInput) answerInput.value = entry.text;
    if (pointsInput) pointsInput.value = entry.points;
  }

  const roundCount = getRoundCount();
  if (roundTitle) {
    roundTitle.textContent = `Ronda ${Math.min(currentRound, roundCount)}`;
  }
}

function openModal() {
  const roundCount = getRoundCount();
  currentRound = Math.min(currentRound, roundCount);
  loadCurrentRound();
  setRoundModalFeedback('');
  answerModal?.classList.add('open');
  answerModal?.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  answerModal?.classList.remove('open');
  answerModal?.setAttribute('aria-hidden', 'true');
  setRoundModalFeedback('');
}

function openConfirmModal(payload) {
  confirmSummary.innerHTML = generateConfirmationSummary(payload);
  confirmModal?.classList.add('open');
  confirmModal?.setAttribute('aria-hidden', 'false');
}

function closeConfirmModal() {
  confirmModal?.classList.remove('open');
  confirmModal?.setAttribute('aria-hidden', 'true');
}

function generateConfirmationSummary(payload) {
  const answersCount = payload.roundsData.reduce((total, round) => {
    return total + round.filter(answer => answer.text.trim()).length;
  }, 0);

  return `
    <div class="summary-item">
      <strong>Nombre de la partida:</strong>
      <p>${payload.gameName}</p>
    </div>
    <div class="summary-item">
      <strong>Equipos:</strong>
      <p>${payload.teamAName} vs ${payload.teamBName}</p>
    </div>
    <div class="summary-item">
      <strong>Número de rondas:</strong>
      <p>${payload.roundsCount} rondas</p>
    </div>
    <div class="summary-item">
      <strong>Respuestas configuradas:</strong>
      <p>${answersCount} respuestas de un total de ${payload.roundsCount * 5}</p>
    </div>
    <div class="summary-item">
      <strong>Sonido:</strong>
      <p>${payload.enableSounds ? '✓ Activado' : '✗ Desactivado'}</p>
    </div>
  `;
}

function validatePayload(payload) {
  if (!payload.gameName) {
    return 'Por favor ingresa el nombre de la partida.';
  }
  if (!payload.teamAName) {
    return 'Por favor ingresa el nombre del equipo A.';
  }
  if (!payload.teamBName) {
    return 'Por favor ingresa el nombre del equipo B.';
  }
  if (payload.teamAName.toLowerCase() === payload.teamBName.toLowerCase()) {
    return 'Los nombres de los equipos deben ser diferentes.';
  }
  if (!Number.isInteger(payload.roundsCount) || payload.roundsCount < 1 || payload.roundsCount > 10) {
    return 'El número de rondas debe ser un número entero entre 1 y 10.';
  }
  return '';
}

openModalButton?.addEventListener('click', openModal);
closeModalButton?.addEventListener('click', closeModal);
prevRoundButton?.addEventListener('click', () => {
  if (currentRound > 1) {
    saveCurrentRound();
    currentRound -= 1;
    loadCurrentRound();
    setRoundModalFeedback('');
  }
});
nextRoundButton?.addEventListener('click', () => {
  const roundCount = getRoundCount();
  if (currentRound < roundCount) {
    saveCurrentRound();
    currentRound += 1;
    loadCurrentRound();
    setRoundModalFeedback('');
  }
});
saveAnswerButton?.addEventListener('click', () => {
  const entries = [];
  for (let index = 1; index <= 5; index += 1) {
    const answerInput = document.getElementById(`answer-${index}`);
    const pointsInput = document.getElementById(`points-${index}`);
    entries.push({
      text: answerInput?.value.trim() || '',
      points: Number(pointsInput?.value || 0)
    });
  }

  const roundError = validateRoundPointsLimit(entries);
  if (roundError) {
    setRoundModalFeedback(roundError);
    return;
  }

  setRoundModalFeedback('');
  roundsData[currentRound - 1] = entries;
  closeModal();
  setFeedback(`Respuestas de la ronda ${currentRound} guardadas.`, 'success');
});

roundsCountInput?.addEventListener('input', () => {
  currentRound = 1;
  loadCurrentRound();
});

let pendingPayload = null;

form?.addEventListener('submit', event => {
  event.preventDefault();

  const payload = {
    gameName: getFieldValue('game-name'),
    teamAName: getFieldValue('team-a-name'),
    teamBName: getFieldValue('team-b-name'),
    roundsCount: Number(getFieldValue('rounds-count')),
    enableDoubleRound: document.getElementById('double-rounds')?.checked || false,
    enableSounds: document.getElementById('enable-sounds')?.checked || false,
    roundsData
  };

  const validationError = validatePayload(payload);
  if (validationError) {
    setFeedback(validationError, 'error');
    return;
  }

  saveCurrentRound();

  const roundsValidationError = validateAllRoundsPointsLimit(payload);
  if (roundsValidationError) {
    setFeedback(roundsValidationError, 'error');
    return;
  }

  pendingPayload = payload;
  openConfirmModal(payload);
});

cancelCreateButton?.addEventListener('click', () => {
  closeConfirmModal();
  pendingPayload = null;
});

confirmCreateButton?.addEventListener('click', () => {
  if (!pendingPayload) return;
  
  const game = window.createGameState(pendingPayload);
  closeConfirmModal();
  setFeedback(`Partida creada exitosamente: ${game.name}. Se ha guardado como partida activa.`, 'success');
  form.reset();
  roundsData.length = 0;
  currentRound = 1;
  loadCurrentRound();
  pendingPayload = null;
});

resetFormButton?.addEventListener('click', () => {
  form.reset();
  roundsData.length = 0;
  currentRound = 1;
  loadCurrentRound();
  setFeedback('Formulario limpiado correctamente.', 'success');
});

loadCurrentRound();
