import { describe, expect, it } from 'vitest';
import { areCoordsEqual } from '../../src/game/coords/logic';
import { TOKEN_START_COORDINATES } from '../../src/game/tokens/constants';
import { trackPosToBoardCoordinate } from '../../src/online/mapServerPieceToBoard';

describe('mapServerPieceToBoard', () => {
  it('maps backend shared-track index 0 (red start) to the red start cell on the SVG board', () => {
    const c = trackPosToBoardCoordinate(0);
    expect(areCoordsEqual(c, TOKEN_START_COORDINATES.red)).toBe(true);
  });

  it('maps blue start on the shared track to the blue start cell', () => {
    const c = trackPosToBoardCoordinate(39);
    expect(areCoordsEqual(c, TOKEN_START_COORDINATES.blue)).toBe(true);
  });
});
