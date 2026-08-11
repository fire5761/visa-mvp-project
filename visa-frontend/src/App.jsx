import { useState, useRef, useEffect } from "react";
import "./App.css";

// ⚠️ 실제 백엔드 Cloud Run URL로 교체하세요.
const API_BASE = "https://visa-mvp-backend-873486177911.asia-northeast3.run.app";

const APPLICATION_TYPES = [
  "외국인등록",
  "체류자격외활동허가",
  "등록증재발급",
  "근무처변경추가허가",
  "체류기간연장허가",
  "재입국허가",
  "체류자격변경허가",
  "체류지변경신고",
  "체류자격부여",
  "등록사항변경신고",
];

const DESIRED_STATUS_REQUIRED_TYPES = new Set([
  "체류자격외활동허가",
  "체류자격변경허가",
  "체류자격부여",
]);

const INITIAL_FORM_DATA = {
  application_type: "체류기간연장허가",
  desired_status: "",
  visa_type: "",
  surname: "",
  given_name: "",
  date_of_birth: "",
  sex: "M",
  nationality: "",
  arc_number_front: "",
  arc_number_back: "",
  passport_number: "",
  passport_issue_date: "",
  passport_expiry_date: "",
  visa_expiry_date: "",
  address: "",
  phone: "",
  mobile_phone: "",
  home_country_address: "",
  home_country_phone: "",
  email: "",
};

function Stamp({ children, variant = "" }) {
  return <span className={`stamp ${variant}`}>{children}</span>;
}

/* ============================= 사이트 헤더 (전체 폭) ============================= */
function SiteHeader({ activePage, setActivePage }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="site-brand">
          <Stamp variant="filled">비자</Stamp>
          <span className="site-brand-name">국민비서 유학생편</span>
        </div>
        <nav className="site-nav">
          <button
            className={activePage === "form" ? "active" : ""}
            onClick={() => setActivePage("form")}
          >
            서류 작성
          </button>
          <button
            className={activePage === "chat" ? "active" : ""}
            onClick={() => setActivePage("chat")}
          >
            상담 서비스
          </button>
        </nav>
      </div>
    </header>
  );
}

