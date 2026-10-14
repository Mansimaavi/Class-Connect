import { useState } from "react";
import { getErrorMessage } from "../../lib/api";

const emptyForm = { name: "", subject: "", description: "", joinCode: "" };

const CreateOrJoinClassroomModal = ({ isOpen, onClose, onCreate, onJoin }) => {
  const [mode, setMode] = useState("create");
  const [form, setForm] = useState(emptyForm);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const update = (field) => (e) => setForm((current) => ({ ...current, [field]: e.target.value }));

  const close = () => {
    setForm(emptyForm);
    setJoinCode("");
    setError("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (mode === "join" && !/^[A-Za-z0-9]{6,12}$/.test(joinCode.trim())) {
      setError("Join codes are 6-12 letters and numbers.");
      return;
    }
    if (mode === "create" && (!form.name.trim() || !form.subject.trim())) {
      setError("Please enter a classroom name and subject.");
      return;
    }
    if (mode === "create" && form.joinCode && !/^[A-Za-z0-9]{6,12}$/.test(form.joinCode.trim())) {
      setError("A custom join code must be 6-12 letters and numbers.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "join") {
        await onJoin(joinCode.trim().toUpperCase());
      } else {
        const payload = { name: form.name.trim(), subject: form.subject.trim(), description: form.description.trim() };
        if (form.joinCode.trim()) payload.joinCode = form.joinCode.trim().toUpperCase();
        await onCreate(payload);
      }
      setForm(emptyForm);
      setJoinCode("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-[26rem] max-w-[92vw] rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex justify-center">
          <div className="flex space-x-2 rounded-full bg-gray-200 p-1">
            {["create", "join"].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setMode(option);
                  setError("");
                }}
                className={`rounded-full px-5 py-2 text-sm font-medium capitalize transition-colors ${
                  mode === option ? "bg-orange-500 text-white shadow" : "text-gray-700"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <h2 className="mb-6 text-center text-xl font-semibold text-gray-800">
          {mode === "join" ? "Join a classroom" : "Create a classroom"}
        </h2>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {mode === "create" ? (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="cc-name">
                  Classroom name
                </label>
                <input id="cc-name" className={inputClass} placeholder="e.g. Data Structures - Section B" value={form.name} onChange={update("name")} maxLength={100} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="cc-subject">
                  Subject
                </label>
                <input id="cc-subject" className={inputClass} placeholder="e.g. Computer Science" value={form.subject} onChange={update("subject")} maxLength={100} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="cc-description">
                  Description <span className="text-gray-400">(optional)</span>
                </label>
                <textarea id="cc-description" className={inputClass} rows={2} value={form.description} onChange={update("description")} maxLength={1000} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="cc-code">
                  Custom join code <span className="text-gray-400">(optional, generated if empty)</span>
                </label>
                <input id="cc-code" className={`${inputClass} font-mono uppercase`} value={form.joinCode} onChange={update("joinCode")} maxLength={12} />
              </div>
            </>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="cc-join">
                Join code
              </label>
              <input
                id="cc-join"
                className={`${inputClass} font-mono uppercase tracking-widest`}
                placeholder="e.g. 7KXQ2MPA"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                maxLength={12}
                autoFocus
              />
            </div>
          )}

          <div className="flex justify-center gap-3 pt-2">
            <button type="button" onClick={close} className="w-1/2 rounded-xl bg-gray-100 px-4 py-2 font-medium text-gray-700 hover:bg-gray-200">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-1/2 rounded-xl bg-orange-500 px-4 py-2 font-medium text-white shadow-md hover:bg-orange-600 disabled:opacity-60"
            >
              {submitting ? "Please wait…" : mode === "join" ? "Join" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrJoinClassroomModal;
