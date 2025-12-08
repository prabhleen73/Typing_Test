import { useState } from "react";
import styled from "styled-components";
import Papa from "papaparse";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";

export default function ImportStudents() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const createStudent = useMutation(api.student.createStudent);

  const handleFileSelect = (e) => {
    setFile(e.target.files[0]);
    setMessage("");
  };

  const handleUpload = () => {
    if (!file) {
      setMessage("⚠ Please select a CSV file first.");
      return;
    }

    setLoading(true);
    setMessage("⏳ Reading CSV...");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data }) => {
        let success = 0;
        let fail = 0;

        for (const row of data) {
          try {
            const name = row.name?.trim();
            const applicationNumber = row.applicationNumber?.trim();
            const dob = row.dob?.trim();

            if (!name || !applicationNumber || !dob) {
              fail++;
              continue;
            }

            const res = await createStudent({
              name,
              applicationNumber,
              dob,
            });

            if (res.success) success++;
            else fail++;
          } catch (err) {
            console.error(err);
            fail++;
          }
        }

        setMessage(`✔ Upload complete — ${success} added, ${fail} skipped`);
        setLoading(false);
      },
    });
  };

  return (
    <Wrapper>
      <Card>
        <BackBtn href="/admin">← Back to Dashboard</BackBtn>

        <Title>📥 Import Students</Title>
        <Subtitle>Upload a CSV file containing: <b>name, applicationNumber, dob</b></Subtitle>

        <UploadArea>
          <UploadLabel>Select CSV File</UploadLabel>
          <UploadInput type="file" accept=".csv" onChange={handleFileSelect} />

          {file && <FileName>📄 {file.name}</FileName>}
        </UploadArea>

        <UploadButton onClick={handleUpload} disabled={loading}>
          {loading ? "Uploading..." : "Upload Students"}
        </UploadButton>

        {message && <StatusMessage>{message}</StatusMessage>}
      </Card>
    </Wrapper>
  );
}

/* ---------- Styled Components ---------- */

const Wrapper = styled.div`
  min-height: 100vh;
  background: #f1f5f9;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
`;

const Card = styled.div`
  background: white;
  width: 100%;
  max-width: 520px;
  padding: 40px;
  border-radius: 18px;
  box-shadow: 0 10px 35px rgba(0,0,0,0.12);
  animation: fadeIn 0.3s ease;
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const BackBtn = styled(Link)`
  font-size: 15px;
  text-decoration: none;
  color: #3b82f6;
  margin-bottom: 10px;
  display: inline-block;

  &:hover { text-decoration: underline; }
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin: 10px 0;
  text-align: center;
  color: #111827;
`;

const Subtitle = styled.p`
  text-align: center;
  color: #6b7280;
  margin-bottom: 30px;
  font-size: 15px;
`;

const UploadArea = styled.div`
  border: 2px dashed #cbd5e1;
  padding: 25px;
  border-radius: 12px;
  background: #f8fafc;
  text-align: center;
  margin-bottom: 25px;
`;

const UploadLabel = styled.label`
  display: block;
  font-weight: 600;
  margin-bottom: 12px;
  color: #374151;
`;

const UploadInput = styled.input`
  font-size: 16px;
  cursor: pointer;
`;

const FileName = styled.div`
  margin-top: 12px;
  font-size: 15px;
  color: #475569;
`;

const UploadButton = styled.button`
  background: #3b82f6;
  color: white;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 17px;
  width: 100%;
  border: none;
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    background: #2563eb;
  }

  &:disabled {
    background: #93c5fd;
    cursor: not-allowed;
  }
`;

const StatusMessage = styled.p`
  margin-top: 20px;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
`;
