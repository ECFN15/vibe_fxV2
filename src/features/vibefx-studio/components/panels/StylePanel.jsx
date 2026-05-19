import React from 'react';
import { Zap, Sliders, Droplet, Sun, Contrast, Circle, Thermometer, Sunrise, Sunset, Palette, Sparkles, Crosshair, Wind } from 'lucide-react';
import { PRESET_CATEGORIES } from '../../data/constants';

import ControlGroup from '../ui/ControlGroup';
import QuickButton from '../ui/QuickButton';

import { ArrowLeft } from 'lucide-react';

const SectionTitle = ({ icon, label, isDarkMode }) => (
    <h3 className={`text-[10px] font-mono uppercase tracking-widest flex items-center gap-2 mt-6 mb-3 pb-2 border-b ${isDarkMode ? 'text-neutral-500 border-neutral-800' : 'text-gray-400 border-gray-200'}`}>
        {icon} {label}
    </h3>
);

const StylePanel = ({ isDarkMode, activeCategory, setActiveCategory, filters, setFilters, images }) => {
    if (activeCategory) {
        return (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-300">
                <button onClick={() => setActiveCategory(null)} className={`mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors self-start ${isDarkMode ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-black'}`}><ArrowLeft size={14} /> Retour</button>
                <div className={`rounded-2xl p-4 mb-6 border flex items-center gap-4 ${isDarkMode ? 'bg-neutral-800/50 border-neutral-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-neutral-800' : 'bg-gray-100'} ${activeCategory.color}`}>{activeCategory.icon}</div>
                    <div><h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{activeCategory.label}</h2><p className={`text-xs ${isDarkMode ? 'text-neutral-400' : 'text-gray-500'}`}>{activeCategory.sub}</p></div>
                </div>
                <div className="space-y-2">
                    {activeCategory.profiles.map((profile, idx) => (
                        <button key={idx} onClick={() => setFilters(profile.filters)} className={`w-full border p-4 rounded-xl text-left transition-all group active:scale-[0.98] ${isDarkMode ? 'bg-neutral-800/40 hover:bg-neutral-800 border-neutral-800 hover:border-neutral-600' : 'bg-white hover:bg-gray-50 border-gray-100 hover:border-gray-300 shadow-sm'}`}>
                            <div className="flex justify-between items-center mb-1"><span className={`font-semibold text-sm transition-colors ${isDarkMode ? 'text-neutral-200 group-hover:text-indigo-400' : 'text-gray-700 group-hover:text-indigo-600'}`}>{profile.name}</span>{profile.filters.tintIntensity > 0 && <div className="w-2.5 h-2.5 rounded-full shadow-sm ring-1 ring-white/10" style={{ backgroundColor: profile.filters.tintColor }} />}</div>
                            <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-neutral-500 group-hover:text-neutral-400' : 'text-gray-400 group-hover:text-gray-500'}`}>{profile.desc}</p>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="mb-8">
                <h2 className={`text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}><Zap size={14} className="text-yellow-500" /> Styles</h2>
                <div className="grid grid-cols-2 gap-3">
                    {PRESET_CATEGORIES.map(cat => (<QuickButton key={cat.id} label={cat.label} sub={cat.sub} color={cat.color} icon={cat.icon} onClick={() => setActiveCategory(cat)} disabled={!images.length} isDarkMode={isDarkMode} />))}
                </div>
            </div>

            <div className={`h-px w-full mb-4 ${isDarkMode ? 'bg-neutral-800' : 'bg-gray-100'}`} />

            <h2 className={`text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2 ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}><Sliders size={14} className="text-indigo-500" /> Ajustements</h2>

            {/* ── TONALITÉ ── */}
            <SectionTitle icon={<Sun size={12} className="text-amber-400" />} label="Tonalité" isDarkMode={isDarkMode} />
            <ControlGroup label="Lumière" icon={<Sun size={14} />} value={filters.brightness !== undefined ? filters.brightness : 100} onChange={(v) => setFilters({ ...filters, brightness: v })} min={0} max={200} isDarkMode={isDarkMode} />
            <ControlGroup label="Contraste" icon={<Contrast size={14} />} value={filters.contrast !== undefined ? filters.contrast : 100} onChange={(v) => setFilters({ ...filters, contrast: v })} min={0} max={200} isDarkMode={isDarkMode} />
            <ControlGroup label="Hautes Lumières" icon={<Sunrise size={14} />} value={filters.highlights || 0} onChange={(v) => setFilters({ ...filters, highlights: v })} min={-100} max={100} isDarkMode={isDarkMode} />
            <ControlGroup label="Ombres" icon={<Sunset size={14} />} value={filters.shadows || 0} onChange={(v) => setFilters({ ...filters, shadows: v })} min={-100} max={100} isDarkMode={isDarkMode} />

            {/* ── COULEUR ── */}
            <SectionTitle icon={<Palette size={12} className="text-pink-400" />} label="Couleur" isDarkMode={isDarkMode} />
            <ControlGroup label="Saturation" icon={<Circle size={14} />} value={filters.saturation !== undefined ? filters.saturation : 100} onChange={(v) => setFilters({ ...filters, saturation: v })} min={0} max={200} isDarkMode={isDarkMode} />
            <ControlGroup label="Vibrance" icon={<Palette size={14} />} value={filters.vibrance || 0} onChange={(v) => setFilters({ ...filters, vibrance: v })} min={-100} max={100} isDarkMode={isDarkMode} />
            <ControlGroup label="Température" icon={<Thermometer size={14} />} value={filters.temperature || 0} onChange={(v) => setFilters({ ...filters, temperature: v })} min={-50} max={50} isDarkMode={isDarkMode} />

            {/* ── DÉTAILS ── */}
            <SectionTitle icon={<Sparkles size={12} className="text-cyan-400" />} label="Détails" isDarkMode={isDarkMode} />
            <ControlGroup label="Clarté" icon={<Sparkles size={14} />} value={filters.clarity || 0} onChange={(v) => setFilters({ ...filters, clarity: v })} min={-100} max={100} isDarkMode={isDarkMode} />
            <ControlGroup label="Netteté" icon={<Crosshair size={14} />} value={filters.sharpness || 0} onChange={(v) => setFilters({ ...filters, sharpness: v })} min={0} max={100} isDarkMode={isDarkMode} />
            <ControlGroup label="Anti-brume" icon={<Wind size={14} />} value={filters.dehaze || 0} onChange={(v) => setFilters({ ...filters, dehaze: v })} min={0} max={100} isDarkMode={isDarkMode} />

            {/* ── EFFETS ── */}
            <SectionTitle icon={<Droplet size={12} className="text-indigo-400" />} label="Effets" isDarkMode={isDarkMode} />
            <ControlGroup label="Grain" icon={<Droplet size={14} />} value={filters.grain || 0} onChange={(v) => setFilters({ ...filters, grain: v })} min={0} max={100} isDarkMode={isDarkMode} />

            <div className={`p-4 rounded-xl border transition-colors mt-4 mb-6 ${isDarkMode ? 'bg-neutral-800/30 border-neutral-800' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex justify-between items-center mb-3">
                    <span className={`text-xs font-bold flex items-center gap-2 ${isDarkMode ? 'text-neutral-300' : 'text-gray-700'}`}><Thermometer size={14} className="text-rose-400" /> Teinte</span>
                    <input type="color" value={filters.tintColor || '#ffffff'} onChange={(e) => setFilters({ ...filters, tintColor: e.target.value })} className="w-6 h-6 rounded-full bg-transparent border-none p-0 cursor-pointer" />
                </div>
                <ControlGroup label="Intensité" icon={<Circle size={12} />} value={filters.tintIntensity || 0} onChange={(v) => setFilters({ ...filters, tintIntensity: v })} min={0} max={100} isDarkMode={isDarkMode} />
            </div>
        </div>
    );
};

export default StylePanel;
