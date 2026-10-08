'use client'

import { useState } from 'react'

import { teachersData, getTeacherTimetable } from '@/app/AdminDashboard/data/dummyData'
import useToast from './useToast'

export default function TeacherTable() {
  const [teacherId, setTeacherId] = useState(null)
  const { showToast, Toast } = useToast()

  const data = teacherId ? getTeacherTimetable(Number(teacherId)) : []

  return (
    <div className="bg-white p-4 rounded-2xl shadow">
      <Toast />

      <select
        onChange={(e) => setTeacherId(e.target.value)}
        className="border p-2 rounded mb-4"
      >
        <option>Select Teacher</option>
        {teachersData.map(t => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      {data.length > 0 && (
        <table className="w-full border">
          <thead className="bg-blue-100">
            <tr>
              <th>Period</th>
              <th>Class</th>
              <th>Time</th>
              <th>Subject</th>
            </tr>
          </thead>

          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                <td>{row.period}</td>
                <td>{row.class}</td>
                <td>{row.time}</td>
                <td>{row.subject}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
