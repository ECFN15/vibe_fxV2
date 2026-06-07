export const SOCIAL_EXPORT_PRESETS = [
    { id: 'instagram-square', label: 'Instagram Post carre', platform: 'Instagram', width: 1080, height: 1080, orientation: 'square', fps: 30 },
    { id: 'instagram-portrait', label: 'Instagram Portrait', platform: 'Instagram', width: 1080, height: 1350, orientation: 'portrait', fps: 30 },
    { id: 'instagram-story-reels', label: 'Instagram Story / Reels', platform: 'Instagram', width: 1080, height: 1920, orientation: 'portrait', fps: 30 },
    { id: 'tiktok-shorts', label: 'TikTok / Shorts', platform: 'TikTok', width: 1080, height: 1920, orientation: 'portrait', fps: 30 },
    { id: 'facebook-portrait', label: 'Facebook Post portrait', platform: 'Facebook', width: 1200, height: 1500, orientation: 'portrait', fps: 30 },
    { id: 'facebook-square', label: 'Facebook Post carre', platform: 'Facebook', width: 1080, height: 1080, orientation: 'square', fps: 30 },
    { id: 'x-twitter-landscape', label: 'X / Twitter', platform: 'X', width: 1600, height: 900, orientation: 'landscape', fps: 30 },
    { id: 'linkedin-square', label: 'LinkedIn carre', platform: 'LinkedIn', width: 1200, height: 1200, orientation: 'square', fps: 30 },
    { id: 'linkedin-landscape', label: 'LinkedIn paysage', platform: 'LinkedIn', width: 1920, height: 1080, orientation: 'landscape', fps: 30 },
    { id: 'youtube-thumbnail', label: 'YouTube Thumbnail', platform: 'YouTube', width: 1280, height: 720, orientation: 'landscape', fps: 30 },
    { id: 'custom', label: 'Custom size', platform: 'Custom', width: 1080, height: 1920, orientation: 'custom', fps: 30, custom: true },
];

export const PROFESSIONAL_VIDEO_FORMATS = [
    { id: 'mp4', label: 'MP4', container: 'MP4', status: 'ready', defaultVideoCodec: 'h264', defaultAudioCodec: 'aac' },
    { id: 'webm', label: 'WebM', container: 'WEBM', status: 'server_required', defaultVideoCodec: 'vp9', defaultAudioCodec: 'opus' },
    { id: 'mov', label: 'QuickTime MOV', container: 'MOV', status: 'server_required', defaultVideoCodec: 'prores', defaultAudioCodec: 'pcm' },
    { id: 'png', label: 'PNG image', container: 'PNG', status: 'image_ready', defaultVideoCodec: 'png', defaultAudioCodec: '' },
    { id: 'jpeg', label: 'JPEG image', container: 'JPEG', status: 'image_ready', defaultVideoCodec: 'jpeg', defaultAudioCodec: '' },
    { id: 'webp', label: 'WebP image', container: 'WEBP', status: 'image_ready', defaultVideoCodec: 'webp', defaultAudioCodec: '' },
    { id: 'png-sequence', label: 'PNG sequence', container: 'PNG sequence', status: 'future', defaultVideoCodec: 'png', defaultAudioCodec: '' },
];

export const PROFESSIONAL_VIDEO_CODECS = [
    { id: 'h264', label: 'H.264', status: 'ready', formats: ['mp4'] },
    { id: 'h265', label: 'H.265 / HEVC', status: 'server_required', formats: ['mp4', 'mov'] },
    { id: 'vp9', label: 'VP9', status: 'server_required', formats: ['webm'] },
    { id: 'av1', label: 'AV1', status: 'future', formats: ['mp4', 'webm'] },
    { id: 'prores', label: 'ProRes', status: 'future', formats: ['mov'] },
    { id: 'dnxhr', label: 'DNxHR', status: 'future', formats: ['mov'] },
    { id: 'png', label: 'PNG', status: 'image_ready', formats: ['png', 'png-sequence'] },
    { id: 'jpeg', label: 'JPEG', status: 'image_ready', formats: ['jpeg'] },
    { id: 'webp', label: 'WebP', status: 'image_ready', formats: ['webp'] },
];

export const PROFESSIONAL_AUDIO_CODECS = [
    { id: 'aac', label: 'AAC', status: 'ready', formats: ['mp4', 'mov'] },
    { id: 'opus', label: 'Opus', status: 'server_required', formats: ['webm'] },
    { id: 'pcm', label: 'PCM', status: 'future', formats: ['mov'] },
    { id: 'none', label: 'No audio', status: 'ready', formats: ['mp4', 'webm', 'mov', 'png', 'jpeg', 'webp', 'png-sequence'] },
];

export const PROFESSIONAL_FRAME_RATE_OPTIONS = ['timeline', 24, 25, 30, 50, 59.94, 60];
export const PROFESSIONAL_QUALITY_PRESETS = ['draft', 'balanced', 'high', 'best'];
export const PROFESSIONAL_RATE_CONTROL_MODES = ['quality', 'vbr', 'cbr'];
export const PROFESSIONAL_RENDER_MODES = ['singleClip', 'individualClips'];
