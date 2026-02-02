import React from 'react';

export const Loading = () => (
  <div className="flex justify-center items-center p-8 text-blue-500 animate-pulse">
    <i className="fas fa-circle-notch fa-spin text-2xl"></i>
    <span className="ml-3 text-sm font-bold uppercase tracking-wider">資料載入中...</span>
  </div>
);