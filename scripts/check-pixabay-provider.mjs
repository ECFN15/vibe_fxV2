const TARGETS = [
  'https://pixabay.com/music/',
  'https://pixabay.com/music/search/piano/',
  'https://pixabay.com/music/search/free+music/',
];

const USER_AGENTS = [
  {
    id: 'vibefx',
    value: 'Vibe_fx Soundtrack provider scan (+https://pixabay.com/service/terms/)',
  },
  {
    id: 'chrome',
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  },
];

const hasChallenge = (html = '') => /cf_chl|Just a moment|enable JavaScript and cookies|Access denied|captcha|challenge/i.test(html);
const hasAudioUrl = (html = '') => /https:\/\/cdn\.pixabay\.com\/download\/audio\//i.test(html);

const probe = async (url, userAgent) => {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': userAgent.value,
      },
    });
    const html = await response.text();
    return {
      url,
      userAgent: userAgent.id,
      status: response.status,
      ok: response.ok,
      ms: Date.now() - startedAt,
      bytes: html.length,
      title: html.match(/<title>(.*?)<\/title>/i)?.[1] || '',
      hasAudioUrl: hasAudioUrl(html),
      blocked: response.status === 403 || hasChallenge(html),
    };
  } catch (error) {
    return {
      url,
      userAgent: userAgent.id,
      status: 0,
      ok: false,
      ms: Date.now() - startedAt,
      bytes: 0,
      title: '',
      hasAudioUrl: false,
      blocked: true,
      error: error.message || 'network_error',
    };
  }
};

const results = [];
for (const url of TARGETS) {
  for (const userAgent of USER_AGENTS) {
    results.push(await probe(url, userAgent));
  }
}

console.table(results.map((item) => ({
  url: item.url.replace('https://pixabay.com', ''),
  ua: item.userAgent,
  status: item.status,
  blocked: item.blocked,
  audio: item.hasAudioUrl,
  bytes: item.bytes,
  title: item.title,
})));

const usable = results.some((item) => item.ok && item.hasAudioUrl && !item.blocked);
if (!usable) {
  console.log('\nPixabay Music page scan is not usable from this server runtime.');
  console.log('Observed behavior: pages return 403/challenge HTML before track/audio URLs are exposed.');
  console.log('Supported alternatives in Vibe_fx:');
  console.log('1. Open the official Pixabay track page, download the audio file, then import the file into Bibliotheque projet.');
  console.log('2. If the browser exposes a direct https://cdn.pixabay.com/download/audio/... URL, paste it into URL audio directe and import locally.');
  console.log('3. Keep the Pixabay source page and license snapshot with the track metadata for Content ID disputes.');
}
