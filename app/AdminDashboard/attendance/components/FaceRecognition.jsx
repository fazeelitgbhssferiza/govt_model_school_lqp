'use client';
import { useState, useRef } from 'react';
import Button from '../../components/ui/Button';

export default function FaceRecognition({ onMatch, type, users = [] }) {
  const [capturing, setCapturing] = useState(false);
  const [message, setMessage] = useState('Ready to capture');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setMessage('Camera ready. Click capture to mark attendance.');
    } catch (error) {
      setMessage('Unable to access camera. Please check permissions.');
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      if (!users.length) {
        setMessage(`No ${type === 'student' ? 'students' : 'teachers'} available for recognition.`);
        return;
      }

      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      
      setCapturing(true);
      setMessage('Processing face recognition...');
      
      // Simulate face recognition
      setTimeout(() => {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        setMessage(`Face recognized: ${randomUser.name}`);
        setTimeout(() => {
          onMatch(randomUser.id);
          stopCamera();
          setCapturing(false);
        }, 1000);
      }, 2000);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-slate-900 rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-64 object-cover"
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        {!stream && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
            <p className="text-white">Camera not started</p>
          </div>
        )}
      </div>
      
      <div className={`text-center font-semibold ${capturing ? 'text-blue-600' : 'text-slate-700'}`}>
        {message}
      </div>
      
      <div className="flex gap-3 justify-center">
        {!stream ? (
          <Button onClick={startCamera} className="bg-blue-600 text-white">
            Start Camera
          </Button>
        ) : (
          <>
            <Button onClick={captureImage} disabled={capturing} className="bg-blue-600 text-white">
              {capturing ? 'Processing...' : 'Capture & Recognize'}
            </Button>
            <Button onClick={stopCamera} variant="secondary">
              Stop Camera
            </Button>
          </>
        )}
      </div>
      
      {capturing && (
        <div className="flex justify-center gap-2 mt-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-200"></div>
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-400 text-center">
          Note: This is a simulated face recognition. In production, integrate with facial recognition API or hardware.
        </p>
      </div>
    </div>
  );
}
