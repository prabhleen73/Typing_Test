import { useState } from "react";
import styled from "styled-components";
import { api } from "../convex/_generated/api";
import { useMutation } from "convex/react";
import { validateParagraph } from "../utils/textValidator";

export default function UploadText() {
  const [fileText, setFileText] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const setParagraph = useMutation(api.paragraphs.setParagraph);

  //File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset UI
    setError("");
    setFileText("");

    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target.result;

      // Validate text content
      const result = validateParagraph(text);

      if (!result.valid) {
        setError("Invalid characters found: " + result.invalidChars.join(" "));
        setFileText("");
        // IMPORTANT: allow selecting the same file again
        e.target.value = null;
        return;
      }

      // VALID upload
      setFileText(text);
      setError("");

      // IMPORTANT: must also reset for valid files!
      e.target.value = null;
    };

    reader.readAsText(file);
  };

  //save to db
  const handleSave = async () => {
    if (!fileText.trim()) {
      setError("No valid text to save!");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      await setParagraph({ content: fileText });
      alert("Paragraph saved successfully!");

      // Clear UI after successful save
      setFileText("");
    } catch (err) {
      console.error("Save Error:", err);
      setError("Save failed! Try again.");
    }

    setIsSaving(false);
  };

  return (
    <Container>
      <Title>Upload Paragraph File</Title>

      <FileInput type="file" accept=".txt" onChange={handleFileUpload} />

      {/* Preview */}
      {fileText && (
        <PreviewBox>
          <h4>Extracted Text:</h4>
          <pre>{fileText}</pre>
        </PreviewBox>
      )}

      {/* Error Message */}
      {error && <Error>{error}</Error>}

      {/* Save Button */}
      <SaveButton onClick={handleSave} disabled={isSaving || !fileText}>
        {isSaving ? "Saving..." : "Save Paragraph"}
      </SaveButton>
    </Container>
  );
}


const Container = styled.div`
  min-height: 100vh;
  padding: 40px;
  background: #f6f8fc;
`;

const Title = styled.h2`
  margin-bottom: 20px;
  font-size: 24px;
  font-weight: 700;
`;

const FileInput = styled.input`
  margin-bottom: 20px;
`;

const PreviewBox = styled.div`
  background: #f1f1f1;
  padding: 20px;
  margin-top: 20px;
  border-radius: 8px;
  max-height: 300px;
  overflow: auto;
  border: 1px solid #ddd;
`;

const Error = styled.div`
  margin-top: 10px;
  color: #e11d48;
  font-weight: bold;
  font-size: 14px;
`;

const SaveButton = styled.button`
  margin-top: 20px;
  padding: 12px 20px;
  background: ${(props) => (props.disabled ? "#9bbcec" : "#0070f3")};
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  font-weight: 600;
  min-width: 150px;
`;
