import { useState } from "react";
import styled from "styled-components";
import Papa from "papaparse";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";

export default function ImportStudents() {
  const [file, setFile] = useState(null);
  const [selectedSession, setSelectedSession] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch sessions
  const sessions = useQuery(api.testSessions.getTestSessions);

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

    if (!selectedSession) {
      setMessage("⚠ Please select a session before uploading.");
      return;
    }

    const sessionObj = sessions?.find((s) => s._id === selectedSession);

    setLoading(true);
    setMessage("⏳ Reading CSV...");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data }) => {
        let success = 0;
        let fail = 0;

        for (const row of data) {
          console.log("Row data:", row);  // Debugging line to check each row

          try {
            const name = row.name?.trim();
            const applicationNumber = row.applicationNumber?.trim();
            const dateOfBirth = row.dateOfBirth?.trim(); // Use 'dateOfBirth' instead of 'dob'

            // Log the parsed data to check
            console.log("Parsed fields:", { name, applicationNumber, dateOfBirth });

            // Check for missing fields
            if (!name || !applicationNumber || !dateOfBirth) {
              console.log("Skipping row due to missing data:", { name, applicationNumber, dateOfBirth });
              fail++;
              continue;
            }

            // Create student record
            const res = await createStudent({
              name,
              applicationNumber,
              dob: dateOfBirth, // Send 'dateOfBirth' as 'dob' in the mutation
              sessionId: selectedSession,
              sessionName: sessionObj?.name ?? "",
            });

            if (res.success) {
              success++;
            } else {
              console.log("Error in creating student:", res); // Log error response from mutation
              fail++;
            }

          } catch (err) {
            console.error("Error in row processing:", err); // Log any error during row processing
            fail++;
          }
        }

        // Display success/failure message
        setMessage(`✔ Upload complete — ${success} added, ${fail} skipped`);
        setLoading(false);
      },

      // Handle CSV parsing error
      error: (error) => {
        console.error("Error parsing CSV:", error.message);
        setMessage("⚠ Error parsing CSV file.");
        setLoading(false);
      }
    });
  };

  return (
    <Wrapper>
      <Card>
        <BackBtn href="/admin">← Back to Dashboard</BackBtn>

        <Title>📥 Import Students</Title>
        <Subtitle>CSV must include: <b>applicationNumber, name, dateOfBirth</b></Subtitle>

        {/* SESSION DROPDOWN */}
        <DropdownWrapper>
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
        </DropdownWrapper>

        {/* FILE UPLOAD */}
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
`;

const BackBtn = styled(Link)`
  font-size: 15px;
  text-decoration: none;
  color: #3b82f6;
  margin-bottom: 10px;
  display: inline-block;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  text-align: center;
`;

const Subtitle = styled.p`
  text-align: center;
  color: #6b7280;
  margin-bottom: 25px;
`;

const DropdownWrapper = styled.div`
  margin-bottom: 20px;

  select {
    width: 100%;
    padding: 10px;
    border-radius: 10px;
    border: 1px solid #cbd5e1;
  }
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
  font-weight: 600;
  margin-bottom: 12px;
  display: block;
`;

const UploadInput = styled.input`
  font-size: 16px;
`;

const FileName = styled.div`
  margin-top: 12px;
  font-size: 15px;
  color: #475569;
`;

const UploadButton = styled.button`
  background: #3b82f6;
  color: white;
  padding: 12px;
  border-radius: 10px;
  width: 100%;
  font-size: 17px;
  border: none;
  cursor: pointer;
`;

const StatusMessage = styled.p`
  margin-top: 20px;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
`;
