import type { 
  ApiResponse, 
  Level, 
  LoadLevelResponse,
  GenerateWorksheetResponse,
  PdfResponse,
  WeeklyMetrics,
  SaveMetricsResponse,
  WorksheetOption,
  CustomSentencesResponse  // 새로 추가
} from "../types/api";

const API_URL = import.meta.env.VITE_GAS_API_URL as string;
const API_KEY = import.meta.env.VITE_API_KEY as string;

if (!API_URL || !API_KEY) {
  console.warn("⚠️ 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.");
}

export class ApiError extends Error {
  code?: string;  // ✅ 속성을 별도로 선언
  
  constructor(message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;  // ✅ 생성자에서 직접 할당
  }
}

export async function callApi<T>(
  action: string,
  payload: Record<string, any> = {}
): Promise<T> {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, payload, apiKey: API_KEY }),
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

// 확장된 API 함수들
export const api = {
  getLevels: () => callApi<{ levels: Level[] }>("getLevels"),
  
  loadLevel: (level: Level) => 
    callApi<LoadLevelResponse>("loadLevel", { level }),
  
  // ✅ 새로운 기능: 커스텀 문장 직접 추가
  addCustomSentences: (params: {
    sentences: string | string[];
    level?: string;
    saveToBank?: boolean;
  }) => callApi<CustomSentencesResponse>("addCustomSentences", params),
  
  generateWorksheet: (params: {
    option: WorksheetOption;
    titlePrefix: string;
    studentName: string;
  }) => callApi<GenerateWorksheetResponse>("generateWorksheet", params),
  
  createPdf: (fileNamePrefix: string) =>
    callApi<PdfResponse>("createPdf", { fileNamePrefix }),
  
  saveWeeklyMetrics: (metrics: WeeklyMetrics) =>
    callApi<SaveMetricsResponse>("saveWeeklyMetrics", metrics),
};