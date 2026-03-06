import { useState, useEffect } from "react";
import { api, ApiError } from "./lib/api";
import type {
  Level,
  WorksheetOption,
  PdfResponse,
  WeeklyMetrics,
  CustomSentenceRow,
} from "./types/api";
import "./App.css";

export default function App() {
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

  const emptyRow = (): CustomSentenceRow => ({
    sentence: "", subject: "", verb: "",
    object: "-", complement: "-",
    pattern: "", grammar: "", translation: "",
  });

  const [tableRows, setTableRows] = useState<CustomSentenceRow[]>([emptyRow()]);
  const [sentenceReady, setSentenceReady] = useState(false);

  // ✅ level: "A" (string) 으로 초기화 — number 아님
  const [metrics, setMetrics] = useState<WeeklyMetrics>({
    student: "", week: "",
    level: "A",           // ← string
    svTotal: 0, svCorrect: 0,
    formTotal: 0, formCorrect: 0,
    transSent: 0, transErr: 0,
    memo: "",
  });

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

  const handleLoadLevel = async () => {
    try {
      setPdf(null); setSentenceReady(false);
      setStatus(`레벨 ${level} 불러오는 중...`);
      const r = await api.loadLevel(level);
      setSentenceReady(true);
      setStatus(`✅ 레벨 ${r.level} — ${r.sentenceCount}문장 INPUT 입력 완료`);
    } catch (e) {
      setStatus(`오류: ${e instanceof ApiError ? e.message : "레벨 로드 실패"}`);
    }
  };

  const handleSaveText = async () => {
    if (!customText.trim()) { setStatus("오류: 문장을 입력해주세요."); return; }
    try {
      setPdf(null); setSentenceReady(false); setStatus("문장 저장 중...");
      const lines = customText.trim().split(/\r?\n/).filter(Boolean);

      // ✅ CustomSentenceRow[] 타입으로 명시
      const sentences: CustomSentenceRow[] = lines.map(line => {
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
            translation: cols[7].trim(),
          };
        }
        return { ...emptyRow(), sentence: line.trim() };
      });

      const result = await api.addCustomSentences({ sentences, level: "CUSTOM", saveToBank: false });
      setSentenceReady(true);
      setCustomText("");
      setStatus(`✅ ${result.count}개 문장 INPUT 저장 완료`);
    } catch (e) {
      setStatus(`오류: ${e instanceof ApiError ? e.message : "저장 실패"}`);
    }
  };

  const updateRow = (idx: number, field: keyof CustomSentenceRow, value: string) => {
    setTableRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const handleSaveTable = async () => {
    const valid = tableRows.filter(r => r.sentence.trim());
    if (valid.length === 0) { setStatus("오류: 문장을 최소 1개 이상 입력하세요."); return; }
    try {
      setPdf(null); setSentenceReady(false); setStatus("문장 저장 중...");
      const result = await api.addCustomSentences({ sentences: valid, level: "CUSTOM", saveToBank: false });
      setSentenceReady(true);
      setStatus(`✅ ${result.count}개 문장 INPUT 저장 완료`);
    } catch (e) {
      setStatus(`오류: ${e instanceof ApiError ? e.message : "저장 실패"}`);
    }
  };

  const handleGenerate = async () => {
    if (!sentenceReady) { setStatus("오류: 먼저 레벨을 불러오거나 문장을 저장하세요."); return; }
    try {
      setPdf(null); setStatus(`WORKSHEET 생성 중... (옵션 ${option})`);
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
        svTotal: 0, svCorrect: 0,
        formTotal: 0, formCorrect: 0,
        transSent: 0, transErr: 0, memo: "",
      });
    } catch (e) {
      setStatus(`오류: ${e instanceof ApiError ? e.message : "LOG 저장 실패"}`);
    }
  };

  return (
    <div className="container">
      <h2 className="title">SGS 영어 구조훈련 (Premium)</h2>

      {/* ── STEP 1: 문장 입력 ── */}
      <div className="card">
        <h3>1) 문장 입력</h3>
        <div className="tab-group">
          <button className={`tab-btn ${inputMode === "level" ? "active" : ""}`} onClick={() => setInputMode("level")}>📚 레벨 문장 불러오기</button>
          <button className={`tab-btn ${inputMode === "custom" ? "active" : ""}`} onClick={() => setInputMode("custom")}>✏️ 직접 입력</button>
        </div>

        {inputMode === "level" && (
          <div className="panel">
            <div className="row">
              <select value={level} onChange={e => setLevel(e.target.value)}>
                {levels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <button className="primary" onClick={handleLoadLevel}>불러오기</button>
            </div>
          </div>
        )}

        {inputMode === "custom" && (
          <div className="panel">
            <div className="tab-group sub">
              <button className={`tab-btn ${customMode === "text" ? "active" : ""}`} onClick={() => setCustomMode("text")}>붙여넣기</button>
              <button className={`tab-btn ${customMode === "table" ? "active" : ""}`} onClick={() => setCustomMode("table")}>직접 입력</button>
            </div>

            {customMode === "text" && (
              <div>
                <p className="guide-text">엑셀/스프레드시트에서 복사 후 붙여넣기<br/>열 순서: 문장 | 주어 | 동사 | 목적어 | 보어 | 패턴 | 문법 | 해석</p>
                <textarea className="full-width textarea" rows={8} value={customText} onChange={e => setCustomText(e.target.value)} placeholder="여기에 붙여넣기..." />
                <button className="primary mt-1" onClick={handleSaveText}>저장</button>
              </div>
            )}

            {customMode === "table" && (
              <div>
                <div className="table-scroll">
                  <table className="input-table">
                    <thead>
                      <tr>
                        <th>#</th><th>문장*</th><th>주어</th><th>동사</th>
                        <th>목적어</th><th>보어</th><th>패턴</th><th>문법</th><th>해석</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((r, i) => (
                        <tr key={i}>
                          <td className="cell-num">{i + 1}</td>
                          {(["sentence","subject","verb","object","complement","pattern","grammar","translation"] as (keyof CustomSentenceRow)[]).map(f => (
                            <td key={f}><textarea className={`cell-input ${f === "sentence" ? "wide" : ""}`} rows={2} value={r[f]} onChange={e => updateRow(i, f, e.target.value)} /></td>
                          ))}
                          <td><button className="btn-icon-del" onClick={() => setTableRows(p => p.filter((_, j) => j !== i))}>✕</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="row mt-1">
                  <button className="secondary" onClick={() => setTableRows(p => [...p, emptyRow()])}>+ 행 추가</button>
                  <button className="primary" onClick={handleSaveTable}>저장</button>
                </div>
              </div>
            )}
          </div>
        )}

        {sentenceReady && <div className="ready-badge">✅ 문장 준비 완료 — 워크시트를 생성하세요</div>}
      </div>

      {/* ── STEP 2: 워크시트 생성 ── */}
      <div className="card">
        <h3>2) 워크시트 생성</h3>
        <div className="row">
          <input value={titlePrefix} onChange={e => setTitlePrefix(e.target.value)} placeholder="워크시트 제목" />
        </div>
        <div className="row mt-1">
          <input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="학생 이름 (선택)" />
        </div>
        <div className="option-group row mt-2">
          {([1, 2, 3] as WorksheetOption[]).map(o => (
            <label key={o}>
              <input type="radio" name="option" value={o} checked={option === o} onChange={() => setOption(o)} />
              {o === 1 ? "S/V 10초 훈련" : o === 2 ? "구조 분석" : "완전 분석"}
            </label>
          ))}
        </div>
        <div className="row mt-2">
          <button className="primary" onClick={handleGenerate}>워크시트 생성</button>
          <button className="secondary" onClick={handleCreatePdf}>PDF 생성</button>
        </div>
        {pdf && (
          <div className="pdf-box">
            <p>📄 {pdf.fileName}</p>
            <a className="btn-link" href={pdf.viewUrl} target="_blank" rel="noreferrer">미리보기</a>
            <a className="btn-link" href={pdf.downloadUrl} target="_blank" rel="noreferrer">다운로드</a>
          </div>
        )}
      </div>

      {/* ── STEP 3: 주간 LOG ── */}
      <div className="card">
        <h3>3) 주간 지표(LOG)</h3>
        <div className="row"><input placeholder="학생 이름" value={metrics.student} onChange={e => setMetrics(p => ({ ...p, student: e.target.value }))} /></div>
        <div className="row mt-1">
          <input placeholder="주차 (예: 2026-W10)" value={metrics.week} onChange={e => setMetrics(p => ({ ...p, week: e.target.value }))} />
          {/* ✅ level은 string이므로 그대로 e.target.value 사용 */}
          <input placeholder="레벨 (예: A, 중1, 수능)" value={metrics.level} onChange={e => setMetrics(p => ({ ...p, level: e.target.value }))} className="short" />
        </div>
        <div className="row mt-1">
          <input type="number" placeholder="S/V 전체" value={metrics.svTotal} onChange={e => setMetrics(p => ({ ...p, svTotal: Number(e.target.value) }))} />
          <input type="number" placeholder="S/V 정답" value={metrics.svCorrect} onChange={e => setMetrics(p => ({ ...p, svCorrect: Number(e.target.value) }))} />
        </div>
        <div className="row mt-1">
          <input type="number" placeholder="형식 전체" value={metrics.formTotal} onChange={e => setMetrics(p => ({ ...p, formTotal: Number(e.target.value) }))} />
          <input type="number" placeholder="형식 정답" value={metrics.formCorrect} onChange={e => setMetrics(p => ({ ...p, formCorrect: Number(e.target.value) }))} />
        </div>
        <div className="row mt-1">
          <input type="number" placeholder="해석 문장수" value={metrics.transSent} onChange={e => setMetrics(p => ({ ...p, transSent: Number(e.target.value) }))} />
          <input type="number" placeholder="해석 오류수" value={metrics.transErr} onChange={e => setMetrics(p => ({ ...p, transErr: Number(e.target.value) }))} />
        </div>
        <div className="row mt-1">
          <input placeholder="메모" value={metrics.memo} onChange={e => setMetrics(p => ({ ...p, memo: e.target.value }))} />
        </div>
        <button className="secondary mt-2" onClick={handleSaveLog}>LOG 저장</button>
      </div>

      <div className={`status-bar ${status.startsWith("오류") ? "error" : ""}`}>{status}</div>
    </div>
  );
}