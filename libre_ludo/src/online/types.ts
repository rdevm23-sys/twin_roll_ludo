export type ServerPiece = {
  color: string;
  index: number;
  pos: number;
  track_pos: number;
  finished: boolean;
};

export type ServerGameState = {
  pieces: Record<string, ServerPiece>;
  players: string[];
  current_turn: string;
  mode: string;
  twin_dice: boolean;
  dice: number[];
  dice_rolled: boolean;
  moves_used: number[];
  winner: string | null;
  consecutive_sixes: number;
};

export type RoomPlayer = {
  id: string;
  name: string;
  color: string | null;
  ready: boolean;
};

export type ValidMove = {
  piece_id: string;
  die_val: number;
  from?: number;
  to?: number | string;
  captures?: string[];
  is_track?: boolean;
};
