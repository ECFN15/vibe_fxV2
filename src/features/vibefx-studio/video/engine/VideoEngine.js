/**
 * VideoEngine — Moteur video natif navigateur
 * <video> element pour le decode + Canvas pour le rendu
 */

export function isWebCodecsSupported() {
    return typeof VideoDecoder !== 'undefined' && typeof VideoEncoder !== 'undefined';
}

export function loadVideoFile(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;

        video.onloadedmetadata = () => {
            resolve({
                file, url,
                name: file.name,
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
                type: file.type,
                size: file.size,
                videoElement: video,
            });
        };

        video.onerror = () => reject(new Error(`Impossible de charger: ${file.name}`));
        video.src = url;
    });
}

export async function extractThumbnails(videoUrl, duration, count = 8, thumbHeight = 60) {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';

    await new Promise((resolve, reject) => {
        video.onloadeddata = resolve;
        video.onerror = reject;
    });

    const aspect = video.videoWidth / video.videoHeight;
    const thumbWidth = Math.round(thumbHeight * aspect);

    const canvas = document.createElement('canvas');
    canvas.width = thumbWidth;
    canvas.height = thumbHeight;
    const ctx = canvas.getContext('2d');

    const thumbnails = [];
    const interval = duration / count;

    for (let i = 0; i < count; i++) {
        const time = i * interval + interval / 2;
        video.currentTime = Math.min(time, duration - 0.1);
        await new Promise((resolve) => { video.onseeked = resolve; });
        ctx.drawImage(video, 0, 0, thumbWidth, thumbHeight);
        thumbnails.push(canvas.toDataURL('image/jpeg', 0.6));
    }

    return thumbnails;
}

export async function extractFrame(videoUrl, time, width, height) {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';

    await new Promise((resolve, reject) => {
        video.onloadeddata = resolve;
        video.onerror = reject;
    });

    video.currentTime = time;
    await new Promise((resolve) => { video.onseeked = resolve; });

    const canvas = document.createElement('canvas');
    canvas.width = width || video.videoWidth;
    canvas.height = height || video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas;
}

export function createVideoPlayer(url) {
    const video = document.createElement('video');
    video.src = url;
    video.muted = false;
    video.preload = 'auto';
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    return video;
}

// === TRANSITION RENDERING ===

function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function clampMediaVolume(volume = 100) {
    return clamp((Number(volume) || 0) / 100, 0, 1);
}

function buildFilterString(filters = {}) {
    const brightness = clamp(filters.brightness ?? 100, 0, 200);
    const contrast = clamp(filters.contrast ?? 100, 0, 200);
    const saturation = clamp(filters.saturation ?? 100, 0, 200);
    return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
}

function applyPostFilters(ctx, filters = {}, w, h) {
    const temperature = clamp(filters.temperature ?? 0, -100, 100);
    if (temperature !== 0) {
        ctx.save();
        ctx.globalCompositeOperation = temperature > 0 ? 'soft-light' : 'screen';
        ctx.globalAlpha = Math.min(0.28, Math.abs(temperature) / 260);
        ctx.fillStyle = temperature > 0 ? '#ffb36b' : '#5ea8ff';
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    const vignette = clamp(filters.vignette ?? 0, 0, 100);
    if (vignette > 0) {
        ctx.save();
        const gradient = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.22, w / 2, h / 2, Math.max(w, h) * 0.72);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${vignette / 130})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    const grain = clamp(filters.grain ?? 0, 0, 100);
    if (grain > 0) {
        ctx.save();
        ctx.globalAlpha = grain / 650;
        ctx.fillStyle = '#ffffff';
        const count = Math.round((w * h / 9000) * (grain / 20));
        for (let i = 0; i < count; i += 1) {
            ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
        }
        ctx.restore();
    }
}

