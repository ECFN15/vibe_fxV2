import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { Storage } from '@google-cloud/storage';

const PORT = Number(process.env.PORT || 8080);
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const storage = new Storage();

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      return sendJson(res, 200, { ok: true, service: 'vibecut-render-service' });
    }

    if (req.method === 'POST' && req.url === '/render') {
      const { raw, data } = await readJsonBody(req);
      verifySignature(req, raw);
      const manifest = data.manifest || data;
      const validation = validateManifest(manifest);
      if (validation.errors.length) {
        return sendJson(res, 400, { status: 'failed', errors: validation.errors });
      }
      if (!data.bucket || !data.outputStoragePath) {
        return sendJson(res, 400, { status: 'failed', errors: ['bucket and outputStoragePath are required.'] });
      }

      const result = await renderJob({
        jobId: data.jobId || manifest.project?.id || `job-${Date.now()}`,
        bucketName: data.bucket,
        outputStoragePath: data.outputStoragePath,
        manifest,
      });

      return sendJson(res, 200, {
        status: 'ready',
        mode: 'cloud-run-ffmpeg',
        jobId: data.jobId || manifest.project?.id || null,
        warnings: [...validation.warnings, ...result.warnings],
        output: result.output,
        elapsedMs: result.elapsedMs,
      });
    }

    return sendJson(res, 404, { error: 'not-found' });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      status: 'failed',
      error: error.code || 'render-service-error',
      message: error.message || 'Unexpected renderer error',
    });
  }
});

server.listen(PORT, () => {
  console.log(`VibeCut render service listening on ${PORT}`);
});

function verifySignature(req, rawBody) {
  const secret = String(process.env.EXPORT_SIGNING_SECRET || '').trim();
  if (!secret) {
    const error = new Error('EXPORT_SIGNING_SECRET is required.');
    error.statusCode = 500;
    throw error;
  }
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const received = String(req.headers['x-vibecut-signature'] || '').trim();
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');
  if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
    const error = new Error('Invalid renderer signature.');
    error.statusCode = 401;
    throw error;
  }
}

function validateManifest(manifest = {}) {
  const errors = [];
  const warnings = [];
  if (manifest.version !== 1) errors.push('Unsupported manifest version.');
  if (!Array.isArray(manifest.clips) || manifest.clips.length === 0) errors.push('Manifest must contain at least one clip.');
  if (manifest.render?.format !== 'mp4') errors.push('Render format must be mp4.');
  if (manifest.render?.videoCodec !== 'h264') errors.push('Video codec must be h264.');
  if (manifest.render?.audioCodec !== 'aac') warnings.push('Audio codec should be aac.');
  if (!manifest.clips?.every((clip) => clip.sourceStoragePath)) {
    errors.push('Every clip needs a sourceStoragePath for Cloud Run rendering.');
  }
  if ((manifest.transitions || []).length) warnings.push('Transitions are declared but not rendered by the FFmpeg MVP yet.');
  if ((manifest.textOverlays || []).length) warnings.push('Text overlays are declared but not rendered by the FFmpeg MVP yet.');
  if ((manifest.clips || []).some((clip) => Number(clip.speed || 1) !== 1)) {
    warnings.push('Clip speed changes are declared but not rendered by the FFmpeg MVP yet.');
  }
  if ((manifest.clips || []).some((clip) => clip.filters && Object.values(clip.filters).some((value) => Number(value) !== 0 && Number(value) !== 100))) {
    warnings.push('Color filters are declared but not rendered by the FFmpeg MVP yet.');
  }
  return { errors, warnings };
}

