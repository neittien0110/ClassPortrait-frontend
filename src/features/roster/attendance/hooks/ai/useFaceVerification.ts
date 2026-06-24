import { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';

export const DEFAULT_FACE_DISTANCE_THRESHOLD = 0.4375;
export const FACE_SIMILARITY_THRESHOLD_OPTIONS = [
  { score: 60, distanceThreshold: 0.475 },
  { score: 65, distanceThreshold: 0.4625 },
  { score: 70, distanceThreshold: 0.45 },
  { score: 75, distanceThreshold: DEFAULT_FACE_DISTANCE_THRESHOLD },
  { score: 80, distanceThreshold: 0.425 },
  { score: 85, distanceThreshold: 0.4 },
  { score: 90, distanceThreshold: 0.325 },
] as const;
export type FaceSimilarityThresholdScore = typeof FACE_SIMILARITY_THRESHOLD_OPTIONS[number]['score'];
const VERIFICATION_WINDOW_SIZE = 7;
const MIN_MATCHED_SAMPLES = 5;
// Tăng từ 3 lên 5: cần 5/5 frame liên tiếp perfect để early-accept, giảm false positive
const EARLY_ACCEPT_SAMPLE_SIZE = 5;
const OVERLAY_SMOOTHING_SIZE = 3;
// Throttle giữa các frame SsdMobilenetv1: ~3fps hiệu dụng, cân bằng tốc độ và chính xác
const FRAME_MIN_INTERVAL_MS = 350;

interface VerificationResult {
  isMatch: boolean;
  matchScore: number;
  distance: number;
  box?: faceapi.Box;
}

interface DescriptorSample {
  descriptor: Float32Array;
  distance: number;
}

export interface VerificationWindow {
  frameId: number;
  sampleCount: number;
  matchedCount: number;
  requiredMatchedCount: number;
  windowSize: number;
  isReady: boolean;
  isAccepted: boolean;
}

function distanceToSimilarityScore(distance: number): number {
  const anchors = [
    { distance: 0.0, score: 100 },
    { distance: 0.25, score: 95 },
    { distance: 0.4, score: 85 },
    { distance: DEFAULT_FACE_DISTANCE_THRESHOLD, score: 75 },
    { distance: 0.45, score: 70 },
    { distance: 0.5, score: 50 },
    { distance: 0.6, score: 20 },
    { distance: 0.7, score: 0 },
  ] as const;

  if (distance <= anchors[0].distance) return 100;

  const lastAnchor = anchors[anchors.length - 1];
  if (distance >= lastAnchor.distance) return 0;

  for (let index = 1; index < anchors.length; index += 1) {
    const left = anchors[index - 1];
    const right = anchors[index];

    if (distance <= right.distance) {
      const ratio = (distance - left.distance) / (right.distance - left.distance);
      return Math.round(left.score + ratio * (right.score - left.score));
    }
  }

  return 0;
}

function selectRepresentativeDescriptor(descriptors: Float32Array[]): Float32Array | null {
  if (descriptors.length === 0) return null;
  if (descriptors.length === 1) return new Float32Array(descriptors[0]);

  let bestDescriptorIndex = 0;
  let lowestTotalDistance = Number.POSITIVE_INFINITY;

  for (let candidateIndex = 0; candidateIndex < descriptors.length; candidateIndex += 1) {
    let totalDistance = 0;

    for (let otherIndex = 0; otherIndex < descriptors.length; otherIndex += 1) {
      if (candidateIndex === otherIndex) continue;
      totalDistance += faceapi.euclideanDistance(
        descriptors[candidateIndex],
        descriptors[otherIndex],
      );
    }

    if (totalDistance < lowestTotalDistance) {
      lowestTotalDistance = totalDistance;
      bestDescriptorIndex = candidateIndex;
    }
  }

  return new Float32Array(descriptors[bestDescriptorIndex]);
}

function median(values: number[]): number {
  if (values.length === 0) return Number.POSITIVE_INFINITY;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function useFaceVerification(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  isCameraActive: boolean,
  modelsLoaded: boolean,
  referenceImageUrl: string | null,
  distanceThreshold = DEFAULT_FACE_DISTANCE_THRESHOLD,
) {
  // SỬ DỤNG REF để tránh Closure Race Condition trong vòng lặp Async
  const referenceDescriptorRef = useRef<Float32Array | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [verificationWindow, setVerificationWindow] = useState<VerificationWindow>({
    frameId: 0,
    sampleCount: 0,
    matchedCount: 0,
    requiredMatchedCount: MIN_MATCHED_SAMPLES,
    windowSize: VERIFICATION_WINDOW_SIZE,
    isReady: false,
    isAccepted: false,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [refImageError, setRefImageError] = useState<string | null>(null);
  
  const requestRef = useRef<number>(null);
  const isMatchingRef = useRef<boolean>(false);
  const isRunningRef = useRef<boolean>(false);
  // Cửa sổ chứa các lần inference thật gần nhất. Frame không đạt ngưỡng vẫn
  // được giữ lại để một frame nhiễu không xóa toàn bộ tiến trình.
  const descriptorSamplesRef = useRef<DescriptorSample[]>([]);
  const frameIdRef = useRef(0);
  // Timestamp (ms) của lần inference gần nhất — dùng để throttle SsdMobilenetv1
  const lastFrameTimeRef = useRef<number>(0);

  const clearLiveDescriptors = useCallback(() => {
    descriptorSamplesRef.current = [];
    setVerificationWindow((previous) => ({
      ...previous,
      frameId: frameIdRef.current,
      sampleCount: 0,
      matchedCount: 0,
      isReady: false,
      isAccepted: false,
    }));
  }, []);

  // 1. Tải và trích xuất đặc trưng của ảnh gốc (Reference Image)
  useEffect(() => {
    let isMounted = true;
    
    const loadReferenceImage = async () => {
      // ĐỒNG BỘ TUYỆT ĐỐI: Reset ngay lập tức để vòng lặp camera thấy null ngay trong frame kế tiếp
      referenceDescriptorRef.current = null;
      clearLiveDescriptors();
      if (isMounted) {
        setVerificationResult(null);
        setRefImageError(null);
      }

      if (!referenceImageUrl || !modelsLoaded) {
        return;
      }
      
      try {
        // Tạo HTMLImageElement từ URL
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Important for fetching from external APIs
        img.src = referenceImageUrl;
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error('Failed to load image'));
        });

        // Phát hiện khuôn mặt trong ảnh gốc — dùng SsdMobilenetv1 tường minh
        // Nhất quán với detector webcam để descriptor nằm cùng space vector
        const detection = await faceapi.detectSingleFace(
          img,
          new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }),
        ).withFaceLandmarks().withFaceDescriptor();
                                       
        if (!detection) {
          if (isMounted) setRefImageError('Không nhận diện được khuôn mặt trong ảnh thẻ.');
          return;
        }

        if (isMounted) {
          referenceDescriptorRef.current = detection.descriptor;
          setRefImageError(null);
        }
      } catch (err: any) {
        console.error('Error extracting reference descriptor:', err);
        if (isMounted) setRefImageError('Lỗi xử lý ảnh hồ sơ.');
      }
    };

    loadReferenceImage();

    return () => {
      isMounted = false;
    };
  }, [referenceImageUrl, modelsLoaded, clearLiveDescriptors]);

  // 2. Vòng lặp quét video trực tiếp
  const processVideoFrame = useCallback(async () => {
    if (!isRunningRef.current || !videoRef.current || !modelsLoaded || isMatchingRef.current) {
      if (isRunningRef.current) {
        requestRef.current = requestAnimationFrame(processVideoFrame);
      }
      return;
    }

    // THROTTLE: giới hạn tốc độ inference SsdMobilenetv1 xuống ~3fps
    // Nếu chưa đủ thời gian kể từ frame trước, bỏ qua và thử lại frame kế tiếp
    const nowMs = performance.now();
    if (nowMs - lastFrameTimeRef.current < FRAME_MIN_INTERVAL_MS) {
      if (isRunningRef.current) {
        requestRef.current = requestAnimationFrame(processVideoFrame);
      }
      return;
    }

    try {
      isMatchingRef.current = true;
      lastFrameTimeRef.current = performance.now(); // Cập nhật timestamp ngay sau khi lấy mutex
      const videoEl = videoRef.current;

      // BẢO VỆ LỖI TREO (HANG): Đảm bảo video thực sự có frame dữ liệu (readyState >= 2)
      // Nếu giao cho faceapi khi chưa có frame, faceapi có thể bị kẹt Promise vĩnh viễn
      if (videoEl.readyState < 2 || videoEl.videoWidth === 0) {
        isMatchingRef.current = false;
        if (isRunningRef.current) {
          requestRef.current = requestAnimationFrame(processVideoFrame);
        }
        return;
      }

      // Phát hiện khuôn mặt từ Video — dùng SsdMobilenetv1 để nhất quán với ảnh thẻ
      // Cùng detector → cùng bounding box style → cùng aligned face patch → descriptor space nhất quán
      const detection = await faceapi.detectSingleFace(
                                       videoEl,
                                       new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }),
                                     )
                                     .withFaceLandmarks()
                                     .withFaceDescriptor();

      // Nếu đã unmount hoặc dừng camera trong lúc chờ await, thoát ngay lập tức để tránh state update
      if (!isRunningRef.current) return;

      if (detection) {
        const currentRefDesc = referenceDescriptorRef.current;
        if (currentRefDesc) {
          // Tính toán khoảng cách Euclidean
          const distance = faceapi.euclideanDistance(currentRefDesc, detection.descriptor);
          
          // Chuyển đổi sang phần trăm khớp bằng hàm phi tuyến tính hiệu chuẩn nghiêm ngặt hơn
          const samples = [
            ...descriptorSamplesRef.current,
            { descriptor: detection.descriptor, distance },
          ].slice(-VERIFICATION_WINDOW_SIZE);
          descriptorSamplesRef.current = samples;
          frameIdRef.current += 1;

          const matchedSamples = samples.filter((sample) => sample.distance <= distanceThreshold);
          const isEarlyAccepted =
            samples.length >= EARLY_ACCEPT_SAMPLE_SIZE &&
            matchedSamples.length === samples.length;
          const isFullWindowAccepted =
            samples.length === VERIFICATION_WINDOW_SIZE &&
            matchedSamples.length >= MIN_MATCHED_SAMPLES;
          const isReady =
            samples.length >= EARLY_ACCEPT_SAMPLE_SIZE;
          const isAccepted = isEarlyAccepted || isFullWindowAccepted;

          setVerificationWindow({
            frameId: frameIdRef.current,
            sampleCount: samples.length,
            matchedCount: matchedSamples.length,
            requiredMatchedCount: MIN_MATCHED_SAMPLES,
            windowSize: VERIFICATION_WINDOW_SIZE,
            isReady,
            isAccepted,
          });

          // Làm mượt màu và điểm hiển thị bằng trung vị của tối đa 3 inference gần nhất.
          // Quyết định tự động vẫn dựa trên toàn bộ cửa sổ 7 frame.
          const overlaySamples = samples.slice(-OVERLAY_SMOOTHING_SIZE);
          const smoothedDistance = median(overlaySamples.map((sample) => sample.distance));
          const score = distanceToSimilarityScore(smoothedDistance);
          const overlayMatchedCount = overlaySamples.filter(
            (sample) => sample.distance <= distanceThreshold,
          ).length;
          const isMatch = overlayMatchedCount >= Math.ceil(overlaySamples.length / 2);

          setVerificationResult({
            isMatch,
            matchScore: score,
            distance: smoothedDistance,
            box: detection.detection.box
          });
        } else {
          // Có mặt nhưng chưa có reference descriptor hợp lệ (ví dụ ảnh thẻ lỗi/SVG)
          clearLiveDescriptors();
          setVerificationResult({
            isMatch: false,
            matchScore: 0,
            distance: 1,
            box: detection.detection.box
          });
        }
      } else {
        // Không tìm thấy khuôn mặt
        clearLiveDescriptors();
        setVerificationResult(null);
      }
    } catch (err) {
      clearLiveDescriptors();
      console.error('Frame processing error', err);
    } finally {
      isMatchingRef.current = false;
      if (isRunningRef.current) {
        requestRef.current = requestAnimationFrame(processVideoFrame);
      }
    }
  }, [modelsLoaded, videoRef, clearLiveDescriptors, distanceThreshold]);

  useEffect(() => {
    isRunningRef.current = isCameraActive && modelsLoaded;
    
    if (isRunningRef.current) {
      setIsProcessing(true);
      requestRef.current = requestAnimationFrame(processVideoFrame);
    } else {
      setIsProcessing(false);
      clearLiveDescriptors();
      setVerificationResult(null);
    }

    return () => {
      isRunningRef.current = false;
      clearLiveDescriptors();
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isCameraActive, modelsLoaded, processVideoFrame, clearLiveDescriptors]);

  return {
    referenceDescriptor: referenceDescriptorRef.current,
    verificationResult,
    verificationWindow,
    isProcessing,
    refImageError,
    /**
     * Chọn descriptor đại diện nhất (medoid) từ toàn bộ cửa sổ inference gần nhất.
     *
     * KHÔNG lọc theo ngưỡng frontend trước khi gửi backend.
     * Backend là nơi duy nhất ra quyết định khớp/không khớp với reference descriptor riêng của nó.
     * Medoid tự chống outlier: nếu 5/7 frame thuộc người đúng, medoid của cả 7 vẫn nằm
     * trong cụm 5 frame đó, không bị kéo lệch bởi 2 frame nhiễu.
     */
    getAggregatedLiveDescriptor: (): Float32Array | null =>
      selectRepresentativeDescriptor(
        descriptorSamplesRef.current.map((sample) => sample.descriptor),
      ),
    resetVerificationWindow: clearLiveDescriptors,
  };
}
