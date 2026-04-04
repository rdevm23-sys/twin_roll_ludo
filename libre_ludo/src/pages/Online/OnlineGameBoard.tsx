import BoardImage from '../../assets/board.svg?react';
import TokenImage from '../../assets/token.svg?react';
import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../state/store';
import { resizeBoard } from '../../state/slices/boardSlice';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { playerColours } from '../../game/players/constants';
import type { TPlayerColour } from '../../types';
import {
  getAlignmentForStackSlot,
  placeServerPiecesOnBoard,
} from '../../online/mapServerPieceToBoard';
import type { ServerGameState, ValidMove } from '../../online/types';
import styles from './OnlineGameBoard.module.css';
import clsx from 'clsx';

type Props = {
  game: ServerGameState;
  yourColor: string;
  validMoves: ValidMove[];
  onPickMove: (pieceId: string, dieVal: number) => void;
};

function isColour(c: string): c is TPlayerColour {
  return c === 'red' || c === 'green' || c === 'yellow' || c === 'blue';
}

export function OnlineGameBoard({ game, yourColor, validMoves, onPickMove }: Props) {
  const dispatch = useDispatch();
  const { boardTileSize, boardSideLength, tokenHeight, tokenWidth } = useSelector(
    (s: RootState) => s.board
  );
  const [boardNode, setBoardNode] = useState<HTMLDivElement | null>(null);
  const [pendingPiece, setPendingPiece] = useState<string | null>(null);

  const onBoardResize = useCallback(() => {
    if (!boardNode) return;
    dispatch(resizeBoard(boardNode.getBoundingClientRect().width));
  }, [boardNode, dispatch]);

  useResizeObserver(boardNode, onBoardResize);

  const placed = placeServerPiecesOnBoard(game.pieces);
  const canInteract =
    yourColor === game.current_turn &&
    game.dice_rolled &&
    !game.winner &&
    validMoves.length > 0;

  const movesForPiece = (pieceId: string) => validMoves.filter((m) => m.piece_id === pieceId);

  const handlePieceClick = (pieceId: string) => {
    if (!canInteract) return;
    const opts = movesForPiece(pieceId);
    if (opts.length === 0) return;
    if (opts.length === 1) {
      onPickMove(pieceId, opts[0].die_val);
      setPendingPiece(null);
      return;
    }
    setPendingPiece((p) => (p === pieceId ? null : pieceId));
  };

  const posFor = (coord: { x: number; y: number }, align: { xOffset: number; yOffset: number }) => {
    const tileCenterX = coord.x * boardTileSize + boardTileSize / 2;
    const tileCenterY = coord.y * boardTileSize + boardTileSize / 2;
    const x = `${tileCenterX - tokenWidth / 2 + align.xOffset * boardTileSize}px`;
    const y = `${tileCenterY - tokenHeight / 2 + align.yOffset * boardTileSize}px`;
    return { x, y };
  };

  return (
    <div
      className={styles.wrap}
      style={
        {
          '--board-tile-size': `${boardTileSize}px`,
        } as React.CSSProperties
      }
    >
      <div className={styles.board} ref={setBoardNode}>
        {placed.map(({ pieceId, piece, coord, alignmentIndex, alignmentCount }) => {
          const align = getAlignmentForStackSlot(alignmentCount, alignmentIndex);
          const { x, y } = posFor(coord, align);
          const col = piece.color;
          const fill = isColour(col) ? playerColours[col] : '#888';
          const highlight =
            canInteract && movesForPiece(pieceId).length > 0 && piece.color === yourColor;
          const showPicker = pendingPiece === pieceId && movesForPiece(pieceId).length > 1;

          return (
            <div key={pieceId} className={styles.pieceWrap} style={{ transform: `translate(${x}, ${y})` }}>
              <button
                type="button"
                className={clsx(styles.pieceBtn, highlight && styles.pieceHighlight)}
                style={
                  {
                    '--token-height': `${tokenHeight * align.scaleFactor}px`,
                    '--token-width': `${tokenWidth * align.scaleFactor}px`,
                    '--fill-colour': fill,
                  } as React.CSSProperties
                }
                onClick={() => handlePieceClick(pieceId)}
                aria-label={`Piece ${pieceId}`}
              >
                <TokenImage className={styles.tokenSvg} aria-hidden />
              </button>
              {showPicker && (
                <div className={styles.diePicker} role="group" aria-label="Choose die value">
                  {movesForPiece(pieceId).map((m) => (
                    <button
                      key={m.die_val}
                      type="button"
                      className={styles.diePickBtn}
                      onClick={() => {
                        onPickMove(pieceId, m.die_val);
                        setPendingPiece(null);
                      }}
                    >
                      {m.die_val}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <BoardImage className={styles.boardImage} aria-hidden />
      </div>
      {boardSideLength > 0 && (
        <p className={styles.hint}>
          {game.twin_dice && game.dice_rolled && game.moves_used.length > 0
            ? `Dice left to use: ${game.moves_used.join(', ')}`
            : game.twin_dice
              ? 'Twin dice: use each value on separate moves when applicable.'
              : ''}
        </p>
      )}
    </div>
  );
}
