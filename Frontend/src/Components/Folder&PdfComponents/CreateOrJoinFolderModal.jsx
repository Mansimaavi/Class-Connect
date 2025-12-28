import React, { useState } from "react";

const CreateOrJoinFolderModal = ({ isOpen, onClose, onCreateFolder, onJoinFolder }) => {
  const [folderName, setFolderName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [folderKey, setFolderKey] = useState("");
  const [uniqueKey, setUniqueKey] = useState("");
  const [isJoiningFolder, setIsJoiningFolder] = useState(false);
  const [error, setError] = useState("");

  const generateUniqueKey = () => {
    const key = Math.random().toString(36).substring(2, 10).toUpperCase();
    setUniqueKey(key);
    return key;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (isJoiningFolder) {
      if (!folderKey.trim()) {
        setError("Please enter a valid folder key.");
        return;
      }
      onJoinFolder(folderKey.trim());
    } else {
      if (!folderName.trim() || !subjectName.trim()) {
        setError("Please fill in all fields.");
        return;
      }
      onCreateFolder(folderName.trim(), subjectName.trim(), uniqueKey || generateUniqueKey());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-2xl w-96 shadow-xl">
        {/* Toggle Switch */}
        <div className="flex justify-center mb-6">
          <div className="flex space-x-2 bg-gray-200 p-1 rounded-full">
            <button
              onClick={() => setIsJoiningFolder(false)}
              style={{ borderRadius: "1.5rem" }}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                !isJoiningFolder ? "bg-orange-500 text-white shadow" : "text-gray-700"
              }`}
            >
              Create
            </button>
            <button
              onClick={() => setIsJoiningFolder(true)}
              style={{ borderRadius: "1.5rem" }}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                isJoiningFolder ? "bg-orange-500 text-white shadow" : "text-gray-700"
              }`}
            >
              Join
            </button>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-6 text-center text-gray-800">
          {isJoiningFolder ? "Join Existing Folder" : "Create New Folder"}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isJoiningFolder ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Folder Name</label>
                <input
                  type="text"
                  placeholder="e.g. Math Fundamentals"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unique Key</label>
                <div className="flex">
                  <input
                    type="text"
                    placeholder="Will be generated automatically"
                    value={uniqueKey}
                    onChange={(e) => setUniqueKey(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={generateUniqueKey}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-r-lg transition-colors"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Folder Key</label>
              <input
                type="text"
                placeholder="Enter the folder key"
                value={folderKey}
                onChange={(e) => setFolderKey(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
          )}

          <div className="pt-2 flex justify-center">
            <button
              type="submit"
              className="w-1/2 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-colors shadow-md hover:shadow-lg"
            >
              {isJoiningFolder ? "Join Folder" : "Create Folder"}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="w-1/2 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateOrJoinFolderModal;
