// pages/test.js — Patched TestPage
import { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { useRouter } from "next/router";
import { ConvexReactClient } from "convex/react";
import { api } from "../convex/_generated/api";

import NavHeader from "../components/NavHeader";
import TypingCard from "../components/TypingCard";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

function getPersistedActiveSession() {
  if (typeof window === "undefined") return null;

  try {
    return JSON.parse(localStorage.getItem("activeTestSession") || "null");
  } catch {
    return null;
  }
}

function getPendingRefreshState() {
  if (typeof window === "undefined") return null;

  try {
    return JSON.parse(localStorage.getItem("pendingTestRefresh") || "null");
  } catch {
    return null;
  }
}

async function resetClosedTestIfNeeded() {
  if (typeof window === "undefined") return false;

  const closedMarkerRaw = localStorage.getItem("closedTestSession");
  if (!closedMarkerRaw) return false;

  const navigationEntry = performance.getEntriesByType("navigation")?.[0];
  const navigationType = navigationEntry?.type;
  if (navigationType === "reload") {
    localStorage.removeItem("closedTestSession");
    return false;
  }

  try {
    const marker = JSON.parse(closedMarkerRaw);
    await fetch("/api/reset-closed-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(marker),
    });
  } catch {}

  const sessionKeys = [
    "token",
    "studentId",
    "sessionId",
    "studentName",
    "testActive",
    "typingState",
    "remainingTime",
    "paragraphId",
    "instructionsAccepted",
    "testEndsAt",
    "testStartedAt",
    "serverRemainingSeconds",
    "testSubmitted",
  ];

  for (const key of sessionKeys) {
    sessionStorage.removeItem(key);
  }

  const localKeysToDelete = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (
      key === "activeTestSession" ||
      key === "closedTestSession" ||
      key.startsWith("typingStateBackup:")
    ) {
      localKeysToDelete.push(key);
    }
  }

  for (const key of localKeysToDelete) {
    localStorage.removeItem(key);
  }

  localStorage.removeItem("historyLockState");

  return true;
}

function clearClientTestState() {
  if (typeof window === "undefined") return;

  const sessionKeys = [
    "token",
    "studentId",
    "sessionId",
    "studentName",
    "testActive",
    "typingState",
    "remainingTime",
    "paragraphId",
    "instructionsAccepted",
    "testEndsAt",
    "testStartedAt",
    "serverRemainingSeconds",
    "testSubmitted",
  ];

  for (const key of sessionKeys) {
    sessionStorage.removeItem(key);
  }

  const localKeysToDelete = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (
      key === "activeTestSession" ||
      key === "closedTestSession" ||
      key.startsWith("typingStateBackup:")
    ) {
      localKeysToDelete.push(key);
    }
  }

  for (const key of localKeysToDelete) {
    localStorage.removeItem(key);
  }
}

