// ============================================================
//  📦 DATABASE MODULE — SQLite adapter for catalog
// ============================================================
//  Replaces catalog.json with a proper SQLite database.
//  Provides paginated queries, theme counting, and full-text search.
//  Backwards-compatible: auto-imports existing catalog.json on first run.
// ============================================================

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'data', 'catalog.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// ── Enable WAL mode for better concurrent read/write ─────────
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// ── Schema ───────────────────────────────────────────────────
db.exec(`
    CREATE TABLE IF NOT EXISTS images (
        job_id TEXT PRIMARY KEY,
        prompt TEXT NOT NULL DEFAULT '',
        high_res_url TEXT NOT NULL DEFAULT '',
        detail_url TEXT NOT NULL DEFAULT '',
        scraped_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS image_themes (
        job_id TEXT NOT NULL,
        theme TEXT NOT NULL,
        PRIMARY KEY (job_id, theme),
        FOREIGN KEY (job_id) REFERENCES images(job_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_image_themes_theme ON image_themes(theme);
    CREATE INDEX IF NOT EXISTS idx_images_scraped_at ON images(scraped_at);
`);

// ── Prepared Statements ──────────────────────────────────────
const stmtInsertImage = db.prepare(`
    INSERT OR IGNORE INTO images (job_id, prompt, high_res_url, detail_url, scraped_at)
    VALUES (@jobId, @prompt, @highResUrl, @detailUrl, @scrapedAt)
`);

const stmtInsertTheme = db.prepare(`
    INSERT OR IGNORE INTO image_themes (job_id, theme) VALUES (@jobId, @theme)
`);

const stmtDeleteImage = db.prepare(`DELETE FROM images WHERE job_id = ?`);
const stmtDeleteImageThemes = db.prepare(`DELETE FROM image_themes WHERE job_id = ?`);

const stmtCountAll = db.prepare(`SELECT COUNT(*) as count FROM images`);
const stmtCountByTheme = db.prepare(`
    SELECT COUNT(*) as count FROM image_themes WHERE theme = ?
`);

const stmtGetImageThemes = db.prepare(`
    SELECT theme FROM image_themes WHERE job_id = ?
`);

const stmtGetImage = db.prepare(`SELECT * FROM images WHERE job_id = ?`);

// ── Public API ───────────────────────────────────────────────

/**
 * Insert a new image into the database (with themes).
 * Skips duplicates silently (INSERT OR IGNORE).
 */
export function insertImage({ jobId, prompt, themes, highResUrl, detailUrl, scrapedAt }) {
    const insertTransaction = db.transaction(() => {
        stmtInsertImage.run({
            jobId,
            prompt: prompt || '',
            highResUrl: highResUrl || '',
            detailUrl: detailUrl || '',
            scrapedAt: scrapedAt || new Date().toISOString()
        });
        for (const theme of (themes || [])) {
            stmtInsertTheme.run({ jobId, theme });
        }
    });
    insertTransaction();
}

/**
 * Bulk insert array of catalog entries (for migration).
 */
export function bulkInsert(entries) {
    const bulkTransaction = db.transaction(() => {
        for (const entry of entries) {
            insertImage(entry);
        }
    });
    bulkTransaction();
}

/**
 * Delete an image and its theme associations.
 * Returns the deleted image's themes for file cleanup.
 */
export function deleteImage(jobId) {
    const themes = stmtGetImageThemes.all(jobId).map(r => r.theme);
    const deleteTransaction = db.transaction(() => {
        stmtDeleteImageThemes.run(jobId);
        stmtDeleteImage.run(jobId);
    });
    deleteTransaction();
    return themes;
}

/**
 * Reset the entire database (clear all images and themes).
 */
export function resetAll() {
    db.exec(`DELETE FROM image_themes; DELETE FROM images;`);
}

/**
 * Get total image count.
 */
export function getTotalCount() {
    return stmtCountAll.get().count;
}

/**
 * Get image count for a specific theme.
 */
export function getThemeCount(theme) {
    return stmtCountByTheme.get(theme).count;
}

/**
 * Get all theme counts at once (efficient for the /api/themes endpoint).
 */
export function getAllThemeCounts() {
    const rows = db.prepare(`
        SELECT theme, COUNT(*) as count FROM image_themes GROUP BY theme
    `).all();
    const counts = {};
    for (const row of rows) {
        counts[row.theme] = row.count;
    }
    return counts;
}

