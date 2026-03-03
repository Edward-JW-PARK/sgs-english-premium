// 기존: export type Level = "A" | "B" | "C";
// 변경:
export type Level = string;  // 모든 문자열 허용 (예: "D", "수능", "Chapter1")

export type WorksheetOption = 1 | 2 | 3;

// 나머지 인터페이스는 그대로 유지
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

export interface WeeklyMetrics {
  student: string;
  week: string;
  level: number;
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

// 새로운 인터페이스 추가
export interface CustomSentencesResponse {
  count: number;
  level: string;
  savedToBank: boolean;
  first: string;
  last: string;
}