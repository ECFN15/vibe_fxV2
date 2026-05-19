export const PRESET_CATEGORIES = [
    {
        id: 'argentique', label: 'Argentique', sub: 'Film Look', icon: 'Film', color: 'text-amber-500', 
        profiles: [
            { name: 'Portra 400', desc: 'Peaux naturelles, chaleur douce', filters: { brightness: 110, contrast: 105, saturation: 110, sepia: 15, blur: 0, grain: 25, vignette: 10, tintColor: '#f3e5ab', tintIntensity: 15 } },
            { name: 'Gold 200', desc: 'Vacances, doré et contrasté', filters: { brightness: 105, contrast: 115, saturation: 130, sepia: 25, blur: 0, grain: 40, vignette: 20, tintColor: '#ffd700', tintIntensity: 10 } },
            { name: 'Fuji Superia', desc: 'Verts profonds, ombres froides', filters: { brightness: 100, contrast: 110, saturation: 115, sepia: 0, blur: 0, grain: 30, vignette: 15, tintColor: '#a8e6cf', tintIntensity: 20 } },
            { name: 'CineStill 800T', desc: 'Nuit, néons, halo', filters: { brightness: 105, contrast: 95, saturation: 110, sepia: 0, blur: 2, grain: 45, vignette: 30, tintColor: '#004968', tintIntensity: 30 } }
        ]
    },
    {
        id: 'bw', label: 'Monochrome', sub: 'Noir & Blanc', icon: 'Contrast', color: 'text-neutral-500', 
        profiles: [
            { name: 'Tri-X 400', desc: 'Contrasté, grain fort, reportage', filters: { brightness: 105, contrast: 145, saturation: 0, sepia: 0, blur: 0, grain: 65, vignette: 25, tintColor: '#ffffff', tintIntensity: 0 } },
            { name: 'Ilford HP5', desc: 'Gris doux, grain moyen, polyvalent', filters: { brightness: 100, contrast: 115, saturation: 0, sepia: 0, blur: 0, grain: 35, vignette: 10, tintColor: '#ffffff', tintIntensity: 0 } },
            { name: 'Film Noir', desc: 'Dramatique, ombres écrasées', filters: { brightness: 90, contrast: 160, saturation: 0, sepia: 0, blur: 1, grain: 50, vignette: 60, tintColor: '#000000', tintIntensity: 0 } }
        ]
    },
    { id: 'soft', label: 'Soft & Dreamy', sub: 'Douceur', icon: 'Sparkles', color: 'text-pink-400', profiles: [{ name: 'Orton Effect', desc: 'Glow magique', filters: { brightness: 115, contrast: 120, saturation: 110, sepia: 0, blur: 4, grain: 10, vignette: 15, tintColor: '#fff5e6', tintIntensity: 10 } }] }
];

export const CAMERA_BRANDS = [
  { id: 'fujifilm', name: 'Fujifilm', color: 'from-green-900 to-green-700', desc: 'Nostalgie & Film', profiles: [{ name: 'Classic Chrome', filters: { brightness: 105, contrast: 115, saturation: 75, sepia: 10, blur: 0, grain: 25, vignette: 20, tintColor: '#2c3e50', tintIntensity: 20 } }] },
  { id: 'kodak', name: 'Kodak', color: 'from-yellow-700 to-amber-600', desc: 'Chaleur & Portra', profiles: [{ name: 'Portra 400', filters: { brightness: 110, contrast: 100, saturation: 115, sepia: 15, blur: 0, grain: 35, vignette: 10, tintColor: '#f3e5ab', tintIntensity: 15 } }] }
];

export const FORMATS = [
    { id: 'insta-port', label: 'Portrait', w: 1080, h: 1350, ratio: 4/5, icon: 'Smartphone' },
    { id: 'insta-sq', label: 'Carré', w: 1080, h: 1080, ratio: 1/1, icon: 'Square' },
    { id: 'story', label: 'Story', w: 1080, h: 1920, ratio: 9/16, icon: 'Smartphone' },
];

export const TEMPLATES = [
    { id: 'minimal', label: 'Minimal', icon: 'Box', slots: 1 },
    { id: 'polaroid', label: 'Polaroid', icon: 'StickyNote', slots: 1 },
    { id: 'pip', label: 'Overlay', icon: 'Layers', slots: 2 },
    { id: 'filmstrip', label: 'Pellicule', icon: 'Columns', slots: 3 },
    { id: 'mosaic', label: 'Mosaïque', icon: 'LayoutTemplate', slots: 3 },
    { id: 'split', label: 'Duality', icon: 'Columns', slots: 2 },
    { id: 'grid4', label: 'Grid 2x2', icon: 'Grid', slots: 4 },
    { id: 'cinema', label: 'Cinéma', icon: 'Maximize', slots: 1 },
];
