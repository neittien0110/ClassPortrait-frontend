import { useMemo, useState } from 'react';
import { DuplicateImportOptions } from '../../services/class.service';
import { extractDuplicateConflict } from '../utils/duplicate';
import { parseExcelFile, parseGoogleSheetFromUrl } from '../utils/parsers';
import { ImportButtonProps, ImportStateSnapshot, MappingMode, SourceType, ImportPreviewData } from '../types';
import { ImportClassResult } from '../../services/class.types';
import { mapImportErrorMessage } from '../utils/errorMessages';
import { submitImportRequest } from '../services/import.service';
import { importApi } from '../services/import.api';

interface ControllerActions {
  setSelectedSource: (source: SourceType) => void;
  setGoogleSheetUrl: (value: string) => void;
  setManualMssvColumn: (value: string) => void;
  setManualNameColumn: (value: string) => void;
  setStartRow: (value: number) => void;
  setStepThreeManual: () => void;
  setStep: (step: 1 | 2 | 3 | 4 | 5) => void;
  setDuplicateStepModeChoose: () => void;
  openModal: (resetFileInput: () => void) => void;
  closeModal: (resetFileInput: () => void) => void;
  parseAndMoveToConfirmStep: (file: File) => Promise<void>;
  moveSheetToConfirmStep: () => Promise<void>;
  submitAuto: () => Promise<void>;
  submitManual: () => Promise<void>;
  submitFinalImport: () => Promise<void>;
  handleDuplicateCreateNew: () => Promise<void>;
  handleDuplicatePrepareUpdate: () => void;
  handleDuplicateConfirmUpdate: () => Promise<void>;
  setDragOver: (value: boolean) => void;
}

