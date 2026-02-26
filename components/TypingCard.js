import React, { useState, useEffect, useRef, useCallback } from "react";
import styled from "styled-components";
import Preview from "./Preview";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useRouter } from "next/router";

// UI COMPONENTS -----------------------------
const Loader = styled.div`
  text-align: center;
  padding: 1.5rem;
  font-size: 1.2rem;
  color: #444;
`;

const OuterWrapper = styled.div`
  width: 100%;
  padding: 0;
  margin: 0;
  display: flex;
  justify-content: center;
`;

const TypingCardContainer = styled.div`
  background: #f8faff;
  padding: 1.5rem 2rem;
  width: 98vw;
  max-width: 1800px;
  margin: 10px auto;
  border-radius: 12px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h3`
  font-size: 1.3rem;
  font-weight: 700;
`;

const Timer = styled.div`
  font-size: 1.2rem;
  font-weight: 700;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: ${({ urgent }) => (urgent ? "#ff4d4d" : "#007bff")};
  background: ${({ urgent }) =>
    urgent ? "rgba(255,77,77,0.15)" : "rgba(0,123,255,0.15)"};
  border: 3px solid
    ${({ urgent }) => (urgent ? "#ff4d4d" : "rgba(0,123,255,0.45)")};
`;

const TypingPanel = styled.div`
  width: 100%;
  background: #e7f0ff;
  border: 1px solid #a4c7f3;
  border-radius: 12px;
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 140px;
  padding: 14px;
  font-size: 1.2rem;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #b0cef5;
  resize: none;
`;

const Centered = styled.div`
  display: flex;
  justify-content: center;
