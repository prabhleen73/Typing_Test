import React, { useState, useEffect, useRef, useCallback } from "react";
import styled from "styled-components";
import Preview from "./Preview";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useRouter } from "next/router";

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
  const safeSeconds = Math.max(0, seconds ?? 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
};

const getSnapshotRemaining = (remainingSeconds, savedAt) => {
  if (typeof remainingSeconds !== "number") return null;
  if (typeof savedAt !== "number") return Math.max(0, remainingSeconds);
  const elapsed = Math.max(0, Math.floor((Date.now() - savedAt) / 1000));
  return Math.max(0, remainingSeconds - elapsed);
};

const getRemainingFromEndAt = (testEndsAt) => {
  if (typeof testEndsAt !== "number") return null;
  return Math.max(0, Math.ceil((testEndsAt - Date.now()) / 1000));
};

const parseStoredState = (raw) => {
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getPersistedActiveSession = () => {
  if (typeof window === "undefined") return null;
  return parseStoredState(localStorage.getItem("activeTestSession"));
};

const getPendingRefreshState = () => {
  if (typeof window === "undefined") return null;
  return parseStoredState(localStorage.getItem("pendingTestRefresh"));
};

const shouldResetAfterClosedTab = () => {
  if (typeof window === "undefined") return false;
  const closedMarker = localStorage.getItem("closedTestSession");
  if (!closedMarker) return false;
  const navigationEntry = performance.getEntriesByType("navigation")?.[0];
  return navigationEntry?.type !== "reload";
};

export default function TypingCard({ studentId }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [countDown, setCountDown] = useState(null);
  const [typingEnabled, setTypingEnabled] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [errorIndex, setErrorIndex] = useState(null);
  const [userInputState, setUserInputState] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [storedStudentId, setStoredStudentId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [testStep, setTestStep] = useState("instructions");
  const [agreed, setAgreed] = useState(false);

  const paragraphIdRef = useRef(null);
  const textAreaRef = useRef(null);
  const userInputRef = useRef("");
  const completionTimeRef = useRef(null);
  const intervalRef = useRef(null);
  const submittedRef = useRef(false);
  const draftSaveTimeoutRef = useRef(null);
  const correctedMistakesRef = useRef(0);
  const errorActiveRef = useRef(false);
  const hasRestoredRef = useRef(false);
  const deadlineRef = useRef(null);
  const savingRef = useRef(false);
  const offlinePausedRef = useRef(false);
  const fullscreenPausedRef = useRef(false);

  const resolvedStudentId = studentId ?? storedStudentId ?? null;
  const storageSuffix =
    resolvedStudentId && sessionId ? `${resolvedStudentId}:${sessionId}` : null;
  const localDraftKey = storageSuffix
    ? `typingStateBackup:${storageSuffix}`
    : "typingStateBackup";

  const paragraph = useQuery(
    api.paragraphs.getParagraph,
    sessionId ? { sessionId } : "skip"
  );
  const timeSetting = useQuery(api.timeSettings.getTimeSetting);
  const testSettings = useQuery(
    api.settings.getTestSettings,
    sessionId ? { sessionId } : "skip"
  );
  const draft = useQuery(
    api.typingDrafts.getDraft,
    resolvedStudentId && sessionId
      ? { studentId: resolvedStudentId, sessionId }
      : "skip"
  );
  const serverSession = useQuery(
    api.sessions.validateSession,
    sessionToken ? { token: sessionToken } : "skip"
  );

  const qualifyingWpm = testSettings?.qualifyingWpm;
  const qualifyingKdph = testSettings?.qualifyingKdph;

  const saveResult = useMutation(api.results.saveResult);
  const saveDraft = useMutation(api.typingDrafts.saveDraft);
  const markSubmitted = useMutation(api.typingDrafts.markSubmitted);
  const updateTestActive = useMutation(api.sessions.updateTestActive);
  const updateRemainingTime = useMutation(api.sessions.updateRemainingTime);

  const getCurrentRemaining = useCallback(() => {
    if (typeof countDown === "number") return Math.max(0, countDown);
    if (deadlineRef.current) {
      return Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
    }
    return timeSetting?.duration ?? 0;
  }, [countDown, timeSetting?.duration]);

  const syncErrorStateFromValue = useCallback(
    (value, referenceText = text) => {
      const mismatchIndex = Array.from(value).findIndex(
        (char, index) => char !== referenceText[index]
      );

      if (mismatchIndex === -1) {
        errorActiveRef.current = false;
        setErrorIndex(null);
        return;
      }

      errorActiveRef.current = true;
      setErrorIndex(mismatchIndex);
    },
    [text]
  );

  const writeLocalState = useCallback(
    (remainingOverride, pauseTimer = false) => {
      if (typeof window === "undefined") return;

      const remainingSeconds =
        typeof remainingOverride === "number"
          ? Math.max(0, remainingOverride)
          : getCurrentRemaining();

      const payload = {
        text: userInputRef.current,
        paragraphId: paragraphIdRef.current,
        started,
        finished,
        remainingSeconds,
        savedAt: Date.now(),
        testEndsAt: pauseTimer
          ? null
          : typeof deadlineRef.current === "number"
            ? deadlineRef.current
            : (() => {
                const stored = sessionStorage.getItem("testEndsAt");
                return stored !== null && !Number.isNaN(Number(stored))
                  ? Number(stored)
                  : null;
              })(),
        testStartedAt:
          (() => {
            const stored = sessionStorage.getItem("testStartedAt");
            return stored !== null && !Number.isNaN(Number(stored))
              ? Number(stored)
              : null;
          })(),
      };

      sessionStorage.setItem("typingState", JSON.stringify(payload));
      localStorage.setItem(localDraftKey, JSON.stringify(payload));
      const persistedSession = getPersistedActiveSession() || {};
      localStorage.setItem(
        "activeTestSession",
        JSON.stringify({
          ...persistedSession,
          studentId: resolvedStudentId ?? persistedSession.studentId ?? null,
          sessionId: sessionId ?? persistedSession.sessionId ?? null,
          token:
            sessionToken ||
            persistedSession.token ||
            sessionStorage.getItem("token") ||
            null,
          testActive: started && !finished,
          serverRemainingSeconds: remainingSeconds,
          testEndsAt: payload.testEndsAt,
          testStartedAt: payload.testStartedAt,
        })
      );

      if (remainingSeconds > 0) {
        sessionStorage.setItem("remainingTime", String(remainingSeconds));
      } else {
        sessionStorage.removeItem("remainingTime");
      }
    },
    [
      finished,
      getCurrentRemaining,
      localDraftKey,
      resolvedStudentId,
      sessionId,
      sessionToken,
      started,
    ]
  );

  const persistProgress = useCallback(
    async (remainingOverride) => {
      const remainingSeconds =
        typeof remainingOverride === "number"
          ? Math.max(0, remainingOverride)
          : getCurrentRemaining();

      writeLocalState(remainingSeconds);

      if (
        !resolvedStudentId ||
        !sessionId ||
        !paragraphIdRef.current ||
        !started ||
        finished ||
        submittedRef.current ||
        savingRef.current
      ) {
        return;
      }

      savingRef.current = true;

      try {
        const token =
          sessionToken ||
          (typeof window !== "undefined"
            ? sessionStorage.getItem("token")
            : null);

        if (!token) {
          return;
        }

        const draftSaveResult = await saveDraft({
          token,
          studentId: resolvedStudentId,
          sessionId,
          paragraphId: paragraphIdRef.current,
          typedText: userInputRef.current || "",
          started: true,
          duration: timeSetting?.duration || 0,
          remainingSeconds,
        });

        if (draftSaveResult?.success === false) {
          // Keep the test running locally even if a sync attempt fails.
          // This prevents candidates from being thrown out mid-test because of
          // a temporary session validation mismatch or network blip.
          writeLocalState(remainingSeconds);
          return;
        }

        if (typeof draftSaveResult?.testEndsAt === "number") {
          sessionStorage.setItem("testEndsAt", String(draftSaveResult.testEndsAt));
          const persistedSession = getPersistedActiveSession() || {};
          localStorage.setItem(
            "activeTestSession",
            JSON.stringify({
              ...persistedSession,
              studentId: resolvedStudentId ?? persistedSession.studentId ?? null,
              sessionId: sessionId ?? persistedSession.sessionId ?? null,
              token:
                sessionToken ||
                persistedSession.token ||
                sessionStorage.getItem("token") ||
                null,
              testActive: true,
              serverRemainingSeconds:
                draftSaveResult?.remainingSeconds ?? remainingSeconds,
              testEndsAt: draftSaveResult.testEndsAt,
              testStartedAt:
                persistedSession.testStartedAt ??
                (() => {
                  const stored = sessionStorage.getItem("testStartedAt");
                  return stored !== null && !Number.isNaN(Number(stored))
                    ? Number(stored)
                    : null;
                })(),
            })
          );
        }

        await updateRemainingTime({
          token,
          remainingSeconds:
            draftSaveResult?.remainingSeconds ?? remainingSeconds,
        });
      } finally {
        savingRef.current = false;
      }
    },
    [
      finished,
      getCurrentRemaining,
      resolvedStudentId,
      router,
      saveDraft,
      sessionToken,
      sessionId,
      started,
      timeSetting?.duration,
      updateRemainingTime,
      writeLocalState,
    ]
  );

  const pauseAndSaveProgress = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!started || finished || submittedRef.current) return;

    const token = sessionToken || sessionStorage.getItem("token") || null;
    const activeStudentId =
      resolvedStudentId ?? sessionStorage.getItem("studentId") ?? null;
    const activeSessionId = sessionId ?? sessionStorage.getItem("sessionId") ?? null;
    const activeParagraphId = paragraphIdRef.current;
    const remainingSeconds = getCurrentRemaining();

    writeLocalState(remainingSeconds, true);
    sessionStorage.removeItem("testEndsAt");

    if (!token || !activeStudentId || !activeSessionId || !activeParagraphId) {
      return;
    }

    const payload = JSON.stringify({
      token,
      studentId: activeStudentId,
      sessionId: activeSessionId,
      paragraphId: activeParagraphId,
      typedText: userInputRef.current || "",
      started: true,
      duration: timeSetting?.duration || 0,
      remainingSeconds,
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/pause-test", blob);
      return;
    }

    fetch("/api/pause-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }, [
    finished,
    getCurrentRemaining,
    resolvedStudentId,
    sessionId,
    sessionToken,
    started,
    timeSetting?.duration,
    writeLocalState,
  ]);

  const handleSaveResultToDB = useCallback(
    async ({ input, seconds }) => {
      const rawInput = input ?? userInputRef.current ?? "";
      const normalizedInput = rawInput.replace(/\s+$/g, "");

      let correctChars = 0;
      for (let i = 0; i < normalizedInput.length; i += 1) {
        if (normalizedInput[i] === text[i]) {
          correctChars += 1;
        } else {
          break;
        }
      }

      const fallbackMatchedChars =
        correctChars === 0 && normalizedInput.length > 0
          ? Math.max(
              0,
              Math.min(
                normalizedInput.length,
                text.startsWith(normalizedInput) ? normalizedInput.length : 0
              )
            )
          : correctChars;

      const effectiveCorrectChars = Math.max(correctChars, fallbackMatchedChars);
      const finalInput = normalizedInput.slice(0, effectiveCorrectChars);
      const totalTyped = normalizedInput.length;
      const hasUncorrectedError = effectiveCorrectChars < normalizedInput.length;
      const correctedMistakes = correctedMistakesRef.current;
      const uncorrectedMistakes = hasUncorrectedError ? 1 : 0;
      const mistakes = correctedMistakes + uncorrectedMistakes;
      const safeMistakes = Math.min(mistakes, totalTyped);

      const accuracy =
        totalTyped === 0
          ? 0
          : Math.floor(((totalTyped - safeMistakes) / totalTyped) * 100);

      const secondsTaken =
        seconds ??
        completionTimeRef.current ??
        Math.max(
          1,
          (timeSetting?.duration || 0) - Math.max(0, getCurrentRemaining())
        );

      let resolvedStudentIdLocal = studentId ?? storedStudentId ?? null;
      if (!resolvedStudentIdLocal && typeof window !== "undefined") {
        resolvedStudentIdLocal = sessionStorage.getItem("studentId");
      }

      const rawWpm = Number(
        ((effectiveCorrectChars * 60) / (5 * Math.max(1, secondsTaken))).toFixed(2)
      );
      const wpm = Math.floor(rawWpm);
      const kdph = Math.round(
        (effectiveCorrectChars * 3600) / Math.max(1, secondsTaken)
      );

      return saveResult({
        studentId: resolvedStudentIdLocal,
        paragraphId: paragraphIdRef.current,
        symbols: effectiveCorrectChars,
        seconds: secondsTaken,
        accuracy,
        wpm,
        rawWpm,
        kdph,
        text: finalInput,
        rawText: normalizedInput,
        mistakes,
        correctedMistakes,
        uncorrectedMistakes,
      });
    },
    [
      getCurrentRemaining,
      saveResult,
      studentId,
      storedStudentId,
      text,
      timeSetting?.duration,
    ]
  );

  const doAutoSubmit = useCallback(
    async (forcedSeconds) => {
      if (submittedRef.current) return;
      submittedRef.current = true;

      clearInterval(intervalRef.current);
      intervalRef.current = null;
      deadlineRef.current = null;
      completionTimeRef.current =
        forcedSeconds ??
        completionTimeRef.current ??
        (timeSetting?.duration || 0) - Math.max(0, getCurrentRemaining());

      setCountDown(0);
      setFinished(true);
      setTypingEnabled(false);
      setStarted(true);

      try {
        const token = sessionStorage.getItem("token");
        if (token) {
          await updateTestActive({ token, active: false });
          await updateRemainingTime({ token, remainingSeconds: 0 });
        }
      } catch {}

      writeLocalState(0);

      const resultId = await handleSaveResultToDB({
        input: userInputRef.current,
        seconds: completionTimeRef.current,
      });

      if (resolvedStudentId && sessionId) {
        await markSubmitted({ studentId: resolvedStudentId, sessionId });
      }

      sessionStorage.removeItem("testActive");
      sessionStorage.removeItem("typingState");
      sessionStorage.removeItem("instructionsAccepted");
      sessionStorage.removeItem("remainingTime");
      localStorage.removeItem(localDraftKey);
      localStorage.removeItem("activeTestSession");

      await fetch("/api/logout", { method: "POST" });
      sessionStorage.setItem("submittedResultId", String(resultId));
      sessionStorage.setItem(
        "submittedPageExpiresAt",
        String(Date.now() + 15 * 60 * 1000)
      );
      router.replace(`/test-submitted?resultId=${resultId}`);
    },
    [
      getCurrentRemaining,
      handleSaveResultToDB,
      localDraftKey,
      markSubmitted,
      resolvedStudentId,
      router,
      sessionId,
      timeSetting?.duration,
      updateRemainingTime,
      updateTestActive,
      writeLocalState,
    ]
  );

  const startAccurateTimer = useCallback(
    (initialRemaining) => {
      clearInterval(intervalRef.current);
      intervalRef.current = null;

      const remaining =
        typeof initialRemaining === "number"
          ? Math.max(0, initialRemaining)
          : getCurrentRemaining();

      if (remaining <= 0) {
        doAutoSubmit(timeSetting?.duration || 0);
        return;
      }

      deadlineRef.current = Date.now() + remaining * 1000;
      setCountDown(remaining);

      intervalRef.current = setInterval(() => {
        const nextRemaining = Math.max(
          0,
          Math.ceil((deadlineRef.current - Date.now()) / 1000)
        );

        setCountDown((prev) => (prev === nextRemaining ? prev : nextRemaining));

        if (nextRemaining <= 0) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          completionTimeRef.current = timeSetting?.duration || 0;
          doAutoSubmit(timeSetting?.duration || 0);
        }
      }, 250);
    },
    [doAutoSubmit, getCurrentRemaining, timeSetting?.duration]
  );

  const pauseRunningAttempt = useCallback(
    (pauseRef) => {
      if (!started || finished || submittedRef.current) return;

      const remainingSeconds = getCurrentRemaining();
      pauseRef.current = true;
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      deadlineRef.current = null;
      setCountDown(remainingSeconds);
      setTypingEnabled(false);
      pauseAndSaveProgress();
    },
    [finished, getCurrentRemaining, pauseAndSaveProgress, started]
  );

  const resumePausedAttempt = useCallback(
    (pauseRef) => {
      if (!pauseRef.current || !started || finished) return;

      pauseRef.current = false;
      const remainingSeconds = getCurrentRemaining();
      if (remainingSeconds <= 0) {
        doAutoSubmit(timeSetting?.duration || 0);
        return;
      }

      setTypingEnabled(true);
      startAccurateTimer(remainingSeconds);

      const token = sessionToken || sessionStorage.getItem("token");
      if (token) {
        updateTestActive({
          token,
          active: true,
          duration: timeSetting?.duration || 0,
          resumeRemainingSeconds: remainingSeconds,
        }).catch(() => {});
      }
    },
    [
      doAutoSubmit,
      finished,
      getCurrentRemaining,
      sessionToken,
      startAccurateTimer,
      started,
      timeSetting?.duration,
      updateTestActive,
    ]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const pauseForOffline = () => {
      pauseRunningAttempt(offlinePausedRef);
    };

    const resumeAfterOffline = () => {
      resumePausedAttempt(offlinePausedRef);
    };

    window.addEventListener("offline", pauseForOffline);
    window.addEventListener("online", resumeAfterOffline);

    return () => {
      window.removeEventListener("offline", pauseForOffline);
      window.removeEventListener("online", resumeAfterOffline);
    };
  }, [
    pauseRunningAttempt,
    resumePausedAttempt,
  ]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleFullscreenChange = () => {
      const fsReady = sessionStorage.getItem("fsReady") === "true";
      if (!fsReady || !started || finished) return;

      if (!document.fullscreenElement) {
        pauseRunningAttempt(fullscreenPausedRef);
        return;
      }

      resumePausedAttempt(fullscreenPausedRef);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [finished, pauseRunningAttempt, resumePausedAttempt, started]);

  useEffect(() => {
    if (!textAreaRef.current) return;

    const input = textAreaRef.current;
    const caret = userInputState.length;
    input.focus();
    if (input.selectionStart !== caret) {
      input.setSelectionRange(caret, caret);
    }
  }, [userInputState]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const persistedSession = getPersistedActiveSession();
    setStoredStudentId(
      sessionStorage.getItem("studentId") || persistedSession?.studentId || null
    );
    setSessionId(
      sessionStorage.getItem("sessionId") || persistedSession?.sessionId || null
    );
    setSessionToken(
      sessionStorage.getItem("token") || persistedSession?.token || null
    );
    setIsActive(true);

    if (sessionStorage.getItem("instructionsAccepted") === "true") {
      setTestStep("test");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!started || finished) return;

    writeLocalState();
  }, [countDown, finished, started, userInputState, writeLocalState]);

  useEffect(() => {
    if (!started || finished) return;

    const interval = setInterval(() => {
      persistProgress();
    }, 5000);

    return () => clearInterval(interval);
  }, [finished, persistProgress, started]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePageExit = () => {
      if (!started || finished) return;
      const token =
        sessionToken || sessionStorage.getItem("token") || null;
      const remainingSeconds = getCurrentRemaining();
      const activeStudentId =
        resolvedStudentId ?? sessionStorage.getItem("studentId") ?? null;
      const activeSessionId = sessionId ?? sessionStorage.getItem("sessionId") ?? null;

      localStorage.setItem(
        "pendingTestRefresh",
        JSON.stringify({
          token,
          studentId: activeStudentId,
          sessionId: activeSessionId,
          paragraphId: paragraphIdRef.current,
          text: userInputRef.current || "",
          started: true,
          finished: false,
          remainingSeconds,
          savedAt: Date.now(),
          testEndsAt: null,
        })
      );
      localStorage.setItem(
        "closedTestSession",
        JSON.stringify({
          token,
          studentId: activeStudentId,
          sessionId: activeSessionId,
        })
      );
      pauseAndSaveProgress();
    };

    const handleVisibility = () => {
      if (document.hidden && started && !finished) {
        pauseAndSaveProgress();
      }
    };

    window.addEventListener("beforeunload", handlePageExit);
    window.addEventListener("pagehide", handlePageExit);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeunload", handlePageExit);
      window.removeEventListener("pagehide", handlePageExit);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [
    finished,
    getCurrentRemaining,
    pauseAndSaveProgress,
    resolvedStudentId,
    sessionId,
    sessionToken,
    started,
  ]);

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (hasRestoredRef.current) return;
    if (!paragraph || !paragraph._id || !timeSetting) return;
    if (typeof window === "undefined") return;
    if (sessionToken && serverSession === undefined) return;

    const cleaned = (paragraph.content || "").replace(/^\s+|\uFEFF/g, "");
    const persistedSession = getPersistedActiveSession();
    const storedActive = sessionStorage.getItem("testActive") === "true";
    const navigationEntry = performance.getEntriesByType("navigation")?.[0];
    const pendingRefreshState = getPendingRefreshState();
    const shouldUseRefreshState =
      navigationEntry?.type === "reload" &&
      pendingRefreshState?.paragraphId === paragraph._id &&
      pendingRefreshState?.started === true &&
      pendingRefreshState?.finished !== true;
    paragraphIdRef.current = paragraph._id;
    setText(cleaned);
    sessionStorage.setItem("paragraphId", paragraph._id);

    if (shouldResetAfterClosedTab()) {
      userInputRef.current = "";
      correctedMistakesRef.current = 0;
      errorActiveRef.current = false;
      deadlineRef.current = null;
      sessionStorage.removeItem("testActive");
      sessionStorage.removeItem("typingState");
      sessionStorage.removeItem("remainingTime");
      sessionStorage.removeItem("testEndsAt");
      sessionStorage.removeItem("testStartedAt");
      sessionStorage.removeItem("serverRemainingSeconds");
      localStorage.removeItem(localDraftKey);
      localStorage.removeItem("activeTestSession");
      localStorage.removeItem("closedTestSession");
      localStorage.removeItem("pendingTestRefresh");
      setUserInputState("");
      setDraftRestored(false);
      setStarted(false);
      setFinished(false);
      setTypingEnabled(false);
      setErrorIndex(null);
      setCountDown(timeSetting.duration || 0);
      hasRestoredRef.current = true;
      return;
    }

    const duration = timeSetting.duration || 0;
    const clientState = parseStoredState(sessionStorage.getItem("typingState"));
    const localState = parseStoredState(localStorage.getItem(localDraftKey));
    const storedServerRemainingRaw = sessionStorage.getItem("serverRemainingSeconds");
    const storedTestEndsAtRaw = sessionStorage.getItem("testEndsAt");
    const storedServerRemaining =
      storedServerRemainingRaw !== null && !Number.isNaN(Number(storedServerRemainingRaw))
        ? Number(storedServerRemainingRaw)
        : null;
    const storedTestEndsAt =
      storedTestEndsAtRaw !== null && !Number.isNaN(Number(storedTestEndsAtRaw))
        ? Number(storedTestEndsAtRaw)
        : null;
    const textSnapshots = [];

    if (shouldUseRefreshState) {
      textSnapshots.push({
        source: "refresh",
        text: pendingRefreshState.text || "",
        started: true,
        finished: false,
        savedAt: pendingRefreshState.savedAt ?? Date.now(),
      });
    }

    if (clientState && clientState.paragraphId === paragraph._id) {
      textSnapshots.push({
        source: "session",
        text: clientState.text || "",
        started: !!clientState.started,
        finished: !!clientState.finished,
        savedAt: clientState.savedAt ?? 0,
      });
    }

    if (localState && localState.paragraphId === paragraph._id) {
      textSnapshots.push({
        source: "local",
        text: localState.text || "",
        started: !!localState.started,
        finished: !!localState.finished,
        savedAt: localState.savedAt ?? 0,
      });
    }

    if (
      draft &&
      !draft.isSubmitted &&
      draft.paragraphId === paragraph._id &&
      draft.updatedAt
    ) {
      textSnapshots.push({
        source: "server",
        text: draft.typedText || "",
        started: !!draft.started,
        finished: false,
        savedAt: draft.updatedAt,
      });
    }

    textSnapshots.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    const bestSnapshot = textSnapshots[0] ?? null;

    const getPausedStoredRemaining = (snapshot) => {
      if (!snapshot || typeof snapshot.remainingSeconds !== "number") return null;
      if (typeof snapshot.testEndsAt === "number") return null;
      return Math.max(0, snapshot.remainingSeconds);
    };

    const localRemainingCandidates = [
      getPausedStoredRemaining(draft),
      getPausedStoredRemaining(clientState),
      getPausedStoredRemaining(localState),
      getRemainingFromEndAt(draft?.testEndsAt),
      getRemainingFromEndAt(clientState?.testEndsAt),
      getSnapshotRemaining(clientState?.remainingSeconds, clientState?.savedAt),
      getRemainingFromEndAt(localState?.testEndsAt),
      getSnapshotRemaining(localState?.remainingSeconds, localState?.savedAt),
      getRemainingFromEndAt(storedTestEndsAt),
      getSnapshotRemaining(draft?.remainingSeconds, draft?.updatedAt),
    ].filter((value) => typeof value === "number");

    const serverRemaining =
      serverSession?.valid && typeof serverSession?.remainingSeconds === "number"
        ? serverSession.remainingSeconds
        : null;
    const exactClosedTabRemaining =
      !clientState &&
      localState &&
      localState.paragraphId === paragraph._id &&
      localState.started &&
      !localState.finished &&
      typeof localState.remainingSeconds === "number"
        ? Math.max(0, localState.remainingSeconds)
        : null;
    const authoritativeRemaining =
      getPausedStoredRemaining(
        shouldUseRefreshState ? pendingRefreshState : null
      ) ??
      exactClosedTabRemaining ??
      getRemainingFromEndAt(serverSession?.testEndsAt) ??
      serverRemaining;
    const restoredRemaining = Math.min(
      duration,
      Math.max(
        0,
        authoritativeRemaining ??
          localRemainingCandidates[0] ??
          storedServerRemaining ??
          duration
      )
    );
    const hasActiveResumeSignal =
      shouldUseRefreshState ||
      storedActive ||
      serverSession?.testPaused === true ||
      persistedSession?.testActive === true ||
      typeof exactClosedTabRemaining === "number";
    const shouldResumeFromServer =
      (serverSession?.valid &&
        (serverSession?.testActive || serverSession?.testPaused)) ||
      (hasActiveResumeSignal && draft?.started && !draft?.isSubmitted);

    if (bestSnapshot) {
      userInputRef.current = bestSnapshot.text;
      setUserInputState(bestSnapshot.text);
      setDraftRestored(bestSnapshot.source === "server");
      setStarted(bestSnapshot.started || shouldResumeFromServer);
      setFinished(bestSnapshot.finished);
      correctedMistakesRef.current = 0;
      syncErrorStateFromValue(bestSnapshot.text, cleaned);
      setCountDown(restoredRemaining);

      const shouldResume =
        shouldResumeFromServer ||
        (bestSnapshot.started && !bestSnapshot.finished);

      if (shouldResume && !bestSnapshot.finished) {
        sessionStorage.setItem("testActive", "true");
        if (shouldUseRefreshState) {
          sessionStorage.removeItem("testEndsAt");
        } else if (typeof draft?.testEndsAt === "number") {
          sessionStorage.setItem("testEndsAt", String(draft.testEndsAt));
        }

        if (restoredRemaining <= 0) {
          hasRestoredRef.current = true;
          doAutoSubmit(duration);
          return;
        }

        setTypingEnabled(true);
        startAccurateTimer(restoredRemaining);

        void (async () => {
          try {
            const token = sessionToken || sessionStorage.getItem("token");
            if (token) {
              const sessionUpdate = await updateTestActive({
                token,
                active: true,
                duration,
                resumeRemainingSeconds:
                  shouldUseRefreshState ||
                  typeof exactClosedTabRemaining === "number"
                    ? restoredRemaining
                    : undefined,
              });

              if (typeof sessionUpdate?.testEndsAt === "number") {
                sessionStorage.setItem(
                  "testEndsAt",
                  String(sessionUpdate.testEndsAt)
                );
                const persistedSessionState = getPersistedActiveSession() || {};
                localStorage.setItem(
                  "activeTestSession",
                  JSON.stringify({
                    ...persistedSessionState,
                    studentId:
                      resolvedStudentId ?? persistedSessionState.studentId ?? null,
                    sessionId: sessionId ?? persistedSessionState.sessionId ?? null,
                    token:
                      sessionToken ||
                      persistedSessionState.token ||
                      sessionStorage.getItem("token") ||
                      null,
                    testActive: true,
                    serverRemainingSeconds:
                      sessionUpdate?.remainingSeconds ?? restoredRemaining,
                    testEndsAt: sessionUpdate.testEndsAt,
                    testStartedAt:
                      sessionUpdate?.testStartedAt ??
                      persistedSessionState.testStartedAt ??
                      null,
                  })
                );
              }
              if (shouldUseRefreshState) {
                localStorage.removeItem("pendingTestRefresh");
              }
            }
          } catch {}
        })();
      }
    } else {
      setCountDown(duration);
      userInputRef.current = "";
      setUserInputState("");
      syncErrorStateFromValue("", cleaned);

      if (shouldResumeFromServer) {
        setStarted(true);
        setFinished(false);
        setTypingEnabled(true);
        setCountDown(restoredRemaining);
        sessionStorage.setItem("testActive", "true");
        if (typeof draft?.testEndsAt === "number") {
          sessionStorage.setItem("testEndsAt", String(draft.testEndsAt));
        }

        if (restoredRemaining <= 0) {
          hasRestoredRef.current = true;
          doAutoSubmit(duration);
          return;
        }

        startAccurateTimer(restoredRemaining);

        void (async () => {
          try {
            const token = sessionToken || sessionStorage.getItem("token");
            if (token) {
              const sessionUpdate = await updateTestActive({
                token,
                active: true,
                duration,
                resumeRemainingSeconds:
                  typeof exactClosedTabRemaining === "number"
                    ? restoredRemaining
                    : undefined,
              });

              if (typeof sessionUpdate?.testEndsAt === "number") {
                sessionStorage.setItem(
                  "testEndsAt",
                  String(sessionUpdate.testEndsAt)
                );
                const persistedSessionState = getPersistedActiveSession() || {};
                localStorage.setItem(
                  "activeTestSession",
                  JSON.stringify({
                    ...persistedSessionState,
                    studentId:
                      resolvedStudentId ?? persistedSessionState.studentId ?? null,
                    sessionId: sessionId ?? persistedSessionState.sessionId ?? null,
                    token:
                      sessionToken ||
                      persistedSessionState.token ||
                      sessionStorage.getItem("token") ||
                      null,
                    testActive: true,
                    serverRemainingSeconds:
                      sessionUpdate?.remainingSeconds ?? restoredRemaining,
                    testEndsAt: sessionUpdate.testEndsAt,
                    testStartedAt:
                      sessionUpdate?.testStartedAt ??
                      persistedSessionState.testStartedAt ??
                      null,
                  })
                );
              }
            }
          } catch {}
        })();
      }
    }

    hasRestoredRef.current = true;
  }, [
    doAutoSubmit,
    draft,
      localDraftKey,
      paragraph,
      serverSession,
      sessionToken,
      startAccurateTimer,
      timeSetting,
      updateTestActive,
  ]);

  const startTimer = useCallback(async () => {
    if (started || !timeSetting?.duration) return;

    if (typeof document !== "undefined" && !document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        sessionStorage.setItem("fsReady", "true");
      } catch {
        window.alert(
          "Fullscreen is required to start the test. Please allow fullscreen and try again."
        );
        return;
      }
    }

    const initialRemaining = timeSetting.duration;
    let effectiveRemaining = initialRemaining;
    completionTimeRef.current = null;
    submittedRef.current = false;
    correctedMistakesRef.current = 0;
    errorActiveRef.current = false;
    setErrorIndex(null);
    setStarted(true);
    setFinished(false);
    setTypingEnabled(true);
    setCountDown(initialRemaining);
    sessionStorage.setItem("testActive", "true");

    try {
      const token = sessionToken || sessionStorage.getItem("token");
      if (token) {
        const sessionUpdate = await updateTestActive({
          token,
          active: true,
          duration: initialRemaining,
        });

        if (typeof sessionUpdate?.remainingSeconds === "number") {
          effectiveRemaining = sessionUpdate.remainingSeconds;
          sessionStorage.setItem(
            "serverRemainingSeconds",
            String(sessionUpdate.remainingSeconds)
          );
        }
        if (typeof sessionUpdate?.testEndsAt === "number") {
          sessionStorage.setItem("testEndsAt", String(sessionUpdate.testEndsAt));
        }
        if (typeof sessionUpdate?.testStartedAt === "number") {
          sessionStorage.setItem(
            "testStartedAt",
            String(sessionUpdate.testStartedAt)
          );
        }

      }
    } catch {}

    startAccurateTimer(effectiveRemaining);
    writeLocalState(effectiveRemaining);
    await persistProgress(effectiveRemaining);

    setTimeout(() => {
      textAreaRef.current?.focus();
    }, 0);
  }, [
    persistProgress,
    sessionToken,
    started,
    startAccurateTimer,
    timeSetting?.duration,
    updateTestActive,
    writeLocalState,
    syncErrorStateFromValue,
  ]);

  const onUserInputChange = useCallback(
    (e) => {
      if (!isActive || finished || !typingEnabled) return;

      let value = e.target.value;
      const prevValue = userInputRef.current;

      if (errorActiveRef.current && value.length > prevValue.length) return;
      if (value.length > text.length) return;

      if (value.length < prevValue.length) {
        if (!errorActiveRef.current) return;
        if (value.length !== prevValue.length - 1) return;

        userInputRef.current = value;
        setUserInputState(value);

        if (text.startsWith(value)) {
          setErrorIndex(null);
          errorActiveRef.current = false;
          correctedMistakesRef.current += 1;
        }
      } else {
        if (errorActiveRef.current) return;
        if (value.length > prevValue.length + 1) {
          value = value.slice(0, prevValue.length + 1);
        }

        const index = value.length - 1;
        if (value[index] !== text[index] && value[index] !== undefined) {
          const safeValue = prevValue + value.slice(prevValue.length, prevValue.length + 1);
          errorActiveRef.current = true;
          setErrorIndex(index);
          userInputRef.current = safeValue;
          setUserInputState(safeValue);
          return;
        }

        userInputRef.current = value;
        setUserInputState(value);
        setErrorIndex(null);
      }

      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }

      draftSaveTimeoutRef.current = setTimeout(() => {
        persistProgress();
      }, 800);
    },
    [finished, isActive, persistProgress, text, typingEnabled]
  );

  const onUserInputKeyDown = useCallback((e) => {
    if (
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "ArrowUp" ||
      e.key === "ArrowDown"
    ) {
      e.preventDefault();
      return;
    }

    if (!errorActiveRef.current) return;

    const allowedWhileError = new Set([
      "Backspace",
      "Tab",
      "Shift",
      "Control",
      "Alt",
      "Meta",
      "CapsLock",
    ]);

    if (allowedWhileError.has(e.key)) return;
    if (e.ctrlKey || e.metaKey) return;

    e.preventDefault();
  }, []);

  if (!studentId && !storedStudentId) return <Loader>Loading...</Loader>;
  if (!paragraph || !timeSetting) return <Loader>Loading test...</Loader>;
  if (countDown === null) return <Loader>Preparing...</Loader>;

  if (testStep === "instructions") {
    return (
      <OuterWrapper>
        <TypingCardContainer>
          <Title>Typing Test Instructions</Title>

          <div style={{ lineHeight: "1.8", fontSize: "16px" }}>
            <p>- Do not touch mouse once test starts.</p>
            <p>- Do not refresh the page.</p>
            <p>- Do not press back button.</p>
            <p>- Do not switch tabs or minimize the browser.</p>
            <p>- Copy/Paste is strictly prohibited.</p>
            <p>- The test will auto-submit when time ends.</p>
          </div>

          <div
            style={{
              marginTop: "25px",
              padding: "15px",
              background: "#f0f6ff",
              borderRadius: "10px",
              border: "1px solid #c7ddff",
            }}
          >
            <p>
              <strong>Test Information:</strong>
            </p>
            <p>- Minimum Speed: {qualifyingWpm || 30} WPM</p>
            <p>- Minimum KDPH: {qualifyingKdph || 10000}</p>
            <p>
              - Duration: {Math.round((timeSetting?.duration || 0) / 60)} minute(s)
            </p>
            <p>- Paragraph will be displayed on screen.</p>
            <p>- Accuracy, WPM and KDPH will be calculated.</p>
            <p>- Mistakes must be corrected with backspace to proceed.</p>
            <p>- Your progress is saved automatically.</p>
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

  if (testStep === "declaration") {
    return (
      <OuterWrapper>
        <TypingCardContainer>
          <Title>Declaration</Title>

          <p style={{ lineHeight: "1.8", fontSize: "16px" }}>
            I hereby declare that I will attempt this typing test honestly and
            will not use any unfair means. I understand that violation of rules
            may lead to disqualification.
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

  return (
    <OuterWrapper>
      <TypingCardContainer>
        <Header>
          <Title>Typing Test</Title>
          <Timer urgent={countDown <= 10}>{formatTime(countDown)}</Timer>
        </Header>

        <TypingPanel>
          <Preview text={text} userInput={userInputState} />

          <TextArea
            ref={textAreaRef}
            value={userInputState}
            onChange={onUserInputChange}
            readOnly={!typingEnabled || finished || !isActive}
            placeholder="Please click on start button to start the test."
            onPaste={(e) => e.preventDefault()}
            onCopy={(e) => e.preventDefault()}
            onCut={(e) => e.preventDefault()}
            onKeyDown={onUserInputKeyDown}
            onClick={(e) => {
              const input = e.target;
              const caret = input.value.length;
              if (input.selectionStart !== caret) {
                input.setSelectionRange(caret, caret);
              }
            }}
          />
        </TypingPanel>

        {!started && !finished && (
          <Centered>
            <StartButton onClick={startTimer}>Start Test</StartButton>
          </Centered>
        )}
      </TypingCardContainer>
    </OuterWrapper>
  );
}
