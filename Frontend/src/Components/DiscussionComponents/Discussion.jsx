import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Avatar, Button, TextField } from "@mui/material";
import ReactTimeAgo from "react-time-ago";
import { FaUserCircle, FaQuestionCircle, FaClock } from "react-icons/fa";
import img from '../../assets/discussion-illustration.png'
import Navbar from "../Navbar";


function LastSeen({ date }) {
  return <ReactTimeAgo date={new Date(date)} locale="en-US" timeStyle="round" />;
}

export default function DiscussionBox() {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/questions?populate=answers");
        setQuestions(res.data);
      } catch (err) {
        console.error("Error fetching questions", err);
      }
    };

    fetchQuestions();
  }, []);

  const handlePostQuestion = async () => {
    if (!newQuestion.trim()) return;
    try {
      await axios.post("http://localhost:5000/api/questions", {
        questionName: newQuestion,
      });
      setNewQuestion("");
      window.location.reload();
    } catch (err) {
      console.error("Error posting question", err);
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
            >
              Post
            </Button>
          </div>
        </div>

        {/* Show questions */}
        <div>
          <h2 className="text-xl font-bold text-orange-600 mb-5 flex items-center gap-2">
            <FaQuestionCircle className="text-blue-500" />
            All Questions
          </h2>
          {questions.map((q, index) => (
            <div
              key={q._id}
              className="border-t border-gray-300 py-5 bg-white rounded-md shadow-sm px-4 mb-4"
            >
              <div className="flex flex-wrap justify-between items-center gap-y-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="text-base font-semibold mb-1 text-blue-900 flex items-center gap-2">
                    <FaQuestionCircle className="text-purple-500" />
                    {String(index + 1).padStart(2, "0")}. {q.questionName}
                  </div>
                </div>

                <div className="flex items-center gap-2 min-w-[150px]">
                  <Avatar
                    src={q.user?.avatar || "https://i.pravatar.cc/150?u=default"}
                    sx={{ width: 32, height: 32 }}
                  />
                  <span className="text-sm text-gray-800 flex items-center gap-1">
                    <FaUserCircle className="text-green-600" />
                    {q.user?.name || "Anonymous"}
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
                  View other answers
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  style={{ borderColor: "orange", color: "orange" }}
                  onClick={() => handleAddAnswer(q._id)}
                >
                  Add answer
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
