'use client';

import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';

export default function ResultFilters({ filters, onFilterChange, classes = [] }) {
  const handleSearchChange = (e) => {
    onFilterChange({
      ...filters,
      searchQuery: e.target.value
    });
  };

  const handleClassChange = (e) => {
    onFilterChange({
      ...filters,
      class: e.target.value
    });
  };

  const handleReset = () => {
    onFilterChange({
      searchQuery: '',
      class: 'all'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Search Student
          </label>
          <Input
            placeholder="Search by name, registration no, or father's name..."
            value={filters.searchQuery}
            onChange={handleSearchChange}
            className="rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Filter by Class
          </label>
          <Select
            value={filters.class}
            onChange={handleClassChange}
            options={['all', ...classes]}
            className="rounded-lg"
          />
        </div>
        <div className="flex items-end">
          <Button 
            onClick={handleReset}
            className="bg-slate-100 text-slate-700 hover:bg-slate-200 w-full"
          >
            Clear Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
