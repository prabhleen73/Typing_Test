import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import styled from "styled-components";
import { useState } from "react";
import { jsPDF } from "jspdf";

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

  // ✅ SINGLE STUDENT PDF
  const generatePDF = (r) => {
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const sessionLabel = r.sessionName || "N/A";
  const studentName = r.name || "N/A";
  const submittedTime = new Date(r.submittedAt).toLocaleString();

  // ✅ HEADER
  doc.setFillColor(240, 245, 255);
  doc.rect(0, 0, pageWidth, 30, "F");

  doc.setFontSize(15);
  doc.text("Typing Test Report", pageWidth / 2, 12, { align: "center" });

  doc.setFontSize(11);
  doc.text(`Student ID: ${r.studentId}`, 14, 20);
  doc.text(`Name: ${studentName}`, pageWidth / 2, 20, { align: "center" });
  doc.text(`Time: ${r.seconds} sec`, pageWidth - 14, 20, { align: "right" });

  doc.setFontSize(10);
  doc.text(`Session: ${sessionLabel}`, 14, 27);
  doc.text(`WPM: ${r.wpm}`, pageWidth / 2, 27, { align: "center" });
  doc.text(`Correct Characters: ${r.symbols}`, pageWidth - 14, 27, {
    align: "right",
  });

  // ✅ CONTENT
  doc.setFontSize(15);
  doc.text("Typed Paragraph", 14, 44);

  doc.setFontSize(12);
  doc.text(r.text || "No text available", 14, 54, {
    maxWidth: 180,
    lineHeightFactor: 1.6,
  });

  // ✅ FOOTER WITH PERFECT PAGE FORMAT (1/2, 2/2)
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);

    // ✅ Left → Submitted time
    doc.text(`Submitted: ${submittedTime}`, 14, pageHeight - 10);

    // ✅ Right → Page number EXACT format: 1/2
    doc.text(`${i}/${pageCount}`, pageWidth - 14, pageHeight - 10, {
      align: "right",
    });
  }

  // ✅ OPEN PDF
  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, "_blank");
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

    [...results]
      .sort((a, b) => b.wpm - a.wpm)
      .forEach((r, index) => {
        if (index !== 0) doc.addPage();

        const sessionLabel = r.sessionName || "N/A";
        const studentName = r.name || "N/A";

        doc.setFillColor(240, 245, 255);
        doc.rect(0, 0, pageWidth, 30, "F");

        doc.setFontSize(15);
        doc.text("Typing Test Report", pageWidth / 2, 12, {
          align: "center",
        });

        doc.setFontSize(11);
        doc.text(`Student ID: ${r.studentId}`, 14, 20);
        doc.text(`Name: ${studentName}`, pageWidth / 2, 20, {
          align: "center",
        });
        doc.text(`Time: ${r.seconds} sec`, pageWidth - 14, 20, {
          align: "right",
        });

        doc.setFontSize(10);
        doc.text(`Session: ${sessionLabel}`, 14, 27);
        doc.text(`WPM: ${r.wpm}`, pageWidth / 2, 27, {
          align: "center",
        });
        doc.text(`Correct Characters: ${r.symbols}`, pageWidth - 14, 27, {
          align: "right",
        });

        doc.setFontSize(15);
        doc.text("Typed Paragraph", 14, 44);

        doc.setFontSize(12);
        doc.text(r.text || "No text available", 14, 54, {
          maxWidth: 180,
          lineHeightFactor: 1.6,
        });

        doc.setFontSize(10);
        doc.text(
          `${index + 1}/${results.length}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
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
                    <td>{r.seconds} sec</td>
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
