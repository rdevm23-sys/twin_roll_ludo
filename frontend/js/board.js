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
        
        // Add inner home token circles at piece starting positions
        for (const [color, positions] of Object.entries(HOME_PIECE_POSITIONS)) {
          for (const [pr, pc] of positions) {
            if (pr === r && pc === c) {
              const token = document.createElement('div');
              token.className = `home-token home-token-${color}`;
              cell.appendChild(token);
              break;
            }
          }
        }
        
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

    // Center - color based on position
    // Top row (red arm)
    g[6][6] = 'finish-red';
    g[6][7] = 'finish-red'; 
    g[6][8] = 'finish-green'; // corner
    // Middle row
    g[7][6] = 'finish-blue'; // left
    g[7][7] = 'finish-center'; // center
    g[7][8] = 'finish-green'; // right
    // Bottom row (yellow arm)
    g[8][6] = 'finish-blue'; // corner
    g[8][7] = 'finish-yellow';
    g[8][8] = 'finish-yellow';

    // Home columns
    HOME_COL_CELLS.red.forEach(([r,c])    => g[r][c] = 'finish-red');
    HOME_COL_CELLS.green.forEach(([r,c])  => g[r][c] = 'finish-green');
    HOME_COL_CELLS.yellow.forEach(([r,c]) => g[r][c] = 'finish-yellow');
    HOME_COL_CELLS.blue.forEach(([r,c])   => g[r][c] = 'finish-blue');

    // Track cells — no lane coloring, only safe squares
    TRACK_CELLS.forEach(([r,c], idx) => {
      if (SAFE_TRACK_INDICES.has(idx)) {
        g[r][c] = 'cell-safe';
      } else {
        g[r][c] = 'cell-track';
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
    const overlay = document.getElementById('pieces-overlay');
    if (overlay) overlay.innerHTML = '';
  },

  // Render all pieces from game state
  renderPieces(gameState, myColor, validMoves) {
    const overlay = document.getElementById('pieces-overlay');
    const boardEl = document.getElementById('ludoBoard');
    if (!overlay || !boardEl) return;

    const boardRect = boardEl.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    const cellSize = boardRect.width / 15;

    // Calculate board offset within overlay
    const boardOffsetX = boardRect.left - overlayRect.left;
    const boardOffsetY = boardRect.top - overlayRect.top;

    const renderedPieceIds = new Set();
    const cellMap = this._getPiecePositions(gameState);

    Object.entries(cellMap).forEach(([cellKey, pieces]) => {
      if (cellKey === 'finished') return;

      const [r, c] = cellKey.split('_').map(Number);
      const top = r * cellSize + boardOffsetY;
      const left = c * cellSize + boardOffsetX;

      pieces.forEach((p, stackIndex) => {
        const pieceId = `piece_${p.color}_${p.index}`;
        renderedPieceIds.add(pieceId);

        let el = document.getElementById(pieceId);
        if (!el) {
          el = this._createPieceEl(p);
          overlay.appendChild(el);
        }

        // Set size dynamically based on cell size
        const pieceSize = cellSize * 0.65; // Adjusted piece size
        el.style.width = `${pieceSize}px`;
        el.style.height = `${pieceSize}px`;
        el.style.fontSize = `${pieceSize * 0.45}px`;

        const isValid = myColor && validMoves && validMoves.some(m => m.piece_id === `${p.color}_${p.index}`);
        el.classList.toggle('valid-move', isValid);

        const stackOffset = pieces.length > 1 ? (stackIndex - (pieces.length - 1) / 2) * (pieceSize * 0.1) : 0; // Dynamic stack offset
        const centerOffset = (cellSize - pieceSize) / 2;

        el.style.top = `${top + centerOffset + stackOffset}px`;
        el.style.left = `${left + centerOffset + stackOffset}px`;
      });
    });

    overlay.querySelectorAll('.piece').forEach(el => {
      if (!renderedPieceIds.has(el.id)) {
        el.remove();
      }
    });
  },

  _getPiecePositions(gameState) {
    const cellMap = {};
    Object.values(gameState.pieces).forEach(p => {
      if (p.finished) return;
      let coords;
      if (p.pos === -1) coords = HOME_PIECE_POSITIONS[p.color][p.index];
      else if (p.pos >= 100) coords = HOME_COL_CELLS[p.color][p.pos - 100];
      else coords = TRACK_CELLS[p.track_pos];

      if (coords) {
        const key = `${coords[0]}_${coords[1]}`;
        if (!cellMap[key]) cellMap[key] = [];
        cellMap[key].push(p);
      }
    });
    return cellMap;
  },

  _createPieceEl(p) {
    const el = document.createElement('div');
    el.className = `piece piece-${p.color}`;
    el.id = `piece_${p.color}_${p.index}`;
    el.innerHTML = `<span>${p.index + 1}</span>`;
    el.addEventListener('click', () => Game.onPieceClick(p));
    return el;
  },
};