function drawSourceCover(ctx, source, w, h) {
    const sourceWidth = source?.videoWidth || source?.naturalWidth || source?.width || w;
    const sourceHeight = source?.videoHeight || source?.naturalHeight || source?.height || h;

    if (!sourceWidth || !sourceHeight || !Number.isFinite(sourceWidth / sourceHeight)) {
        ctx.drawImage(source, 0, 0, w, h);
        return;
    }

    const sourceAspect = sourceWidth / sourceHeight;
    const targetAspect = w / h;
    let sx = 0;
    let sy = 0;
    let sw = sourceWidth;
    let sh = sourceHeight;

    if (sourceAspect > targetAspect) {
        sw = sourceHeight * targetAspect;
        sx = (sourceWidth - sw) / 2;
    } else if (sourceAspect < targetAspect) {
        sh = sourceWidth / targetAspect;
        sy = (sourceHeight - sh) / 2;
    }

    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, w, h);
}

function drawFilteredSource(ctx, source, clip, w, h) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.filter = buildFilterString(clip?.filters);
    drawSourceCover(ctx, source, w, h);
    ctx.restore();
    applyPostFilters(ctx, clip?.filters, w, h);
}

function makeFilteredFrame(source, clip, w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    drawFilteredSource(ctx, source, clip, w, h);
    return canvas;
}

function getActiveTimelineTransition(transitionItems = [], globalTime) {
    if (!Array.isArray(transitionItems) || transitionItems.length === 0) return null;
    return transitionItems
        .filter((item) => {
            const start = item.startTime || 0;
            const end = item.endTime || start + (item.duration || 0);
            return globalTime >= start && globalTime <= end;
        })
        .sort((a, b) => (a.startTime || 0) - (b.startTime || 0))
        .at(-1) || null;
}

/**
 * Renders a transition between two frames on the canvas
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLVideoElement} fromPlayer - outgoing clip
 * @param {HTMLVideoElement} toPlayer - incoming clip
 * @param {number} progress - 0 to 1
 * @param {string} type - transition type id
 * @param {number} w - canvas width
 * @param {number} h - canvas height
 */
