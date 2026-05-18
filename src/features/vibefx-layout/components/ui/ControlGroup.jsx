import React from 'react';

const ControlGroup = ({ label, icon, value, onChange, min, max, step = 1, desc, isDarkMode, unit = "" }) => (
  <div className="flex flex-col gap-1.5 mb-5 border-l-2 border-neutral-800 pl-3">
    <div className="flex justify-between items-end">
      <div className="flex flex-col">
        <span className={`flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest ${isDarkMode ? 'text-neutral-400' : 'text-gray-600'}`}>{icon} {label}</span>
        {desc && <span className={`text-[10px] leading-tight ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}>{desc}</span>}
      </div>
      <div className="relative group shrink-0 ml-4">
          <input 
            type="number" 
            value={value} 
            onChange={(e) => {
                let v = Number(e.target.value);
                if (v < min) v = min;
                if (v > max) v = max;
                onChange(v);
            }}
            className={`w-12 text-right font-mono text-xs bg-transparent border-b border-neutral-700 focus:border-indigo-500 outline-none pb-0.5 transition-colors ${isDarkMode ? 'text-white' : 'text-black'}`}
            min={min} max={max} step={step}
          />
          {unit && <span className="absolute right-0 -top-2 text-[8px] text-gray-500 font-mono">{unit}</span>}
      </div>
    </div>
    <input 
      type="range" 
      min={min} max={max} step={step}
      value={value} 
      onChange={(e) => onChange(Number(e.target.value))}
      className="slider mt-1"
    />
  </div>
);

export default ControlGroup;
