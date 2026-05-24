import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const execFileAsync = promisify(execFile);
const MAX_LIMIT = 10;
const MAX_PAGES = 3;
const MAX_START_PAGE = 8;
const SCRIPT_TIMEOUT_MS = 30000;
const SCRIPT_DELAY_MS = 500;
const EXEC_TIMEOUT_BASE_MS = 45000;
const EXEC_TIMEOUT_PER_TRACK_MS = 15000;
const EXEC_TIMEOUT_PER_PAGE_MS = 5000;
const EXEC_TIMEOUT_MAX_MS = 120000;
const MANIFEST_PATH = path.join(process.cwd(), 'public', 'music', 'pixabay-ai', 'vibefx-pixabay-ai-manifest.json');

const normalizeText = (value = '', fallback = 'ai-generated', max = 80) => {
    const text = String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
    return text || fallback;
};

const normalizeNumber = (value, fallback, min, max) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, Math.round(number)));
};

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Payload JSON invalide.' }, { status: 400 });
    }

    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_LOCAL_PIXABAY_IMPORT !== 'true') {
        return NextResponse.json({
            error: 'Import local Pixabay desactive en production.',
        }, { status: 403 });
    }

    const query = normalizeText(body.query || body.category || 'ai-generated');
    const category = normalizeText(body.category || query, query, 40);
    const limit = normalizeNumber(body.limit, 2, 1, MAX_LIMIT);
    const pages = normalizeNumber(body.pages, limit > 4 ? 2 : 1, 1, MAX_PAGES);
    const startPageInput = body.startPage || body.pageStart;
    const startPage = startPageInput ? normalizeNumber(startPageInput, 1, 1, MAX_START_PAGE) : 1;
    const execTimeout = Math.min(
        EXEC_TIMEOUT_MAX_MS,
        EXEC_TIMEOUT_BASE_MS + limit * EXEC_TIMEOUT_PER_TRACK_MS + pages * EXEC_TIMEOUT_PER_PAGE_MS,
    );

    const args = [
        path.join('scripts', 'import-pixabay-ai-music.mjs'),
        '--query',
        query,
        '--limit',
        String(limit),
        '--pages',
        String(pages),
        '--start-page',
        String(startPage),
        '--timeout-ms',
        String(SCRIPT_TIMEOUT_MS),
        '--delay-ms',
        String(SCRIPT_DELAY_MS),
    ];

    try {
        const { stdout, stderr } = await execFileAsync(process.execPath, args, {
            cwd: process.cwd(),
            timeout: execTimeout,
            windowsHide: true,
            maxBuffer: 1024 * 1024,
        });
        const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
        const tracks = Array.isArray(manifest.tracks) ? manifest.tracks.map((track) => ({
            ...track,
            category: category === 'ai-generated' ? 'AI generated' : category,
            tags: Array.from(new Set([
                ...(Array.isArray(track.tags) ? track.tags : []),
                'pixabay',
                category,
                query,
            ].filter(Boolean))),
        })) : [];

        return NextResponse.json({
            provider: 'pixabay',
            query,
            category,
            limit,
            pages,
            startPage,
            status: tracks.length ? 'ready' : 'empty',
            stats: manifest.stats || {
                found: tracks.length,
                imported: tracks.filter((track) => track.importStatus === 'importable').length,
                errors: 0,
            },
            tracks,
            log: stdout.split('\n').map((line) => line.trim()).filter(Boolean).slice(-12),
            warnings: manifest.warnings || [],
            stderr: stderr ? stderr.split('\n').map((line) => line.trim()).filter(Boolean).slice(-6) : [],
        });
    } catch (error) {
        const errorMessage = String(error?.message || '');
        const timedOut = error?.killed
            || error?.signal === 'SIGTERM'
            || /timeout|timed out|ETIMEDOUT/i.test(errorMessage);
        return NextResponse.json({
            provider: 'pixabay',
            query,
            category,
            status: 'error',
            error: timedOut
                ? 'Pixabay met trop longtemps a repondre pour ce theme. Relance ou choisis un autre tag.'
                : error.message || 'Import Pixabay impossible.',
            stdout: error.stdout ? String(error.stdout).split('\n').slice(-12) : [],
            stderr: error.stderr ? String(error.stderr).split('\n').slice(-12) : [],
        }, { status: timedOut ? 504 : 502 });
    }
}
