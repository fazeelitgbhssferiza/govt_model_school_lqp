'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import classService from '../../../../services/classService';

export default function ClassSectionsPage() {
  const params = useParams();
  const className = params?.classId ? decodeURIComponent(params.classId) : '';
  const [sections, setSections] = useState([]);

  const loadSections = useCallback(async () => {
    const result = await classService.getAll();
    if (result.success && Array.isArray(result.data)) {
      setSections(result.data.filter((item) => String(item.name) === String(className)));
    }
  }, [className]);

  useEffect(() => {
    loadSections();
    window.addEventListener('classesUpdated', loadSections);
    return () => window.removeEventListener('classesUpdated', loadSections);
  }, [loadSections]);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Class {className}</h1>
      {sections.map((item) => (
        <p key={item.id || `${item.name}-${item.section}`} className="text-base font-semibold text-slate-700">
          <strong>Section</strong> {item.section}
        </p>
      ))}
    </main>
  );
}