export const useImportButtonController = ({ onImportSuccess }: ImportButtonProps): [ImportStateSnapshot, ControllerActions] => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [stepThreeMode, setStepThreeMode] = useState<'manual' | 'success'>('manual');
  const [selectedSource, setSelectedSource] = useState<SourceType>('excel');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [autoMssvColumn, setAutoMssvColumn] = useState('');
  const [autoNameColumn, setAutoNameColumn] = useState('');
  const [manualMssvColumn, setManualMssvColumn] = useState('');
  const [manualNameColumn, setManualNameColumn] = useState('');
  const [startRow, setStartRow] = useState(2);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pendingMappingMode, setPendingMappingMode] = useState<MappingMode | null>(null);
  const [duplicateStepMode, setDuplicateStepMode] = useState<'choose' | 'confirm-update'>('choose');
  const [duplicateConflict, setDuplicateConflict] = useState<ImportStateSnapshot['duplicateConflict']>(null);
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [lastImportedClassIds, setLastImportedClassIds] = useState<string[]>([]);

  const isAutoDetected = useMemo(() => Boolean(autoMssvColumn && autoNameColumn), [autoMssvColumn, autoNameColumn]);

  const resetWizardState = () => {
    setStep(1);
    setStepThreeMode('manual');
    setSelectedSource('excel');
    setSelectedFile(null);
    setGoogleSheetUrl('');
    setColumns([]);
    setAutoMssvColumn('');
    setAutoNameColumn('');
    setManualMssvColumn('');
    setManualNameColumn('');
    setStartRow(2);
    setIsParsing(false);
    setIsImporting(false);
    setDragOver(false);
    setMessage(null);
    setPendingMappingMode(null);
    setDuplicateStepMode('choose');
    setDuplicateConflict(null);
    setPreviewData(null);
    setIsPreviewLoading(false);
    setLastImportedClassIds([]);
  };

  const validateGoogleSheetUrl = (): string | null => {
    const trimmedUrl = googleSheetUrl.trim();
    if (!trimmedUrl) return 'Vui lòng nhập URL Google Sheet.';
    if (!/docs\.google\.com\/spreadsheets\//i.test(trimmedUrl)) {
      return 'Link Google Sheet không hợp lệ. Vui lòng kiểm tra lại URL.';
    }
    return null;
  };

  const onImportSucceeded = async (classId: string, successMessage?: string, importResult?: ImportClassResult) => {
    setMessage({ type: 'success', text: successMessage || 'Import thành công!' });
    // Lưu classIds để xuất PDF
    if (importResult?.classIds && importResult.classIds.length > 0) {
      setLastImportedClassIds(importResult.classIds);
    } else if (classId) {
      setLastImportedClassIds([classId]);
    }
    if (onImportSuccess) {
      await onImportSuccess(classId);
    }
    setStepThreeMode('success');
    setStep(3);
  };

  // Gọi preview API và chuyển sang Step 4
  const runPreview = async (mappingMode: MappingMode) => {
    const usingSheet = selectedSource === 'gsheet';
    const mssvColumn = mappingMode === 'manual' ? manualMssvColumn.trim() : autoMssvColumn;
    const nameColumn = mappingMode === 'manual' ? manualNameColumn.trim() : autoNameColumn;

    if (!mssvColumn || !nameColumn) {
      setMessage({ type: 'error', text: 'Cần chọn đầy đủ cột MSSV và cột Họ và tên.' });
      return;
    }

    setIsPreviewLoading(true);
    setMessage(null);

    try {
      let data: ImportPreviewData;
      if (usingSheet) {
        const validationError = validateGoogleSheetUrl();
        if (validationError) {
          setMessage({ type: 'error', text: validationError });
          return;
        }
        data = await importApi.previewImportFromSheet({
          googleSheetUrl: googleSheetUrl.trim(),
          mappingMode,
          mssvColumn,
          nameColumn,
          startRow,
        });
      } else {
        if (!selectedFile) {
          setMessage({ type: 'error', text: 'Vui lòng chọn file để import.' });
          return;
        }
        data = await importApi.previewImport(selectedFile, { mappingMode, mssvColumn, nameColumn, startRow });
      }

      setPendingMappingMode(mappingMode);
      setPreviewData(data);
      setStep(4);
    } catch (error: any) {
      setMessage({ type: 'error', text: mapImportErrorMessage(error) });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Thực hiện import thực sự (gọi từ bước Preview)
  const submitImport = async (mappingMode: MappingMode, duplicateOptions?: DuplicateImportOptions) => {
    const usingSheet = selectedSource === 'gsheet';
    if (!usingSheet && !selectedFile) {
      setMessage({ type: 'error', text: 'Vui lòng chọn file để import.' });
      return;
    }

    const mssvColumn = mappingMode === 'manual' ? manualMssvColumn.trim() : autoMssvColumn;
    const nameColumn = mappingMode === 'manual' ? manualNameColumn.trim() : autoNameColumn;

    if (!mssvColumn || !nameColumn) {
      setMessage({ type: 'error', text: 'Cần chọn đầy đủ cột MSSV và cột Họ và tên.' });
      return;
    }

    setIsImporting(true);
    setMessage(null);

    try {
      const result = await submitImportRequest({
        source: selectedSource,
        selectedFile,
        googleSheetUrl,
        startRow,
        mappingMode,
        mssvColumn,
        nameColumn,
        duplicateOptions,
      });

      await onImportSucceeded(result.classId, result.message, result as any);
    } catch (error: any) {
      const conflict = extractDuplicateConflict(error);
      if (conflict) {
        setPendingMappingMode(mappingMode);
        setDuplicateConflict(conflict);
        setDuplicateStepMode('choose');
        setStep(5);
        setMessage(null);
      } else {
        setMessage({ type: 'error', text: mapImportErrorMessage(error) });
      }
    } finally {
      setIsImporting(false);
    }
  };

  const snapshot: ImportStateSnapshot = {
    isOpen, step, stepThreeMode, selectedSource, selectedFile, googleSheetUrl, columns,
    autoMssvColumn, autoNameColumn, manualMssvColumn, manualNameColumn, startRow,
    isParsing, isImporting, isDragOver, message, isAutoDetected, pendingMappingMode,
    duplicateStepMode, duplicateConflict, previewData, isPreviewLoading,
    lastImportedClassIds,
  };

  const actions: ControllerActions = {
    setSelectedSource,
    setGoogleSheetUrl,
    setManualMssvColumn,
    setManualNameColumn,
    setStartRow,
    setStepThreeManual: () => setStepThreeMode('manual'),
    setStep,
    setDuplicateStepModeChoose: () => setDuplicateStepMode('choose'),
    openModal: (resetFileInput) => { setIsOpen(true); resetFileInput(); resetWizardState(); },
    closeModal: (resetFileInput) => { setIsOpen(false); resetFileInput(); resetWizardState(); },
    parseAndMoveToConfirmStep: async (file) => {
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!['.xlsx', '.xls'].includes(extension)) {
        setMessage({ type: 'error', text: 'Định dạng file chưa hỗ trợ. Vui lòng chọn file .xlsx hoặc .xls.' });
        return;
      }
      setIsParsing(true);
      setMessage(null);
      try {
        const parsed = await parseExcelFile(file);
        setSelectedFile(file);
        setColumns(parsed.columns);
        setAutoMssvColumn(parsed.mssvColumn || '');
        setAutoNameColumn(parsed.nameColumn || '');
        setManualMssvColumn(parsed.mssvColumn || parsed.columns[0] || '');
        setManualNameColumn(parsed.nameColumn || parsed.columns[1] || parsed.columns[0] || '');
        setStepThreeMode('manual');
        setStep(2);
      } catch (error: any) {
        setMessage({ type: 'error', text: error?.message || 'Không thể đọc file Excel. Vui lòng thử lại.' });
      } finally {
        setIsParsing(false);
      }
    },
    moveSheetToConfirmStep: async () => {
      const validationError = validateGoogleSheetUrl();
      if (validationError) {
        setMessage({ type: 'error', text: validationError });
        return;
      }
      setIsParsing(true);
      setMessage(null);
      try {
        const parsed = await parseGoogleSheetFromUrl(googleSheetUrl.trim());
        setColumns(parsed.columns);
        setAutoMssvColumn(parsed.mssvColumn || '');
        setAutoNameColumn(parsed.nameColumn || '');
        setManualMssvColumn(parsed.mssvColumn || parsed.columns[0] || '');
        setManualNameColumn(parsed.nameColumn || parsed.columns[1] || parsed.columns[0] || '');
        setStepThreeMode('manual');
        setStep(2);
      } catch (error: any) {
        setMessage({ type: 'error', text: mapImportErrorMessage(error) });
      } finally {
        setIsParsing(false);
      }
    },
    // Bước 2 → Preview (step 4)
    submitAuto: async () => runPreview('auto'),
    // Bước 3 → Preview (step 4)
    submitManual: async () => runPreview('manual'),
    // Bước 4 (Preview) → Thực hiện import thật
    submitFinalImport: async () => {
      if (!pendingMappingMode) return;
      await submitImport(pendingMappingMode);
    },
    handleDuplicateCreateNew: async () => {
      if (!pendingMappingMode) return;
      await submitImport(pendingMappingMode, { duplicateAction: 'create_new' });
    },
    handleDuplicatePrepareUpdate: () => setDuplicateStepMode('confirm-update'),
    handleDuplicateConfirmUpdate: async () => {
      if (!pendingMappingMode || !duplicateConflict?.duplicates || duplicateConflict.duplicates.length === 0) {
        setMessage({ type: 'error', text: 'Không tìm thấy lớp mục tiêu để cập nhật.' });
        return;
      }
      await submitImport(pendingMappingMode, {
        duplicateAction: 'update_existing',
        targetClassId: duplicateConflict.duplicates[0].existingClassId, // Backend ignore targetClassId in multi-import, but we pass first one for backward compatibility
        confirmUpdate: true,
      });
    },
    setDragOver,
  };

  return [snapshot, actions];
};
