import dbPkg from 'better-sqlite3';
import { CONFIG } from './config.mjs';

function stripMjParamsServer(text) {
    return text.replace(/\s--\w+(\s+\S+)?/g, '').replace(/\s*--\w+/g, '').replace(/\s+/g, ' ').trim();
}

function keywordMatchServer(text, keyword) {
    const kwLower = keyword.toLowerCase();
    if (kwLower.includes(' ')) { return text.includes(kwLower); }
    else {
        const escaped = kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?:^|[\\s,;:.!?()\\[\\]/"'-])${escaped}(?:$|[\\s,;:.!?()\\[\\]/"'-])`, 'i');
        return regex.test(text);
    }
}

function extractSubjectServer(text) {
    const clean = stripMjParamsServer(text);
    for (let i = 15; i < clean.length; i++) {
        if (clean[i] === '.' && i < clean.length - 1) { return clean.substring(0, i + 1); }
    }
    const separators = [', with', ', in ', ', on ', ', at ', '. ', ', under', ', using'];
    for (const sep of separators) {
        const idx = clean.indexOf(sep, 20);
        if (idx > 20 && idx < clean.length * 0.6) { return clean.substring(0, idx); }
    }
    return clean.substring(0, Math.max(Math.floor(clean.length * 0.30), 60));
}

function classifyPromptServer(prompt, themes) {
    if (!prompt || prompt === 'Image' || prompt.length < 5) return [];
    const clean = stripMjParamsServer(prompt.toLowerCase());
    const subject = extractSubjectServer(prompt.toLowerCase());
    const rest = clean.substring(subject.length);
    const scores = [];

    for (const [name, cfg] of Object.entries(themes)) {
        let subjectHits = 0, contextHits = 0, exclusionPenalty = 0;
        const matchedKw = { subject: [], rest: [], exclude: [] };

        for (const kw of cfg.keywords) {
            if (keywordMatchServer(subject, kw)) { subjectHits++; matchedKw.subject.push(kw); }
            else if (keywordMatchServer(rest, kw)) { contextHits++; matchedKw.rest.push(kw); }
        }

        if (cfg.exclude && Array.isArray(cfg.exclude)) {
            for (const exKw of cfg.exclude) {
                if (keywordMatchServer(subject, exKw)) { exclusionPenalty++; matchedKw.exclude.push(exKw); }
                if (keywordMatchServer(rest, exKw)) { exclusionPenalty += 0.3; matchedKw.exclude.push(exKw); }
            }
        }

        if (subjectHits >= (cfg.minScore || 1) || (contextHits >= 3)) {
            const s = (subjectHits * 3) + contextHits - (exclusionPenalty * 5);
            if (s > 0) {
                scores.push({ name, score: s, priority: cfg.priority || 'style', hasSubject: subjectHits > 0, matchedKw });
            }
        }
    }
    scores.sort((a, b) => {
        if (a.priority === 'subject' && b.priority !== 'subject') return -1;
        if (a.priority !== 'subject' && b.priority === 'subject') return 1;
        return b.score - a.score;
    });

    const result = [];
    let hasSubject = false, hasStyle = false;
    for (const s of scores) {
        if (result.length >= 2) break;
        if (s.priority === 'subject') {
            if (!hasSubject || result.length < 2) { result.push(s.name); hasSubject = true; }
        } else {
            if (!hasStyle || (!hasSubject && result.length < 2)) { result.push(s.name); hasStyle = true; }
        }
    }
    if (result.length < 2) {
        for (const s of scores) {
            if (result.length >= 2) break;
            if (!result.includes(s.name)) result.push(s.name);
        }
    }
    return { subject, scores, result, cleanPrompt: clean };
}

// ---- CLI RUNNER ---- //

const arg = process.argv[2];

if (!arg) {
    console.log("==========================================");
    console.log("🧠 UNIVERSAL PROMPT CLASSIFIER TESTER v1");
    console.log("==========================================\n");
    console.log("Usage 1: node test_classifier.mjs \"<your prompt string here>\"");
    console.log("Usage 2: node test_classifier.mjs <job_id>");
    console.log("Usage 3: node test_classifier.mjs --random\n");
    process.exit(1);
}

let testPrompt = "";
let sourceDb = false;

if (arg === "--random") {
    try {
        const db = new dbPkg('./data/catalog.db');
        const row = db.prepare("SELECT prompt FROM images ORDER BY RANDOM() LIMIT 1").get();
        if (row) testPrompt = row.prompt;
        sourceDb = true;
    } catch (e) {
        console.error("Failed to read random DB image:", e.message);
    }
} else if (/^[a-f0-9-]{36}$/i.test(arg)) { // Looks like a UUID
    try {
        const db = new dbPkg('./data/catalog.db');
        const row = db.prepare("SELECT prompt FROM images WHERE job_id = ?").get(arg);
        if (row) {
            testPrompt = row.prompt;
            sourceDb = true;
        } else {
            console.log("Job ID not found in database.");
            process.exit(1);
        }
    } catch (e) {
        console.error("Failed to read DB image:", e.message);
    }
} else {
    testPrompt = arg;
}

if (!testPrompt) {
    console.log("No prompt to test.");
    process.exit(1);
}

console.log("\n🧪 TESTING PROMPT:");
console.log(`"${testPrompt}"\n`);

const res = classifyPromptServer(testPrompt, CONFIG.themes);

console.log("🔍 EXTRACTED SUBJECT:");
console.log(`"${res.subject}"\n`);

console.log("📊 THEME SCORES:");
res.scores.forEach(s => {
    let kwLogs = [];
    if (s.matchedKw.subject.length) kwLogs.push(`Subj: [${s.matchedKw.subject.join(', ')}]`);
    if (s.matchedKw.rest.length) kwLogs.push(`Ctx: [${s.matchedKw.rest.join(', ')}]`);
    if (s.matchedKw.exclude?.length) kwLogs.push(`Excl: [${s.matchedKw.exclude.join(', ')}]`);

    console.log(` - [${s.score >= 3 ? '✅' : '⚠️'}] ${s.name.toUpperCase()} (Score: ${s.score}, Priority: ${s.priority}) -> ${kwLogs.join(' | ')}`);
});

if (res.scores.length === 0) {
    console.log(" - (No categories hit minimum score)");
}

console.log("\n🏆 FINAL DECISION (Top 2 max, 1 Subject + 1 Style ideally):");
console.log(JSON.stringify(res.result, null, 2));
console.log("\n==========================================");
