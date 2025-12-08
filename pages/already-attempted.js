import { useEffect } from "react";
import styled from "styled-components";
import { useRouter } from "next/router";

export default function AlreadyAttempted() {
  const router = useRouter();

  useEffect(() => {
    // Show message for 1.8 seconds → then redirect to login
    const t = setTimeout(() => {
      router.replace("/login");
    }, 1800);

    return () => clearTimeout(t);
  }, [router]);

  return (
    <Wrapper>
      <Card>
        <Title>You Have Already Attempted the Test</Title>
        <Subtitle>Your response has been recorded.</Subtitle>
      </Card>
    </Wrapper>
  );
}

/* ---------------- STYLES ---------------- */

const Wrapper = styled.div`
  height: 100vh;
  display:flex;
  justify-content:center;
  align-items:center;
  background:#f4f7ff;
`;

const Card = styled.div`
  background:#ffffff;
  padding:2rem 2.5rem;
  border-radius:12px;
  box-shadow:0 6px 18px rgba(0,0,0,0.1);
  text-align:center;
  width:90%;
  max-width:450px;
`;

const Title = styled.h1`
  font-size:1.5rem;
  font-weight:700;
  margin-bottom:0.5rem;
`;

const Subtitle = styled.p`
  font-size:1rem;
  color:#555;
  margin:0;
`;
