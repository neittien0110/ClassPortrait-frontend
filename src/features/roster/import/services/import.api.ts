import api from '../../../../lib/api';
import {
  DuplicateAction,
  ImportClassResult,
  ImportHistoryApiRawResponse,
  ImportHistoryResponse,
  ImportSourceType,
} from '../../services/class.types';
import { ImportPreviewData } from '../types';

interface ImportClassOptions {
  mssvColumn?: string;
  nameColumn?: string;
  startRow?: number;
  mappingMode?: 'auto' | 'manual';
  duplicateAction?: DuplicateAction;
  confirmUpdate?: boolean;
  targetClassId?: string;
}

interface ImportSheetPayload extends ImportClassOptions {
  googleSheetUrl: string;
  mappingMode: 'auto' | 'manual';
}

interface PreviewSheetPayload {
  googleSheetUrl: string;
  mappingMode: 'auto' | 'manual';
  mssvColumn?: string;
  nameColumn?: string;
  startRow?: number;
}

/**
 * Nhóm API phục vụ nghiệp vụ import lớp học.
 */
export const importApi = {
  /**
   * Import lớp học từ file upload.
   */
  importClass: async (file: File, options?: ImportClassOptions): Promise<ImportClassResult> => {
    const formData = new FormData();
    formData.append('file', file);

    if (options?.mssvColumn) formData.append('mssvColumn', options.mssvColumn);
    if (options?.nameColumn) formData.append('nameColumn', options.nameColumn);
    if (typeof options?.startRow === 'number') formData.append('startRow', String(options.startRow));
    if (options?.mappingMode) formData.append('mappingMode', options.mappingMode);
    if (options?.duplicateAction) formData.append('duplicateAction', options.duplicateAction);
    if (typeof options?.confirmUpdate === 'boolean') formData.append('confirmUpdate', String(options.confirmUpdate));
    if (options?.targetClassId) formData.append('targetClassId', options.targetClassId);

    const response = await api.post<any>('/classes/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = response.data;
    // Backend trả về classIds (mảng), ta map về ImportClassResult
    return {
      ...data,
      classId: data.classId ?? (Array.isArray(data.classIds) ? data.classIds[0] : ''),
      classIds: Array.isArray(data.classIds) ? data.classIds : (data.classId ? [data.classId] : []),
    } as ImportClassResult;
  },

  /**
   * Import lớp học từ Google Sheet.
   */
  importClassFromSheet: async (payload: ImportSheetPayload): Promise<ImportClassResult> => {
    const response = await api.post<any>('/classes/import-from-sheet', payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = response.data;
    return {
      ...data,
      classId: data.classId ?? (Array.isArray(data.classIds) ? data.classIds[0] : ''),
      classIds: Array.isArray(data.classIds) ? data.classIds : (data.classId ? [data.classId] : []),
    } as ImportClassResult;
  },

  /**
   * Preview import từ file Excel - KHÔNG lưu vào DB.
   */
  previewImport: async (file: File, options?: Omit<ImportClassOptions, 'duplicateAction' | 'confirmUpdate' | 'targetClassId'>): Promise<ImportPreviewData> => {
    const formData = new FormData();
    formData.append('file', file);

    if (options?.mssvColumn) formData.append('mssvColumn', options.mssvColumn);
    if (options?.nameColumn) formData.append('nameColumn', options.nameColumn);
    if (typeof options?.startRow === 'number') formData.append('startRow', String(options.startRow));
    if (options?.mappingMode) formData.append('mappingMode', options.mappingMode);

    const response = await api.post<ImportPreviewData>('/classes/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Preview import từ Google Sheet - KHÔNG lưu vào DB.
   */
  previewImportFromSheet: async (payload: PreviewSheetPayload): Promise<ImportPreviewData> => {
    const response = await api.post<ImportPreviewData>('/classes/import-from-sheet/preview', payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  },

  /**
   * Lấy lịch sử import có phân trang.
   */
  getImportHistory: async (params: {
    page: number;
    limit: number;
    sourceType?: ImportSourceType;
  }): Promise<ImportHistoryResponse> => {
    const response = await api.get<ImportHistoryApiRawResponse>('/classes/import-history', { params });
    const payload = response.data || {};
    return {
      items: payload.items || payload.data || [],
      pagination: payload.pagination || {
        page: params.page,
        limit: params.limit,
        total: (payload.items || payload.data || []).length,
        totalPages: 1,
      },
    };
  },

  deleteImportHistory: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/classes/import-history/${id}`);
    return response.data;
  },
};

export default importApi;