function renderTransition(ctx, fromPlayer, toPlayer, progress, type, w, h) {
    const p = easeInOut(progress);

    switch (type) {
        case 'fade':
        case 'crossfade': {
            ctx.globalAlpha = 1;
            ctx.drawImage(fromPlayer, 0, 0, w, h);
            ctx.globalAlpha = p;
            ctx.drawImage(toPlayer, 0, 0, w, h);
            ctx.globalAlpha = 1;
            break;
        }

        case 'dip-black': {
            if (p < 0.5) {
                ctx.drawImage(fromPlayer, 0, 0, w, h);
                ctx.fillStyle = `rgba(0,0,0,${p * 2})`;
                ctx.fillRect(0, 0, w, h);
            } else {
                ctx.drawImage(toPlayer, 0, 0, w, h);
                ctx.fillStyle = `rgba(0,0,0,${(1 - p) * 2})`;
                ctx.fillRect(0, 0, w, h);
            }
            break;
        }

        case 'dip-white': {
            if (p < 0.5) {
                ctx.drawImage(fromPlayer, 0, 0, w, h);
                ctx.fillStyle = `rgba(255,255,255,${p * 2})`;
                ctx.fillRect(0, 0, w, h);
            } else {
                ctx.drawImage(toPlayer, 0, 0, w, h);
                ctx.fillStyle = `rgba(255,255,255,${(1 - p) * 2})`;
                ctx.fillRect(0, 0, w, h);
            }
            break;
        }

        case 'slide-left': {
            const offset = Math.round(p * w);
            ctx.drawImage(fromPlayer, -offset, 0, w, h);
            ctx.drawImage(toPlayer, w - offset, 0, w, h);
            break;
        }

        case 'slide-right': {
            const offset = Math.round(p * w);
            ctx.drawImage(fromPlayer, offset, 0, w, h);
            ctx.drawImage(toPlayer, -w + offset, 0, w, h);
            break;
        }

        case 'slide-up': {
            const offset = Math.round(p * h);
            ctx.drawImage(fromPlayer, 0, -offset, w, h);
            ctx.drawImage(toPlayer, 0, h - offset, w, h);
            break;
        }

        case 'slide-down': {
            const offset = Math.round(p * h);
            ctx.drawImage(fromPlayer, 0, offset, w, h);
            ctx.drawImage(toPlayer, 0, -h + offset, w, h);
            break;
        }

        case 'wipe-left': {
            const x = Math.round((1 - p) * w);
            ctx.drawImage(fromPlayer, 0, 0, w, h);
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, w - x, h);
            ctx.clip();
            ctx.drawImage(toPlayer, 0, 0, w, h);
            ctx.restore();
            break;
        }

        case 'wipe-right': {
            const x = Math.round(p * w);
            ctx.drawImage(fromPlayer, 0, 0, w, h);
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, 0, w - x, h);
            ctx.clip();
            ctx.drawImage(toPlayer, 0, 0, w, h);
            ctx.restore();
            break;
        }

        case 'wipe-circle': {
            const maxRadius = Math.sqrt(w * w + h * h) / 2;
            const radius = p * maxRadius;
            ctx.drawImage(fromPlayer, 0, 0, w, h);
            ctx.save();
            ctx.beginPath();
            ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(toPlayer, 0, 0, w, h);
            ctx.restore();
            break;
        }

        case 'wipe-clock': {
            ctx.drawImage(fromPlayer, 0, 0, w, h);
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(w / 2, h / 2);
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + p * Math.PI * 2;
            ctx.arc(w / 2, h / 2, Math.max(w, h), startAngle, endAngle);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(toPlayer, 0, 0, w, h);
            ctx.restore();
            break;
        }

        case 'zoom-in': {
            const scale = 1 + p * 0.5;
            ctx.save();
            ctx.translate(w / 2, h / 2);
            ctx.scale(scale, scale);
            ctx.globalAlpha = 1 - p;
            ctx.drawImage(fromPlayer, -w / 2, -h / 2, w, h);
            ctx.restore();
            ctx.globalAlpha = p;
            ctx.drawImage(toPlayer, 0, 0, w, h);
            ctx.globalAlpha = 1;
            break;
        }

        case 'zoom-out': {
            const s = 1 - p * 0.3;
            ctx.drawImage(toPlayer, 0, 0, w, h);
            ctx.save();
            ctx.globalAlpha = 1 - p;
            ctx.translate(w / 2, h / 2);
            ctx.scale(s, s);
            ctx.drawImage(fromPlayer, -w / 2, -h / 2, w, h);
            ctx.restore();
            ctx.globalAlpha = 1;
            break;
        }

        case 'zoom-rotate': {
            const angle = p * Math.PI * 0.25;
            const s = 1 + p * 0.3;
            ctx.drawImage(toPlayer, 0, 0, w, h);
            ctx.save();
            ctx.globalAlpha = 1 - p;
            ctx.translate(w / 2, h / 2);
            ctx.rotate(angle);
            ctx.scale(s, s);
            ctx.drawImage(fromPlayer, -w / 2, -h / 2, w, h);
            ctx.restore();
            ctx.globalAlpha = 1;
            break;
        }

        case 'glitch': {
            if (p < 0.5) {
                ctx.drawImage(fromPlayer, 0, 0, w, h);
            } else {
                ctx.drawImage(toPlayer, 0, 0, w, h);
            }
            // Glitch slices
            const sliceCount = 8;
            const sliceH = h / sliceCount;
            for (let i = 0; i < sliceCount; i++) {
                const offset = (Math.random() - 0.5) * w * 0.15 * Math.sin(p * Math.PI);
                const src = p < 0.5 ? fromPlayer : toPlayer;
                ctx.drawImage(src, 0, i * sliceH, w, sliceH, offset, i * sliceH, w, sliceH);
            }
            break;
        }

        case 'pixel-scatter': {
            ctx.drawImage(p < 0.5 ? fromPlayer : toPlayer, 0, 0, w, h);
            const blockSize = Math.max(4, Math.round(20 * Math.sin(p * Math.PI)));
            const source = p < 0.5 ? toPlayer : fromPlayer;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = w;
            tempCanvas.height = h;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(source, 0, 0, w, h);
            for (let x = 0; x < w; x += blockSize * 2) {
                for (let y = 0; y < h; y += blockSize * 2) {
                    if (Math.random() < p) {
                        ctx.drawImage(tempCanvas, x, y, blockSize, blockSize, x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 10, blockSize, blockSize);
                    }
                }
            }
            break;
        }

        case 'chromatic': {
            ctx.drawImage(p < 0.5 ? fromPlayer : toPlayer, 0, 0, w, h);
            const shift = Math.round(15 * Math.sin(p * Math.PI));
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.5 * Math.sin(p * Math.PI);
            ctx.drawImage(p < 0.5 ? fromPlayer : toPlayer, shift, 0, w, h);
            ctx.drawImage(p < 0.5 ? fromPlayer : toPlayer, -shift, 0, w, h);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            break;
        }

        case 'cross-blur':
        case 'motion-blur':
        case 'radial-blur': {
            // Canvas doesn't have native blur during compositing, simulate with crossfade
            ctx.globalAlpha = 1 - p;
            ctx.filter = `blur(${Math.round(p * 10)}px)`;
            ctx.drawImage(fromPlayer, 0, 0, w, h);
            ctx.filter = `blur(${Math.round((1 - p) * 10)}px)`;
            ctx.globalAlpha = p;
            ctx.drawImage(toPlayer, 0, 0, w, h);
            ctx.filter = 'none';
            ctx.globalAlpha = 1;
            break;
        }

        case 'flash': {
            if (p < 0.3) {
                ctx.drawImage(fromPlayer, 0, 0, w, h);
                ctx.fillStyle = `rgba(255,255,255,${p / 0.3})`;
                ctx.fillRect(0, 0, w, h);
            } else if (p < 0.5) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, w, h);
            } else {
                ctx.drawImage(toPlayer, 0, 0, w, h);
                ctx.fillStyle = `rgba(255,255,255,${(1 - p) / 0.5})`;
                ctx.fillRect(0, 0, w, h);
            }
            break;
        }

        case 'light-leak': {
            ctx.globalAlpha = 1;
            ctx.drawImage(fromPlayer, 0, 0, w, h);
            ctx.globalAlpha = p;
            ctx.drawImage(toPlayer, 0, 0, w, h);
            // Warm light overlay
            const gradient = ctx.createRadialGradient(w * 0.7, h * 0.3, 0, w * 0.7, h * 0.3, w * 0.8);
            gradient.addColorStop(0, `rgba(255,180,50,${0.4 * Math.sin(p * Math.PI)})`);
            gradient.addColorStop(1, 'rgba(255,180,50,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);
            ctx.globalAlpha = 1;
            break;
        }

        case 'burn': {
            if (p < 0.5) {
                ctx.drawImage(fromPlayer, 0, 0, w, h);
                const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * (1 - p));
                g.addColorStop(0, `rgba(200,80,0,${p})`);
                g.addColorStop(0.5, `rgba(100,20,0,${p * 0.5})`);
                g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, w, h);
            } else {
                ctx.drawImage(toPlayer, 0, 0, w, h);
                ctx.fillStyle = `rgba(0,0,0,${(1 - p) * 2})`;
                ctx.fillRect(0, 0, w, h);
            }
            break;
        }

        default: {
            // Default crossfade
            ctx.globalAlpha = 1;
            ctx.drawImage(fromPlayer, 0, 0, w, h);
            ctx.globalAlpha = p;
            ctx.drawImage(toPlayer, 0, 0, w, h);
            ctx.globalAlpha = 1;
        }
    }
}

