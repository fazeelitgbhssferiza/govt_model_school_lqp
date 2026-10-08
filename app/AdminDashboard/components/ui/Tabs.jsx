export default function Tabs({ tabs, activeTab, onTabChange }) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="flex overflow-x-auto px-4 sm:px-6">
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => onTabChange(index)}
            className={`flex-shrink-0 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              activeTab === index
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            } ${index === 0 ? 'mr-6 sm:mr-8' : 'ml-6 sm:ml-8'}`}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
}
