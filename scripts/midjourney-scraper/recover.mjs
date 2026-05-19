// recover.mjs
import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function recover() {
    const catalogFile = path.join(__dirname, 'catalog.json');
    let catalog = [];
    try {
        catalog = JSON.parse(await fs.readFile(catalogFile, 'utf-8'));
    } catch (e) { return; }

    const missingDocs = [];

    // Find all missing files by checking their folder
    for (const item of catalog) {
        let folderName = '';
        if (item.themes.length > 0) {
            for (const [name, cfg] of Object.entries(CONFIG.themes)) {
                if (name === item.themes[0]) {
                    folderName = cfg.folder; break;
                }
            }
        }
        if (!folderName) continue;

        const ext = item.highResUrl.endsWith('.jpeg') ? '.jpeg' : '.webp';
        const file = path.join(__dirname, 'downloads', folderName, `${item.jobId}${ext}`);

        try {
            await fs.access(file);
        } catch (e) {
            missingDocs.push({ item, file, folderName });
        }
    }

    console.log(`Found ${missingDocs.length} missing images in the catalog. Recovering...`);
    if (missingDocs.length === 0) return;

    const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });
    const context = await browser.newContext({ viewport: CONFIG.viewport, userAgent: CONFIG.userAgent });
    const page = await context.newPage();

    // Authenticate/pass cloudflare
    console.log("Navigating to MJ to bypass Cloudflare...");
    await page.goto('https://www.midjourney.com/explore', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    for (let i = 0; i < missingDocs.length; i++) {
        const doc = missingDocs[i];
        console.log(`[${i + 1}/${missingDocs.length}] Recovering ${doc.item.jobId}...`);

        try {
            await fs.mkdir(path.dirname(doc.file), { recursive: true });

            const url = doc.item.highResUrl.replace('.jpeg', '.webp');

            const buffer = await page.evaluate(async (u) => {
                const resp = await fetch(u);
                if (!resp.ok) throw new Error("HTTP " + resp.status);
                const blob = await resp.blob();
                const ab = await blob.arrayBuffer();
                const bytes = new Uint8Array(ab);
                let bin = '';
                for (let j = 0; j < bytes.length; j += 8192) {
                    const slice = bytes.subarray(j, j + 8192);
                    for (let k = 0; k < slice.length; k++) bin += String.fromCharCode(slice[k]);
                }
                return btoa(bin);
            }, url);

            await fs.writeFile(doc.file.replace('.jpeg', '.webp'), Buffer.from(buffer, 'base64'));
            console.log(` -> Saved to ${doc.folderName}`);
            await page.waitForTimeout(1000);
        } catch (e) {
            console.log(` -> Failed: ${e.message}`);
        }
    }

    await browser.close();
    console.log("Recovery complete.");
}
recover();
