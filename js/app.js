import { WebSocketClient } from './websocket-client.js';
import { loadSettings, saveSettings, resetSettings } from './store.js';
import {
  byteLength, closeCodeLabel, downloadFile, encodePayload, formatBytes,
  highlightJson, isJson, messageToDisplay, minifyJson, normalizeWsUrl, nowTime, prettyJson, uid,
} from './utils.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const elements = {
  url: $('#urlInput'), protocols: $('#protocolsInput'), timeout: $('#timeoutInput'),
  binaryType: $('#binaryTypeSelect'), reconnect: $('#reconnectInput'),
  reconnectDelay: $('#reconnectDelayInput'), reconnectLimit: $('#reconnectLimitInput'),
  reconnectFields: $('#reconnectFields'), recentUrls: $('#recentUrls'), scheme: $('#schemeLabel'),
  connect: $('#connectButton'), disconnect: $('#disconnectButton'), reset: $('#resetButton'),
  status: $('#statusText'), protocol: $('#protocolText'), uptime: $('#uptimeText'),
  chip: $('#connectionChip'), events: $('#eventList'), messageList: $('#messageList'),
  empty: $('#emptyState'), messageCount: $('#messageCountBadge'), templateCount: $('#templateCountBadge'),
  search: $('#searchInput'), pause: $('#pauseButton'), composer: $('#composerInput'),
  defaultMessageState: $('#defaultMessageStateSelect'),
  composerForm: $('#composerForm'), payloadSize: $('#payloadSize'), autoClear: $('#autoClearInput'),
  send: $('#sendButton'), ping: $('#pingButton'), interval: $('#intervalButton'),
  intervalBar: $('#intervalBar'), intervalMs: $('#intervalMsInput'), intervalCount: $('#intervalCountInput'),
  intervalStart: $('#intervalStartButton'), intervalStatus: $('#intervalStatus'), file: $('#fileInput'),
  composerResizeHandle: $('#composerResizeHandle'), toggleAllMessages: $('#toggleAllMessagesButton'),
  templateGrid: $('#templateGrid'), templateDialog: $('#templateDialog'), templateForm: $('#templateForm'),
  templateDialogTitle: $('#templateDialogTitle'), templateName: $('#templateNameInput'),
  templateMode: $('#templateModeSelect'), templateContent: $('#templateContentInput'),
  templateSubmit: $('#templateSubmitButton'),
  theme: $('#themeButton'), shortcuts: $('#shortcutsDialog'),
};

let settings = loadSettings();
const client = new WebSocketClient();
let messages = [];
let events = [];
let activeFilter = 'all';
let intervalTimer = null;
let intervalSent = 0;
let sessionStartedAt = null;
let uptimeTimer = null;
let pendingPing = null;
let editingTemplateId = null;
let stats = freshStats();

function freshStats() {
  return { sent: 0, received: 0, sentBytes: 0, receivedBytes: 0, latency: null };
}

