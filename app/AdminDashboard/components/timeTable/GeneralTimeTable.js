import { generalTimetable } from '@/app/AdminDashboard/data/dummyData'

export default function GeneralTable() {
  return (
    <div className="bg-white p-4 rounded-2xl shadow">
      <table className="w-full border">
        <thead className="bg-emerald-100">
          <tr>
            <th>Period</th>
            <th>Time</th>
          </tr>
        </thead>

        <tbody>
          {generalTimetable.map(row => (
            <tr key={row.id}>
              <td>{row.period}</td>
              <td>{row.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
