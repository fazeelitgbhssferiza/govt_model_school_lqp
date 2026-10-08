export default function Card({ title, value, subValue, breakdown, color, icon, children, className = '' }) {
  // Glass morphism base styles
  const glassBase = 'backdrop-blur-md bg-white/30 dark:bg-slate-800/30 border border-white/20 dark:border-slate-700/50 shadow-xl';
  
  // Color-specific glass styles
  const colorStyles = {
    blue: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 dark:from-blue-500/10 dark:to-cyan-500/10 border-blue-300/30 dark:border-blue-600/30',
    green: 'bg-gradient-to-br from-emerald-500/20 to-blue-500/20 dark:from-emerald-500/10 dark:to-blue-500/10 border-emerald-300/30 dark:border-emerald-600/30',
    purple: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 dark:from-purple-500/10 dark:to-pink-500/10 border-purple-300/30 dark:border-purple-600/30',
    blue: 'bg-gradient-to-br from-blue-500/20 to-emerald-500/20 dark:from-blue-500/10 dark:to-emerald-500/10 border-blue-300/30 dark:border-blue-600/30',
    amber: 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 dark:from-amber-500/10 dark:to-orange-500/10 border-amber-300/30 dark:border-amber-600/30',
    red: 'bg-gradient-to-br from-red-500/20 to-rose-500/20 dark:from-red-500/10 dark:to-rose-500/10 border-red-300/30 dark:border-red-600/30',
    default: 'bg-gradient-to-br from-slate-500/20 to-gray-500/20 dark:from-slate-500/10 dark:to-gray-500/10 border-slate-300/30 dark:border-slate-600/30'
  };

  const glassEffect = color ? colorStyles[color] : colorStyles.default;

  // If children are provided, render as a container card
  if (children) {
    return (
      <div className={`rounded-2xl backdrop-blur-md transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] ${glassBase} ${glassEffect} ${className}`}>
        <div className="p-6">
          {children}
        </div>
      </div>
    );
  }

  // Otherwise render as a stats card
  return (
    <div className={`rounded-2xl backdrop-blur-md transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] group ${glassBase} ${glassEffect} ${className}`}>
      <div className="p-6 relative overflow-hidden">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 tracking-wide uppercase">
              {title}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              {value}
            </p>
            {subValue && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-1">
                <span className="inline-block w-1 h-1 rounded-full bg-emerald-500"></span>
                {subValue}
              </p>
            )}
            {breakdown && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                {breakdown}
              </p>
            )}
          </div>
          {icon && (
            <div className="text-5xl opacity-80 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:scale-110 group-hover:rotate-3">
              {icon}
            </div>
          )}
        </div>

        {/* Decorative glass orb */}
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-white/20 to-transparent blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-gradient-to-tr from-white/20 to-transparent blur-2xl"></div>
      </div>
    </div>
  );
}