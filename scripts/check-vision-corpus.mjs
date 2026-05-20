import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const corpusDir = path.join(process.cwd(), 'test-fixtures', 'vision-corpus');
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
const strict = process.env.VISION_CORPUS_REQUIRED === '1' || process.argv.includes('--strict');

const expectedCases = [
    {
        id: 'portrait-light',
        label: 'portrait peau claire',
        validates: 'skin tone, whites, soft contrast',
    },
    {
        id: 'portrait-medium-dark',
        label: 'portrait peau medium/foncee',
        validates: 'skin hue, shadow tint protection',
    },
    {
        id: 'selfie-interior',
        label: 'selfie interieur',
        validates: 'mixed light, skin, smartphone denoise',
    },
    {
        id: 'landscape-blue-sky',
        label: 'paysage ciel bleu',
        validates: 'cyan control, highlight purity',
    },
    {
        id: 'vegetation-green',
        label: 'vegetation verte',
        validates: 'green saturation ceiling',
    },
    {
        id: 'night-neon',
        label: 'nuit avec neons',
        validates: 'neon clipping, black detail',
    },
    {
        id: 'golden-hour',
        label: 'golden hour',
        validates: 'warm rolloff, orange/skin protection',
    },
    {
        id: 'tungsten-interior',
        label: 'interieur tungstene',
        validates: 'neutral protection, dirty whites',
    },
    {
        id: 'saturated-image',
        label: 'image deja tres saturee',
        validates: 'chroma rolloff, saturation ceiling',
    },
    {
        id: 'hazy-flat',
        label: 'image terne/brumeuse',
        validates: 'grey veil detector, useful contrast',
    },
    {
        id: 'low-light-noise',
        label: 'basse lumiere bruitee',
        validates: 'noise/grain separation, shadow purity',
    },
    {
        id: 'social-compressed',
        label: 'image reseau compressee',
        validates: 'compression artifacts, clipped colors',
    },
];

function findCaseFile(caseId) {
    for (const extension of allowedExtensions) {
        const candidate = path.join(corpusDir, `${caseId}${extension}`);
        if (fs.existsSync(candidate)) return candidate;
    }
    return null;
}

function formatPath(filePath) {
    return path.relative(process.cwd(), filePath).replaceAll(path.sep, '/');
}

if (!fs.existsSync(corpusDir)) {
    fs.mkdirSync(corpusDir, { recursive: true });
}

const present = [];
const missing = [];

for (const item of expectedCases) {
    const file = findCaseFile(item.id);
    if (file) {
        const stat = fs.statSync(file);
        present.push({ ...item, file, size: stat.size });
    } else {
        missing.push(item);
    }
}

console.log('Vision smartphone corpus check');
console.log(`Directory: ${formatPath(corpusDir)}`);
console.log(`Present: ${present.length}/${expectedCases.length}`);

if (present.length) {
    console.log('\nPresent files:');
    for (const item of present) {
        console.log(`- ${item.id}: ${formatPath(item.file)} (${Math.round(item.size / 1024)} KB)`);
    }
}

if (missing.length) {
    console.log('\nMissing cases:');
    for (const item of missing) {
        console.log(`- ${item.id}: ${item.label} -> ${item.validates}`);
    }
}

console.log('\nAccepted extensions:', allowedExtensions.join(', '));
console.log('HEIC should be converted locally to JPEG/PNG for reproducible browser tests.');

if (missing.length) {
    console.log('\nStatus: corpus validation is incomplete. Vision must not be declared final-stable from synthetic fixtures alone.');
    if (strict) {
        process.exitCode = 1;
    }
} else {
    console.log('\nStatus: corpus files are present. Next step: run perceptual review and metric calibration across profiles.');
}
