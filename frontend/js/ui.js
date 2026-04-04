// ── UI Utilities ─────────────────────────────────────
const UI = {
  // Screen navigation
  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  },

  // Toast notification (bottom)
  toast(msg, duration = 2500) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), duration);
  },

  // Notification (top, accent color)
  notify(msg, duration = 2200) {
    const el = document.getElementById('notif');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), duration);
  },

  // Segmented control
  initSeg(groupEl, onChange) {
    groupEl.querySelectorAll('.seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        groupEl.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (onChange) onChange(btn.dataset.val);
      });
    });
  },

  getSegVal(groupEl) {
    const active = groupEl.querySelector('.seg-btn.active');
    return active ? active.dataset.val : null;
  },

  // Copy to clipboard
  async copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.toast('Copied!');
    } catch {
      this.toast('Copy failed');
    }
  },

  // Render wait screen player list
  renderWaitPlayers(players, maxPlayers) {
    const list = document.getElementById('waitPlayerList');
    let html = '';
    for (let i = 0; i < maxPlayers; i++) {
      const p = players[i];
      const color = p ? COLOR_HEX[p.color] : '#ccc';
      html += `<div class="player-slot">
        <div class="player-color-dot" style="background:${color}"></div>
        <span class="player-slot-name ${p ? '' : 'empty-name'}">${p ? p.name : 'Waiting...'}</span>
        ${p ? `<span class="ready-pill ${p.ready ? 'yes' : ''}">${p.ready ? '✓ Ready' : 'Not ready'}</span>` : ''}
      </div>`;
    }
    list.innerHTML = html;
  },

  // Render score strip
  renderScoreStrip(gameState) {
    const strip = document.getElementById('scoreStrip');
    strip.innerHTML = gameState.players.map(color => {
      const finished = Object.values(gameState.pieces)
        .filter(p => p.color === color && p.finished).length;
      const active = gameState.current_turn === color;
      const hex = COLOR_HEX[color];
      return `<div class="score-chip ${active ? 'active' : ''}"
        style="${active ? `border-color:${hex};` : ''}">
        <div class="score-chip-dot" style="background:${hex}"></div>
        <span>${color.charAt(0).toUpperCase() + color.slice(1)}</span>
        <span style="color:${hex}">${finished}/4</span>
      </div>`;
    }).join('');
  },

  // Show win overlay
  showWin(color, isMe) {
    const overlay = document.getElementById('winOverlay');
    const hex = COLOR_HEX[color];
    document.getElementById('winTitle').textContent =
      color.charAt(0).toUpperCase() + color.slice(1) + ' Wins!';
    document.getElementById('winTitle').style.color = hex;
    document.getElementById('winSub').textContent =
      isMe ? '🎉 Congratulations! You won!' : 'Better luck next time!';
    overlay.classList.add('show');
  },

  // Chat
  appendChat(name, color, msg) {
    const area = document.getElementById('chatArea');
    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.innerHTML = `<span class="chat-name" style="color:${COLOR_HEX[color] || '#333'}">${name}</span>${msg}`;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
  },
};

// ── Color map ─────────────────────────────────────────
const COLOR_HEX = {
  red: '#B71C1C',
  green: '#1B5E20',
  yellow: '#F9A825',
  blue: '#0D47A1',
};

const COLOR_LIGHT = {
  red: '#E57373',
  green: '#66BB6A',
  yellow: '#FFEE58',
  blue: '#42A5F5',
};
