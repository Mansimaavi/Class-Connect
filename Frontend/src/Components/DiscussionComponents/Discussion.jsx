import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Button, TextField } from "@mui/material";
import ReactTimeAgo from "react-time-ago";
import { FaUserCircle, FaQuestionCircle, FaClock } from "react-icons/fa";
import img from '../../assets/discussion-illustration.webp'
import Navbar from "../Navbar";
import { useAuth } from "../AuthComponents/AuthContext";
import api, { getErrorMessage } from "../../lib/api";


function LastSeen({ date }) {
  return <ReactTimeAgo date={new Date(date)} locale="en-US" timeStyle="round" />;
}

export default function DiscussionBox() {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);
  const navigate = useNavigate();
  const { isLoggedIn, user, isAdmin } = useAuth();

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/questions", { params: { search: search || undefined, limit: 50 } });
        setQuestions(data.questions);
        setError("");
      } catch (err) {
        setError(getErrorMessage(err, "Couldn't load questions."));
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handlePostQuestion = async () => {
    if (!newQuestion.trim()) return;
    if (!isLoggedIn) {
      navigate("/login", { state: { from: "/discussion" } });
      return;
    }
    setPosting(true);
    try {
      const { data } = await api.post("/questions", { title: newQuestion.trim() });
      setQuestions((current) => [data.question, ...current]);
      setNewQuestion("");
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (question) => {
    if (!window.confirm("Delete this question and its answers?")) return;
    try {
      await api.delete(`/questions/${question._id}`);
      setQuestions((current) => current.filter((q) => q._id !== question._id));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleViewAnswers = (questionId) => {
    navigate(`/answers/${questionId}`);
  };

  const handleAddAnswer = (questionId) => {
    navigate(`/add-answer/${questionId}`);
  };

  return (
    <>
      <Navbar className="fixed top-0 left-0 w-full z-50"/>
      <div
        className="max-w-[850px] mx-auto p-6 sm:p-8 font-segoe rounded-xl shadow-lg bg-gradient-to-br from-orange-100 via-blue-100 to-purple-100"
        style={{
          backgroundImage: "url('https://www.transparenttextures.com/patterns/white-wall-3.png')",
          backgroundRepeat: "repeat",
        }}
      >
        {/* Header Image */}
        <img
          src={img}
          alt="Discussion Banner"
          className="w-full h-40 object-cover rounded-lg mb-6 shadow"
        />

        {/* Add new question */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-purple-800 mb-4 flex items-center gap-2">
            <FaQuestionCircle className="text-orange-500" />
            Ask a New Question
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <TextField
              fullWidth
              label="Type your question..."
              variant="outlined"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              size="small"
              sx={{ backgroundColor: "#fff" }}
            />
            <Button
              variant="contained"
              style={{ backgroundColor: "darkgreen", color: "white" }}
              onClick={handlePostQuestion}
              disabled={posting || newQuestion.trim().length < 5}
            >
              {isLoggedIn ? "Post" : "Log in to post"}
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        {/* Show questions */}
        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="mb-0 flex items-center gap-2 text-xl font-bold text-orange-600">
              <FaQuestionCircle className="text-blue-500" />
              All Questions
            </h2>
            <TextField size="small" label="Search" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ backgroundColor: "#fff" }} />
          </div>
          {questions.length === 0 && <p className="text-gray-500">No questions yet. Ask the first one!</p>}
          {questions.map((q, index) => (
            <div
              key={q._id}
              className="border-t border-gray-300 py-5 bg-white rounded-md shadow-sm px-4 mb-4"
            >
              <div className="flex flex-wrap justify-between items-center gap-y-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="text-base font-semibold mb-1 text-blue-900 flex items-center gap-2">
                    <FaQuestionCircle className="text-purple-500" />
                    {String(index + 1).padStart(2, "0")}. {q.title}
                  </div>
                </div>

                <div className="flex items-center gap-2 min-w-[150px]">
                  <Avatar sx={{ width: 32, height: 32, bgcolor: "#f97316", fontSize: 14 }}>
                    {(q.author?.name || "?").charAt(0).toUpperCase()}
                  </Avatar>
                  <span className="text-sm text-gray-800 flex items-center gap-1">
                    <FaUserCircle className="text-green-600" />
                    {q.author?.name || "Former member"}
                  </span>
                </div>

                <div className="text-xs text-right text-gray-500 min-w-[100px] flex items-center gap-1">
                  <FaClock className="text-gray-400" />
                  <LastSeen date={q.createdAt} />
                </div>
              </div>

              <div className="flex gap-4 mt-4">
                <Button
                  variant="outlined"
                  size="small"
                  style={{ borderColor: "purple", color: "purple" }}
                  onClick={() => handleViewAnswers(q._id)}
                >
                  View answers ({q.answerCount || 0})
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  style={{ borderColor: "orange", color: "orange" }}
                  onClick={() => handleAddAnswer(q._id)}
                >
                  Add answer
                </Button>
                {(isAdmin || q.author?._id === user?._id) && (
                  <Button variant="text" size="small" color="error" onClick={() => handleDelete(q)}>
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
