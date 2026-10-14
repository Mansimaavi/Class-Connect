import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Components/AuthComponents/AuthContext.jsx";
import ClassroomGrid from "../Components/Classroom/ClassroomGrid.jsx";
import CreateOrJoinClassroomModal from "../Components/Classroom/CreateOrJoinClassroomModal.jsx";
import Navbar from "../Components/Navbar.jsx";
import WhiteboardModal from "../Components/WhiteboardModal.jsx";
import { useSocketEvent } from "../hooks/useSocket";
import api, { getErrorMessage } from "../lib/api";

const TABS = [
  { id: "created", label: "Created" },
  { id: "joined", label: "Joined" },
  { id: "whiteboard", label: "Whiteboard" },
];

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("created");

  const fetchClassrooms = useCallback(async () => {
    try {
      const { data } = await api.get("/classrooms");
      setClassrooms(data.classrooms);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load your classrooms."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  // Progress changes in another tab, or someone removing us from a classroom.
  useSocketEvent("progress:updated", ({ classroomId, progress }) => {
    setClassrooms((current) => current.map((c) => (c._id === classroomId ? { ...c, progress } : c)));
  });
  useSocketEvent("classroom:removed", ({ classroomId }) => {
    setClassrooms((current) => current.filter((c) => c._id !== classroomId));
  });

  const created = useMemo(() => classrooms.filter((c) => c.myRole === "owner"), [classrooms]);
  const joined = useMemo(() => classrooms.filter((c) => c.myRole !== "owner"), [classrooms]);

  const handleCreate = async (details) => {
    const { data } = await api.post("/classrooms", details);
    setClassrooms((current) => [data.classroom, ...current]);
    setActiveTab("created");
    setIsModalOpen(false);
    return data.classroom;
  };

  const handleJoin = async (joinCode) => {
    const { data } = await api.post("/classrooms/join", { joinCode });
    setClassrooms((current) => [data.classroom, ...current.filter((c) => c._id !== data.classroom._id)]);
    setActiveTab("joined");
    setIsModalOpen(false);
    return data.classroom;
  };

  const handleDelete = async (classroom) => {
    if (!window.confirm(`Delete "${classroom.name}" for everyone? Its files, chat and announcements will be removed.`)) return;
    try {
      await api.delete(`/classrooms/${classroom._id}`);
      setClassrooms((current) => current.filter((c) => c._id !== classroom._id));
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  const handleLeave = async (classroom) => {
    if (!window.confirm(`Leave "${classroom.name}"?`)) return;
    try {
      await api.post(`/classrooms/${classroom._id}/leave`);
      setClassrooms((current) => current.filter((c) => c._id !== classroom._id));
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen flex-col bg-gray-50 p-6">
        <div className="mb-6 flex w-full flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-700">My Classrooms</h1>
            <p className="mb-0 text-gray-500">Welcome back, {user?.name?.split(" ")[0]}.</p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              className="rounded-md bg-orange-500 px-4 py-2 text-white hover:bg-orange-600"
              onClick={() => setIsModalOpen(true)}
            >
              ➕ Create / Join Classroom
            </button>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => (tab.id === "whiteboard" ? setIsWhiteboardOpen(true) : setActiveTab(tab.id))}
                className={`rounded-lg border px-4 py-2 transition-all duration-200 ${
                  activeTab === tab.id ? "border-black bg-black text-white" : "border-black bg-white text-black"
                }`}
              >
                {tab.label}
                {tab.id === "created" && ` (${created.length})`}
                {tab.id === "joined" && ` (${joined.length})`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-xl text-gray-600">⏳ Loading classrooms…</p>
        ) : error ? (
          <div className="rounded-lg bg-red-50 p-4 text-red-700">
            {error}{" "}
            <button className="underline" onClick={fetchClassrooms}>
              Try again
            </button>
          </div>
        ) : (
          <div className="w-full">
            {activeTab === "created" && (
              <ClassroomGrid
                title="Classrooms you created"
                classrooms={created}
                onOpen={(c) => navigate(`/classroom/${c._id}`)}
                onRemove={handleDelete}
                removeLabel="Delete"
                emptyMessage="You haven't created a classroom yet. Create one and share its join code with your class."
              />
            )}
            {activeTab === "joined" && (
              <ClassroomGrid
                title="Classrooms you joined"
                classrooms={joined}
                onOpen={(c) => navigate(`/classroom/${c._id}`)}
                onRemove={handleLeave}
                removeLabel="Leave"
                emptyMessage="You haven't joined any classrooms. Ask your teacher for a join code."
              />
            )}
          </div>
        )}
      </div>

      <CreateOrJoinClassroomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreate}
        onJoin={handleJoin}
      />
      <WhiteboardModal
        isOpen={isWhiteboardOpen}
        onClose={() => setIsWhiteboardOpen(false)}
        roomId={user ? `personal-${user._id}` : null}
        title="My whiteboard"
      />
    </>
  );
};

export default Dashboard;
