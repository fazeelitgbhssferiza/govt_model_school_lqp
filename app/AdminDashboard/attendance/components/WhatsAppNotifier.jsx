'use client';
import { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';

export default function WhatsAppNotifier() {
  const [queue, setQueue] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const savedQueue = localStorage.getItem('whatsappQueue');
    if (savedQueue) {
      setQueue(JSON.parse(savedQueue));
    }
  }, []);

  const processQueue = async () => {
    if (queue.length === 0 || sending) return;
    
    setSending(true);
    const currentQueue = [...queue];
    const message = currentQueue.shift();
    
    try {
      // Simulate WhatsApp API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`WhatsApp sent to ${message.phone}: ${message.message}`);
      
      setQueue(currentQueue);
      localStorage.setItem('whatsappQueue', JSON.stringify(currentQueue));
    } catch (error) {
      console.error('Failed to send WhatsApp:', error);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    processQueue();
  }, [queue]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {queue.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-3 max-w-xs border-l-4 border-green-500">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600">📱</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800">WhatsApp Notifications</p>
              <p className="text-xs text-slate-500">{queue.length} pending notification{queue.length !== 1 ? 's' : ''}</p>
            </div>
            {!sending && (
              <button
                onClick={() => processQueue()}
                className="text-xs text-green-600 hover:text-green-800"
              >
                Send Now
              </button>
            )}
          </div>
          {sending && (
            <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full animate-pulse w-1/2"></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}