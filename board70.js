(() => {
  const BOARD_SIZE = 70;
  const DATA_URL = 'data.json';

  const boardEl = document.getElementById('board');
  const teamCountInput = document.getElementById('teamCount');
  const initTeamsBtn = document.getElementById('initTeamsBtn');
  const teamSelect = document.getElementById('teamSelect');
  const stepInput = document.getElementById('stepInput');
  const moveForwardBtn = document.getElementById('moveForwardBtn');
  const moveBackwardBtn = document.getElementById('moveBackwardBtn');
  const undoBtn = document.getElementById('undoBtn');
  const resetBtn = document.getElementById('resetBtn');
  const teamListEl = document.getElementById('teamList');

  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalClose = document.getElementById('modalClose');

  const TEAM_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9'
  ];

  const STORAGE_KEY = 'som_board70_state';
  let tiles = [];
  let teams = [];
  let history = [];

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ teams, history }));
  }

  function loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const state = JSON.parse(stored);
        if (state && Array.isArray(state.teams)) {
          teams = state.teams;
          history = state.history || [];
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to load state', e);
    }
    return false;
  }

  function openModal(type, text, teamName, pos) {
    modalTitle.textContent = `${teamName} reached tile ${pos}`;
    modalBody.textContent = `${type.toUpperCase()}: ${text || 'No message'}`;
    modal.classList.remove('hidden');
  }

  function closeModal() {
    modal.classList.add('hidden');
  }

  function normalizeTiles(rawTiles) {
    const byId = new Map();
    rawTiles.forEach(tile => {
      if (!tile || !Number.isInteger(tile.id)) return;
      const type = (tile.type || 'empty').toLowerCase();
      byId.set(tile.id, {
        id: tile.id,
        type: ['dare', 'quiz', 'hex', 'mine', 'empty'].includes(type) ? type : 'empty',
        text: tile.text || ''
      });
    });

    return Array.from({ length: BOARD_SIZE }, (_, idx) => {
      const id = idx + 1;
      return byId.get(id) || { id, type: 'empty', text: '' };
    });
  }

  function renderBoard() {
    boardEl.innerHTML = '';
    tiles.forEach(tile => {
      const cell = document.createElement('div');
      cell.className = `tile`;
      const coins = teams
        .filter(team => team.pos === tile.id)
        .map(team => `<span class="team-coin" style="background:${team.color}">${team.id + 1}</span>`)
        .join('');
      cell.innerHTML = `<div class="num">${tile.id}</div>${coins ? `<div class="team-coins">${coins}</div>` : ''}`;
      boardEl.appendChild(cell);
    });
  }

  function renderTeams() {
    teamListEl.innerHTML = '';
    teams.forEach(team => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="team-swatch" style="background:${team.color}"></span>${team.name} (tile ${team.pos})`;
      teamListEl.appendChild(li);
    });

    teamSelect.innerHTML = '';
    teams.forEach(team => {
      const option = document.createElement('option');
      option.value = team.id;
      option.textContent = team.name;
      teamSelect.appendChild(option);
    });
  }

  function initTeams() {
    const count = Math.max(1, Math.min(10, Number(teamCountInput.value) || 1));
    teams = Array.from({ length: count }, (_, idx) => ({
      id: idx,
      name: `Team ${idx + 1}`,
      color: TEAM_COLORS[idx % TEAM_COLORS.length],
      pos: 1
    }));
    history = [];
    saveState();
    renderTeams();
    renderBoard();
  }

  function moveTeam(direction) {
    const teamId = Number(teamSelect.value);
    const steps = Number(stepInput.value);
    const team = teams.find(t => t.id === teamId);

    if (!team || !Number.isInteger(steps) || steps < 1) return;

    const from = team.pos;
    const delta = direction === 'forward' ? steps : -steps;
    const to = Math.max(1, Math.min(BOARD_SIZE, from + delta));

    team.pos = to;
    history.push({ teamId, from, to });
    saveState();
    renderTeams();
    renderBoard();

    const tile = tiles[to - 1] || { type: 'empty', text: '' };
    openModal(tile.type, tile.text, team.name, to);
  }

  function undoMove() {
    const last = history.pop();
    if (!last) return;
    const team = teams.find(t => t.id === last.teamId);
    if (!team) return;
    team.pos = last.from;
    saveState();
    renderTeams();
    renderBoard();
  }

  function resetGame() {
    teams.forEach(team => { team.pos = 1; });
    history = [];
    saveState();
    renderTeams();
    renderBoard();
  }

  async function loadTiles() {
    try {
      const res = await fetch(DATA_URL, { cache: 'no-store' });
      const data = await res.json();
      tiles = normalizeTiles(Array.isArray(data) ? data : data.tiles || []);
      renderBoard();
    } catch (error) {
      tiles = normalizeTiles([]);
      renderBoard();
    }
  }

  modalClose.addEventListener('click', closeModal);
  initTeamsBtn.addEventListener('click', initTeams);
  moveForwardBtn.addEventListener('click', () => moveTeam('forward'));
  moveBackwardBtn.addEventListener('click', () => moveTeam('backward'));
  undoBtn.addEventListener('click', undoMove);
  resetBtn.addEventListener('click', resetGame);

  loadTiles();
  if (loadState()) {
    teamCountInput.value = teams.length;
    renderTeams();
    renderBoard();
  } else {
    initTeams();
  }
})();
