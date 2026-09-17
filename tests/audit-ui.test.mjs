// Run from the repository root: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, resolveTarget, screenshotOptions, shouldFail, withTimeout } from '../skills/stitch-to-code/scripts/audit-ui.mjs';

test('CLI defaults preserve reference-sized screenshots', () => {
  const args = parseArgs(['--url', 'http://localhost:3000']);
  assert.equal(args.fullPage, false);
  assert.deepEqual(args.viewports, [{ width: 1440, height: 900 }]);
  assert.deepEqual(screenshotOptions(args, 'a.png'), {
    path: 'a.png', fullPage: false, animations: 'disabled', caret: 'hide', scale: 'css', timeout: 15000,
  });
});
test('CLI forwards full-page, authenticated state, scopes and failure policy', () => {
  const args = parseArgs(['--url', 'http://localhost', '--routes', '/a,/b', '--full-page', '--storage-state', 'auth.json', '--fail-on', 'runtime,overflow']);
  assert.equal(args.storageState, 'auth.json');
  assert.equal(args.fullPage, true);
  assert.deepEqual(args.routes, ['/a', '/b']);
  assert.deepEqual([...args.failOn], ['runtime', 'overflow']);
});
test('help needs no URL or dependencies', () => assert.equal(parseArgs(['--help']).help, true));
for (const args of [[], ['--url'], ['--url', 'http://localhost', '--unknown'], ['--url', 'http://localhost', '--routes', ',']]) {
  test(`invalid CLI ${JSON.stringify(args)}`, () => assert.throws(() => parseArgs(args)));
}
for (const url of ['file:///etc/passwd', 'javascript:alert(1)', 'data:text/html,test', 'http://user:secret@host', 'not-a-url']) {
  test(`reject unsafe target ${url.split(':')[0]}`, () => assert.throws(() => parseArgs(['--url', url])));
}
test('resolves relative targets without discarding a base path', () => {
  assert.equal(resolveTarget('http://localhost/app', 'orders'), 'http://localhost/app/orders');
  assert.equal(resolveTarget('http://localhost/app', '/orders'), 'http://localhost/orders');
  assert.throws(() => resolveTarget('http://localhost', 'file:///tmp/page'));
});
for (const viewport of ['0x900', '390xInfinity', '99999999999999999999x900', '390x100000', '390.5x844']) {
  test(`reject invalid viewport ${viewport}`, () => assert.throws(() => parseArgs(['--url', 'http://localhost', '--viewports', viewport])));
}
test('reject timers that overflow Node timers', () => {
  assert.throws(() => parseArgs(['--url', 'http://localhost', '--timeout', '2147483648']));
  assert.throws(() => parseArgs(['--url', 'http://localhost', '--settle-ms', '-1']));
});
test('failure policy uses document overflow, not diagnostic elements', () => {
  assert.equal(shouldFail(new Set(['overflow']), { overflow: false, offscreenElements: [{}] }), false);
  assert.equal(shouldFail(new Set(['overflow']), { overflow: true }), true);
});
test('deadline returns results and bounds unresolved work', async () => {
  assert.equal(await withTimeout(Promise.resolve(42), 100, 'ready'), 42);
  await assert.rejects(withTimeout(new Promise(() => {}), 10, 'stalled'), /stalled timed out/);
});
