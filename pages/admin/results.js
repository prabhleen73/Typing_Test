import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import styled from "styled-components";
import { useState } from "react";
import { jsPDF } from "jspdf";
import { generateTypingPDF } from "../../utils/generateTypingPdf";


const addPerStudentFooter = (doc, startPage, endPage) => {
  const total = endPage - startPage + 1;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = startPage; i <= endPage; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    const current = i - startPage + 1;
    doc.text(`${current}/${total}`, pageWidth - 14, pageHeight - 10, {
      align: "right",
    });
  }
};

const formatTime = (seconds) => {
  if (!seconds || seconds <= 0) return "0 min";
  const mins = Math.ceil(seconds / 60);  // round up
  return `${mins} min`;
};
export default function Results() {
  const sessions = useQuery(api.testSessions.getTestSessions);
  const [selectedSession, setSelectedSession] = useState("");

  const results = useQuery(
    api.results.getResultsBySession,
    selectedSession ? { sessionId: selectedSession } : "skip"
  );

  const [modalText, setModalText] = useState("");
  const [showModal, setShowModal] = useState(false);

  const openModal = (text) => {
    setModalText(text);
    setShowModal(true);
  };


const generatePDF = (r) => {
  generateTypingPDF(r, { showSignature: false });
};


  //DOWNLOAD ALL PDFs 
const generateAllPDFs = () => {
  if (!results || results.length === 0) {
    alert("No results available.");
    return;
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const sortedResults = [...results].sort((a, b) => b.wpm - a.wpm);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(
    "RESULT OF TYPING TEST FOR THE POST OF __________ HELD IN COMPUTER CENTER ON DATE __________",
    pageWidth / 2,
    20,
    { align: "center", maxWidth: pageWidth - 30 }
  );

  // ================= SUMMARY TABLE =================
  let y = 40;
  const rowHeight = 12;

  const col = {
    sno: 14,
    candidateId: 25,
    name: 45,
    qualifying: 95,
    result: 135,
    status: 175,
  };

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  doc.rect(14, y, pageWidth - 28, rowHeight);

  doc.text("S.No", col.sno + 2, y + 6);
  doc.text("Candidate ID", col.candidateId + 2, y + 6);
  doc.text("Candidate Name", col.name + 2, y + 6);
  doc.text("Qualifying WPM/KDPH", col.qualifying + 2, y + 6);
  doc.text("Result WPM/KDPH", col.result + 2, y + 6);
  doc.text("Status", col.status + 2, y + 6);

  y += rowHeight;
  doc.setFont("helvetica", "normal");

  //  Set qualifying criteria here
  const qualifyingWpm = 30;
  const qualifyingKph = 9000;

  sortedResults.forEach((r, index) => {
    if (y > pageHeight - 15) {
      doc.addPage();
      y = 20;
    }

    const kph = r.kdph || 0;

    const isQualified =
      r.wpm >= qualifyingWpm && kph >= qualifyingKph;

    doc.rect(14, y, pageWidth - 28, rowHeight);

    doc.text(String(index + 1), col.sno + 2, y + 6);
    doc.text(r.studentId || "N/A", col.candidateId + 2, y + 6);
    
    const wrappedName = doc.splitTextToSize(r.name || "N/A", 45);
    doc.text(wrappedName, col.name + 2, y + 6);
    doc.text(`${qualifyingWpm}/${qualifyingKph}`, col.qualifying + 2, y + 6);
    doc.text(`${r.wpm}/${kph}`, col.result + 2, y + 6);
    doc.text(isQualified ? "Qualified" : "Not Qualified", col.status + 2, y + 6);

    y += rowHeight;
  });

  // ================= INDIVIDUAL REPORTS =================

  // sortedResults.forEach((r) => {
  // doc.addPage();
  //   const startPage = doc.getNumberOfPages();

  //   const sessionLabel = r.sessionName || "N/A";
  //   const studentName = r.name || "N/A";

  //   doc.setFillColor(240, 245, 255);
  //   doc.rect(0, 0, pageWidth, 30, "F");

  //   doc.setFontSize(15);
  //   doc.text("Typing Test Report", pageWidth / 2, 12, { align: "center" });

  //   doc.setFontSize(11);
  //   doc.text(`Student ID: ${r.studentId}`, 14, 20);
  //   doc.text(`Name: ${studentName}`, pageWidth / 2, 20, { align: "center" });
  //   doc.text(`Time: ${r.seconds} sec`, pageWidth - 14, 20, { align: "right" });

  //   doc.setFontSize(10);
  //   doc.text(`Session: ${sessionLabel}`, 14, 27);
  //   doc.text(`WPM: ${r.wpm}`, pageWidth / 2, 27, { align: "center" });
  //   doc.text(`Correct Characters: ${r.symbols}`, pageWidth - 14, 27, {
  //     align: "right",
  // });

  //   doc.setFontSize(15);
  //   doc.text("Typed Paragraph", 14, 44);

  //   doc.setFontSize(12);
  //   let yPos = 54;
  //   const lineHeight = 7;

  //   const paragraphText = r.text || "No typed text available";
  //   const lines = doc.splitTextToSize(paragraphText, 180);

  //   lines.forEach((line) => {
  //     if (yPos > pageHeight - 20) {
  //       doc.addPage();
  //       yPos = 20;
  //     }
  //     doc.text(line, 14, yPos);
  //     yPos += lineHeight;
  //   });

  //   const endPage = doc.getNumberOfPages();
  //   addPerStudentFooter(doc, startPage, endPage);
  // });

  sortedResults.forEach((r) => {
  doc.addPage();
  const startPage = doc.getNumberOfPages();

  const submittedTime = new Date(r.submittedAt).toLocaleString();

  // ===== HEADER AREA (Same as normal PDF) =====
  doc.setFillColor(240, 245, 255);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setFontSize(15);
  doc.text("Typing Test Report", pageWidth / 2, 12, { align: "center" });

  const headers = [
    "Candidate ID",
    "Candidate Name",
    "Time",
    "Session",
    "WPM",
    "Post Applied",
    "KDPH",
  ];


  const values = [
    r.studentId || "N/A",
    r.name || "N/A",
    `${formatTime(r.seconds)}`,
    r.sessionName || "N/A",
    r.wpm || "N/A",
    r.postApplied || "N/A",
    r.kdph || 0,,
  ];

  doc.setFontSize(9);

  const startX = 10;
  const colWidth = (pageWidth - 20) / headers.length;

  headers.forEach((header, i) => {
    doc.text(header, startX + i * colWidth, 24);
  });

 values.forEach((value, i) => {
  const wrapped = doc.splitTextToSize(String(value), colWidth - 4);
  doc.text(wrapped, startX + i * colWidth, 32);
});

  // ===== CONTENT =====
  doc.setFontSize(14);
  doc.text("Typed Paragraph", 14, 50);

  let yPos = 60;
  const lineHeight = 7;

  doc.setFontSize(11);

  const lines = doc.splitTextToSize(r.text || "", 180);

  lines.forEach((line) => {
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(line, 14, yPos);
    yPos += lineHeight;
  });

  const endPage = doc.getNumberOfPages();
  addPerStudentFooter(doc, startPage, endPage);
});

  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, "_blank");
};



  return (
    <Container>
      <Title>All Results</Title>

      <SessionFilter>
        <label>Select Session:</label>
        <select
          value={selectedSession}
          onChange={(e) => setSelectedSession(e.target.value)}
        >
          <option value="">-- Select Session --</option>
          {sessions?.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>

        {results?.length > 0 && (
          <DownloadAllButton onClick={generateAllPDFs}>
            📥 Download All PDFs
          </DownloadAllButton>
        )}
      </SessionFilter>

      {showModal && (
        <ModalOverlay onClick={() => setShowModal(false)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Original Paragraph</ModalTitle>
            <ModalContent>{modalText}</ModalContent>
            <CloseButton onClick={() => setShowModal(false)}>
              Close
            </CloseButton>
          </ModalBox>
        </ModalOverlay>
      )}

      {!selectedSession ? (
        <Empty>Please select a session to view results.</Empty>
      ) : !results ? (
        <Loading>Loading results...</Loading>
      ) : results.length === 0 ? (
        <Empty>No students found for this session.</Empty>
      ) : (
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Paragraph</th>
                <th>WPM</th>
                <th>Accuracy</th>
                <th>Original Symbols</th>
                <th>Correct Symbols</th>
                <th>Time Taken</th>
                <th>Submitted At</th>
                <th>Result</th>
              </tr>
            </thead>

            <tbody>
              {[...results]
                .sort((a, b) => b.wpm - a.wpm)
                .map((r, index) => (
                  <tr key={r._id}>
                    <td>{index + 1}</td>
                    <td>{r.studentId}</td>
                    <td>{r.name}</td>

                    <td>
                      <ParagraphButton
                        onClick={() => openModal(r.paragraphContent)}
                      >
                        View Paragraph
                      </ParagraphButton>
                    </td>

                    <td>{r.wpm}</td>
                    <td>{r.accuracy}%</td>
                    <td>{r.originalSymbols}</td>
                    <td>{r.symbols}</td>
                    <td>{formatTime(r.seconds)}</td>
                    <td>{new Date(r.submittedAt).toLocaleString()}</td>

                    <td>
                      <DownloadButton onClick={() => generatePDF(r)}>
                        Download PDF
                      </DownloadButton>
                    </td>
                  </tr>
                ))}
            </tbody>
          </Table>
        </TableWrapper>
      )}
    </Container>
  );
}

/* ---------------- STYLES ---------------- */

const DownloadAllButton = styled.button`
  background: linear-gradient(90deg, #321948ff, #032221ff);
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;

  &:hover {
    background: linear-gradient(90deg, #00997a, #00b3b3);
  }
`;

const SessionFilter = styled.div`
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
  align-items: center;

  select {
    padding: 8px;
    border-radius: 6px;
    border: 1px solid #ccc;
  }
`;

const ParagraphButton = styled.button`
  background: none;
  border: none;
  color: #3b5bff;
  cursor: pointer;
  text-decoration: underline;
`;

const DownloadButton = styled.button`
  background: #3b5bff;
  color: white;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ModalBox = styled.div`
  background: white;
  padding: 20px;
  width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  border-radius: 10px;
`;

const ModalTitle = styled.h3``;

const ModalContent = styled.p`
  white-space: pre-wrap;
`;

const CloseButton = styled.button`
  margin-top: 15px;
  padding: 10px 20px;
  background: #3b5bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
`;

const Container = styled.div`
  padding: 40px;
  background: #f6f8fc;
  min-height: 100vh;
`;

const Title = styled.h2`
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 25px;
`;

const Loading = styled.div`
  font-size: 18px;
  color: #555;
`;

const Empty = styled.div`
  font-size: 18px;
  color: #777;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  margin-top: 20px;
  border-radius: 10px;
  border: 1px solid #d0d7e2;
  background: #fff;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th {
    background: #eef2ff;
    padding: 14px;
    text-align: left;
  }

  td {
    padding: 12px;
    border-bottom: 1px solid #ececec;
  }

  tr:hover {
    background: #f9fafb;
  }
`;
