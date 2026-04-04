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

// Six squares per home column (pos 100..105) ending at the center arm; must match backend HOME_COLUMN_LENGTH.
const HOME_COL_CELLS = {
  red:    [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  green:  [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  yellow: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  blue:   [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
};

// Mirrors backend/config.py for path animation (1-based track numbers as on server).
const TOTAL_TRACK = 52;
const HOME_COLUMN_LEN = 6;
const MOVE_START_SQUARES = { red: 1, green: 14, yellow: 27, blue: 40 };
const MOVE_HOME_ENTRY = { red: 51, green: 12, yellow: 25, blue: 38 };
const FINISH_CENTER_CELL = [7, 7];

const HOME_PIECE_POSITIONS = {
  red:    [[1,1],[1,4],[4,1],[4,4]],
  green:  [[1,10],[1,13],[4,10],[4,13]],
  yellow: [[10,1],[10,4],[13,1],[13,4]],
  blue:   [[10,10],[10,13],[13,10],[13,13]],
};

const SAFE_TRACK_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

function _coordForPieceState(color, index, pos, trackPos, finished) {
  if (finished || pos === 200) return FINISH_CENTER_CELL;
  if (pos === -1) return HOME_PIECE_POSITIONS[color][index];
  if (pos >= 100) return HOME_COL_CELLS[color][pos - 100];
  return TRACK_CELLS[trackPos];
}

function _advanceOneStep(color, pos, trackPos) {
  if (pos === -1) return null;
  if (pos >= 100) {
    const colPos = pos - 100;
    const newCol = colPos + 1;
    if (newCol === HOME_COLUMN_LEN) return { pos: 200, track_pos: -1 };
    if (newCol < HOME_COLUMN_LEN) return { pos: 100 + newCol, track_pos: -1 };
    return null;
  }
  const entry = MOVE_HOME_ENTRY[color];
  const startIdx = MOVE_START_SQUARES[color] - 1;
  const stepsTraveled = (trackPos - startIdx + TOTAL_TRACK) % TOTAL_TRACK;
  const stepsToEntry = (entry - startIdx + TOTAL_TRACK) % TOTAL_TRACK;
  const d = 1;
  if (stepsTraveled < stepsToEntry && stepsTraveled + d > stepsToEntry) {
    const colPos = (stepsTraveled + d) - stepsToEntry - 1;
    if (colPos < HOME_COLUMN_LEN) return { pos: 100 + colPos, track_pos: -1 };
    return null;
  }
  const newTrack = (trackPos + d) % TOTAL_TRACK;
  return { pos: newTrack, track_pos: newTrack };
}

/** Coordinates after each step of a move (length = dieVal), matching server rules. */
function _buildStepCoords(color, prev, dieVal) {
  if (prev.finished) return [];
  if (prev.pos === -1) {
    if (dieVal !== 6) return [];
    const startIdx = MOVE_START_SQUARES[color] - 1;
    return [TRACK_CELLS[startIdx]];
  }
  const out = [];
  let pos = prev.pos;
  let trackPos = prev.track_pos;
  for (let s = 0; s < dieVal; s++) {
    const next = _advanceOneStep(color, pos, trackPos);
    if (!next) break;
    pos = next.pos;
    trackPos = next.track_pos;
    if (pos === 200) {
      out.push(FINISH_CENTER_CELL);
      break;
    }
    out.push(_coordForPieceState(color, prev.index, pos, trackPos, false));
  }
  return out;
}

// ── Board Builder ─────────────────────────────────────
const Board = {
  _pathAnimTimer: null,

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

    // Center winning area (3×3): apply after track so cells like [6,8] are not overwritten.
    // Red west [7,5]→, green north [5,7]↓, yellow east ←[7,9], blue south ↑[9,7].
    g[6][6] = 'finish-red';
    g[6][7] = 'finish-green';
    g[6][8] = 'finish-yellow';
    g[7][6] = 'finish-red';
    g[7][7] = 'finish-center';
    g[7][8] = 'finish-yellow';
    g[8][6] = 'finish-blue';
    g[8][7] = 'finish-blue';
    g[8][8] = 'finish-yellow';

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

  // Render all pieces from game state. moveAnim: { pieceId, prev, dieVal } steps along the real path.
  renderPieces(gameState, myColor, validMoves, moveAnim) {
    const overlay = document.getElementById('pieces-overlay');
    const boardEl = document.getElementById('ludoBoard');
    if (!overlay || !boardEl) return;

    if (this._pathAnimTimer) {
      clearTimeout(this._pathAnimTimer);
      this._pathAnimTimer = null;
    }

    const boardRect = boardEl.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    const cellSize = boardRect.width / 15;

    // Calculate board offset within overlay
    const boardOffsetX = boardRect.left - overlayRect.left;
    const boardOffsetY = boardRect.top - overlayRect.top;

    let excludePid = null;
    let animSteps = null;
    let animPrev = null;
    let animPiece = null;
    if (moveAnim?.pieceId && gameState.pieces[moveAnim.pieceId] && moveAnim.dieVal > 0) {
      animPiece = gameState.pieces[moveAnim.pieceId];
      animPrev = moveAnim.prev;
      animSteps = _buildStepCoords(animPiece.color, animPrev, moveAnim.dieVal);
      if (animSteps.length > 0) excludePid = moveAnim.pieceId;
    }

    const renderedPieceIds = new Set();
    const cellMap = this._getPiecePositions(gameState, excludePid);

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

        el.style.transition = '';
        el.style.top = `${top + centerOffset + stackOffset}px`;
        el.style.left = `${left + centerOffset + stackOffset}px`;
      });
    });

    const runPathAnim = () => {
      if (!animPiece || !animPrev || !animSteps || animSteps.length === 0) return;
      const p = animPiece;
      const pieceId = `piece_${p.color}_${p.index}`;
      renderedPieceIds.add(pieceId);

      let el = document.getElementById(pieceId);
      if (!el) {
        el = this._createPieceEl(p);
        overlay.appendChild(el);
      }

      const pieceSize = cellSize * 0.65;
      el.style.width = `${pieceSize}px`;
      el.style.height = `${pieceSize}px`;
      el.style.fontSize = `${pieceSize * 0.45}px`;
      const isValid = myColor && validMoves && validMoves.some(m => m.piece_id === `${p.color}_${p.index}`);
      el.classList.toggle('valid-move', isValid);

      const centerOffset = (cellSize - pieceSize) / 2;
      const placeAt = (coord) => {
        if (!coord) return;
        const [r, c] = coord;
        el.style.top = `${r * cellSize + boardOffsetY + centerOffset}px`;
        el.style.left = `${c * cellSize + boardOffsetX + centerOffset}px`;
      };

      const startCoord = _coordForPieceState(p.color, animPrev.index, animPrev.pos, animPrev.track_pos, !!animPrev.finished);
      el.style.transition = 'none';
      placeAt(startCoord);
      el.offsetHeight; // reflow

      requestAnimationFrame(() => {
        el.style.transition = 'top 0.11s ease-out, left 0.11s ease-out';
        let step = 0;
        const ms = 115;
        const tick = () => {
          if (step < animSteps.length) {
            placeAt(animSteps[step]);
            step += 1;
            this._pathAnimTimer = setTimeout(tick, ms);
          } else {
            this._pathAnimTimer = null;
            if (!p.finished) {
              const fin = _coordForPieceState(p.color, p.index, p.pos, p.track_pos, false);
              placeAt(fin);
            } else {
              placeAt(FINISH_CENTER_CELL);
              setTimeout(() => {
                if (el.parentNode) el.remove();
              }, ms * 2);
            }
          }
        };
        this._pathAnimTimer = setTimeout(tick, ms);
      });
    };

    runPathAnim();

    overlay.querySelectorAll('.piece').forEach(el => {
      if (!renderedPieceIds.has(el.id)) {
        el.remove();
      }
    });

    // Render home token circles for empty home positions
    Object.entries(HOME_PIECE_POSITIONS).forEach(([color, positions]) => {
      positions.forEach(([r, c]) => {
        const cellKey = `${r}_${c}`;
        const hasPiece = cellMap[cellKey] && cellMap[cellKey].length > 0;
        
        if (!hasPiece) {
          const circleId = `home_circle_${color}_${positions.indexOf([r, c])}`;
          let circleEl = document.getElementById(circleId);
          
          if (!circleEl) {
            circleEl = document.createElement('div');
            circleEl.className = `home-token home-token-${color}`;
            circleEl.id = circleId;
            overlay.appendChild(circleEl);
          }
          
          const top = r * cellSize + boardOffsetY;
          const left = c * cellSize + boardOffsetX;
          const centerOffset = (cellSize - cellSize * 0.62) / 2; // Match CSS .home-token width
          
          circleEl.style.width = `${cellSize * 0.62}px`;
          circleEl.style.height = `${cellSize * 0.62}px`;
          circleEl.style.top = `${top + centerOffset}px`;
          circleEl.style.left = `${left + centerOffset}px`;
        } else {
          // Remove circle if piece is now present
          const circleId = `home_circle_${color}_${positions.indexOf([r, c])}`;
          const circleEl = document.getElementById(circleId);
          if (circleEl) circleEl.remove();
        }
      });
    });
  },

  _getPiecePositions(gameState, excludePieceId) {
    const cellMap = {};
    Object.values(gameState.pieces).forEach(p => {
      if (p.finished) return;
      const pid = `${p.color}_${p.index}`;
      if (excludePieceId && pid === excludePieceId) return;
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
