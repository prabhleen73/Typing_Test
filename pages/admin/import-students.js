import { useState } from "react";
import { useMutation, useQuery, useConvex } from "convex/react";
import styled from "styled-components";
import * as XLSX from "xlsx";
import { api } from "../../convex/_generated/api";
import Link from "next/link";



export default function ImportStudents() {
  const [file, setFile] = useState(null);
  const [selectedSession, setSelectedSession] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState([]);

  const sessions = useQuery(api.testSessions.getTestSessions);
  const createStudent = useMutation(api.student.createStudent);
  const convex = useConvex();
  /* ---------- DOWNLOAD TEMPLATE ---------- */

  const downloadTemplate = () => {

    const data = [
      {
        applicationNumber: "1001",
        name: "John Doe",
        dateOfBirth: "2000-01-01"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(workbook, "student_import_template.xlsx");

  };

  /* ---------- FILE SELECT ---------- */

  const handleFileSelect = (e) => {

  const selectedFile = e.target.files?.[0];
  if (!selectedFile) return;

  setFile(selectedFile);
  setPreviewData([]);
  setMessage("");
  setLoading(false);

};

  /* ---------- FILE UPLOAD ---------- */

  const handleUpload = async () => {

  if (loading) return; 

  setPreviewData([]);
  setMessage("");
  setLoading(true);

    if (!file) {
      setMessage("⚠ Please select an Excel file.");
      setLoading(false);
      return;
    }

    if (!selectedSession) {
      setMessage("⚠ Please select a session before uploading.");
      setLoading(false);
      return;
    }

    setMessage("⏳ Reading Excel file...");

    const reader = new FileReader();

    reader.onload = async (e) => {

      try {

        const data = new Uint8Array(e.target.result);

        const workbook = XLSX.read(data, { type: "array" });

        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const json = XLSX.utils.sheet_to_json(sheet, { raw: true });

        if (!json.length) {
          setMessage("⚠ Excel file is empty.");
          setLoading(false);
          return;
        }

        const rows = [];
        const seen = new Set();

        const applicationNumbers = json
          .map(r => r.applicationNumber?.toString().trim())
          .filter(Boolean);

        const existingStudents = await convex.query(
          api.student.getExistingStudents,
          { applicationNumbers }
        );

        const existingSet = new Set(existingStudents);

        for (const row of json) {

          const name = row.name?.toString().trim();
          const applicationNumber = row.applicationNumber?.toString().trim();

          let dobValue = row.dateOfBirth;
          let dateOfBirth = "";

          if (typeof dobValue === "number") {

            const excelEpoch = new Date(1899, 11, 30);

            const converted = new Date(
              excelEpoch.getTime() + dobValue * 86400000
            );

            const year = converted.getFullYear();
            const month = String(converted.getMonth() + 1).padStart(2, "0");
            const day = String(converted.getDate()).padStart(2, "0");

            dateOfBirth = `${year}-${month}-${day}`;
          }

          else if (typeof dobValue === "string") {

            const parsed = new Date(dobValue);

            if (!isNaN(parsed)) {

              const year = parsed.getFullYear();
              const month = String(parsed.getMonth() + 1).padStart(2, "0");
              const day = String(parsed.getDate()).padStart(2, "0");

              dateOfBirth = `${year}-${month}-${day}`;

            }

          }

          let status = "valid";

          const dobDate = new Date(dateOfBirth);
          const today = new Date();

          // Missing fields
          if (!name || !applicationNumber || !dateOfBirth) {
            status = "missing";
          }

          // Future DOB
          else if (dobDate > today) {
            status = "futureDob";
          }

          // Duplicate inside Excel
          else if (applicationNumber && seen.has(applicationNumber)) {
            status = "duplicate";
          }

          // Already exists in DB
          else if (existingSet.has(applicationNumber)) {
            status = "exists";
          }





          if (applicationNumber) {
            seen.add(applicationNumber);
          }

          rows.push({
            name,
            applicationNumber,
            dateOfBirth,
            status
          });

        }

        setPreviewData(rows);
        setMessage(`Preview loaded — ${rows.length} rows found`);
        setLoading(false);

      }

      catch (err) {

        console.error(err);
        setMessage("⚠ Failed to read Excel file.");
        setLoading(false);

      }

    };
    reader.onerror = () => {
  console.error("File read error");
  setMessage("⚠ Failed to read Excel file.");
  setLoading(false);
};

    reader.readAsArrayBuffer(file);

  };

  /* ---------- IMPORT ---------- */

  const confirmImport = async () => {

    if (!previewData.length) return;

    const sessionObj = sessions?.find((s) => s._id === selectedSession);

    let success = 0;
    let fail = 0;

    setLoading(true);

    for (const row of previewData) {

      if (row.status !== "valid") {
        fail++;
        continue;
      }

      try {

        const res = await createStudent({
          name: row.name,
          applicationNumber: row.applicationNumber,
          dob: row.dateOfBirth,
          sessionId: selectedSession,
          sessionName: sessionObj?.name ?? "",
        });

        if (res?.success) success++;
        else fail++;

      }

      catch {

        fail++;

      }

    }

    setPreviewData([]);
    setFile(null);
    setMessage(`✔ Import complete — ${success} added, ${fail} skipped`);
    setLoading(false);

  };

  const hasInvalidRows = previewData.some(
    (row) => row.status === "invalid"
  );

  const validRows = previewData.filter(r => r.status === "valid").length;
  const existingRows = previewData.filter(r => r.status === "exists").length;
  const duplicateRows = previewData.filter(r => r.status === "duplicate").length;
  const missingRows = previewData.filter(r => r.status === "missing").length;
  const futureDobRows = previewData.filter(r => r.status === "futureDob").length;

  return (
    <Wrapper>

      <Card>

        <BackBtn href="/admin">← Back to Dashboard</BackBtn>

        <Title>📥 Import Students</Title>

        <Subtitle>
          Excel must include: <b>applicationNumber, name, dateOfBirth</b>
        </Subtitle>

        <TemplateButton onClick={downloadTemplate}>
          Download Excel Template
        </TemplateButton>

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

        <UploadArea>

          <UploadLabel>Select Excel File</UploadLabel>

          <UploadInput
  type="file"
  accept=".xlsx,.xls"
  onChange={(e) => {
    handleFileSelect(e);
    e.target.value = null; 
  }}
/>

          {file && <FileName>📄 {file.name}</FileName>}

        </UploadArea>

        <UploadButton onClick={handleUpload} disabled={loading}>
          {loading ? "Processing Excel..." : "Preview Students"}
        </UploadButton>

        {message && <StatusMessage>{message}</StatusMessage>}

        {previewData.length > 0 && (

          <PreviewSection>

            <h3>Preview Students</h3>

            <SummaryBox>
              <p>✅ New Students: {validRows}</p>
              <p>🚫 Already Exists: {existingRows}</p>
              <p>⚠ Duplicate in Excel: {duplicateRows}</p>
              <p>❌ Missing Rows: {missingRows}</p>
              <p>⏳ Future DOB: {futureDobRows}</p>
            </SummaryBox>

            <PreviewTable>

              <thead>
                <tr>
                  <th>Application No</th>
                  <th>Name</th>
                  <th>Date Of Birth</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>

                {previewData.map((row, index) => (

                  <tr
                    key={index}
                    style={{
                      background:
                        row.status === "duplicate"
                          ? "#fff7ed"
                          : row.status === "invalid"
                            ? "#fee2e2"
                            : row.status === "exists"
                              ? "#fef3c7"
                              : "white"
                    }}
                  >

                    <td>{row.applicationNumber}</td>
                    <td>{row.name}</td>
                    <td>{row.dateOfBirth}</td>

                    <td>
                      {row.status === "valid" && "✅ Valid"}
                      {row.status === "duplicate" && "⚠ Duplicate"}
                      {row.status === "exists" && "🚫 Already Exists"}
                      {row.status === "missing" && "❌ Missing Data"}
                      {row.status === "futureDob" && "⏳ Future DOB"}
                    </td>

                  </tr>

                ))}

              </tbody>

            </PreviewTable>

            <ConfirmButton
              onClick={confirmImport}
              disabled={validRows === 0}
            >
              Import {validRows} New Students
            </ConfirmButton>

          </PreviewSection>

        )}

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

const TemplateButton = styled.button`
  background: #6366f1;
  color: white;
  border: none;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 20px;
  cursor: pointer;
  font-weight: 600;

  &:hover {
    background: #4f46e5;
  }
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
  margin-bottom: 20px;
  cursor: pointer;
`;

const StatusMessage = styled.p`
  margin-top: 20px;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
`;

const PreviewSection = styled.div`
  margin-top: 25px;
  max-height: 400px;
  overflow-y: auto;
`;


const PreviewTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;

  th, td {
    border: 1px solid #e2e8f0;
    padding: 8px;
    text-align: left;
  }

  th {
    background: #f1f5f9;
  }
`;

const ConfirmButton = styled.button`
  margin-top: 15px;
  background: #10b981;
  color: white;
  padding: 12px;
  border-radius: 10px;
  border: none;
  width: 100%;
  cursor: pointer;

  &:disabled {
    background: #cbd5e1;
    cursor: not-allowed;
  }
`;

const SummaryBox = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 15px;
  font-size: 14px;

  p {
    margin: 4px 0;
  }
`;
