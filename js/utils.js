export const nowTime = (date = new Date()) =>
  new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(date);

export const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replaceAll('.', '-');

export function byteLength(value) {
  if (value instanceof Blob) return value.size;
  if (value instanceof ArrayBuffer) return value.byteLength;
  return new TextEncoder().encode(String(value)).byteLength;
}

export function formatBytes(bytes = 0) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** index);
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

export function normalizeWsUrl(input) {
  const value = input.trim();
  if (!value) throw new Error('请输入 WebSocket 地址');
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(value) && !/^(ws|wss):\/\//i.test(value)) {
    throw new Error('地址必须使用 ws:// 或 wss://');
  }
  const candidate = /^(ws|wss):\/\//i.test(value) ? value : `ws://${value}`;
  const url = new URL(candidate);
  if (!['ws:', 'wss:'].includes(url.protocol)) throw new Error('地址必须使用 ws:// 或 wss://');
  return url.toString();
}

export function parseProtocols(value) {
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];
}

export function prettyJson(value) {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  return JSON.stringify(parsed, null, 2);
}

export function minifyJson(value) {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  return JSON.stringify(parsed);
}

export function isJson(value) {
  if (typeof value !== 'string') return false;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

export function highlightJson(value) {
  const formatted = prettyJson(value);
  const escaped = formatted
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
  return escaped.replace(
    /("(?:\\u[a-fA-F\d]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    (match, jsonString, colon, literal) => {
      if (jsonString) {
        const className = colon ? 'json-key' : 'json-string';
        return `<span class="${className}">${jsonString}</span>${colon ?? ''}`;
      }
      if (literal) return `<span class="json-literal">${match}</span>`;
      return `<span class="json-number">${match}</span>`;
    },
  );
}

export function hexToBytes(value) {
  const clean = value.replace(/0x|\s|,/gi, '');
  if (!clean || clean.length % 2 || !/^[0-9a-f]+$/i.test(clean)) {
    throw new Error('Hex 内容必须是偶数位十六进制字符');
  }
  return Uint8Array.from(clean.match(/.{2}/g), (byte) => Number.parseInt(byte, 16));
}

export function base64ToBytes(value) {
  const clean = value.trim();
  try {
    const binary = atob(clean);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    throw new Error('Base64 内容格式无效');
  }
}

export async function messageToDisplay(data) {
  if (typeof data === 'string') return { text: data, kind: isJson(data) ? 'json' : 'text' };
  if (data instanceof Blob) {
    const buffer = await data.arrayBuffer();
    return { text: bytesToHex(new Uint8Array(buffer)), kind: 'binary' };
  }
  if (data instanceof ArrayBuffer) return { text: bytesToHex(new Uint8Array(data)), kind: 'binary' };
  return { text: String(data), kind: 'text' };
}

export const bytesToHex = (bytes) =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join(' ');

export function encodePayload(value, mode) {
  if (mode === 'json') return minifyJson(value);
  if (mode === 'hex') return hexToBytes(value);
  if (mode === 'base64') return base64ToBytes(value);
  return value;
}

export function closeCodeLabel(code) {
  const codes = {
    1000: '正常关闭', 1001: '端点离开', 1002: '协议错误', 1003: '不支持的数据',
    1005: '未提供状态', 1006: '异常断开', 1007: '数据格式错误', 1008: '违反策略',
    1009: '消息过大', 1010: '扩展协商失败', 1011: '服务端异常', 1012: '服务重启',
    1013: '稍后重试', 1014: '网关异常', 1015: 'TLS 握手失败',
  };
  return `${code} · ${codes[code] ?? '未知原因'}`;
}

export function downloadFile(filename, content, type = 'application/json') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function escapeCsv(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
