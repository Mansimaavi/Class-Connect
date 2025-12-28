import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, TextField, Typography, Box } from "@mui/material";

export default function AddAnswerPage() {
  const { questionId } = useParams();
  const [answerText, setAnswerText] = useState("");
  const navigate = useNavigate();

  const handleAddAnswer = async () => {
  if (!answerText.trim()) return;

  try {
    const response = await fetch("http://localhost:5000/api/answers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: answerText,
        questionId,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to submit answer");
    }

    navigate("/discussion");
  } catch (err) {
    console.error("Error adding answer:", err);
  }
};

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", mt: 4, p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Add Your Answer
      </Typography>
      <TextField
        fullWidth
        multiline
        rows={4}
        label="Your Answer"
        variant="outlined"
        value={answerText}
        onChange={(e) => setAnswerText(e.target.value)}
        placeholder="Write your answer here..."
        sx={{ mb: 2 }}
      />
      <Button variant="contained" color="primary" onClick={handleAddAnswer}>
        Submit Answer
      </Button>
    </Box>
    
  );
}
