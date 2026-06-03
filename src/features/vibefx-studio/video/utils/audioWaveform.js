const DEFAULT_PEAK_COUNT = 96;

const normalizePeaks = (peaks) => {
    const max = Math.max(...peaks, 0.001);
    return peaks.map((peak) => Number(Math.max(0.04, Math.min(1, peak / max)).toFixed(3)));
};

async function readAudioSource(source, options = {}) {
    if (source instanceof File || source instanceof Blob) {
        return source.arrayBuffer();
    }
    if (typeof source === 'string' && source) {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs || 8000);
        try {
            const response = await fetch(source, { signal: controller.signal });
            if (!response.ok) throw new Error(`Audio fetch failed: ${response.status}`);
            return response.arrayBuffer();
        } finally {
            window.clearTimeout(timeout);
        }
    }
    throw new Error('Audio source missing');
}

export async function extractAudioWaveform(source, options = {}) {
    const peakCount = Math.max(16, Math.min(256, options.peakCount || DEFAULT_PEAK_COUNT));
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('AudioContext unavailable');

    const audioContext = new AudioContextClass();
    try {
        const buffer = await audioContext.decodeAudioData(await readAudioSource(source, options));
        const channelCount = Math.max(1, buffer.numberOfChannels);
        const samplesPerPeak = Math.max(1, Math.floor(buffer.length / peakCount));
        const peaks = [];

        for (let peakIndex = 0; peakIndex < peakCount; peakIndex += 1) {
            const start = peakIndex * samplesPerPeak;
            const end = Math.min(buffer.length, start + samplesPerPeak);
            let sum = 0;
            let count = 0;

            for (let channel = 0; channel < channelCount; channel += 1) {
                const data = buffer.getChannelData(channel);
                for (let i = start; i < end; i += 1) {
                    sum += Math.abs(data[i]);
                    count += 1;
                }
            }

            peaks.push(count > 0 ? sum / count : 0);
        }

        return {
            status: 'ready',
            peaks: normalizePeaks(peaks),
            duration: Number(buffer.duration.toFixed(3)),
            sampleRate: buffer.sampleRate,
            peakCount,
        };
    } finally {
        await audioContext.close().catch(() => {});
    }
}

export function buildUnavailableWaveform(reason = 'decode-failed', peakCount = DEFAULT_PEAK_COUNT) {
    return {
        status: 'unavailable',
        peaks: Array.from({ length: peakCount }, () => 0.2),
        reason,
        peakCount,
    };
}
