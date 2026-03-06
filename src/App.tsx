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
  // ===== State =====
  const [levels, setLevels] = useState<Level[]>([]);
  const [level, setLevel] = useState<Level>("A");
  const [option, setOption] = useState<WorksheetOption>(2);
  const [titlePrefix, setTitlePrefix] = useState("문장 구조분석 워크시트");
  const [studentName, setStudentName] = useState("");
  const [status, setStatus] = useState("준비됨");
  const [pdf, setPdf] = useState<PdfResponse | null>(null);

  const [inputMode, setInputMode] = useState<"level" | "custom">("level");
  const [customMode, setCustomMode] = useState<"text" | "table">("text");
  const [customText, setCustomText] = useState("");

  const emptyRow = () => ({
    sentence: "", subject: "", verb: "",
    object: "-", complement: "-",
    pattern: "", grammar: "", translation: ""
  });
  const [tableRows, setTableRows] = useState([emptyRow()]);
  const [sentenceReady, setSentenceReady] = useState(false);

  const [metrics, setMetrics] = useState<WeeklyMetrics>({
    student: "", week: "", level: "A",
    svTotal: 0, svCorrect: 0, formTotal: 0, formCorrect: 0,
    transSent: 0, transErr: 0, memo: ""
  });

  // ===== 초기 레벨 목록 로딩 =====
  useEffect(() => {
    (async () => {
      try {
        setStatus("레벨 불러오는 중...");
        const data = await api.getLevels();
        setLevels(data.levels);
        setLevel(data.levels[0] ?? "A");
        setStatus("준비됨");
      } catch {
        setStatus("연결 대기중 (API 설정 필요)");
      }
    })();
  }, []);

  // ===== 핸들러 =====

  const handleLoadLevel = async () => {
    try {
      setPdf(null);
      setSentenceReady(false);
      setStatus(`레벨 ${level} 불러오는 중...`);
      const r = await api.loadLevel(level);
      setSentenceReady(true);
      setStatus(`✅ 레벨 ${r.level} — ${r.sentenceCount}문장 INPUT 입력 완료`);
    } catch (e) {
      setStatus(`오류: ${e instanceof ApiError ? e.message : "레벨 로드 실패"}`);
    }
  };

  const handleSaveText = async () => {
    if (!customText.trim()) {
      setStatus("오류: 문장을 입력해주세요.");
      return;
    }
    try {
      setPdf(null);
      setSentenceReady(false);
      setStatus("문장 저장 중...");

      const lines = customText.trim().split(/\r?\n/).filter(Boolean);
      const sentences = lines.map(line => {
        const cols = line.split("\t");
        if (cols.length >= 8) {
          return {
            sentence:    cols[0].trim(),
            subject:     cols[1].trim(),
            verb:        cols[2].trim(),
            object:      cols[3].trim() || "-",
            complement:  cols[4].trim() || "-",
            pattern:     cols[5].trim(),
            grammar:     cols[6].trim(),
            translation: cols[7].trim()
          };
        }
        return { ...emptyRow(), sentence: line.trim() };
      });

      const result = await api.addCustomSentences({
        sentences,
        level: "CUSTOM",
        saveToBank: false
      });
      setSentenceReady(true);
      setCustomText("");
      setStatus(`✅ ${result.count}개 문장 INPUT 저장 완료`);
    } catch (e) {
      setStatus(`오류: ${e instanceof ApiError ? e.message : "저장 실패"}`);
    }
  };

  const updateRow = (
    idx: number,
    field: keyof ReturnType<typeof emptyRow>,
    value: string
  ) => {
    setTableRows(prev =>
      prev.map((r, i) => i === idx ? { ...r, [field]: value } : r)
    );
  };

  const handleSaveTable = async () => {
    const valid = tableRows.filter(r => r.sentence.trim());
    if (valid.length === 0) {
      setStatus("오류: 문장을 최소 1개 이상 입력하세요.");
      return;
    }
    try {
      setPdf(null);
      setSentenceReady(false);
      setStatus("문장 저장 중...");
      const result = await api.addCustomSentences({
        sentences: valid,
        level: "CUSTOM",
        saveToBank: false
      });
      setSentenceReady(true);
      setStatus(`✅ ${result.count}개 문장 INPUT 저장 완료`);
    } catch (e) {
      setStatus(`오류: ${e instanceof ApiError ? e.message : "저장 실패"}`);
    }
  };

  const handleGenerate = async () => {
    if (!sentenceReady) {
      setStatus("오류: 먼저 레벨을 불러오거나 문장을 저장하세요.");
      return;
    }
    try {
      setPdf(null);
      setStatus(`WORKSHEET 생성 중... (옵션 ${option})`);
      const r = await api.generateWorksheet({ option, titlePrefix, studentName });
      setStatus(`✅ WORKSHEET 생성 완료 (${r.sentenceCount}문장)`);
    } catch (e) {
      setStatus(`오류: ${e instanceof ApiError ? e.message : "워크시트 생성 실패"}`);
    }
  };

  const handleCreatePdf = async () => {
    try {
      setStatus("PDF 생성 중...");
      const r = await api.createPdf("SGS_영어_워크시트");
      setPdf(r);
      setStatus(`✅ PDF 생성 완료 (${r.fileName})`);
    } catch (e) {
      setStatus(`오류: ${e instanceof ApiError ? e.message : "PDF 생성 실패"}`);
    }
  };

  const handleSaveLog = async () => {
    try {
      setStatus("LOG 저장 중...");
      await api.saveWeeklyMetrics(metrics);
      setStatus("✅ LOG 저장 완료");
      setMetrics({
        student: "", week: "", level: "A",
        svTotal: 0, svCorrect: 0, formTotal: 0, formCorrect: 0,
        transSent: 0, transErr: 0, memo: ""
      });
    } catch (e) {
      setStatus(`오류: ${e instanceof ApiError ? e.message : "LOG 저장 실패"}`);
    }
  };

  // ===== JSX =====
  return (
    <div className="container">
      <h2 className="title">SGS 영어 구조훈련 (Premium)</h2>

      {/* ━━━ STEP 1: 문장 입력 ━━━ */}
      <div className="card">
        <h3>1) 문장 입력</h3>

        <div className="tab-group">
          <button
            className={`tab-btn ${inputMode === "level" ? "active" : ""}`}
            onClick={() => { setInputMode("level"); setSentenceReady(false); }}
          >
            📚 레벨 문제은행
          </button>
          <button
            className={`tab-btn ${inputMode === "custom" ? "active" : ""}`}
            onClick={() => { setInputMode("custom"); setSentenceReady(false); }}
          >
            ✏️ 직접 입력
          </button>
        </div>

        {/* 레벨 문제은행 패널 */}
        {inputMode === "level" && (
          <div className="panel">
            <div className="row">
              <select
                value={level}
                onChange={e => setLevel(e.target.value as Level)}
              >
                {levels.length > 0
                  ? levels.map(l => <option key={l} value={l}>레벨 {l}</option>)
                  : <option>로딩중...</option>
                }
              </select>
              <button onClick={handleLoadLevel} className="primary">
                INPUT에 불러오기
              </button>
            </div>
          </div>
        )}

        {/* 직접 입력 패널 */}
        {inputMode === "custom" && (
          <div className="panel">
            <div className="tab-group sub">
              <button
                className={`tab-btn ${customMode === "text" ? "active" : ""}`}
                onClick={() => setCustomMode("text")}
              >
                📋 텍스트 붙여넣기
              </button>
              <button
                className={`tab-btn ${customMode === "table" ? "active" : ""}`}
                onClick={() => setCustomMode("table")}
              >
                📝 항목별 직접 입력
              </button>
            </div>

            {/* 텍스트 붙여넣기 */}
            {customMode === "text" && (
              <div>
                <p className="guide-text">
                  문장만 한 줄씩 입력하거나, 스프레드시트에서 복사한
                  탭 구분 데이터(문장→주어→동사→목적어→보어→형식→문법→해석)를
                  붙여넣으세요.
                </p>
                <textarea
                  rows={7}
                  value={customText}
                  onChange={e => setCustomText(e.target.value)}
                  placeholder={
                    "예시 (문장만):\nI have a dog.\nShe is very kind.\n\n" +
                    "예시 (탭 구분):\nI am a student.\tI\tam\t-\ta student\t2\tbe동사 2형식\t나는 학생이다."
                  }
                  className="full-width"
                  style={{ marginTop: 4 }}
                />
                <button
                  onClick={handleSaveText}
                  className="primary full-width mt-2"
                  disabled={!customText.trim()}
                >
                  INPUT에 저장
                </button>
              </div>
            )}

            {/* 테이블 직접 입력 */}
            {customMode === "table" && (
              <div>
                <p className="guide-text">
                  각 항목을 직접 입력하세요. 문장(*)은 필수입니다.
                </p>
                <div className="table-scroll">
                  <table className="input-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>문장 *</th>
                        <th>주어(S)</th>
                        <th>동사(V)</th>
                        <th>목적어(O)</th>
                        <th>보어(C)</th>
                        <th>형식</th>
                        <th>문법 포인트</th>
                        <th>해석</th>
                        <th>삭제</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((r, idx) => (
                        <tr key={idx}>
                          <td className="cell-num">{idx + 1}</td>
                          <td>
                            <textarea
                              rows={2}
                              className="cell-input wide"
                              value={r.sentence}
                              onChange={e => updateRow(idx, "sentence", e.target.value)}
                              placeholder="영어 문장"
                            />
                          </td>
                          <td>
                            <input className="cell-input" value={r.subject}
                              onChange={e => updateRow(idx, "subject", e.target.value)}
                              placeholder="S" />
                          </td>
                          <td>
                            <input className="cell-input" value={r.verb}
                              onChange={e => updateRow(idx, "verb", e.target.value)}
                              placeholder="V" />
                          </td>
                          <td>
                            <input className="cell-input" value={r.object}
                              onChange={e => updateRow(idx, "object", e.target.value)}
                              placeholder="-" />
                          </td>
                          <td>
                            <input className="cell-input" value={r.complement}
                              onChange={e => updateRow(idx, "complement", e.target.value)}
                              placeholder="-" />
                          </td>
                          <td>
                            <select
                              className="cell-select"
                              value={r.pattern}
                              onChange={e => updateRow(idx, "pattern", e.target.value)}
                            >
                              <option value="">-</option>
                              {["1","2","3","4","5"].map(n => (
                                <option key={n} value={n}>{n}형식</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <textarea
                              rows={2}
                              className="cell-input"
                              value={r.grammar}
                              onChange={e => updateRow(idx, "grammar", e.target.value)}
                              placeholder="예: be동사 2형식"
                            />
                          </td>
                          <td>
                            <textarea
                              rows={2}
                              className="cell-input"
                              value={r.translation}
                              onChange={e => updateRow(idx, "translation", e.target.value)}
                              placeholder="한국어 해석"
                            />
                          </td>
                          <td>
                            <button
                              className="btn-icon-del"
                              onClick={() =>
                                setTableRows(prev => prev.filter((_, i) => i !== idx))
                              }
                            >✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="row mt-2">
                  <button
                    className="secondary"
                    onClick={() => setTableRows(prev => [...prev, emptyRow()])}
                  >
                    + 행 추가
                  </button>
                  <button
                    className="danger-outline"
                    onClick={() => setTableRows([emptyRow()])}
                  >
                    전체 초기화
                  </button>
                  <button
                    className="primary"
                    onClick={handleSaveTable}
                    disabled={tableRows.every(r => !r.sentence.trim())}
                  >
                    INPUT에 저장 ({tableRows.filter(r => r.sentence.trim()).length}개)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {sentenceReady && (
          <div className="ready-badge">
            ✅ 문장 준비 완료 — 아래에서 워크시트 제목/이름 설정 후 생성하세요
          </div>
        )}
      </div>

      {/* ━━━ STEP 2: 워크시트 생성 ━━━ */}
      <div className="card">
        <h3>2) 워크시트 생성</h3>

        <div className="row mt-1">
          <input
            value={titlePrefix}
            onChange={e => setTitlePrefix(e.target.value)}
            placeholder="워크시트 제목"
          />
          <input
            value={studentName}
            onChange={e => setStudentName(e.target.value)}
            placeholder="학생 이름"
          />
        </div>

        <div className="row option-group mt-2">
          <label>
            <input type="radio" checked={option === 1} onChange={() => setOption(1)} />
            옵션1 (S/V + 문법힌트)
          </label>
          <label>
            <input type="radio" checked={option === 2} onChange={() => setOption(2)} />
            옵션2 (구조분석 + 문법)
          </label>
          <label>
            <input type="radio" checked={option === 3} onChange={() => setOption(3)} />
            옵션3 (완전분석 + 작문)
          </label>
        </div>

        <div className="row mt-2">
          <button
            onClick={handleGenerate}
            className="primary"
            disabled={!sentenceReady}
          >
            WORKSHEET 생성
          </button>
          <button onClick={handleCreatePdf} className="secondary">
            PDF 만들기
          </button>
        </div>

        {!sentenceReady && (
          <p className="hint-text">⚠️ 문장을 먼저 불러오거나 직접 입력·저장해야 합니다.</p>
        )}

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

      {/* ━━━ STEP 3: 주간 지표 LOG ━━━ */}
      <div className="card">
        <h3>3) 주간 지표(LOG)</h3>
        <div className="row">
          <input
            value={metrics.student}
            onChange={e => setMetrics({ ...metrics, student: e.target.value })}
            placeholder="학생/반"
          />
          <input
            value={metrics.week}
            onChange={e => setMetrics({ ...metrics, week: e.target.value })}
            placeholder="주차"
          />
          <select
            value={metrics.level as string}
            onChange={e => setMetrics({ ...metrics, level: e.target.value as Level })}
          >
            {(levels.length > 0 ? levels : ["A", "B", "C"]).map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        <div className="row mt-2 items-center">
          <span>SV(총/정답):</span>
          <input type="number" className="short"
            value={metrics.svTotal}
            onChange={e => setMetrics({ ...metrics, svTotal: Number(e.target.value) })}
            min="0" />
          <span>/</span>
          <input type="number" className="short"
            value={metrics.svCorrect}
            onChange={e => setMetrics({ ...metrics, svCorrect: Number(e.target.value) })}
            min="0" />
        </div>

        <div className="row mt-2 items-center">
          <span>형식(총/정답):</span>
          <input type="number" className="short"
            value={metrics.formTotal}
            onChange={e => setMetrics({ ...metrics, formTotal: Number(e.target.value) })}
            min="0" />
          <span>/</span>
          <input type="number" className="short"
            value={metrics.formCorrect}
            onChange={e => setMetrics({ ...metrics, formCorrect: Number(e.target.value) })}
            min="0" />
        </div>

        <div className="row mt-2 items-center">
          <span>해석(문장수/오류):</span>
          <input type="number" className="short"
            value={metrics.transSent}
            onChange={e => setMetrics({ ...metrics, transSent: Number(e.target.value) })}
            min="0" />
          <span>/</span>
          <input type="number" className="short"
            value={metrics.transErr}
            onChange={e => setMetrics({ ...metrics, transErr: Number(e.target.value) })}
            min="0" />
        </div>

        <div className="row mt-2">
          <textarea
            value={metrics.memo}
            onChange={e => setMetrics({ ...metrics, memo: e.target.value })}
            placeholder="메모"
            rows={3}
            className="full-width"
          />
        </div>
        <button onClick={handleSaveLog} className="primary full-width mt-2">
          LOG 저장
        </button>
      </div>

      {/* 상태 표시 바 */}
      <div className={`status-bar ${status.includes("오류") ? "error" : ""}`}>
        {status}
      </div>
    </div>
  );
}