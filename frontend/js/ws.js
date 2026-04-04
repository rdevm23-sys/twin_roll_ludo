// ── WebSocket Manager ────────────────────────────────
const WS_URL = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';

const WS = {
  socket: null,
  handlers: {},

  connect(onOpen) {
    this.socket = new WebSocket(WS_URL);
    this.socket.onopen = onOpen;
    this.socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        const handler = this.handlers[msg.type];
        if (handler) handler(msg);
        else console.log('Unhandled WS message:', msg.type, msg);
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };
    this.socket.onclose = () => {
      UI.toast('Disconnected from server');
    };
    this.socket.onerror = () => {
      UI.toast('Connection error');
    };
  },

  on(type, fn) {
    this.handlers[type] = fn;
  },

  send(obj) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(obj));
    } else {
      UI.toast('Not connected');
    }
  },
};
