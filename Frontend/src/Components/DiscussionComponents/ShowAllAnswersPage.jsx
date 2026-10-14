import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import { Avatar, Button, Card, CardContent, CircularProgress, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { getErrorMessage } from "../../lib/api";
import { useAuth } from "../AuthComponents/AuthContext";
import Navbar from "../Navbar";

export default function ShowAllAnswersPage() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, isAdmin, user } = useAuth();
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get(`/questions/${questionId}`), api.get(`/questions/${questionId}/answers`)])
      .then(([q, a]) => {
        if (cancelled) return;
        setQuestion(q.data.question);
        setAnswers(a.data.answers);
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err, "An error occurred while fetching answers.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [questionId]);

  const react = async (answer, type) => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: `/answers/${questionId}` } });
      return;
    }
    try {
      const { data } = await api.post(`/answers/${answer._id}/reaction`, { type });
      setAnswers((current) =>
        current.map((a) => (a._id === answer._id ? { ...a, likes: data.likes, dislikes: data.dislikes, myReaction: data.myReaction } : a))
      );
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const remove = async (answer) => {
    if (!window.confirm("Delete this answer?")) return;
    try {
      await api.delete(`/answers/${answer._id}`);
      setAnswers((current) => current.filter((a) => a._id !== answer._id));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <>
      <Navbar />
      <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
        <Typography variant="overline">Question</Typography>
        <Typography variant="h5" gutterBottom>
          {question?.title || "…"}
        </Typography>

        {loading ? (
          <CircularProgress />
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : answers.length > 0 ? (
          answers.map((ans) => (
            <Card key={ans._id} style={{ marginBottom: "15px" }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2} style={{ marginBottom: "10px" }}>
                  <Avatar sx={{ bgcolor: "#7c3aed" }}>{(ans.author?.name || "?").charAt(0).toUpperCase()}</Avatar>
                  <div>
                    <Typography variant="subtitle1">{ans.author?.name || "Former member"}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {new Date(ans.createdAt).toLocaleString()}
                    </Typography>
                  </div>
                </Stack>
                <Typography variant="body1" paragraph style={{ whiteSpace: "pre-line" }}>
                  {ans.text}
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Button startIcon={<ThumbUpIcon />} color={ans.myReaction === "like" ? "primary" : "inherit"} onClick={() => react(ans, "like")}>
                    {ans.likes || 0}
                  </Button>
                  <Button startIcon={<ThumbDownIcon />} color={ans.myReaction === "dislike" ? "error" : "inherit"} onClick={() => react(ans, "dislike")}>
                    {ans.dislikes || 0}
                  </Button>
                  {(isAdmin || ans.author?._id === user?._id) && (
                    <Button color="error" onClick={() => remove(ans)}>
                      Delete
                    </Button>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))
        ) : (
          <Typography>No answers yet.</Typography>
        )}

        <Stack direction="row" spacing={2} style={{ marginTop: "20px" }}>
          <Button variant="contained" onClick={() => navigate(`/add-answer/${questionId}`)}>
            Add an answer
          </Button>
          <Button variant="outlined" color="secondary" onClick={() => navigate("/discussion")}>
            Back to discussions
          </Button>
        </Stack>
      </div>
    </>
  );
}
