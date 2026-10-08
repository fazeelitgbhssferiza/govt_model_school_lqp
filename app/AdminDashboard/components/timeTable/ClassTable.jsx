'use client'

import { useState, useEffect } from 'react'
import { classesData, teachersData } from '@/app/AdminDashboard/data/dummyData'
import EditableTimetable from '../timeTable/EditableTimetable'

import useToast from './useToast'


export default function ClassTable() {
  const [selectedClass, setSelectedClass] = useState('')
  const [data, setData] = useState([])
  const [originalData, setOriginalData] = useState([]) // 🔥 for reset
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const { showToast, Toast } = useToast()

  // 🔥 LOAD CLASS DATA (SAFE CLONE)
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
        setOriginalData(cloned) // 🔥 save original
        setLoading(false)
      }, 500)
    }
  }, [selectedClass])

  // 🔥 TEACHER NAME
  const getTeacherName = (id) => {
    const teacher = teachersData.find(t => t.id === id)
    return teacher ? teacher.name : '-'
  }

  // 🔥 EDIT FUNCTION (REAL WORKING)
  const handleEdit = (row) => {
    const newSubject = prompt('Edit Subject', row.subject)
    if (!newSubject) return

    const updated = data.map(item =>
      item.id === row.id ? { ...item, subject: newSubject } : item
    )

    setData(updated)
    showToast('Updated successfully')
  }

  // 🔥 DELETE FUNCTION
  const handleDelete = (id) => {
    setData(prev => prev.filter(item => item.id !== id))
    showToast('Deleted successfully')
  }

  // 🔥 RESET FIXED
  const handleReset = () => {
    setData(JSON.parse(JSON.stringify(originalData)))
    showToast('Reset successful')
  }

  // 🔥 DRAG START
  const handleDrag = (e, index) => {
    e.dataTransfer.setData('index', index.toString())
  }

  // 🔥 DROP FIXED
  const handleDrop = (e, index) => {
    const draggedIndex = Number(e.dataTransfer.getData('index'))

    const updated = [...data]
    const draggedItem = updated[draggedIndex]

    updated.splice(draggedIndex, 1)
    updated.splice(index, 0, draggedItem)

    setData(updated)
    showToast('Reordered!')
  }

  // 🔥 SEARCH SAFE
  const filtered = data.filter(row =>
    (row.subject || '').toLowerCase().includes(search.toLowerCase())
  )
  

  return (
    <div className="bg-white p-4 rounded-2xl shadow">
      <Toast />

      {/* 🔥 CONTROLS */}
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
          {/* 🔥 USE EDITABLE TABLE HERE */}
      {selectedClassData && (
        <EditableTimetable
          initialData={selectedClassData.timetable}
        />
      )}
      
        <input
          placeholder="Search subject..."
          className="border p-2 rounded"
          onChange={(e) => setSearch(e.target.value)}
        />

        <button
          onClick={handleReset}
          className="bg-gray-200 px-3 rounded hover:bg-gray-300"
        >
          Reset
        </button>
      </div>

      {/* 🔥 LOADING */}
      {loading ? (
        <p className="text-gray-500">Loading timetable...</p>
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
            {filtered.map((row, index) => (
              <tr
                key={row.id}
                draggable
                onDragStart={(e) => handleDrag(e, index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, index)}
                className="hover:bg-gray-50 cursor-move"
              >
                <td>{row.period}</td>
                <td>{row.time}</td>
                <td>{row.subject}</td>
                <td>{getTeacherName(row.teacherId)}</td>

                <td className="flex gap-2">
                  <button
                    onClick={() => handleEdit(row)}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(row.id)}
                    className="text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
