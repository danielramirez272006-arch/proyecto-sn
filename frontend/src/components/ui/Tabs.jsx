import React from 'react';

export function Tabs({ tabs, activeTab, onChange, className = '' }) {
  return (
    <div className={`flex items-center space-x-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 ${className}`}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 select-none ${
              isActive
                ? 'bg-white text-[#501228] shadow-sm font-semibold'
                : 'text-slate-600 hover:text-[#111827] hover:bg-white/60'
            }`}
          >
            {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-[#501228]' : 'text-slate-400'}`} />}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-[#FDF2F4] text-[#501228]' : 'bg-slate-200 text-slate-700'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

