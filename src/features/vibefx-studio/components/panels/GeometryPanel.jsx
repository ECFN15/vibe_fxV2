import React from 'react';
import ControlGroup from '../ui/ControlGroup';

const GeometryPanel = ({
    isDarkMode,
    padding, setPadding,
    gap, setGap,
    customLayoutGap, setCustomLayoutGap,
    radius, setRadius,
    activeTemplate,
}) => {
    
    // Logique conditionnelle d'affichage selon le template
    // - polaroid : a ses propres marges et un design rigide -> On cache tout ou on met un message.
    // - minimal (Standard 1 zone) / cinema : n'ont pas d'espace entre les images (gap) car 1 seule image.
    // - pip (Picture-in-Picture) : gère l'image par-dessus, pas de gap standard.
    
    const isCustomTemplate = activeTemplate && activeTemplate.id === 'custom';
    const showGap = activeTemplate && activeTemplate.slots > 1 && activeTemplate.id !== 'pip';
    const isPolaroid = activeTemplate && activeTemplate.id === 'polaroid';

    return (
        <div className="w-full">
            <div className={`flex flex-col gap-4 py-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <div className={`p-4 rounded-2xl border flex flex-col gap-2 ${isDarkMode ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    
                    {isPolaroid ? (
                        <div className={`text-center py-4 px-2 text-xs opacity-70 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Le modèle Polaroïd utilise une géométrie fixe pré-définie. Les marges et arrondis ne sont pas modifiables pour ce design.
                        </div>
                    ) : (
                        <>
                            <ControlGroup label="Marge Externe (Padding)" value={padding} onChange={setPadding} min={0} max={150} unit="px" isDarkMode={isDarkMode}/>
                            
                            {isCustomTemplate ? (
                                <ControlGroup label="Marge entre blocs" value={customLayoutGap} onChange={setCustomLayoutGap} min={0} max={100} unit="px" isDarkMode={isDarkMode}/>
                            ) : showGap ? (
                                <ControlGroup label="Espacement Image (Gap)" value={gap} onChange={setGap} min={0} max={100} unit="px" isDarkMode={isDarkMode}/>
                            ) : null}
                            
                            <div className={`h-px w-full my-2 ${isDarkMode ? 'bg-neutral-800' : 'bg-gray-100'}`} />
                            <ControlGroup label="Arrondi Image (Radius)" value={radius} onChange={setRadius} min={0} max={150} unit="px" isDarkMode={isDarkMode}/>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
};

export default GeometryPanel;