function initialize() {
  hydrateForm();
  bindUi();
  bindClient();
  renderTemplates();
  renderMessages();
  updateStats();
  logEvent('info', 'READY', 'SocketLab 初始化完成');
  if (!('WebSocket' in window)) {
    toast('当前浏览器不支持 WebSocket', 'error');
    elements.connect.disabled = true;
  }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

function hydrateForm() {
  elements.url.value = settings.url;
  elements.protocols.value = settings.protocols;
  elements.timeout.value = settings.connectTimeout;
  elements.binaryType.value = settings.binaryType;
  elements.reconnect.checked = settings.reconnect;
  elements.reconnectDelay.value = settings.reconnectDelay;
  elements.reconnectLimit.value = settings.reconnectLimit;
  elements.composer.value = settings.composer;
  setComposerHeight(settings.composerHeight);
  elements.autoClear.checked = settings.autoClearComposer;
  elements.defaultMessageState.value = settings.defaultMessageCollapsed ? 'collapsed' : 'expanded';
  elements.intervalMs.value = settings.intervalMs;
  elements.intervalCount.value = settings.intervalCount;
  document.documentElement.dataset.theme = settings.theme;
  setComposerMode(settings.composerMode);
  updateScheme();
  updatePayloadSize();
  updateReconnectFields();
  renderRecentUrls();
}

function collectSettings() {
  settings.url = elements.url.value.trim();
  settings.protocols = elements.protocols.value.trim();
  settings.connectTimeout = clampNumber(elements.timeout.value, 1000, 120000, 10000);
  settings.binaryType = elements.binaryType.value;
  settings.reconnect = elements.reconnect.checked;
  settings.reconnectDelay = clampNumber(elements.reconnectDelay.value, 250, 60000, 2000);
  settings.reconnectLimit = clampNumber(elements.reconnectLimit.value, 0, 50, 5);
  settings.composer = elements.composer.value;
  settings.composerHeight = Math.round(elements.composerForm.getBoundingClientRect().height);
  settings.autoClearComposer = elements.autoClear.checked;
  settings.defaultMessageCollapsed = elements.defaultMessageState.value === 'collapsed';
  settings.intervalMs = clampNumber(elements.intervalMs.value, 100, 3600000, 1000);
  settings.intervalCount = clampNumber(elements.intervalCount.value, 0, 100000, 0);
  saveSettings(settings);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function bindUi() {
  elements.connect.addEventListener('click', connect);
  elements.disconnect.addEventListener('click', () => client.disconnect());
  elements.url.addEventListener('input', () => { updateScheme(); collectSettings(); });
  elements.url.addEventListener('keydown', (event) => { if (event.key === 'Enter') connect(); });
  [elements.protocols, elements.timeout, elements.binaryType, elements.reconnectDelay, elements.reconnectLimit, elements.autoClear]
    .forEach((element) => element.addEventListener('change', collectSettings));
  elements.reconnect.addEventListener('change', () => { updateReconnectFields(); collectSettings(); });
  elements.composer.addEventListener('input', () => { updatePayloadSize(); collectSettings(); });
  elements.composerForm.addEventListener('submit', (event) => { event.preventDefault(); sendCurrentPayload(); });
  elements.theme.addEventListener('click', toggleTheme);
  $('#shortcutsButton').addEventListener('click', () => elements.shortcuts.showModal());
  $('#clearEventsButton').addEventListener('click', () => { events = []; renderEvents(); });
  $('#clearMessagesButton').addEventListener('click', clearMessages);
  $('#exportButton').addEventListener('click', exportSession);
  elements.pause.addEventListener('click', togglePause);
  elements.defaultMessageState.addEventListener('change', () => {
    collectSettings();
    toast(`新消息将默认${settings.defaultMessageCollapsed ? '折叠' : '展开'}`);
  });
  elements.toggleAllMessages.addEventListener('click', toggleAllMessages);
  elements.search.addEventListener('input', applyMessageFilter);
  elements.reset.addEventListener('click', resetAllSettings);
  $('#formatButton').addEventListener('click', () => transformJson(prettyJson));
  $('#minifyButton').addEventListener('click', () => transformJson(minifyJson));
  elements.file.addEventListener('change', sendFile);
  elements.ping.addEventListener('click', sendPing);
  elements.interval.addEventListener('click', () => { elements.intervalBar.hidden = !elements.intervalBar.hidden; });
  elements.intervalStart.addEventListener('click', toggleInterval);
  [elements.intervalMs, elements.intervalCount].forEach((element) => element.addEventListener('change', collectSettings));
  $('#saveTemplateButton').addEventListener('click', () => openTemplateDialog('composer'));
  $('#newTemplateButton').addEventListener('click', () => openTemplateDialog('new'));
  elements.templateMode.addEventListener('change', updateTemplateContentPlaceholder);
  $$('[data-dialog-close]', elements.templateDialog).forEach((button) => {
    button.addEventListener('click', () => elements.templateDialog.close('cancel'));
  });
  elements.templateForm.addEventListener('submit', saveTemplate);
  $('#importButton').addEventListener('click', () => $('#importInput').click());
  $('#importInput').addEventListener('change', importSession);
  bindComposerResize();
  $$('.tab').forEach((tab) => tab.addEventListener('click', () => selectTab(tab.dataset.tab)));
  $$('#directionFilter button').forEach((button) => button.addEventListener('click', () => {
    activeFilter = button.dataset.value;
    $$('#directionFilter button').forEach((item) => item.classList.toggle('active', item === button));
    applyMessageFilter();
  }));
  $$('#modeTabs button').forEach((button) => button.addEventListener('click', () => setComposerMode(button.dataset.mode)));
  document.addEventListener('keydown', handleShortcut);
}

function bindClient() {
  client.addEventListener('state', ({ detail }) => setConnectionState(detail.state));
  client.addEventListener('open', ({ detail }) => {
    sessionStartedAt = new Date();
    stats = freshStats();
    startUptime();
    settings.url = elements.url.value = client.socket.url;
    settings.recentUrls = [client.socket.url, ...settings.recentUrls.filter((url) => url !== client.socket.url)].slice(0, 8);
    saveSettings(settings);
    renderRecentUrls();
    elements.protocol.textContent = detail.protocol || '默认';
    $('#sessionUrl').textContent = client.socket.url;
    $('#sessionStarted').textContent = sessionStartedAt.toLocaleString('zh-CN');
    $('#sessionProtocol').textContent = detail.protocol || '未指定';
    $('#sessionExtensions').textContent = detail.extensions || '无';
    logEvent('success', 'OPEN', `连接成功${detail.protocol ? ` · ${detail.protocol}` : ''}`);
    addMessage('system', '连接已建立', 'event');
    toast('WebSocket 连接成功');
    updateStats();
  });
  client.addEventListener('message', async ({ detail }) => {
    const display = await messageToDisplay(detail.data);
    const bytes = byteLength(detail.data);
    stats.received += 1;
    stats.receivedBytes += bytes;
    if (pendingPing && display.text === pendingPing.payload) {
      stats.latency = Math.round(performance.now() - pendingPing.startedAt);
      toast(`回显延迟 ${stats.latency} ms`);
      pendingPing = null;
    }
    addMessage('in', display.text, display.kind, bytes);
    updateStats();
  });
  client.addEventListener('error', ({ detail }) => {
    logEvent('error', 'ERROR', detail.message);
    toast(detail.message, 'error');
  });
  client.addEventListener('close', ({ detail }) => {
    const label = closeCodeLabel(detail.event.code);
    logEvent(detail.manual ? 'info' : 'warn', 'CLOSE', `${label}${detail.event.reason ? ` · ${detail.event.reason}` : ''}`);
    addMessage('system', `连接关闭 · ${label}`, 'event');
    stopInterval();
    stopUptime();
    pendingPing = null;
  });
  client.addEventListener('reconnect', ({ detail }) => {
    logEvent('warn', 'RETRY', `第 ${detail.attempt} 次重连将在 ${Math.round(detail.delay)} ms 后开始`);
    toast(`连接中断，准备第 ${detail.attempt} 次重连`, 'warn');
  });
  client.addEventListener('reconnectend', ({ detail }) => {
    logEvent('error', 'STOP', `已达到重连上限（${detail.attempts} 次）`);
  });
}

function connect() {
  try {
    collectSettings();
    settings.url = normalizeWsUrl(elements.url.value);
    elements.url.value = settings.url;
    saveSettings(settings);
    client.connect(settings);
    logEvent('info', 'CONNECT', settings.url);
  } catch (error) {
    toast(error.message, 'error');
    elements.url.focus();
  }
}

function setConnectionState(state) {
  const map = { connecting: ['CONNECTING', '连接中…'], open: ['OPEN', '已连接'], closed: ['CLOSED', '未连接'] };
  const [label, chipLabel] = map[state] ?? ['IDLE', '未连接'];
  elements.status.textContent = label;
  elements.status.classList.toggle('online', state === 'open');
  elements.chip.className = `connection-chip ${state}`;
  $('span', elements.chip).textContent = chipLabel;
  elements.connect.disabled = state === 'connecting' || state === 'open';
  elements.disconnect.disabled = state === 'closed';
  elements.send.disabled = state !== 'open';
  elements.ping.disabled = state !== 'open';
  elements.interval.disabled = state !== 'open';
  if (state === 'closed') elements.protocol.textContent = '—';
}

function sendCurrentPayload(options = {}) {
  const value = options.value ?? elements.composer.value;
  const mode = options.mode ?? settings.composerMode;
  if (!value && mode !== 'text') return toast('消息内容不能为空', 'warn');
  try {
    const payload = encodePayload(value, mode);
    client.send(payload);
    const bytes = byteLength(payload);
    stats.sent += 1;
    stats.sentBytes += bytes;
    addMessage('out', value, mode === 'json' ? 'json' : mode === 'text' ? (isJson(value) ? 'json' : 'text') : 'binary', bytes);
    updateStats();
    if (elements.autoClear.checked && !options.keep) {
      elements.composer.value = '';
      updatePayloadSize();
      collectSettings();
    }
    return true;
  } catch (error) {
    toast(error.message, 'error');
    return false;
  }
}

function addMessage(direction, content, kind = 'text', bytes = byteLength(content)) {
  if (settings.capturePaused && direction !== 'system') return;
  messages.push({ id: uid(), direction, content: String(content), kind, bytes, time: new Date().toISOString(), collapsed: settings.defaultMessageCollapsed });
  if (messages.length > 2000) messages.splice(0, messages.length - 2000);
  renderMessages();
}

function renderMessages() {
  elements.messageList.querySelectorAll('.message-item').forEach((item) => item.remove());
  elements.empty.hidden = messages.length > 0;
  const fragment = document.createDocumentFragment();
  for (const message of messages) {
    const node = $('#messageTemplate').content.firstElementChild.cloneNode(true);
    node.dataset.direction = message.direction;
    node.dataset.content = message.content.toLowerCase();
    node.classList.add(message.direction);
    node.classList.toggle('collapsed', Boolean(message.collapsed));
    const icon = message.direction === 'in' ? '↓' : message.direction === 'out' ? '↑' : '•';
    const label = message.direction === 'in' ? '收到' : message.direction === 'out' ? '发送' : '系统';
    $('.direction-icon', node).textContent = icon;
    $('.direction-label', node).textContent = label;
    $('time', node).textContent = nowTime(new Date(message.time));
    $('.kind-badge', node).textContent = message.kind;
    $('.message-size', node).textContent = formatBytes(message.bytes);
    const content = $('pre', node);
    if (message.kind === 'json' && isJson(message.content)) {
      content.classList.add('json-content');
      content.innerHTML = highlightJson(message.content);
    } else {
      content.textContent = message.content;
    }
    const collapseButton = $('.collapse-message', node);
    updateCollapseButton(collapseButton, Boolean(message.collapsed));
    collapseButton.addEventListener('click', () => {
      message.collapsed = !message.collapsed;
      node.classList.toggle('collapsed', message.collapsed);
      updateCollapseButton(collapseButton, message.collapsed);
    });
    $('.message-meta', node).addEventListener('dblclick', (event) => {
      if (event.target.closest('button')) return;
      collapseButton.click();
    });
    $('.copy-message', node).addEventListener('click', async () => {
      await navigator.clipboard.writeText(message.content);
      toast('消息已复制');
    });
    fragment.append(node);
  }
  elements.messageList.append(fragment);
  elements.messageCount.textContent = messages.length;
  applyMessageFilter();
  if (settings.autoScroll) elements.messageList.scrollTop = elements.messageList.scrollHeight;
  updateToggleAllButton();
}

function updateCollapseButton(button, collapsed) {
  button.textContent = collapsed ? '展开' : '收起';
  button.title = collapsed ? '展开消息' : '折叠消息';
  button.setAttribute('aria-label', button.title);
  button.setAttribute('aria-expanded', String(!collapsed));
}

function toggleAllMessages() {
  if (!messages.length) return;
  const shouldCollapse = messages.some((message) => !message.collapsed);
  messages.forEach((message) => { message.collapsed = shouldCollapse; });
  renderMessages();
}

function updateToggleAllButton() {
  const allCollapsed = messages.length > 0 && messages.every((message) => message.collapsed);
  elements.toggleAllMessages.title = allCollapsed ? '全部展开' : '全部折叠';
  elements.toggleAllMessages.setAttribute('aria-label', allCollapsed ? '展开全部消息' : '折叠全部消息');
  elements.toggleAllMessages.textContent = allCollapsed ? '⇅' : '⇵';
  elements.toggleAllMessages.disabled = messages.length === 0;
}

function bindComposerResize() {
  let startY = 0;
  let startHeight = 0;

  const resize = (clientY) => setComposerHeight(startHeight + startY - clientY);
  const stop = () => {
    document.body.classList.remove('resizing-composer');
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', stop);
    collectSettings();
  };
  const move = (event) => resize(event.clientY);

  elements.composerResizeHandle.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    startY = event.clientY;
    startHeight = elements.composerForm.getBoundingClientRect().height;
    document.body.classList.add('resizing-composer');
    elements.composerResizeHandle.setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
  });
  elements.composerResizeHandle.addEventListener('keydown', (event) => {
    if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowUp' ? 20 : -20;
    setComposerHeight(elements.composerForm.getBoundingClientRect().height + direction);
    collectSettings();
  });
}

