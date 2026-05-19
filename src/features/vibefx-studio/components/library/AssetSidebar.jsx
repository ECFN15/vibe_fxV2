import React, { useState } from 'react';
import { Search, Scan, Database, ChevronDown, ChevronRight, Trash2, RefreshCw } from 'lucide-react';
import Select from '../ui/Select';

export default function AssetSidebar({
    isDarkMode, categories, totalImages,
    selectedTheme, onSelectTheme, onScrape, onReset, isScraping,
    onReclassify, reclassifyStatus
}) {
    const [openCats, setOpenCats] = useState(Object.keys(categories));
    const [sortBy, setSortBy] = useState('top');
    const [limit, setLimit] = useState(10);
    const [scan, setScan] = useState(200);
    const [targetTheme, setTargetTheme] = useState('all');
    const [confirmReset, setConfirmReset] = useState(false);

    const toggleCat = (catId) => {
        if (openCats.includes(catId)) setOpenCats(openCats.filter(c => c !== catId));
        else setOpenCats([...openCats, catId]);
    };

    const handleStartScrape = () => {
        onScrape({
            themes: targetTheme === 'all' ? null : [targetTheme],
            limit, scan, tab: sortBy, resolution: 'high'
        });
    };

    const handleReset = () => {
        if (!confirmReset) {
            setConfirmReset(true);
            setTimeout(() => setConfirmReset(false), 3000);
            return;
        }
        onReset();
        setConfirmReset(false);
    };

    const isReclassifying = reclassifyStatus?.status === 'running';
    const reclassifyDone = reclassifyStatus?.status === 'done';

    return (
        <div className={`h-full flex flex-col font-mono text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <div className={`p-4 border-b tracking-widest uppercase font-bold text-[10px] flex items-center justify-between ${isDarkMode ? 'border-neutral-800 text-neutral-400' : 'border-gray-200 text-gray-500'}`}>
                <div className="flex items-center gap-2">
                    <Database size={14} /> Explorateur
                </div>
                <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-sm">
                    {totalImages || 0}
                </span>
            </div>

            {/* THEME TREE */}
            <div className={`flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 border-b ${isDarkMode ? 'border-neutral-800' : 'border-gray-200'}`}>
                {Object.entries(categories).map(([catId, cat]) => (
                    <div key={catId} className="flex flex-col">
                        <button
                            onClick={() => toggleCat(catId)}
                            className="flex items-center w-full uppercase tracking-wider text-[10px] py-2 px-2 hover:bg-indigo-500/10 text-left transition-colors"
                        >
                            <span className="mr-2">{openCats.includes(catId) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
                            {cat.label}
                        </button>

                        {openCats.includes(catId) && (
                            <div className="flex flex-col pl-6 pr-2 py-1 space-y-1">
                                {Object.entries(cat.themes).map(([themeId, theme]) => {
                                    const isSelected = selectedTheme === themeId;
                                    return (
                                        <button
                                            key={themeId}
                                            onClick={() => onSelectTheme(isSelected ? null : themeId)}
                                            className={`text-left text-[11px] py-1.5 px-2 rounded-sm transition-colors flex justify-between
                                            ${isSelected
                                                    ? 'bg-indigo-500/20 text-indigo-400 font-bold'
                                                    : 'hover:bg-neutral-800/40 text-neutral-400 hover:text-neutral-200'}`}
                                        >
                                            <span className="truncate pr-2">{theme.label}</span>
                                            {theme.count > 0 && <span className="opacity-50 text-[10px]">({theme.count})</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* SCRAPER CONTROLS */}
            <div className={`p-4 flex flex-col gap-4 bg-neutral-900/10`}>
                <div className="uppercase tracking-widest text-[10px] font-bold flex items-center gap-2 text-indigo-400">
                    <Scan size={14} /> Moteur de recherche
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {/* SORT BY */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase tracking-wider text-neutral-500">Tri</label>
                        <Select
                            value={sortBy}
                            onChange={setSortBy}
                            isDarkMode={isDarkMode}
                            options={[
                                { value: 'top', label: 'Populaire' },
                                { value: 'new', label: 'Récent' }
                            ]}
                            className="w-full"
                        />
                    </div>

                    {/* IMAGES PER THEME */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase tracking-wider text-neutral-500">Par thème</label>
                        <Select
                            value={limit}
                            onChange={v => setLimit(v)}
                            isDarkMode={isDarkMode}
                            options={[
                                { value: 5, label: '5 images' },
                                { value: 10, label: '10 images' },
                                { value: 20, label: '20 images' },
                                { value: 30, label: '30 images' },
                                { value: 50, label: '50 images' },
                                { value: 100, label: '100 images' }
                            ]}
                            className="w-full"
                        />
                    </div>

                    <div className="col-span-2 flex flex-col gap-1">
                        <label className="text-[10px] uppercase tracking-wider text-neutral-500">
                            Profondeur
                            <span className="normal-case tracking-normal text-neutral-600 ml-1">(pages scrollées sur MJ Explore)</span>
                        </label>
                        <Select
                            value={scan}
                            onChange={v => setScan(v)}
                            isDarkMode={isDarkMode}
                            options={[
                                { value: 50, label: 'Rapide (50 images)' },
                                { value: 100, label: 'Standard (100 images)' },
                                { value: 200, label: 'Max (200 images)' }
                            ]}
                            className="w-full"
                        />
                    </div>

                    {/* TARGET THEME */}
                    <div className="col-span-2 flex flex-col gap-1 mt-1">
                        <label className="text-[10px] uppercase tracking-wider text-neutral-500">Thème ciblé</label>
                        <Select
                            value={targetTheme}
                            onChange={setTargetTheme}
                            isDarkMode={isDarkMode}
                            options={[
                                { value: "all", label: "— Tous les thèmes —" },
                                ...Object.entries(categories).flatMap(([_, cat]) =>
                                    Object.entries(cat.themes).map(([k, t]) => ({
                                        value: k,
                                        label: t.label
                                    }))
                                )
                            ]}
                            className="w-full mt-1"
                        />
                    </div>
                </div>

                <div className="mt-2 space-y-2">
                    {/* LAUNCH */}
                    <button
                        onClick={handleStartScrape}
                        disabled={isScraping}
                        className={`w-full py-2.5 rounded-sm uppercase tracking-widest text-[10px] font-bold flex justify-center items-center gap-2 transition-all active:scale-[0.98] 
                        ${isScraping ? 'bg-neutral-800 text-neutral-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.2)]'}`}
                    >
                        <Search size={14} /> {isScraping ? 'Recherche en cours...' : 'Lancer la recherche'}
                    </button>

                    {/* RECLASSIFY */}
                    <button
                        onClick={onReclassify}
                        disabled={isReclassifying || isScraping}
                        className={`w-full py-2.5 rounded-sm uppercase tracking-widest text-[10px] font-bold flex justify-center items-center gap-2 transition-all active:scale-[0.98] relative overflow-hidden
                        ${isReclassifying
                                ? 'bg-amber-900/30 border border-amber-600/50 text-amber-400'
                                : reclassifyDone
                                    ? 'bg-emerald-900/30 border border-emerald-600/50 text-emerald-400'
                                    : 'border border-neutral-700 text-neutral-400 hover:text-amber-400 hover:border-amber-600/50 hover:bg-amber-900/20'
                            } ${isScraping && !isReclassifying ? 'opacity-30 pointer-events-none' : ''}`}
                    >
                        {/* Progress bar background */}
                        {isReclassifying && (
                            <div
                                className="absolute left-0 top-0 bottom-0 bg-amber-500/10 transition-all duration-300"
                                style={{ width: `${reclassifyStatus?.progress || 0}%` }}
                            />
                        )}
                        <RefreshCw size={12} className={isReclassifying ? 'animate-spin' : ''} />
                        <span className="relative z-10">
                            {isReclassifying
                                ? `Reclassification... ${reclassifyStatus?.progress || 0}%`
                                : reclassifyDone
                                    ? `✅ ${reclassifyStatus?.changed || 0} images reclassifiées`
                                    : 'Reclassifier les images'}
                        </span>
                    </button>

                    {/* RESET ALL */}
                    <button
                        onClick={handleReset}
                        disabled={isScraping}
                        className={`w-full py-2 rounded-sm uppercase tracking-widest text-[10px] font-bold flex justify-center items-center gap-2 transition-all active:scale-[0.98]
                        ${confirmReset
                                ? 'bg-red-600 hover:bg-red-500 text-white'
                                : 'border border-neutral-800 text-neutral-500 hover:text-red-400 hover:border-red-800'
                            } ${isScraping ? 'opacity-30 pointer-events-none' : ''}`}
                    >
                        <Trash2 size={12} /> {confirmReset ? 'Confirmer la suppression ?' : 'Tout réinitialiser'}
                    </button>
                </div>
            </div>
        </div>
    );
}
