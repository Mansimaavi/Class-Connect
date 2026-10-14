import { useCallback, useEffect, useState } from "react";
import { FaChalkboard, FaComments, FaCopy, FaEdit, FaSyncAlt } from "react-icons/fa";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../Components/AuthComponents/AuthContext.jsx";
import AnnouncementsPanel from "../Components/Classroom/AnnouncementsPanel.jsx";
import EditClassroomModal from "../Components/Classroom/EditClassroomModal.jsx";
import MembersPanel from "../Components/Classroom/MembersPanel.jsx";
import ResourcesPanel from "../Components/Classroom/ResourcesPanel.jsx";
import Navbar from "../Components/Navbar.jsx";
import WhiteboardModal from "../Components/WhiteboardModal.jsx";
import { useClassroomRoom, useSocketEvent } from "../hooks/useSocket";
import api, { getErrorMessage } from "../lib/api";

const TABS = [
  { id: "stream", label: "Stream" },
  { id: "files", label: "Files" },
  { id: "members", label: "Members" },
];

const ROLE_BADGE = {
  owner: "bg-orange-100 text-orange-700",
  teacher: "bg-purple-100 text-purple-700",
  student: "bg-blue-100 text-blue-700",
};

const ClassroomPage = () => {
  const { classroomId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [classroom, setClassroom] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeTab = TABS.some((tab) => tab.id === searchParams.get("tab")) ? searchParams.get("tab") : "stream";
  const can = (permission) => permissions.includes(permission);
  const { onlineUserIds } = useClassroomRoom(classroom ? classroomId : null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/classrooms/${classroomId}`);
      setClassroom(data.classroom);
      setPermissions(data.permissions);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't open this classroom."));
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useSocketEvent("classroom:updated", ({ classroomId: id, changes }) => {
    if (id === classroomId) setClassroom((current) => ({ ...current, ...changes }));
  });
  useSocketEvent("classroom:deleted", ({ classroomId: id }) => {
    if (id !== classroomId) return;
    window.alert("This classroom was deleted.");
    navigate("/dashboard", { replace: true });
  });
  useSocketEvent("classroom:removed", ({ classroomId: id }) => {
    if (id !== classroomId) return;
    window.alert("You were removed from this classroom.");
    navigate("/dashboard", { replace: true });
  });
  // Our own role changed (e.g. promoted to teacher): reload permissions.
  useSocketEvent("member:updated", ({ classroomId: id, userId }) => {
    if (id === classroomId && userId === user?._id) load();
  });

  const copyJoinCode = async () => {
    try {
      await navigator.clipboard.writeText(classroom.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy the join code:", classroom.joinCode);
    }
  };

  const regenerateCode = async () => {
    if (!window.confirm("Generate a new join code? The current one will stop working.")) return;
    try {
      const { data } = await api.post(`/classrooms/${classroomId}/join-code`);
      setClassroom((current) => ({ ...current, joinCode: data.joinCode }));
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-gray-500">Loading…</div>;

  if (error) {
    return (
      <>
        <Navbar />
        <div className="mx-auto mt-16 max-w-lg rounded-xl bg-red-50 p-6 text-center text-red-700">
          <p className="mb-4">{error}</p>
          <button className="rounded-lg bg-orange-500 px-4 py-2 text-white" onClick={() => navigate("/dashboard")}>
            Back to my classrooms
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-8">
        <header className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-xl bg-black px-3 py-1 text-sm text-white">{classroom.subject}</span>
                {classroom.myRole && (
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${ROLE_BADGE[classroom.myRole]}`}>
                    {classroom.myRole}
                  </span>
                )}
                {classroom.isArchived && <span className="rounded-full bg-gray-200 px-3 py-1 text-xs">Archived</span>}
                <span className="text-sm text-gray-500">
                  {classroom.memberCount} member{classroom.memberCount === 1 ? "" : "s"} · {onlineUserIds.length} online
                </span>
              </div>
              <h1 className="mb-1 text-3xl font-bold text-gray-800">{classroom.name}</h1>
              {classroom.description && <p className="mb-0 max-w-3xl text-gray-600">{classroom.description}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {classroom.joinCode && (
                <div className="flex items-center gap-1 rounded-lg border border-dashed border-gray-400 px-3 py-2">
                  <span className="text-sm text-gray-500">Join code</span>
                  <span className="font-mono font-bold tracking-widest">{classroom.joinCode}</span>
                  <button onClick={copyJoinCode} className="ml-1 text-gray-500 hover:text-black" title="Copy join code" aria-label="Copy join code">
                    <FaCopy />
                  </button>
                  {can("member:manage") && (
                    <button onClick={regenerateCode} className="text-gray-500 hover:text-black" title="New join code" aria-label="Generate a new join code">
                      <FaSyncAlt />
                    </button>
                  )}
                  {copied && <span className="text-xs text-green-600">Copied</span>}
                </div>
              )}
              {can("classroom:update") && (
                <button onClick={() => setEditing(true)} className="flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-gray-100">
                  <FaEdit /> Edit
                </button>
              )}
              <button onClick={() => setWhiteboardOpen(true)} className="flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-gray-100">
                <FaChalkboard /> Whiteboard
              </button>
              <button
                onClick={() => navigate(`/classroom/${classroomId}/chat`)}
                className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
              >
                <FaComments /> Chat
              </button>
            </div>
          </div>

          <nav className="mt-6 flex gap-2 border-b" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setSearchParams({ tab: tab.id }, { replace: true })}
                className={`-mb-px border-b-2 px-4 py-2 font-medium ${
                  activeTab === tab.id ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        {activeTab === "stream" && <AnnouncementsPanel classroomId={classroomId} can={can} currentUser={user} />}
        {activeTab === "files" && <ResourcesPanel classroomId={classroomId} can={can} currentUser={user} />}
        {activeTab === "members" && (
          <MembersPanel classroomId={classroomId} can={can} currentUser={user} myRole={classroom.myRole} onlineUserIds={onlineUserIds} />
        )}
      </div>

      {editing && (
        <EditClassroomModal
          classroom={classroom}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setClassroom((current) => ({ ...current, ...updated }));
            setEditing(false);
          }}
        />
      )}
      <WhiteboardModal isOpen={whiteboardOpen} onClose={() => setWhiteboardOpen(false)} roomId={classroomId} title={`${classroom.name} whiteboard`} />
    </>
  );
};

export default ClassroomPage;
