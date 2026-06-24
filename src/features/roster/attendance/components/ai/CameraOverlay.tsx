import React, { useRef, useEffect } from 'react';
import * as faceapi from '@vladmandic/face-api';

interface CameraOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  box?: faceapi.Box;
  isMatch: boolean;
  matchScore: number;
}

export const CameraOverlay: React.FC<CameraOverlayProps> = ({
  videoRef,
  box,
  isMatch,
  matchScore,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // Đảm bảo canvas cùng kích thước với video
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (box) {
      const color = isMatch ? '#00cc66' : '#ff4444';
      const text = `Tương đồng: ${matchScore}%`;
      
      // SỬA LỖI LỆCH MẶT / NGƯỢC CAMERA: 
      // Do video được mirror bằng CSS scaleX(-1), ta tính tọa độ X đã được lật gương đồng bộ
      const mirroredX = canvas.width - box.x - box.width;
      
      // Vẽ Box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(mirroredX, box.y, box.width, box.height);

      // Nền Text
      ctx.fillStyle = color;
      ctx.font = '16px "Inter", sans-serif';
      const textWidth = ctx.measureText(text).width;
      ctx.fillRect(mirroredX, box.y - 30, textWidth + 10, 30);

      // Text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, mirroredX + 5, box.y - 10);
    }
  }, [box, isMatch, matchScore, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover', // Đảm bảo khớp tỉ lệ co giãn và cắt (crop) giống video
        pointerEvents: 'none'
      }}
    />
  );
};
