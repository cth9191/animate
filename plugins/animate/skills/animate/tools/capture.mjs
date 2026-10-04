#!/usr/bin/env node
// Capture the user's own product into <piece>/assets/ for a product reel: a page, a part of it, or the logo.
//   usage: node tools/capture.mjs <url> <out.png> [--width 1280] [--height 800] [--scale 2] [--selector "css"]
//                                 [--full] [--wait 1500] [--dark] [--hide "css, css"]
//   --selector  just that element (a hero section, a pricing card, the logo: e.g. "header img")
//   --full      the whole scrolling page      --dark  prefers-color-scheme: dark
//   --hide      elements to hide first (cookie banners, chat bubbles)
// Only for sites the user owns or has the right to show; ask before capturing anything else.
// tools/build.mjs embeds everything in <piece>/assets/ into index.html; draw it with drawAsset(name, x, y, w, h).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = (() => { try { return require('playwright'); } catch { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } })();
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const flag = (k) => { const i = args.indexOf(k); return i >= 0 ? (args.splice(i, 1), true) : false; };
const width = Number(opt('--width', 1280)), height = Number(opt('--height', 800)), scale = Number(opt('--scale', 2));
const selector = opt('--selector', null), wait = Number(opt('--wait', 1500)), hide = opt('--hide', null), full = flag('--full'), dark = flag('--dark');
const [url, out] = args;
if (!url || !out) { console.error('usage: node tools/capture.mjs <url> <out.png> [--width 1280] [--height 800] [--scale 2] [--selector css] [--full] [--wait 1500] [--dark] [--hide css]'); process.exit(2); }
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale, colorScheme: dark ? 'dark' : 'light' });
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => page.goto(url, { waitUntil: 'load', timeout: 60000 }));
await page.waitForTimeout(wait);
if (hide) await page.addStyleTag({ content: `${hide} { visibility: hidden !important; }` });
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
if (selector) {
  const el = page.locator(selector).first();
  await el.screenshot({ path: out, omitBackground: true });
} else await page.screenshot({ path: out, fullPage: full });
const kb = (fs.statSync(out).size / 1024).toFixed(0);
console.log(`captured ${url}${selector ? ` [${selector}]` : ''} -> ${out} (${kb} KB, ${width}x${height} @${scale}x)`);
await browser.close();
