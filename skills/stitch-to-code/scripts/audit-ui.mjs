#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

function usage() {
  return `Usage:
  node audit-ui.mjs --url <baseUrl> [options]

Options:
  --routes <csv>         Routes or absolute URLs (default: /)
  --viewports <csv>      Viewports as WIDTHxHEIGHT (default: 1440x900)
  --output <dir>       Evidence directory (default: OS temp directory)
  --timeout <ms>         Per-operation timeout (default: 15000)
  --settle-ms <ms>       Extra delay after load (default: 300)
  --storage-state <file> Existing Playwright storage-state JSON
  --full-page            Capture full-page instead of viewport screenshots
  --fail-on <csv>        Finding classes that make exit non-zero:
                         runtime,network,overflow,a11y,all
  --help                 Show this help

Exit: 0 = evidence collected, 1 = selected findings, 2 = invalid/incomplete audit.
No exit code certifies visual fidelity or complete accessibility.
`;
}

export function parseArgs(argv) {
  const args = {
    routes: ['/'],
    viewports: [{ width: 1440, height: 900 }],
    output: null,
    timeout: 15000,
    settleMs: 300,
    storageState: null,
    fullPage: false,
    failOn: new Set(),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for ${arg}`);
      }
      i += 1;
      return value;
    };

    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--url') {
      args.url = next();
    } else if (arg === '--routes') {
      args.routes = next().split(',').map((value) => value.trim()).filter(Boolean);
    } else if (arg === '--viewports') {
      args.viewports = next().split(',').map(parseViewport);
    } else if (arg === '--output') {
      args.output = next();
    } else if (arg === '--timeout') {
      args.timeout = parsePositiveInteger(next(), '--timeout');
    } else if (arg === '--settle-ms') {
      args.settleMs = parseNonNegativeInteger(next(), '--settle-ms');
    } else if (arg === '--storage-state') {
      args.storageState = next();
    } else if (arg === '--full-page') {
      args.fullPage = true;
    } else if (arg === '--fail-on') {
      const values = next().split(',').map((value) => value.trim()).filter(Boolean);
      for (const value of values) {
        if (!['runtime', 'network', 'overflow', 'a11y', 'all'].includes(value)) {
          throw new Error(`Unsupported --fail-on value: ${value}`);
        }
        args.failOn.add(value);
      }
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.help && !args.url) {
    throw new Error('--url is required');
  }
  if (!args.routes.length) {
    throw new Error('--routes must contain at least one route');
  }
  if (!args.viewports.length) {
    throw new Error('--viewports must contain at least one viewport');
  }

  if (!args.help) {
    args.url = resolveTarget(args.url, args.url);
    args.routes.forEach((route) => resolveTarget(args.url, route));
  }
  return args;
}

function parseViewport(value) {
  const match = /^(\d+)x(\d+)$/i.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid viewport '${value}'. Expected WIDTHxHEIGHT, e.g. 1440x900.`);
  }
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (![width, height].every((n) => Number.isSafeInteger(n) && n >= 200 && n <= 16384)) {
    throw new Error(`Viewport '${value}' must have dimensions between 200 and 16384 CSS pixels.`);
  }
  return { width, height };
}

function parsePositiveInteger(value, flag) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > 2147483647) {
    throw new Error(`${flag} must be an integer between 1 and 2147483647`);
  }
  return parsed;
}

function parseNonNegativeInteger(value, flag) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 2147483647) {
    throw new Error(`${flag} must be an integer between 0 and 2147483647`);
  }
  return parsed;
}

function loadProjectModule(moduleName) {
  const projectRequire = createRequire(path.join(process.cwd(), 'package.json'));
  try {
    return projectRequire(moduleName);
  } catch {
    return null;
  }
}

function loadPlaywright() {
  const playwright = loadProjectModule('playwright');
  if (playwright?.chromium) return playwright;

  const playwrightTest = loadProjectModule('@playwright/test');
  if (playwrightTest?.chromium) return playwrightTest;

  return null;
}

