// pages/test-submitted.js
import { useEffect } from "react";
import styled from "styled-components";
import { useRouter } from "next/router";

export default function TestSubmitted() {
  const router = useRouter();

  useEffect(() => {
    //  HARD LOCK: prevent back navigation
    window.history.pushState(null, "", window.location.href);
    window.onpopstate = () => window.history.forward();

    //  FINAL CLEANUP (safety net)
    sessionStorage.clear();
    localStorage.removeItem("typing_test_state");

    // Redirect to login
    const t = setTimeout(() => {
      router.replace("/login");
    }, 1500);

    return () => clearTimeout(t);
  }, [router]);

  return (
    <Wrapper>
      <Card>
        <Title>Test submitted successfully ✅</Title>
        <Sub>Your result has been recorded.</Sub>
      </Card>
    </Wrapper>
  );
}

/* ---------------- STYLES ---------------- */

const Wrapper = styled.div`
  min-height: 100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#fff;
`;

const Card = styled.div`
  background:#f8fbff;
  padding:2rem;
  border-radius:12px;
  box-shadow:0 6px 18px rgba(0,0,0,0.08);
  text-align:center;
`;

const Title = styled.h1`
  margin:0 0 .5rem 0;
  font-size:1.6rem;
`;

const Sub = styled.p`
  margin:0;
  color:#555;
`;
