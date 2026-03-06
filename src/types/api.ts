// src/types/api.ts

export type Level = string; // 모든 문자열 허용 (예: "A", "수능", "Chapter1")

export type WorksheetOption = 1 | 2 | 3;

export interface ApiResponse<T = unknown> {
  ok:         boolean;
  data?:      T;
  error?:     string;
  message?:   string;
  timestamp?: string;
}

export interface LoadLevelResponse {
  level:         Level;
  sentenceCount: number;
  loadedAt:      string;
}

export interface GenerateWorksheetResponse {
  option:        WorksheetOption;
  sentenceCount: number;
  generatedAt:   string;
}

export interface PdfResponse {
  fileId:      string;
  fileName:    string;
  viewUrl:     string;
  downloadUrl: string;
  createdAt:   string;
}

export interface WeeklyMetrics {
  student:     string;
  week:        string;
  level:       Level;   // ← number → Level(string) 로 수정
  svTotal:     number;
  svCorrect:   number;
  formTotal:   number;
  formCorrect: number;
  transSent:   number;
  transErr:    number;
  memo:        string;
}

export interface SaveMetricsResponse {
  saved:    boolean;
  metrics?: {
    svRate:          string;
    formRate:        string;
    transAccuracy:   string;
  };
}

export interface CustomSentencesResponse {
  count:       number;
  level:       string;
  savedToBank: boolean;
  first:       string;
  last:        string;
}