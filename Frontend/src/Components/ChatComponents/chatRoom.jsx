// imports (same as before)
import React, { useState, useEffect, useRef } from "react";
import {
  FaPaperPlane, FaEye, FaSmile, FaEdit, FaTrash, FaEllipsisV
} from "react-icons/fa";
import axios from "axios";
import io from "socket.io-client";
import { useParams } from "react-router-dom";
import EmojiPicker from "emoji-picker-react";
import { jwtDecode } from "jwt-decode";


const socket = io("http://localhost:5000");

const ChatRoom = () => {
  const { folderId } = useParams();
  const [items, setItems] = useState([]); // holds both messages and polls
  const [newMessage, setNewMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const [editingMessage, setEditingMessage] = useState(null);
const [menuOpen, setMenuOpen] = useState(null); // for 3-dot menu

  const [showPollForm, setShowPollForm] = useState(false);
  const [newPoll, setNewPoll] = useState({ question: "", options: ["", ""] });
  const [showDropdown, setShowDropdown] = useState(false);
  const [folderUsers, setFolderUsers] = useState([]);

  const emojiPickerRef = useRef(null);
  const dropdownRef = useRef(null);

  const fetchAll = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const [msgRes, pollRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/chat/messages/${folderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`http://localhost:5000/api/chat/polls/${folderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const messages = msgRes.data.map((m) => ({ ...m, type: "message" }));
      const polls = pollRes.data.map((p) => ({ ...p, type: "poll" }));
      const combined = [...messages, ...polls].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
      setItems(combined);
    } catch (err) {
      console.error("Error fetching chat data:", err);
    }
  };

  const fetchFolderUsers = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await axios.get(`http://localhost:5000/api/folders/${folderId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFolderUsers(res.data);
    } catch (err) {
      console.error("Error fetching folder users:", err);
    }
  };

  useEffect(() => {
    fetchAll();
    fetchFolderUsers();

    socket.emit("join_room", { roomId: folderId, userId: "User123" });

    socket.on("message", (message) => {
      if (message.folderId === folderId) {
        setItems((prev) =>
          [...prev, { ...message, type: "message" }].sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          )
        );
      }
    });

    socket.on("message_edited", (updatedMessage) => {
      setItems((prev) =>
        prev.map((item) =>
          item.type === "message" && item._id === updatedMessage._id
            ? { ...item, text: updatedMessage.text }
            : item
        )
      );
    });

    return () => {
      socket.off("message");
      socket.off("message_edited");
    };
  }, [folderId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const message = {
      sender: { _id: "You", name: "You" },
      text: newMessage,
      folderId,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await axios.post(
        `http://localhost:5000/api/chat/messages/${folderId}`,
        message,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const newMsg = { ...res.data, type: "message" };
      setItems((prev) => [...prev, newMsg].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
      socket.emit("send_message", { chatRoom: folderId, sender: "You", text: newMessage });
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const createPoll = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.post(`http://localhost:5000/api/chat/polls/${folderId}`, newPoll, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const newPollData = { ...res.data, type: "poll" };
      setItems((prev) => [...prev, newPollData].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
      setNewPoll({ question: "", options: ["", ""] });
      setShowPollForm(false);
    } catch (err) {
      console.error("Error creating poll:", err);
    }
  };

 // Make sure this is imported at the top

const votePoll = async (pollId, optionIndex, items, setItems) => {
  const token = localStorage.getItem("token");
  if (!token) return alert("Login required");

  let userId = null;
  try {
    const decoded = jwtDecode(token);
    userId = decoded.id || decoded._id || decoded.userId;
  } catch (err) {
    console.error("Failed to decode token", err);
    return;
  }

  const poll = items.find((item) => item._id === pollId);
  if (!poll) return;

  const currentOptionIndex = poll.options.findIndex(opt =>
    opt.votes.some(vote => (vote._id || vote).toString() === userId.toString())
  );

  try {
    if (currentOptionIndex === optionIndex) {
      // Clicked the same option – unvote
      await axios.post(
        `http://localhost:5000/api/chat/polls/unvote/${pollId}`,
        { optionIndex },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } else {
      // If voted before on another option, unvote it
      if (currentOptionIndex !== -1) {
        await axios.post(
          `http://localhost:5000/api/chat/polls/unvote/${pollId}`,
          { optionIndex: currentOptionIndex },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      // Vote for the new option
      await axios.post(
        `http://localhost:5000/api/chat/polls/vote/${pollId}`,
        { optionIndex },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }

    // Refetch updated poll
    const updatedPoll = await axios.get(
      `http://localhost:5000/api/chat/polls/${pollId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const newPoll = { ...updatedPoll.data, type: "poll" };
   

    setItems((prev) =>
       prev.map(item => item._id === pollId ? newPoll : item));
  } catch (err) {
    console.error("Error voting:", err.response?.data || err.message);
  }
   const safePoll = {
  ...updatedPoll.data,
  type: "poll",
  options: updatedPoll.data.options.map(opt => ({
    text: opt.text || "", // fallback to empty string
    votes: Array.isArray(opt.votes) ? opt.votes : [] // fallback to empty array
  }))
};
setItems((prev) =>
  prev.map((item) => (item._id === pollId ? safePoll : item))
);

};



const deletePoll = async (pollId, items, setItems) => {
  const token = localStorage.getItem("token");
  if (!token) return alert("Login required");

  try {
    await axios.delete(`http://localhost:5000/api/chat/polls/${pollId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setItems((prev) => prev.filter((i) => i._id !== pollId));
  } catch (err) {
    console.error("Error deleting poll:", err);
  }
};

  return (
    <div className="flex h-screen bg-[#F3F2FF] font-sans">
      {/* Sidebar */}
      <div className="w-2/12 bg-[#FEFBF0] p-6 shadow-md rounded-tr-3xl rounded-br-3xl">
        <h2 className="text-xl font-bold text-[#ff8c00] mb-6">Group Chat</h2>
        <ul className="space-y-2 text-sm">
          {folderUsers.length > 0 ? folderUsers.map((user) => (
            <li key={user._id} className="bg-[#EEE5FF] px-3 py-2 rounded-full font-medium hover:bg-[#D6CCFF]">
              {user.name}
            </li>
          )) : <li className="text-gray-500">No users joined yet.</li>}
        </ul>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col px-6 py-4 relative bg-[#F8F3E7]">
        <div className="absolute right-6 top-6 z-50" ref={dropdownRef}>
          <button onClick={() => setShowDropdown(!showDropdown)} className="p-2 rounded hover:bg-gray-200">
            <FaEllipsisV />
          </button>
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow-lg">
              <button onClick={() => { setShowPollForm(true); setShowDropdown(false); }} className="block w-full px-4 py-2 hover:bg-gray-100 text-left">Create Poll</button>
            </div>
          )}
        </div>

        {/* Poll Form */}
        {showPollForm && (
          <div className="bg-white p-4 rounded-xl shadow mb-4">
            <input className="w-full p-2 border mb-2 rounded" placeholder="Poll question"
              value={newPoll.question}
              onChange={(e) => setNewPoll({ ...newPoll, question: e.target.value })}
            />
            {newPoll.options.map((opt, idx) => (
              <input key={idx} className="w-full p-2 border mb-2 rounded"
                placeholder={`Option ${idx + 1}`}
                value={opt}
                onChange={(e) => {
                  const options = [...newPoll.options];
                  options[idx] = e.target.value;
                  setNewPoll({ ...newPoll, options });
                }}
              />
            ))}
            <button onClick={() => setNewPoll({ ...newPoll, options: [...newPoll.options, ""] })} className="text-sm text-blue-500">+ Add Option</button>
            <div className="mt-2 flex gap-2">
              <button onClick={createPoll} className="bg-[#6C63FF] text-white px-4 py-2 rounded">Create</button>
              <button onClick={() => setShowPollForm(false)} className="bg-gray-300 px-4 py-2 rounded">Cancel</button>
            </div>
          </div>
        )}

        {/* Combined Messages & Polls */}
        <div className="flex-1 overflow-y-auto space-y-4">
         

{items.map((item) => (
  item.type === "message" ? (
    <div
      key={item._id}
      className="relative w-1/4 min-h-[60px] flex flex-col justify-between px-2 py-2 rounded-xl bg-[orange] shadow"
    >
      <div className="flex items-start justify-between">
        <div className="font-bold text-[#063D30] mr-4 whitespace-nowrap">
          {item.sender?.name || "Unknown"}
        </div>
        <div className="text-xs text-gray-500 whitespace-nowrap">
          {new Date(item.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      <div className="flex-1 mt-2 break-words">
        {editingMessage?._id === item._id ? (
          <input
            type="text"
            value={editingMessage.text}
            onChange={(e) =>
              setEditingMessage({ ...editingMessage, text: e.target.value })
            }
            className="w-full p-1 border border-[#DDD] rounded-lg"
          />
        ) : (
          <div>{item.text}</div>
        )}
      </div>

      {/* Three-dot menu */}
      <div className="absolute bottom-2 right-2">
        <div className="relative">
          <button onClick={() => setMenuOpen(item._id)}>
            <FaEllipsisV className="text-[#063D30]" />
          </button>

          {menuOpen === item._id && (
            <div className="absolute right-0 mt-1 w-[100px] bg-white border border-gray-200 rounded shadow z-10">
              {editingMessage?._id === item._id ? (
                <button
                  onClick={async () => {
                    const token = localStorage.getItem("token");
                    if (!token) return;
                    const res = await axios.put(
                      `http://localhost:5000/api/chat/messages/${item._id}`,
                      { text: editingMessage.text },
                      { headers: { Authorization: `Bearer ${token}` } }
                    );
                    setItems((prev) =>
                      prev.map((m) =>
                        m._id === item._id ? { ...m, text: res.data.text } : m
                      )
                    );
                    setEditingMessage(null);
                    socket.emit("edit_message", { folderId, message: res.data });
                    setMenuOpen(null);
                  }}
                  className="block w-full text-left px-4 py-2 text-green-600 hover:bg-gray-100 text-sm"
                >
                  Save
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditingMessage({ ...item });
                    setMenuOpen(null);
                  }}
                  className="block w-full text-left px-4 py-2 text-yellow-600 hover:bg-gray-100 text-sm"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => {
                  if (window.confirm("Delete message?")) {
                    const token = localStorage.getItem("token");
                    axios.delete(
                      `http://localhost:5000/api/chat/messages/${item._id}`,
                      {
                        headers: { Authorization: `Bearer ${token}` },
                      }
                    );
                    setItems((prev) =>
                      prev.filter((i) => i._id !== item._id)
                    );
                  }
                  setMenuOpen(null);
                }}
                className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 text-sm"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : (

  // Poll block (unchanged)

<div key={item._id} className="p-4 bg-white rounded shadow w-xs">
  <div className="font-bold mb-2">{item.question}</div>
{item.options.map((opt, idx) => {
  const totalVotes = item.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0);
  const percentage = totalVotes ? ((opt.votes?.length || 0) / totalVotes) * 100 : 0;

  return (
    <div key={idx} className="mb-2 cursor-pointer" onClick={() => votePoll(item._id, idx, items, setItems)}>
      <div className="flex justify-between text-sm">
        <span>{opt.text || `Option ${idx + 1}`}</span>
        <span>{opt.votes?.length || 0} votes</span>
      </div>
      <div className="w-full h-4 bg-[#EEE5FF] rounded-full">
        <div className="h-full bg-[#90EE90] rounded-lg" style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
})}


  <button
    onClick={() => {
      if (window.confirm("Delete this poll?")) {
        deletePoll(item._id, items, setItems);
      }
    }}
    className="text-red-500 mt-2 text-sm"
  >
    Delete Poll
  </button>
</div>

            )
          ))}
        </div>

        {/* Message Input */}
        <div className="p-3 bg-white border-t mt-4 flex items-center relative rounded-lg shadow-md">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="mr-3 p-2 bg-[#EEE5FF] hover:bg-[#D6CCFF] rounded-full"
          >
            <FaSmile size={22} className="text-[#ff6b00]" />
          </button>
          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="absolute bottom-16 left-4 z-10 bg-white shadow-xl p-3 rounded-lg border border-gray-200">
              <EmojiPicker onEmojiClick={(e) => setNewMessage((prev) => prev + e.emoji)} />
            </div>
          )}
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
            className="flex-1 p-3 border rounded-xl mr-3 focus:outline-none "
          />
          <button onClick={sendMessage} className="p-2 bg-[#ff6b00] rounded-full text-white hover:bg-[#e55b00]">
            <FaPaperPlane size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
