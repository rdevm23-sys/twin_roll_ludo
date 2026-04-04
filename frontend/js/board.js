// ── Board Constants ───────────────────────────────────
const TRACK_CELLS = [
  // Top-left going right (red lane)
  [6,1],[6,2],[6,3],[6,4],[6,5],
  // Up the right side of left block
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  // Top middle going right
  [0,7],[0,8],
  // Down right side
  [1,8],[2,8],[3,8],[4,8],[5,8],[6,8],
  // Right going right (green lane)
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  // Down
  [7,14],[8,14],
  // Bottom going left (blue lane)
  [8,13],[8,12],[8,11],[8,10],[8,9],
  // Up left side of right block
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  // Bottom middle going left
  [14,7],[14,6],
  // Up left side
  [13,6],[12,6],[11,6],[10,6],[9,6],
  // Left going left (yellow lane)
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
  // Up
  [7,0],[6,0],
];

const HOME_COL_CELLS = {
  red:    [[7,1],[7,2],[7,3],[7,4],[7,5]],
  green:  [[1,7],[2,7],[3,7],[4,7],[5,7]],
  yellow: [[7,13],[7,12],[7,11],[7,10],[7,9]],
  blue:   [[13,7],[12,7],[11,7],[10,7],[9,7]],
};

const HOME_PIECE_POSITIONS = {
  red:    [[1,1],[1,4],[4,1],[4,4]],
  green:  [[1,10],[1,13],[4,10],[4,13]],
  yellow: [[10,1],[10,4],[13,1],[13,4]],
  blue:   [[10,10],[10,13],[13,10],[13,13]],
};

const SAFE_TRACK_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// ── Board Builder ─────────────────────────────────────
const Board = {
  // Build the static 15×15 grid
  build() {
    const board = document.getElementById('ludoBoard');
    board.innerHTML = '';

    const grid = this._makeGrid();
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell ' + grid[r][c];
        cell.id = `cell_${r}_${c}`;
        board.appendChild(cell);
      }
    }
  },

  _makeGrid() {
    const g = Array.from({ length: 15 }, () => Array(15).fill('cell-track'));

    // Home bases
    this._fillRect(g, 0, 0, 6, 6, 'home-red');
    this._fillRect(g, 0, 9, 6, 6, 'home-green');
    this._fillRect(g, 9, 0, 6, 6, 'home-yellow');
    this._fillRect(g, 9, 9, 6, 6, 'home-blue');

    // Center
    this._fillRect(g, 6, 6, 3, 3, 'finish-center');

    // Home columns
    HOME_COL_CELLS.red.forEach(([r,c])    => g[r][c] = 'finish-red');
    HOME_COL_CELLS.green.forEach(([r,c])  => g[r][c] = 'finish-green');
    HOME_COL_CELLS.yellow.forEach(([r,c]) => g[r][c] = 'finish-yellow');
    HOME_COL_CELLS.blue.forEach(([r,c])   => g[r][c] = 'finish-blue');

    // Track cells
    TRACK_CELLS.forEach(([r,c], idx) => {
      // Colour lanes
      if (idx >= 0  && idx <= 4)  g[r][c] = 'track-red';
      else if (idx >= 13 && idx <= 18) g[r][c] = 'track-green';
      else if (idx >= 26 && idx <= 31) g[r][c] = 'track-blue';
      else if (idx >= 39 && idx <= 44) g[r][c] = 'track-yellow';
      else g[r][c] = 'cell-track';

      // Safe squares override (but keep colour lane if it's a start)
      if (SAFE_TRACK_INDICES.has(idx)) {
        // Start squares are already colour-coded — just add safe class via JS
        const cellClass = g[r][c];
        g[r][c] = cellClass + ' cell-safe';
      }
    });

    return g;
  },

  _fillRect(g, r, c, h, w, cls) {
    for (let i = r; i < r + h; i++)
      for (let j = c; j < c + w; j++)
        g[i][j] = cls;
  },

  // Clear all piece elements from board
  clearPieces() {
    document.querySelectorAll('.piece, .home-token').forEach(el => el.remove());
  },

  // Render all pieces from game state
  renderPieces(gameState, myColor, validMoves) {
    this.clearPieces();

    // Group pieces by cell
    const cellMap = {}; // cellKey -> [piece]

    Object.values(gameState.pieces).forEach(p => {
      if (p.finished) return;
      const key = this._getCellKey(p);
      if (!key) return;
      if (!cellMap[key]) cellMap[key] = [];
      cellMap[key].push(p);
    });

    // Also render home base tokens for pieces still at home
    Object.values(gameState.pieces).forEach(p => {
      if (p.finished || p.pos !== -1) return;
      const [r, c] = HOME_PIECE_POSITIONS[p.color][p.index];
      const cell = document.getElementById(`cell_${r}_${c}`);
      if (!cell) return;
      const el = this._createPieceEl(p, myColor, validMoves);
      cell.appendChild(el);
    });

    // Render pieces on track / home column
    Object.entries(cellMap).forEach(([key, pieces]) => {
      if (key.startsWith('home_')) return; // handled above
      const [r, c] = key.split('_').map(Number);
      const cell = document.getElementById(`cell_${r}_${c}`);
      if (!cell) return;

      if (pieces.length === 1) {
        cell.appendChild(this._createPieceEl(pieces[0], myColor, validMoves));
      } else {
        const stack = document.createElement('div');
        stack.className = 'pieces-stack';
        pieces.forEach(p => stack.appendChild(this._createPieceEl(p, myColor, validMoves)));
        cell.appendChild(stack);
      }
    });
  },

  _getCellKey(p) {
    if (p.pos === -1) return `home_${p.color}_${p.index}`;
    if (p.pos >= 100) {
      const colIdx = p.pos - 100;
      const coords = HOME_COL_CELLS[p.color][colIdx];
      if (!coords) return null;
      return `${coords[0]}_${coords[1]}`;
    }
    const coords = TRACK_CELLS[p.track_pos];
    if (!coords) return null;
    return `${coords[0]}_${coords[1]}`;
  },

  _createPieceEl(p, myColor, validMoves) {
    const el = document.createElement('div');
    el.className = `piece piece-${p.color}`;
    el.id = `piece_${p.color}_${p.index}`;
    el.textContent = p.index + 1;

    // Highlight valid moves
    if (myColor && validMoves) {
      const pid = `${p.color}_${p.index}`;
      const isValid = validMoves.some(m => m.piece_id === pid);
      if (isValid) el.classList.add('valid-move');
    }

    el.addEventListener('click', () => Game.onPieceClick(p));
    return el;
  },
};
