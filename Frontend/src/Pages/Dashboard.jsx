import React, { useState, useEffect } from "react";
import Navbar from "../Components/Navbar.jsx";
import CreateOrJoinFolderModal from "../Components/Folder&PdfComponents/CreateOrJoinFolderModal.jsx";
import FolderGrid from "../Components/Folder&PdfComponents/foldergrid.jsx";
import { useNavigate } from "react-router-dom";
import WhiteboardModal from "../Components/WhiteboardModal.jsx"; 
import {io} from "socket.io-client"; // Import socket.io-client


const Dashboard = () => {
  const [createdFolders, setCreatedFolders] = useState([]);
  const [joinedFolders, setJoinedFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("created");
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchFolders = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/folders/myfolders", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        credentials: "include",
      });

      const data = await response.json();
      
      if (response.ok) {
        setCreatedFolders(data.createdFolders || []);
        setJoinedFolders(data.joinedFolders || []);
      } else {
        setError(data.message || "Failed to fetch folders");
      }
    } catch (error) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  
  
  useEffect(() => {
    const socket = io("http://localhost:5000");
    socket.on("progress-updated", () => {
      setRefreshKey(prev => prev + 1); // Triggers re-fetch
    });
    return () => socket.disconnect();
  }, []);

  // ✅ Fetch folders with refreshKey dependency
  useEffect(() => {
    fetchFolders();
  }, [isModalOpen, isWhiteboardOpen, refreshKey]);
  

  const handleCreateFolder = async (folderName, subjectName, uniqueKeyhere) => {
    try {
      const response = await fetch("http://localhost:5000/api/folders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ name: folderName, subject: subjectName, uniqueKey: uniqueKeyhere }),
        credentials: "include",
      });

      const data = await response.json();
      if (response.ok && data.folder) {
        setCreatedFolders((prev) => [...prev, data.folder]);
        alert("Folder created successfully!");
        setIsModalOpen(false);
      } else {
        alert(data.message || "Error creating folder.");
      }
    } catch (error) {
      alert("Error creating folder. Please try again.");
    }
  };

  const handleJoinFolder = async (folderKey) => {
    try {
      const response = await fetch("http://localhost:5000/api/folders/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ key: folderKey }),
        credentials: "include",
      });

      const data = await response.json();
      if (response.ok === 200 && data.folder) {
        setJoinedFolders((prev) => [...prev, data.folder]);
        alert("Joined folder successfully!");
      } else {
        alert(data.message || "Error joining folder.");
      }
    } catch (error) {
      alert("Error joining folder. Please try again.");
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm("Are you sure you want to delete this folder?")) return;

    try {
      const response = await fetch(`http://localhost:5000/api/folders/deleteFolder/${folderId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        setCreatedFolders((prev) => prev.filter((folder) => folder._id !== folderId));
        setJoinedFolders((prev) => prev.filter((folder) => folder._id !== folderId));
        alert("Folder deleted successfully!");
      } else {
        alert("Error deleting folder. You might not be the owner.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Error deleting folder. Please try again.");
    }
  };

  const handleLeaveFolder = async (folderId) => {
    if (!window.confirm("Are you sure you want to leave this folder?")) return;

    try {
      const response = await fetch(`http://localhost:5000/api/folders/leaveFolder/${folderId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        setJoinedFolders((prev) => prev.filter((folder) => folder._id !== folderId));
        alert("You have left the folder!");
      } else {
        alert("Error leaving folder.");
      }
    } catch (error) {
      alert("Error leaving folder. Please try again.");
    }
  };

  const handleOpenWhiteboard = () => {
    setIsWhiteboardOpen(true);
  };

  const navigate = useNavigate();

  const handleFolderClick = (folderId) => {
    navigate(`/folder/${folderId}`);
  };


  
  return (
    <>
      <Navbar className="fixed top-0 left-0 w-full z-50"/>
      <div className="flex flex-col min-h-screen p-6 bg-gray-50">
        {/* Header Section */}
        <div className="flex justify-between items-center w-full mb-6">
          {/* Left Side: My Courses Title */}
          <h1 className="text-3xl font-bold text-gray-500">My Courses</h1>
  
          {/* Right Side: Buttons + Filter Tabs */}
          <div className="flex items-center gap-4 flex-wrap justify-end">
            <button
              className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600"
              onClick={() => setIsModalOpen(true)}
              style={{ borderRadius: "0.3rem" }}
            >
              ➕ Create / Join Folder
            </button>
            


  
            {/* Filter Tabs */}
            {["created", "joined", "whiteboard"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  if (tab === "whiteboard") {
                    handleOpenWhiteboard("global-whiteboard");
                  } else {
                    setActiveTab(tab);
                  }
                }}
                className={`px-4 py-2 rounded-full border transition-all duration-200 ${
                  activeTab === tab
                    ? "bg-black text-white border-black"
                    : "bg-white text-black border-black"
                }`}
                style={{ borderRadius: "0.5rem" }}
              >
                {tab === "created"
                  ? "Created"
                  : tab === "joined"
                  ? "Joined"
                  : "Whiteboard"}
              </button>
            ))}
          </div>
        </div>
  
        {/* Folder Display Section */}
        {loading ? (
          <p className="text-xl text-gray-600">⏳ Loading folders...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <div className="w-full max-w-6xl">
            {activeTab === "created" && (
              <FolderGrid
                title="Created Folders"
                folders={createdFolders}
                color="bg-yellow-200"
                onFolderClick={handleFolderClick}
                onDelete={handleDeleteFolder}
                showProgress={true}  // Add this prop
                // getProgress={(folder) => folderProgressMap[folder._id] || 0}
                deleteLabel="Delete"
              />
            )}
  
            {activeTab === "joined" && (
              <FolderGrid
                title="Joined Folders"
                folders={joinedFolders}
                color="bg-blue-200"
                onFolderClick={handleFolderClick}
                onDelete={handleLeaveFolder}
                showProgress={true}  // Add this prop
                // getProgress={(folder) => folderProgressMap[folder._id] || 0}
                deleteLabel="Leave"
              />
            )}
          </div>
        )}
      </div>
  
      {/* Modals */}
      <CreateOrJoinFolderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateFolder={handleCreateFolder}
        onJoinFolder={handleJoinFolder}
      />
      <WhiteboardModal
        isOpen={isWhiteboardOpen}
        onClose={() => setIsWhiteboardOpen(false)}
        roomId="global-whiteboard"
      />
    </>
  );
};

export default Dashboard;