/**
 * PlaybackEngine - Multi-clip canvas playback
 */
export class PlaybackEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.players = new Map();
        this.audioPlayers = new Map();
        this.audioSourceNodes = new Map();
        this.audioDestinationNodes = new Set();
        this.audioContext = null;
        this.animFrameId = null;
        this.onTimeUpdate = null;
        this.isPlaying = false;
    }

    async loadClip(clip) {
        if (this.players.has(clip.id)) return;
        const video = createVideoPlayer(clip.url);
        video.playbackRate = clip.speed || 1;
        video.volume = clampMediaVolume(clip.volume);
        
        await new Promise((resolve, reject) => {
            let resolved = false;
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    resolve(); // Continue even if no canplay (video may still work)
                }
            }, 3000); // 3 second timeout
            
            const handleCanPlay = () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    cleanup();
                    resolve();
                }
            };
            
            const handleLoadedData = () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    cleanup();
                    resolve();
                }
            };
            
            const handleError = () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    cleanup();
                    reject(new Error(`Failed to load video clip: ${clip.name}`));
                }
            };
            
            const cleanup = () => {
                video.removeEventListener('canplay', handleCanPlay);
                video.removeEventListener('loadeddata', handleLoadedData);
                video.removeEventListener('error', handleError);
            };
            
            video.addEventListener('canplay', handleCanPlay);
            video.addEventListener('loadeddata', handleLoadedData);
            video.addEventListener('error', handleError);
            video.load();
        }).catch(err => {
            console.warn(err);
            // Continue anyway - video might still render
        });
        
        this.players.set(clip.id, video);
    }

    async loadAudioTrack(track) {
        if (!track?.url || this.audioPlayers.has(track.id)) return;
        const audio = new Audio(track.url);
        audio.preload = 'auto';
        audio.volume = clampMediaVolume(track.volume ?? 100);

        await new Promise((resolve) => {
            let resolved = false;
            const done = () => {
                if (resolved) return;
                resolved = true;
                cleanup();
                resolve();
            };
            const cleanup = () => {
                window.clearTimeout(timeout);
                audio.removeEventListener('canplay', done);
                audio.removeEventListener('loadeddata', done);
                audio.removeEventListener('error', done);
            };
            const timeout = window.setTimeout(done, 2500);
            audio.addEventListener('canplay', done);
            audio.addEventListener('loadeddata', done);
            audio.addEventListener('error', done);
            audio.load();
        });

        this.audioPlayers.set(track.id, audio);
    }

    async loadAllClips(clips) {
        // Use allSettled to continue even if some clips fail to load
        await Promise.allSettled(clips.map(clip => this.loadClip(clip)));
    }

    async loadAllAudioTracks(audioTracks = []) {
        await Promise.allSettled(audioTracks.map(track => this.loadAudioTrack(track)));
    }

    getOrCreateAudioContext(AudioContextCtor) {
        if (!AudioContextCtor) return null;
        if (!this.audioContext || this.audioContext.state === 'closed') {
            this.audioContext = new AudioContextCtor();
        }
        return this.audioContext;
    }

    connectAudioToDestination(audioContext, destination) {
        if (!audioContext || !destination) return () => {};
        const connected = [];
        const connectPlayer = (player) => {
            if (!player || this.audioDestinationNodes.has(destination)) return;
            let source = this.audioSourceNodes.get(player);
            if (!source) {
                source = audioContext.createMediaElementSource(player);
                this.audioSourceNodes.set(player, source);
            }
            if (source.context !== audioContext) return;
            source.connect(destination);
            source.connect(audioContext.destination);
            connected.push(source);
        };

        this.players.forEach(connectPlayer);
        this.audioPlayers.forEach(connectPlayer);
        this.audioDestinationNodes.add(destination);

        return () => {
            connected.forEach((source) => {
                try { source.disconnect(destination); } catch { /* already disconnected */ }
                try { source.disconnect(audioContext.destination); } catch { /* already disconnected */ }
            });
            this.audioDestinationNodes.delete(destination);
        };
    }

    getActiveClipAtTime(clips, transitions, globalTime) {
        let elapsed = 0;
        for (let i = 0; i < clips.length; i++) {
            const clip = clips[i];
            const clipDur = (clip.trimEnd - clip.trimStart) / (clip.speed || 1);

            let transitionDur = 0;
            let transition = null;
            if (i < clips.length - 1) {
                const key = `${clip.id}->${clips[i + 1].id}`;
                transition = transitions[key];
                if (transition) transitionDur = transition.duration || 0;
            }

            const effectiveDur = clipDur - transitionDur;

            if (globalTime < elapsed + clipDur) {
                const localTime = clip.trimStart + (globalTime - elapsed) * (clip.speed || 1);

                let transitionProgress = -1;
                let nextClip = null;
                if (transition && globalTime >= elapsed + effectiveDur) {
                    transitionProgress = (globalTime - elapsed - effectiveDur) / transitionDur;
                    nextClip = clips[i + 1];
                }

                return { clip, localTime, transitionProgress, transition, nextClip };
            }

            elapsed += effectiveDur;
        }
        return null;
    }

    renderFrame(clips, transitions, globalTime, transitionItems = []) {
        const result = this.getActiveClipAtTime(clips, transitions, globalTime);
        if (!result) {
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }

        const { clip, localTime, transitionProgress, transition, nextClip } = result;
        const player = this.players.get(clip.id);
        const w = this.canvas.width;
        const h = this.canvas.height;

        if (!player) {
            // Player not loaded yet - show black
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, w, h);
            return;
        }

        try {
            // Only seek if time difference is significant
            if (Math.abs(player.currentTime - localTime) > 0.05) {
                player.currentTime = localTime;
            }

            const timelineTransition = getActiveTimelineTransition(transitionItems, globalTime);
            if (timelineTransition) {
                const transitionStart = timelineTransition.startTime || 0;
                const transitionDuration = Math.max(0.1, timelineTransition.duration || ((timelineTransition.endTime || 0) - transitionStart) || 0.5);
                const transitionEnd = timelineTransition.endTime || transitionStart + transitionDuration;
                const timelineProgress = clamp((globalTime - transitionStart) / transitionDuration, 0, 1);
                const targetResult = this.getActiveClipAtTime(clips, transitions, Math.min(transitionEnd, globalTime + transitionDuration));
                const targetPlayer = this.players.get(targetResult?.clip?.id) || player;
                const targetClip = targetResult?.clip || clip;
                const targetLocalTime = targetResult?.localTime ?? localTime;

                const fromFrame = makeFilteredFrame(player, clip, w, h);
                if (targetPlayer && Math.abs(targetPlayer.currentTime - targetLocalTime) > 0.05) {
                    targetPlayer.currentTime = targetLocalTime;
                }
                const toFrame = makeFilteredFrame(targetPlayer, targetClip, w, h);
                renderTransition(this.ctx, fromFrame, toFrame, timelineProgress, timelineTransition.type, w, h);
            } else if (transitionProgress >= 0 && transitionProgress <= 1 && nextClip && transition) {
                const nextPlayer = this.players.get(nextClip.id);
                if (nextPlayer) {
                    const nextLocalTime = nextClip.trimStart + transitionProgress * ((nextClip.trimEnd - nextClip.trimStart) / (nextClip.speed || 1)) * 0.1;
                    if (Math.abs(nextPlayer.currentTime - nextLocalTime) > 0.05) {
                        nextPlayer.currentTime = nextLocalTime;
                    }
                    // Render real transition using filtered frame snapshots.
                    const fromFrame = makeFilteredFrame(player, clip, w, h);
                    const toFrame = makeFilteredFrame(nextPlayer, nextClip, w, h);
                    renderTransition(this.ctx, fromFrame, toFrame, transitionProgress, transition.type, w, h);
                } else {
                    // Next clip not loaded, draw current
                    drawFilteredSource(this.ctx, player, clip, w, h);
                }
            } else {
                drawFilteredSource(this.ctx, player, clip, w, h);
            }
        } catch (err) {
            // Draw black if any canvas error occurs
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, w, h);
            console.warn('Canvas render error:', err);
        }
    }

    syncClipAudio(clips, transitions, globalTime, playbackSpeed = 1) {
        const activeResult = this.getActiveClipAtTime(clips, transitions, globalTime);
        this.players.forEach((player, id) => {
            const isActive = activeResult?.clip?.id === id;
            if (!isActive) {
                player.pause();
                return;
            }
            const clip = activeResult.clip;
            player.volume = clampMediaVolume(clip.volume ?? 100);
            player.playbackRate = (clip.speed || 1) * playbackSpeed;
            if (Math.abs(player.currentTime - activeResult.localTime) > 0.18) {
                player.currentTime = activeResult.localTime;
            }
            if (player.paused) player.play().catch(() => {});
        });
    }

    syncExternalAudio(audioTracks = [], globalTime, playbackSpeed = 1) {
        this.audioPlayers.forEach((audio, id) => {
            const track = audioTracks.find(item => item.id === id);
            if (!track) {
                audio.pause();
                return;
            }
            const start = track.startTime || 0;
            const end = track.endTime || start + (track.duration || 0);
            const isActive = globalTime >= start && globalTime <= end;
            if (!isActive) {
                audio.pause();
                return;
            }

            const localTime = Math.max(0, globalTime - start);
            audio.volume = clampMediaVolume(track.volume ?? 100);
            audio.playbackRate = playbackSpeed;
            if (Math.abs(audio.currentTime - localTime) > 0.18) {
                audio.currentTime = localTime;
            }
            if (audio.paused) audio.play().catch(() => {});
        });
    }

    startPlayback(clips, transitions, getCurrentTime, setCurrentTime, totalDuration, playbackSpeed = 1, audioTracks = [], transitionItems = []) {
        this.isPlaying = true;
        let lastTimestamp = null;
        this.syncClipAudio(clips, transitions, getCurrentTime(), playbackSpeed);
        this.syncExternalAudio(audioTracks, getCurrentTime(), playbackSpeed);

        const tick = (timestamp) => {
            if (!this.isPlaying) return;

            if (lastTimestamp !== null) {
                const delta = (timestamp - lastTimestamp) / 1000 * playbackSpeed;
                const newTime = Math.min(getCurrentTime() + delta, totalDuration);

                if (newTime >= totalDuration) {
                    this.stopPlayback();
                    setCurrentTime(0);
                    return;
                }

                this.renderFrame(clips, transitions, newTime, transitionItems);
                setCurrentTime(newTime);
                this.syncClipAudio(clips, transitions, newTime, playbackSpeed);
                this.syncExternalAudio(audioTracks, newTime, playbackSpeed);
            }

            lastTimestamp = timestamp;
            this.animFrameId = requestAnimationFrame(tick);
        };

        this.animFrameId = requestAnimationFrame(tick);
    }

    stopPlayback() {
        this.isPlaying = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        this.players.forEach(player => { player.pause(); });
        this.audioPlayers.forEach(player => { player.pause(); });
    }

    seekTo(clips, transitions, time, transitionItems = []) {
        this.renderFrame(clips, transitions, time, transitionItems);
    }

    dispose() {
        this.stopPlayback();
        this.players.forEach((player) => {
            player.pause();
            player.src = '';
        });
        this.audioPlayers.forEach((player) => {
            player.pause();
            player.src = '';
        });
        this.players.clear();
        this.audioPlayers.clear();
        this.audioSourceNodes.clear();
        this.audioContext?.close?.();
        this.audioContext = null;
    }
}

