import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import styled from "styled-components";
import { useState } from "react";

export default function Results() {
  const results = useQuery(api.results.getAllResults);
  const [modalText, setModalText] = useState("");
  const [showModal, setShowModal] = useState(false);

  const openModal = (text) => {
    setModalText(text);
    setShowModal(true);
  };

  return (
    <Container>
      <Title>All Results</Title>

      {/* Modal */}
      {showModal && (
        <ModalOverlay onClick={() => setShowModal(false)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Original Paragraph</ModalTitle>

            <ModalContent>{modalText}</ModalContent>

            <CloseButton onClick={() => setShowModal(false)}>Close</CloseButton>
          </ModalBox>
        </ModalOverlay>
      )}

      {/* Table */}
      {!results ? (
        <Loading>Loading results...</Loading>
      ) : results.length === 0 ? (
        <Empty>No results found.</Empty>
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
                <th>Typed Text</th>
              </tr>
            </thead>

            <tbody>
              {results.map((r) => (
                <tr key={r._id}>
                  <td>{r.studentId}</td>

                  <td>
                    <ParagraphButton onClick={() => openModal(r.paragraphContent)}>
                      View Paragraph
                    </ParagraphButton>
                  </td>

                  <td>{r.wpm}</td>
                  <td>{r.accuracy}%</td>
                  <td>{r.originalSymbols}</td>
                  <td>{r.symbols}</td>

                  <td>{r.seconds} sec</td>

                  <td>{new Date(r.submittedAt).toLocaleString()}</td>

                  <td className="textCell">{r.text}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      )}
    </Container>
  );
}


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

  .textCell {
    max-width: 300px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;
