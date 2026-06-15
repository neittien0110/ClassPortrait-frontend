import * as XLSX from 'xlsx';
import { ImportSourceOption, ParsedExcelInfo } from '../types';

export const SOURCE_OPTIONS: ImportSourceOption[] = [
  {
    key: 'excel',
    title: 'File Excel',
    subtitle: '.xlsx, .xls',
    icon: 'X',
    isEnabled: true,
  },
  {
    key: 'gsheet',
    title: 'Google Sheet',
    subtitle: 'Nhập link',
    icon: 'G',
    isEnabled: true,
  },
];

export const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const findColumnByKeywords = (columns: string[], keywords: string[]): string | undefined => {
  const normalizedColumns = columns.map((column) => ({
    original: column,
    normalized: normalizeText(column),
  }));

  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword);
    const exactMatch = normalizedColumns.find((column) => column.normalized === normalizedKeyword);

    if (exactMatch) {
      return exactMatch.original;
    }

    const fuzzyMatch = normalizedColumns.find((column) => column.normalized.includes(normalizedKeyword));
    if (fuzzyMatch) {
      return fuzzyMatch.original;
    }
  }

  return undefined;
};

const detectHeaderRow = (rows: unknown[][]): number => {
  const limit = Math.min(rows.length, 10);

  for (let index = 0; index < limit; index += 1) {
    const row = rows[index] || [];
    const nonEmptyCount = row.filter((cell) => String(cell ?? '').trim()).length;

    if (nonEmptyCount >= 2) {
      return index;
    }
  }

  return 0;
};

export const parseExcelFile = async (file: File): Promise<ParsedExcelInfo> => {
  const fileBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('File Excel không có sheet dữ liệu.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    blankrows: false,
    defval: '',
  });

  if (!rows.length) {
    throw new Error('File Excel đang trống, vui lòng chọn file khác.');
  }

  const headerIndex = detectHeaderRow(rows);
  const rawColumns = rows[headerIndex] || [];
  const columns = rawColumns
    .map((column) => String(column ?? '').trim())
    .map((column, index) => column || `Cột ${index + 1}`);

  const mssvColumn = findColumnByKeywords(columns, ['mssv', 'ma so sinh vien', 'ma sinh vien', 'student id']);
  const nameColumn = findColumnByKeywords(columns, ['ho va ten', 'ho ten', 'ten sinh vien', 'full name', 'name']);

  return {
    columns,
    mssvColumn,
    nameColumn,
  };
};

const extractSheetMetaFromUrl = (url: string): { spreadsheetId: string; gid: string } => {
  const spreadsheetIdMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i);

  if (!spreadsheetIdMatch?.[1]) {
    throw new Error('Link Google Sheet không hợp lệ. Vui lòng kiểm tra lại URL.');
  }

  let gid = '0';

  try {
    const parsedUrl = new URL(url);
    gid = parsedUrl.searchParams.get('gid') || '0';
  } catch {
    gid = '0';
  }

  return {
    spreadsheetId: spreadsheetIdMatch[1],
    gid,
  };
};

export const parseGoogleSheetFromUrl = async (url: string): Promise<ParsedExcelInfo> => {
  const { spreadsheetId, gid } = extractSheetMetaFromUrl(url);
  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${encodeURIComponent(gid)}`;

  let response: Response;

  try {
    response = await fetch(csvUrl);
  } catch {
    throw new Error('Không thể truy cập Google Sheet. Vui lòng kiểm tra link, quyền chia sẻ (public) hoặc kết nối mạng.');
  }

  if (response.status === 403 || response.status === 401) {
    throw new Error('Không thể truy cập Google Sheet. Hãy kiểm tra quyền chia sẻ (public hoặc cấp quyền phù hợp).');
  }

  if (!response.ok) {
    throw new Error('Không thể truy cập Google Sheet. Vui lòng kiểm tra lại link và quyền truy cập.');
  }

  const csvContent = await response.text();

  if (!csvContent.trim()) {
    throw new Error('Google Sheet đang trống hoặc không có dữ liệu hợp lệ để import.');
  }

  const workbook = XLSX.read(csvContent, { type: 'string' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('Google Sheet không có sheet dữ liệu.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    blankrows: false,
    defval: '',
  });

  if (!rows.length) {
    throw new Error('Google Sheet đang trống hoặc không có dữ liệu hợp lệ để import.');
  }

  const headerIndex = detectHeaderRow(rows);
  const rawColumns = rows[headerIndex] || [];
  const columns = rawColumns
    .map((column) => String(column ?? '').trim())
    .map((column, index) => column || `Cột ${index + 1}`);

  const mssvColumn = findColumnByKeywords(columns, ['mssv', 'ma so sinh vien', 'ma sinh vien', 'student id']);
  const nameColumn = findColumnByKeywords(columns, ['ho va ten', 'ho ten', 'ten sinh vien', 'full name', 'name']);

  return {
    columns,
    mssvColumn,
    nameColumn,
  };
};
