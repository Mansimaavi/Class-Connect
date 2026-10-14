import { initials } from "../../lib/format";

const CARD_COLORS = ["bg-yellow-300", "bg-purple-200", "bg-blue-200", "bg-pink-200", "bg-green-200"];

const ROLE_LABEL = { owner: "Owner", teacher: "Teacher", student: "Student" };

const ClassroomGrid = ({ title, classrooms, onOpen, onRemove, removeLabel = "Delete", emptyMessage }) => (
  <div className="mb-8 w-full">
    <h2 className="mb-6 text-2xl font-bold">{title}</h2>

    {classrooms.length === 0 ? (
      <p className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">{emptyMessage}</p>
    ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {classrooms.map((classroom, index) => {
          const progress = classroom.progress || { total: 0, completed: 0, percentage: 0 };
          return (
            <div
              key={classroom._id}
              role="button"
              tabIndex={0}
              onClick={() => onOpen(classroom)}
              onKeyDown={(e) => e.key === "Enter" && onOpen(classroom)}
              className={`relative cursor-pointer rounded-3xl border-2 border-black p-4 text-black shadow-md transition-shadow hover:shadow-xl ${
                CARD_COLORS[index % CARD_COLORS.length]
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="rounded-xl bg-black px-3 py-1 text-sm text-white">{classroom.subject}</span>
                <div className="flex items-center gap-2">
                  {classroom.myRole && (
                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold">{ROLE_LABEL[classroom.myRole]}</span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(classroom);
                    }}
                    title={removeLabel}
                    aria-label={`${removeLabel} ${classroom.name}`}
                    className="text-red-600 hover:text-red-800"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M6 2a1 1 0 00-1 1v1H3.5a.5.5 0 000 1H4v11a2 2 0 002 2h8a2 2 0 002-2V5h.5a.5.5 0 000-1H15V3a1 1 0 00-1-1H6zm3 5a.5.5 0 011 0v7a.5.5 0 01-1 0V7zm3 0a.5.5 0 011 0v7a.5.5 0 01-1 0V7z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <h3 className="mb-1 mt-4 text-xl font-bold">{classroom.name}</h3>
              {classroom.myRole === "owner" && classroom.joinCode && (
                <p className="mb-0 text-sm">
                  Join code: <span className="font-mono font-semibold">{classroom.joinCode}</span>
                </p>
              )}

              <div className="mb-1 mt-4">
                <div className="mb-1 flex justify-between text-sm font-medium">
                  <span>Your progress</span>
                  <span>{progress.percentage}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-300">
                  <div className="h-full rounded-full bg-black" style={{ width: `${progress.percentage}%` }} />
                </div>
                <p className="mt-1 text-xs text-gray-700">
                  {progress.total === 0 ? "No files shared yet" : `${progress.completed} of ${progress.total} files completed`}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center -space-x-2">
                  {classroom.members.slice(0, 3).map((member) => (
                    <span
                      key={member._id}
                      title={member.name}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-800 text-xs font-semibold text-white"
                    >
                      {initials(member.name)}
                    </span>
                  ))}
                  {classroom.memberCount > 3 && (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-black text-xs text-white">
                      +{classroom.memberCount - 3}
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(classroom);
                  }}
                  className="rounded-3xl bg-black px-4 py-2 text-white transition-colors hover:bg-gray-800"
                >
                  Continue
                </button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

export default ClassroomGrid;