export function resolveTarget(baseUrl, route) {
  let url;
  try {
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    url = new URL(route, normalizedBase);
  } catch {
    throw new Error('Invalid --url or --routes URL');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Audit URLs must use HTTP(S) without embedded credentials');
  }
  return url.toString();
}

// page.evaluate() does not inherit Playwright's action timeout.
export async function withTimeout(promise, timeout, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeout}ms`)), timeout);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function safeFilePart(value) {
  return value
    .replace(/^https?:\/\//i, '')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'root';
}

export function screenshotOptions(args, screenshotPath) {
  return {
    path: screenshotPath,
    fullPage: args.fullPage,
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
    timeout: args.timeout,
  };
}

export async function collectDomEvidence(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const viewportWidth = doc.clientWidth;
    const maxScrollWidth = Math.max(doc.scrollWidth, body?.scrollWidth ?? 0);
    const overflowPixels = Math.max(0, maxScrollWidth - viewportWidth);
    const documentOverflow = overflowPixels > 1;

    const offscreenElements = [];
    const fontUsage = new Map();
    const fontFamilies = new Set();

    for (const element of document.querySelectorAll('body *')) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const visible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      if (!visible) continue;

      const family = style.fontFamily || '';
      const key = `${family} | ${style.fontWeight || ''} | ${style.fontStyle || ''}`;
      if (family) {
        fontUsage.set(key, (fontUsage.get(key) || 0) + 1);
        family.split(',').forEach((item) => {
          const cleaned = item.trim().replace(/^['"]|['"]$/g, '');
          if (cleaned) fontFamilies.add(cleaned);
        });
      }

      if (offscreenElements.length < 40 && (rect.right > viewportWidth + 1 || rect.left < -1)) {
        offscreenElements.push({
          tag: element.tagName.toLowerCase(),
          id: element.id || null,
          classes: Array.from(element.classList).slice(0, 4),
          rect: {
            left: Math.round(rect.left * 100) / 100,
            right: Math.round(rect.right * 100) / 100,
            width: Math.round(rect.width * 100) / 100,
          },
          position: style.position,
          overflowX: style.overflowX,
        });
      }
    }

    const fontResources = performance.getEntriesByType('resource')
      .filter((entry) => entry.initiatorType === 'font' || /\.(woff2?|ttf|otf)(\?|$)/i.test(entry.name))
      .map((entry) => ({
        url: entry.name,
        durationMs: Math.round(entry.duration * 100) / 100,
        transferSize: entry.transferSize ?? null,
      }));

    const familyChecks = Array.from(fontFamilies).slice(0, 30).map((family) => ({
      family,
      ready: document.fonts?.check?.(`16px "${family.replaceAll('"', '\\"')}"`) ?? null,
    }));

    return {
      document: {
        title: document.title,
        lang: document.documentElement.lang || null,
        url: location.href,
      },
      overflow: {
        documentOverflow,
        viewportWidth,
        maxScrollWidth,
        overflowPixels,
        offscreenElements,
      },
      fonts: {
        status: document.fonts?.status ?? 'unsupported',
        faces: Array.from(document.fonts ?? []).map((face) => ({
          family: face.family, weight: face.weight, style: face.style, status: face.status,
        })),
        // Neither CSS stacks nor FontFaceSet.check() identify the face used for each glyph.
        computedUsage: Array.from(fontUsage.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 30)
          .map(([style, count]) => ({ style, count })),
        familyChecks,
        resources: fontResources,
      },
    };
  });
}

async function collectAxe(page, axeCore, timeout) {
  if (!axeCore?.source) {
    return { available: false, error: null, violations: [] };
  }

  try {
    await withTimeout(page.addScriptTag({ content: axeCore.source }), timeout, 'axe injection');
    const result = await withTimeout(page.evaluate(async () => {
      const output = await window.axe.run(document, {
        resultTypes: ['violations'],
      });
      return output.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.slice(0, 10).map((node) => ({
          target: node.target,
          html: node.html,
          failureSummary: node.failureSummary,
        })),
      }));
    }), timeout, 'axe analysis');

    return { available: true, error: null, violations: result };
  } catch (error) {
    return { available: true, error: error.message, violations: [] };
  }
}

export function shouldFail(failOn, findings) {
  if (failOn.has('all')) {
    return findings.runtime || findings.network || findings.overflow || findings.a11y;
  }
  return (
    (failOn.has('runtime') && findings.runtime) ||
    (failOn.has('network') && findings.network) ||
    (failOn.has('overflow') && findings.overflow) ||
    (failOn.has('a11y') && findings.a11y)
  );
}

export async function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    console.error(usage());
    return 2;
  }

  if (args.help) {
    console.log(usage());
    return 0;
  }

  const playwright = loadPlaywright();
  if (!playwright) {
    console.error('ERROR Playwright is not installed in the target project.');
    console.error('Use the project\'s existing browser tooling, or add Playwright only if that is appropriate for the project.');
    return 2;
  }

  let storageState;
  if (args.storageState) {
    try {
      storageState = JSON.parse(await fs.readFile(path.resolve(args.storageState), 'utf8'));
      if (!storageState || !Array.isArray(storageState.cookies) || !Array.isArray(storageState.origins)) {
        throw new Error('Invalid shape');
      }
    } catch {
      // JSON parse errors can echo cookies/tokens. Never print the input or parse error.
      console.error('ERROR --storage-state must be readable JSON with cookies and origins arrays');
      return 2;
    }
  }

  const axeCore = loadProjectModule('axe-core');
  const requireAxe = args.failOn.has('a11y') || args.failOn.has('all');
  if (requireAxe && !axeCore?.source) {
    console.error('ERROR --fail-on a11y/all requires an existing axe-core installation; no audit was run');
    return 2;
  }
  const outputDir = args.output
    ? path.resolve(args.output)
    : await fs.mkdtemp(path.join(os.tmpdir(), 'stitch-to-code-audit-'));
  await fs.mkdir(outputDir, { recursive: true });

  const report = {
    generatedAt: new Date().toISOString(),
    cwd: process.cwd(),
    baseUrl: args.url,
    routes: args.routes,
    viewports: args.viewports,
    screenshotMode: args.fullPage ? 'full-page' : 'viewport',
    storageStateUsed: Boolean(storageState),
    axeAvailable: Boolean(axeCore?.source),
    outputDir,
    targets: [],
    summary: {
      consoleErrors: 0,
      pageErrors: 0,
      requestFailures: 0,
      httpErrors: 0,
      documentOverflowTargets: 0,
      axeViolations: 0,
      axeErrors: 0,
      navigationFailures: 0,
      collectionFailures: 0,
    },
  };

  let browser;
  let exitCode = 0;

  try {
    browser = await playwright.chromium.launch({ headless: true, timeout: args.timeout });
    for (const viewport of args.viewports) {
      const contextOptions = { viewport };
      if (storageState) contextOptions.storageState = storageState;
      let context;
      try {
        context = await browser.newContext(contextOptions);
      } catch (error) {
        if (storageState) throw new Error('Cannot create authenticated browser context; check storage-state schema and browser compatibility');
        throw error;
      }
      context.setDefaultTimeout(args.timeout);
      context.setDefaultNavigationTimeout(args.timeout);

      for (const route of args.routes) {
        const page = await context.newPage();
        const targetUrl = resolveTarget(args.url, route);
        const consoleErrors = [];
        const consoleWarnings = [];
        const pageErrors = [];
        const requestFailures = [];
        const httpErrors = [];

        page.on('console', (message) => {
          const item = { type: message.type(), text: message.text() };
          if (message.type() === 'error') consoleErrors.push(item);
          if (message.type() === 'warning') consoleWarnings.push(item);
        });
        page.on('pageerror', (error) => {
          pageErrors.push({ message: error.message, stack: error.stack || null });
        });
        page.on('requestfailed', (request) => {
          requestFailures.push({
            method: request.method(),
            resourceType: request.resourceType(),
            url: request.url(),
            failure: request.failure()?.errorText || 'unknown',
          });
        });
        page.on('response', (response) => {
          if (response.status() >= 400) {
            httpErrors.push({
              status: response.status(),
              statusText: response.statusText(),
              url: response.url(),
              resourceType: response.request().resourceType(),
            });
          }
        });

        const targetName = `${String(report.targets.length + 1).padStart(3, '0')}-${safeFilePart(targetUrl)}-${viewport.width}x${viewport.height}`;
        const screenshotPath = path.join(outputDir, `${targetName}.png`);
        const startedAt = Date.now();
        let navigationError = null;
        let collectionError = null;
        let screenshot = null;
        let stage = 'navigation';
        let domEvidence = null;
        let axe = { available: Boolean(axeCore?.source), error: null, violations: [] };

        try {
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: args.timeout });
          try {
            await page.waitForLoadState('networkidle', { timeout: Math.min(args.timeout, 4000) });
          } catch {
            // Many real apps keep connections open. DOM evidence is still useful.
          }
          if (args.settleMs > 0) await page.waitForTimeout(args.settleMs);
          stage = 'fonts';
          await withTimeout(page.evaluate(async () => {
            if (document.fonts?.ready) await document.fonts.ready;
            return true;
          }), args.timeout, 'Font readiness');

          stage = 'dom';
          domEvidence = await withTimeout(collectDomEvidence(page), args.timeout, 'DOM evidence');
          stage = 'a11y';
          axe = await collectAxe(page, axeCore, args.timeout);
          if (requireAxe && axe.error) exitCode = 2;
          stage = 'screenshot';
          await page.screenshot(screenshotOptions(args, screenshotPath));
          screenshot = screenshotPath;
        } catch (error) {
          collectionError = { stage, message: error.message };
          if (stage === 'navigation') {
            navigationError = collectionError;
            report.summary.navigationFailures += 1;
          }
          report.summary.collectionFailures += 1;
          exitCode = 2; // An incomplete capture must never look like a successful audit.
          try {
            await page.screenshot(screenshotOptions(args, screenshotPath));
            screenshot = screenshotPath;
          } catch {
            // No screenshot possible after a hard browser failure.
          }
        }

        const durationMs = Date.now() - startedAt;
        const documentOverflow = Boolean(domEvidence?.overflow?.documentOverflow);
        const findings = {
          runtime: Boolean(consoleErrors.length || pageErrors.length || collectionError),
          network: Boolean(requestFailures.length || httpErrors.length),
          overflow: documentOverflow,
          a11y: Boolean(axe.violations.length || axe.error),
        };

        if (shouldFail(args.failOn, findings)) exitCode = Math.max(exitCode, 1);

        report.summary.consoleErrors += consoleErrors.length;
        report.summary.pageErrors += pageErrors.length;
        report.summary.requestFailures += requestFailures.length;
        report.summary.httpErrors += httpErrors.length;
        report.summary.documentOverflowTargets += documentOverflow ? 1 : 0;
        report.summary.axeViolations += axe.violations.length;
        report.summary.axeErrors += axe.error ? 1 : 0;

        report.targets.push({
          route,
          url: targetUrl,
          viewport,
          durationMs,
          screenshot,
          collectionError,
          navigationError,
          consoleErrors,
          consoleWarnings,
          pageErrors,
          requestFailures,
          httpErrors,
          dom: domEvidence,
          axe,
          findings,
        });

        const findingNames = Object.entries(findings).filter(([, value]) => value).map(([key]) => key);
        console.log(`${collectionError ? 'INCOMPLETE' : findingNames.length ? 'WARN' : 'COLLECTED'} ${targetUrl} @ ${viewport.width}x${viewport.height}${findingNames.length ? ` [${findingNames.join(', ')}]` : ''}`);
        await page.close();
      }

      await context.close();
    }
  } catch (error) {
    report.fatalError = { message: error.message };
    console.error(`ERROR ${error.message}`);
    exitCode = 2;
  } finally {
    if (browser) {
      try { await browser.close(); } catch (error) {
        report.cleanupError = { message: error.message };
        exitCode = 2;
      }
    }
  }

  const reportPath = path.join(outputDir, 'audit-ui-report.json');
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`REPORT ${reportPath}`);
  if (!axeCore?.source) console.log('INFO axe accessibility check skipped (axe-core unavailable)');

  return exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.exitCode = await main(); } catch (error) {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 2;
  }
}
