import { useState, useEffect } from 'react';
import * as faceapi from '@vladmandic/face-api';

// Cache trạng thái ở cấp độ module để tránh tải lại hoặc chạy lại quá trình khởi tạo mô hình
let globalModelsLoaded = false;
let globalLoadingPromise: Promise<void> | null = null;

export function useFaceModels() {
  const [modelsLoaded, setModelsLoaded] = useState(globalModelsLoaded);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  useEffect(() => {
    if (globalModelsLoaded) {
      setModelsLoaded(true);
      return;
    }

    let isMounted = true;

    const loadModels = async () => {
      try {
        const MODEL_URL = process.env.PUBLIC_URL + '/models';
        
        if (!globalLoadingPromise) {
          globalLoadingPromise = (async () => {
            // 1. Tải mô hình từ thư mục public
            // Chỉ load 3 model cần thiết cho SsdMobilenetv1 pipeline
            // TinyFaceDetector đã bị loại bỏ để đảm bảo nhất quán descriptor space
            await Promise.all([
              faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
              faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
              faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);

            // 2. Warm-up (chạy khởi động ấm) cho mô hình AI
            // face-api.js sử dụng backend TensorFlow.js. Lần đầu tiên chạy hàm detect,
            // nó sẽ biên dịch WebGL shaders làm đơ màn hình/đen camera khoảng 2-5 giây.
            // Việc chạy thử với canvas trống 1x1 ở đây giúp biên dịch trước các shader đó dưới nền.
            try {
              const dummyCanvas = document.createElement('canvas');
              dummyCanvas.width = 1;
              dummyCanvas.height = 1;
              // Warm-up với SsdMobilenetv1 để pre-compile WebGL shaders
              await faceapi.detectSingleFace(
                dummyCanvas,
                new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }),
              )
                .withFaceLandmarks()
                .withFaceDescriptor();
            } catch (warmupErr) {
              console.warn('AI warmup skipped or failed:', warmupErr);
            }

            globalModelsLoaded = true;
          })();
        }

        await globalLoadingPromise;
        
        if (isMounted) {
          setModelsLoaded(true);
        }
      } catch (err: any) {
        console.error('Error loading face-api models:', err);
        if (isMounted) {
          setLoadingError(err.message || 'Lỗi tải mô hình AI');
        }
        globalLoadingPromise = null; // Cho phép tải lại nếu lần đầu thất bại
      }
    };

    loadModels();

    return () => {
      isMounted = false;
    };
  }, []);

  return { modelsLoaded, loadingError };
}
