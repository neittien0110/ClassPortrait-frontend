/**
 * Tiện ích Text-to-Speech dùng backend proxy tới Google Translate TTS.
 *
 * Ưu điểm:
 * - Giọng đọc tiếng Việt tự nhiên (cùng giọng với Google Dịch)
 * - Không cần cài gói giọng nói trên máy giáo viên
 * - Hoạt động trên mọi trình duyệt (Chrome, Edge, Firefox, Safari)
 * - Miễn phí, không cần API key
 *
 * Cơ chế: Frontend gửi text lên backend (/tts/speak?text=...),
 * backend fetch audio từ Google Translate và stream về.
 * Frontend nhận blob audio/mpeg và phát qua HTML Audio element.
 */

import { API_CONFIG } from '../../config/constants';

const TTS_ENDPOINT = `${API_CONFIG.BASE_URL}/tts/speak`;

// Audio element dùng lại để tránh tạo nhiều element cùng lúc
let currentAudio: HTMLAudioElement | null = null;

/**
 * Dừng audio đang phát (nếu có).
 */
export function stopSpeech(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
}

/**
 * Hàm Heuristic tự động phát hiện tên nước ngoài.
 * Dựa trên các ký tự hoặc cụm từ không có trong tiếng Việt.
 */
function detectLanguage(name: string): string {
  // Nếu có dấu tiếng Việt -> 100% tiếng Việt
  const vietnameseMarks = /[áàãạảăắằẵặẳâấầẫậẩéèẽẹẻêếềễệểíìĩịỉóòõọỏôốồỗộổơớờỡợởúùũụủưứừữựửýỳỹỵỷđ]/i;
  if (vietnameseMarks.test(name)) return 'vi';

  // Các chữ cái độc quyền của tiếng nước ngoài
  const foreignLetters = /[f|j|w|z]/i;
  if (foreignLetters.test(name)) return 'en-US';

  // Các tổ hợp âm hoặc phụ âm kép không có trong tiếng Việt (vd: Anna, Scott, Jessica, Michael, Smith)
  const foreignClusters = /(sh|tion|sion|ce|ge|ck|ly|ry|ty|ny|my|sy|dy|cy|vy|py|by|ky|xy|ll|nn|ss|rr|pp|cc|dd|ff|gg|kk|mm|xx|bb|zz|ae|oe|ie|ea|ou|au|oo|ee)/i;
  // Trừ một số trường hợp ngoại lệ nếu cần, nhưng đối với tên sinh viên thì heuristic này khá chính xác.
  if (foreignClusters.test(name)) return 'en-US';

  return 'vi'; // Mặc định là tiếng Việt
}

/**
 * Phát văn bản bằng giọng tiếng Việt hoặc tiếng Anh (tự động phát hiện).
 * @param text Văn bản cần đọc.
 */
export async function speak(text: string): Promise<void> {
  if (!text || !text.trim()) return;

  // Tự động phát hiện ngôn ngữ dựa vào tên
  const lang = detectLanguage(text);

  // Chuyển toàn bộ tên thành chữ thường (lowercase)
  // Google TTS có xu hướng nhận diện các từ VIẾT HOA TOÀN BỘ (như OUN CHANTHEA) là từ viết tắt (Acronym)
  // nên nó sẽ đánh vần từng chữ cái. Chuyển sang chữ thường giúp nó đọc nguyên chữ.
  const normalizedText = text.trim().toLowerCase();

  // Dừng audio đang phát
  stopSpeech();

  try {
    const url = `${TTS_ENDPOINT}?text=${encodeURIComponent(normalizedText.slice(0, 200))}&lang=${lang}`;

    const audio = new Audio(url);
    currentAudio = audio;

    audio.volume = 1.0;
    audio.playbackRate = 1.5; // Tăng tốc độ đọc lên 40% để đọc nhanh hơn
    // Rate được xử lý phía backend (ttsspeed=1 trong Google TTS URL)

    await audio.play();
  } catch (err) {
    console.warn('[TTS] Không thể phát âm thanh:', err);
  }
}

/**
 * Khởi động TTS - không cần thiết nữa (giữ lại để không break code cũ).
 */
export function initSpeech(): void {
  // Không làm gì - backend TTS không cần init
}

/**
 * Chuỗi TTS gọi tên: "[Tên]"
 */
export function buildCallText(fullName: string, mssv: string): string {
  return fullName;
}

/**
 * Chuỗi TTS thông báo có mặt: "[Tên], có mặt"
 */
export function buildPresentText(fullName: string): string {
  return `${fullName}, có mặt`;
}
