export default function Tabs({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'class', label: 'Class Wise' },
    { id: 'teacher', label: 'Teacher Wise' },
    { id: 'general', label: 'General Time Table' },
  ]

  return (
    <div className="flex gap-4 border-b pb-2">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-4 py-2 rounded-xl ${
            activeTab === tab.id
              ? 'bg-emerald-500 text-white'
              : 'bg-gray-100'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}