import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import styled from "styled-components";
import { useRouter } from "next/router";

export default function ManageSessions() {
  const router = useRouter();

  const sessions = useQuery(api.testSessions.getTestSessions);
  const createSession = useMutation(api.testSessions.createTestSession);

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {

    const trimmedName = name.trim();

    if (!trimmedName) {
      alert("Please enter a session name.");
      return;
    }

    /* Prevent duplicate session names on UI side */
    const normalize = (str) => str.toLowerCase().replace(/\s+/g, "");

if (sessions?.some((s) => normalize(s.name) === normalize(trimmedName))) {
  alert("Session with this name already exists.");
  return;
}

    try {

      setCreating(true);

      await createSession({ name: trimmedName });

      setName("");
      alert("Session created successfully!");

    } catch (err) {

      console.error(err);
      alert(err.message || "Failed to create session.");

    } finally {

      setCreating(false);

    }
  };

  const handleConfigure = (sessionId) => {
    router.push(`/admin/test-settings?session=${sessionId}`);
  };

  return (
    <Container>

      <Title>Manage Test Sessions</Title>

      <CreateBox>

        <h3>Create New Session</h3>

        <Input
          placeholder="Enter session name (e.g., Session 1)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Button onClick={handleCreate} disabled={creating}>
          {creating ? "Creating..." : "Create Session"}
        </Button>

      </CreateBox>

      <SessionList>

        <h3>All Sessions</h3>

        {!sessions ? (
          <p>Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <p>No sessions yet.</p>
        ) : (
          sessions.map((s) => (
            <SessionCard key={s._id}>

              <span>{s.name}</span>

              <ButtonSmall onClick={() => handleConfigure(s._id)}>
                Configure Test
              </ButtonSmall>

            </SessionCard>
          ))
        )}

      </SessionList>

    </Container>
  );
}

/* Styled Components */

const Container = styled.div`
  padding: 40px;
  background: #f6f8fc;
  min-height: 100vh;
`;

const Title = styled.h2`
  font-size: 28px;
  margin-bottom: 20px;
`;

const CreateBox = styled.div`
  background: white;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 25px;
  border: 1px solid #ddd;
`;

const Input = styled.input`
  padding: 10px;
  width: 60%;
  border-radius: 6px;
  border: 1px solid #ccc;
  margin-right: 10px;
`;

const Button = styled.button`
  padding: 10px 16px;
  background: #3b5bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
`;

const ButtonSmall = styled.button`
  padding: 6px 10px;
  background: #3b5bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
`;

const SessionList = styled.div`
  margin-top: 20px;
`;

const SessionCard = styled.div`
  background: white;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  border: 1px solid #ddd;
`;