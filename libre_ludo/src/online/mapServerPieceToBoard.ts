import { getHomeCoordForColour } from '../game/coords/logic';
import { TOKEN_LOCKED_COORDINATES } from '../game/tokens/constants';
import { expandedGeneralTokenPath, expandedTokenHomeEntryPath } from '../game/tokens/paths';
import { getTokenAlignmentData } from '../game/tokens/alignment';
import type { TCoordinate, TPlayerColour } from '../types';
import type { ServerPiece } from './types';

/** Backend track index 0 = red start; frontend general path index 0 = blue start (offset +13 mod 52). */
export const SERVER_TRACK_TO_BOARD_INDEX_OFFSET = 13;

const COLOURS: TPlayerColour[] = ['red', 'green', 'yellow', 'blue'];

function isPlayerColour(c: string): c is TPlayerColour {
  return (COLOURS as string[]).includes(c);
}

function baseCoordinate(piece: ServerPiece): TCoordinate {
  const color = piece.color;
  if (!isPlayerColour(color)) {
    return { x: 7, y: 7 };
  }

  if (piece.finished) {
    return getHomeCoordForColour(color);
  }

  if (piece.pos === -1) {
    return TOKEN_LOCKED_COORDINATES[color][piece.index] ?? TOKEN_LOCKED_COORDINATES[color][0];
  }

  if (piece.pos >= 100) {
    const colPos = piece.pos - 100;
    const homePath = expandedTokenHomeEntryPath[color];
    return homePath[Math.min(colPos, homePath.length - 1)] ?? getHomeCoordForColour(color);
  }

  const pathIndex = (piece.track_pos + SERVER_TRACK_TO_BOARD_INDEX_OFFSET) % 52;
  return expandedGeneralTokenPath[pathIndex] ?? { x: 7, y: 7 };
}

export type PlacedServerPiece = {
  pieceId: string;
  piece: ServerPiece;
  coord: TCoordinate;
  alignmentIndex: number;
  alignmentCount: number;
};

/** Assign stacking offsets for pieces sharing the same board cell. */
export function placeServerPiecesOnBoard(pieces: Record<string, ServerPiece>): PlacedServerPiece[] {
  const entries = Object.entries(pieces);
  const groups = new Map<string, string[]>();

  for (const [pieceId, piece] of entries) {
    const coord = baseCoordinate(piece);
    const key = `${coord.x},${coord.y}`;
    const list = groups.get(key);
    if (list) list.push(pieceId);
    else groups.set(key, [pieceId]);
  }

  const alignmentRank = new Map<string, number>();
  for (const ids of groups.values()) {
    const sorted = [...ids].sort((a, b) => a.localeCompare(b));
    sorted.forEach((id, i) => alignmentRank.set(id, i));
  }

  return entries.map(([pieceId, piece]) => {
    const coord = baseCoordinate(piece);
    const key = `${coord.x},${coord.y}`;
    const group = groups.get(key) ?? [pieceId];
    const count = group.length;
    const index = alignmentRank.get(pieceId) ?? 0;
    return {
      pieceId,
      piece,
      coord,
      alignmentIndex: index,
      alignmentCount: count,
    };
  });
}

export function getAlignmentForStackSlot(count: number, index: number) {
  const layouts = getTokenAlignmentData(count);
  return layouts[index] ?? layouts[0];
}

/** Test helper: board cell for a token on the shared track only. */
export function trackPosToBoardCoordinate(trackPos: number): TCoordinate {
  const pathIndex = (trackPos + SERVER_TRACK_TO_BOARD_INDEX_OFFSET) % 52;
  return expandedGeneralTokenPath[pathIndex];
}

