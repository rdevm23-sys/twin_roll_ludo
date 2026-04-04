// ── Game State ────────────────────────────────────────
const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const Game = {
  myId: null,
  myColor: null,
  roomCode: null,
  gameState: null,
  validMoves: [],
  selectedDieVal: null,
  pendingPieceId: null,
  isReady: false,

  // ── Init ──────────────────────────────────────────
  init() {
    this._bindWS();
    this._bindUI();
  },

  // ── WS Handlers ──────────────────────────────────
  _bindWS() {
    WS.on('connected', msg => {
      this.myId = msg.player_id;
    });

    WS.on('room_state', msg => this._onRoomState(msg));
    WS.on('waiting_for_players', msg => this._onRoomState(msg));

    WS.on('player_joined', msg => {
      UI.renderWaitPlayers(msg.players, this._maxPlayers);
      UI.notify(`${msg.name} joined!`);
    });

    WS.on('player_ready', msg => {
      UI.renderWaitPlayers(msg.players, this._maxPlayers);
    });

    WS.on('player_left', msg => {
      UI.renderWaitPlayers(msg.players, this._maxPlayers);
      UI.toast(`${msg.name} left`);
    });

    WS.on('game_start', msg => {
      this.gameState = msg.game;
      Board.build();
      this._renderGame();
      UI.showScreen('gameScreen');
    });

    WS.on('dice_rolled', msg => {
      this.gameState = msg.game;
      this.validMoves = msg.valid_moves || [];
      this._renderDice(msg.rolls, msg.auto_pass);
      this._renderGame();
      // No popup for auto_pass - just let the UI update silently
    });

    WS.on('piece_moved', msg => {
      this.gameState = msg.game;
      this.validMoves = msg.valid_moves || [];
      this._handleEvents(msg.events);
      this._renderDiceAfterMove(msg.remaining_dice);
      this._renderGame();
      if (msg.extra_turn && msg.game.current_turn === this.myColor) {
        UI.notify('🎲 Rolled a 6 — roll again!');
      }
    });

    WS.on('chat', msg => {
      UI.appendChat(msg.name, msg.color, msg.msg);
    });

    WS.on('error', msg => {
      UI.toast(msg.msg || 'Error');
    });
  },

  // ── UI Bindings ───────────────────────────────────
  _bindUI() {
    // Seg controls
    document.querySelectorAll('.seg').forEach(seg => UI.initSeg(seg));

    // Roll button
    document.getElementById('rollBtn').addEventListener('click', () => this.doRoll());

    // Chat
    document.getElementById('chatInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') this.sendChat();
    });
    document.getElementById('chatSendBtn').addEventListener('click', () => this.sendChat());

    // Die modal confirm
    document.getElementById('confirmDieBtn').addEventListener('click', () => this._confirmDie());
    document.getElementById('cancelDieBtn').addEventListener('click', () => this._closeDieModal());

    // Copy code
    document.getElementById('copyCodeBtn').addEventListener('click', () => {
      UI.copyText(this.roomCode);
    });

    // Ready button
    document.getElementById('readyBtn').addEventListener('click', () => this.toggleReady());
  },

  // ── Room ──────────────────────────────────────────
  _maxPlayers: 4,

  _onRoomState(msg) {
    this.myColor = msg.your_color;
    this.roomCode = msg.code;
    this._maxPlayers = msg.max_players;

    document.getElementById('displayCode').textContent = msg.code;
    document.getElementById('modePill').textContent =
      (msg.twin_dice ? '🎲🎲 Twin Dice' : '🎲 Normal') + ` · ${msg.max_players} players`;

    UI.renderWaitPlayers(msg.players, msg.max_players);
    UI.showScreen('waitScreen');
  },

  createRoom() {
    const name = document.getElementById('createName').value.trim() || 'Player';
    const maxPlayers = parseInt(UI.getSegVal(document.getElementById('createPlayersSeg')));
    const twinDice = UI.getSegVal(document.getElementById('createDiceSeg')) === 'true';
    const isPublic = document.getElementById('createPublic').checked;
    WS.connect(() => WS.send({ action: 'create_room', name, max_players: maxPlayers, twin_dice: twinDice, is_public: isPublic }));
  },

  joinRoom() {
    const name = document.getElementById('joinName').value.trim() || 'Player';
    const code = document.getElementById('joinCode').value.toUpperCase().trim();
    if (!code) { UI.toast('Enter a room code'); return; }
    WS.connect(() => WS.send({ action: 'join_room', name, code }));
  },

  findMatch() {
    const name = document.getElementById('matchName').value.trim() || 'Player';
    const maxPlayers = parseInt(UI.getSegVal(document.getElementById('matchPlayersSeg')));
    const twinDice = UI.getSegVal(document.getElementById('matchDiceSeg')) === 'true';
    WS.connect(() => WS.send({ action: 'find_match', name, max_players: maxPlayers, twin_dice: twinDice }));
  },

  toggleReady() {
    WS.send({ action: 'toggle_ready' });
    this.isReady = !this.isReady;
    const btn = document.getElementById('readyBtn');
    btn.textContent = this.isReady ? '✓ Ready!' : "I'm Ready";
    btn.style.background = this.isReady ? 'var(--green)' : '';
  },

  // ── Game ──────────────────────────────────────────
  _renderGame() {
    if (!this.gameState) return;
    const g = this.gameState;
    const isMyTurn = g.current_turn === this.myColor;

    // Board pieces
    Board.renderPieces(g, isMyTurn ? this.myColor : null, isMyTurn ? this.validMoves : []);

    // Turn indicator
    document.getElementById('turnDot').style.background = COLOR_HEX[g.current_turn];
    document.getElementById('turnLabel').textContent =
      isMyTurn ? 'Your Turn' : `${this._colorName(g.current_turn)}'s Turn`;

    document.getElementById('diceModeBadge').textContent =
      g.twin_dice ? '🎲🎲 Twin' : '🎲 Normal';

    UI.renderScoreStrip(g);

    // Roll/status
    const rollBtn = document.getElementById('rollBtn');
    const statusMsg = document.getElementById('statusMsg');
    if (isMyTurn && !g.dice_rolled) {
      rollBtn.classList.remove('hidden');
      statusMsg.classList.add('hidden');
    } else {
      rollBtn.classList.add('hidden');
      statusMsg.classList.remove('hidden');
      statusMsg.textContent = isMyTurn
        ? (this.validMoves.length ? 'Pick a piece to move' : 'No valid moves...')
        : `${this._colorName(g.current_turn)} is playing...`;
    }

    // Win
    if (g.winner) UI.showWin(g.winner, g.winner === this.myColor);
  },

  _colorName(c) {
    return c.charAt(0).toUpperCase() + c.slice(1);
  },

  // ── Dice ──────────────────────────────────────────
  _renderDice(rolls, autoPassed) {
    const area = document.getElementById('diceArea');
    area.innerHTML = '';
    rolls.forEach((v, i) => {
      const die = document.createElement('div');
      die.className = 'die rolling available';
      die.id = `die_${i}`;
      die.innerHTML = `<span>${DICE_FACES[v]}</span><span class="die-val-label">${v}</span>`;
      area.appendChild(die);
      // Remove rolling class after animation
      setTimeout(() => die.classList.remove('rolling'), 500);
    });
  },

  _renderDiceAfterMove(remaining) {
    const allDice = this.gameState.dice;
    const area = document.getElementById('diceArea');
    area.innerHTML = '';
    allDice.forEach((v, i) => {
      const die = document.createElement('div');
      const isUsed = !remaining.includes(v);
      die.className = `die ${isUsed ? 'used' : 'available'}`;
      die.id = `die_${i}`;
      die.innerHTML = `<span>${DICE_FACES[v]}</span><span class="die-val-label">${v}</span>`;
      area.appendChild(die);
    });
  },

  doRoll() {
    if (this.gameState && this.gameState.dice_rolled) return;
    WS.send({ action: 'roll_dice' });
  },

  // ── Piece Click ───────────────────────────────────
  onPieceClick(piece) {
    if (!this.gameState) return;
    if (this.gameState.current_turn !== this.myColor) return;
    if (!this.gameState.dice_rolled) return;

    const pid = `${piece.color}_${piece.index}`;
    const moves = this.validMoves.filter(m => m.piece_id === pid);
    if (!moves.length) { UI.toast('Cannot move this piece'); return; }

    if (moves.length === 1) {
      this._executeMove(pid, moves[0].die_val);
    } else {
      this._showDieModal(pid, moves);
    }
  },

  _executeMove(pieceId, dieVal) {
    WS.send({ action: 'move_piece', piece_id: pieceId, die_val: dieVal });
  },

  // ── Die Modal ─────────────────────────────────────
  _showDieModal(pieceId, moves) {
    this.pendingPieceId = pieceId;
    this.selectedDieVal = null;

    const choices = document.getElementById('dieChoices');
    choices.innerHTML = '';
    moves.forEach(m => {
      const div = document.createElement('div');
      div.className = 'die-choice';
      div.dataset.val = m.die_val;
      div.innerHTML = `<span class="die-face">${DICE_FACES[m.die_val]}</span>
                       <span class="die-num">Move ${m.die_val}</span>`;
      div.addEventListener('click', () => {
        choices.querySelectorAll('.die-choice').forEach(d => d.classList.remove('selected'));
        div.classList.add('selected');
        this.selectedDieVal = m.die_val;
      });
      choices.appendChild(div);
    });

    document.getElementById('dieModal').classList.add('show');
  },

  _confirmDie() {
    if (!this.selectedDieVal) { UI.toast('Pick a die first'); return; }
    this._closeDieModal();
    this._executeMove(this.pendingPieceId, this.selectedDieVal);
  },

  _closeDieModal() {
    document.getElementById('dieModal').classList.remove('show');
    this.pendingPieceId = null;
    this.selectedDieVal = null;
  },

  // ── Events ────────────────────────────────────────
  _handleEvents(events) {
    events.forEach(ev => {
      if (ev.type === 'captured') {
        const color = ev.piece_id.split('_')[0];
        UI.notify(`💥 ${this._colorName(color)} piece captured!`);
      }
      if (ev.type === 'finished') {
        const color = ev.piece_id.split('_')[0];
        UI.notify(`🏁 ${this._colorName(color)} piece home!`);
      }
    });
  },

  leaveGame() {
    if (confirm('Leave the game?')) {
      WS.send({ action: 'leave_room' });
      location.reload();
    }
  },
    const inp = document.getElementById('chatInput');
    const msg = inp.value.trim();
    if (!msg) return;
    WS.send({ action: 'chat', msg });
    inp.value = '';
  },
};