`;

const StartButton = styled.button`
  background: linear-gradient(90deg, #007bff, #0057d8);
  color: white;
  padding: 12px 26px;
  border-radius: 10px;
  cursor: pointer;
  border: none;
`;

const formatTime = (seconds) => {
  const sec = Math.max(0, seconds ?? 0);
  const minutes = Math.floor(sec / 60);
  const remainingSeconds = sec % 60;
  return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
};

// COMPONENT --------------------------------
export default function TypingCard({ studentId }) {
  const router = useRouter();

  const [text, setText] = useState("");
  const [countDown, setCountDown] = useState(null);
  const [typingEnabled, setTypingEnabled] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [errorIndex, setErrorIndex] = useState(null);
  const [userInputState, setUserInputState] = useState("");
  const [cursorIndex, setCursorIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [storedStudentId, setStoredStudentId] = useState(null);
  const [studentName, setStudentName] = useState("");

  const [sessionId, setSessionId] = useState(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [testStep, setTestStep] = useState("instructions");
  const [agreed, setAgreed] = useState(false);

  // REFS
  const paragraphIdRef = useRef(null);
  const textAreaRef = useRef(null);
  const userInputRef = useRef("");
  const secRef = useRef(0);
  const backspaceCountRef = useRef(0);
  const completionTimeRef = useRef(null);
  const intervalRef = useRef(null);
  const submittedRef = useRef(false);
  const draftSaveTimeoutRef = useRef(null);

  const paragraph = useQuery(api.paragraphs.getParagraph);
  const timeSetting = useQuery(api.timeSettings.getTimeSetting);

  const saveResult = useMutation(api.results.saveResult);
  const saveDraft = useMutation(api.typingDrafts.saveDraft);
  const markSubmitted = useMutation(api.typingDrafts.markSubmitted);

  // backend test active flag
  const updateTestActive = useMutation(api.sessions.updateTestActive);

  const resolvedStudentId = studentId ?? storedStudentId ?? null;

  const draft = useQuery(
    api.typingDrafts.getDraft,
    resolvedStudentId && sessionId
      ? { studentId: resolvedStudentId, sessionId }
      : "skip"
  );

  // -------------------------------------------
  // Load sessionStorage values
  // -------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsActive(sessionStorage.getItem("testActive") === "true");

    const sid = sessionStorage.getItem("studentId");
    if (sid) setStoredStudentId(sid);

    const storedName = sessionStorage.getItem("studentName");
    if (storedName) setStudentName(storedName);

    const sessId = sessionStorage.getItem("sessionId");
    if (sessId) setSessionId(sessId);

     const accepted = sessionStorage.getItem("instructionsAccepted");
  if (accepted === "true") {
    setTestStep("test");
  }

  }, []);

  // -------------------------------------------
  // Save result helper
  // -------------------------------------------
 const handleSaveResultToDB = useCallback(
  async ({ input, seconds }) => {
    const finalInput = input ?? userInputRef.current ?? "";

    let correctChars = 0;
    for (let i = 0; i < finalInput.length; i++) {
      if (finalInput[i] === text[i]) correctChars++;
    }

    const secondsTaken =
      completionTimeRef.current ?? seconds ?? Math.max(1, secRef.current);

    const totalTyped = finalInput.length + backspaceCountRef.current;
    const mistakes = backspaceCountRef.current;

    const accuracy =
      totalTyped === 0
        ? 0
        : Math.round(((totalTyped - mistakes) / totalTyped) * 100);

    const wpm = Math.round((correctChars * 60) / (5 * secondsTaken));

    const kdph = Math.round(wpm * 5 * 60);

    let resolvedStudentIdLocal = studentId ?? storedStudentId ?? null;
    if (!resolvedStudentIdLocal && typeof window !== "undefined") {
      resolvedStudentIdLocal = sessionStorage.getItem("studentId");
    }

    //  FIX name safely
    let finalName = studentName;
    if (!finalName || finalName.trim() === "") {
      finalName = sessionStorage.getItem("studentName") || "N/A";
    }

    //  ONLY ONE resultId declaration
    const resultId = await saveResult({
      studentId: resolvedStudentIdLocal,
      paragraphId: paragraphIdRef.current,
      symbols: correctChars,
      seconds: secondsTaken,
      accuracy,
      wpm,
      kdph,
      text: finalInput,
    });

    return resultId;
  },
  [saveResult, studentId, storedStudentId, text, studentName]
);

  // -------------------------------------------
  // Auto submit
  // -------------------------------------------
  const doAutoSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    clearInterval(intervalRef.current);
    setFinished(true);
    setTypingEnabled(false);

    //  mark backend inactive
    try {
      const token = sessionStorage.getItem("token");
      if (token) await updateTestActive({ token, active: false });
    } catch {}

    const resultId = await handleSaveResultToDB({
  input: userInputRef.current,
  seconds: secRef.current,
});

    if (resolvedStudentId && sessionId) {
      await markSubmitted({ studentId: resolvedStudentId, sessionId });
    }

    sessionStorage.removeItem("testActive");
    sessionStorage.removeItem("typingState");
    sessionStorage.removeItem("instructionsAccepted");

    await fetch("/api/logout", { method: "POST" });
    router.replace(`/test-submitted?resultId=${resultId}`);
  }, [
    handleSaveResultToDB,
    router,
    resolvedStudentId,
    sessionId,
    markSubmitted,
    updateTestActive,
  ]);

  // -------------------------------------------
  // Restore logic
  // -------------------------------------------
  useEffect(() => {
    if (!paragraph || !paragraph._id || !timeSetting) return;
    if (typeof window === "undefined") return;

    const cleaned = (paragraph.content || "").replace(/^\s+|\uFEFF/g, "");
    paragraphIdRef.current = paragraph._id;
    setText(cleaned);

    setTimeout(async () => {
      const saved = sessionStorage.getItem("typingState");

      //  restore from sessionStorage
      if (saved) {
        const s = JSON.parse(saved);

        if (s.paragraphId === paragraph._id && cleaned.length > 5) {
          setUserInputState(s.text);
          userInputRef.current = s.text;

          setCountDown(s.countDown ?? timeSetting.duration);

          setStarted(!!s.started);
          setFinished(!!s.finished);
          setCursorIndex(s.cursorIndex ?? 0);
          setErrorIndex(s.errorIndex ?? null);
          backspaceCountRef.current = s.backspaces ?? 0;

          if (s.started && !s.finished) {
            setTypingEnabled(true);

            //  mark backend ACTIVE immediately
            try {
              const token = sessionStorage.getItem("token");
              if (token) await updateTestActive({ token, active: true });
            } catch {}

            clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
              secRef.current++;

              setCountDown((prev) => {
                if (prev <= 1) {
                  clearInterval(intervalRef.current);
                  doAutoSubmit();
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }
          return;
        }
      }

      //  restore from convex draft
      if (!saved && draft && !draft.isSubmitted && !draftRestored) {
        if (draft.paragraphId === paragraph._id && cleaned.length > 5) {
          setDraftRestored(true);

          sessionStorage.setItem("testActive", "true");
          setIsActive(true);

          setUserInputState(draft.typedText || "");
          userInputRef.current = draft.typedText || "";

          const remainingSeconds =
            typeof draft.remainingSeconds === "number"
              ? draft.remainingSeconds
              : timeSetting.duration;

          setCountDown(remainingSeconds);

          setStarted(!!draft.started);
          setFinished(false);
          setTypingEnabled(!!draft.started);

          setCursorIndex((draft.typedText || "").length);
          setErrorIndex(null);

          //  mark backend ACTIVE immediately
          try {
            const token = sessionStorage.getItem("token");
            if (token) await updateTestActive({ token, active: true });
          } catch {}

          if (draft.started && remainingSeconds <= 0) {
            doAutoSubmit();
            return;
          }

          if (draft.started && remainingSeconds > 0) {
            clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
              secRef.current++;

              setCountDown((prev) => {
                if (prev <= 1) {
                  clearInterval(intervalRef.current);
                  doAutoSubmit();
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }
          return;
        }
      }

      if (countDown === null) {
        setCountDown(timeSetting.duration ?? 60);
      }
    }, 30);
  }, [
    paragraph,
    timeSetting,
    doAutoSubmit,
    countDown,
    draft,
    draftRestored,
    updateTestActive,
  ]);

  // -------------------------------------------
  //  SAVE DRAFT AUTO (EVERY 2 SECONDS)  FIXED
  // -------------------------------------------
  useEffect(() => {
    if (!resolvedStudentId || !sessionId) return;
    if (!paragraphIdRef.current) return;
    if (!started || finished) return;
    if (!timeSetting?.duration) return;

    const interval = setInterval(() => {
      const safeRemainingSeconds =
        typeof countDown === "number" ? countDown : timeSetting.duration;

      saveDraft({
        studentId: resolvedStudentId,
        sessionId,
        paragraphId: paragraphIdRef.current,
        typedText: userInputRef.current || "",
        started: true,
        duration: timeSetting.duration,
        remainingSeconds: Math.max(0, safeRemainingSeconds),
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [
    resolvedStudentId,
    sessionId,
    started,
    finished,
    countDown,
    timeSetting,
    saveDraft,
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);
    };
  }, []);

  // -------------------------------------------
  // Start timer
  // -------------------------------------------
  const startTimer = useCallback(async () => {
    if (started) return;

    const duration = timeSetting?.duration || 60;
    setCountDown(duration);

    secRef.current = 0;
    completionTimeRef.current = null;

    setStarted(true);
    setTypingEnabled(true);
    submittedRef.current = false;
        //  Auto focus typing area
    setTimeout(() => {
      textAreaRef.current?.focus();
    }, 0);

    //mark backend ACTIVE
    try {
      const token = sessionStorage.getItem("token");
      if (token) await updateTestActive({ token, active: true });
    } catch {}

    // save first draft immediately
    const sessId = sessionStorage.getItem("sessionId");
    const sid =
      studentId ?? storedStudentId ?? sessionStorage.getItem("studentId");

    if (sid && sessId && paragraphIdRef.current) {
      saveDraft({
        studentId: sid,
        sessionId: sessId,
        paragraphId: paragraphIdRef.current,
        typedText: userInputRef.current || "",
        started: true,
        duration,
        remainingSeconds: duration,
      });
    }

    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      secRef.current++;

      setCountDown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          doAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [
    started,
    timeSetting,
    doAutoSubmit,
    saveDraft,
    studentId,
    storedStudentId,
    updateTestActive,
  ]);

  // -------------------------------------------
  //  User input strict lock
  // -------------------------------------------
  const onUserInputChange = (e) => {
    if (!isActive || finished) return;
    if (!typingEnabled) return;

    const value = e.target.value;
    const prevValue = userInputRef.current;

    // backspaces count
    if (value.length < prevValue.length) {
      backspaceCountRef.current += prevValue.length - value.length;
    }

    setCursorIndex(value.length);
    if (value.length > text.length) return;

    // strict lock
    if (errorIndex !== null) {
      if (value.length < userInputRef.current.length) {
        userInputRef.current = value;
        setUserInputState(value);

        if (text.startsWith(value)) {
          setErrorIndex(null);
        }
      }
      return;
    }

    const idx = value.length - 1;
    if (value[idx] !== text[idx] && value[idx] !== undefined) {
      setErrorIndex(idx);
      userInputRef.current = value;
      setUserInputState(value);
      return;
    }

    userInputRef.current = value;
    setUserInputState(value);
    setErrorIndex(null);

    // debounce save
    if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);

    draftSaveTimeoutRef.current = setTimeout(() => {
      if (!resolvedStudentId || !sessionId) return;
      if (!paragraphIdRef.current) return;
      if (!started || finished) return;

      const safeRemainingSeconds =
        typeof countDown === "number"
          ? countDown
          : timeSetting?.duration || 60;

      saveDraft({
        studentId: resolvedStudentId,
        sessionId,
        paragraphId: paragraphIdRef.current,
        typedText: value,
        started: true,
        duration: timeSetting?.duration || 60,
        remainingSeconds: Math.max(0, safeRemainingSeconds),
      });
    }, 400);
  };

  // Render
  if (!studentId && !storedStudentId) return <Loader>Loading...</Loader>;
  if (!paragraph || !timeSetting) return <Loader>Loading test...</Loader>;
  if (countDown === null) return <Loader>Preparing...</Loader>;

// ✅ Instructions Screen
if (testStep === "instructions") {
  return (
    <OuterWrapper>
      <TypingCardContainer>
        <Title>Typing Test Instructions</Title>

        {/* Instructions */}
        <div style={{ lineHeight: "1.8", fontSize: "16px" }}>
          <p>• Do not touch mouse once test starts.</p>
          <p>• Do not refresh the page.</p>
          <p>• Do not press back button.</p>
          <p>• Do not switch tabs or minimize the browser.</p>
          <p>• Copy/Paste is strictly prohibited.</p>
          <p>• The test will auto-submit when time ends.</p>
        </div>

        {/*  Information Section MUST BE HERE */}
        <div
          style={{
            marginTop: "25px",
            padding: "15px",
            background: "#f0f6ff",
            borderRadius: "10px",
            border: "1px solid #c7ddff",
          }}
        >
          <p><strong>Test Information:</strong></p>
          <p>• Duration: {timeSetting?.duration || 60} seconds</p>
          <p>• Paragraph will be displayed on screen.</p>
          <p>• Accuracy, WPM and KDPH will be calculated.</p>
          <p>• Mistakes must be corrected with backspace to proceed.</p>
          <p>• Test state is saved every 2 seconds.</p>
        </div>

        <Centered style={{ marginTop: "25px" }}>
          <StartButton onClick={() => setTestStep("declaration")}>
            Continue
          </StartButton>
        </Centered>
      </TypingCardContainer>
    </OuterWrapper>
  );
}

//  Declaration Screen
if (testStep === "declaration") {
  return (
    <OuterWrapper>
      <TypingCardContainer>
        <Title>Declaration</Title>

        <p style={{ lineHeight: "1.8", fontSize: "16px" }}>
          I hereby declare that I will attempt this typing test honestly
          and will not use any unfair means. I understand that violation
          of rules may lead to disqualification.
        </p>

        <div style={{ marginTop: "20px" }}>
          <label style={{ display: "flex", gap: "10px" }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            I Agree
          </label>
        </div>

        <Centered style={{ marginTop: "20px" }}>
          <StartButton
            disabled={!agreed}
            style={{
              opacity: agreed ? 1 : 0.6,
              cursor: agreed ? "pointer" : "not-allowed",
            }}
            onClick={() => {
              sessionStorage.setItem("instructionsAccepted", "true");
              setTestStep("test");
}}
          >
            Agree & Continue
          </StartButton>
        </Centered>
      </TypingCardContainer>
    </OuterWrapper>
  );
}

if (testStep === "test") {
  return (
    <OuterWrapper>
      <TypingCardContainer>
        <Header>
          <Title>Typing Test</Title>
          <Timer urgent={countDown <= 10}>{formatTime(countDown)}</Timer>
        </Header>

        <TypingPanel>
          <Preview
            text={text}
            userInput={userInputState}
            errorIndex={errorIndex}
            cursorIndex={cursorIndex}
          />

          <TextArea
            ref={textAreaRef}   
            value={userInputState}
            onChange={onUserInputChange}
            readOnly={!typingEnabled || finished || !isActive}
            placeholder={"Please click on start button to start the test."}
            onPaste={(e) => e.preventDefault()}
            onCopy={(e) => e.preventDefault()}
            onCut={(e) => e.preventDefault()}
          />
        </TypingPanel>

        {!typingEnabled && !finished && (
          <Centered>
            <StartButton onClick={startTimer}>Start Test</StartButton>
          </Centered>
        )}
      </TypingCardContainer>
    </OuterWrapper>
  );
}
return null;
}
