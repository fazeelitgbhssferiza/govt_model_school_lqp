import { useEffect } from 'react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  headerClassName = '',
  titleClassName = '',
  closeButtonClassName = '',
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center p-2 sm:items-center sm:p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className={`relative max-h-[92vh] w-full overflow-hidden rounded-t-2xl bg-white shadow-xl transform transition-all sm:max-h-[calc(100vh-2rem)] sm:rounded-lg dark:bg-gray-800 ${sizes[size]}`}>
          <div className={`flex items-center justify-between gap-3 p-4 border-b dark:border-gray-700 ${headerClassName}`}>
            <h3 className={`text-lg font-semibold text-gray-900 dark:text-white sm:text-xl ${titleClassName}`}>{title}</h3>
            <button
              onClick={onClose}
              className={`flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ${closeButtonClassName}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="max-h-[calc(92vh-4.5rem)] overflow-y-auto p-4 sm:max-h-[calc(100vh-8rem)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