function setComposerHeight(value) {
  const height = clampNumber(value, 170, Math.min(window.innerHeight * 0.62, 560), 220);
  elements.composerForm?.style.setProperty('--composer-height', `${height}px`);
}

function applyMessageFilter() {
  const query = elements.search.value.trim().toLowerCase();
  $$('.message-item', elements.messageList).forEach((item) => {
    const directionMatches = activeFilter === 'all' || item.dataset.direction === activeFilter;
    item.classList.toggle('filtered', !directionMatches || !item.dataset.content.includes(query));
  });
}

function clearMessages() {
  messages = [];
  stats = freshStats();
  renderMessages();
  updateStats();
  logEvent('info', 'CLEAR', '消息记录已清空');
}

function logEvent(type, label, text) {
  events.push({ type, label, text, time: new Date() });
  if (events.length > 100) events.shift();
  renderEvents();
}

function renderEvents() {
  elements.events.replaceChildren(...events.map((event) => {
    const line = document.createElement('div');
    line.className = `event-line ${event.type}`;
    const time = document.createElement('time');
    const label = document.createElement('b');
    const text = document.createElement('span');
    time.textContent = nowTime(event.time);
    label.textContent = event.label;
    text.textContent = event.text;
    line.append(time, label, text);
    return line;
  }));
  elements.events.scrollTop = elements.events.scrollHeight;
}

