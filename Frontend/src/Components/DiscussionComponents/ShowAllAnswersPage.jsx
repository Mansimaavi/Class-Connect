
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import axios from "axios";

import {
  Typography,
  Card,
  CardContent,
  Stack,
  Avatar,
  Button,
  CircularProgress,
} from "@mui/material";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";

export default function ShowAllAnswersPage() {
  const { questionId } = useParams(); // Get questionId from URL
  const navigate = useNavigate();
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const defaultAvatar = "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp";

  useEffect(() => {
    const fetchAnswers = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/answers/${questionId}`);
        setAnswers(res.data);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          setAnswers([]);
        } else {
          console.error("Error fetching answers", err);
          setError("An error occurred while fetching answers.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAnswers();
  }, [questionId]);

  const handleLike = async (id) => {
    try {
      await axios.post(`http://localhost:5000/api/answers/${id}/like`);
      setAnswers((prev) =>
        prev.map((a) => (a._id === id ? { ...a, likes: a.likes + 1 } : a))
      );
    } catch (err) {
      console.error("Error liking answer", err);
    }
  };

  const handleDislike = async (id) => {
    try {
      await axios.post(`http://localhost:5000/api/answers/${id}/dislike`);
      setAnswers((prev) =>
        prev.map((a) => (a._id === id ? { ...a, dislikes: a.dislikes + 1 } : a))
      );
    } catch (err) {
      console.error("Error disliking answer", err);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <Typography variant="h5" gutterBottom>
        All Answers for this Question
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : answers.length > 0 ? (
        answers.map((ans) => (
          <Card key={ans._id} style={{ marginBottom: "15px" }}>
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                spacing={2}
                style={{ marginBottom: "10px" }}
              >
                <Avatar src={ans.user?.photo || defaultAvatar} />
                <div>
                  <Typography variant="subtitle1">
                    {ans.user?.name || "Anonymous"}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {new Date(ans.createdAt).toLocaleString()}
                  </Typography>
                </div>
              </Stack>
              <Typography variant="body1" paragraph>
                {ans.text}
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button
                  startIcon={<ThumbUpIcon />}
                  onClick={() => handleLike(ans._id)}
                >
                  {ans.likes || 0}
                </Button>
                <Button
                  startIcon={<ThumbDownIcon />}
                  onClick={() => handleDislike(ans._id)}
                >
                  {ans.dislikes || 0}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ))
      ) : (
        <Typography>No answers yet.</Typography>
      )}

      <Button
        variant="outlined"
        color="secondary"
        onClick={() => navigate("/discussion")}
        style={{ marginTop: "20px" }}
      >
        Back to Discussions
      </Button>
    </div>
  );
}
