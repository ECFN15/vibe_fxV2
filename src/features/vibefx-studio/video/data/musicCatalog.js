export const MUSIC_GENRES = [
    { id: '', name: 'Tous les genres' },
    { id: 'beats', name: 'Beats' },
    { id: 'classical', name: 'Classique' },
    { id: 'electronic', name: 'Electronique' },
    { id: 'hip hop', name: 'Hip Hop' },
    { id: 'jazz', name: 'Jazz' },
    { id: 'ambient', name: 'Ambient' },
    { id: 'cinematic', name: 'Cinematique' },
    { id: 'pop', name: 'Pop' },
    { id: 'rock', name: 'Rock' },
    { id: 'chill', name: 'Chill' },
    { id: 'lofi', name: 'Lo-Fi' },
    { id: 'happy', name: 'Joyeux' },
    { id: 'sad', name: 'Triste' },
    { id: 'epic', name: 'Epique' },
    { id: 'nature', name: 'Nature' },
];

export const MUSIC_PROVIDERS = [
    {
        id: 'epidemic-sound',
        name: 'Epidemic Sound',
        tier: 'premium',
        label: 'Meilleur choix pro social',
        url: 'https://www.epidemicsound.com/business/developers/',
        licenseUrl: 'https://help.epidemicsound.com/hc/en-us/articles/26194316442258-What-are-the-options-when-licensing-a-track',
        api: 'Partner API',
        status: 'API partenaire requise',
        strengths: ['Catalogue tres large', 'SFX', 'clearance social', 'API officielle'],
        caveat: 'Necessite contrat/portal developpeur. Ne pas scraper.',
    },
    {
        id: 'soundstripe',
        name: 'Soundstripe',
        tier: 'premium',
        label: 'Meilleur pour integration licensing',
        url: 'https://www.soundstripe.com/api',
        licenseUrl: 'https://www.soundstripe.com/api',
        api: 'Partnership API',
        status: 'Partenariat requis',
        strengths: ['Licensing commercial', 'indemnification possible', 'catalogue premium'],
        caveat: 'Acces API a negocier.',
    },
    {
        id: 'artlist',
        name: 'Artlist',
        tier: 'premium',
        label: 'Catalogue createur haut de gamme',
        url: 'https://developer.artlist.io/',
        licenseUrl: 'https://artlist.io/help-center/privacy-terms/artlist-license',
        api: 'Enterprise API',
        status: 'Enterprise requis',
        strengths: ['Musiques premium', 'SFX', 'API catalogue/stream/download'],
        caveat: 'Interdit de revendre les assets comme librairie concurrente.',
    },
    {
        id: 'pixabay',
        name: 'Pixabay Music',
        tier: 'free',
        label: 'Meilleur appoint gratuit',
        url: 'https://pixabay.com/music/',
        licenseUrl: 'https://pixabay.com/service/license-summary/',
        api: 'Pas d API musique officielle publique',
        status: 'Import manuel verifie',
        strengths: ['Gratuit', 'attribution non obligatoire', 'beaucoup de styles'],
        caveat: 'Qualite et verification variables. Telechargement depuis la source officielle uniquement.',
    },
    {
        id: 'jamendo',
        name: 'Jamendo Licensing',
        tier: 'licensed',
        label: 'Licences piste par piste',
        url: 'https://licensing.jamendo.com/',
        licenseUrl: 'https://support-licensing.jamendo.com/catalog-licenses',
        api: 'A verifier via accord commercial',
        status: 'Licence par projet',
        strengths: ['Independants', 'droits clairs par licence', 'usage online commercial'],
        caveat: 'Royalty-free ne veut pas dire gratuit. Une licence peut etre par piste/projet.',
    },
    {
        id: 'mubert',
        name: 'Mubert API',
        tier: 'ai',
        label: 'Meilleur connecteur IA generatif',
        url: 'https://mubert.com/api',
        licenseUrl: 'https://mubert.com/api',
        api: 'API generation + streaming',
        status: 'Backend requis',
        strengths: ['Text-to-music', 'moods/BPM', 'generation jusqu a 25 min', 'sous-licence annoncee'],
        caveat: 'Cles API et generation doivent rester cote serveur.',
    },
    {
        id: 'beatoven',
        name: 'Beatoven.ai',
        tier: 'ai',
        label: 'IA orientee contenu video',
        url: 'https://www.beatoven.ai/',
        licenseUrl: 'https://www.beatoven.ai/tos',
        api: 'A verifier',
        status: 'Backend recommande',
        strengths: ['Mood-based', 'licence fournie au download', 'bon fit video/podcast'],
        caveat: 'Verifier droits exacts par plan avant automatisation.',
    },
    {
        id: 'stable-audio',
        name: 'Stable Audio',
        tier: 'ai',
        label: 'Generation IA qualite studio',
        url: 'https://stableaudio.com/pricing',
        licenseUrl: 'https://stableaudio.com/pricing',
        api: 'A verifier',
        status: 'Compte/licence requis',
        strengths: ['Creator license commerciale', 'sound effects', 'music releases'],
        caveat: 'Enterprise requis pour gros usage/app selon seuils.',
    },
    {
        id: 'suno',
        name: 'Suno',
        tier: 'ai-risk',
        label: 'IA vocale puissante, risque legal plus haut',
        url: 'https://suno.com/',
        licenseUrl: 'https://suno.com/terms/',
        api: 'Pas a brancher sans analyse juridique',
        status: 'A garder en mode manuel',
        strengths: ['Chansons completes', 'voix', 'fort potentiel creatif'],
        caveat: 'Free non-commercial, paid avec incertitudes copyright et restrictions remix.',
    },
];