async function renderJob({ jobId, bucketName, outputStoragePath, manifest }) {
  const startedAt = Date.now();
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `vibecut-${sanitizeName(jobId)}-`));
  const bucket = storage.bucket(bucketName);

  try {
    const videoInputs = [];
    for (const [index, clip] of manifest.clips.entries()) {
      const destination = path.join(workDir, `clip-${String(index + 1).padStart(2, '0')}${path.extname(clip.sourceStoragePath) || '.mp4'}`);
      await bucket.file(clip.sourceStoragePath).download({ destination });
      videoInputs.push({ clip, file: destination });
    }

    const audioInputs = [];
    for (const [index, track] of (manifest.audioTracks || []).entries()) {
      if (!track.sourceStoragePath) continue;
      const destination = path.join(workDir, `audio-${String(index + 1).padStart(2, '0')}${path.extname(track.sourceStoragePath) || '.m4a'}`);
      await bucket.file(track.sourceStoragePath).download({ destination });
      audioInputs.push({ track, file: destination });
      break;
    }

    const outputFile = path.join(workDir, 'output.mp4');
    const warnings = [];
    const args = buildFfmpegArgs({ manifest, videoInputs, audioInputs, outputFile, warnings });
    await runCommand('ffmpeg', args);
    const stat = await fs.stat(outputFile);
    await bucket.upload(outputFile, {
      destination: outputStoragePath,
      metadata: {
        contentType: 'video/mp4',
        metadata: {
          product: 'vibecut',
          role: 'export-output',
          jobId,
        },
      },
    });

    return {
      elapsedMs: Date.now() - startedAt,
      warnings,
      output: {
        storagePath: outputStoragePath,
        sizeBytes: stat.size,
        downloadUrl: null,
      },
    };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

function buildFfmpegArgs({ manifest, videoInputs, audioInputs, outputFile, warnings }) {
  const render = manifest.render || {};
  const width = clampInt(render.width, 1, 4096, 1920);
  const height = clampInt(render.height, 1, 4096, 1080);
  const fps = clampInt(render.fps, 1, 60, 30);
  const crf = clampInt(render.crf, 12, 28, 17);
  const preset = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'].includes(render.preset)
    ? render.preset
    : 'slow';
  const audioBitrate = Math.round(Number(render.audioBitrate || 256000) / 1000);
  const args = ['-hide_banner', '-y'];

  videoInputs.forEach(({ clip, file }) => {
    const trimStart = Math.max(0, Number(clip.trimStart || 0));
    const trimEnd = Math.max(trimStart + 0.1, Number(clip.trimEnd || clip.duration || trimStart + 0.1));
    args.push('-ss', String(trimStart), '-t', String(trimEnd - trimStart), '-i', file);
  });
  audioInputs.forEach(({ file }) => args.push('-i', file));

  const filterParts = [];
  videoInputs.forEach((_, index) => {
    filterParts.push(`[${index}:v]fps=${fps},${fitFilter(render.fitMode, width, height)},format=yuv420p,setpts=PTS-STARTPTS[v${index}]`);
  });
  const videoLabel = videoInputs.length === 1 ? '[v0]' : '[vout]';
  if (videoInputs.length > 1) {
    filterParts.push(`${videoInputs.map((_, index) => `[v${index}]`).join('')}concat=n=${videoInputs.length}:v=1:a=0[vout]`);
  }

  args.push('-filter_complex', filterParts.join(';'));
  args.push('-map', videoLabel);
  if (audioInputs.length) {
    const audioIndex = videoInputs.length;
    args.push('-map', `${audioIndex}:a:0?`, '-shortest');
  } else {
    args.push('-an');
    warnings.push('No external audio track was rendered by the FFmpeg MVP.');
  }
  args.push(
    '-c:v', 'libx264',
    '-preset', preset,
    '-crf', String(crf),
    '-profile:v', 'high',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', `${audioBitrate}k`,
    '-movflags', '+faststart',
    outputFile
  );
  return args;
}

function fitFilter(fitMode, width, height) {
  if (fitMode === 'contain') {
    return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
  }
  return `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr = `${stderr}${chunk.toString('utf8')}`.slice(-6000);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) return resolve();
      const error = new Error(`FFmpeg failed with code ${code}: ${stderr}`);
      error.statusCode = 500;
      return reject(error);
    });
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > MAX_BODY_BYTES) {
        const error = new Error('Request body too large.');
        error.statusCode = 413;
        reject(error);
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve({ raw, data: raw ? JSON.parse(raw) : {} });
      } catch {
        const error = new Error('Invalid JSON body.');
        error.statusCode = 400;
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function clampInt(value, min, max, fallback) {
  const numeric = Math.round(Number(value));
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function sanitizeName(value) {
  return String(value || 'job').replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 80);
}
