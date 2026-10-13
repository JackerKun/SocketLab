import test from 'node:test';
import assert from 'node:assert/strict';
import {
  base64ToBytes, byteLength, closeCodeLabel, formatBytes, hexToBytes, highlightJson,
  isJson, minifyJson, normalizeWsUrl, parseProtocols, prettyJson,
} from '../js/utils.js';

test('normalizeWsUrl accepts full URLs and adds a ws scheme', () => {
  assert.equal(normalizeWsUrl('localhost:9501'), 'ws://localhost:9501/');
  assert.equal(normalizeWsUrl('wss://example.com/socket?q=1'), 'wss://example.com/socket?q=1');
  assert.throws(() => normalizeWsUrl('https://example.com'), /ws:\/\//);
});

test('parseProtocols trims and removes duplicates', () => {
  assert.deepEqual(parseProtocols('graphql-ws, chat,graphql-ws'), ['graphql-ws', 'chat']);
});

test('JSON helpers validate, format and minify', () => {
  assert.equal(isJson('{"ok":true}'), true);
  assert.equal(isJson('hello'), false);
  assert.equal(minifyJson('{ "ok": true }'), '{"ok":true}');
  assert.match(prettyJson('{"ok":true}'), /\n  "ok"/);
  assert.match(highlightJson('{"ok":true,"count":2}'), /json-key/);
  assert.match(highlightJson('{"html":"<script>"}'), /&lt;script&gt;/);
});

test('binary helpers decode hex and base64', () => {
  assert.deepEqual([...hexToBytes('48 65 6c 6c 6f')], [72, 101, 108, 108, 111]);
  assert.deepEqual([...base64ToBytes('SGVsbG8=')], [72, 101, 108, 108, 111]);
  assert.throws(() => hexToBytes('abc'), /偶数位/);
});

test('byte and close-code formatting is readable', () => {
  assert.equal(byteLength('你好'), 6);
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.match(closeCodeLabel(1000), /正常关闭/);
});
