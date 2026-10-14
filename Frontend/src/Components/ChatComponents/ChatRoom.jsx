import EmojiPicker from "emoji-picker-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaArrowLeft, FaEllipsisV, FaPaperPlane, FaPoll, FaSmile } from "react-icons/fa";
import { Link, useParams } from "react-router-dom";
import { useClassroomRoom, useSocketEvent } from "../../hooks/useSocket";
import api, { getErrorMessage } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { useAuth } from "../AuthComponents/AuthContext";

const byCreatedAt = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
const upsertById = (list, item) => [...list.filter((existing) => existing._id !== item._id), item].sort(byCreatedAt);
const TYPING_IDLE_MS = 2500;

const PollCard = ({ poll, currentUserId, canManage, onVote, onDelete }) => {
  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes.length, 0);
  const myOption = poll.options.findIndex((option) => option.votes.some((vote) => (vote._id || vote) === currentUserId));
  const isCreator = (poll.createdBy?._id || poll.createdBy) === currentUserId;

  return (
    <div className="w-full max-w-sm self-center rounded-xl bg-white p-4 shadow">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-purple-600">
        Poll · {poll.createdBy?.name}
        {poll.closed && " · closed"}
      </p>
      <p className="mb-3 font-bold">{poll.question}</p>
      {poll.options.map((option, index) => {
        const percentage = totalVotes ? Math.round((option.votes.length / totalVotes) * 100) : 0;
        return (
          <button
            key={index}
            type="button"
            disabled={poll.closed}
            onClick={() => onVote(poll, index)}
            title={option.votes.map((v) => v.name).join(", ") || "No votes yet"}
            className={`mb-2 block w-full rounded-lg border p-2 text-left disabled:cursor-not-allowed ${
              myOption === index ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <div className="flex justify-between text-sm">
              <span>{option.text}</span>
              <span className="text-gray-500">
                {option.votes.length} · {percentage}%
              </span>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-[#EEE5FF]">
              <div className="h-full rounded-full bg-[#90EE90] transition-all" style={{ width: `${percentage}%` }} />
            </div>
          </button>
        );
      })}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {totalVotes} vote{totalVotes === 1 ? "" : "s"}
          {myOption !== -1 && " · tap your choice again to remove your vote"}
        </span>
        {(isCreator || canManage) && (
          <button onClick={() => onDelete(poll)} className="text-red-500 hover:underline">
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

const ChatRoom = () => {
  const { classroomId } = useParams();
  const { user } = useAuth();
  const [classroom, setClassroom] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [polls, setPolls] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPollForm, setShowPollForm] = useState(false);
  const [newPoll, setNewPoll] = useState({ question: "", options: ["", ""] });
  const [typingUsers, setTypingUsers] = useState({});

  const bottomRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const typingTimeout = useRef(null);
  const isTyping = useRef(false);

  const { onlineUserIds } = useClassroomRoom(classroom ? classroomId : null);
  const online = useMemo(() => new Set(onlineUserIds), [onlineUserIds]);
  const can = (permission) => permissions.includes(permission);

  const timeline = useMemo(
    () => [...messages.map((m) => ({ ...m, kind: "message" })), ...polls.map((p) => ({ ...p, kind: "poll" }))].sort(byCreatedAt),
    [messages, polls]
  );

  const scrollToBottom = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [room, memberList, messageList, pollList] = await Promise.all([
          api.get(`/classrooms/${classroomId}`),
          api.get(`/classrooms/${classroomId}/members`),
          api.get(`/classrooms/${classroomId}/messages`, { params: { limit: 50 } }),
          api.get(`/classrooms/${classroomId}/polls`),
        ]);
        if (cancelled) return;
        setClassroom(room.data.classroom);
        setPermissions(room.data.permissions);
        setMembers(memberList.data.members);
        setMessages(messageList.data.messages);
        setHasMore(messageList.data.hasMore);
        setPolls(pollList.data.polls);
        scrollToBottom();
        api.post(`/classrooms/${classroomId}/messages/seen`).catch(() => {});
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "Couldn't open this chat."));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [classroomId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) setShowEmojiPicker(false);
    };
    const closeMenus = () => setMenuOpen(null);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("click", closeMenus);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("click", closeMenus);
    };
  }, []);

  // --- real-time updates ---------------------------------------------------
  const forThisRoom = (handler) => (payload) => payload?.classroomId === classroomId && handler(payload);

  useSocketEvent(
    "message:new",
    forThisRoom(({ message }) => {
      setMessages((current) => upsertById(current, message));
      scrollToBottom();
      if (message.sender?._id !== user?._id) api.post(`/classrooms/${classroomId}/messages/seen`).catch(() => {});
    })
  );
  useSocketEvent("message:updated", forThisRoom(({ message }) => setMessages((current) => upsertById(current, message))));
  useSocketEvent(
    "message:deleted",
    forThisRoom(({ messageIds }) => {
      const ids = new Set(messageIds.map(String));
      setMessages((current) => current.filter((m) => !ids.has(m._id)));
    })
  );
  useSocketEvent("poll:created", forThisRoom(({ poll }) => setPolls((current) => upsertById(current, poll))));
  useSocketEvent("poll:updated", forThisRoom(({ poll }) => setPolls((current) => upsertById(current, poll))));
  useSocketEvent("poll:deleted", forThisRoom(({ pollId }) => setPolls((current) => current.filter((p) => p._id !== pollId))));
  useSocketEvent(
    "typing",
    forThisRoom(({ userId, name, isTyping: typing }) => {
      setTypingUsers((current) => {
        const next = { ...current };
        if (typing) next[userId] = name;
        else delete next[userId];
        return next;
      });
    })
  );
  useSocketEvent("member:joined", forThisRoom(({ member }) => setMembers((current) => [...current.filter((m) => m._id !== member._id), member])));

  const stopTyping = useCallback(() => {
    if (!isTyping.current) return;
    isTyping.current = false;
    getSocket().emit("typing:stop", { classroomId });
  }, [classroomId]);

  useEffect(() => () => stopTyping(), [stopTyping]);

  const handleTyping = (value) => {
    setNewMessage(value);
    if (!isTyping.current && value.trim()) {
      isTyping.current = true;
      getSocket().emit("typing:start", { classroomId });
    }
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  // --- actions ---------------------------------------------------------------
  const sendMessage = async () => {
    const text = newMessage.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/classrooms/${classroomId}/messages`, { text });
      setMessages((current) => upsertById(current, data.message));
      setNewMessage("");
      stopTyping();
      scrollToBottom();
    } catch (err) {
      window.alert(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const saveEdit = async () => {
    if (!editing?.text.trim()) return;
    try {
      const { data } = await api.patch(`/classrooms/${classroomId}/messages/${editing._id}`, { text: editing.text.trim() });
      setMessages((current) => upsertById(current, data.message));
      setEditing(null);
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  const deleteMessage = async (message) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await api.delete(`/classrooms/${classroomId}/messages/${message._id}`);
      setMessages((current) => current.filter((m) => m._id !== message._id));
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  const loadOlder = async () => {
    if (!messages.length) return;
    setLoadingOlder(true);
    try {
      const { data } = await api.get(`/classrooms/${classroomId}/messages`, {
        params: { limit: 50, before: messages[0].createdAt },
      });
      setMessages((current) => [...data.messages, ...current]);
      setHasMore(data.hasMore);
    } catch (err) {
      window.alert(getErrorMessage(err));
    } finally {
      setLoadingOlder(false);
    }
  };

  const createPoll = async () => {
    try {
      const { data } = await api.post(`/classrooms/${classroomId}/polls`, {
        question: newPoll.question.trim(),
        options: newPoll.options.map((option) => option.trim()),
      });
      setPolls((current) => upsertById(current, data.poll));
      setNewPoll({ question: "", options: ["", ""] });
      setShowPollForm(false);
      scrollToBottom();
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  const votePoll = async (poll, optionIndex) => {
    try {
      const { data } = await api.post(`/classrooms/${classroomId}/polls/${poll._id}/vote`, { optionIndex });
      setPolls((current) => upsertById(current, data.poll));
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  const deletePoll = async (poll) => {
    if (!window.confirm("Delete this poll?")) return;
    try {
      await api.delete(`/classrooms/${classroomId}/polls/${poll._id}`);
      setPolls((current) => current.filter((p) => p._id !== poll._id));
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="text-red-600">{error}</p>
        <Link to="/dashboard">Back to my classrooms</Link>
      </div>
    );
  }

  const typingNames = Object.entries(typingUsers)
    .filter(([id]) => id !== user?._id)
    .map(([, name]) => name);

  return (
    <div className="flex h-screen bg-[#F3F2FF] font-sans">
      <aside className="hidden w-64 shrink-0 rounded-br-3xl rounded-tr-3xl bg-[#FEFBF0] p-6 shadow-md md:block">
        <Link to={`/classroom/${classroomId}`} className="mb-4 flex items-center gap-2 text-sm text-gray-600 no-underline hover:text-black">
          <FaArrowLeft /> Back to classroom
        </Link>
        <h2 className="mb-1 text-xl font-bold text-[#ff8c00]">{classroom?.name || "Group chat"}</h2>
        <p className="mb-6 text-sm text-gray-500">
          {onlineUserIds.length} of {members.length} online
        </p>
        <ul className="space-y-2 p-0 text-sm">
          {members.map((member) => (
            <li key={member._id} className="flex items-center gap-2 rounded-full bg-[#EEE5FF] px-3 py-2 font-medium">
              <span className={`h-2.5 w-2.5 rounded-full ${online.has(member._id) ? "bg-green-500" : "bg-gray-300"}`} />
              <span className="truncate">{member.name}</span>
              {member.role !== "student" && <span className="ml-auto text-xs capitalize text-purple-600">{member.role}</span>}
            </li>
          ))}
        </ul>
      </aside>

      <main className="relative flex flex-1 flex-col bg-[#F8F3E7] px-4 py-4 md:px-6">
        <div className="mb-2 flex items-center justify-between">
          <Link to={`/classroom/${classroomId}`} className="text-sm text-gray-600 no-underline md:hidden">
            <FaArrowLeft className="inline" /> Back
          </Link>
          <div className="ml-auto">
            {can("poll:create") && (
              <button
                onClick={() => setShowPollForm((open) => !open)}
                className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow hover:bg-gray-50"
              >
                <FaPoll /> New poll
              </button>
            )}
          </div>
        </div>

        {showPollForm && (
          <div className="mb-4 rounded-xl bg-white p-4 shadow">
            <input
              className="mb-2 w-full rounded border p-2"
              placeholder="Poll question"
              value={newPoll.question}
              maxLength={300}
              onChange={(e) => setNewPoll({ ...newPoll, question: e.target.value })}
            />
            {newPoll.options.map((option, index) => (
              <input
                key={index}
                className="mb-2 w-full rounded border p-2"
                placeholder={`Option ${index + 1}`}
                value={option}
                maxLength={200}
                onChange={(e) => {
                  const options = [...newPoll.options];
                  options[index] = e.target.value;
                  setNewPoll({ ...newPoll, options });
                }}
              />
            ))}
            {newPoll.options.length < 10 && (
              <button onClick={() => setNewPoll({ ...newPoll, options: [...newPoll.options, ""] })} className="text-sm text-blue-500">
                + Add option
              </button>
            )}
            <div className="mt-2 flex gap-2">
              <button
                onClick={createPoll}
                disabled={!newPoll.question.trim() || newPoll.options.filter((o) => o.trim()).length < 2}
                className="rounded bg-[#6C63FF] px-4 py-2 text-white disabled:opacity-50"
              >
                Create
              </button>
              <button onClick={() => setShowPollForm(false)} className="rounded bg-gray-300 px-4 py-2">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col space-y-3 overflow-y-auto pb-2">
          {hasMore && (
            <button onClick={loadOlder} disabled={loadingOlder} className="self-center rounded-full bg-white px-4 py-1 text-sm shadow">
              {loadingOlder ? "Loading…" : "Load older messages"}
            </button>
          )}
          {timeline.length === 0 && <p className="mt-10 text-center text-gray-500">No messages yet. Say hi 👋</p>}

          {timeline.map((item) => {
            if (item.kind === "poll") {
              return (
                <PollCard
                  key={item._id}
                  poll={item}
                  currentUserId={user?._id}
                  canManage={can("poll:manage")}
                  onVote={votePoll}
                  onDelete={deletePoll}
                />
              );
            }

            const mine = item.sender?._id === user?._id;
            const canDelete = mine || can("message:moderate");
            return (
              <div
                key={item._id}
                className={`relative flex min-h-[60px] w-fit min-w-[180px] max-w-[70%] flex-col rounded-xl px-3 py-2 shadow ${
                  mine ? "self-end bg-[orange]" : "self-start bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="whitespace-nowrap font-bold text-[#063D30]">{mine ? "You" : item.sender?.name || "Former member"}</span>
                  <span className="whitespace-nowrap text-xs text-gray-600">
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {item.editedAt && " · edited"}
                  </span>
                </div>

                {editing?._id === item._id ? (
                  <div className="mt-2 flex gap-2">
                    <input
                      autoFocus
                      value={editing.text}
                      maxLength={2000}
                      onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") setEditing(null);
                      }}
                      className="flex-1 rounded-lg border border-[#DDD] p-1"
                    />
                    <button onClick={saveEdit} className="text-sm font-semibold text-green-700">
                      Save
                    </button>
                  </div>
                ) : (
                  <p className="mb-0 mt-1 whitespace-pre-wrap break-words pr-5">{item.text}</p>
                )}

                {(mine || canDelete) && editing?._id !== item._id && (
                  <div className="absolute bottom-2 right-2">
                    <button
                      aria-label="Message options"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === item._id ? null : item._id);
                      }}
                    >
                      <FaEllipsisV className="text-[#063D30]" />
                    </button>
                    {menuOpen === item._id && (
                      <div className="absolute right-0 z-10 mt-1 w-[100px] rounded border border-gray-200 bg-white shadow">
                        {mine && (
                          <button
                            onClick={() => setEditing({ _id: item._id, text: item.text })}
                            className="block w-full px-4 py-2 text-left text-sm text-yellow-600 hover:bg-gray-100"
                          >
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => deleteMessage(item)} className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100">
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <p className="mb-1 h-5 text-sm italic text-gray-500" aria-live="polite">
          {typingNames.length === 1 && `${typingNames[0]} is typing…`}
          {typingNames.length === 2 && `${typingNames[0]} and ${typingNames[1]} are typing…`}
          {typingNames.length > 2 && "Several people are typing…"}
        </p>

        <div className="relative flex items-center rounded-lg border-t bg-white p-3 shadow-md">
          <button
            onClick={() => setShowEmojiPicker((open) => !open)}
            className="mr-3 rounded-full bg-[#EEE5FF] p-2 hover:bg-[#D6CCFF]"
            aria-label="Insert emoji"
          >
            <FaSmile size={22} className="text-[#ff6b00]" />
          </button>
          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="absolute bottom-16 left-4 z-10 rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
              <EmojiPicker onEmojiClick={(emoji) => handleTyping(newMessage + emoji.emoji)} />
            </div>
          )}
          <input
            type="text"
            placeholder={can("message:send") ? "Type a message…" : "Only members can send messages"}
            disabled={!can("message:send")}
            value={newMessage}
            maxLength={2000}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            className="mr-3 flex-1 rounded-xl border p-3 focus:outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="rounded-full bg-[#ff6b00] p-2 text-white hover:bg-[#e55b00] disabled:opacity-50"
            aria-label="Send message"
          >
            <FaPaperPlane size={20} />
          </button>
        </div>
      </main>
    </div>
  );
};

export default ChatRoom;
