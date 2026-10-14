import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../Components/AuthComponents/AuthContext";
import Navbar from "../Components/Navbar";
import api, { getErrorMessage } from "../lib/api";

const SORTS = [
  { id: "recent", label: "Newest" },
  { id: "rating", label: "Top rated" },
  { id: "popular", label: "Most viewed" },
];

const Stars = ({ value, onRate, size = "text-xl", label }) => (
  <div className="flex gap-1" role="radiogroup" aria-label={label}>
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={onRate ? () => onRate(star) : undefined}
        disabled={!onRate}
        className={`${size} ${value >= star ? "text-yellow-500" : "text-gray-300"} disabled:cursor-default`}
        aria-label={`${star} star${star > 1 ? "s" : ""}`}
      >
        ★
      </button>
    ))}
  </div>
);

const ClassNotes = () => {
  const { isLoggedIn, user, isAdmin } = useAuth();
  const [notes, setNotes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState({ search: "", subject: "All", sort: "recent" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [upload, setUpload] = useState({ file: null, title: "", topic: "", subject: "" });
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);

  const [reviewFor, setReviewFor] = useState(null);
  const [review, setReview] = useState({ rating: 0, text: "" });
  const [showReviews, setShowReviews] = useState({});

  const fetchNotes = useCallback(async () => {
    try {
      const { data } = await api.get("/class-notes", {
        params: { search: filters.search || undefined, subject: filters.subject, sort: filters.sort, limit: 60 },
      });
      setNotes(data.notes);
      setSubjects(data.subjects);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load notes."));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(fetchNotes, 250); // debounce typing in the search box
    return () => clearTimeout(timer);
  }, [fetchNotes]);

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!upload.file || !upload.topic.trim()) return;
    const form = new FormData();
    form.append("file", upload.file);
    form.append("topic", upload.topic.trim());
    form.append("subject", upload.subject.trim() || "General");
    if (upload.title.trim()) form.append("title", upload.title.trim());

    setUploading(true);
    setUploadMessage(null);
    try {
      await api.post("/class-notes", form);
      setUpload({ file: null, title: "", topic: "", subject: "" });
      event.target.reset();
      setUploadMessage({ type: "success", text: "Note uploaded ✅" });
      fetchNotes();
    } catch (err) {
      setUploadMessage({ type: "error", text: getErrorMessage(err) });
    } finally {
      setUploading(false);
    }
  };

  const openNote = (note) => {
    window.open(note.url, "_blank", "noopener,noreferrer");
    api
      .post(`/class-notes/${note._id}/view`)
      .then(({ data }) => setNotes((current) => current.map((n) => (n._id === note._id ? { ...n, viewCount: data.viewCount } : n))))
      .catch(() => {});
  };

  const rate = async (note, rating) => {
    try {
      const { data } = await api.post(`/class-notes/${note._id}/rating`, { rating });
      setNotes((current) =>
        current.map((n) => (n._id === note._id ? { ...n, averageRating: data.averageRating, ratingCount: data.ratingCount, myRating: rating } : n))
      );
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  const submitReview = async () => {
    try {
      await api.post(`/class-notes/${reviewFor}/reviews`, { text: review.text.trim(), rating: review.rating || undefined });
      setReviewFor(null);
      setReview({ rating: 0, text: "" });
      fetchNotes();
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  const deleteNote = async (note) => {
    if (!window.confirm(`Delete "${note.title}"?`)) return;
    try {
      await api.delete(`/class-notes/${note._id}`);
      setNotes((current) => current.filter((n) => n._id !== note._id));
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  const inputClass = "rounded-md border border-gray-300 p-2 text-gray-700";

  return (
    <>
      <Navbar />
      <div className="relative min-h-screen bg-[#fef6f3] p-6">
        <h2 className="mb-2 text-center text-4xl font-bold text-[#222]">
          🎓 <span className="text-[#f26d4f]">Class Notes</span> Hub
        </h2>
        <p className="mb-8 text-center text-gray-600">Share handwritten notes and find the best ones from students everywhere.</p>

        {isLoggedIn ? (
          <form onSubmit={handleUpload} className="mx-auto mb-8 flex max-w-4xl flex-wrap items-center justify-center gap-3 rounded-xl bg-white p-4 shadow">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.ppt,.pptx,.doc,.docx"
              onChange={(e) => setUpload({ ...upload, file: e.target.files[0] || null })}
              className={`${inputClass} max-w-xs`}
              aria-label="Note file"
            />
            <input className={inputClass} placeholder="Topic (e.g. BFS & DFS)" value={upload.topic} maxLength={100} onChange={(e) => setUpload({ ...upload, topic: e.target.value })} />
            <input
              className={inputClass}
              placeholder="Subject (e.g. DSA)"
              list="note-subjects"
              value={upload.subject}
              maxLength={100}
              onChange={(e) => setUpload({ ...upload, subject: e.target.value })}
            />
            <datalist id="note-subjects">
              {subjects.map((subject) => (
                <option key={subject} value={subject} />
              ))}
            </datalist>
            <input className={inputClass} placeholder="Title (optional)" value={upload.title} maxLength={255} onChange={(e) => setUpload({ ...upload, title: e.target.value })} />
            <button
              type="submit"
              disabled={uploading || !upload.file || !upload.topic.trim()}
              className="rounded-md bg-[#f26d4f] px-6 py-2 font-bold text-white shadow-md transition hover:bg-[#e25539] disabled:bg-gray-400"
            >
              {uploading ? "Uploading…" : "Upload note"}
            </button>
            {uploadMessage && (
              <p className={`mb-0 w-full text-center text-sm ${uploadMessage.type === "error" ? "text-red-600" : "text-green-700"}`}>{uploadMessage.text}</p>
            )}
          </form>
        ) : (
          <p className="mb-8 text-center text-gray-600">
            <Link to="/login">Log in</Link> to share your notes and rate others.
          </p>
        )}

        <div className="mx-auto mb-8 flex max-w-4xl flex-wrap items-center justify-center gap-3">
          <input
            className={`${inputClass} min-w-[240px] flex-1`}
            placeholder="Search by title, topic or subject"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            aria-label="Search notes"
          />
          <select className={inputClass} value={filters.subject} onChange={(e) => setFilters({ ...filters, subject: e.target.value })} aria-label="Filter by subject">
            <option value="All">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
          <select className={inputClass} value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })} aria-label="Sort notes">
            {SORTS.map((sort) => (
              <option key={sort.id} value={sort.id}>
                {sort.label}
              </option>
            ))}
          </select>
        </div>

        <div className={`transition duration-300 ${reviewFor ? "blur-sm" : ""}`}>
          {loading ? (
            <p className="text-center text-gray-500">Loading notes…</p>
          ) : error ? (
            <p className="text-center text-red-600">{error}</p>
          ) : notes.length === 0 ? (
            <p className="text-center text-gray-500">No notes match yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
              {notes.map((note) => (
                <article key={note._id} className="flex flex-col justify-between rounded-2xl border border-gray-300 bg-white p-4 shadow-md transition hover:scale-[1.02]">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="inline-block rounded-full bg-[#8b5cf6] px-2 py-1 text-sm text-white">{note.subject}</span>
                      <span className="inline-block rounded-full bg-gray-100 px-2 py-1 text-sm text-gray-700">{note.topic}</span>
                    </div>
                    <h3 className="text-xl font-semibold">{note.title}</h3>
                    <p className="mb-0 text-sm text-gray-600">👤 {note.uploadedBy?.name || "Unknown"}</p>
                    <p className="text-sm text-gray-500">
                      🕒 {new Date(note.createdAt).toLocaleDateString()} · 👁 {note.viewCount} views
                    </p>
                    <button onClick={() => openNote(note)} className="mt-1 font-medium text-[#f26d4f] hover:underline">
                      📄 Open note
                    </button>
                  </div>

                  <div className="mt-4">
                    <p className="mb-1 text-sm text-gray-700">
                      ⭐ {note.ratingCount ? `${note.averageRating} average from ${note.ratingCount} rating${note.ratingCount === 1 ? "" : "s"}` : "No ratings yet"}
                    </p>
                    {isLoggedIn && <Stars value={note.myRating || 0} onRate={(star) => rate(note, star)} label={`Rate ${note.title}`} />}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t pt-2">
                    {isLoggedIn && (
                      <button type="button" onClick={() => setReviewFor(note._id)} className="text-sm font-semibold text-blue-600 underline">
                        ✍️ Write a review
                      </button>
                    )}
                    {note.reviews?.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowReviews((current) => ({ ...current, [note._id]: !current[note._id] }))}
                        className="text-sm font-medium text-green-700 hover:underline"
                      >
                        Reviews ({note.reviews.length}) {showReviews[note._id] ? "▲" : "▼"}
                      </button>
                    )}
                    {(isAdmin || note.uploadedBy?._id === user?._id) && (
                      <button type="button" onClick={() => deleteNote(note)} className="text-sm text-red-600 hover:underline">
                        Delete
                      </button>
                    )}
                  </div>

                  {showReviews[note._id] && (
                    <ul className="mt-2 max-h-36 list-disc space-y-2 overflow-y-auto pl-4 text-sm text-gray-700">
                      {note.reviews.map((r) => (
                        <li key={r._id}>
                          <strong className="text-[#f26d4f]">{r.user?.name || "Anonymous"}:</strong> {r.text}
                          <span className="block text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        {reviewFor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true">
            <div className="w-[90%] max-w-md rounded-xl bg-white p-6 shadow-2xl">
              <h3 className="mb-3 text-center text-lg font-bold text-[#f26d4f]">Write a review</h3>
              <div className="mb-2 flex justify-center">
                <Stars value={review.rating} onRate={(rating) => setReview({ ...review, rating })} size="text-2xl" label="Your rating" />
              </div>
              <textarea
                rows={3}
                placeholder="What did you like? What could be better?"
                className="w-full rounded-md border p-2 text-sm focus:outline-none focus:ring focus:ring-orange-300"
                value={review.text}
                maxLength={1000}
                onChange={(e) => setReview({ ...review, text: e.target.value })}
              />
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => setReviewFor(null)} className="w-1/2 rounded bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitReview}
                  disabled={!review.text.trim()}
                  className="w-1/2 rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Submit review
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ClassNotes;
