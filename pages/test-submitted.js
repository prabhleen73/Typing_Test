// pages/test-submitted.js

import { useEffect } from "react";
import styled from "styled-components";
import { useRouter } from "next/router";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { generateTypingPDF } from "../utils/generateTypingPdf";

export default function TestSubmitted() {
  const router = useRouter();
  const { resultId } = router.query;
  const isReady = router.isReady;
  const storedResultId =
    typeof window !== "undefined"
      ? sessionStorage.getItem("submittedResultId")
      : null;
  const storedExpiryRaw =
    typeof window !== "undefined"
      ? sessionStorage.getItem("submittedPageExpiresAt")
      : null;
  const storedExpiry =
    storedExpiryRaw !== null && !Number.isNaN(Number(storedExpiryRaw))
      ? Number(storedExpiryRaw)
      : null;
  const hasValidSubmittedSession =
    !!storedResultId &&
    typeof storedExpiry === "number" &&
    storedExpiry > Date.now();
  const effectiveResultId = resultId || (hasValidSubmittedSession ? storedResultId : null);

  useEffect(() => {
    if (!isReady) return;
    if (typeof window === "undefined") return;
    if (effectiveResultId) return;

    sessionStorage.removeItem("submittedResultId");
    sessionStorage.removeItem("submittedPageExpiresAt");
    router.replace("/login");
  }, [effectiveResultId, isReady, router]);

  const result = useQuery(
  api.results.getResultById,
  isReady && effectiveResultId ? { id: effectiveResultId } : "skip"
);

  // Fetch test settings (for post name)
  const testSettings = useQuery(
    api.settings.getTestSettings,
    result?.sessionId ? { sessionId: result.sessionId } : "skip"
  );

  const generatePDF = () => {
    if (!result) {
      alert("Result not loaded yet");
      return;
    }

    generateTypingPDF(result, {
      showSignature: true,
      postName: testSettings?.postName || null,
    });
  };

  return (
    <Wrapper>
      <Card>
        <Title>Test submitted successfully ✅</Title>
        <Sub>Your result has been recorded.</Sub>

        <PdfButton disabled={!result} onClick={generatePDF}>
          View Result PDF
        </PdfButton>
      </Card>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Card = styled.div`
  background: #f8fbff;
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
`;

const Title = styled.h1``;

const Sub = styled.p`
  margin-bottom: 20px;
`;

const PdfButton = styled.button`
  padding: 12px 22px;
  border: none;
  border-radius: 8px;
  background: #3b5bff;
  color: white;
  cursor: pointer;

  &:disabled {
    background: #999;
    cursor: not-allowed;
  }
`;
