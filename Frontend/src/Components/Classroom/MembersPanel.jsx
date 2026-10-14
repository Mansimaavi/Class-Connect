import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSocketEvent } from "../../hooks/useSocket";
import api, { getErrorMessage } from "../../lib/api";
import { initials } from "../../lib/format";

const ROLE_ORDER = { owner: 0, teacher: 1, student: 2 };
const ROLE_STYLE = {
  owner: "bg-orange-100 text-orange-700",
  teacher: "bg-purple-100 text-purple-700",
  student: "bg-blue-100 text-blue-700",
};

const sortMembers = (members) =>
  [...members].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || (a.name || "").localeCompare(b.name || ""));

const MembersPanel = ({ classroomId, can, currentUser, myRole, onlineUserIds }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/classrooms/${classroomId}/members`);
      setMembers(sortMembers(data.members));
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => {
    load();
  }, [load]);

  useSocketEvent("member:joined", ({ classroomId: id, member }) => {
    if (id === classroomId) setMembers((current) => sortMembers([...current.filter((m) => m._id !== member._id), member]));
  });
  useSocketEvent("member:updated", ({ classroomId: id, userId, role }) => {
    if (id === classroomId) setMembers((current) => sortMembers(current.map((m) => (m._id === userId ? { ...m, role } : m))));
  });
  const dropMember = ({ classroomId: id, userId }) => {
    if (id === classroomId) setMembers((current) => current.filter((m) => m._id !== userId));
  };
  useSocketEvent("member:removed", dropMember);
  useSocketEvent("member:left", dropMember);

  const changeRole = async (member, role) => {
    try {
      await api.patch(`/classrooms/${classroomId}/members/${member._id}`, { role });
      setMembers((current) => sortMembers(current.map((m) => (m._id === member._id ? { ...m, role } : m))));
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  const removeMember = async (member) => {
    if (!window.confirm(`Remove ${member.name} from this classroom?`)) return;
    try {
      await api.delete(`/classrooms/${classroomId}/members/${member._id}`);
      setMembers((current) => current.filter((m) => m._id !== member._id));
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  const canRemove = (member) =>
    can("member:manage") &&
    member.role !== "owner" &&
    member._id !== currentUser?._id &&
    (member.role === "student" || myRole === "owner");

  if (loading) return <p className="text-gray-500">Loading members…</p>;
  if (error) return <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>;

  const online = new Set(onlineUserIds);

  return (
    <section className="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold">
        Members <span className="text-base font-normal text-gray-500">({members.length})</span>
      </h2>
      <ul className="divide-y p-0">
        {members.map((member) => (
          <li key={member._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3">
              <span className="relative">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 font-semibold text-white">
                  {initials(member.name)}
                </span>
                <span
                  className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                    online.has(member._id) ? "bg-green-500" : "bg-gray-300"
                  }`}
                  title={online.has(member._id) ? "Online" : "Offline"}
                />
              </span>
              <div>
                <Link to={`/profile/${member._id}`} className="font-medium text-gray-900 no-underline hover:underline">
                  {member.name}
                  {member._id === currentUser?._id && <span className="text-gray-400"> (you)</span>}
                </Link>
                <p className="mb-0 text-xs text-gray-500">@{member.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {can("member:role:update") && member.role !== "owner" ? (
                <select
                  value={member.role}
                  onChange={(e) => changeRole(member, e.target.value)}
                  className="rounded border px-2 py-1 text-sm"
                  aria-label={`Role for ${member.name}`}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              ) : (
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${ROLE_STYLE[member.role]}`}>{member.role}</span>
              )}
              {canRemove(member) && (
                <button onClick={() => removeMember(member)} className="text-sm text-red-600 hover:underline">
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default MembersPanel;
