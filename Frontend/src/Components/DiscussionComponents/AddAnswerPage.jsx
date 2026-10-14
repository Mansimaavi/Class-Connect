import { Box, Button, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { getErrorMessage } from "../../lib/api";
import Navbar from "../Navbar";

export default function AddAnswerPage() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [answerText, setAnswerText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get(`/questions/${questionId}`)
      .then(({ data }) => setQuestion(data.question))
      .catch((err) => setError(getErrorMessage(err, "Couldn't load the question.")));
  }, [questionId]);

  const handleAddAnswer = async () => {
    if (!answerText.trim()) return;
    setSaving(true);
    try {
      await api.post(`/questions/${questionId}/answers`, { text: answerText.trim() });
      navigate(`/answers/${questionId}`);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <>
      <Navbar />
      <Box sx={{ maxWidth: 600, mx: "auto", mt: 4, p: 2 }}>
        <Typography variant="overline">Answering</Typography>
        <Typography variant="h5" gutterBottom>
          {question?.title || "…"}
        </Typography>
        {error && <Typography color="error">{error}</Typography>}
        <TextField
          fullWidth
          multiline
          rows={5}
          label="Your answer"
          variant="outlined"
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          placeholder="Explain it the way you'd want it explained to you…"
          inputProps={{ maxLength: 5000 }}
          sx={{ mb: 2, mt: 2 }}
        />
        <Button variant="contained" color="primary" onClick={handleAddAnswer} disabled={saving || !answerText.trim()}>
          {saving ? "Posting…" : "Submit answer"}
        </Button>
        <Button sx={{ ml: 2 }} onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </Box>
    </>
  );
}
