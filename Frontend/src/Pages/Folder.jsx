import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { io } from 'socket.io-client';
import { useParams } from "react-router-dom";
import { IoIosNotifications } from "react-icons/io";
import { useDropzone } from "react-dropzone";
import { FaFilePdf, FaEllipsisV } from "react-icons/fa";
import Navbar from "../Components/Navbar.jsx";
import { useNavigate } from "react-router-dom";

const FolderDetail = () => {
  const navigate = useNavigate();
  const { folderId } = useParams();
  const [folder, setFolder] = useState({ 
    name: "", 
    subject: "", 
    pdfs: [],
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const [pdfFile, setPdfFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [viewPdfUrl, setViewPdfUrl] = useState(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const socket = io("http://localhost:5000", {
    transports: ["websocket"],
  });

  
  useEffect(() => {
    socket.on('connect', () => {
    });
    socket.on('notification', (data) => {
      setNotifications(prev => [...prev, data]);
    });
    return () => {
      socket.off('notification');
    };
  }, []);

  useEffect(() => {
    const fetchFolderData = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `/api/pdfProgress/${folderId}/user-progress`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setFolder(response.data.folder);
      } catch (error) {
        console.error("Error fetching folder:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFolderData();
  }, [folderId]);

  // PDF dropzone
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0 && acceptedFiles[0].type === 'application/pdf') {
      setPdfFile(acceptedFiles[0]);
    } else {
      alert('Please upload only PDF files');
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    onDrop,
    maxFiles: 1,
  });

  // PDF handling functions
  const handleViewPdf = (pdf) => {
    if (!pdf.path) {
      alert("PDF path is not available");
      return;
    }
    setViewPdfUrl(pdf.path);
    setIsPdfViewerOpen(true);
  };

  const handleDownloadPdf = async (pdf) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `/api/pdfs/download?url=${encodeURIComponent(pdf.path)}&pdfId=${pdf._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `${pdf.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading PDF:", error);
    }
  };

  const handleUploadPdf = async () => {
    if (!pdfFile) return;
    const formData = new FormData();
    formData.append("pdf", pdfFile);
    formData.append("folderId", folderId);
    try {
      setUploading(true);
      const token = localStorage.getItem("token");
      const response = await axios.post(`/api/pdfs/${folderId}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      setFolder(prev => ({
        ...prev,
        pdfs: [...prev.pdfs, response.data.pdf],
      }));
      setPdfFile(null);
    } catch (error) {
      console.error("Error uploading PDF:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleSummarize = async (pdfUrl) => {
    const payload = { pdfUrl };
    try {
      const response = await fetch('/api/summarize-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      setSummary(data.summary);
      setShowModal(true);
    } catch (error) {
      console.error(error);
      alert('Error summarizing PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCompletion = async (pdfId, markAsComplete) => {
    try {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");
      await axios.patch(
        `/api/pdfProgress/${folderId}/${pdfId}/progress`,
        { completed: markAsComplete },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFolder(prev => {
        const updatedPdfs = prev.pdfs.map(pdf => {
          if (pdf._id === pdfId) {
            return { ...pdf, userCompleted: markAsComplete };
          }
          return pdf;
        });
        const totalPdfs = updatedPdfs.length;
        const completedPdfs = updatedPdfs.filter(pdf => pdf.userCompleted).length;
        const userProgressPercentage = totalPdfs > 0 
          ? Math.round((completedPdfs / totalPdfs) * 100) 
          : 0;
        return {
          ...prev,
          pdfs: updatedPdfs,
          completedPdfs,
          totalPdfs,
          userProgressPercentage
        };
      });
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };
  
  const [activeDropdown, setActiveDropdown] = useState(null);

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  

  return (
    <>
      <Navbar className="fixed top-0 left-0 w-full z-50"/>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Section - Upload & Recent */}
          <div className="lg:w-1/4 space-y-6">
            {/* Upload Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Upload Documents</h2>
              <div
                {...getRootProps()}
                className="border-2 border-dashed border-gray-300 p-8 text-center rounded-lg cursor-pointer hover:bg-gray-50 transition"
              >
                <input {...getInputProps()} />
                <FaFilePdf className="mx-auto text-4xl text-red-500 mb-3" />
                <p className="text-gray-600 mb-2">Drag & Drop PDF files here</p>
                <p className="text-sm text-gray-500">or click to browse files</p>
              </div>
              
              {pdfFile && (
                <div className="mt-4 p-3 bg-gray-100 rounded-lg ">
                {/* <div className="mt-4 p-3 bg-gray-100 rounded-lg flex justify-between items-center"> */}
                  <div className="flex items-center">
                    <FaFilePdf className="text-black-500 mr-2" />
                    <span className="font-medium truncate max-w-xs">{pdfFile.name}</span>
                  </div>
                  
                  
                </div>
                
              )}
              <button 
                    onClick={handleUploadPdf}
                    className="bg-orange-600 text-white px-4 py-1 rounded hover:bg-orange-700"
                    disabled={uploading}
                  >
                    {uploading ? "Uploading..." : "Upload"}
                  </button>
            </div>

            {/* Recent Uploads */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Recent Uploads</h2>
              {folder.pdfs?.slice(0, 3).map(pdf => (
                <div key={pdf._id} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center">
                    <FaFilePdf className="text-red-500 mr-3" />
                    <div>
                      <p className="font-medium truncate max-w-xs">{pdf.name}</p>
                      <p className="text-sm text-gray-500">{pdf.size || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => handleViewPdf(pdf)}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Middle Section - All Documents */}
          <div className="lg:w-2/4">
            <div className="bg-white p-6 rounded-xl shadow-sm">

              {/* Cluster and Subject Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">{folder.name || "Folder"}</h1>
                  <p className="text-gray-600 mt-1">Subject: {folder.subject || "Unknown"}</p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    className="relative p-2 hover:bg-gray-200 rounded-full"
                    onClick={() => setShowNotifications(!showNotifications)}
                  >
                    <IoIosNotifications className="text-2xl text-gray-700" />
                    {notifications.length > 0 && (
                      <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {notifications.length}
                      </span>
                    )}
                  </button>
                  
    <button
      onClick={() => navigate(`/chatroom/${folderId}`)}  // ✅ Now works
      className="mt-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-all"
    >
      Start Chat
    </button>
                  {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                    <div className="p-2 max-h-60 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notification, index) => (
                          <div key={index} className="p-2 hover:bg-gray-100 rounded">
                            <p className="text-sm font-medium">{notification.title}</p>
                            <p className="text-xs text-gray-500">{notification.message}</p>
                          </div>
                        ))
                      ) : (
                        <p className="p-2 text-sm text-gray-500">No notifications</p>
                      )}
                    </div>
                  </div>
                )}
                </div>
                
              </div>
              

              {/* All Documents Section */}


              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">All Documents</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">{folder.pdfs?.length || 0} items</span>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <FaEllipsisV className="text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {folder.pdfs?.map(pdf => (
                  <div key={pdf._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                    {/* PDF Name and Size */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <FaFilePdf className="text-red-500 mr-3 text-xl" />
                        <div>
                          <p className="font-medium">{pdf.name}</p>
                          <p className="text-sm text-gray-500 mt-1">{pdf.size || "2.4 MB"}</p>
                        </div>
                      </div>
        
                      {/* Dropdown Menu */}
                      <div className="relative">
                        <button 
                          className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown(activeDropdown === pdf._id ? null : pdf._id);
                          }}
                        >
                          <FaEllipsisV />
                        </button>
          
                    {activeDropdown === pdf._id && (
                      <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                        <button
                          onClick={() => handleViewPdf(pdf)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          View PDF
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(pdf)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                        Download
                      </button>
                      <button
                        onClick={() => handleSummarize(pdf.path)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Summarize
                      </button>
                    </div>
                )}
              </div>
          </div>

      {/* Completion Toggle */}
      <div className="mt-4 flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-sm text-gray-500">
          {pdf.userCompleted ? "Completed" : "Not completed"}
        </span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={pdf.userCompleted || false}
            onChange={() => handleToggleCompletion(pdf._id, !pdf.userCompleted)}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
        </label>
      </div>
    </div>
  ))}
</div>

            </div>
          </div>

          {/* Right Section - Members & Description */}
          <div className="lg:w-1/4 space-y-6">
            {/* Description Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Description</h2>
              <p className="text-gray-700">
                {folder.description || "No description available."}
              </p>
            </div>

            {/* Progress Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-xl font-semibold mb-4">My Progress</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">Completion</span>
                    <span className="text-sm font-medium">
                      {folder.completedPdfs || 0}/{folder.totalPdfs || 0} (
                      {folder.userProgressPercentage || 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-orange-500 h-2.5 rounded-full" 
                      style={{ width: `${folder.userProgressPercentage || 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="pt-2">
                  <p className="text-sm text-gray-600">
                    {folder.completedPdfs || 0} of {folder.totalPdfs || 0} documents completed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Modal */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">📝 Summary</h3>
              <div className="max-h-96 overflow-y-auto">
                <p className="text-gray-700 whitespace-pre-line">{summary}</p>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-orange-500 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PDF Viewer Modal */}
        {isPdfViewerOpen && viewPdfUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex flex-col">
            <div className="bg-white p-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">PDF Viewer</h3>
              <button 
                onClick={() => setIsPdfViewerOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="flex-1">
              <iframe 
                src={viewPdfUrl} 
                className="w-full h-full" 
                title="PDF Viewer"
              />
            </div>
          </div>
        )}
    </>
  );
};

export default FolderDetail;