import { useState, useEffect } from "react";
import { api, ApiError } from "./lib/api";
import type {
  Level,
  WorksheetOption,
  PdfResponse,
  WeeklyMetrics,
} from "./types/api";
import "./App.css";

export default function App() {
  // ===== 모든 State 선언 (함수 최상단 집중) =====
  const [levels, setLevels] = useState<Level[]>([]);
  const [level, setLevel] = useState<Level>("A");
  const [option, setOption] = useState<WorksheetOption>(2);
  const [titlePrefix, setTitlePrefix] = useState("문장 구조분석 워크시트");
  const [studentName, setStudentName] = useState("");
  const [status, setStatus] = useState("준비됨");
  const [pdf, setPdf] = useState<PdfResponse | null>(null);
  
  // 커스텀 문장 입력 기능 상태
  const [customSentences, setCustomSentences] = useState("");
  
  // LOG 상태
  const [metrics, setMetrics] = useState<WeeklyMetrics>({
    student: "", week: "", level: 1,
    svTotal: 0, svCorrect: 0, formTotal: 0, formCorrect: 0,
    transSent: 0, transErr: 0, memo: ""
  });

  // ===== 초기 로딩 Effect =====
  useEffect(() => {
    (async () => {
      try {
        setStatus("레벨 불러오는 중...");
        const data = await api.getLevels();
        setLevels(data.levels);
        setLevel(data.levels[0] ?? "A");
        setStatus("준비됨");
      } catch (e: any) {
        console.error("API 연결 오류:", e);
        setStatus(`연결 대기중 (API 설정 필요)`);
      }
    })();
  }, []);

  // ===== 이벤트 핸들러 함수들 =====
  
  const loadLevel = async () => {
    try {
      setPdf(null);
      setStatus(`레벨 ${level} 불러오는 중...`);
      const r = await api.loadLevel(level);
      setStatus(`완료: 레벨 ${r.level} ${r.sentenceCount}문장 INPUT 입력됨`);
    } catch (e: any) {
      const message = e instanceof ApiError ? e.message : "레벨 로드 실패";
      setStatus(`오류: ${message}`);
    }
  };

  const handleAddCustomSentences = async () => {
    try {
      if (!customSentences.trim()) {
        setStatus("오류: 문장을 입력해주세요");
        return;
      }
      
      setPdf(null);
      setStatus("커스텀 문장을 INPUT에 저장 중...");
      
      const result = await api.addCustomSentences({
        sentences: customSentences,
        level: "CUSTOM",
        saveToBank: false
      });
      
      setStatus(`완료: ${result.count}개 문장이 INPUT에 저장됨`);
      setCustomSentences(""); // 입력창 초기화
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : "커스텀 문장 저장 실패";
      setStatus(`오류: ${message}`);
    }
  };

  const generate = async () => {
    try {
      setPdf(null);
      setStatus(`WORKSHEET 생성 중... (옵션 ${option})`);
      const r = await api.generateWorksheet({
        option, titlePrefix, studentName,
      });
      setStatus(`완료: WORKSHEET 생성됨 (문장 ${r.sentenceCount}개)`);
    } catch (e: any) {
      const message = e instanceof ApiError ? e.message : "워크시트 생성 실패";
      setStatus(`오류: ${message}`);
    }
  };

  const createPdf = async () => {
    try {
      setStatus("PDF 생성 중...");
      const r = await api.createPdf("SGS_영어_워크시트");
      setPdf(r);
      setStatus(`완료: PDF 생성됨 (${r.fileName})`);
    } catch (e: any) {
      const message = e instanceof ApiError ? e.message : "PDF 생성 실패";
      setStatus(`오류: ${message}`);
    }
  };

  const saveLog = async () => {
    try {
      setStatus("LOG 저장 중...");
      await api.saveWeeklyMetrics(metrics);
      setStatus("완료: LOG 저장됨");
      
      // 저장 후 폼 초기화
      setMetrics({
        student: "", week: "", level: 1,
        svTotal: 0, svCorrect: 0, formTotal: 0, formCorrect: 0,
        transSent: 0, transErr: 0, memo: ""
      });
    } catch (e: any) {
      const message = e instanceof ApiError ? e.message : "LOG 저장 실패";
      setStatus(`오류: ${message}`);
    }
  };

  // ===== JSX 렌더링 (모든 UI는 여기에만) =====
  return (
    <div className="container">
      <h2 className="title">SGS 영어 구조훈련 (Premium)</h2>
      
      {/* 1. 레벨 선택 */}
      <div className="card">
        <h3>1) 레벨 문장 불러오기</h3>
        <div className="row">
          <select value={level} onChange={(e) => setLevel(e.target.value as Level)}>
            {levels.length > 0 ? levels.map((l) => (
              <option key={l} value={l}>레벨 {l}</option>
            )) : <option>로딩중...</option>}
          </select>
          <button onClick={loadLevel} className="primary">INPUT에 불러오기</button>
        </div>
        <div className="row mt-2">
          <input 
            value={titlePrefix} 
            onChange={(e) => setTitlePrefix(e.target.value)} 
            placeholder="머리말 제목" 
          />
          <input 
            value={studentName} 
            onChange={(e) => setStudentName(e.target.value)} 
            placeholder="이름" 
          />
        </div>
      </div>

      {/* ✅ 1-1. 커스텀 문장 입력 (이제 올바른 위치) */}
      <div className="card">
        <h3>1-1) 직접 문장 입력하기</h3>
        <p style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
          한 줄에 한 문장씩 입력하세요. 레벨에 관계없이 입력한 문장들로 워크시트가 생성됩니다.
        </p>
        <textarea
          rows={6}
          value={customSentences}
          onChange={(e) => setCustomSentences(e.target.value)}
          placeholder={`예시:\nI have a dog.\nShe is very kind.\nThey went to the park yesterday.`}
          className="textarea"
          style={{ 
            width: "100%", 
            resize: "vertical", 
            marginBottom: 10,
            padding: "10px",
            border: "2px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "14px"
          }}
        />
        <button 
          onClick={handleAddCustomSentences} 
          className="primary full-width"
          disabled={!customSentences.trim()}
          style={{ 
            opacity: customSentences.trim() ? 1 : 0.6,
            cursor: customSentences.trim() ? "pointer" : "not-allowed"
          }}
        >
          위 문장들로 INPUT 채우기
        </button>
      </div>

      {/* 2. 워크시트 옵션 */}
      <div className="card">
        <h3>2) 워크시트 옵션</h3>
        <div className="row option-group">
          <label>
            <input type="radio" checked={option===1} onChange={()=>setOption(1)} /> 
            옵션1 (S/V)
          </label>
          <label>
            <input type="radio" checked={option===2} onChange={()=>setOption(2)} /> 
            옵션2 (박스)
          </label>
          <label>
            <input type="radio" checked={option===3} onChange={()=>setOption(3)} /> 
            옵션3 (형식)
          </label>
        </div>
        <div className="row mt-2">
          <button onClick={generate} className="primary">WORKSHEET 생성</button>
          <button onClick={createPdf} className="secondary">PDF 만들기</button>
        </div>
        {pdf && (
          <div className="pdf-box">
            <p>✅ PDF 생성 완료!</p>
            <div className="row">
              <a href={pdf.viewUrl} target="_blank" rel="noopener noreferrer" className="btn-link">
                📄 PDF 보기
              </a>
              <a href={pdf.downloadUrl} target="_blank" rel="noopener noreferrer" className="btn-link">
                ⬇️ 다운로드
              </a>
            </div>
          </div>
        )}
      </div>

      {/* 3. 주간 지표 LOG */}
      <div className="card">
        <h3>3) 주간 지표(LOG)</h3>
        <div className="row">
          <input 
            value={metrics.student} 
            onChange={(e)=>setMetrics({...metrics, student: e.target.value})} 
            placeholder="학생/반" 
          />
          <input 
            value={metrics.week} 
            onChange={(e)=>setMetrics({...metrics, week: e.target.value})} 
            placeholder="주차" 
          />
          <select 
            value={metrics.level} 
            onChange={(e)=>setMetrics({...metrics, level: Number(e.target.value)})}
          >
            <option value={1}>Lv.1</option>
            <option value={2}>Lv.2</option>
            <option value={3}>Lv.3</option>
          </select>
        </div>
        <div className="row mt-2 items-center">
          <span>SV(총/정답):</span>
          <input 
            type="number" 
            className="short" 
            value={metrics.svTotal} 
            onChange={(e)=>setMetrics({...metrics, svTotal: Number(e.target.value)})} 
            min="0"
          />
          <span>/</span>
          <input 
            type="number" 
            className="short" 
            value={metrics.svCorrect} 
            onChange={(e)=>setMetrics({...metrics, svCorrect: Number(e.target.value)})} 
            min="0"
            max={metrics.svTotal}
          />
        </div>
        <div className="row mt-2">
          <textarea 
            value={metrics.memo} 
            onChange={(e)=>setMetrics({...metrics, memo: e.target.value})} 
            placeholder="메모" 
            rows={3} 
          />
        </div>
        <button onClick={saveLog} className="mt-2 primary full-width">LOG 저장</button>
      </div>

      {/* 상태 표시 바 */}
      <div className={`status-bar ${status.includes("오류") ? "error" : ""}`}>
        {status}
      </div>
    </div>
  );
}