'use client'

import { useState } from 'react'
import { teachersData } from '@/app/AdminDashboard/data/dummyData'


import useToast from './useToast'

export default function EditableTimetable({ initialData }) {
  const [data, setData] = useState(
    JSON.parse(JSON.stringify(initialData))
  )
  const [originalData, setOriginalData] = useState(
    JSON.parse(JSON.stringify(initialData))
  )
  const [editingRow, setEditingRow] = useState(null)

  const { showToast, Toast } = useToast()

  const getTeacherName = (id) => {
    const t = teachersData.find(t => t.id === id)
    return t ? t.name : '-'
  }

  const handleEdit = (row) => setEditingRow({ ...row })

  const handleChange = (field, value) => {
    setEditingRow(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    const updated = data.map(item =>
      item.period === editingRow.period ? editingRow : item
    )
    setData(updated)
    setEditingRow(null)
    showToast('Updated successfully')
  }

  const handleDelete = (period) => {
    setData(prev => prev.filter(item => item.period !== period))
    showToast('Deleted')
  }

  const handleReset = () => {
    setData(JSON.parse(JSON.stringify(originalData)))
    showToast('Reset done')
  }

  return (
    <div>
      <Toast />

      <div className="flex justify-end mb-3">
        <button
          onClick={handleReset}
          className="bg-gray-200 px-3 py-1 rounded"
        >
          Reset
        </button>
      </div>

      <table className="w-full border">
        <thead className="bg-emerald-100">
          <tr>
            <th>Period</th>
            <th>Time</th>
            <th>Subject</th>
            <th>Teacher</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {data.map(row => {
            const isEditing = editingRow?.period === row.period

            return (
              <tr key={row.period}>
                <td>{row.period}</td>

                <td>
                  {isEditing ? (
                    <input
                      value={editingRow.time}
                      onChange={(e) =>
                        handleChange('time', e.target.value)
                      }
                      className="border p-1 w-full"
                    />
                  ) : (
                    row.time
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <input
                      value={editingRow.subject || ''}
                      onChange={(e) =>
                        handleChange('subject', e.target.value)
                      }
                      className="border p-1 w-full"
                    />
                  ) : (
                    row.subject
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <select
                      value={editingRow.teacherId || ''}
                      onChange={(e) =>
                        handleChange(
                          'teacherId',
                          Number(e.target.value)
                        )
                      }
                      className="border p-1 w-full"
                    >
                      <option value="">Select</option>
                      {teachersData.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    getTeacherName(row.teacherId)
                  )}
                </td>

                <td className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSave}
                        className="text-green-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingRow(null)}
                        className="text-gray-500"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEdit(row)}
                        className="text-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(row.period)}
                        className="text-red-500"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
