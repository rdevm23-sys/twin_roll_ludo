/** WebSocket URL for the game server (`/ws` on the API host). */
export function getGameWebSocketUrl(): string {
  const fromEnv = import.meta.env.VITE_WS_URL as string | undefined;
  if (fromEnv) return fromEnv;

  if (import.meta.env.DEV) {
    const { protocol, host } = window.location;
    const wsProto = protocol === 'https:' ? 'wss' : 'ws';
    return `${wsProto}://${host}/ws`;
  }

  const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${wsProto}://${window.location.host}/ws`;
}
