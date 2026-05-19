import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const Select = ({ value, onChange, options, isDarkMode, className = "" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Design System styles matching Mesh Studio
    const borderColor = isDarkMode ? 'border-[#171717]' : 'border-gray-200';
    const textPrimary = isDarkMode ? 'text-[#e5e5e5]' : 'text-gray-900';
    const bgDropdown = isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white';
    const itemHover = isDarkMode ? 'hover:bg-indigo-500/10' : 'hover:bg-gray-100';

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const selectedOption = options.find(opt => opt.value === value);

    const toggle = () => setIsOpen(!isOpen);

    const handleSelect = (val) => {
        onChange(val);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className={`relative inline-block ${className}`}>
            <button
                type="button"
                onClick={toggle}
                className={`flex items-center justify-between gap-3 border ${borderColor} rounded-sm font-mono text-[10px] outline-none ${textPrimary} px-3 py-1.5 transition-all hover:border-indigo-500/50 min-w-[140px] text-left uppercase tracking-widest bg-black/5`}
            >
                <span className="truncate">{selectedOption ? selectedOption.label : value}</span>
                <ChevronDown size={12} className={`shrink-0 transition-transform duration-300 ease-out ${isOpen ? 'rotate-180 opacity-100' : 'opacity-40'}`} />
            </button>

            {isOpen && (
                <div
                    className={`absolute bottom-full mb-1 left-0 w-full min-w-[180px] border ${borderColor} rounded-sm shadow-2xl z-50 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200 ${bgDropdown}`}
                    style={{
                        backdropFilter: isDarkMode ? 'blur(10px)' : 'none',
                        WebkitBackdropFilter: isDarkMode ? 'blur(10px)' : 'none'
                    }}
                >
                    <div className="py-1 max-h-60 overflow-y-auto custom-scrollbar">
                        {options.map((option) => {
                            const isSelected = option.value === value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    className={`w-full px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center justify-between ${isSelected
                                            ? 'bg-indigo-600 text-white'
                                            : `${textPrimary} ${itemHover}`
                                        }`}
                                >
                                    <span>{option.label}</span>
                                    {isSelected && <div className="w-1 h-1 rounded-full bg-white opacity-40 shadow-[0_0_8px_white]" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Select;