function setComposerMode(mode) {
  settings.composerMode = mode;
  $$('#modeTabs button').forEach((button) => button.classList.toggle('active', button.dataset.mode === mode));
  elements.composer.placeholder = {
    text: '输入要发送的文本消息…', json: '输入合法的 JSON…', hex: '例如：48 65 6c 6c 6f', base64: '输入 Base64 编码内容…',
  }[mode];
  collectSettings();
}

function transformJson(transform) {
  try {
    elements.composer.value = transform(elements.composer.value);
    setComposerMode('json');
    updatePayloadSize();
    collectSettings();
  } catch {
    toast('当前内容不是有效 JSON', 'error');
  }
}

function updatePayloadSize() {
  elements.payloadSize.textContent = formatBytes(byteLength(elements.composer.value));
}

async function sendFile() {
  const file = elements.file.files[0];
  if (!file) return;
  try {
    client.send(await file.arrayBuffer());
    stats.sent += 1;
    stats.sentBytes += file.size;
    addMessage('out', `[文件] ${file.name} · ${file.type || 'application/octet-stream'}`, 'binary', file.size);
    updateStats();
    toast(`已发送 ${file.name}`);
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    elements.file.value = '';
  }
}

function sendPing() {
  const payload = `__socketlab_ping__${uid()}`;
  pendingPing = { payload, startedAt: performance.now() };
  try {
    client.send(payload);
    stats.sent += 1;
    stats.sentBytes += byteLength(payload);
    addMessage('out', payload, 'ping');
    updateStats();
    setTimeout(() => {
      if (pendingPing?.payload === payload) {
        pendingPing = null;
        toast('未收到相同内容的回显，无法测量延迟', 'warn');
      }
    }, 5000);
  } catch (error) { toast(error.message, 'error'); }
}