/* ============================= 서류 작성 페이지 ============================= */
function DocumentFormPage() {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [wantsNotification, setWantsNotification] = useState(true);
  const [errors, setErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const needsDesiredStatus = DESIRED_STATUS_REQUIRED_TYPES.has(formData.application_type);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors([]);
    setSuccessMessage("");

    const payload = { ...formData };
    if (!needsDesiredStatus) {
      payload.desired_status = null;
    }

    if (wantsNotification) {
      try {
        await fetch(`${API_BASE}/api/v1/user/profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        // 알림 등록 실패는 조용히 넘어가고 PDF 생성은 계속 진행
      }
    }

    try {
      const response = await fetch(`${API_BASE}/api/v1/document/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        if (errorBody && Array.isArray(errorBody.detail)) {
          setErrors(errorBody.detail.map((d) => d.msg || JSON.stringify(d)));
        } else if (errorBody && errorBody.detail) {
          setErrors([String(errorBody.detail)]);
        } else {
          setErrors([`서버 오류가 발생했습니다 (${response.status})`]);
        }
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "visa_application_package.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setSuccessMessage(
        wantsNotification
          ? "신청서를 내려받았습니다. 안내문(1페이지)을 확인하고 서명 후 제출하세요. 만료 30일 전 이메일로 알려드릴게요."
          : "신청서를 내려받았습니다. 안내문(1페이지)을 확인하고 서명 후 제출하세요."
      );
    } catch (err) {
      setErrors([`요청을 처리하지 못했습니다: ${err.message}`]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-page-inner">
      <div className="page-heading">
        <h1>체류허가 신청서 자동작성</h1>
        <p className="page-subtitle">
          아래 정보를 입력하면 안내문과 신청서가 담긴 PDF 한 장으로 정리됩니다.
          막히는 부분은 상단 &ldquo;상담 서비스&rdquo;에서 물어보세요.
        </p>
      </div>

      <div className="form-card">
        <section>
          <div className="form-section-title">신청 구분</div>
          <label>
            신청 구분
            <select
              value={formData.application_type}
              onChange={(e) => updateField("application_type", e.target.value)}
            >
              {APPLICATION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          {needsDesiredStatus && (
            <label>
              희망 자격
              <input
                type="text"
                value={formData.desired_status}
                onChange={(e) => updateField("desired_status", e.target.value)}
                placeholder="예: D-4-1"
              />
            </label>
          )}

          <label>
            현재 비자 타입
            <input
              type="text"
              value={formData.visa_type}
              onChange={(e) => updateField("visa_type", e.target.value)}
              placeholder="예: D-2-2"
            />
          </label>
        </section>

        <section>
          <div className="form-section-title">인적사항</div>
          <label>
            성 (Surname)
            <input type="text" value={formData.surname} onChange={(e) => updateField("surname", e.target.value)} placeholder="KIM" />
          </label>
          <label>
            이름 (Given name)
            <input type="text" value={formData.given_name} onChange={(e) => updateField("given_name", e.target.value)} placeholder="MINJUN" />
          </label>
          <label>
            생년월일
            <input type="date" value={formData.date_of_birth} onChange={(e) => updateField("date_of_birth", e.target.value)} />
          </label>
          <label>
            성별
            <select value={formData.sex} onChange={(e) => updateField("sex", e.target.value)}>
              <option value="M">남</option>
              <option value="F">여</option>
            </select>
          </label>
          <label>
            국적
            <input type="text" value={formData.nationality} onChange={(e) => updateField("nationality", e.target.value)} placeholder="CHINA" />
          </label>
        </section>

        <section>
          <div className="form-section-title">여권 정보</div>
          <label>
            외국인등록번호 앞자리
            <input type="text" maxLength={6} value={formData.arc_number_front} onChange={(e) => updateField("arc_number_front", e.target.value)} placeholder="030512" />
            <span className="field-hint">숫자 6자리</span>
          </label>
          <label>
            외국인등록번호 뒷자리
            <input type="text" maxLength={7} value={formData.arc_number_back} onChange={(e) => updateField("arc_number_back", e.target.value)} placeholder="1234567" />
            <span className="field-hint">숫자 7자리</span>
          </label>
          <label>
            여권번호
            <input type="text" value={formData.passport_number} onChange={(e) => updateField("passport_number", e.target.value)} />
          </label>
          <label>
            여권 발급일자
            <input type="date" value={formData.passport_issue_date} onChange={(e) => updateField("passport_issue_date", e.target.value)} />
          </label>
          <label>
            여권 유효기간
            <input type="date" value={formData.passport_expiry_date} onChange={(e) => updateField("passport_expiry_date", e.target.value)} />
          </label>
          <label>
            현재 체류기간 만료일
            <input type="date" value={formData.visa_expiry_date} onChange={(e) => updateField("visa_expiry_date", e.target.value)} />
          </label>
        </section>

        <section>
          <div className="form-section-title">연락처</div>
          <label>
            대한민국 내 주소
            <input type="text" value={formData.address} onChange={(e) => updateField("address", e.target.value)} />
          </label>
          <label>
            전화번호
            <input type="text" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="031-123-4567" />
          </label>
          <label>
            휴대전화
            <input type="text" value={formData.mobile_phone} onChange={(e) => updateField("mobile_phone", e.target.value)} placeholder="010-1234-5678" />
          </label>
          <label>
            본국 주소
            <input type="text" value={formData.home_country_address} onChange={(e) => updateField("home_country_address", e.target.value)} />
          </label>
          <label>
            본국 전화번호
            <input type="text" value={formData.home_country_phone} onChange={(e) => updateField("home_country_phone", e.target.value)} />
          </label>
          <label>
            이메일
            <input type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} />
          </label>

          <div className="opt-in">
            <input
              type="checkbox"
              id="notify-optin"
              checked={wantsNotification}
              onChange={(e) => setWantsNotification(e.target.checked)}
            />
            <label htmlFor="notify-optin" style={{ margin: 0, fontWeight: 400 }}>
              체류 만료 30일 전, 위 이메일로 알려드릴게요.
            </label>
          </div>
        </section>

        {errors.length > 0 && (
          <div className="error-box">
            <Stamp variant="small">!</Stamp>
            <div>
              {errors.map((msg, i) => <p key={i}>{msg}</p>)}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="success-box">
            <Stamp variant="success small">✓</Stamp>
            <p>{successMessage}</p>
          </div>
        )}

        <button className="btn-submit" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "작성 중입니다 · 최대 10초 정도 걸려요" : "신청서 자동 작성 및 다운로드"}
        </button>
      </div>
    </div>
  );
}

/* ============================= 상담 서비스 페이지 (전체 화면 채팅) ============================= */
function ConsultationPage() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "안녕하세요! 서류 준비나 신청 절차, 재학증명서·성적증명서 같은 발급 서류가 궁금하시면 편하게 물어보세요." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: nextMessages.slice(0, -1),
        }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer || "답변을 받아오지 못했습니다." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="chat-page-inner">
      <div className="page-heading">
        <h1>상담 서비스</h1>
        <p className="page-subtitle">서류 작성 중 궁금한 점을 바로 물어보세요.</p>
      </div>

      <div className="chat-page-card">
        <div className="chat-page-messages" ref={listRef}>
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble-row ${m.role}`}>
              <div className={`chat-bubble ${m.role}`}>{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="chat-bubble-row assistant">
              <div className="chat-bubble assistant chat-typing">입력 중...</div>
            </div>
          )}
        </div>

        <div className="chat-input-row">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="예: 성적증명서는 어디서 발급받나요?"
          />
          <button className="btn-primary chat-send-btn" onClick={send} disabled={loading}>전송</button>
        </div>
      </div>
    </div>
  );
}

/* ============================= 메인 앱 ============================= */
function App() {
  const [activePage, setActivePage] = useState("form"); // 기본 진입 페이지 = 서류 작성

  return (
    <div className="site-shell">
      <SiteHeader activePage={activePage} setActivePage={setActivePage} />
      <main className="site-main">
        {/* 두 페이지를 항상 마운트해두고 화면 전환만 하여, 탭을 옮겨도 입력값/대화가 유지됨 */}
        <div className={`page ${activePage === "form" ? "active" : ""}`}>
          <DocumentFormPage />
        </div>
        <div className={`page ${activePage === "chat" ? "active" : ""}`}>
          <ConsultationPage />
        </div>
      </main>
    </div>
  );
}

export default App;
