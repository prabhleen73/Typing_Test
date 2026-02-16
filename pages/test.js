// pages/test.js — Patched TestPage
import { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { useRouter } from "next/router";
import { ConvexReactClient } from "convex/react";
import { api } from "../convex/_generated/api";

import NavHeader from "../components/NavHeader";
import TypingCard from "../components/TypingCard";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default function TestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [studentId, setStudentId] = useState(null);

  const validatedRef = useRef(false);
  const testStartedRef = useRef(false);

  const [fsReady, setFsReady] = useState(false);
  const [showFsWarning, setShowFsWarning] = useState(false);

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
    if (typeof window === "undefined") return;

    const onPop = () => {
      if (testStartedRef.current) window.history.forward();
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (validatedRef.current) return;
    validatedRef.current = true;

    let mounted = true;

    async function validate() {
      if (testStartedRef.current) return;

      const storedSid = sessionStorage.getItem("studentId");
      const storedActive = sessionStorage.getItem("testActive") === "true";

      if (storedSid) setStudentId(storedSid);

      if (storedActive) {
        testStartedRef.current = true;
        if (mounted) setLoading(false);
        return;
      }

      const res = await fetch("/api/get-session", { credentials: "include" });
      const { token } = await res.json();

      if (!token) return router.replace("/login");

      let session;
      try {
        session = await convex.query(api.sessions.validateSession, { token });
      } catch {
        return router.replace("/login");
      }

      if (!session?.valid) {
        await fetch("/api/logout", { method: "POST" });
        return router.replace("/login");
      }

      const sid = session.studentId;
      if (mounted) setStudentId(sid);

          // FETCH STUDENT SESSION ID HERE
    const sessionId = await convex.query(api.student.getStudentSession, {
      studentId: sid
    });

      //  STORE IN SESSION STORAGE FOR TypingCard
    
      const student = await convex.query(api.student.getStudentById, {
        studentId: sid,
      });

      //  STORE EVERYTHING PROPERLY
      sessionStorage.setItem("studentId", sid);
      sessionStorage.setItem("sessionId", sessionId);
      sessionStorage.setItem("studentName", student?.name || "");


      const exists = await convex.query(api.student.checkExists, {
        studentId: sid,
      });
      if (!exists) return router.replace("/login");

      const paragraph = await convex.query(api.paragraphs.getParagraph);
      if (!paragraph?._id) {
        alert("No test available.");
        return;
      }

      const attempted = await convex.query(api.results.hasAttempted, {
        studentId: sid,
        paragraphId: paragraph._id,
      });

      if (attempted) {
        await fetch("/api/logout", { method: "POST" });
        router.replace("/already-attempted");
        return;
      }

      if (session.testActive) {
        sessionStorage.setItem("studentId", sid);
        sessionStorage.setItem("testActive", "true");
        testStartedRef.current = true;
        setLoading(false);
        return;
      }

      if (mounted) {
        testStartedRef.current = true;

        try {
          await convex.mutation(api.sessions.updateTestActive, {
            token,
            active: true,
          });
        } catch {}

        sessionStorage.setItem("studentId", sid);
        sessionStorage.setItem("testActive", "true");

        setLoading(false);
      }
    }

    validate();
    return () => (mounted = false);
  }, [router]);

  useEffect(() => {
    if (!fsReady) return;

    const onFsChange = () => {
      const isFs =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement;

      if (!isFs) setShowFsWarning(true);
    };
    document.addEventListener("fullscreenchange", onFsChange);

    const blockKeys = (e) => {
      const key = e.key?.toLowerCase?.() || "";

      if (key === "escape") return e.preventDefault();
      if (/^f\d{1,2}$/.test(key)) return e.preventDefault();
      if (e.altKey) return e.preventDefault();
      if (e.metaKey) return e.preventDefault();
      if (
        (e.ctrlKey && key === "r") ||
        (e.ctrlKey && key === "w") ||
        (e.ctrlKey && key === "p") ||
        (e.ctrlKey && key === "s") ||
        (e.ctrlKey && e.shiftKey && key === "i")
      ) return e.preventDefault();
    };

    window.addEventListener("keydown", blockKeys);
    window.oncontextmenu = (e) => e.preventDefault();

    const onVisibility = () => {
      if (document.hidden) alert("⚠️ You minimized or switched tabs.");
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", blockKeys);
      window.oncontextmenu = null;
    };
  }, [fsReady]);

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


  async function startFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
    } catch {}
    setFsReady(true);
  }

  async function resumeFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
    } catch {}
    setShowFsWarning(false);
  }

  if (loading) return <div>Validating session…</div>;

  return (
    <PageWrapper>
      <NavHeader currentSpeed={currentSpeed} />

      <MainContent>
        <TypingCard homepageCallback={setCurrentSpeed} studentId={studentId} />
      </MainContent>

      {!fsReady && (
        <Overlay>
          <h1>Start Your Typing Test</h1>
          <p>The test runs in fullscreen mode.</p>
          <OverlayBtn onClick={startFullscreen}>Start Test</OverlayBtn>
        </Overlay>
      )}

      {showFsWarning && (
        <Overlay>
          <h1>You left fullscreen</h1>
          <p>Please return to fullscreen.</p>
          <OverlayBtn onClick={resumeFullscreen}>Resume</OverlayBtn>
        </Overlay>
      )}
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