export default function TestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exitingTest, setExitingTest] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [studentId, setStudentId] = useState(null);
  const [showFsWarning, setShowFsWarning] = useState(false);

  const validatedRef = useRef(false);
  const testStartedRef = useRef(false);
  const backPressCountRef = useRef(0);

  const handleSessionFailure = async () => {
    clearClientTestState();

    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
  };

  const handleResumeFullscreen = async () => {
    if (typeof window === "undefined") return;

    try {
      await document.documentElement.requestFullscreen();
      sessionStorage.setItem("fsReady", "true");
      setShowFsWarning(false);
      setTimeout(() => {
        const input = document.querySelector("textarea");
        if (input && typeof input.focus === "function") {
          input.focus();
          if (
            typeof input.value === "string" &&
            typeof input.setSelectionRange === "function"
          ) {
            const caret = input.value.length;
            input.setSelectionRange(caret, caret);
          }
        }
      }, 0);
    } catch (error) {
      console.error("Fullscreen restore failed", error);
    }
  };

  useEffect(() => {
  if (typeof window === "undefined") return;

  // If test was already submitted, ensure testActive is cleared
  const submitted = sessionStorage.getItem("testSubmitted") === "true";

  if (submitted) {
    sessionStorage.removeItem("testActive");
    sessionStorage.removeItem("typingState");
    sessionStorage.removeItem("testSubmitted");
  }
}, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const updateFullscreenWarning = () => {
      const fsReady = sessionStorage.getItem("fsReady") === "true";
      if (!fsReady) {
        setShowFsWarning(false);
        return;
      }

      setShowFsWarning(!document.fullscreenElement);
    };

    updateFullscreenWarning();
    document.addEventListener("fullscreenchange", updateFullscreenWarning);
    window.addEventListener("focus", updateFullscreenWarning);

    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreenWarning);
      window.removeEventListener("focus", updateFullscreenWarning);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const warnBeforeUnload = (e) => {
      if (sessionStorage.getItem("testSubmitted") === "true") return;

      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
    };
  }, []);


  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let cleanupInFlight = false;

    const cleanupAndRestart = async () => {
      if (cleanupInFlight) return;
      cleanupInFlight = true;
      setExitingTest(true);

      const token = sessionStorage.getItem("token");
      const currentStudentId = sessionStorage.getItem("studentId");
      const currentSessionId = sessionStorage.getItem("sessionId");

      try {
        await fetch("/api/reset-closed-test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          keepalive: true,
          body: JSON.stringify({
            token,
            studentId: currentStudentId,
            sessionId: currentSessionId,
          }),
        });
      } catch {}

      clearClientTestState();
      await fetch("/api/logout", { method: "POST" });
      router.replace("/login");
    };

    const onPopState = () => {
      if (cleanupInFlight) return;

      if (backPressCountRef.current === 0) {
        backPressCountRef.current = 1;
        window.alert(
          "Warning: Pressing back again will log you out and restart your test."
        );
        window.history.pushState({ testBackGuard: true }, "", "/test");
        return;
      }

      void cleanupAndRestart();
    };

    const onRouteChangeStart = (url) => {
      if (
        url === "/test" ||
        url.startsWith("/test?") ||
        url.startsWith("/test-submitted") ||
        url.startsWith("/already-attempted")
      ) {
        return;
      }

      void cleanupAndRestart();
    };

    window.history.replaceState(
      { testBackGuard: true, backPressCount: 0 },
      "",
      window.location.href
    );
    window.history.pushState({ testBackGuard: true, backPressCount: 1 }, "", "/test");

    window.addEventListener("popstate", onPopState);
    router.events.on("routeChangeStart", onRouteChangeStart);

    return () => {
      window.removeEventListener("popstate", onPopState);
      router.events.off("routeChangeStart", onRouteChangeStart);
    };
  }, [router]);

  useEffect(() => {
    if (validatedRef.current) return;
    validatedRef.current = true;

    let mounted = true;

    async function validate() {
      if (testStartedRef.current) return;

      const resetClosedTest = await resetClosedTestIfNeeded();
      if (resetClosedTest) {
        router.replace("/login");
        return;
      }

      const storedSid = sessionStorage.getItem("studentId");
      const storedSessionId = sessionStorage.getItem("sessionId");
      const storedStudentName = sessionStorage.getItem("studentName");
      const storedActive = sessionStorage.getItem("testActive") === "true";
      const storedToken = sessionStorage.getItem("token");
      const persistedSession = getPersistedActiveSession();
      const navigationEntry = performance.getEntriesByType("navigation")?.[0];
      const pendingRefreshState = getPendingRefreshState();
      const hasPendingRefresh =
        navigationEntry?.type === "reload" &&
        pendingRefreshState?.started === true &&
        pendingRefreshState?.finished !== true;
      let storedTypingState = null;
      try {
        storedTypingState = JSON.parse(
          sessionStorage.getItem("typingState") || "null"
        );
      } catch {
        storedTypingState = null;
      }
      const hasPausedDraft =
        hasPendingRefresh ||
        (storedTypingState?.started === true &&
          storedTypingState?.finished !== true);

      if (storedSid || persistedSession?.studentId) {
        setStudentId(storedSid || persistedSession?.studentId);
      }

      if (!storedSid && persistedSession?.studentId) {
        sessionStorage.setItem("studentId", persistedSession.studentId);
      }
      if (!storedSessionId && persistedSession?.sessionId) {
        sessionStorage.setItem("sessionId", persistedSession.sessionId);
      }
      if (!storedStudentName && persistedSession?.studentName) {
        sessionStorage.setItem("studentName", persistedSession.studentName);
      }
      if (!storedToken && persistedSession?.token) {
        sessionStorage.setItem("token", persistedSession.token);
      }
      if (
        sessionStorage.getItem("testEndsAt") === null &&
        typeof persistedSession?.testEndsAt === "number"
      ) {
        sessionStorage.setItem("testEndsAt", String(persistedSession.testEndsAt));
      }
      if (
        sessionStorage.getItem("testStartedAt") === null &&
        typeof persistedSession?.testStartedAt === "number"
      ) {
        sessionStorage.setItem(
          "testStartedAt",
          String(persistedSession.testStartedAt)
        );
      }
      if (
        sessionStorage.getItem("serverRemainingSeconds") === null &&
        typeof persistedSession?.serverRemainingSeconds === "number"
      ) {
        sessionStorage.setItem(
          "serverRemainingSeconds",
          String(persistedSession.serverRemainingSeconds)
        );
      }

      if (hasPendingRefresh) {
        sessionStorage.setItem("testActive", "true");
        if (typeof pendingRefreshState.remainingSeconds === "number") {
          sessionStorage.setItem(
            "serverRemainingSeconds",
            String(pendingRefreshState.remainingSeconds)
          );
          sessionStorage.setItem(
            "remainingTime",
            String(pendingRefreshState.remainingSeconds)
          );
        }
        sessionStorage.removeItem("testEndsAt");
      }

      if (storedActive) {
        testStartedRef.current = true;
        if (mounted) setLoading(false);
        return;
      }

      let token = storedToken || persistedSession?.token || null;

      if (!token) {
        const res = await fetch("/api/get-session", { credentials: "include" });
        const data = await res.json();
        token = data?.token ?? null;
      }

      if (!token) return router.replace("/login");
      console.log("TEST_VALIDATE_TOKEN", token);

      let session;
      try {
        const response = await fetch("/api/validate-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token }),
        });
        session = await response.json();
        console.log("TEST_VALIDATE_SESSION", session);
      } catch {
        session = null;
      }

      if (!session?.valid) {
        // If login already handed us a valid token and student/session details,
        // allow the test page to continue rather than forcing an immediate logout.
        if (storedToken && storedSid && storedSessionId) {
          testStartedRef.current = storedActive;
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        return handleSessionFailure();
      }

      sessionStorage.setItem("token", token);
      const canResumePausedTest = session.testPaused === true;

      if (!hasPendingRefresh && typeof session.remainingSeconds === "number") {
        sessionStorage.setItem(
          "serverRemainingSeconds",
          String(session.remainingSeconds)
        );
      } else if (!hasPendingRefresh) {
        sessionStorage.removeItem("serverRemainingSeconds");
      }
      if (!hasPendingRefresh && typeof session.testEndsAt === "number") {
        sessionStorage.setItem("testEndsAt", String(session.testEndsAt));
      } else if (!hasPendingRefresh) {
        sessionStorage.removeItem("testEndsAt");
      }
      if (typeof session.testStartedAt === "number") {
        sessionStorage.setItem("testStartedAt", String(session.testStartedAt));
      } else {
        sessionStorage.removeItem("testStartedAt");
      }

      const sid = session.studentId || storedSid;
      if (mounted) setStudentId(sid);

      const resolvedSessionId =
        storedSessionId ||
        (await convex.query(api.student.getStudentSession, {
          studentId: sid,
        }));

      const student =
        storedStudentName
          ? { name: storedStudentName }
          : await convex.query(api.student.getStudentById, {
              studentId: sid,
            });

      //  STORE EVERYTHING PROPERLY
      sessionStorage.setItem("studentId", sid);
      sessionStorage.setItem("sessionId", resolvedSessionId);
      sessionStorage.setItem("studentName", student?.name || "");
      localStorage.setItem(
        "activeTestSession",
        JSON.stringify({
          studentId: sid,
          sessionId: resolvedSessionId,
          token,
          studentName: student?.name || "",
          testActive: !!session.testActive || canResumePausedTest || hasPausedDraft,
          serverRemainingSeconds:
            hasPendingRefresh &&
            typeof pendingRefreshState.remainingSeconds === "number"
              ? pendingRefreshState.remainingSeconds
              :
            typeof session.remainingSeconds === "number"
              ? session.remainingSeconds
              : null,
          testEndsAt:
            hasPendingRefresh
              ? null
              :
            typeof session.testEndsAt === "number" ? session.testEndsAt : null,
          testStartedAt:
            typeof session.testStartedAt === "number"
              ? session.testStartedAt
              : null,
        })
      );


      const exists = await convex.query(api.student.checkExists, {
        studentId: sid,
      });
      console.log("TEST_VALIDATE_EXISTS", exists, sid);
      if (!exists) return handleSessionFailure();


      const paragraphId = sessionStorage.getItem("paragraphId");

let attempted = false; //  declare here (global to function)

if (paragraphId) {
  attempted = await convex.query(api.results.hasAttempted, {
    studentId: sid,
    paragraphId,
  });
}

if (attempted) {
  sessionStorage.removeItem("testActive");
  localStorage.removeItem("activeTestSession");
  router.replace("/already-attempted");
  return;
}

      if (session.testActive || canResumePausedTest) {
        sessionStorage.setItem("studentId", sid);
        sessionStorage.setItem("testActive", "true");
        testStartedRef.current = true;
        setLoading(false);
        return;
      }

      if (hasPausedDraft) {
        sessionStorage.setItem("studentId", sid);
        sessionStorage.setItem("testActive", "true");
        testStartedRef.current = true;
        setLoading(false);
        return;
      }

      if (mounted) {
        testStartedRef.current = true;

        sessionStorage.setItem("studentId", sid);
        sessionStorage.removeItem("testActive");

        setLoading(false);
      }
    }

    validate();
    return () => (mounted = false);
  }, [router]);

 

  useEffect(() => {
  if (!showFsWarning) return;

  // Always keep user locked on the same page
  const enforceStay = () => {
    // Force browser to move forward immediately
    setTimeout(() => {
      window.history.forward();
    }, 0);
  };

  // Prime the history with a dummy state
  window.history.pushState(null, "", window.location.href);
  window.history.pushState(null, "", window.location.href);

  // Catch "Back" events
  window.addEventListener("popstate", enforceStay);

  // Block ALT+Left / Right
  const blockAltNav = (e) => {
    if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
    }
  };
  window.addEventListener("keydown", blockAltNav);

  // Block refresh/close
  const beforeUnload = (e) => {
    e.preventDefault();
    e.returnValue = "";
  };
  window.addEventListener("beforeunload", beforeUnload);

  return () => {
    window.removeEventListener("popstate", enforceStay);
    window.removeEventListener("keydown", blockAltNav);
    window.removeEventListener("beforeunload", beforeUnload);
  };
}, [showFsWarning]);


  

  

  if (loading) return <div>Validating session…</div>;

  if (exitingTest) return <div>Logging out...</div>;

  return (
    <PageWrapper>
      <NavHeader currentSpeed={currentSpeed} />

      <MainContent>
        <TypingCard homepageCallback={setCurrentSpeed} studentId={studentId} />
      </MainContent>

      {showFsWarning ? (
        <Overlay>
          <h2>Fullscreen Required</h2>
          <p>Please return to fullscreen mode to continue the typing test.</p>
          <OverlayBtn onClick={handleResumeFullscreen}>Resume Fullscreen</OverlayBtn>
        </Overlay>
      ) : null}
    </PageWrapper>
  );
}

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(255,255,255,0.95);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
`;

const OverlayBtn = styled.button`
  padding: 14px 26px;
  font-size: 18px;
  background: #1976d2;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 20px;
`;

const PageWrapper = styled.div`
  width: 100%;
  min-height: 100vh;
  background: #fafafa;
`;

const MainContent = styled.div`
  max-width: 900px;
  margin: auto;
  padding: 20px;
`;
