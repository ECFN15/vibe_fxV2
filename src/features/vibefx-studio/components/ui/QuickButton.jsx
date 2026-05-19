import React from 'react';

const QuickButton = ({ label, sub, color, icon, onClick, disabled, isDarkMode }) => (
  <button onClick={onClick} disabled={disabled} className={`${isDarkMode ? 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 hover:border-neutral-600' : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300'} p-3 text-left transition-all border disabled:opacity-50 group active:scale-[0.98] flex flex-col justify-between h-20 relative overflow-hidden`}>
    <div className={`absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity ${color}`}>{icon}</div>
    <span className={`block text-xs font-mono font-bold uppercase tracking-wider ${color} mt-auto`}>{label}</span>
    <span className={`${isDarkMode ? 'text-neutral-500' : 'text-gray-400'} text-[9px] font-mono leading-tight`}>{sub}</span>
    <div className={`absolute bottom-0 left-0 h-0.5 bg-current w-0 group-hover:w-full transition-all duration-500 ${color}`}></div>
  </button>
);

export default QuickButton;
