import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import styled from "styled-components";

export default function ManageSessions() {
  const sessions = useQuery(api.testSessions.getTestSessions);
  const createSession = useMutation(api.testSessions.createTestSession);
  
  const [name, setName] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createSession({ name });
    setName("");
    alert("Session created successfully!");
  };

  return (
    <Container>
      <Title>Manage Test Sessions</Title>

      {/* Create new session */}
      <CreateBox>
        <h3>Create New Session</h3>

        <Input
          placeholder="Enter session name (e.g., Session 1)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Button onClick={handleCreate}>Create Session</Button>
      </CreateBox>

      {/* List sessions */}
      <SessionList>
        <h3>All Sessions</h3>

        {!sessions ? (
          <p>Loading...</p>
        ) : sessions.length === 0 ? (
          <p>No sessions yet. Create one above!</p>
        ) : (
          sessions.map((s) => (
            <SessionCard key={s._id}>
              <span>{s.name}</span>

              <a href={`/admin/results?session=${s._id}`}>
                <ButtonSmall>View Results</ButtonSmall>
              </a>
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
  font-weight: bold;
  margin-bottom: 25px;
`;

const CreateBox = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 30px;
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
  &:hover {
    background: #1a33cc;
  }
`;

const ButtonSmall = styled.button`
  padding: 8px 12px;
  background: #3b5bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    background: #1a33cc;
  }
`;

const SessionList = styled.div`
  margin-top: 20px;
`;

const SessionCard = styled.div`
  background: white;
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  border: 1px solid #ddd;

  font-size: 18px;
  font-weight: 500;
`;
