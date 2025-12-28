import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import Navbar from "../Components/Navbar";

const ClassNotes = () => {
  const reviewRefs = useRef({});
  const [showReviewInput, setShowReviewInput] = useState({});
  const [notes, setNotes] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [reviewState, setReviewState] = useState({});
  const [showReviews, setShowReviews] = useState({});

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const updated = { ...showReviewInput };
      let changed = false;

      Object.entries(reviewRefs.current).forEach(([pdfId, ref]) => {
        if (ref && !ref.contains(event.target)) {
          updated[pdfId] = false;
          changed = true;
        }
      });

      if (changed) setShowReviewInput(updated);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showReviewInput]);

  const fetchNotes = async () => {
    try {
      const { data } = await axios.get("http://localhost:5000/api/class-notes");
      setNotes(data);
    } catch (err) {
      console.error("Error fetching class notes:", err);
    }
  };

  const getToken = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.token || localStorage.getItem("token") || "";
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file to upload.");

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user._id) return alert("User not logged in.");

    const folderId = "65e75f9e2b1a4c3f947ea1b7";
    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("folderId", folderId);
    formData.append("uploadedBy", user._id);
    formData.append("topic", "Math Notes");

    try {
      setUploading(true);
      await axios.post(
        `http://localhost:5000/api/class-notes/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      alert("File uploaded ✅");
      setFile(null);
      document.getElementById("fileInput").value = "";
      fetchNotes();
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRating = async (pdfId, rating) => {
    const token = getToken();
    if (!token) return alert("Please log in to rate.");

    try {
      setReviewState((prev) => ({
        ...prev,
        [pdfId]: { ...prev[pdfId], rating },
      }));

      await axios.post(
        "http://localhost:5000/api/class-notes/rate",
        { pdfId, rating },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchNotes();
    } catch (err) {
      console.error("Rating failed:", err);
      alert("Failed to submit rating.");
    }
  };

  const handleSubmitReview = async (pdfId) => {
    const token = getToken();
    const { rating, review } = reviewState[pdfId] || {};
    if (!rating || !review?.trim()) {
      return alert("Please rate and write a review.");
    }

    const note = notes.find((n) => n._id === pdfId);
    const folderId = note?.folderId;

    try {
      await axios.post(
        "http://localhost:5000/api/class-notes/reviews/submit-review",
        { pdfId, rating, review, folderId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Review submitted ✅");
      setReviewState((prev) => {
        const updated = { ...prev };
        delete updated[pdfId];
        return updated;
      });
      setShowReviewInput((prev) => ({ ...prev, [pdfId]: false }));
      fetchNotes();
    } catch (err) {
      console.error("Review submit error:", err);
      alert("Review submission failed.");
    }
  };

  const isAnyReviewOpen = Object.values(showReviewInput).some(Boolean);

  return (
    <>
    <Navbar className="fixed top-0 left-0 w-full z-50"/>
    <div className="min-h-screen bg-[#fef6f3] p-6 relative">
      <h2 className="text-4xl font-bold text-[#222] text-center mb-10">
        🎓 <span className="text-[#f26d4f]">Class Notes</span> Hub
      </h2>

      {/* Upload Section */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
        <input
          id="fileInput"
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="block w-full max-w-sm border border-gray-300 rounded-md p-2 text-gray-700"
        />
        <button
          onClick={handleUpload}
          disabled={uploading}
          className={`px-6 py-2 text-white font-bold rounded-md transition duration-300 shadow-md ${
            uploading ? "bg-gray-400" : "bg-[#f26d4f] hover:bg-[#e25539]"
          }`}
        >
          {uploading ? "Uploading..." : "Upload Note"}
        </button>
      </div>

      {/* Overlay Blur */}
      <div className={`transition duration-300 ${isAnyReviewOpen ? "blur-sm" : ""}`}>
        {notes.length === 0 ? (
          <p className="text-gray-500 text-center">No notes available yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {notes.map((note) => (
              <article
                key={note._id}
                className="bg-white border border-gray-300 rounded-2xl shadow-md p-4 flex flex-col justify-between h-[380px] hover:scale-105 transition"
              >
                <div>
                  <span className="text-sm px-2 py-1 bg-[#8b5cf6] text-white rounded-full mb-2 inline-block">
                    PDF Note
                  </span>
                  <h3 className="text-xl font-semibold">{note.name}</h3>
                  <p className="text-gray-600 text-sm">👤 {note.uploadedBy?.name || "Unknown"}</p>
                  <p className="text-gray-500 text-sm">
                    🕒 {new Date(note.createdAt).toLocaleString()}
                  </p>
                  <a
                    href={`http://localhost:5000${note.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#f26d4f] hover:underline mt-2 inline-block font-medium"
                  >
                    📄 View PDF
                  </a>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-700 mb-1">
                    ⭐ Avg Rating: {note.averageRating || "N/A"}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">👥 Rated by {note.ratingCount || 0} users</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRating(note._id, star)}
                        className={`text-xl ${
                          (reviewState[note._id]?.rating || 0) >= star
                            ? "text-yellow-500"
                            : "text-gray-300"
                        }`}
                        aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 border-t pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReviewInput((prev) => ({
                        ...prev,
                        [note._id]: true,
                      }));
                    }}
                    className="text-sm font-semibold text-blue-600 underline flex items-center gap-1"
                  >
                    ✍️ Write a Review
                  </button>

                  {note.reviews?.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowReviews((prev) => ({
                          ...prev,
                          [note._id]: !prev[note._id],
                        }));
                      }}
                      className="text-sm font-medium text-green-700 flex items-center gap-1 hover:underline"
                      aria-label={showReviews[note._id] ? "Hide Reviews" : "Show Reviews"}
                      title={showReviews[note._id] ? "Hide Reviews" : "Show Reviews"}
                    >
                      Reviews {showReviews[note._id] ? "▲" : "▼"}
                    </button>
                  )}
                </div>

                {showReviews[note._id] && (
                  <ul className="pl-4 list-disc text-sm text-gray-700 space-y-2 mt-2 max-h-36 overflow-y-auto">
                    {note.reviews.map((r, idx) => (
                      <li key={idx}>
                        <strong className="text-[#f26d4f]">{r.user?.name || "Anonymous"}:</strong>{" "}
                        {r.review}
                        <span className="block text-xs text-gray-500">
                          ({new Date(r.createdAt).toLocaleString()})
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {Object.entries(showReviewInput).map(([pdfId, isOpen]) => {
        if (!isOpen) return null;
        return (
          <div
            key={pdfId}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm"
          >
            <div
              ref={(el) => (reviewRefs.current[pdfId] = el)}
              className="bg-white p-6 rounded-xl shadow-2xl w-[90%] max-w-md z-50"
            >
              <h3 className="text-lg font-bold mb-3 text-center text-[#f26d4f]">Write a Review</h3>
              <div className="flex justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      setReviewState((prev) => ({
                        ...prev,
                        [pdfId]: { ...prev[pdfId], rating: s },
                      }))
                    }
                    className={`text-2xl ${
                      (reviewState[pdfId]?.rating || 0) >= s ? "text-yellow-500" : "text-gray-300"
                    }`}
                    aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                placeholder="Your review..."
                className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring focus:ring-orange-300"
                value={reviewState[pdfId]?.review || ""}
                onChange={(e) =>
                  setReviewState((prev) => ({
                    ...prev,
                    [pdfId]: { ...prev[pdfId], review: e.target.value },
                  }))
                }
              />
              <button
                type="button"
                onClick={() => handleSubmitReview(pdfId)}
                className="mt-4 w-full bg-green-600 text-white text-sm px-4 py-2 rounded hover:bg-green-700"
              >
                Submit Review
              </button>
            </div>
          </div>
        );
      })}
    </div>
    </>
  );
};

export default ClassNotes;
