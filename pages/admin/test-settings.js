import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import styled from "styled-components";

export default function TestSettings() {
  const updateSettings = useMutation(api.settings.updateTestSettings);
  const updateTime = useMutation(api.timeSettings.updateTimeSetting);

  const sessions = useQuery(api.testSessions.getTestSessions);
  const timeSetting = useQuery(api.timeSettings.getTimeSetting);

  const [sessionId, setSessionId] = useState(null);
  const [wpm, setWpm] = useState(30);
  const [kdph, setKdph] = useState(9000);
  const [duration, setDuration] = useState(60);

  // Auto select first session
  useEffect(() => {
    if (sessions && sessions.length > 0) {
      setSessionId(sessions[0]._id);
    }
  }, [sessions]);

  const settings = useQuery(
    api.settings.getTestSettings,
    sessionId ? { sessionId } : "skip"
  );

  // Load saved session settings
  useEffect(() => {
    if (settings) {
      setWpm(settings.qualifyingWpm || 30);
      setKdph(settings.qualifyingKdph || 9000);
    }
  }, [settings]);

  // Load global time
  useEffect(() => {
    if (timeSetting) {
      setDuration(timeSetting.duration || 60);
    }
  }, [timeSetting]);

  const handleSave = async () => {
    if (!sessionId) {
      alert("Please select a session.");
      return;
    }

    const selectedSession = sessions.find((s) => s._id === sessionId);

    try {
      await updateSettings({
        sessionId,
        sessionName: selectedSession?.name || "",
        qualifyingWpm: Number(wpm),
        qualifyingKdph: Number(kdph),
      });

      alert("Session settings saved!");
    } catch (err) {
      console.error(err);
      alert("Failed to save session settings.");
    }
  };

  const handleSaveTime = async () => {
    try {
      await updateTime({
        duration: Number(duration),
      });

      alert("Test time updated!");
    } catch (err) {
      console.error(err);
      alert("Failed to update time.");
    }
  };

  if (!sessions) {
    return (
      <div style={{ textAlign: "center", marginTop: "40vh" }}>
        Loading sessions...
      </div>
    );
  }

  return (
    <Wrapper>
      <Card>
        <Title>Typing Test Settings</Title>

        <Field>
          <Label>Select Session</Label>
          <Select
            value={sessionId || ""}
            onChange={(e) => setSessionId(e.target.value)}
          >
            <option value="">Select Session</option>

            {sessions.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field>
          <Label>Qualifying WPM</Label>
          <Input
            type="number"
            value={wpm}
            onChange={(e) => setWpm(e.target.value)}
          />
        </Field>

        <Field>
          <Label>Qualifying KDPH</Label>
          <Input
            type="number"
            value={kdph}
            onChange={(e) => setKdph(e.target.value)}
          />
        </Field>

        <Button onClick={handleSave}>Save Session Settings</Button>

        <Divider />

        <Field>
          <Label> Test Duration (minutes)</Label>
          <Input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </Field>

        <Button onClick={handleSaveTime}>Save Test Time</Button>
      </Card>
    </Wrapper>
  );
}

/* ---------------- UI ---------------- */

const Wrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: #eef2f7;
`;

const Card = styled.div`
  background: white;
  padding: 40px;
  border-radius: 12px;
  width: 420px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  text-align: center;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-weight: 600;
`;

const Input = styled.input`
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #ccc;
`;

const Select = styled.select`
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #ccc;
`;

const Button = styled.button`
  padding: 12px;
  background: #5f27cd;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
`;

const Divider = styled.hr`
  margin: 10px 0;
  border: none;
  border-top: 1px solid #ddd;
`;