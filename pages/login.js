import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import styled from "styled-components";
import Image from "next/image";

function sanitizeCredential(value) {
  return value
    ?.toString()
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

function clearPersistedTestState() {
  if (typeof window === "undefined") return;

  const sessionKeys = [
    "studentId",
    "sessionId",
    "studentName",
    "token",
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
    if (key === "activeTestSession" || key.startsWith("typingStateBackup:")) {
      localKeysToDelete.push(key);
    }
  }

  for (const key of localKeysToDelete) {
    localStorage.removeItem(key);
  }

}

async function resetClosedTestIfNeeded() {
  if (typeof window === "undefined") return;

  const closedMarkerRaw = localStorage.getItem("closedTestSession");
  if (!closedMarkerRaw) return;

  const navigationEntry = performance.getEntriesByType("navigation")?.[0];
  const navigationType = navigationEntry?.type;
  if (navigationType === "reload") {
    localStorage.removeItem("closedTestSession");
    return;
  }

  const marker = JSON.parse(closedMarkerRaw);
  try {
    await fetch("/api/reset-closed-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(marker),
    });
  } catch {}

  clearPersistedTestState();
  localStorage.removeItem("closedTestSession");
}

export default function LoginPage() {
  const router = useRouter();
  const loginInFlightRef = useRef(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  /* --------------------------------------------------
     CHECK EXISTING SESSION BEFORE LOGIN
  ---------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        await resetClosedTestIfNeeded();
        const res = await fetch("/api/get-session", { credentials: "include" });
        const data = await res.json();

        const token = data?.token;
        if (!token) return; // no cookie → allow login

        const validateRes = await fetch("/api/validate-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token }),
        });
        const session = await validateRes.json();

        if (cancelled || loginInFlightRef.current) return;

        //  invalid cookie -> allow login page to continue.
        //  Avoid calling /api/logout here because it can race with a fresh
        //  login and delete the newly created session.
        if (!session?.valid) {
          return;
        }

        //  redirect if the test is running or paused for resume
        if (session.valid && (session.testActive || session.testPaused)) {
          router.replace("/test");
        }
      } catch (err) {
        console.error("Login auto-check failed", err);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  /* --------------------------------------------------
     LOGIN HANDLER
  ---------------------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    loginInFlightRef.current = true;
    setMessage("Securely logging you in....");

    try {
      const safeUsername = sanitizeCredential(username);
      const safePassword = sanitizeCredential(password);

      const response = await fetch("/api/verifyStudent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: safeUsername,
          password: safePassword,
        }),
      });

      const result = await response.json();

      if (!result?.success) {
        loginInFlightRef.current = false;
        setMessage(result?.message || "Invalid credentials");
        return;
      }

      if (!result.resume) {
        clearPersistedTestState();
      }

      //  Store in sessionStorage for TypingCard
      sessionStorage.setItem("studentId", result.studentId);
      sessionStorage.setItem("sessionId", result.sessionId);
      if (result.resume) {
        sessionStorage.setItem("testActive", "true");
      } else {
        sessionStorage.removeItem("testActive");
      }

      //  store token for updateTestActive mutation
      sessionStorage.setItem("token", result.token);
      if (typeof result.remainingSeconds === "number") {
        sessionStorage.setItem(
          "serverRemainingSeconds",
          String(result.remainingSeconds)
        );
      } else {
        sessionStorage.removeItem("serverRemainingSeconds");
      }
      if (typeof result.testEndsAt === "number") {
        sessionStorage.setItem("testEndsAt", String(result.testEndsAt));
      } else {
        sessionStorage.removeItem("testEndsAt");
      }
      if (typeof result.testStartedAt === "number") {
        sessionStorage.setItem("testStartedAt", String(result.testStartedAt));
      } else {
        sessionStorage.removeItem("testStartedAt");
      }

      //  If you have name in result, save it
      if (result.name) {
        sessionStorage.setItem("studentName", result.name);
      }

      localStorage.setItem(
        "activeTestSession",
        JSON.stringify({
          studentId: result.studentId,
          sessionId: result.sessionId,
          token: result.token,
          studentName: result.name || "",
          testActive: !!result.resume,
          serverRemainingSeconds:
            typeof result.remainingSeconds === "number"
              ? result.remainingSeconds
              : null,
          testEndsAt:
            typeof result.testEndsAt === "number" ? result.testEndsAt : null,
          testStartedAt:
            typeof result.testStartedAt === "number"
              ? result.testStartedAt
              : null,
        })
      );
      //  Store backend-created session cookie
      await fetch("/api/set-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          token: result.token,
          expiresAt: result.expiresAt ?? Date.now() + 60 * 60 * 1000,
          studentId: result.studentId,
          sessionId: result.sessionId,
        }),
      });

      setMessage("");
      router.replace("/test");
    } catch (err) {
      loginInFlightRef.current = false;
      console.error(err);
      setMessage("Server error. Try again.");
    }
  };

  return (
    <Container>
      <Card>
        <LogoWrapper>
          <Image
            src="/images/dtulogo.png"
            alt="DTU Logo"
            width={70}
            height={70}
          />
      </LogoWrapper>
        <SubText>Login to begin your test</SubText>

        <Form onSubmit={handleSubmit} autoComplete="off">
          <input
            type="text"
            name="prevent_autofill_username"
            autoComplete="username"
            tabIndex={-1}
            aria-hidden="true"
            style={{ display: "none" }}
          />
          <input
            type="password"
            name="prevent_autofill_password"
            autoComplete="new-password"
            tabIndex={-1}
            aria-hidden="true"
            style={{ display: "none" }}
          />
          <Label>Username</Label>
          <Input
            type="text"
            name="exam_candidate_id"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <Label>Password</Label>
          <Input
            type="password"
            name="exam_access_key"
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit">Login</Button>
        </Form>

        <Message isSuccess={message.includes("✓")}>{message}</Message>
      </Card>
      <Footer>
        <BoldText>Designed & Developed by Computer Center</BoldText>
        <div>Delhi Technological University</div>
      </Footer>


    </Container>
  );
}

/* ---------------- Styled Components ---------------- */

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100svh;
  width: 100%;
  background: #ffffff;
`;

const Card = styled.div`
  background: #ffffff;
  border: 1px solid #ddd;
  padding: 2rem 2.5rem;
  border-radius: 1rem;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
  text-align: center;
  width: 92%;
  max-width: 420px;
`;
const BoldText = styled.div`
  font-weight: 700;
`;

const SubText = styled.p`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  text-align: left;
  width: 100%;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const Input = styled.input`
  padding: 0.8rem;
  border-radius: 8px;
  background: #f3f3f3;
  border: 1px solid #ccc;
`;

const Button = styled.button`
  margin-top: 0.6rem;
  background: #5f27cd;
  border: none;
  color: white;
  padding: 0.85rem;
  border-radius: 8px;
`;

const Message = styled.p`
  margin-top: 0.9rem;
  color: ${({ isSuccess }) => (isSuccess ? "#00b894" : "#ff7675")};
`;

const Footer = styled.footer`
  margin-top: 20px;
  color: #120202ff;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

const LogoWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
`;
