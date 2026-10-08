'use client';
import { useState } from 'react';
import Button from '../../components/ui/Button';

export default function FingerprintScanner({ onMatch, type, users = [] }) {
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('Ready to scan');

  const startScan = () => {
    if (!users.length) {
      setMessage(`No ${type === 'student' ? 'students' : 'teachers'} available for scan.`);
      return;
    }

    setScanning(true);
    setMessage('Scanning fingerprint...');
    
    // Simulate fingerprint scanning
    setTimeout(() => {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      setMessage(`Fingerprint matched: ${randomUser.name}`);
      setTimeout(() => {
        onMatch(randomUser.id);
        setScanning(false);
      }, 1000);
    }, 2000);
  };

  return (
    <div className="text-center py-6">
      <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
        </svg>
      </div>
      
      <div className={`text-lg font-semibold mb-2 ${scanning ? 'text-blue-600' : 'text-slate-700'}`}>
        {message}
      </div>
      
      <p className="text-sm text-slate-500 mb-6">
        Place your finger on the scanner to mark attendance
      </p>
      
      {!scanning && (
        <Button onClick={startScan} className="bg-blue-600 text-white px-8">
          Start Scanning
        </Button>
      )}
      
      {scanning && (
        <div className="flex justify-center gap-2 mt-4">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-200"></div>
        </div>
      )}
      
      <div className="mt-6 pt-6 border-t border-slate-200">
        <p className="text-xs text-slate-400">Note: This is a simulated fingerprint scanner. In production, integrate with actual biometric hardware.</p>
      </div>
    </div>
  );
}
