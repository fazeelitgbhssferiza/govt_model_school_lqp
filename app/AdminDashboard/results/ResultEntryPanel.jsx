'use client';

import { useState, useEffect, useMemo } from 'react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { getDefaultSubjectTotal, getResultEntrySubjects } from '../../utils/results/subjectsConfig';
import { showToast } from '../../utils/helpers';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function ResultEntryPanel({ student, onSave, onCancel }) {
  const [selectedTerm, setSelectedTerm] = useState('monthlyTest');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [marksData, setMarksData] = useState({});
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeSubject, setActiveSubject] = useState(null);
  const [optionalSubjectNames, setOptionalSubjectNames] = useState({});
  const [customSubjects, setCustomSubjects] = useState([]);
  const [newSubjectName, setNewSubjectName] = useState('');

  const terms = [
    { value: 'monthlyTest', label: 'Montly Test', icon: 'MT', color: 'bg-amber-50 text-amber-700' },
    { value: 'firstTerm', label: '1st Term', icon: '📘', color: 'bg-blue-50 text-blue-700' },
    { value: 'secondTerm', label: '2nd Term', icon: '📗', color: 'bg-green-50 text-green-700' },
    { value: 'finalTerm', label: 'Final Term', icon: '📕', color: 'bg-purple-50 text-purple-700' }
  ];

  const isEcce = String(student.class || '').trim().toLowerCase() === 'ecce';
  const subjects = useMemo(() => [
    ...getResultEntrySubjects(student.class, student.group),
    ...(isEcce ? customSubjects : []),
  ], [customSubjects, isEcce, student.class, student.group]);

  useEffect(() => {
    if (!isEcce) {
      setCustomSubjects([]);
      return;
    }

    const savedSubjects = new Set();
    Object.values(student.results || {}).forEach((termResult) => {
      const entries = termResult?.months ? Object.values(termResult.months) : [termResult];
      entries.forEach((entry) => {
        Object.keys(entry?.subjects || {}).forEach((subject) => savedSubjects.add(subject));
      });
    });
    setCustomSubjects(Array.from(savedSubjects));
  }, [isEcce, student]);

  const addCustomSubject = () => {
    const subjectName = newSubjectName.trim();
    if (!subjectName) return;
    if (customSubjects.some((subject) => subject.toLowerCase() === subjectName.toLowerCase())) {
      showToast('This subject has already been added.', 'error');
      return;
    }
    setCustomSubjects((previous) => [...previous, subjectName]);
    setNewSubjectName('');
  };

  useEffect(() => {
    if (selectedTerm !== 'monthlyTest') {
      setSelectedMonth('');
      return;
    }

    const monthlyResult = student.results?.monthlyTest;
    setSelectedMonth(Object.keys(monthlyResult?.months || {})[0] || monthlyResult?.month || '');
  }, [selectedTerm, student]);

  // Load existing marks for selected term
  useEffect(() => {
    const termResult = student.results?.[selectedTerm];
    const selectedResult = selectedTerm === 'monthlyTest'
      ? termResult?.months?.[selectedMonth] || (termResult?.month === selectedMonth ? termResult : null)
      : termResult;
    const existingMarks = selectedResult?.subjects || {};
    const loadedMarks = {};
    subjects.forEach(sub => {
      const defaultTotal = getDefaultSubjectTotal(student.class, sub);
      loadedMarks[sub] = {
        obtained: existingMarks[sub]?.obtained !== undefined ? existingMarks[sub].obtained : '',
        total: existingMarks[sub]?.total !== undefined ? existingMarks[sub].total : defaultTotal,
        subjectName: existingMarks[sub]?.subjectName || ''
      };
    });
    setMarksData(loadedMarks);
    setOptionalSubjectNames(Object.fromEntries(
      subjects
        .filter((sub) => sub.startsWith('Optional Subject'))
        .map((sub) => [sub, existingMarks[sub]?.subjectName || ''])
    ));
    setRemarks(selectedResult?.remarks || '');
  }, [selectedMonth, selectedTerm, student, subjects]);

  const handleObtainedChange = (subject, value) => {
    const numValue = value === '' ? '' : Math.min(100, Math.max(0, Number(value)));
    setMarksData(prev => ({
      ...prev,
      [subject]: {
        ...prev[subject],
        obtained: numValue
      }
    }));
  };

  const handleTotalChange = (subject, value) => {
    const numValue = value === '' ? '' : Math.min(200, Math.max(1, Number(value)));
    setMarksData(prev => ({
      ...prev,
      [subject]: {
        ...prev[subject],
        total: numValue
      }
    }));
  };

  const handleSave = () => {
    if (selectedTerm === 'monthlyTest' && !selectedMonth) {
      showToast('Please select a month for the Monthly Test.', 'error');
      return;
    }

    // Validate marks
    let hasError = false;
    const validatedMarks = {};
    
    subjects.forEach(sub => {
      const obtained = marksData[sub]?.obtained;
      const total = marksData[sub]?.total;
      const defaultTotal = getDefaultSubjectTotal(student.class, sub);
      
      if (obtained === '' || obtained === null || obtained === undefined) {
        validatedMarks[sub] = {
          obtained: 0,
          total: total || defaultTotal,
          ...(sub.startsWith('Optional Subject') ? { subjectName: optionalSubjectNames[sub]?.trim() || '' } : {})
        };
      } else {
        const numObtained = Number(obtained);
        const numTotal = Number(total) || defaultTotal;
        
        if (isNaN(numObtained)) {
          showToast(`Invalid obtained marks for ${sub}. Please enter a valid number.`, 'error');
          hasError = true;
        } else if (numObtained < 0 || numObtained > numTotal) {
          showToast(`Obtained marks for ${sub} cannot exceed total marks (${numTotal}).`, 'error');
          hasError = true;
        } else {
          validatedMarks[sub] = {
            obtained: numObtained,
            total: numTotal,
            ...(sub.startsWith('Optional Subject') ? { subjectName: optionalSubjectNames[sub]?.trim() || '' } : {})
          };
        }
      }
    });

    if (hasError) return;

    const savedTermResult = {
      subjects: validatedMarks,
      month: selectedTerm === 'monthlyTest' ? selectedMonth : '',
      remarks: remarks || ''
    };
    const updatedStudent = {
      ...student,
      results: {
        ...student.results,
        [selectedTerm]: selectedTerm === 'monthlyTest'
          ? {
              ...(student.results?.monthlyTest || {}),
              months: {
                ...(student.results?.monthlyTest?.months || {}),
                [selectedMonth]: savedTermResult,
              },
            }
          : savedTermResult
      }
    };

    setSaving(true);
    setTimeout(() => {
      onSave(updatedStudent);
      setSaving(false);
    }, 500);
  };

  // Calculate statistics
  const calculateStats = () => {
    let totalObtained = 0;
    let totalMarks = 0;
    let subjectsWithMarks = 0;

    subjects.forEach(sub => {
      const obtained = marksData[sub]?.obtained;
      const total = marksData[sub]?.total;
      if (obtained !== '' && obtained !== null && obtained !== undefined && !isNaN(Number(obtained))) {
        totalObtained += Number(obtained);
        totalMarks += Number(total) || 100;
        subjectsWithMarks++;
      }
    });

    const percentage = totalMarks > 0 ? ((totalObtained / totalMarks) * 100).toFixed(2) : 0;
    const status = percentage >= 40 ? 'PASS' : 'FAIL';

    return { totalObtained, totalMarks, percentage, status, subjectsWithMarks };
  };

  const stats = calculateStats();

  const getTermColor = () => {
    const term = terms.find(t => t.value === selectedTerm);
    return term?.color || 'bg-slate-50 text-slate-700';
  };

  const getTermIcon = () => {
    const term = terms.find(t => t.value === selectedTerm);
    return term?.icon || '📚';
  };

  return (
    <div className="space-y-6">
      {/* Student Info Card */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-emerald-50 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl">👨‍🎓</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{student.name}</h3>
              <p className="text-sm text-slate-500">ID: {student.id} | Reg: {student.regNo}</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm font-medium text-blue-600">{student.class} - {student.section}</p>
            <p className="text-xs text-slate-500">Father: {student.fatherName}</p>
          </div>
        </div>
      </div>

      {/* Term Selector with Tabs */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-3">Select Term</label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          {terms.map((term) => (
            <button
              key={term.value}
              onClick={() => setSelectedTerm(term.value)}
              className={`p-3 rounded-xl text-center transition-all duration-200 ${
                selectedTerm === term.value
                  ? `${term.color} border-2 border-blue-500 shadow-md transform scale-[1.02]`
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-2 border-transparent'
              }`}
            >
              <span className="text-xl block mb-1">{term.icon}</span>
              <span className="text-sm font-medium">{term.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Statistics Card */}
        <div className={`rounded-xl p-4 transition-all duration-200 ${getTermColor()}`}>
          <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getTermIcon()}</span>
            <h4 className="font-semibold">
              {terms.find(t => t.value === selectedTerm)?.label} Statistics
            </h4>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
            stats.status === 'PASS' 
              ? 'bg-emerald-100 text-emerald-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {stats.status}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="text-center">
            <p className="text-xs text-slate-500">Total Marks</p>
            <p className="text-xl font-bold text-slate-800">{stats.totalMarks}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Obtained</p>
            <p className="text-xl font-bold text-blue-600">{stats.totalObtained}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Percentage</p>
            <p className="text-xl font-bold text-emerald-600">{stats.percentage}%</p>
          </div>
        </div>
      </div>

      {selectedTerm === 'monthlyTest' && (
        <Select
          label="Month"
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
          options={MONTHS}
          placeholder="Select month"
          required
        />
      )}

      {/* Marks Entry Section */}
      <div>
        {isEcce && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Add ECCE Subject</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={newSubjectName}
                onChange={(event) => setNewSubjectName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addCustomSubject();
                  }
                }}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="Write subject name"
              />
              <Button type="button" onClick={addCustomSubject} className="sm:w-auto">
                Add Subject
              </Button>
            </div>
          </div>
        )}
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <label className="text-sm font-semibold text-slate-700">Subject Marks</label>
          <span className="text-xs text-slate-500">{subjects.length} subjects</span>
        </div>
        
        <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
          {subjects.map((subject, index) => (
            <div 
              key={subject} 
              className={`bg-white border rounded-xl p-4 transition-all duration-200 ${
                activeSubject === subject 
                  ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' 
                  : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
              }`}
              onClick={() => setActiveSubject(subject)}
            >
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    marksData[subject]?.obtained && marksData[subject]?.obtained !== '' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    {index + 1}
                  </div>
                  {subject.startsWith('Optional Subject') ? (
                    <input
                      type="text"
                      value={optionalSubjectNames[subject] || ''}
                      onChange={(event) => setOptionalSubjectNames((previous) => ({
                        ...previous,
                        [subject]: event.target.value
                      }))}
                      onClick={(event) => event.stopPropagation()}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder="Write optional subject name"
                      aria-label={subject}
                    />
                  ) : (
                    <h4 className="font-medium text-slate-800">{subject}</h4>
                  )}
                </div>
                {marksData[subject]?.obtained && marksData[subject]?.obtained !== '' && (
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Entered
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    value={marksData[subject]?.total || ''}
                    onChange={(e) => handleTotalChange(subject, e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="e.g., 100"
                    min="1"
                    max="200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Obtained Marks
                  </label>
                  <input
                    type="number"
                    value={marksData[subject]?.obtained || ''}
                    onChange={(e) => handleObtainedChange(subject, e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="e.g., 85"
                    min="0"
                    max={marksData[subject]?.total || 100}
                  />
                </div>
              </div>
              
              {marksData[subject]?.obtained && marksData[subject]?.total && (
                <div className="mt-2 text-right">
                  <span className={`text-xs font-medium ${
                    Number(marksData[subject].obtained) >= (Number(marksData[subject].total) * 0.4)
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  }`}>
                    {((Number(marksData[subject].obtained) / Number(marksData[subject].total)) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Remarks Section */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Teacher's Remarks
        </label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
          placeholder="Add any remarks about the student's performance..."
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        <Button 
          variant="secondary" 
          onClick={onCancel} 
          disabled={saving}
          className="w-full rounded-xl border border-slate-300 px-6 py-2.5 transition-all hover:bg-slate-50 sm:w-auto"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={saving} 
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-2.5 text-white shadow-md transition-all hover:from-blue-700 hover:to-emerald-700 hover:shadow-lg disabled:opacity-50 sm:w-auto"
        >
          {saving ? (
            <>
              <svg className="animate-spin w-4 h-4 mr-2 inline" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Result
            </>
          )}
        </Button>
      </div>

      {/* Quick Tips */}
      <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
        <p className="flex items-center gap-1">
          <span className="text-blue-600">💡</span> 
          Tip: Total marks can be customized per subject. Obtained marks cannot exceed total marks.
        </p>
      </div>
    </div>
  );
}
