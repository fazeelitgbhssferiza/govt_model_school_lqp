import { useState } from 'react'

export default function useToast() {
  const [message, setMessage] = useState(null)

  const showToast = (msg) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 2000)
  }

  const Toast = () =>
    message && (
      <div className="fixed top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-xl shadow">
        {message}
      </div>
    )

  return { showToast, Toast }
}