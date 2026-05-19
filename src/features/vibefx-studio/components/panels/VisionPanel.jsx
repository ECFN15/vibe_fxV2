import React, { useMemo } from 'react';
import { Monitor, ArrowLeft, Sliders, Palette, Film, Contrast } from 'lucide-react';
import { CAMERA_BRANDS } from '../../data/constants';
import { DEFAULT_FILTERS } from '../../hooks/useStudioFilters';
import ControlGroup from '../ui/ControlGroup';

const VisionPanel = ({ isDarkMode, selectedBrand, setSelectedBrand, images, filters, setFilters }) => {

    // Derived sub-categories
    const groupedProfiles = useMemo(() => {
        if (!selectedBrand) return {};
        const groups = { 'Couleur': [], 'Monochrome': [], 'Cinéma': [] };

        selectedBrand.profiles.forEach(profile => {
            const name = profile.name.toLowerCase();
            const desc = profile.desc.toLowerCase();

            if (name.includes('mono') || name.includes('b&w') || name.includes('acros') || name.includes('tri-x') || name.includes('bw')) {
                groups['Monochrome'].push(profile);
            } else if (name.includes('cin') || name.includes('eterna') || name.includes('800t') || name.includes('50d') || desc.includes('ciné') || name.includes('vistavision') || desc.includes('cinematic')) {
                groups['Cinéma'].push(profile);
            } else {
                groups['Couleur'].push(profile);
            }
        });

        return groups;
    }, [selectedBrand]);

    const handleApplyProfile = (profileFilters) => {
        // Spread defaults first so new v3 params reset to neutral when switching profiles
        const activeIntensity = filters?.filterIntensity !== undefined ? filters.filterIntensity : 100;
        setFilters({ ...DEFAULT_FILTERS, ...profileFilters, filterIntensity: activeIntensity });
    };

    const handleIntensityChange = (val) => {
        setFilters({ ...filters, filterIntensity: val });
    };

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 relative">
            {!selectedBrand ? (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <h2 className={`text-[10px] font-mono uppercase tracking-widest mb-6 flex items-center gap-2 ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}><Monitor size={14} className="text-indigo-500" /> Constructeurs</h2>
                    <div className="grid grid-cols-1 gap-3">
                        {CAMERA_BRANDS.map(brand => (
                            <button key={brand.id} onClick={() => setSelectedBrand(brand)} disabled={!images.length} className={`group relative h-16 w-full rounded-sm overflow-hidden border transition-all disabled:opacity-50 ${isDarkMode ? 'border-neutral-800 hover:border-neutral-600 bg-black' : 'border-gray-200 hover:border-gray-400 bg-white'}`}>
                                <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${brand.color} opacity-80`} />
                                <div className={`absolute inset-0 bg-gradient-to-r ${brand.color} opacity-0 group-hover:opacity-10 transition duration-300`} />
                                <div className="absolute inset-0 pl-5 pr-4 flex items-center justify-between">
                                    <div className="text-left flex flex-col justify-center">
                                        <span className={`block font-bold text-sm tracking-wide transition duration-300 ${isDarkMode ? 'text-neutral-200 group-hover:text-white' : 'text-gray-800 group-hover:text-black'}`}>{brand.name}</span>
                                        <span className={`text-[10px] uppercase font-mono tracking-widest ${isDarkMode ? 'text-neutral-500' : 'text-gray-500'}`}>{brand.desc}</span>
                                    </div>
                                    <ArrowLeft size={14} className={`rotate-180 transition ${isDarkMode ? 'text-neutral-600 group-hover:text-neutral-300' : 'text-gray-300 group-hover:text-gray-600'}`} />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-300">
                    <button onClick={() => setSelectedBrand(null)} className={`mb-6 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest transition self-start ${isDarkMode ? 'text-neutral-500 hover:text-white' : 'text-gray-500 hover:text-black'}`}><ArrowLeft size={14} /> Retour</button>

                    <div className={`p-4 mb-6 border-l-2 flex flex-col gap-1 ${isDarkMode ? 'border-indigo-500 bg-gradient-to-r from-neutral-900 to-black' : 'border-indigo-500 bg-gradient-to-r from-gray-50 to-white'}`}>
                        <h2 className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedBrand.name}</h2>
                        <p className={`text-[10px] font-mono uppercase tracking-widest ${isDarkMode ? 'text-neutral-500' : 'text-gray-500'}`}>{selectedBrand.desc}</p>

                        <div className={`pt-4 mt-3 border-t ${isDarkMode ? 'border-neutral-800' : 'border-gray-200'}`}>
                            <ControlGroup
                                label="Intensité globale"
                                icon={<Sliders size={14} className="text-indigo-400" />}
                                value={filters?.filterIntensity !== undefined ? filters.filterIntensity : 100}
                                onChange={handleIntensityChange}
                                min={0}
                                max={100}
                                isDarkMode={isDarkMode}
                            />
                        </div>
                    </div>

                    <div className="space-y-6 pb-6">
                        {['Couleur', 'Monochrome', 'Cinéma'].map(category => (
                            groupedProfiles[category].length > 0 && (
                                <div key={category} className="space-y-3">
                                    <h3 className={`text-[10px] font-mono uppercase tracking-widest flex items-center gap-2 pb-2 border-b ${isDarkMode ? 'text-neutral-500 border-neutral-800' : 'text-gray-400 border-gray-200'}`}>
                                        {category === 'Couleur' && <Palette size={12} className="text-indigo-400" />}
                                        {category === 'Monochrome' && <Contrast size={12} className="text-neutral-400" />}
                                        {category === 'Cinéma' && <Film size={12} className="text-amber-400" />}
                                        {category}
                                    </h3>
                                    <div className="space-y-2">
                                        {groupedProfiles[category].map((profile, idx) => (
                                            <button key={idx} onClick={() => handleApplyProfile(profile.filters)} className={`w-full border-b border-l-2 border-l-transparent p-3 text-left transition-all group active:scale-[0.98] ${isDarkMode ? 'border-b-neutral-800 hover:border-l-indigo-500 hover:bg-neutral-900/80' : 'border-b-gray-100 hover:border-l-indigo-500 hover:bg-gray-50'}`}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className={`font-bold text-xs tracking-wide transition ${isDarkMode ? 'text-neutral-300 group-hover:text-white' : 'text-gray-700 group-hover:text-black'}`}>{profile.name}</span>
                                                    <div className="flex items-center gap-1">
                                                        {profile.filters.shadowTint && <div className="w-1.5 h-1.5 rounded-none ring-1 ring-black/50" style={{ backgroundColor: profile.filters.shadowTint }} />}
                                                        {(!profile.filters.shadowTint && profile.filters.highlightTint) && <div className="w-1.5 h-1.5 rounded-none ring-1 ring-black/50" style={{ backgroundColor: profile.filters.highlightTint }} />}
                                                    </div>
                                                </div>
                                                <p className={`text-[10px] font-mono leading-relaxed mt-1 ${isDarkMode ? 'text-neutral-500 group-hover:text-neutral-400' : 'text-gray-500 group-hover:text-gray-600'}`}>{profile.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default VisionPanel;
