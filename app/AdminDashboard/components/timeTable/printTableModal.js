'use client'

import { useState, useEffect } from 'react'
import { classesData, teachersData } from '@/app/AdminDashboard/data/dummyData'
import useToast from './useToast'

export default function ClassTable() {
  const [selectedClass, setSelectedClass] = useState('')
  const [data, setData] = useState([])
  const [originalData, setOriginalData] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const [editingRow, setEditingRow] = useState(null)

  const { showToast, Toast } = useToast()

  // LOAD DATA
  useEffect(() => {
    if (selectedClass) {
      setLoading(true)

      setTimeout(() => {
        const cls = classesData.find(
          c => `${c.name}-${c.section}` === selectedClass
        )

        const cloned = cls
          ? JSON.parse(JSON.stringify(cls.timetable))
          : []

        setData(cloned)
        setOriginalData(cloned)
        setLoading(false)
      }, 500)
    }
  }, [selectedClass])

  const getTeacherName = (id) => {
    const teacher = teachersData.find(t => t.id === id)
    return teacher ? teacher.name : '-'
  }

  // EDIT START
  const handleEdit = (row) => {
    setEditingRow({ ...row })
  }

  // EDIT CHANGE
  const handleChange = (field, value) => {
    setEditingRow(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // SAVE EDIT
  const handleSave = () => {
    const updated = data.map(item =>
      item.id === editingRow.id ? editingRow : item
    )

    setData(updated)
    setEditingRow(null)
    showToast('Updated successfully')
  }

  // DELETE
  const handleDelete = (id) => {
    setData(prev => prev.filter(item => item.id !== id))
    showToast('Deleted successfully')
  }

  // RESET
  const handleReset = () => {
    setData(JSON.parse(JSON.stringify(originalData)))
    showToast('Reset successful')
  }

  // DRAG
  const handleDrag = (e, index) => {
    e.dataTransfer.setData('index', index.toString())
  }

  const handleDrop = (e, index) => {
    const draggedIndex = Number(e.dataTransfer.getData('index'))
    const updated = [...data]
    const draggedItem = updated[draggedIndex]

    updated.splice(draggedIndex, 1)
    updated.splice(index, 0, draggedItem)

    setData(updated)
    showToast('Reordered!')
  }

  // SEARCH
  const filtered = data.filter(row =>
    (row.subject || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="bg-white p-4 rounded-2xl shadow">
      <Toast />

      {/* CONTROLS */}
      <div className="flex gap-4 mb-4">
        <select
          onChange={(e) => setSelectedClass(e.target.value)}
          className="border p-2 rounded"
        >
          <option>Select Class</option>
          {classesData.map(c => (
            <option key={c.id}>
              {c.name}-{c.section}
            </option>
          ))}
        </select>

        <input
          placeholder="Search subject..."
          className="border p-2 rounded"
          onChange={(e) => setSearch(e.target.value)}
        />

        <button
          onClick={handleReset}
          className="bg-gray-200 px-3 rounded"
        >
          Reset
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
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
            {filtered.map((row, index) => {
              const isEditing = editingRow?.id === row.id

              return (
                <tr
                  key={row.id}
                  draggable={!isEditing}
                  onDragStart={(e) => handleDrag(e, index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, index)}
                  className="hover:bg-gray-50"
                >
                  <td>{row.period}</td>

                  {/* TIME */}
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

                  {/* SUBJECT */}
                  <td>
                    {isEditing ? (
                      <input
                        value={editingRow.subject}
                        onChange={(e) =>
                          handleChange('subject', e.target.value)
                        }
                        className="border p-1 w-full"
                      />
                    ) : (
                      row.subject
                    )}
                  </td>

                  {/* TEACHER */}
                  <td>
                    {isEditing ? (
                      <select
                        value={editingRow.teacherId || ''}
                        onChange={(e) =>
                          handleChange('teacherId', Number(e.target.value))
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

                  {/* ACTIONS */}
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
                          onClick={() => handleDelete(row.id)}
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
      )}
    </div>
  )
}
