import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FaEllipsisV, FaFileAlt, FaFileImage, FaFilePdf, FaFilePowerpoint, FaFileWord } from "react-icons/fa";
import { useSocketEvent } from "../../hooks/useSocket";
import api, { getErrorMessage } from "../../lib/api";
import { formatBytes } from "../../lib/format";

const ACCEPT = {
  "application/pdf": [".pdf"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
};
const MAX_MB = 15;

const isPdf = (resource) => resource.mimeType === "application/pdf" || /\.pdf($|\?)/i.test(resource.url);

const FileIcon = ({ resource, className }) => {
  const type = resource.mimeType || "";
  if (isPdf(resource)) return <FaFilePdf className={`text-red-500 ${className}`} />;
  if (type.startsWith("image/")) return <FaFileImage className={`text-green-600 ${className}`} />;
  if (type.includes("presentation") || type.includes("powerpoint")) return <FaFilePowerpoint className={`text-orange-600 ${className}`} />;
  if (type.includes("word")) return <FaFileWord className={`text-blue-600 ${className}`} />;
  return <FaFileAlt className={`text-gray-500 ${className}`} />;
};

const summarize = (resources) => {
  const completed = resources.filter((r) => r.completed).length;
  return { total: resources.length, completed, percentage: resources.length ? Math.round((completed / resources.length) * 100) : 0 };
};

const ResourcesPanel = ({ classroomId, can, currentUser }) => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [summary, setSummary] = useState(null); // { resource, text, loading, error, words }

  const progress = summarize(resources);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/classrooms/${classroomId}/resources`);
      setResources(data.resources);
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

  useEffect(() => {
    const close = () => setOpenMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  useSocketEvent("resource:created", ({ classroomId: id, resource }) => {
    if (id !== classroomId) return;
    setResources((current) => (current.some((r) => r._id === resource._id) ? current : [resource, ...current]));
  });
  useSocketEvent("resource:deleted", ({ classroomId: id, resourceId }) => {
    if (id === classroomId) setResources((current) => current.filter((r) => r._id !== resourceId));
  });

  const onDrop = useCallback((accepted, rejected) => {
    setUploadError("");
    if (rejected.length) {
      const reason = rejected[0].errors[0];
      setUploadError(reason.code === "file-too-large" ? `Files must be under ${MAX_MB} MB.` : "That file type isn't supported.");
      return;
    }
    setFile(accepted[0] || null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPT,
    maxFiles: 1,
    maxSize: MAX_MB * 1024 * 1024,
    onDrop,
  });

  const upload = async () => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    setUploading(true);
    setUploadError("");
    try {
      const { data } = await api.post(`/classrooms/${classroomId}/resources`, form);
      setResources((current) => [data.resource, ...current.filter((r) => r._id !== data.resource._id)]);
      setFile(null);
    } catch (err) {
      setUploadError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const download = async (resource) => {
    try {
      const response = await api.get(`/classrooms/${classroomId}/resources/${resource._id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = resource.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      window.alert(getErrorMessage(err, "Download failed."));
    }
  };

  const remove = async (resource) => {
    if (!window.confirm(`Delete "${resource.name}"?`)) return;
    try {
      await api.delete(`/classrooms/${classroomId}/resources/${resource._id}`);
      setResources((current) => current.filter((r) => r._id !== resource._id));
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  const toggleComplete = async (resource) => {
    const completed = !resource.completed;
    setResources((current) => current.map((r) => (r._id === resource._id ? { ...r, completed } : r)));
    try {
      await api.put(`/classrooms/${classroomId}/resources/${resource._id}/progress`, { completed });
    } catch (err) {
      setResources((current) => current.map((r) => (r._id === resource._id ? { ...r, completed: !completed } : r)));
      window.alert(getErrorMessage(err));
    }
  };

  const requestSummary = async (resource, words = 150) => {
    setSummary({ resource, words, loading: true, text: "", error: "" });
    try {
      const { data } = await api.post(`/classrooms/${classroomId}/resources/${resource._id}/summary`, { maxWords: words });
      setSummary({ resource, words, loading: false, text: data.summary, error: "" });
    } catch (err) {
      setSummary({ resource, words, loading: false, text: "", error: getErrorMessage(err) });
    }
  };

  const canDelete = (resource) => can("resource:delete:any") || resource.uploadedBy?._id === currentUser?._id;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className="space-y-6 lg:w-1/4">
        {can("resource:upload") && (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Upload a file</h2>
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition ${
                isDragActive ? "border-orange-400 bg-orange-50" : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input {...getInputProps()} />
              <FaFilePdf className="mx-auto mb-3 text-4xl text-red-500" />
              <p className="mb-1 text-gray-600">Drag &amp; drop a file here</p>
              <p className="mb-0 text-sm text-gray-500">PDF, Word, PowerPoint or images, up to {MAX_MB} MB</p>
            </div>
            {file && (
              <p className="mt-3 truncate rounded bg-gray-100 p-2 text-sm">
                {file.name} <span className="text-gray-500">({formatBytes(file.size)})</span>
              </p>
            )}
            {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
            <button
              onClick={upload}
              disabled={!file || uploading}
              className="mt-3 w-full rounded bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
        )}

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">My progress</h2>
          <div className="mb-1 flex justify-between text-sm font-medium">
            <span>Completion</span>
            <span>
              {progress.completed}/{progress.total} ({progress.percentage}%)
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-gray-200">
            <div className="h-2.5 rounded-full bg-orange-500 transition-all" style={{ width: `${progress.percentage}%` }} />
          </div>
        </div>
      </aside>

      <section className="lg:w-3/4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="mb-0 text-xl font-semibold">All files</h2>
            <span className="text-sm text-gray-500">{resources.length} items</span>
          </div>

          {loading ? (
            <p className="text-gray-500">Loading files…</p>
          ) : error ? (
            <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>
          ) : resources.length === 0 ? (
            <p className="py-10 text-center text-gray-500">No files yet. Shared notes and slides will show up here.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {resources.map((resource) => (
                <div key={resource._id} className="rounded-lg border border-gray-200 p-4 transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center">
                      <FileIcon resource={resource} className="mr-3 shrink-0 text-xl" />
                      <div className="min-w-0">
                        <p className="mb-0 truncate font-medium" title={resource.name}>
                          {resource.name}
                        </p>
                        <p className="mb-0 text-xs text-gray-500">
                          {[formatBytes(resource.size), resource.uploadedBy?.name].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        className="rounded p-1 text-gray-500 hover:bg-gray-100"
                        aria-label={`Actions for ${resource.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenu(openMenu === resource._id ? null : resource._id);
                        }}
                      >
                        <FaEllipsisV />
                      </button>
                      {openMenu === resource._id && (
                        <div className="absolute right-0 z-10 mt-2 w-44 rounded-md border border-gray-200 bg-white shadow-lg">
                          <button onClick={() => setViewer(resource)} className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100">
                            View
                          </button>
                          <button onClick={() => download(resource)} className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100">
                            Download
                          </button>
                          {isPdf(resource) && (
                            <button onClick={() => requestSummary(resource)} className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100">
                              Summarize with AI
                            </button>
                          )}
                          {canDelete(resource) && (
                            <button onClick={() => remove(resource)} className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100">
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-2">
                    <span className="text-sm text-gray-500">{resource.completed ? "Completed" : "Not completed"}</span>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={Boolean(resource.completed)}
                        onChange={() => toggleComplete(resource)}
                        aria-label={`Mark ${resource.name} as ${resource.completed ? "not completed" : "completed"}`}
                      />
                      <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-green-500 peer-checked:after:translate-x-full peer-checked:after:border-white" />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="mb-0 truncate text-lg font-semibold">📝 {summary.resource.name}</h3>
              <select
                value={summary.words}
                disabled={summary.loading}
                onChange={(e) => requestSummary(summary.resource, Number(e.target.value))}
                className="rounded border px-2 py-1 text-sm"
                aria-label="Summary length"
              >
                <option value={80}>Short</option>
                <option value={150}>Medium</option>
                <option value={300}>Detailed</option>
              </select>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {summary.loading ? (
                <p className="text-gray-500">Reading the PDF and writing a summary…</p>
              ) : summary.error ? (
                <p className="text-red-600">{summary.error}</p>
              ) : (
                <p className="whitespace-pre-line text-gray-700">{summary.text}</p>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setSummary(null)} className="rounded bg-orange-500 px-4 py-2 text-white hover:bg-orange-600">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {viewer && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/75" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between bg-white p-4">
            <h3 className="mb-0 truncate text-lg font-semibold">{viewer.name}</h3>
            <button onClick={() => setViewer(null)} className="text-xl text-gray-500 hover:text-gray-700" aria-label="Close viewer">
              ✕
            </button>
          </div>
          <div className="flex-1 bg-white">
            {viewer.mimeType?.startsWith("image/") ? (
              <img src={viewer.url} alt={viewer.name} className="mx-auto max-h-full object-contain" />
            ) : isPdf(viewer) ? (
              <iframe src={viewer.url} className="h-full w-full" title={viewer.name} />
            ) : (
              <iframe
                src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(viewer.url)}`}
                className="h-full w-full"
                title={viewer.name}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourcesPanel;