function toggleInterval() {
  if (intervalTimer) return stopInterval();
  collectSettings();
  if (!client.connected) return toast('请先建立连接', 'warn');
  intervalSent = 0;
  const send = () => {
    if (!client.connected) return stopInterval();
    if (settings.intervalCount > 0 && intervalSent >= settings.intervalCount) return stopInterval(true);
    if (sendCurrentPayload({ keep: true })) intervalSent += 1;
    elements.intervalStatus.textContent = `已发送 ${intervalSent}${settings.intervalCount ? ` / ${settings.intervalCount}` : ' 次'}`;
  };
  send();
  intervalTimer = setInterval(send, settings.intervalMs);
  elements.intervalStart.textContent = '停止';
  elements.intervalStart.classList.add('is-running');
  logEvent('info', 'TIMER', `定时发送已启动 · ${settings.intervalMs} ms`);
}

function stopInterval(completed = false) {
  clearInterval(intervalTimer);
  intervalTimer = null;
  elements.intervalStart.textContent = '开始';
  elements.intervalStart.classList.remove('is-running');
  elements.intervalStatus.textContent = completed ? `已完成 · 共 ${intervalSent} 次` : intervalSent ? `已停止 · 共 ${intervalSent} 次` : '尚未启动';
}

function updateStats() {
  $('#sentCount').textContent = stats.sent;
  $('#receivedCount').textContent = stats.received;
  $('#sentBytes').textContent = formatBytes(stats.sentBytes);
  $('#receivedBytes').textContent = formatBytes(stats.receivedBytes);
  $('#totalBytes').textContent = formatBytes(stats.sentBytes + stats.receivedBytes);
  $('#latencyValue').textContent = stats.latency == null ? '—' : `${stats.latency} ms`;
  const minutes = sessionStartedAt ? Math.max((Date.now() - sessionStartedAt.getTime()) / 60000, 1 / 60) : 0;
  $('#messageRate').textContent = `${minutes ? Math.round((stats.sent + stats.received) / minutes) : 0} 条/分钟`;
}

