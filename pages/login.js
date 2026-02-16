import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { ConvexReactClient } from "convex/react";
import { useRouter } from "next/router";
import styled from "styled-components";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default function LoginPage() {
  const router = useRouter();
  const verifyStudent = useMutation(api.student.verifyStudent);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  /* --------------------------------------------------
     BLOCK BACK BUTTON
  ---------------------------------------------------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const push = () => window.history.pushState(null, "", window.location.href);
    push();
    window.addEventListener("popstate", push);
    return () => window.removeEventListener("popstate", push);
  }, []);

  /* --------------------------------------------------
     CHECK EXISTING SESSION BEFORE LOGIN
  ---------------------------------------------------- */
  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/get-session", { credentials: "include" });
        const data = await res.json();

        const token = data?.token;
        if (!token) return; // no cookie → allow login

        const session = await convex.query(api.sessions.validateSession, {
          token,
        });

        // ❌ invalid cookie → logout and allow login
        if (!session?.valid) {
          await fetch("/api/logout", { method: "POST" });
          return;
        }

        //  redirect only if testActive is TRUE
        if (session.valid && session.testActive) {
          router.replace("/test");
        }
      } catch (err) {
        console.error("Login auto-check failed", err);
      }
    }

    check();
  }, [router]);

  /* --------------------------------------------------
     LOGIN HANDLER
  ---------------------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("Checking credentials...");

    try {
      const result = await verifyStudent({ username, password });

      if (!result?.success) {
        setMessage(result?.message || "Invalid credentials");
        return;
      }

      //  Store in sessionStorage for TypingCard
      sessionStorage.setItem("studentId", result.studentId);
      sessionStorage.setItem("sessionId", result.sessionId);
      sessionStorage.setItem("testActive", "true");

      //  IMPORTANT: store token for updateTestActive mutation
      sessionStorage.setItem("token", result.token);

      //  If you have name in result, save it
      if (result.name) {
        sessionStorage.setItem("studentName", result.name);
      }

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

      router.replace("/test");
    } catch (err) {
      console.error(err);
      setMessage("Server error. Try again.");
    }
  };

  return (
    <Container>
      <Card>
        <SubText>Login to begin your test</SubText>

        <Form onSubmit={handleSubmit}>
          <Label>Username</Label>
          <Input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <Label>Password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit">Login</Button>
        </Form>

        <Message isSuccess={message.includes("✓")}>{message}</Message>
      </Card>

      <Footer>Developed by CC • DTU</Footer>
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
  color: #aaa;
`;
