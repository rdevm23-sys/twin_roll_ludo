import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import HomeIcon from '../../assets/icons/home.svg?react';
import bg from '../../assets/bg.jpg';
import { getGameWebSocketUrl } from '../../utils/wsUrl';
import type { RoomPlayer, ServerGameState, ValidMove } from '../../online/types';
import { MAX_PLAYER_NAME_LENGTH, playerColours } from '../../game/players/constants';
import { clearBoardState } from '../../state/slices/boardSlice';
import type { AppDispatch } from '../../state/store';
import { OnlineGameBoard } from './OnlineGameBoard';
import styles from './OnlinePage.module.css';

type WsMessage = Record<string, unknown>;

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function OnlinePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const wsRef = useRef<WebSocket | null>(null);
  const [displayName, setDisplayName] = useState(() => {
    try {
      return localStorage.getItem('twinroll_display_name') ?? '';
    } catch {
      return '';
    }
  });
  const [wsReady, setWsReady] = useState(false);
  const [phase, setPhase] = useState<'lobby' | 'playing'>('lobby');
  const [roomCode, setRoomCode] = useState('');
  const [lobbyPlayers, setLobbyPlayers] = useState<RoomPlayer[]>([]);
  const [yourColor, setYourColor] = useState('');
  const [yourId, setYourId] = useState('');
  const [game, setGame] = useState<ServerGameState | null>(null);
  const [validMoves, setValidMoves] = useState<ValidMove[]>([]);
  const [twinDice, setTwinDice] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [roomTwinDice, setRoomTwinDice] = useState(false);
  const [roomMaxPlayers, setRoomMaxPlayers] = useState(4);

  const send = useCallback((payload: object) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  }, []);

  const leaveRoom = useCallback(() => {
    send({ action: 'leave_room' });
    setPhase('lobby');
    setRoomCode('');
    setLobbyPlayers([]);
    setGame(null);
    setValidMoves([]);
    setYourColor('');
  }, [send]);

  const disconnectWs = useCallback(() => {
    send({ action: 'leave_room' });
    wsRef.current?.close();
    wsRef.current = null;
    setWsReady(false);
    setPhase('lobby');
    setRoomCode('');
    setLobbyPlayers([]);
    setGame(null);
    setValidMoves([]);
    setYourColor('');
    setYourId('');
  }, [send]);

  useEffect(() => {
    document.title = 'Twin Roll — Online';
    return () => {
      dispatch(clearBoardState());
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        try {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ action: 'leave_room' }));
        } catch {
          /* ignore */
        }
        ws.close();
      }
    };
  }, [dispatch]);

  const applyRoomPayload = useCallback((msg: WsMessage) => {
    if (typeof msg.code === 'string') setRoomCode(msg.code);
    if (Array.isArray(msg.players)) setLobbyPlayers(msg.players as RoomPlayer[]);
    if (typeof msg.max_players === 'number') setRoomMaxPlayers(msg.max_players);
    if (typeof msg.twin_dice === 'boolean') setRoomTwinDice(msg.twin_dice);
    const yc = asString(msg.your_color);
    if (yc) setYourColor(yc);
    const yid = asString(msg.your_id);
    if (yid) setYourId(yid);
  }, []);

  const handleMessage = useCallback(
    (raw: string) => {
      let msg: WsMessage;
      try {
        msg = JSON.parse(raw) as WsMessage;
      } catch {
        return;
      }
      const t = asString(msg.type);

      if (t === 'error') {
        toast.error(asString(msg.msg) || 'Something went wrong');
        return;
      }

      if (t === 'connected') {
        setYourId(asString(msg.player_id));
        return;
      }

      if (t === 'room_state' || t === 'waiting_for_players') {
        applyRoomPayload(msg);
        setPhase('lobby');
        return;
      }

      if (t === 'player_joined' || t === 'player_ready' || t === 'player_left') {
        if (Array.isArray(msg.players)) setLobbyPlayers(msg.players as RoomPlayer[]);
        return;
      }

      if (t === 'game_start' || t === 'game_state_full') {
        applyRoomPayload(msg);
        const g = msg.game as ServerGameState | undefined;
        if (g) {
          setGame(g);
          setValidMoves([]);
          setPhase('playing');
        }
        return;
      }

      if (t === 'dice_rolled') {
        const g = msg.game as ServerGameState | undefined;
        if (g) setGame(g);
        const vm = msg.valid_moves;
        setValidMoves(Array.isArray(vm) ? (vm as ValidMove[]) : []);
        return;
      }

      if (t === 'piece_moved') {
        const g = msg.game as ServerGameState | undefined;
        if (g) setGame(g);
        const vm = msg.valid_moves;
        setValidMoves(Array.isArray(vm) ? (vm as ValidMove[]) : []);
        return;
      }
    },
    [applyRoomPayload]
  );

  const connect = useCallback(() => {
    const trimmed = displayName.trim() || 'Player';
    setDisplayName(trimmed);
    try {
      localStorage.setItem('twinroll_display_name', trimmed);
    } catch {
      /* ignore */
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setWsReady(true);
      setPhase('lobby');
      return;
    }

    wsRef.current?.close();

    const url = getGameWebSocketUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onopen = () => {
      setWsReady(true);
      setPhase('lobby');
    };
    ws.onmessage = (ev) => handleMessage(ev.data);
    ws.onerror = () => toast.error('Connection error — is the game server running?');
    ws.onclose = () => {
      setWsReady(false);
    };
  }, [displayName, handleMessage]);

  const handleCreatePrivate = () => {
    send({
      action: 'create_room',
      name: displayName.trim() || 'Player',
      max_players: maxPlayers,
      twin_dice: twinDice,
      is_public: false,
    });
  };

  const handleJoin = () => {
    send({
      action: 'join_room',
      code: joinCodeInput.replace(/\D/g, '').slice(0, 3),
      name: displayName.trim() || 'Player',
    });
  };

  const handleFindMatch = () => {
    send({
      action: 'find_match',
      name: displayName.trim() || 'Player',
      max_players: maxPlayers,
      twin_dice: twinDice,
    });
  };

  const handleToggleReady = () => send({ action: 'toggle_ready' });

  const handleRoll = () => send({ action: 'roll_dice' });

  const handleMove = (pieceId: string, dieVal: number) => {
    send({ action: 'move_piece', piece_id: pieceId, die_val: dieVal });
  };

  const handleExit = () => {
    disconnectWs();
    navigate('/');
  };

  const currentTurnName =
    game && lobbyPlayers.length
      ? lobbyPlayers.find((p) => p.color === game.current_turn)?.name ?? game.current_turn
      : '';

  const me = lobbyPlayers.find((p) => p.id === yourId);
  return (
    <div className={styles.page} style={{ backgroundImage: `url(${bg})` }}>
      <header className={styles.topBar}>
        <Link to="/" className={styles.homeLink} aria-label="Home">
          <HomeIcon />
        </Link>
        <span className={styles.brand}>Twin Roll</span>
        {wsReady && (
          <button type="button" className={styles.textBtn} onClick={disconnectWs}>
            Disconnect
          </button>
        )}
      </header>

      <main className={styles.main}>
        {!wsReady && (
          <section className={styles.card}>
            <h1 className={styles.h1}>Online multiplayer</h1>
            <p className={styles.lead}>
              Play over the internet with a short room code. Run the Twin Roll server locally or use
              your deployed host — set <code className={styles.code}>VITE_WS_URL</code> if the socket
              is not on the same origin.
            </p>
            <label className={styles.label}>
              Display name
              <input
                className={styles.input}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={MAX_PLAYER_NAME_LENGTH}
              />
            </label>
            <button type="button" className={styles.primary} onClick={connect}>
              Connect
            </button>
          </section>
        )}

        {wsReady && phase === 'lobby' && (
          <section className={styles.card}>
            <h1 className={styles.h1}>Lobby</h1>
            {roomCode && (
              <p className={styles.roomCode}>
                Room code: <strong>{roomCode}</strong>
              </p>
            )}
            <p className={styles.meta}>
              Mode: {roomTwinDice ? 'Twin dice' : 'Single die'} · Players: {roomMaxPlayers}
            </p>

            <div className={styles.lobbyActions}>
              <h2 className={styles.h2}>New here?</h2>
              <div className={styles.row}>
                <label className={styles.inline}>
                  <input
                    type="checkbox"
                    checked={twinDice}
                    onChange={(e) => setTwinDice(e.target.checked)}
                  />
                  Twin dice
                </label>
                <label className={styles.inline}>
                  Players
                  <select
                    className={styles.select}
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  >
                    <option value={2}>2</option>
                    <option value={4}>4</option>
                  </select>
                </label>
              </div>
              <button type="button" className={styles.primary} onClick={handleCreatePrivate}>
                Create private room
              </button>
              <button type="button" className={styles.secondary} onClick={handleFindMatch}>
                Find public match
              </button>
              <div className={styles.joinRow}>
                <input
                  className={styles.input}
                  placeholder="Room code (3 digits)"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                  inputMode="numeric"
                  maxLength={3}
                />
                <button type="button" className={styles.secondary} onClick={handleJoin}>
                  Join
                </button>
              </div>
            </div>

            {lobbyPlayers.length > 0 && (
              <div className={styles.players}>
                <h2 className={styles.h2}>Players</h2>
                <ul className={styles.playerList}>
                  {lobbyPlayers.map((p) => (
                    <li key={p.id} className={styles.playerItem}>
                      <span
                        className={styles.colourDot}
                        style={{
                          background:
                            p.color && p.color in playerColours
                              ? playerColours[p.color as keyof typeof playerColours]
                              : '#d6d3d1',
                        }}
                      />
                      {p.name}
                      {p.ready ? ' · ready' : ''}
                      {p.id === yourId ? ' (you)' : ''}
                    </li>
                  ))}
                </ul>
                <button type="button" className={styles.primary} onClick={handleToggleReady}>
                  {me?.ready ? 'Unready' : 'Ready'}
                </button>
                <p className={styles.hint}>When everyone is ready, the game starts automatically.</p>
              </div>
            )}

            {roomCode && (
              <button type="button" className={styles.textBtn} onClick={leaveRoom}>
                Leave room
              </button>
            )}
          </section>
        )}

        {phase === 'playing' && game && (
          <section className={styles.gameSection}>
            <div className={styles.gameHeader}>
              <button type="button" className={styles.textBtn} onClick={handleExit}>
                Exit
              </button>
              {roomCode && <span className={styles.pill}>Room {roomCode}</span>}
              <span className={styles.pill}>
                You: <span style={{ textTransform: 'capitalize' }}>{yourColor}</span>
              </span>
            </div>
            <p className={styles.turnLine}>
              {game.winner ? (
                <>
                  Winner: <strong style={{ textTransform: 'capitalize' }}>{game.winner}</strong>
                </>
              ) : (
                <>
                  Turn: <strong>{currentTurnName}</strong>
                  {game.dice_rolled && game.dice.length > 0 && (
                    <span className={styles.diceShow}> · Rolled: {game.dice.join(' + ')}</span>
                  )}
                </>
              )}
            </p>

            {yourColor === game.current_turn && !game.winner && !game.dice_rolled && (
              <button type="button" className={styles.rollBtn} onClick={handleRoll}>
                Roll dice
              </button>
            )}

            <OnlineGameBoard
              game={game}
              yourColor={yourColor}
              validMoves={validMoves}
              onPickMove={handleMove}
            />
          </section>
        )}
      </main>

      <ToastContainer position="top-center" />
    </div>
  );
}

export default OnlinePage;