// === TRANSITIONS ===
export const TRANSITIONS = [
    { id: 'fade', name: 'Fade', category: 'basic', icon: '\u25D0', defaultDuration: 0.5 },
    { id: 'crossfade', name: 'Crossfade', category: 'basic', icon: '\u25D1', defaultDuration: 0.8 },
    { id: 'dip-black', name: 'Dip to Black', category: 'basic', icon: '\u25FC', defaultDuration: 0.6 },
    { id: 'dip-white', name: 'Dip to White', category: 'basic', icon: '\u25FB', defaultDuration: 0.6 },

    { id: 'slide-left', name: 'Slide Left', category: 'slide', icon: '\u2190', defaultDuration: 0.5 },
    { id: 'slide-right', name: 'Slide Right', category: 'slide', icon: '\u2192', defaultDuration: 0.5 },
    { id: 'slide-up', name: 'Slide Up', category: 'slide', icon: '\u2191', defaultDuration: 0.5 },
    { id: 'slide-down', name: 'Slide Down', category: 'slide', icon: '\u2193', defaultDuration: 0.5 },

    { id: 'wipe-left', name: 'Wipe Left', category: 'wipe', icon: '\u258C', defaultDuration: 0.6 },
    { id: 'wipe-right', name: 'Wipe Right', category: 'wipe', icon: '\u2590', defaultDuration: 0.6 },
    { id: 'wipe-circle', name: 'Circle Wipe', category: 'wipe', icon: '\u25C9', defaultDuration: 0.7 },
    { id: 'wipe-clock', name: 'Clock Wipe', category: 'wipe', icon: '\u25F7', defaultDuration: 0.8 },

    { id: 'zoom-in', name: 'Zoom In', category: 'zoom', icon: '\u2295', defaultDuration: 0.5 },
    { id: 'zoom-out', name: 'Zoom Out', category: 'zoom', icon: '\u2296', defaultDuration: 0.5 },
    { id: 'zoom-rotate', name: 'Zoom Rotate', category: 'zoom', icon: '\u21BB', defaultDuration: 0.7 },

    { id: 'glitch', name: 'Glitch', category: 'glitch', icon: '\u26A1', defaultDuration: 0.4 },
    { id: 'pixel-scatter', name: 'Pixel Scatter', category: 'glitch', icon: '\u25A6', defaultDuration: 0.5 },
    { id: 'chromatic', name: 'Chromatic', category: 'glitch', icon: '\u25C8', defaultDuration: 0.4 },

    { id: 'cross-blur', name: 'Cross Blur', category: 'blur', icon: '\u25CC', defaultDuration: 0.6 },
    { id: 'motion-blur', name: 'Motion Blur', category: 'blur', icon: '\u224B', defaultDuration: 0.5 },
    { id: 'radial-blur', name: 'Radial Blur', category: 'blur', icon: '\u273A', defaultDuration: 0.6 },

    { id: 'flash', name: 'Flash', category: 'light', icon: '\u2726', defaultDuration: 0.3 },
    { id: 'light-leak', name: 'Light Leak', category: 'light', icon: '\u2600', defaultDuration: 0.8 },
    { id: 'burn', name: 'Burn', category: 'light', icon: '\uD83D\uDD25', defaultDuration: 0.6 },
];

