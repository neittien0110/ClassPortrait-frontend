import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeStreamRef = useRef<MediaStream | null>(null); // Lưu trữ stream để dọn dẹp độc lập với videoRef
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      // Nếu đã có stream cũ đang chạy, hãy dừng nó trước
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      
      activeStreamRef.current = stream; // Ghi nhận stream đang hoạt động
      
      if (videoRef.current) {
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
          setIsCameraActive(true);
          setCameraError(null);
        };
        videoRef.current.srcObject = stream;
      } else {
        // Nếu component đã bị unmount trong lúc chờ getUserMedia
        stream.getTracks().forEach(track => track.stop());
        activeStreamRef.current = null;
      }
    } catch (err: any) {
      console.error('Error accessing webcam:', err);
      setCameraError(err.message || 'Không thể truy cập camera. Vui lòng cấp quyền.');
      setIsCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    // Luôn dừng stream qua activeStreamRef để tránh việc videoRef bị React reset về null trước khi kịp dọn dẹp
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach(track => track.stop());
      activeStreamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return { videoRef, isCameraActive, cameraError, startCamera, stopCamera };
}