function startUptime() {
  stopUptime();
  const tick = () => {
    const seconds = Math.max(0, Math.floor((Date.now() - sessionStartedAt.getTime()) / 1000));
    const hours = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const rest = String(seconds % 60).padStart(2, '0');
    elements.uptime.textContent = `${hours}:${minutes}:${rest}`;
    updateStats();
  };
  tick();
  uptimeTimer = setInterval(tick, 1000);
}

function stopUptime() { clearInterval(uptimeTimer); uptimeTimer = null; }

function updateScheme() {
  elements.scheme.textContent = elements.url.value.trim().toLowerCase().startsWith('ws://') ? 'WS' : 'WSS';
}

function updateReconnectFields() { elements.reconnectFields.style.opacity = elements.reconnect.checked ? '1' : '.42'; }

function renderRecentUrls() {
  elements.recentUrls.replaceChildren(...settings.recentUrls.map((url) => {
    const option = document.createElement('option'); option.value = url; return option;
  }));
}

function toggleTheme() {
  settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = settings.theme;
  saveSettings(settings);
}

function togglePause() {
  settings.capturePaused = !settings.capturePaused;
  elements.pause.classList.toggle('active', settings.capturePaused);
  elements.pause.textContent = settings.capturePaused ? '▶' : 'Ⅱ';
  elements.pause.title = settings.capturePaused ? '继续记录' : '暂停记录';
  toast(settings.capturePaused ? '已暂停记录新消息' : '已继续记录消息', 'warn');
}