export function getCuratedTracks(query = '', genre = '') {
    const sourceName = 'White Bat Audio';
    const sourceUrl = 'https://whitebataudio.com/';
    const license = 'Free Music License - attribution requise';
    const licenseUrl = 'https://whitebataudio.com/license-agreement/';
    const attribution = 'Music by Karl Casey @ White Bat Audio';
    const files = [
        ['akira', 'Karl Casey - Akira.mp3', 'Electronique', 208, 'electronic cyberpunk synth beats'],
        ['andromeda', 'Karl Casey - Andromeda.mp3', 'Ambient', 157, 'ambient space deep cinematic'],
        ['artificial-intelligence', 'Karl Casey - Artificial Intelligence.mp3', 'Cinematique', 1295, 'cinematic ai cyber long form'],
        ['black-tar', 'Karl Casey - Black Tar.mp3', 'Beats', 206, 'beats dark bass energy'],
        ['blade-runner', 'Karl Casey - Blade Runner.mp3', 'Cinematique', 160, 'cinematic synth futuristic'],
        ['chrome', 'Karl Casey - Chrome.mp3', 'Electronique', 207, 'electronic chrome cyber synth'],
        ['cyberpunk', 'Karl Casey - Cyberpunk.mp3', 'Electronique', 199, 'electronic cyberpunk night drive'],
        ['dark-matter', 'Karl Casey - Dark Matter.mp3', 'Ambient', 77, 'ambient dark matter space'],
        ['empty-streets', 'Karl Casey - Empty Streets.mp3', 'Chill', 199, 'chill night urban lofi'],
        ['exosuit', 'Karl Casey - Exosuit.mp3', 'Epique', 65, 'epic trailer synth power'],
        ['future-city', 'Karl Casey - Future City.mp3', 'Electronique', 108, 'electronic city futuristic'],
        ['ghost-shell', 'Karl Casey - Ghost in the Shell.mp3', 'Cinematique', 165, 'cinematic anime cyber'],
        ['hackers', 'Karl Casey - Hackers.mp3', 'Beats', 196, 'beats tech hacker electronic'],
        ['neon-blood', 'Karl Casey - Neon Blood.mp3', 'Electronique', 84, 'electronic neon dark'],
        ['neon-city', 'Karl Casey - Neon City.mp3', 'Electronique', 216, 'electronic neon city cyberpunk'],
        ['neuromancer', 'Karl Casey - Neuromancer.mp3', 'Electronique', 108, 'electronic neuromancer cyberpunk'],
        ['night-drive', 'Karl Casey - Night Drive.mp3', 'Chill', 109, 'chill drive night synth'],
        ['overdrive', 'Karl Casey - Overdrive.mp3', 'Rock', 181, 'rock synth overdrive energy'],
        ['replicant', 'Karl Casey - Replicant.mp3', 'Ambient', 101, 'ambient replicant future'],
        ['system-failure', 'Karl Casey - System Failure.mp3', 'Cinematique', 223, 'cinematic tension glitch'],
        ['the-grid', 'Karl Casey - The Grid.mp3', 'Beats', 75, 'beats grid electronic'],
        ['tokyo-rain', 'Karl Casey - Tokyo Rain.mp3', 'Chill', 216, 'chill rain tokyo lofi'],
        ['virtual-reality', 'Karl Casey - Virtual Reality.mp3', 'Electronique', 37, 'electronic virtual reality'],
    ];

    const tracks = files.map(([id, fileName, trackGenre, duration, tags]) => ({
        id,
        title: fileName.replace(/\.mp3$/, '').replace('Karl Casey - ', ''),
        genre: trackGenre,
        duration,
        previewUrl: `/music/${encodeURIComponent(fileName)}`,
        url: `/music/${encodeURIComponent(fileName)}`,
        tags,
        sourceName,
        sourceUrl,
        license,
        licenseUrl,
        attribution,
        rightsStatus: 'credit-required',
    }));

    let filtered = tracks;
    if (genre) {
        const genreLower = genre.toLowerCase();
        filtered = filtered.filter(t => t.tags.includes(genreLower) || t.genre.toLowerCase().includes(genreLower));
    }
    if (query) {
        const q = query.toLowerCase();
        filtered = filtered.filter(t => t.title.toLowerCase().includes(q) || t.tags.includes(q) || t.genre.toLowerCase().includes(q));
    }
    return filtered;
}
