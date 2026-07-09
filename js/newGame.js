const form = document.getElementById('new-game-form');
const feedback = document.getElementById('form-feedback');
const openModalButton = document.getElementById('open-answer-modal');
const closeModalButton = document.getElementById('close-answer-modal');
const saveAnswerButton = document.getElementById('save-answer');
const answerModal = document.getElementById('answer-modal');
const prevRoundButton = document.getElementById('prev-round');
const nextRoundButton = document.getElementById('next-round');
const roundTitle = document.getElementById('round-title');
const roundsCountInput = document.getElementById('rounds-count');
const confirmModal = document.getElementById('confirm-modal');
const confirmSummary = document.getElementById('confirm-summary');
const cancelCreateButton = document.getElementById('cancel-create');
const confirmCreateButton = document.getElementById('confirm-create');

const roundsData = [];
let currentRound = 1;

window.initializeStorage();

function getFieldValue(id) {
  const input = document.getElementById(id);
  return input ? input.value.trim() : '';
}

function setFeedback(message, type = 'success') {
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `form-feedback ${type}`;
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
  answerModal?.classList.add('open');
  answerModal?.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  answerModal?.classList.remove('open');
  answerModal?.setAttribute('aria-hidden', 'true');
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
    return 'Please enter a game name.';
  }
  if (!payload.teamAName) {
    return 'Please enter the Team A name.';
  }
  if (!payload.teamBName) {
    return 'Please enter the Team B name.';
  }
  if (payload.teamAName.toLowerCase() === payload.teamBName.toLowerCase()) {
    return 'Team names must be different.';
  }
  if (!Number.isInteger(payload.roundsCount) || payload.roundsCount < 1 || payload.roundsCount > 10) {
    return 'Rounds count must be a whole number between 1 and 10.';
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
  }
});
nextRoundButton?.addEventListener('click', () => {
  const roundCount = getRoundCount();
  if (currentRound < roundCount) {
    saveCurrentRound();
    currentRound += 1;
    loadCurrentRound();
  }
});
saveAnswerButton?.addEventListener('click', () => {
  saveCurrentRound();
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
  setFeedback(`Game created successfully: ${game.name}. Active game is saved.`, 'success');
  form.reset();
  roundsData.length = 0;
  currentRound = 1;
  loadCurrentRound();
  pendingPayload = null;
});

loadCurrentRound();
