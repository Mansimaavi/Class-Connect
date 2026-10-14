import { useState } from "react";
import api, { getErrorMessage } from "../../lib/api";

const EditClassroomModal = ({ classroom, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: classroom.name,
    subject: classroom.subject,
    description: classroom.description || "",
    isArchived: Boolean(classroom.isArchived),
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { data } = await api.patch(`/classrooms/${classroom._id}`, {
        name: form.name.trim(),
        subject: form.subject.trim(),
        description: form.description.trim(),
        isArchived: form.isArchived,
      });
      onSaved(data.classroom);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-orange-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
      <form onSubmit={save} className="w-[28rem] max-w-[92vw] rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold">Edit classroom</h2>
        {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <label className="mb-1 block text-sm font-medium" htmlFor="edit-name">Name</label>
        <input id="edit-name" className={`${inputClass} mb-3`} value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <label className="mb-1 block text-sm font-medium" htmlFor="edit-subject">Subject</label>
        <input id="edit-subject" className={`${inputClass} mb-3`} value={form.subject} maxLength={100} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        <label className="mb-1 block text-sm font-medium" htmlFor="edit-description">Description</label>
        <textarea
          id="edit-description"
          rows={3}
          className={`${inputClass} mb-3`}
          value={form.description}
          maxLength={1000}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <label className="mb-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isArchived} onChange={(e) => setForm({ ...form, isArchived: e.target.checked })} />
          Archived (no new members can join)
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-100 px-4 py-2 hover:bg-gray-200">
            Cancel
          </button>
          <button type="submit" disabled={saving || !form.name.trim() || !form.subject.trim()} className="rounded-lg bg-orange-500 px-4 py-2 text-white disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditClassroomModal;
