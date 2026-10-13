const STORAGE_KEY = 'socketlab:v2';

const DEFAULTS = {
  url: 'wss://echo.websocket.org',
  protocols: '',
  binaryType: 'arraybuffer',
  reconnect: true,
  reconnectDelay: 2000,
  reconnectLimit: 5,
  connectTimeout: 10000,
  composerMode: 'text',
  composer: '{\n  "event": "hello",\n  "data": "SocketLab"\n}',
  composerHeight: 220,
  autoClearComposer: false,
  intervalMs: 1000,
  intervalCount: 0,
  theme: 'dark',
  autoScroll: true,
  capturePaused: false,
  defaultMessageCollapsed: true,
  templates: [
    { id: 'hello', name: 'Hello JSON', mode: 'json', content: '{\n  "event": "hello",\n  "data": "SocketLab"\n}' },
    { id: 'ping', name: 'Ping', mode: 'json', content: '{"type":"ping"}' },
  ],
  recentUrls: [],
};

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return { ...structuredClone(DEFAULTS), ...saved };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function saveSettings(settings) {
  const safe = {
    url: settings.url,
    protocols: settings.protocols,
    binaryType: settings.binaryType,
    reconnect: settings.reconnect,
    reconnectDelay: settings.reconnectDelay,
    reconnectLimit: settings.reconnectLimit,
    connectTimeout: settings.connectTimeout,
    composerMode: settings.composerMode,
    composer: settings.composer,
    composerHeight: settings.composerHeight,
    autoClearComposer: settings.autoClearComposer,
    intervalMs: settings.intervalMs,
    intervalCount: settings.intervalCount,
    theme: settings.theme,
    autoScroll: settings.autoScroll,
    defaultMessageCollapsed: settings.defaultMessageCollapsed,
    templates: settings.templates,
    recentUrls: settings.recentUrls.slice(0, 8),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
}

export function resetSettings() {
  localStorage.removeItem(STORAGE_KEY);
  return structuredClone(DEFAULTS);
}

export { DEFAULTS };
