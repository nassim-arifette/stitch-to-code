// Real DOM/screenshot checks without network access. Run: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { collectDomEvidence, screenshotOptions, withTimeout } from '../skills/stitch-to-code/scripts/audit-ui.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const script = path.join(root, 'skills/stitch-to-code/scripts/audit-ui.mjs');
const exec = promisify(execFile);
const require = createRequire(import.meta.url);
let playwright;
for (const name of ['playwright', '@playwright/test']) {
  try { playwright = require(name); break; } catch { /* Optional project dependency. */ }
}
const dimensions = (png) => [png.readUInt32BE(16), png.readUInt32BE(20)];
const options = (fullPage = false) => screenshotOptions({ fullPage, timeout: 5000 }, undefined);

test('browser evidence regressions', { skip: !playwright && 'Playwright is not installed', timeout: 60000 }, async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'stitch-browser-test-'));
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const run = async (extra = []) => {
    let code = 0, stdout = '', stderr = '';
    try {
      ({ stdout, stderr } = await exec(process.execPath, [script, '--url', 'http://127.0.0.1:1',
        '--output', dir, '--timeout', '3000', ...extra], { cwd: root, timeout: 15000 }));
    } catch (error) { code = error.code; stdout = error.stdout; stderr = error.stderr; }
    return { code, stdout, stderr };
  };
  try {
    await t.test('viewport and full-page dimensions use real PNGs', async () => {
      await page.setContent('<h1>Fixture</h1><div style="height:1800px">Tall content</div>');
      assert.deepEqual(dimensions(await page.screenshot(options())), [390, 844]);
      const [width, height] = dimensions(await page.screenshot(options(true)));
      assert.equal(width, 390); assert.ok(height > 1800);
    });
    await t.test('clipped offscreen elements are diagnostic, not document overflow', async () => {
      await page.setContent('<div style="width:100px;overflow:hidden"><div style="width:200px;transform:translateX(-150px)">Carousel</div></div>');
      const evidence = await collectDomEvidence(page);
      assert.ok(evidence.overflow.offscreenElements.length > 0);
      assert.equal(evidence.overflow.documentOverflow, false);
    });
    await t.test('true horizontal document overflow is detected', async () => {
      await page.setContent('<div style="width:2000px;height:20px">Overflow</div>');
      const evidence = await collectDomEvidence(page);
      assert.equal(evidence.overflow.documentOverflow, true);
      assert.ok(evidence.overflow.overflowPixels > 1000);
    });
    await t.test('font evidence includes stacks and faces without asserting rendered glyph identity', async () => {
      await page.setContent('<p style="font-family:serif">Text</p>');
      const evidence = await collectDomEvidence(page);
      assert.ok(evidence.fonts.computedUsage.some(({ style }) => style.includes('serif')));
      assert.ok(Array.isArray(evidence.fonts.faces));
    });
    await t.test('animation-disabled screenshots are stable', async () => {
      await page.setContent('<style>@keyframes slide{to{transform:translateX(100px)}}div{width:50px;height:50px;background:black;animation:slide 1s infinite}</style><div></div>');
      const first = await page.screenshot(options());
      await page.waitForTimeout(150);
      assert.deepEqual(first, await page.screenshot(options()));
    });
    await t.test('font wait is bounded even for an unresolved browser promise', async () => {
      await assert.rejects(withTimeout(page.evaluate(() => new Promise(() => {})), 50, 'Font readiness'), /timed out/);
    });
    await t.test('Playwright restores cookies from storage state without navigation', async () => {
      const authenticated = await browser.newContext({ storageState: { cookies: [{ name: 'fixture_session', value: 'ok',
        domain: '127.0.0.1', path: '/', expires: -1, httpOnly: true, secure: false, sameSite: 'Lax' }], origins: [] } });
      try { assert.equal((await authenticated.cookies('http://127.0.0.1'))[0].value, 'ok'); }
      finally { await authenticated.close(); }
    });
    await t.test('malformed storage state returns a clean error without echoing secrets', async () => {
      const state = path.join(dir, 'bad-auth.json');
      await fs.writeFile(state, 'SECRET_UNPARSEABLE_AUTH');
      const result = await run(['--storage-state', state]);
      assert.equal(result.code, 2); assert.match(result.stderr, /storage-state/);
      assert.ok(!result.stderr.includes('SECRET_UNPARSEABLE_AUTH'));
    });
    await t.test('failed navigation is incomplete even without fail-on runtime', async () => {
      const result = await run(['--fail-on', 'overflow']);
      assert.equal(result.code, 2);
      const report = JSON.parse(await fs.readFile(path.join(dir, 'audit-ui-report.json'), 'utf8'));
      assert.equal(report.summary.navigationFailures, 1);
      assert.equal(report.targets[0].collectionError.stage, 'navigation');
    });
    await t.test('missing required axe is not a passing accessibility check', async (subtest) => {
      try { require.resolve('axe-core'); return subtest.skip('axe-core is installed'); } catch { /* Test absent optional tooling. */ }
      const result = await run(['--fail-on', 'all']);
      assert.equal(result.code, 2); assert.match(result.stderr, /axe-core/);
    });
  } finally {
    await browser.close();
    await fs.rm(dir, { recursive: true, force: true });
  }
});
