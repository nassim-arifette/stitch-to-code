#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

function usage() {
  return `Usage:
  node audit-ui.mjs --url <baseUrl> [options]

Options:
  --routes <csv>       Routes or absolute URLs (default: /)
  --viewports <csv>    Viewports as WIDTHxHEIGHT (default: 1440x900)
  --output <dir>       Evidence directory (default: OS temp directory)
  --timeout <ms>       Navigation/action timeout (default: 15000)
  --settle-ms <ms>     Extra delay after load (default: 300)
  --fail-on <csv>      Finding classes that make exit non-zero:
                       runtime,network,overflow,a11y,all
  --help               Show this help
`;
}

function parseArgs(argv) {
  const args = {
    routes: ['/'],
    viewports: [{ width: 1440, height: 900 }],
    output: null,
    timeout: 15000,
    settleMs: 300,
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

  return args;
}

function parseViewport(value) {
  const match = /^(\d+)x(\d+)$/i.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid viewport '${value}'. Expected WIDTHxHEIGHT, e.g. 1440x900.`);
  }
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width < 200 || height < 200) {
    throw new Error(`Viewport '${value}' is unexpectedly small.`);
  }
  return { width, height };
}

function parsePositiveInteger(value, flag) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return parsed;
}

function parseNonNegativeInteger(value, flag) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${flag} must be a non-negative integer`);
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

function resolveTarget(baseUrl, route) {
  try {
    return new URL(route).toString();
  } catch {
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return new URL(route, normalizedBase).toString();
  }
}

function safeFilePart(value) {
  return value
    .replace(/^https?:\/\//i, '')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'root';
}

async function collectDomEvidence(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const viewportWidth = doc.clientWidth;
    const maxScrollWidth = Math.max(doc.scrollWidth, body?.scrollWidth ?? 0);
    const overflowPixels = Math.max(0, maxScrollWidth - viewportWidth);

    const overflowers = [];
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

      if (overflowers.length < 40 && (rect.right > viewportWidth + 1 || rect.left < -1)) {
        overflowers.push({
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
        viewportWidth,
        maxScrollWidth,
        overflowPixels,
        likelyOffenders: overflowers,
      },
      fonts: {
        status: document.fonts?.status ?? 'unsupported',
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

async function collectAxe(page, axeCore) {
  if (!axeCore?.source) {
    return { available: false, error: null, violations: [] };
  }

  try {
    await page.addScriptTag({ content: axeCore.source });
    const result = await page.evaluate(async () => {
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
    });

    return { available: true, error: null, violations: result };
  } catch (error) {
    return { available: true, error: error.message, violations: [] };
  }
}

function shouldFail(failOn, findings) {
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

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
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

  const axeCore = loadProjectModule('axe-core');
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
    axeAvailable: Boolean(axeCore?.source),
    outputDir,
    targets: [],
    summary: {
      consoleErrors: 0,
      pageErrors: 0,
      requestFailures: 0,
      httpErrors: 0,
      overflowTargets: 0,
      axeViolations: 0,
      axeErrors: 0,
      navigationFailures: 0,
    },
  };

  const browser = await playwright.chromium.launch({ headless: true });
  let exitCode = 0;

  try {
    for (const viewport of args.viewports) {
      const context = await browser.newContext({ viewport });

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

        const targetName = `${safeFilePart(targetUrl)}-${viewport.width}x${viewport.height}`;
        const screenshotPath = path.join(outputDir, `${targetName}.png`);
        const startedAt = Date.now();
        let navigationError = null;
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
          await page.evaluate(async () => {
            if (document.fonts?.ready) await document.fonts.ready;
            return true;
          });

          domEvidence = await collectDomEvidence(page);
          axe = await collectAxe(page, axeCore);
          await page.screenshot({ path: screenshotPath, fullPage: true });
        } catch (error) {
          navigationError = { message: error.message, stack: error.stack || null };
          report.summary.navigationFailures += 1;
          try {
            await page.screenshot({ path: screenshotPath, fullPage: true });
          } catch {
            // No screenshot possible after a hard browser failure.
          }
        }

        const durationMs = Date.now() - startedAt;
        const overflow = Boolean(domEvidence?.overflow?.overflowPixels > 1 || domEvidence?.overflow?.likelyOffenders?.length);
        const findings = {
          runtime: Boolean(consoleErrors.length || pageErrors.length || navigationError),
          network: Boolean(requestFailures.length || httpErrors.length),
          overflow,
          a11y: Boolean(axe.violations.length || axe.error),
        };

        if (shouldFail(args.failOn, findings)) exitCode = 1;

        report.summary.consoleErrors += consoleErrors.length;
        report.summary.pageErrors += pageErrors.length;
        report.summary.requestFailures += requestFailures.length;
        report.summary.httpErrors += httpErrors.length;
        report.summary.overflowTargets += overflow ? 1 : 0;
        report.summary.axeViolations += axe.violations.length;
        report.summary.axeErrors += axe.error ? 1 : 0;

        report.targets.push({
          route,
          url: targetUrl,
          viewport,
          durationMs,
          screenshot: screenshotPath,
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
        console.log(`${findingNames.length ? 'WARN' : 'PASS'} ${targetUrl} @ ${viewport.width}x${viewport.height}${findingNames.length ? ` [${findingNames.join(', ')}]` : ''}`);
        await page.close();
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  const reportPath = path.join(outputDir, 'audit-ui-report.json');
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`REPORT ${reportPath}`);

  return exitCode;
}

process.exitCode = await main();
