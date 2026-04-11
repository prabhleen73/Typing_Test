import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import styled from "styled-components";

export default function TestSettings() {

  const updateSettings = useMutation(api.settings.updateTestSettings);
  const updateTime = useMutation(api.timeSettings.updateTimeSetting);

  const sessions = useQuery(api.testSessions.getTestSessions);
  const timeSetting = useQuery(api.timeSettings.getTimeSetting);

  const [sessionId, setSessionId] = useState("");
  const [wpm, setWpm] = useState("");
  const [kdph, setKdph] = useState("");
  const [duration, setDuration] = useState(0);
  const [postName, setPostName] = useState("");
  const [examDate, setExamDate] = useState("");

  const settings = useQuery(
    api.settings.getTestSettings,
    sessionId ? { sessionId } : "skip"
  );

  /* Clear fields when session changes */
  useEffect(() => {
    setWpm("");
    setKdph("");
    setPostName("");
    setExamDate("");
  }, [sessionId]);

  /* Load session settings */
  useEffect(() => {
    if (settings) {
      setWpm(settings.qualifyingWpm?.toString() ?? "");
      setKdph(settings.qualifyingKdph?.toString() ?? "");
      setPostName(settings.postName ?? "");

      if (settings.examDate) {
        const date = new Date(settings.examDate);

        // convert to local date (fix UTC issue)
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());

        setExamDate(date.toISOString().slice(0, 10));
      } else {
        setExamDate("");
      }
    }

  }, [settings]);

  /* Load global duration */
  useEffect(() => {
    if (timeSetting) {
      setDuration(
        timeSetting.duration
          ? Math.round(timeSetting.duration / 60)
          : ""
      );
    }
  }, [timeSetting]);

  const handleSave = async () => {

    if (!sessionId) return alert("Select session");
    if (!wpm || Number(wpm) <= 0) return alert("Enter WPM");
    if (!kdph || Number(kdph) <= 0) return alert("Enter KDPH");
    if (!postName.trim()) return alert("Enter Post Name");
    if (!examDate) return alert("Select exam date");

    const selectedSession = sessions?.find((s) => s._id === sessionId);

    try {

      await updateSettings({
        sessionId,
        sessionName: selectedSession?.name || "",
        postName: postName.trim(),
        examDate: new Date(examDate + "T00:00:00").getTime(),
        qualifyingWpm: Number(wpm),
        qualifyingKdph: Number(kdph),
      });

      alert("Session settings saved!");

    } catch (err) {
      console.error(err);
      alert("Save failed");
    }
  };

  const handleSaveTime = async () => {

    if (!duration) return alert("Enter duration");

    try {

      await updateTime({
        duration: Number(duration)
      });

      alert("Test time updated!");

    } catch (err) {

      console.error(err);
      alert("Failed to update time");

    }
  };

  if (sessions === undefined) {
    return (
      <div style={{ textAlign: "center", marginTop: "40vh" }}>
        Loading sessions...
      </div>
    );
  }

  const isFormValid =
    sessionId &&
    Number(wpm) > 0 &&
    Number(kdph) > 0 &&
    postName.trim() &&
    examDate;

  const isTimeValid = duration && Number(duration) > 0;

  return (
    <Wrapper>

      <Grid>

        {/* LEFT CARD */}

        <Card>

          <Title>Session Settings</Title>

          <Field>

            <Label>Select Session</Label>

            <Select
              value={sessionId}
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
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={wpm}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*$/.test(val)) setWpm(val);
              }}
            />

          </Field>

          <Field>

            <Label>Qualifying KDPH</Label>

            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={kdph}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*$/.test(val)) setKdph(val);
              }}
            />

          </Field>

          <Field>

            <Label>Post Name</Label>

            <Input
              type="text"
              value={postName}
              onChange={(e) => setPostName(e.target.value)}
            />

          </Field>

          <Field>

            <Label>Exam Date</Label>

            <Input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
            />

          </Field>

          <Button
            disabled={!isFormValid}
            onClick={handleSave}
          >
            Save Session Settings
          </Button>

        </Card>


        {/* RIGHT CARD */}

        <Card>

          <Title>Test Duration</Title>

          <DurationBox>

            <Field>

              <Label>Duration (minutes)</Label>

              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />

            </Field>

            <Button
              disabled={!isTimeValid}
              onClick={handleSaveTime}
            >
              Save Test Time
            </Button>

          </DurationBox>

        </Card>

      </Grid>

    </Wrapper>
  );
}


/* UI */

const Wrapper = styled.div`
  min-height: 100vh;
  width: 100vw;
  background: #eef2f7;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 60px 20px;
  box-sizing: border-box;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 40px;
  width: 100%;
  max-width: 1100px;
`;

const Card = styled.div`
  background: white;
  padding: 28px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  height: fit-content;
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #222;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: #444;
`;

const Input = styled.input`
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #dcdcdc;
  font-size: 14px;
`;

const Select = styled.select`
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #dcdcdc;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #5f27cd;
  }
`;

const Button = styled.button`
  margin-top: 10px;
  padding: 12px;
  background: linear-gradient(135deg,#6c4cff,#5f27cd);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 12px rgba(0,0,0,0.1);
  }

  &:disabled {
    background: #cfcfcf;
    cursor: not-allowed;
  }
`;

const DurationBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 20px;
`;