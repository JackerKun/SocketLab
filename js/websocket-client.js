import { normalizeWsUrl, parseProtocols } from './utils.js';

export class WebSocketClient extends EventTarget {
  #socket = null;
  #connectTimer = null;
  #reconnectTimer = null;
  #manualClose = false;
  #attempt = 0;
  #config = {};

  get socket() { return this.#socket; }
  get state() { return this.#socket?.readyState ?? WebSocket.CLOSED; }
  get connected() { return this.state === WebSocket.OPEN; }
  get attempt() { return this.#attempt; }

  connect(config) {
    this.cancelReconnect();
    if ([WebSocket.OPEN, WebSocket.CONNECTING].includes(this.#socket?.readyState)) return;
    this.#config = { ...config, url: normalizeWsUrl(config.url) };
    this.#manualClose = false;
    this.#open();
  }

  #open() {
    const { url, protocols, binaryType = 'arraybuffer', connectTimeout = 10000 } = this.#config;
    this.emit('state', { state: 'connecting', attempt: this.#attempt + 1 });
    try {
      const parsedProtocols = parseProtocols(protocols ?? '');
      this.#socket = parsedProtocols.length ? new WebSocket(url, parsedProtocols) : new WebSocket(url);
      this.#socket.binaryType = binaryType;
      this.#connectTimer = setTimeout(() => {
        if (this.#socket?.readyState === WebSocket.CONNECTING) {
          this.emit('error', { message: `连接超时（${connectTimeout} ms）` });
          this.#socket.close();
        }
      }, connectTimeout);

      this.#socket.addEventListener('open', (event) => {
        clearTimeout(this.#connectTimer);
        this.#attempt = 0;
        this.emit('open', { event, protocol: this.#socket.protocol, extensions: this.#socket.extensions });
        this.emit('state', { state: 'open' });
      });
      this.#socket.addEventListener('message', (event) => this.emit('message', { data: event.data, event }));
      this.#socket.addEventListener('error', (event) => this.emit('error', { message: '连接发生错误，请检查地址、证书与服务状态', event }));
      this.#socket.addEventListener('close', (event) => {
        clearTimeout(this.#connectTimer);
        this.emit('close', { event, manual: this.#manualClose });
        this.emit('state', { state: 'closed' });
        if (!this.#manualClose) this.#scheduleReconnect();
      });
    } catch (error) {
      clearTimeout(this.#connectTimer);
      this.emit('error', { message: error.message, error });
      this.emit('state', { state: 'closed' });
      if (!this.#manualClose) this.#scheduleReconnect();
    }
  }

  #scheduleReconnect() {
    const { reconnect, reconnectDelay = 2000, reconnectLimit = 5 } = this.#config;
    if (!reconnect || this.#attempt >= reconnectLimit) {
      if (reconnect && this.#attempt >= reconnectLimit) this.emit('reconnectend', { attempts: this.#attempt });
      return;
    }
    this.#attempt += 1;
    const delay = Math.min(reconnectDelay * (1.5 ** (this.#attempt - 1)), 30000);
    this.emit('reconnect', { attempt: this.#attempt, delay });
    this.#reconnectTimer = setTimeout(() => this.#open(), delay);
  }

  send(payload) {
    if (!this.connected) throw new Error('连接未就绪，无法发送消息');
    this.#socket.send(payload);
  }

  disconnect(code = 1000, reason = '用户主动断开') {
    this.#manualClose = true;
    this.cancelReconnect();
    clearTimeout(this.#connectTimer);
    if ([WebSocket.OPEN, WebSocket.CONNECTING].includes(this.#socket?.readyState)) {
      this.#socket.close(code, reason);
    } else {
      this.emit('state', { state: 'closed' });
    }
  }

  cancelReconnect() {
    clearTimeout(this.#reconnectTimer);
    this.#reconnectTimer = null;
  }

  emit(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}