/**
 * Get paginated catalog entries, newest first.
 * @param {Object} options
 * @param {string} [options.theme] - Filter by theme (optional)
 * @param {number} [options.page=1] - Page number (1-indexed)
 * @param {number} [options.limit=50] - Items per page
 * @param {string} [options.search] - Search prompt text (optional)
 * @returns {{ items: Array, total: number, page: number, totalPages: number }}
 */
export function getCatalog({ theme, page = 1, limit = 50, search } = {}) {
    let countQuery = '';
    let dataQuery = '';
    const params = {};

    if (theme) {
        // Filter by theme
        const baseJoin = `FROM images i JOIN image_themes it ON i.job_id = it.job_id WHERE it.theme = @theme`;
        const searchClause = search ? ` AND i.prompt LIKE @search` : '';
        countQuery = `SELECT COUNT(DISTINCT i.job_id) as count ${baseJoin}${searchClause}`;
        dataQuery = `SELECT DISTINCT i.* ${baseJoin}${searchClause} ORDER BY i.scraped_at DESC LIMIT @limit OFFSET @offset`;
        params.theme = theme;
    } else {
        const baseFrom = `FROM images i`;
        const searchClause = search ? ` WHERE i.prompt LIKE @search` : '';
        countQuery = `SELECT COUNT(*) as count ${baseFrom}${searchClause}`;
        dataQuery = `SELECT * ${baseFrom}${searchClause} ORDER BY i.scraped_at DESC LIMIT @limit OFFSET @offset`;
    }

    if (search) {
        params.search = `%${search}%`;
    }

    const total = db.prepare(countQuery).get(params).count;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    const images = db.prepare(dataQuery).all({ ...params, limit, offset });

    // Attach themes to each image
    const result = images.map(img => {
        const themes = stmtGetImageThemes.all(img.job_id).map(r => r.theme);
        return {
            jobId: img.job_id,
            prompt: img.prompt,
            themes,
            highResUrl: img.high_res_url,
            detailUrl: img.detail_url,
            scrapedAt: img.scraped_at
        };
    });

    return { items: result, total, page, totalPages };
}

/**
 * Get ALL catalog entries (for backwards compat / full export).
 * Use with caution for large datasets.
 */
export function getAllCatalog() {
    const images = db.prepare(`SELECT * FROM images ORDER BY scraped_at DESC`).all();
    return images.map(img => {
        const themes = stmtGetImageThemes.all(img.job_id).map(r => r.theme);
        return {
            jobId: img.job_id,
            prompt: img.prompt,
            themes,
            highResUrl: img.high_res_url,
            detailUrl: img.detail_url,
            scrapedAt: img.scraped_at
        };
    });
}

/**
 * Migrate existing catalog.json into SQLite.
 * Only runs if the database is empty.
 */
export function migrateFromJson() {
    const count = getTotalCount();
    if (count > 0) {
        console.log(`[DB] Database already has ${count} images, skipping migration.`);
        return false;
    }

    const catalogPath = path.join(__dirname, 'catalog.json');
    if (!fs.existsSync(catalogPath)) {
        console.log('[DB] No catalog.json found, starting fresh.');
        return false;
    }

    try {
        const data = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
        if (!Array.isArray(data) || data.length === 0) {
            console.log('[DB] catalog.json is empty, nothing to migrate.');
            return false;
        }

        console.log(`[DB] Migrating ${data.length} entries from catalog.json → SQLite...`);
        bulkInsert(data);
        console.log(`[DB] ✅ Migration complete. ${getTotalCount()} images in database.`);
        return true;
    } catch (e) {
        console.error('[DB] Migration failed:', e.message);
        return false;
    }
}

/**
 * Update themes for a single image (used during reclassification).
 * Removes old themes and inserts new ones.
 */
export function updateImageThemes(jobId, newThemes) {
    const updateTransaction = db.transaction(() => {
        stmtDeleteImageThemes.run(jobId);
        for (const theme of newThemes) {
            stmtInsertTheme.run({ jobId, theme });
        }
    });
    updateTransaction();
}

/**
 * Get all images with their prompts (lightweight, for reclassification).
 * Returns only jobId, prompt, and current themes.
 */
export function getAllImagesForReclassify() {
    const images = db.prepare(`SELECT job_id, prompt FROM images ORDER BY scraped_at DESC`).all();
    return images.map(img => {
        const themes = stmtGetImageThemes.all(img.job_id).map(r => r.theme);
        return {
            jobId: img.job_id,
            prompt: img.prompt,
            oldThemes: themes,
        };
    });
}

/**
 * Close the database connection gracefully.
 */
export function closeDb() {
    db.close();
}

// Auto-migrate on first import
migrateFromJson();

export default db;
