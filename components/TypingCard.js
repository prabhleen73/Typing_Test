import React, { useState, useEffect, useRef, useCallback } from "react";
import styled from "styled-components";
import Preview from "./Preview";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useRouter } from "next/router";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

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

// COMPONENT --------------------------------
export default function TypingCard({ studentId }) {
  const router = useRouter();

  // Prevent going back during test
useEffect(() => {
  const handlePopState = () => {
    window.history.forward();
  };

  window.history.pushState(null, null, window.location.href);
  window.addEventListener("popstate", handlePopState);

  return () => {
    window.removeEventListener("popstate", handlePopState);
  };
}, []);


  const [text, setText] = useState("");
  const [countDown, setCountDown] = useState(null);
  const [typingEnabled, setTypingEnabled] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [errorIndex, setErrorIndex] = useState(null);
  const [userInputState, setUserInputState] = useState("");
  const [cursorIndex, setCursorIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // REFS -----------------------------------
  const paragraphIdRef = useRef(null);
  const userInputRef = useRef("");
  const secRef = useRef(0);
  const backspaceCountRef = useRef(0);
  const completionTimeRef = useRef(null);
  const intervalRef = useRef(null);
  const submittedRef = useRef(false);

  const paragraph = useQuery(api.paragraphs.getParagraph);
  const timeSetting = useQuery(api.timeSettings.getTimeSetting);
  const saveResult = useMutation(api.results.saveResult);

  // ---------------- Load test active flag
  useEffect(() => {
    setIsActive(sessionStorage.getItem("testActive") === "true");
  }, []);

  // ---------------- Save result helper -----------------
  const handleSaveResultToDB = useCallback(
    async ({ input, seconds }) => {
      console.log("SAVE RESULT CALLED");

      const finalInput = input ?? userInputRef.current ?? "";

      let correctChars = 0;
      for (let i = 0; i < finalInput.length; i++) {
        if (finalInput[i] === text[i]) correctChars++;
      }

      const secondsTaken =
        completionTimeRef.current ?? seconds ?? Math.max(1, secRef.current);

      const totalTyped = finalInput.length + backspaceCountRef.current;
      const mistakes = backspaceCountRef.current;

      console.log("correctChars =", correctChars);
      console.log("secondsTaken =", secondsTaken);

      const accuracy =
        totalTyped === 0
          ? 0
          : Math.round(((totalTyped - mistakes) / totalTyped) * 100);

      const wpm = Math.round((correctChars * 60) / (5 * secondsTaken));

      const resultObj = {
        finalInput,
        correctChars,
        secondsTaken,
        totalTyped,
        mistakes,
      };
      console.log("FINAL RESULT:", resultObj);

      await saveResult({
        studentId: studentId ?? sessionStorage.getItem("studentId"),
        paragraphId: paragraphIdRef.current,
        symbols: correctChars,
        seconds: secondsTaken,
        accuracy,
        wpm,
        text: finalInput,
      });
    },
    [saveResult, studentId, text]
  );

  // ---------------- Auto submit -----------------
  const doAutoSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    console.log("AUTO SUBMIT");

    clearInterval(intervalRef.current);
    setFinished(true);
    setTypingEnabled(false);

    await handleSaveResultToDB({
      input: userInputRef.current,
      seconds: secRef.current,
    });

    sessionStorage.removeItem("testActive");
    sessionStorage.removeItem("studentId");
    sessionStorage.removeItem("typingState");

    await fetch("/api/logout", { method: "POST" });
    router.replace("/test-submitted");
  }, [handleSaveResultToDB, router]);

  // ---------------- Restore logic -----------------
  useEffect(() => {
    if (!paragraph || !paragraph._id || !timeSetting) return;

    console.log("Paragraph loaded. ID:", paragraph._id);

    // FIX: Trim leading BOM, tabs, spaces, newlines
    const cleaned = (paragraph.content || "").replace(/^\s+|\uFEFF/g, "");
    console.log("CLEANED PARAGRAPH:", cleaned.slice(0, 50));

    paragraphIdRef.current = paragraph._id;
    setText(cleaned);

    setTimeout(() => {
      const saved = sessionStorage.getItem("typingState");

      if (saved) {
        const s = JSON.parse(saved);
        console.log("RESTORE FOUND:", s);

        if (s.paragraphId === paragraph._id && cleaned.length > 5) {
          console.log("Restoring input:", s.text);
          setUserInputState(s.text);
          userInputRef.current = s.text;

          console.log("Restoring timer:", s.countDown, s.sec);
          setCountDown(s.countDown ?? timeSetting.duration);
          secRef.current = s.sec ?? 0;

          console.log("Restore state:", s);
          setStarted(!!s.started);
          setFinished(!!s.finished);
          setCursorIndex(s.cursorIndex ?? 0);
          setErrorIndex(s.errorIndex ?? null);
          backspaceCountRef.current = s.backspaces ?? 0;

          if (s.started && !s.finished) {
            console.log("Restarting timer...");

            setTypingEnabled(true);

            clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
              secRef.current++;

              setCountDown((prev) => {
                console.log("Timer tick (restore):", { sec: secRef.current, countDown: prev });

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
  }, [paragraph, timeSetting, doAutoSubmit]);

  // ---------------- Save state to sessionStorage -----------------
  useEffect(() => {
    if (!paragraphIdRef.current) return;

    const data = {
      text: userInputState,
      countDown,
      started,
      finished,
      cursorIndex,
      errorIndex,
      backspaces: backspaceCountRef.current,
      sec: secRef.current,
      paragraphId: paragraphIdRef.current,
    };

    sessionStorage.setItem("typingState", JSON.stringify(data));
    console.log("SAVING INPUT STATE:", data);
  }, [userInputState, countDown, started, finished, cursorIndex, errorIndex]);

  // ---------------- Cleanup -----------------
  useEffect(() => () => clearInterval(intervalRef.current), []);

  // ---------------- Start timer -----------------
  const startTimer = useCallback(() => {
    if (started) return;

    const duration = timeSetting?.duration || 60;
    setCountDown(duration);

    secRef.current = 0;
    completionTimeRef.current = null;

    setStarted(true);
    setTypingEnabled(true);
    submittedRef.current = false;

    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      secRef.current++;

      setCountDown((prev) => {
        console.log("Timer tick:", { sec: secRef.current, countDown: prev });

        if (prev <= 1) {
          clearInterval(intervalRef.current);
          doAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [started, timeSetting, doAutoSubmit]);

  // ---------------- User input -----------------
  const onUserInputChange = (e) => {
    if (!isActive || finished) return;
    if (!typingEnabled) return;

    const value = e.target.value;
    setCursorIndex(value.length);

    if (value.length > text.length) return;

    if (errorIndex !== null) {
      if (value.length < userInputRef.current.length) {
        backspaceCountRef.current++;
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

    if (value.length === text.length && !completionTimeRef.current) {
      completionTimeRef.current = secRef.current;
    }
  };

  // ---------------- Render -----------------
  if (!studentId && !sessionStorage.getItem("studentId"))
    return <Loader>Loading...</Loader>;

  if (!paragraph || !timeSetting)
    return <Loader>Loading test...</Loader>;

  if (countDown === null)
    return <Loader>Preparing...</Loader>;

  return (
    <OuterWrapper>
      <TypingCardContainer>
        <Header>
          <Title>Typing Test</Title>
          <Timer urgent={countDown <= 10}>{countDown}s</Timer>
        </Header>

        <TypingPanel>
          <Preview
            text={text}
            userInput={userInputState}
            errorIndex={errorIndex}
            cursorIndex={cursorIndex}
          />

          <TextArea
            value={userInputState}
            onChange={onUserInputChange}
            readOnly={!typingEnabled || finished || !isActive}
            placeholder={"Typing Test Running..."}
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
