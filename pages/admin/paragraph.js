import { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { validateParagraph } from "../../utils/textValidator";

export default function ParagraphsPage() {
  const [adminRole, setAdminRole] = useState(null);
  const [adminToken, setAdminToken] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [fileStatus, setFileStatus] = useState("No file selected");

  const fileInputRef = useRef(null);

  const sessions = useQuery(api.testSessions.getTestSessions);
  const [selectedSession, setSelectedSession] = useState("");

  const paragraph = useQuery(
    api.paragraphs.getParagraph,
    selectedSession ? { sessionId: selectedSession } : "skip"
  );

  const addParagraph = useMutation(api.paragraphs.addParagraph);

  const [fileText, setFileText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);

    const role = sessionStorage.getItem("adminRole");
    const token = sessionStorage.getItem("adminToken");

    setAdminRole(role);
    setAdminToken(token);
  }, []);

  // Upload File
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setFileStatus("No file selected");
      return;
    }

    setError("");

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;

      const result = validateParagraph(text);

      if (!result.valid) {
        setError(
          "Invalid characters found: " + result.invalidChars.join(" ")
        );
        setFileText("");
        setFileStatus("Invalid characters detected");
        return;
      }

      setFileText(text);
      setFileStatus(`${file.name} — No error found. Ready to upload`);
    };

    reader.readAsText(file);
  };

  // Save Paragraph
  const handleSave = async () => {
    if (!adminToken) {
      setError("Session expired. Please login again.");
      return;
    }

    if (!selectedSession) {
      setError("Please select a session.");
      return;
    }

    if (!fileText.trim()) {
      setError("Please upload a valid paragraph file first.");
      return;
    }

    try {
      await addParagraph({
        content: fileText.trim(),
        sessionId: selectedSession,
        token: adminToken,
      });

      setFileText("");
      setFileStatus("No file selected");
      setError("");
      alert("Paragraph saved successfully.");
    } catch (err) {
      setError(err.message || "Failed to save paragraph.");
    }
  };

  if (!mounted) return null;

  return (
    <Wrapper>
      <Card>
        <Title>Manage Paragraphs</Title>

        <InputBox>
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

          <label>Upload .txt file:</label>

          <input
            type="file"
            accept=".txt"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />

          <UploadBtn onClick={() => fileInputRef.current.click()}>
            Select Paragraph File
          </UploadBtn>

          <FileStatus>{fileStatus}</FileStatus>

          {error && <Error>{error}</Error>}

          {adminRole === "super_admin" && (
            <SaveBtn
              onClick={handleSave}
              disabled={!fileText || !selectedSession}
            >
              Save Paragraph
            </SaveBtn>
          )}

          {adminRole === "admin" &&
            (paragraph ? (
              <LockedText>
                Paragraph already uploaded for this session.
                Contact Super Admin to modify.
              </LockedText>
            ) : (
              <SaveBtn
                onClick={handleSave}
                disabled={!fileText || !selectedSession}
              >
                Save Paragraph
              </SaveBtn>
            ))}

          {adminRole !== "super_admin" &&
            adminRole !== "admin" && (
              <LockedText>
                You have view-only access.
              </LockedText>
            )}
        </InputBox>
      </Card>
    </Wrapper>
  );
}

/* ================= UI Styles ================= */

const Wrapper = styled.div`
  padding: 40px;
  background: #f5f7fa;
  min-height: 100vh;
`;

const Card = styled.div`
  background: white;
  max-width: 900px;
  margin: auto;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 8px 16px rgba(0,0,0,0.08);
`;

const Title = styled.h2`
  margin-bottom: 20px;
`;

const InputBox = styled.div`
  margin-bottom: 40px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Error = styled.div`
  color: red;
`;

const LockedText = styled.p`
  color: red;
  margin-top: 10px;
`;

const SaveBtn = styled.button`
  padding: 6px 12px;
  font-size: 13px;
  background: ${({ disabled }) =>
    disabled ? "#9bbcec" : "#007bff"};
  color: white;
  border-radius: 6px;
  cursor: ${({ disabled }) =>
    disabled ? "not-allowed" : "pointer"};
  width: fit-content;
`;
const UploadBtn = styled.button`
  padding: 6px 12px;
  font-size: 13px;
  background: #444;
  color: white;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  width: fit-content;

  &:hover {
    background: #333;
  }
`;

const FileStatus = styled.div`
  font-size: 14px;
  color: #444;
`;