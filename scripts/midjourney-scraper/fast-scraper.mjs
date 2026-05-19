#!/usr/bin/env node
// ============================================================
//  ⚡ MIDJOURNEY FAST SCRAPER
// ============================================================
//  Downloads all visible images from Midjourney Explore.
//  Uses the browser context for downloads (bypasses CDN blocks).
//
//  Usage:
//    node fast-scraper.mjs --max 200 --name my-collection
//    node fast-scraper.mjs --tab video_top --max 100
// ============================================================

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── CLI args ───────────────────────────────────────────────
const args = process.argv.slice(2);
let maxImages = CONFIG.maxImages;
let maxScrolls = CONFIG.maxScrolls;
let tab = CONFIG.tab;
let outputName = 'bulk';
let resolution = CONFIG.resolution;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--max') maxImages = parseInt(args[++i], 10);
    if (args[i] === '--scrolls') maxScrolls = parseInt(args[++i], 10);
    if (args[i] === '--tab') tab = args[++i];
    if (args[i] === '--name') outputName = args[++i];
    if (args[i] === '--resolution') resolution = args[++i];
    if (args[i] === '--help') {
        console.log(`
⚡ MIDJOURNEY FAST SCRAPER

  --max <n>          Max images to collect (default: ${CONFIG.maxImages})
  --scrolls <n>      Max scroll iterations (default: ${CONFIG.maxScrolls})
  --tab <name>       Tab: top, video_top, new (default: ${CONFIG.tab})
  --name <folder>    Output folder name (default: bulk)
  --resolution <r>   high (jpeg 2048px) or medium (webp 640px)
`);
        process.exit(0);
    }
}

// ── Main ───────────────────────────────────────────────────
async function main() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║          ⚡ MIDJOURNEY FAST SCRAPER                           ║
╚══════════════════════════════════════════════════════════════╝
`);
    console.log(`  📑 Tab: ${tab}`);
    console.log(`  📊 Max: ${maxImages} images`);
    console.log(`  🖼️  Resolution: ${resolution}`);
    console.log(`  📁 Output: downloads/${outputName}/\n`);

    const outputDir = path.resolve(__dirname, 'downloads', outputName);
    await fs.mkdir(outputDir, { recursive: true });

    // Launch browser
    console.log('🚀 Launching browser...');
    const browser = await chromium.launch({
        headless: CONFIG.headless,
        args: ['--disable-blink-features=AutomationControlled'],
    });

    const context = await browser.newContext({
        viewport: CONFIG.viewport,
        userAgent: CONFIG.userAgent,
        locale: 'en-US',
    });

    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const page = await context.newPage();

    // Navigate
    const url = `${CONFIG.baseUrl}?tab=${tab}`;
    console.log(`🌐 Loading ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    console.log(`✅ Page loaded\n`);

    // ── Phase 1: Scroll & collect image IDs ──────────────────
    console.log('📜 Phase 1: Scrolling to collect images...\n');
    const jobIds = new Set();
    let staleCount = 0;

    for (let i = 0; i < maxScrolls; i++) {
        const links = await page.evaluate(() => {
            const anchors = document.querySelectorAll('a[href*="/jobs/"]');
            return Array.from(anchors).map(a => {
                const match = a.getAttribute('href')?.match(/\/jobs\/([a-f0-9-]+)/);
                return match ? match[1] : null;
            }).filter(Boolean);
        });

        const prevSize = jobIds.size;
        links.forEach(id => jobIds.add(id));

        const pct = Math.min(Math.round((jobIds.size / maxImages) * 100), 100);
        process.stdout.write(`\r  📜 Scrolling... ${jobIds.size} images found (${pct}%)`);

        if (jobIds.size >= maxImages) break;

        if (jobIds.size === prevSize) {
            staleCount++;
            if (staleCount > 5) {
                console.log('\n  ⚠️  No new images, stopping scroll');
                break;
            }
        } else {
            staleCount = 0;
        }

        await page.evaluate(() => {
            const el = document.querySelector('#pageScroll') || document.documentElement;
            el.scrollBy({ top: 1200, behavior: 'smooth' });
        });
        await page.waitForTimeout(CONFIG.scrollDelay);
    }

    console.log(`\n\n  📦 Collected ${jobIds.size} unique image IDs\n`);

    // ── Phase 2: Download via browser context ────────────────
    console.log('⬇️  Phase 2: Downloading images via browser...\n');

    const ids = Array.from(jobIds);
    let downloaded = 0;
    let skipped = 0;
    let errors = 0;
    const batchSize = 5; // Concurrent downloads

    for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);

        await Promise.all(batch.map(async (jobId) => {
            const ext = resolution === 'high' ? 'jpeg' : 'webp';
            const filepath = path.join(outputDir, `${jobId}.${ext}`);

            // Skip if exists
            try {
                await fs.access(filepath);
                skipped++;
                return;
            } catch { }

            try {
                // Use the BROWSER to download the image (bypasses CDN blocks)
                const imageUrl = resolution === 'high'
                    ? `https://cdn.midjourney.com/${jobId}/0_0.jpeg`
                    : `https://cdn.midjourney.com/${jobId}/0_0_640_N.webp`;

                const buffer = await page.evaluate(async (url) => {
                    const resp = await fetch(url);
                    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                    const blob = await resp.blob();
                    const arrayBuffer = await blob.arrayBuffer();
                    // Convert to base64 to transfer out of browser
                    const bytes = new Uint8Array(arrayBuffer);
                    let binary = '';
                    for (let i = 0; i < bytes.length; i++) {
                        binary += String.fromCharCode(bytes[i]);
                    }
                    return btoa(binary);
                }, imageUrl);

                // Decode base64 and save
                await fs.writeFile(filepath, Buffer.from(buffer, 'base64'));
                downloaded++;
            } catch (err) {
                errors++;
            }
        }));

        const total = downloaded + skipped + errors;
        const pct = Math.round((total / ids.length) * 100);
        process.stdout.write(`\r  ⬇️  Progress: ${pct}% | ✅ ${downloaded} downloaded | ⏭️ ${skipped} skipped | ❌ ${errors} errors`);
    }

    // Save manifest
    const manifest = {
        scrapedAt: new Date().toISOString(),
        tab,
        totalImages: ids.length,
        downloaded,
        skipped,
        errors,
        jobIds: ids,
    };
    await fs.writeFile(
        path.join(outputDir, '_manifest.json'),
        JSON.stringify(manifest, null, 2)
    );

    await browser.close();

    console.log(`\n
╔══════════════════════════════════════════════════════════════╗
║                    ✅ DOWNLOAD COMPLETE                      ║
╠══════════════════════════════════════════════════════════════╣
║  📥 Downloaded:  ${String(downloaded).padEnd(42)}║
║  ⏭️  Skipped:     ${String(skipped).padEnd(42)}║
║  ❌ Errors:      ${String(errors).padEnd(42)}║
║  📁 Output:      downloads/${outputName.padEnd(31)}║
╚══════════════════════════════════════════════════════════════╝
`);
}

main().catch(err => {
    console.error(`\n❌ Fatal: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
});