function selectTab(name) {
  $$('.tab').forEach((tab) => {
    const active = tab.dataset.tab === name;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  $$('.tab-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `${name}Panel`));
}

function openTemplateDialog(source, template = null) {
  const fromComposer = source === 'composer';
  const isEditing = source === 'edit' && template;
  editingTemplateId = isEditing ? template.id : null;
  elements.templateDialogTitle.textContent = isEditing ? '编辑消息模板' : fromComposer ? '保存消息模板' : '新建消息模板';
  elements.templateSubmit.textContent = isEditing ? '保存修改' : '保存模板';
  elements.templateName.value = isEditing ? template.name : '';
  elements.templateMode.value = isEditing ? template.mode : fromComposer ? settings.composerMode : 'json';
  elements.templateContent.value = isEditing ? template.content : fromComposer ? elements.composer.value : '';
  updateTemplateContentPlaceholder();
  elements.templateDialog.showModal();
  setTimeout(() => elements.templateName.focus(), 20);
}

function updateTemplateContentPlaceholder() {
  elements.templateContent.placeholder = {
    text: '输入模板文本…',
    json: '输入合法的 JSON…',
    hex: '例如：48 65 6c 6c 6f',
    base64: '输入 Base64 编码内容…',
  }[elements.templateMode.value];
}

function saveTemplate(event) {
  event.preventDefault();
  const name = elements.templateName.value.trim();
  const mode = elements.templateMode.value;
  const content = elements.templateContent.value;
  if (!name || !content.trim()) return;
  if (mode === 'json' && !isJson(content)) {
    toast('模板内容不是有效 JSON', 'error');
    elements.templateContent.focus();
    return;
  }
  const isEditing = editingTemplateId !== null;
  if (isEditing) {
    settings.templates = settings.templates.map((template) => (
      template.id === editingTemplateId ? { ...template, name, mode, content } : template
    ));
  } else {
    settings.templates.unshift({ id: uid(), name, mode, content });
  }
  saveSettings(settings);
  renderTemplates();
  elements.templateDialog.close();
  editingTemplateId = null;
  toast(isEditing ? '模板已更新' : '模板已保存');
}

function renderTemplates() {
  elements.templateGrid.replaceChildren(...settings.templates.map((template) => {
    const card = document.createElement('article');
    card.className = 'template-card';
    const header = document.createElement('header');
    const title = document.createElement('h3');
    const kind = document.createElement('span');
    title.textContent = template.name; kind.className = 'kind-badge'; kind.textContent = template.mode;
    header.append(title, kind);
    const content = document.createElement('pre'); content.textContent = template.content;
    const footer = document.createElement('footer');
    const remove = document.createElement('button'); remove.className = 'secondary-button danger-hover'; remove.textContent = '删除';
    const edit = document.createElement('button'); edit.className = 'secondary-button'; edit.textContent = '编辑';
    const load = document.createElement('button'); load.className = 'primary-button'; load.textContent = '加载';
    remove.addEventListener('click', () => {
      settings.templates = settings.templates.filter((item) => item.id !== template.id);
      saveSettings(settings); renderTemplates(); toast('模板已删除');
    });
    edit.addEventListener('click', () => openTemplateDialog('edit', template));
    load.addEventListener('click', () => {
      elements.composer.value = template.content; setComposerMode(template.mode); updatePayloadSize(); selectTab('messages'); collectSettings(); toast(`已加载「${template.name}」`);
    });
    footer.append(remove, edit, load); card.append(header, content, footer); return card;
  }));
  elements.templateCount.textContent = settings.templates.length;
}

function exportSession() {
  const payload = {
    app: 'SocketLab', version: 2, exportedAt: new Date().toISOString(),
    connection: { url: elements.url.value, protocols: elements.protocols.value }, stats, messages,
  };
  downloadFile(`socketlab-session-${Date.now()}.json`, JSON.stringify(payload, null, 2));
  toast('会话已导出');
}

async function importSession(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    if (!Array.isArray(payload.messages)) throw new Error('文件中没有有效的 messages 数组');
    messages = payload.messages.slice(-2000).map((message) => ({
      ...message,
      collapsed: message.collapsed ?? settings.defaultMessageCollapsed,
    }));
    stats = payload.stats ?? freshStats();
    renderMessages(); updateStats(); selectTab('messages'); toast(`已导入 ${messages.length} 条消息`);
  } catch (error) { toast(`导入失败：${error.message}`, 'error'); }
  finally { event.target.value = ''; }
}

function resetAllSettings() {
  settings = resetSettings();
  hydrateForm();
  renderTemplates();
  toast('设置已恢复默认值');
}

function handleShortcut(event) {
  const command = event.ctrlKey || event.metaKey;
  if (command && event.key === 'Enter') { event.preventDefault(); sendCurrentPayload(); }
  if (command && event.key.toLowerCase() === 'k') { event.preventDefault(); elements.url.focus(); elements.url.select(); }
  if (command && event.key.toLowerCase() === 'f') { event.preventDefault(); elements.search.focus(); }
  if (event.key === 'Escape' && client.connected && !document.querySelector('dialog[open]')) client.disconnect();
}

function toast(message, type = 'success') {
  const node = document.createElement('div');
  node.className = `toast ${type}`; node.textContent = message;
  $('#toastStack').append(node);
  setTimeout(() => node.remove(), 3300);
}

initialize();
