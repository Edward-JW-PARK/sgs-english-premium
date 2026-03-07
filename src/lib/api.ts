// src/lib/api.ts

import type {
  ApiResponse,
  Level,
  LoadLevelResponse,
  GenerateWorksheetResponse,
  PdfResponse,
  WeeklyMetrics,
  SaveMetricsResponse,
  WorksheetOption,
  CustomSentencesResponse,
} from "../types/api";

const API_URL = import.meta.env.VITE_GAS_API_URL as string;
const API_KEY = import.meta.env.VITE_API_KEY as string;

if (!API_URL || !API_KEY) {
  console.warn("⚠️ 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.");
}

// ── 에러 클래스 ────────────────────────────────────────────
export class ApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

// ── 커스텀 문장 객체 타입 정의 ─────────────────────────────
// App.tsx 테이블 입력 / 텍스트 파싱 결과와 동일한 구조
export interface CustomSentenceRow {
  sentence:    string;
  subject:     string;
  verb:        string;
  object:      string;
  complement:  string;
  pattern:     string;
  grammar:     string;
  translation: string;
}

// ── 공통 API 호출 함수 ─────────────────────────────────────
export async function callApi<T>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  try {
const response = await fetch(API_URL, {
  method: "POST",
  headers: { "Content-Type": "text/plain;charset=utf-8" },
  body: JSON.stringify({ action, payload, apiKey: API_KEY }),
  redirect: "follow",   // ← 이 한 줄 추가
});

    if (!response.ok) {
      throw new ApiError(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json: ApiResponse<T> = await response.json();

    if (!json.ok) {
      throw new ApiError(json.message || json.error || "API 오류");
    }

    return json.data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
    );
  }
}

// ── API 함수 모음 ──────────────────────────────────────────
export const api = {

  // 사용 가능한 레벨 목록 조회
  getLevels: () =>
    callApi<{ levels: Level[] }>("getLevels"),

  // 레벨 문제은행 → INPUT 시트 로드
  loadLevel: (level: Level) =>
    callApi<LoadLevelResponse>("loadLevel", { level }),

  // ★ 커스텀 문장 직접 입력 저장
  // sentences: 객체 배열(테이블 입력) 또는 탭 파싱된 객체 배열
  // GAS handleAddCustomSentences_ 가 배열을 그대로 처리
  addCustomSentences: (params: {
    sentences: CustomSentenceRow[];  // 항상 객체 배열로 통일
    level?: string;
    saveToBank?: boolean;
  }) =>
    callApi<CustomSentencesResponse>("addCustomSentences", {
      ...params,
      // level 기본값 보장
      level: params.level ?? "CUSTOM",
      saveToBank: params.saveToBank ?? false,
    }),

  // 워크시트 생성
  generateWorksheet: (params: {
    option: WorksheetOption;
    titlePrefix: string;
    studentName: string;
  }) =>
    callApi<GenerateWorksheetResponse>("generateWorksheet", params),

  // PDF 생성
  createPdf: (fileNamePrefix: string) =>
    callApi<PdfResponse>("createPdf", { fileNamePrefix }),

  // 주간 지표 LOG 저장
saveWeeklyMetrics: (metrics: WeeklyMetrics) =>
  callApi<SaveMetricsResponse>("saveWeeklyMetrics", { ...metrics }),
};