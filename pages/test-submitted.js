// pages/test-submitted.js

import styled from "styled-components";
import { useRouter } from "next/router";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { jsPDF } from "jspdf";

export default function TestSubmitted() {
  const router = useRouter();
  const { resultId } = router.query;

  const result = useQuery(
    api.results.getResultById,
    resultId ? { id: resultId } : "skip"
  );

  // const generatePDF = () => {
  //   if (!result) {
  //     alert("Result not loaded yet");
  //     return;
  //   }

  //   const doc = new jsPDF();
  //   const pageWidth = doc.internal.pageSize.getWidth();
  //   const pageHeight = doc.internal.pageSize.getHeight();
  //   const submittedTime = new Date(result.submittedAt).toLocaleString();

  //   // ================= HEADER AREA =================
  //   doc.setFillColor(240, 245, 255);
  //   doc.rect(0, 0, pageWidth, 40, "F");

  //   doc.setFontSize(15);
  //   doc.text("Typing Test Report", pageWidth / 2, 12, { align: "center" });

  //   // ---- HEADER TABLE ----
  //   const headers = [
  //     "Candidate ID",
  //     "Candidate Name",
  //     "Time",
  //     "Session",
  //     "WPM",
  //     "Post Applied",
  //     "Key Depressions",
  //   ];

  //   const keyDepressions = Math.round(
  //     (result.symbols / result.seconds) * 3600
  //   );

  //   const values = [
  //     result.studentId || "N/A",
  //     result.name || "N/A",
  //     `${result.seconds} sec`,
  //     result.sessionName || "N/A",
  //     result.wpm || "N/A",
  //     result.postApplied || "N/A",
  //     keyDepressions || "N/A",
  //   ];

  //   doc.setFontSize(9);

  //   const startX = 10;
  //   const colWidth = (pageWidth - 20) / headers.length;

  //   // Header Row
  //   headers.forEach((header, i) => {
  //     doc.text(header, startX + i * colWidth, 24);
  //   });

  //   // Value Row
  //   values.forEach((value, i) => {
  //     doc.text(String(value), startX + i * colWidth, 32);
  //   });

  //   // ================= CONTENT =================
  //   doc.setFontSize(14);
  //   doc.text("Typed Paragraph", 14, 50);

  //   let y = 60;
  //   doc.setFontSize(11);

  //   const lines = doc.splitTextToSize(result.text || "", 180);

  //   lines.forEach((line) => {
  //     if (y > pageHeight - 20) {
  //       doc.addPage();
  //       y = 20;
  //     }
  //     doc.text(line, 14, y);
  //     y += 7;
  //   });

  //   // ================= FOOTER =================
  //   const pages = doc.getNumberOfPages();

  //   for (let i = 1; i <= pages; i++) {
  //     doc.setPage(i);
  //     doc.setFontSize(9);
  //     doc.text(`Submitted: ${submittedTime}`, 14, pageHeight - 10);
  //     doc.text(`${i}/${pages}`, pageWidth - 14, pageHeight - 10, {
  //       align: "right",
  //     });
  //   }

  //   const blob = doc.output("blob");
  //   window.open(URL.createObjectURL(blob));
  // };

  const generatePDF = () => {
  if (!result) {
    alert("Result not loaded yet");
    return;
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const submittedTime = new Date(result.submittedAt).toLocaleString();

  // ================= HEADER AREA =================
  doc.setFillColor(240, 245, 255);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setFontSize(15);
  doc.text("Typing Test Report", pageWidth / 2, 12, { align: "center" });

  // ---- HEADER TABLE ----
  const headers = [
    "Candidate ID",
    "Candidate Name",
    "Time",
    "Session",
    "WPM",
    "Post Applied",
    "Key Depressions",
  ];

  const keyDepressions =
    result.seconds > 0
      ? Math.round((result.symbols / result.seconds) * 3600)
      : 0;

  const values = [
    result.studentId || "N/A",
    result.name || "N/A",
    `${result.seconds} sec`,
    result.sessionName || "N/A",
    result.wpm || "N/A",
    result.postApplied || "N/A",
    keyDepressions || "N/A",
  ];

  doc.setFontSize(9);

  const startX = 10;
  const colWidth = (pageWidth - 20) / headers.length;

  headers.forEach((header, i) => {
    doc.text(header, startX + i * colWidth, 24);
  });

  values.forEach((value, i) => {
    doc.text(String(value), startX + i * colWidth, 32);
  });

  // ================= CONTENT =================
  doc.setFontSize(14);
  doc.text("Typed Paragraph", 14, 50);

  let y = 60;
  doc.setFontSize(11);

  const lines = doc.splitTextToSize(result.text || "", 180);

  lines.forEach((line) => {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, 14, y);
    y += 7;
  });

  // ================= SIGNATURE ON LAST PAGE =================
  const totalPages = doc.getNumberOfPages();
  doc.setPage(totalPages);

  const signatureY = pageHeight - 35;

  doc.setFontSize(11);

  // Candidate Name (Left)
  doc.text(
    `Candidate Name: ${result.name || "N/A"}`,
    14,
    signatureY
  );

  // Signature Line (Right)
  doc.line(
    pageWidth - 80,
    signatureY,
    pageWidth - 20,
    signatureY
  );
  doc.text("Signature", pageWidth - 80, signatureY + 6);

  // ================= FOOTER =================
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);

    doc.text(
      `Submitted: ${submittedTime}`,
      14,
      pageHeight - 10
    );

    doc.text(
      `${i}/${totalPages}`,
      pageWidth - 14,
      pageHeight - 10,
      { align: "right" }
    );
  }

  // OPEN PDF
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url);
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