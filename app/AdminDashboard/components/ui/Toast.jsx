import { useEffect } from 'react';

export default function Toast({ message, type = 'info' }) {
  const types = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className={`${types[type]} text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2`}>
        {type === 'success' && <span>✓</span>}
        {type === 'error' && <span>✗</span>}
        {type === 'info' && <span>ℹ</span>}
        {type === 'warning' && <span>⚠</span>}
        <span>{message}</span>
      </div>
    </div>
  );
}