export const TRANSITION_CATEGORIES = [
    { id: 'basic', name: 'Basic' },
    { id: 'slide', name: 'Slide' },
    { id: 'wipe', name: 'Wipe' },
    { id: 'zoom', name: 'Zoom' },
    { id: 'glitch', name: 'Glitch' },
    { id: 'blur', name: 'Blur' },
    { id: 'light', name: 'Light' },
];

export const EXPORT_PRESETS = {
    'tiktok': { name: 'TikTok', width: 1080, height: 1920, fps: 30, label: '9:16' },
    'youtube': { name: 'YouTube', width: 1920, height: 1080, fps: 30, label: '16:9' },
    'instagram-reel': { name: 'Reel', width: 1080, height: 1920, fps: 30, label: '9:16' },
    'instagram-post': { name: 'Post', width: 1080, height: 1080, fps: 30, label: '1:1' },
    'story': { name: 'Story', width: 1080, height: 1920, fps: 30, label: '9:16' },
    'landscape': { name: 'Landscape', width: 1920, height: 1080, fps: 30, label: '16:9' },
    'portrait': { name: 'Portrait', width: 1080, height: 1350, fps: 30, label: '4:5' },
};

export const TEXT_ANIMATIONS = [
    { id: 'none', name: 'None' },
    { id: 'fade', name: 'Fade In' },
    { id: 'typewriter', name: 'Typewriter' },
    { id: 'slide-up', name: 'Slide Up' },
    { id: 'slide-down', name: 'Slide Down' },
    { id: 'scale', name: 'Scale Pop' },
    { id: 'blur-in', name: 'Blur In' },
];

export function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
}

export function formatTimeFull(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
