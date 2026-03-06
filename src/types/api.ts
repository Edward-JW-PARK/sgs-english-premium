export type Level = string;

export type WorksheetOption = 1 | 2 | 3;

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface LoadLevelResponse {
  level: Level;
  sentenceCount: number;
  loadedAt: string;
}

export interface GenerateWorksheetResponse {
  option: WorksheetOption;
  sentenceCount: number;
  generatedAt: string;
}

export interface PdfResponse {
  fileId: string;
  fileName: string;
  viewUrl: string;
  downloadUrl: string;
  createdAt: string;
}

// ✅ level: number → string 으로 수정
export interface WeeklyMetrics {
  student: string;
  week: string;
  level: string;        // ← 수정 (number → string)
  svTotal: number;
  svCorrect: number;
  formTotal: number;
  formCorrect: number;
  transSent: number;
  transErr: number;
  memo: string;
}

export interface SaveMetricsResponse {
  saved: boolean;
  metrics?: {
    svRate: string;
    formRate: string;
    transAccuracy: string;
  };
}

export interface CustomSentencesResponse {
  count: number;
  level: string;
  savedToBank: boolean;
  first: string;
  last: string;
}

export interface CustomSentenceRow {
  sentence: string;
  subject: string;
  verb: string;
  object: string;
  complement: string;
  pattern: string;
  grammar: string;
  translation: string;
}