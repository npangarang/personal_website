#!/usr/bin/env node
/**
 * Dependency-free Chromium verification for the terminal preview.
 *
 *   npm run preview
 *   node scripts/verify_preview.mjs [url]
 *
 * URL defaults to http://127.0.0.1:4173 (or PREVIEW_URL).
 * Set VERIFY_SCENE=0 to skip the optional accelerated Mario/Goomba check.
 * Requires Chromium (CHROMIUM, default /usr/bin/chromium), Python 3 + Pillow.
 *
 * Outputs (gitignored): artifacts/preview/{terminal-320,terminal-390,
 * terminal-768,terminal-1440,contact-sheet}.png, metrics.json, and optional
 * mario-chase-768.png / mario-stomp-768.png evidence.
 */

import { spawn, execFile } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, rm, writeFile, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const runFile = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'artifacts', 'preview');
const METRICS_FILE = path.join(OUT, 'metrics.json');
const SHEET_FILE = path.join(OUT, 'contact-sheet.png');
const PROFILE = path.join(ROOT, 'logs', 'chromium-preview');
const SHEET_SCRIPT = path.join(ROOT, 'scripts', 'make_preview_contact_sheet.py');
const BASE_URL = (
  process.env.PREVIEW_URL || process.argv[2] || 'http://127.0.0.1:4173'
).replace(/\/+$/, '');
const CHROMIUM = process.env.CHROMIUM || '/usr/bin/chromium';
const PYTHON = process.env.PYTHON || 'python3';
const HEIGHT = 900;
const DPR = 1;
const AUDIT_WIDTHS = [320, 375, 390, 414, 768, 1440];
const SHOT_WIDTHS = new Set([320, 390, 768, 1440]);
const PHONE_WIDTHS = new Set([320, 375, 390, 414]);
const VARIANTS = {
  320: 'compact',
  375: 'compact',
  390: 'compact',
  414: 'compact',
  768: 'full',
  1440: 'full',
};
const HEADER_TIMEOUT = 30_000;
const SPRITE_TIMEOUT = 30_000;
const SCENE_TIMEOUT = Number(process.env.SCENE_TIMEOUT_MS || 60_000);
const FONT_WAIT = 5_000;
const RUN_SCENE = process.env.VERIFY_SCENE !== '0';
// Natural dimensions of the authored sprite sheets in /sprites.
const SPRITE_DIMENSIONS = {
  'brendan.png': [144, 32],
  'may.png': [144, 32],
  'hiker.png': [144, 32],
  'lass.png': [144, 32],
  'picnicker.png': [144, 32],
  'sailor.png': [144, 32],
  'mario.png': [48, 16],
  'goomba.png': [16, 16],
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const text = (value) => {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
};
const clamp = (value, max = 600) => {
  const body = text(value);
  return body.length > max ? `${body.slice(0, max)}…` : body;
};

const metrics = {
  tool: 'scripts/verify_preview.mjs',
  startedAt: new Date().toISOString(),
  url: BASE_URL,
  options: {
    viewportHeight: HEIGHT,
    dpr: DPR,
    auditWidths: AUDIT_WIDTHS,
    screenshotWidths: [...SHOT_WIDTHS],
    sceneEnabled: RUN_SCENE,
    sceneTimeoutMs: SCENE_TIMEOUT,
  },
  chromium: { binary: CHROMIUM },
  viewports: {},
  interaction: null,
  reducedMotion: {},
  resize: null,
  scene: null,
  screenshots: [],
  contactSheet: null,
  checks: [],
  failures: [],
  warnings: [],
  errors: {
    runtimeExceptions: [],
    consoleErrors: [],
    appConsoleErrors: [],
    javascriptLogErrors: [],
    networkLogErrors: [],
    fontNetworkFailures: [],
    pages: {},
  },
  pass: null,
};

function check(scope, target, name, pass, detail) {
  target.checks.push({ name, pass: Boolean(pass), detail });
  if (!pass) metrics.failures.push({ scope, name, detail: detail ?? null });
}

function isFont(value) {
  return /fonts\.(googleapis|gstatic)\.com/i.test(text(value));
}

function pngSize(buffer) {
  if (buffer.toString('ascii', 1, 4) !== 'PNG' || buffer.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error('Screenshot is not a PNG');
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function inside(inner, outer, tolerance = 0.75) {
  return (
    !!inner &&
    !!outer &&
    inner.left >= outer.left - tolerance &&
    inner.right <= outer.right + tolerance &&
    inner.top >= outer.top - tolerance &&
    inner.bottom <= outer.bottom + tolerance
  );
}

// ── CDP ─────────────────────────────────────────────────────────

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
    this.closed = false;
    this.ws.addEventListener('message', (event) => this.receive(event));
    this.ws.addEventListener('close', () => {
      this.closed = true;
      for (const entry of this.pending.values()) {
        clearTimeout(entry.timer);
        entry.reject(new Error('CDP socket closed'));
      }
      this.pending.clear();
    });
  }

  receive(event) {
    let message;
    try {
      message = JSON.parse(String(event.data));
    } catch {
      return;
    }
    if (message.id) {
      const entry = this.pending.get(message.id);
      if (!entry) return;
      this.pending.delete(message.id);
      clearTimeout(entry.timer);
      if (message.error) entry.reject(new Error(`${entry.method}: ${message.error.message}`));
      else entry.resolve(message.result || {});
      return;
    }
    for (const handler of this.handlers.get(message.method) || []) {
      handler({ params: message.params || {}, sessionId: message.sessionId });
    }
  }

  open() {
    return new Promise((resolve, reject) => {
      if (this.ws.readyState === WebSocket.OPEN) return resolve();
      this.ws.addEventListener('open', () => resolve(), { once: true });
      this.ws.addEventListener('error', () => reject(new Error('CDP socket error')), {
        once: true,
      });
    });
  }

  on(method, handler) {
    const list = this.handlers.get(method) || new Set();
    list.add(handler);
    this.handlers.set(method, list);
    return () => list.delete(handler);
  }

  send(method, params = {}, sessionId = undefined, timeout = 20_000) {
    if (this.closed) return Promise.reject(new Error('CDP socket is closed'));
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out after ${timeout}ms`));
      }, timeout);
      this.pending.set(id, { resolve, reject, timer, method });
      this.ws.send(JSON.stringify(payload));
    });
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // Already closed.
    }
  }
}

// ── Browser launch / shutdown ───────────────────────────────────

async function waitExit(proc, ms) {
  const end = Date.now() + ms;
  const done = () => proc.exitCode !== null || proc.signalCode !== null;
  while (!done() && Date.now() < end) await sleep(50);
  return done();
}

async function launchBrowser() {
  await rm(PROFILE, { recursive: true, force: true });
  await mkdir(PROFILE, { recursive: true });
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--remote-debugging-port=0',
    `--user-data-dir=${PROFILE}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-component-update',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--force-device-scale-factor=1',
    '--window-size=1440,900',
    '--mute-audio',
    'about:blank',
  ];
  if (typeof process.getuid === 'function' && process.getuid() === 0) {
    args.unshift('--no-sandbox', '--disable-setuid-sandbox');
  }
  const proc = spawn(CHROMIUM, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  let wsUrl;
  try {
    wsUrl = await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Chromium DevTools websocket not found\n${stderr.slice(-2000)}`)),
        20_000,
      );
      const done = (fn, value) => {
        clearTimeout(timer);
        proc.stderr.off('data', onData);
        proc.off('exit', onExit);
        proc.off('error', onError);
        fn(value);
      };
      const onData = (chunk) => {
        stderr = (stderr + chunk).slice(-32_768);
        const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) done(resolve, match[1]);
      };
      const onExit = (code, signal) =>
        done(reject, new Error(`Chromium exited early (${code ?? signal})\n${stderr.slice(-2000)}`));
      const onError = (error) => done(reject, error);
      proc.stderr.on('data', onData);
      proc.on('exit', onExit);
      proc.on('error', onError);
    });
  } catch (error) {
    try {
      if (proc.exitCode === null) proc.kill('SIGKILL');
    } catch {
      // Spawn never produced a process handle.
    }
    await waitExit(proc, 2_000);
    await rm(PROFILE, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    throw error;
  }
  proc.on('error', () => {});
  proc.stderr.resume();
  proc.stdout.resume();
  return { proc, wsUrl };
}

async function closeBrowser(browser, cdp) {
  if (cdp && !cdp.closed) {
    await cdp.send('Browser.close', {}, undefined, 5_000).catch(() => {});
  }
  if (browser?.proc) {
    if (!(await waitExit(browser.proc, 5_000))) {
      browser.proc.kill('SIGTERM');
      if (!(await waitExit(browser.proc, 2_000))) browser.proc.kill('SIGKILL');
    }
  }
  cdp?.close();
  await rm(PROFILE, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(
    (error) => metrics.warnings.push(`Could not remove Chromium profile: ${error.message}`),
  );
}

// ── Page wrapper ────────────────────────────────────────────────

class Page {
  constructor(cdp, targetId, sessionId) {
    this.cdp = cdp;
    this.targetId = targetId;
    this.sessionId = sessionId;
    this.closed = false;
    this.loads = 0;
    this.warnings = [];
    this.errors = {
      runtimeExceptions: [],
      consoleErrors: [],
      logErrors: [],
      fontNetworkFailures: [],
    };
    this.offs = [
      cdp.on('Runtime.exceptionThrown', ({ params, sessionId: sid }) => {
        if (sid !== this.sessionId) return;
        const d = params.exceptionDetails || {};
        this.errors.runtimeExceptions.push({
          text: d.text || 'Uncaught exception',
          description: d.exception?.description || null,
          url: d.url || null,
          lineNumber: d.lineNumber ?? null,
          stack: (d.stackTrace?.callFrames || []).slice(0, 6).map((f) => ({
            functionName: f.functionName,
            url: f.url,
            lineNumber: f.lineNumber,
          })),
        });
      }),
      cdp.on('Runtime.consoleAPICalled', ({ params, sessionId: sid }) => {
        if (sid !== this.sessionId || !['error', 'assert'].includes(params.type)) return;
        const message = (params.args || [])
          .map((arg) => arg.value ?? arg.description ?? arg.unserializableValue ?? arg.type)
          .join(' ');
        const frame = params.stackTrace?.callFrames?.[0];
        this.errors.consoleErrors.push({
          type: params.type,
          text: message,
          url: frame?.url || null,
        });
      }),
      cdp.on('Log.entryAdded', ({ params, sessionId: sid }) => {
        if (sid !== this.sessionId) return;
        const entry = params.entry || {};
        if (entry.level !== 'error') return;
        const record = {
          source: entry.source || null,
          text: entry.text || '',
          url: entry.url || null,
        };
        if (entry.url && isFont(entry.url)) this.errors.fontNetworkFailures.push(record);
        else this.errors.logErrors.push(record);
      }),
    ];
  }

  send(method, params = {}, timeout = 20_000) {
    return this.cdp.send(method, params, this.sessionId, timeout);
  }

  async evaluate(expression, timeout = 20_000) {
    const result = await this.send(
      'Runtime.evaluate',
      { expression, awaitPromise: true, returnByValue: true, userGesture: true },
      timeout,
    );
    if (result.exceptionDetails) {
      throw new Error(
        `Page evaluate failed: ${result.exceptionDetails.text || 'exception'}` +
          (result.exceptionDetails.exception?.description
            ? `\n${result.exceptionDetails.exception.description}`
            : ''),
      );
    }
    return result.result?.value;
  }

  async waitFor(label, expression, predicate, timeout = 15_000, interval = 100) {
    const end = Date.now() + timeout;
    let last;
    let lastError;
    while (Date.now() < end) {
      try {
        last = await this.evaluate(expression);
        if (predicate(last)) return last;
      } catch (error) {
        lastError = error;
      }
      await sleep(interval);
    }
    throw new Error(
      `Timed out waiting for ${label}. Last: ${clamp(last, 500)}` +
        (lastError ? ` Error: ${clamp(lastError.message, 300)}` : ''),
    );
  }

  async init(width) {
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('Log.enable');
    await this.setWidth(width);
    await this.setMedia(false);
    await this.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
    await this.send('Page.bringToFront').catch(() => {});
  }

  async setWidth(width) {
    this.width = width;
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height: HEIGHT,
      deviceScaleFactor: DPR,
      mobile: false,
      screenWidth: width,
      screenHeight: HEIGHT,
    });
  }

  async setMedia(reducedMotion) {
    await this.send('Emulation.setEmulatedMedia', {
      media: 'screen',
      features: reducedMotion
        ? [{ name: 'prefers-reduced-motion', value: 'reduce' }]
        : [],
    });
  }

  async addPreload(source) {
    await this.send('Page.addScriptToEvaluateOnNewDocument', { source });
  }

  async load(url = BASE_URL) {
    // A unique query guarantees a fresh document even when the previous
    // scenario loaded the same URL.
    const targetUrl = `${url}${url.includes('?') ? '&' : '?'}verify=${++this.loads}`;
    await this.send('Page.navigate', { url: targetUrl });
    try {
      await this.waitFor(
        'preview navigation',
        `({ href: location.href, ready: document.readyState })`,
        (s) => s?.href?.startsWith(url) && s.ready === 'complete',
        25_000,
        50,
      );
    } catch (error) {
      this.warnings.push(`Page load did not reach complete: ${clamp(error.message, 300)}`);
    }
    try {
      await this.evaluate(
        `Promise.race([
          document.fonts?.ready ?? Promise.resolve(),
          new Promise((resolve) => setTimeout(resolve, ${Math.max(500, FONT_WAIT - 500)}))
        ]).then(() => true)`,
        FONT_WAIT + 1_000,
      );
    } catch (error) {
      this.warnings.push(`document.fonts.ready timed out: ${clamp(error.message, 300)}`);
    }
  }

  async capture(filePath) {
    const result = await this.send(
      'Page.captureScreenshot',
      { format: 'png', fromSurface: true, captureBeyondViewport: false },
      30_000,
    );
    const buffer = Buffer.from(result.data, 'base64');
    const size = pngSize(buffer);
    await writeFile(filePath, buffer);
    return { ...size, bytes: buffer.length };
  }

  takeErrors(scope) {
    for (const warning of this.warnings) metrics.warnings.push(`${scope}: ${warning}`);
    const snapshot = JSON.parse(JSON.stringify(this.errors));
    metrics.errors.pages[scope] = snapshot;
    this.warnings = [];
    this.errors = {
      runtimeExceptions: [],
      consoleErrors: [],
      logErrors: [],
      fontNetworkFailures: [],
    };
    return snapshot;
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    for (const off of this.offs) off();
    await this.cdp.send('Target.closeTarget', { targetId: this.targetId }, undefined, 5_000).catch(
      () => {},
    );
  }
}

async function openPage(cdp, width = 320) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Target.activateTarget', { targetId }).catch(() => {});
  const page = new Page(cdp, targetId, sessionId);
  await page.init(width).catch(async (error) => {
    await page.close();
    throw error;
  });
  return page;
}

// ── DOM snapshots ───────────────────────────────────────────────

const SNAP = String.raw`(() => {
  const q = (s) => document.querySelector(s);
  const qa = (s) => [...document.querySelectorAll(s)];
  const R = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  };
  const S = (el) => (el ? getComputedStyle(el) : null);
  const banner = q('pre.banner-art');
  const body = q('.terminal-body');
  const term = q('.terminal-window');
  const hint = qa('pre.terminal-output').find((el) => el.textContent.includes('to see available commands.'));
  const nav = q('.terminal-header-links');
  const icons = qa('.terminal-header-link');
  const input = q('.terminal-input');
  const prompt = q('.terminal-input-line');
  const chips = q('.terminal-chips');
  const lane = q('.pixel-walkers');
  const laneRect = R(lane);
  const bg = (el) => {
    const raw = el.style.backgroundImage || S(el).backgroundImage || '';
    const match = raw.match(/url\((?:"|')?([^"')]+)(?:"|')?\)/);
    return match ? match[1] : null;
  };
  const sprites = qa('.pixel-walker-sprite').map((el) => {
    const rect = R(el);
    const style = S(el);
    const src = bg(el);
    let url = null;
    try { url = src ? new URL(src, location.href) : null; } catch { url = null; }
    const intersectsLane = !!laneRect
      && rect.right > laneRect.left && rect.left < laneRect.right
      && rect.bottom > laneRect.top && rect.top < laneRect.bottom;
    const visible = !!rect && rect.width > 0 && rect.height > 0
      && rect.right > 1 && rect.left < innerWidth - 1
      && rect.bottom > 1 && rect.top < innerHeight - 1
      && intersectsLane
      && style.display !== 'none' && style.visibility !== 'hidden'
      && parseFloat(style.opacity || '1') > 0;
    const comfortable = visible && rect.left >= 2 && rect.right <= innerWidth - 2
      && !!laneRect && rect.left >= laneRect.left + 2 && rect.right <= laneRect.right - 2;
    return {
      src,
      origin: url ? url.origin : null,
      pathname: url ? url.pathname : null,
      filename: url ? url.pathname.split('/').pop() : null,
      width: rect.width,
      height: rect.height,
      rect,
      transform: el.style.transform || '',
      visible,
      comfortable
    };
  });
  const bannerText = banner ? banner.textContent : '';
  const hintText = hint ? hint.textContent : '';
  const bStyle = S(banner);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    pageOrigin: location.origin,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, reduced },
    doc: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth },
    term: R(term),
    body: body ? {
      rect: R(body), scrollWidth: body.scrollWidth, clientWidth: body.clientWidth
    } : null,
    banner: banner ? {
      variant: q('.banner-frame') ? q('.banner-frame').dataset.bannerVariant || null : null,
      complete: bannerText.trimEnd().endsWith('╝'),
      textLength: bannerText.length,
      rect: R(banner),
      scrollWidth: banner.scrollWidth,
      clientWidth: banner.clientWidth,
      whiteSpace: bStyle.whiteSpace,
      color: bStyle.color,
      animationName: bStyle.animationName,
      charAnimations: reduced ? [...new Set(qa('.banner-char').map((el) => S(el).animationName))] : [],
      chunkAnimations: reduced ? [...new Set(qa('.banner-chunk').map((el) => S(el).animationName))] : [],
      charColors: reduced ? [...new Set(qa('.banner-char').map((el) => S(el).color))] : [],
      charCount: qa('.banner-char').length,
      chunkCount: qa('.banner-chunk').length
    } : null,
    hint: hint ? {
      rect: R(hint),
      text: hintText,
      complete: hintText.trim() === 'Type help to see available commands.',
      clickables: qa('.terminal-clickable-cmd').length
    } : null,
    nav: {
      rect: R(nav),
      count: icons.length,
      opacity: nav ? parseFloat(S(nav).opacity) : 0,
      labels: icons.map((el) => el.getAttribute('aria-label'))
    },
    prompt: { rect: R(prompt) },
    input: { rect: R(input), fontSize: input ? parseFloat(S(input).fontSize) : null },
    chips: {
      rect: R(chips),
      scrollWidth: chips ? chips.scrollWidth : null,
      clientWidth: chips ? chips.clientWidth : null,
      count: qa('.terminal-chip').length
    },
    lane: lane ? {
      rect: laneRect, width: laneRect.width, height: laneRect.height,
      scale: lane.dataset.scale || null, pointerEvents: S(lane).pointerEvents
    } : null,
    sprites
  };
})()`;

const IMAGES = String.raw`(async () => {
  const urls = [...new Set([...document.querySelectorAll('.pixel-walker-sprite')].map((el) => {
    const raw = el.style.backgroundImage || getComputedStyle(el).backgroundImage || '';
    const match = raw.match(/url\((?:"|')?([^"')]+)(?:"|')?\)/);
    return match ? match[1] : null;
  }).filter(Boolean))];
  const out = [];
  for (const src of urls) {
    const record = { src, origin: null, pathname: null, filename: null, width: 0, height: 0, error: null };
    try {
      const url = new URL(src, location.href);
      record.origin = url.origin;
      record.pathname = url.pathname;
      record.filename = url.pathname.split('/').pop();
      const image = new Image();
      image.src = src;
      await Promise.race([
        image.decode(),
        new Promise((resolve) => setTimeout(resolve, 2500))
      ]);
      record.width = image.naturalWidth;
      record.height = image.naturalHeight;
      if (!record.width || !record.height) record.error = 'missing natural dimensions';
    } catch (error) {
      record.error = String(error);
    }
    out.push(record);
  }
  return out;
})()`;

const SCENE = String.raw`(() => {
  const sprites = [...document.querySelectorAll('.pixel-walker')].map((root) => {
    const el = root.querySelector('.pixel-walker-sprite');
    if (!el) return null;
    const style = getComputedStyle(el);
    const raw = el.style.backgroundImage || style.backgroundImage || '';
    const match = raw.match(/url\((?:"|')?([^"')]+)(?:"|')?\)/);
    const r = el.getBoundingClientRect();
    return {
      src: match ? match[1] : null,
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
      transform: el.style.transform || '',
      computedTransform: style.transform,
      rootTransform: root.style.transform || '',
      backgroundImage: raw,
      visible: r.width > 0 && r.height > 0
        && r.right > 1 && r.left < innerWidth - 1
        && r.bottom > 1 && r.top < innerHeight - 1
        && style.display !== 'none' && style.visibility !== 'hidden'
    };
  }).filter(Boolean);
  return { now: performance.now(), sprites };
})()`;

const SCENE_PRELOAD = String.raw`(() => {
  // Browser-only acceleration for the optional scene check. PixelWalkers
  // clamps frame deltas to 64 ms, so x4 timestamps make 45–120 s of simulated
  // time take roughly 12–32 s of wall time. App code is unchanged.
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => raf((timestamp) => callback(timestamp * 4));
})()`;

const headerReady = (snap) =>
  !!snap?.banner?.variant &&
  snap.banner.variant !== 'pending' &&
  snap.banner.complete &&
  snap.hint?.complete &&
  snap.nav.count === 3 &&
  snap.nav.opacity >= 0.95;

const spriteStats = (snap) => ({
  visible: (snap?.sprites || []).filter((sprite) => sprite.visible).length,
  comfortable: (snap?.sprites || []).filter((sprite) => sprite.comfortable).length,
  total: (snap?.sprites || []).length,
});

const spritesReady = (snap) => {
  const stats = spriteStats(snap);
  return stats.visible >= 1 && stats.visible <= 3 && stats.comfortable >= 1;
};

// ── Checks ──────────────────────────────────────────────────────

function audit(scope, record, snap, width, images = []) {
  const at = (name, pass, detail) => check(scope, record, name, pass, detail);
  const expectedVariant = VARIANTS[width];
  const stats = spriteStats(snap);
  const lane = snap.lane;
  const scale = lane && lane.width >= 700 ? 2 : 1.5;
  const spritesLocal =
    snap.sprites.length > 0 &&
    snap.sprites.every(
      (sprite) =>
        sprite.origin === snap.pageOrigin &&
        sprite.pathname?.startsWith('/sprites/') &&
        sprite.filename,
    );
  const decodedNames = new Set(images.map((image) => image.filename).filter(Boolean));
  const imagesOk =
    images.length > 0 &&
    images.every(
      (image) =>
        image.origin === snap.pageOrigin &&
        image.pathname?.startsWith('/sprites/') &&
        image.width > 0 &&
        image.height > 0 &&
        !image.error,
    ) &&
    snap.sprites.every((sprite) => decodedNames.has(sprite.filename));
  const dimensionsOk =
    images.length > 0 &&
    images.every((image) => {
      const expected = SPRITE_DIMENSIONS[image.filename];
      return expected && image.width === expected[0] && image.height === expected[1];
    });

  at('viewport-exact', snap.viewport.width === width && snap.viewport.height === HEIGHT && snap.viewport.dpr === DPR, {
    expected: `${width}x${HEIGHT}@${DPR}`,
    actual: snap.viewport,
  });
  at('header-complete', headerReady(snap), {
    variant: snap.banner?.variant,
    icons: snap.nav.count,
    hint: snap.hint?.complete,
  });
  at('banner-variant', snap.banner?.variant === expectedVariant, {
    expected: expectedVariant,
    actual: snap.banner?.variant,
  });
  at('document-no-horizontal-overflow', snap.doc.scrollWidth <= snap.doc.clientWidth, snap.doc);
  at('terminal-body-no-horizontal-overflow', snap.body && snap.body.scrollWidth <= snap.body.clientWidth, snap.body && {
    scrollWidth: snap.body.scrollWidth,
    clientWidth: snap.body.clientWidth,
  });
  at('banner-no-horizontal-overflow', snap.banner && snap.banner.scrollWidth <= snap.banner.clientWidth, snap.banner && {
    scrollWidth: snap.banner.scrollWidth,
    clientWidth: snap.banner.clientWidth,
  });
  at('banner-white-space-pre', snap.banner?.whiteSpace === 'pre', snap.banner?.whiteSpace);
  at('banner-inside-body', inside(snap.banner?.rect, snap.body?.rect, 1.5));
  at('help-inside-terminal', inside(snap.hint?.rect, snap.term));
  at('prompt-inside-terminal', inside(snap.prompt?.rect, snap.term));
  at('chips-inside-terminal', inside(snap.chips?.rect, snap.term));
  at(
    PHONE_WIDTHS.has(width) ? 'input-font-at-least-16' : 'input-font-desktop-14',
    PHONE_WIDTHS.has(width)
      ? snap.input.fontSize >= 16
      : Math.abs(snap.input.fontSize - 14) < 0.01,
    snap.input.fontSize,
  );
  at('walker-lane-present', !!lane && lane.width > 0 && lane.height > 0, lane);
  at('walker-lane-pointer-events-none', lane?.pointerEvents === 'none', lane?.pointerEvents);
  at('walker-scale', !!lane && lane.scale === String(scale) &&
    snap.sprites.length > 0 &&
    snap.sprites.every((sprite) => Math.abs(sprite.width - 16 * scale) < 0.01), {
    expectedScale: scale,
    laneWidth: lane?.width,
    dataScale: lane?.scale,
    spriteWidths: snap.sprites.map((sprite) => sprite.width),
  });
  at('rendered-visible-sprites-1-to-3', stats.visible >= 1 && stats.visible <= 3, stats);
  at('sprite-clear-of-edges', stats.comfortable >= 1, stats);
  at('sprite-urls-local', spritesLocal, snap.sprites.map((sprite) => sprite.pathname || sprite.src));
  at('sprite-images-decoded', imagesOk, {
    images: images.map((image) => ({
      filename: image.filename,
      width: image.width,
      height: image.height,
      error: image.error,
    })),
    rendered: snap.sprites.map((sprite) => sprite.filename),
  });
  at('sprite-image-dimensions', dimensionsOk, images.map((image) => ({
    filename: image.filename,
    actual: [image.width, image.height],
    expected: SPRITE_DIMENSIONS[image.filename] || null,
  })));
}

// ── Scenarios ───────────────────────────────────────────────────

async function fresh(page, width, reducedMotion = false) {
  await page.setWidth(width);
  await page.setMedia(reducedMotion);
  await page.load();
}

async function runViewport(page, width) {
  const scope = `viewport-${width}`;
  const record = { checks: [], screenshot: null };
  metrics.viewports[width] = record;
  try {
    await fresh(page, width);
    await page.waitFor('complete header', SNAP, headerReady, HEADER_TIMEOUT);
    await page.waitFor('visible walker', SNAP, spritesReady, SPRITE_TIMEOUT);
    let snapshot = await page.evaluate(SNAP);
    for (let attempt = 0; attempt < 3 && !spritesReady(snapshot); attempt += 1) {
      snapshot = await page.waitFor('walker still visible', SNAP, spritesReady, 5_000);
    }
    const images = (await page.evaluate(IMAGES)) || [];
    record.audit = {
      variant: snapshot.banner?.variant,
      terminalWidth: snapshot.term?.width,
      bodyClientWidth: snapshot.body?.clientWidth,
      bodyScrollWidth: snapshot.body?.scrollWidth,
      bannerClientWidth: snapshot.banner?.clientWidth,
      bannerScrollWidth: snapshot.banner?.scrollWidth,
      inputFontSize: snapshot.input?.fontSize,
      laneWidth: snapshot.lane?.width,
      laneHeight: snapshot.lane?.height,
      scale: snapshot.lane?.scale,
      sprites: spriteStats(snapshot),
      spriteFiles: [...new Set(snapshot.sprites.map((sprite) => sprite.filename).filter(Boolean))],
      images,
    };
    audit(scope, record, snapshot, width, images);

    if (SHOT_WIDTHS.has(width)) {
      let preShot = await page.evaluate(SNAP);
      if (!spritesReady(preShot)) {
        preShot = await page.waitFor('walker visible for screenshot', SNAP, spritesReady, 5_000);
      }
      check(scope, record, 'sprites-visible-at-screenshot', spritesReady(preShot), spriteStats(preShot));
      const file = path.join(OUT, `terminal-${width}.png`);
      const shot = await page.capture(file);
      record.screenshot = {
        path: path.relative(ROOT, file),
        width: shot.width,
        height: shot.height,
        bytes: shot.bytes,
      };
      check(scope, record, 'screenshot-exact-size',
        shot.width === width && shot.height === HEIGHT,
        { actual: `${shot.width}x${shot.height}`, expected: `${width}x${HEIGHT}` });
      metrics.screenshots.push({ width, ...record.screenshot });
    }
  } catch (error) {
    check(scope, record, 'viewport-scenario', false, { error: clamp(error.message, 800) });
  } finally {
    record.errors = page.takeErrors(scope);
  }
}

const TEXT_STATE = String.raw`(() => ({
  text: document.querySelector('.terminal-body')?.innerText || '',
  input: document.querySelector('.terminal-input')?.value ?? ''
}))()`;

async function clickSelector(page, selector, label) {
  const hit = await page.evaluate(String.raw`(() => {
    const selector = ${JSON.stringify(selector)};
    const el = [...document.querySelectorAll(selector)]
      .find((node) => !${JSON.stringify(label)} || node.textContent.trim() === ${JSON.stringify(label)});
    if (!el) return { found: false };
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const hit = document.elementFromPoint(x, y);
    return {
      found: true,
      x,
      y,
      isHit: hit === el || (!!hit && typeof hit.closest === 'function' && hit.closest(selector) === el),
      hitTag: hit?.tagName || null,
      hitClass: typeof hit?.className === 'string' ? hit.className : null
    };
  })()`);
  if (hit.found && hit.isHit) {
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hit.x, y: hit.y, button: 'none' });
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: hit.x, y: hit.y, button: 'left', clickCount: 1 });
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: hit.x, y: hit.y, button: 'left', clickCount: 1 });
  }
  return hit;
}

async function press(page, key, code, vk, value) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk };
  await page.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    ...base,
    ...(value ? { text: value, unmodifiedText: value } : {}),
  });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}

async function waitText(page, needle, timeout = 20_000) {
  return page.waitFor(
    `command output ${JSON.stringify(needle)}`,
    TEXT_STATE,
    (state) => state.text.includes(needle),
    timeout,
  );
}

async function waitInput(page, value, timeout = 5_000) {
  return page.waitFor(
    `input value ${JSON.stringify(value)}`,
    TEXT_STATE,
    (state) => state.input === value,
    timeout,
    50,
  );
}

async function runInteraction(page) {
  const scope = 'interaction-320';
  const record = { checks: [], values: {} };
  metrics.interaction = record;
  try {
    await fresh(page, 320);
    await page.waitFor('complete header', SNAP, headerReady, HEADER_TIMEOUT);

    const helpHit = await clickSelector(page, '.terminal-clickable-cmd', 'help');
    check(scope, record, 'help-clickable-hit-test', helpHit.found && helpHit.isHit, helpHit);
    if (helpHit.found && helpHit.isHit) {
      const state = await waitText(page, 'use the Email, LinkedIn, or GitHub icons in the header.');
      check(scope, record, 'help-via-clickable-hint', state.text.includes('Available commands:'));
    } else {
      check(scope, record, 'help-via-clickable-hint', false);
    }
    await sleep(250);

    await page.evaluate(`document.querySelector('.terminal-input').focus(); true`);
    await page.send('Input.insertText', { text: 'ab' });
    await waitInput(page, 'ab');
    await press(page, 'Tab', 'Tab', 9);
    const tab = await waitInput(page, 'about');
    record.values.tab = tab.input;
    check(scope, record, 'tab-completion', tab.input === 'about', tab.input);

    await press(page, 'Enter', 'Enter', 13, '\r');
    const about = await waitText(page, 'Super Smash Bros Ultimate');
    record.values.aboutInput = about.input;
    check(scope, record, 'enter-submits-command', about.text.includes('About Me'));
    check(scope, record, 'input-cleared-after-submit', about.input === '');
    await sleep(250);

    await press(page, 'ArrowUp', 'ArrowUp', 38);
    const up1 = await waitInput(page, 'about');
    await press(page, 'ArrowUp', 'ArrowUp', 38);
    const up2 = await waitInput(page, 'help');
    await press(page, 'ArrowDown', 'ArrowDown', 40);
    const down = await waitInput(page, 'about');
    record.values.history = [up1.input, up2.input, down.input];
    check(scope, record, 'history-recall',
      up1.input === 'about' && up2.input === 'help' && down.input === 'about',
      record.values.history);

    const chip = await clickSelector(page, '.terminal-chip', 'skills');
    check(scope, record, 'chip-click-not-blocked-by-walkers', chip.found && chip.isHit, chip);
    if (chip.found && chip.isHit) {
      const state = await waitText(page, 'Openclaw');
      check(scope, record, 'chip-executes-command',
        state.text.includes('▸ Skills') || state.text.includes('Technical skills'));
    } else {
      check(scope, record, 'chip-executes-command', false);
    }
  } catch (error) {
    check(scope, record, 'interaction-scenario', false, { error: clamp(error.message, 800) });
  } finally {
    record.errors = page.takeErrors(scope);
    record.pass = record.checks.every((entry) => entry.pass);
  }
}

async function runReduced(page, width) {
  const scope = `reduced-${width}`;
  const record = { checks: [] };
  metrics.reducedMotion[width] = record;
  try {
    await fresh(page, width, true);
    const snap = await page.waitFor('complete header', SNAP, headerReady, HEADER_TIMEOUT);
    record.metrics = { variant: snap.banner?.variant, color: snap.banner?.color };
    check(scope, record, 'prefers-reduced-motion-active', snap.viewport.reduced, snap.viewport.reduced);
    check(scope, record, 'no-pixel-walkers', !snap.lane && snap.sprites.length === 0);
    check(scope, record, 'banner-variant', snap.banner?.variant === VARIANTS[width], snap.banner?.variant);
    check(scope, record, 'banner-animation-none', snap.banner?.animationName === 'none', snap.banner?.animationName);
    check(scope, record, 'banner-char-animations-none',
      snap.banner?.charAnimations.length > 0 && snap.banner.charAnimations.every((name) => name === 'none'),
      snap.banner?.charAnimations);
    check(scope, record, 'banner-chunk-animations-none',
      snap.banner?.chunkCount > 0 &&
        snap.banner.chunkAnimations.every((name) => name === 'none'),
      {
        chunks: snap.banner?.chunkCount,
        animationNames: snap.banner?.chunkAnimations,
      });
    check(scope, record, 'banner-solid-cyan', snap.banner?.color === 'rgb(0, 255, 245)', snap.banner?.color);
    check(scope, record, 'banner-chars-solid-cyan',
      snap.banner?.charColors.length > 0 && snap.banner.charColors.every((color) => color === 'rgb(0, 255, 245)'),
      snap.banner?.charColors);
    check(scope, record, 'icons-and-hint-available', snap.nav.count === 3 && snap.hint?.complete, {
      icons: snap.nav.count,
      hint: snap.hint?.complete,
    });
  } catch (error) {
    check(scope, record, 'reduced-motion-scenario', false, { error: clamp(error.message, 800) });
  } finally {
    record.errors = page.takeErrors(scope);
  }
}

async function runResize(page) {
  const scope = 'resize-768-390-1440';
  const record = { checks: [], states: {} };
  metrics.resize = record;
  try {
    await fresh(page, 768);
    let snap = await page.waitFor('header at 768', SNAP, headerReady, HEADER_TIMEOUT);
    record.states['768'] = { variant: snap.banner?.variant, icons: snap.nav.count, hint: snap.hint?.complete };
    check(scope, record, 'initial-768-full', snap.banner?.variant === 'full', snap.banner?.variant);
    check(scope, record, 'initial-768-icons-3', snap.nav.count === 3);
    check(scope, record, 'initial-768-hint', snap.hint?.complete);

    for (const width of [390, 1440]) {
      await page.setWidth(width);
      const expected = VARIANTS[width];
      snap = await page.waitFor(`header at ${width}`, SNAP,
        (value) => headerReady(value) && value.banner?.variant === expected, 10_000);
      record.states[width] = { variant: snap.banner?.variant, icons: snap.nav.count, hint: snap.hint?.complete };
      check(scope, record, `resized-${width}-${expected}`, snap.banner?.variant === expected, snap.banner?.variant);
      check(scope, record, `resized-${width}-icons-3`, snap.nav.count === 3);
      check(scope, record, `resized-${width}-hint`, snap.hint?.complete);
      check(scope, record, `resized-${width}-no-doc-overflow`,
        snap.doc.scrollWidth <= snap.doc.clientWidth, snap.doc);
    }
  } catch (error) {
    check(scope, record, 'resize-scenario', false, { error: clamp(error.message, 800) });
  } finally {
    record.errors = page.takeErrors(scope);
  }
}

async function runScene(page) {
  const scope = 'scene-768';
  const record = {
    checks: [],
    status: RUN_SCENE ? 'not-observed' : 'skipped',
    accelerated: true,
    rafTimestampMultiplier: 4,
    events: {},
    evidence: {},
  };
  metrics.scene = record;
  if (!RUN_SCENE) return;

  let lastGoombaTop = null;
  let absent = 0;
  const started = Date.now();
  try {
    // Fresh document with a browser-only preload; acceptance screenshots are
    // already captured and never use the accelerated clock.
    await page.addPreload(SCENE_PRELOAD);
    await fresh(page, 768);
    await page.waitFor('complete header', SNAP, headerReady, HEADER_TIMEOUT);

    while (Date.now() - started < SCENE_TIMEOUT) {
      const state = await page.evaluate(SCENE);
      const mario = state.sprites.find((sprite) => /mario\.png(?:\?|$)/.test(sprite.src || ''));
      const goomba = state.sprites.find((sprite) => /goomba\.png(?:\?|$)/.test(sprite.src || ''));
      if (mario && !record.events.mario) record.events.mario = Date.now() - started;
      if (goomba && !record.events.goomba) record.events.goomba = Date.now() - started;

      if (mario && goomba && mario.visible && goomba.visible && !record.evidence.chase) {
        const capture = { at: Date.now() - started, mario, goomba };
        const file = path.join(OUT, 'mario-chase-768.png');
        const shot = await page.capture(file);
        capture.path = path.relative(ROOT, file);
        capture.size = { width: shot.width, height: shot.height };
        if (shot.width !== 768 || shot.height !== HEIGHT) {
          metrics.warnings.push(`mario-chase-768.png is ${shot.width}x${shot.height}`);
        }
        record.evidence.chase = capture;
      }

      if (goomba) {
        absent = 0;
        const flipped =
          /scaleY\(-1\)/.test(goomba.transform) ||
          /scaleY\(-1\)/.test(goomba.computedTransform);
        if (flipped) {
          record.events.flipped ??= Date.now() - started;
          if (!record.evidence.stomp) {
            const capture = { at: Date.now() - started, mario, goomba };
            const file = path.join(OUT, 'mario-stomp-768.png');
            const shot = await page.capture(file);
            capture.path = path.relative(ROOT, file);
            capture.size = { width: shot.width, height: shot.height };
            if (shot.width !== 768 || shot.height !== HEIGHT) {
              metrics.warnings.push(`mario-stomp-768.png is ${shot.width}x${shot.height}`);
            }
            record.evidence.stomp = capture;
          }
          if (lastGoombaTop !== null && goomba.top > lastGoombaTop + 0.5) {
            record.events.fell ??= Date.now() - started;
          }
          lastGoombaTop = goomba.top;
        }
      } else if (record.events.flipped) {
        absent += 1;
        if (absent >= 2) {
          record.events.removed = Date.now() - started;
          break;
        }
      }
      await sleep(50);
    }

    const events = record.events;
    const complete =
      events.mario && events.goomba && events.flipped && events.fell && events.removed;
    const any = events.mario || events.goomba || events.flipped;
    record.status = complete ? 'observed' : any ? 'partial' : 'not-observed';
    record.wallMs = Date.now() - started;
    if (record.status !== 'observed') {
      metrics.warnings.push(`Optional micro-scene status: ${record.status}. If partial, DOM evidence is in metrics.scene.`);
    }
  } catch (error) {
    record.status = 'error';
    record.error = clamp(error.message, 800);
    metrics.warnings.push(`Optional micro-scene error (not an acceptance failure): ${record.error}`);
  } finally {
    record.errors = page.takeErrors(scope);
  }
}

// ── Contact sheet / errors / main ───────────────────────────────

async function makeContactSheet() {
  const files = [...SHOT_WIDTHS].map((width) => path.join(OUT, `terminal-${width}.png`));
  const present = [];
  for (const file of files) {
    try {
      await stat(file);
      present.push(file);
    } catch {
      // Reported below.
    }
  }
  if (present.length !== files.length) {
    metrics.failures.push({
      scope: 'contact-sheet',
      name: 'contact-sheet',
      detail: `Missing screenshots (${present.length}/${files.length})`,
    });
    return;
  }
  try {
    const args = [SHEET_SCRIPT, '--out', SHEET_FILE];
    for (const file of present) args.push('--image', file);
    const { stdout } = await runFile(PYTHON, args, { cwd: ROOT, timeout: 60_000 });
    const info = JSON.parse(stdout.trim().split('\n').pop());
    const buffer = await readFile(SHEET_FILE);
    const size = pngSize(buffer);
    if (info.width !== size.width || info.height !== size.height) {
      throw new Error(`Sheet report ${info.width}x${info.height} != PNG ${size.width}x${size.height}`);
    }
    metrics.contactSheet = {
      path: path.relative(ROOT, SHEET_FILE),
      width: size.width,
      height: size.height,
      bytes: buffer.length,
      images: info.images,
    };
  } catch (error) {
    metrics.failures.push({
      scope: 'contact-sheet',
      name: 'contact-sheet',
      detail: clamp(error.message, 800),
    });
  }
}

function finalizeErrors() {
  const pages = Object.values(metrics.errors.pages);
  const collect = (key) => pages.flatMap((entry) => entry[key] || []);
  const runtime = collect('runtimeExceptions');
  const consoleErrors = collect('consoleErrors').filter((entry) => !isFont(entry.text) && !isFont(entry.url));
  const logErrors = collect('logErrors');
  const jsLogErrors = logErrors.filter((entry) => entry.source !== 'network' && !isFont(entry.text) && !isFont(entry.url));
  const networkErrors = logErrors.filter((entry) => entry.source === 'network' && !isFont(entry.text) && !isFont(entry.url));
  const fontErrors = collect('fontNetworkFailures');
  Object.assign(metrics.errors, {
    runtimeExceptions: runtime,
    consoleErrors: collect('consoleErrors'),
    appConsoleErrors: consoleErrors,
    javascriptLogErrors: jsLogErrors,
    networkLogErrors: networkErrors,
    fontNetworkFailures: fontErrors,
  });
  check('global', metrics, 'no-uncaught-runtime-exceptions', runtime.length === 0, runtime.slice(0, 5));
  check('global', metrics, 'no-app-console-errors', consoleErrors.length === 0, consoleErrors.slice(0, 5));
  check('global', metrics, 'no-app-javascript-log-errors', jsLogErrors.length === 0, jsLogErrors.slice(0, 5));
  if (fontErrors.length) {
    metrics.warnings.push(`Ignored ${fontErrors.length} external Google Fonts network error(s).`);
  }
  if (networkErrors.length) {
    metrics.warnings.push(`Observed ${networkErrors.length} non-font network resource error(s).`);
  }
}

async function cleanOutputs() {
  for (const name of [
    ...[...SHOT_WIDTHS].map((width) => `terminal-${width}.png`),
    'contact-sheet.png',
    'mario-chase-768.png',
    'mario-stomp-768.png',
    'metrics.json',
  ]) {
    await rm(path.join(OUT, name), { force: true }).catch(() => {});
  }
}

async function ensureServer() {
  const response = await fetch(BASE_URL, {
    signal: AbortSignal.timeout(5_000),
    headers: { accept: 'text/html' },
  });
  if (!response.ok) throw new Error(`${BASE_URL} returned HTTP ${response.status}`);
  const html = await response.text();
  if (!html.includes('id="root"')) throw new Error(`${BASE_URL} does not look like the Vite app`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await mkdir(path.dirname(PROFILE), { recursive: true });
  await cleanOutputs();
  let browser = null;
  let cdp = null;
  let page = null;
  let exitCode = 0;
  let sheetTried = false;

  try {
    await ensureServer();
    browser = await launchBrowser();
    cdp = new CDP(browser.wsUrl);
    await cdp.open();
    const version = await cdp.send('Browser.getVersion').catch(() => null);
    metrics.chromium.product = version?.product || null;
    page = await openPage(cdp, 320);

    for (const width of AUDIT_WIDTHS) await runViewport(page, width);
    await makeContactSheet();
    sheetTried = true;
    await runInteraction(page);
    await runReduced(page, 320);
    await runReduced(page, 1440);
    await runResize(page);
    await runScene(page);
  } catch (error) {
    metrics.failures.push({ scope: 'harness', name: 'fatal', detail: clamp(error.message, 1200) });
    exitCode = 1;
  } finally {
    await page?.close();
    await closeBrowser(browser, cdp);
    if (!sheetTried && !metrics.contactSheet) {
      await makeContactSheet();
      sheetTried = true;
    }

    finalizeErrors();
    metrics.finishedAt = new Date().toISOString();
    metrics.pass = metrics.failures.length === 0;
    if (!metrics.pass) exitCode = 1;
    await writeFile(METRICS_FILE, `${JSON.stringify(metrics, null, 2)}\n`).catch((error) => {
      console.error(`Could not write metrics: ${error.message}`);
      metrics.pass = false;
      exitCode = 1;
    });
  }

  console.log(`\nPreview verification: ${metrics.pass ? 'PASS' : 'FAIL'}`);
  console.log(`  URL: ${BASE_URL}`);
  console.log(`  Chromium: ${metrics.chromium.product || CHROMIUM}`);
  console.log(`  Metrics: ${path.relative(ROOT, METRICS_FILE)}`);
  for (const width of AUDIT_WIDTHS) {
    const record = metrics.viewports[width];
    if (!record) continue;
    const failed = record.checks.filter((entry) => !entry.pass).length;
    const auditData = record.audit || {};
    console.log(
      `  ${record.checks.length - failed}/${record.checks.length} checks · ${width}x${HEIGHT} · ` +
        `${auditData.variant || 'unknown'} · sprites ${auditData.sprites?.visible ?? '?'}/` +
        `${auditData.sprites?.total ?? '?'} · scale ${auditData.scale ?? '?'}`,
    );
    if (record.screenshot) {
      console.log(`    ${record.screenshot.path} (${record.screenshot.width}x${record.screenshot.height})`);
    }
  }
  console.log(
    metrics.contactSheet
      ? `  Contact sheet: ${metrics.contactSheet.path} (${metrics.contactSheet.width}x${metrics.contactSheet.height})`
      : '  Contact sheet: MISSING',
  );
  if (metrics.interaction) {
    console.log(`  Interaction @320: ${metrics.interaction.pass ? 'PASS' : 'FAIL'}`);
  }
  if (metrics.scene) {
    console.log(
      `  Micro-scene: ${metrics.scene.status}` +
        (metrics.scene.evidence?.chase ? ` · ${metrics.scene.evidence.chase.path}` : '') +
        (metrics.scene.evidence?.stomp ? ` · ${metrics.scene.evidence.stomp.path}` : ''),
    );
  }
  for (const warning of metrics.warnings.slice(0, 8)) console.log(`  ! ${warning}`);
  for (const failure of metrics.failures.slice(0, 20)) {
    console.log(`  ✗ [${failure.scope}] ${failure.name}: ${clamp(failure.detail, 400)}`);
  }
  if (metrics.warnings.length > 8) console.log(`  … ${metrics.warnings.length - 8} more warnings in metrics.json`);
  if (metrics.failures.length > 20) console.log(`  … ${metrics.failures.length - 20} more failures in metrics.json`);
  process.exitCode = exitCode;
}

main().catch((error) => {
  console.error('Fatal verification harness error:', error);
  process.exitCode = 1;
});
