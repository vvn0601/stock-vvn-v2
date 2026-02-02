import React, { useEffect } from 'react';

interface Props { 
  message: string; 
  type: 'success' | 'error'; 
  onClose: () => void; 
}

export const Toast: React.FC<Props> = ({ message, type, onClose }) => {
  useEffect(() => { 
    const timer = setTimeout(onClose, 3000); 
    return () => clearTimeout(timer); 
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce ${type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
      <i className={`fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}`}></i>
      <span className="text-sm font-bold">{message}</span>
    </div>
  );
};