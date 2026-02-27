import { useRouter } from "next/router";
import { useState } from "react";
import styled from "styled-components";

export default function StartTestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    try {
      await document.documentElement.requestFullscreen();
    } catch (err) {
      console.log("Fullscreen failed", err);
    }

    // Mark fullscreen ready
    sessionStorage.setItem("fsReady", "true");

    setLoading(true);
    router.push("/test");
  }

  return (
    <Overlay>
      <h1>Start Your Typing Test</h1>
      <p>Please click below to begin in fullscreen mode.</p>
      <StartBtn onClick={handleStart} disabled={loading}>
        {loading ? "Starting..." : "Start Test"}
      </StartBtn>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const StartBtn = styled.button`
  padding: 14px 26px;
  font-size: 18px;
  background: #1976d2;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
`;