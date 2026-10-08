'use client';
import { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import Toast from '../app/AdminDashboard/components/ui/Toast';
import './globals.css';

export default function RootLayout({ children }) {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <main>{children}</main>
          {toast && <Toast message={toast.message} type={toast.type} />}
        </ThemeProvider>
      </body>
    </html>
  );
}
