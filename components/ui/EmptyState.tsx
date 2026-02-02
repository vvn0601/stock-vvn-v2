import React from 'react';

interface Props { 
  message: string; 
  subMessage?: string; 
  icon?: string; 
}

export const EmptyState: React.FC<Props> = ({ message, subMessage, icon = "box-open" }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-2xl">
    <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-gray-300 dark:text-slate-600">
      <i className={`fas fa-${icon} text-2xl`}></i>
    </div>
    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{message}</h3>
    {subMessage && <p className="text-xs text-gray-300 dark:text-slate-600 mt-1">{subMessage}</p>}
  </div>
);