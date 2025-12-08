import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import styled from "styled-components";
import { useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function Results() {
  // Session data
  const sessions = useQuery(api.testSessions.getTestSessions);
  const [selectedSession, setSelectedSession] = useState("");

  // Fetch results for selected session
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

  // -----------------------------
  // 📌 PDF GENERATOR
  // -----------------------------
  const generateoldPDF = (r) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Typing Test Result", 14, 20);

    autoTable(doc, {
      startY: 30,
      head: [["Field", "Value"]],
      body: [
        ["Student ID", r.studentId],
        ["Session", r.sessionName || "N/A"],
        ["WPM", r.wpm],
        ["Accuracy", r.accuracy + "%"],
        ["Original Symbols", r.originalSymbols],
        ["Correct Symbols", r.symbols],
        ["Typed Characters", r.text.length],
        ["Time Taken", r.seconds + " sec"],
        ["Submitted At", new Date(r.submittedAt).toLocaleString()],
      ],
    });

    // Page 2 → Full typed paragraph
    doc.addPage();
    doc.setFontSize(16);
    doc.text("Typed Paragraph:", 14, 20);
    doc.setFontSize(12);
    doc.text(r.text, 14, 30, { maxWidth: 180 });

    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, "_blank");
  };

const generatePDF = (r, index) => {
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const sessionLabel = `Session ${index + 1}`;

  // ✅ PROFESSIONAL HEADER
  const addHeader = () => {
    // 🔹 Light background bar
    doc.setFillColor(240, 245, 255); // light blue
    doc.rect(0, 0, pageWidth, 30, "F");

    // 🔹 Title
    doc.setFontSize(15);
    doc.setTextColor(40, 40, 40);
    doc.text("Typing Test Report", pageWidth / 2, 12, { align: "center" });

    // 🔹 Info Row (Student ID — WPM — Time)
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);

    doc.text(`Student ID: ${r.studentId}`, 14, 22);

    doc.text(`WPM: ${r.wpm}`, pageWidth / 2, 22, {
      align: "center",
    });

    doc.text(`Time: ${r.seconds} sec`, pageWidth - 14, 22, {
      align: "right",
    });

    // 🔹 Second row (Session + Correct Characters)
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);

    doc.text(`${sessionLabel}`, 14, 27);

    doc.text(`Correct Characters: ${r.symbols}`, pageWidth - 14, 27, {
      align: "right",
    });
  };

  // ✅ FOOTER
  const addFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(`${i}/${pageCount}`, pageWidth / 2, pageHeight - 10, {
        align: "center",
      });
    }
  };

  // ✅ PAGE CONTENT
  addHeader();

  doc.setFontSize(15);
  doc.setTextColor(40, 40, 40);
  doc.text("Typed Paragraph", 14, 44);

  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text(r.text || "No text available", 14, 54, {
    maxWidth: 180,
    lineHeightFactor: 1.6,
  });

  addFooter();

  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, "_blank");
};





  return (
    <Container>
      <Title>All Results</Title>

      {/* ----------------------------
          SESSION FILTER DROPDOWN
         ---------------------------- */}
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
      </SessionFilter>

      {/* ---------- Modal ---------- */}
      {showModal && (
        <ModalOverlay onClick={() => setShowModal(false)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Original Paragraph</ModalTitle>

            <ModalContent>{modalText}</ModalContent>

            <CloseButton onClick={() => setShowModal(false)}>Close</CloseButton>
          </ModalBox>
        </ModalOverlay>
      )}

      {/* ---------- Table ---------- */}
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
                <th>Student ID</th>
                <th>Paragraph</th>
                <th>WPM</th>
                <th>Accuracy</th>
                <th>Original Symbols</th>
                <th>Correct Symbols</th>
                <th>Time Taken</th>
                <th>Submitted At</th>
                <th>Typed Paragraph</th>
              </tr>
            </thead>

            <tbody>
              {results.map((r,index) => (
                <tr key={r._id}>
                  <td>{r.studentId}</td>

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
                  <td>{r.seconds} sec</td>
                  <td>{new Date(r.submittedAt).toLocaleString()}</td>

                  <td>
                    <DownloadButton onClick={() => generatePDF(r,index)}>
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

/* --------------------------------
   Styled Components
-------------------------------- */

const SessionFilter = styled.div`
  margin-bottom: 20px;
  display: flex;
  gap: 10px;

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

  &:hover {
    color: #1a33cc;
  }
`;

const DownloadButton = styled.button`
  background: #3b5bff;
  color: white;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    background: #1a33cc;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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

const ModalTitle = styled.h3`
  margin-top: 0;
`;

const ModalContent = styled.p`
  white-space: pre-wrap;
  font-size: 15px;
  line-height: 1.5;
`;

const CloseButton = styled.button`
  margin-top: 15px;
  padding: 10px 20px;
  background: #3b5bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    background: #1a33cc;
  }
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
  padding: 20px;
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
    font-size: 14px;
    font-weight: 600;
    color: #333;
    border-bottom: 2px solid #d0d7e2;
  }

  td {
    padding: 12px;
    border-bottom: 1px solid #ececec;
    font-size: 14px;
    color: #444;
  }

  tr:hover {
    background: #f9fafb;
  }
`;
