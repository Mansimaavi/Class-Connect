import { useCallback, useEffect, useState } from "react";
import { FaThumbtack, FaTrash } from "react-icons/fa";
import ReactTimeAgo from "react-time-ago";
import { useSocketEvent } from "../../hooks/useSocket";
import api, { getErrorMessage } from "../../lib/api";
import { initials } from "../../lib/format";

const sortAnnouncements = (list) =>
  [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.createdAt) - new Date(a.createdAt));

const upsert = (list, item) => sortAnnouncements([item, ...list.filter((existing) => existing._id !== item._id)]);

const Avatar = ({ name }) => (
  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-white">
    {initials(name)}
  </span>
);

const AnnouncementComposer = ({ classroomId, onPosted }) => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setPosting(true);
    try {
      const { data } = await api.post(`/classrooms/${classroomId}/announcements`, {
        title: title.trim(),
        body: body.trim(),
        pinned,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });
      onPosted(data.announcement);
      setTitle("");
      setBody("");
      setPinned(false);
      setDueDate("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPosting(false);
    }
  };

  return (
    <form onSubmit={submit} className="mb-6 rounded-xl bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-lg font-semibold">Post an announcement</h3>
      {error && <p className="mb-2 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <input
        className="mb-2 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-orange-400"
        placeholder="Title"
        value={title}
        maxLength={150}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="mb-2 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-orange-400"
        placeholder="Share an update, assignment or reminder with the class…"
        rows={3}
        value={body}
        maxLength={5000}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to top
          </label>
          <label className="flex items-center gap-2">
            Due
            <input type="datetime-local" className="rounded border px-2 py-1" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
        </div>
        <button type="submit" disabled={posting || !title.trim() || !body.trim()} className="rounded-lg bg-orange-500 px-5 py-2 font-medium text-white disabled:opacity-60">
          {posting ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
};

const AnnouncementCard = ({ announcement, classroomId, can, currentUser, onChange, onRemove }) => {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const base = `/classrooms/${classroomId}/announcements/${announcement._id}`;
  const canManage = can("announcement:manage");

  const togglePin = async () => {
    try {
      const { data } = await api.patch(base, { pinned: !announcement.pinned });
      onChange(data.announcement);
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await api.delete(base);
      onRemove(announcement._id);
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post(`${base}/comments`, { text: comment.trim() });
      onChange({ ...announcement, comments: [...announcement.comments.filter((c) => c._id !== data.comment._id), data.comment] });
      setComment("");
    } catch (err) {
      window.alert(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const deleteComment = async (commentId) => {
    try {
      await api.delete(`${base}/comments/${commentId}`);
      onChange({ ...announcement, comments: announcement.comments.filter((c) => c._id !== commentId) });
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  return (
    <article className={`rounded-xl bg-white p-5 shadow-sm ${announcement.pinned ? "border-l-4 border-orange-500" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={announcement.author?.name} />
          <div>
            <p className="mb-0 font-semibold">{announcement.author?.name || "Former member"}</p>
            <p className="mb-0 text-xs text-gray-500">
              <ReactTimeAgo date={new Date(announcement.createdAt)} locale="en-US" />
              {announcement.editedAt && " · edited"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-gray-500">
          {announcement.pinned && <span className="text-xs font-semibold text-orange-600">Pinned</span>}
          {canManage && (
            <>
              <button onClick={togglePin} title={announcement.pinned ? "Unpin" : "Pin"} aria-label={announcement.pinned ? "Unpin" : "Pin"} className="hover:text-orange-600">
                <FaThumbtack />
              </button>
              <button onClick={remove} title="Delete" aria-label="Delete announcement" className="hover:text-red-600">
                <FaTrash />
              </button>
            </>
          )}
        </div>
      </div>

      <h3 className="mb-1 mt-3 text-lg font-bold">{announcement.title}</h3>
      <p className="mb-2 whitespace-pre-line text-gray-700">{announcement.body}</p>
      {announcement.dueDate && (
        <p className="mb-2 inline-block rounded bg-yellow-100 px-2 py-0.5 text-sm text-yellow-800">
          Due {new Date(announcement.dueDate).toLocaleString()}
        </p>
      )}

      <div className="mt-3 border-t pt-3">
        {announcement.comments.map((c) => (
          <div key={c._id} className="mb-2 flex items-start justify-between gap-2 text-sm">
            <p className="mb-0">
              <span className="font-semibold">{c.author?.name || "Former member"}</span> {c.text}
            </p>
            {(canManage || c.author?._id === currentUser?._id) && (
              <button onClick={() => deleteComment(c._id)} className="text-xs text-gray-400 hover:text-red-600" aria-label="Delete comment">
                Delete
              </button>
            )}
          </div>
        ))}
        {can("announcement:comment") && (
          <form onSubmit={addComment} className="mt-2 flex gap-2">
            <input
              className="flex-1 rounded-full border px-4 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="Add a class comment…"
              value={comment}
              maxLength={1000}
              onChange={(e) => setComment(e.target.value)}
            />
            <button type="submit" disabled={busy || !comment.trim()} className="text-sm font-semibold text-orange-600 disabled:opacity-40">
              Post
            </button>
          </form>
        )}
      </div>
    </article>
  );
};

const AnnouncementsPanel = ({ classroomId, can, currentUser }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (pageToLoad = 1) => {
      try {
        const { data } = await api.get(`/classrooms/${classroomId}/announcements`, { params: { page: pageToLoad, limit: 10 } });
        setAnnouncements((current) => sortAnnouncements(pageToLoad === 1 ? data.announcements : [...current, ...data.announcements]));
        setPage(data.pagination.page);
        setPages(data.pagination.pages);
        setError("");
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [classroomId]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const replace = (announcement) => setAnnouncements((current) => upsert(current, announcement));
  const remove = (id) => setAnnouncements((current) => current.filter((a) => a._id !== id));

  useSocketEvent("announcement:created", ({ classroomId: id, announcement }) => id === classroomId && replace(announcement));
  useSocketEvent("announcement:updated", ({ classroomId: id, announcement }) => id === classroomId && replace(announcement));
  useSocketEvent("announcement:deleted", ({ classroomId: id, announcementId }) => id === classroomId && remove(announcementId));
  useSocketEvent("announcement:comment-added", ({ classroomId: id, announcementId, comment }) => {
    if (id !== classroomId) return;
    setAnnouncements((current) =>
      current.map((a) =>
        a._id === announcementId ? { ...a, comments: [...a.comments.filter((c) => c._id !== comment._id), comment] } : a
      )
    );
  });
  useSocketEvent("announcement:comment-deleted", ({ classroomId: id, announcementId, commentId }) => {
    if (id !== classroomId) return;
    setAnnouncements((current) =>
      current.map((a) => (a._id === announcementId ? { ...a, comments: a.comments.filter((c) => c._id !== commentId) } : a))
    );
  });

  return (
    <section className="mx-auto max-w-3xl">
      {can("announcement:create") && <AnnouncementComposer classroomId={classroomId} onPosted={replace} />}
      {loading ? (
        <p className="text-gray-500">Loading announcements…</p>
      ) : error ? (
        <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>
      ) : announcements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          No announcements yet.{can("announcement:create") ? " Post the first one above." : " Your teacher's updates will appear here."}
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement._id}
              announcement={announcement}
              classroomId={classroomId}
              can={can}
              currentUser={currentUser}
              onChange={replace}
              onRemove={remove}
            />
          ))}
          {page < pages && (
            <button onClick={() => load(page + 1)} className="w-full rounded-lg border bg-white py-2 text-sm hover:bg-gray-50">
              Load older announcements
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export default AnnouncementsPanel;
