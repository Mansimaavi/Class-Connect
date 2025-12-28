

import React from "react";

const FolderGrid = ({ 
  title, 
  folders, 
  onFolderClick, 
  onDelete, 
  showProgress = false, 
  deleteLabel = "Delete",
  color = "bg-yellow-300" // Default color if not provided
}) => {

  const userId = localStorage.getItem('userId'); 
  console.log("Current User ID:", userId);

  const bgColors = [
    "bg-yellow-300",
    "bg-purple-200",
    "bg-blue-200",
    "bg-pink-200",
    "bg-green-200",
  ];

  const calculateProgress = (folder) => {
    if (!userId || !folder?.pdfs) return { percentage: 0, completed: 0, total: 0 };
    const total = folder.pdfs.length;
    const completed = folder.pdfs.filter(pdf => 
      pdf.progressByUser?.some(p => 
        p.user.toString() === userId.toString() && p.completed
      )
    ).length;

    const percentage = Math.round((completed / total) * 100);
    return { percentage, completed, total };
  };

  return (
    <div className="mb-8 w-full px-4">
      <h2 className="text-2xl font-bold mb-6">{title}</h2>

      {folders.length > 0 ? (
        
          <div className="flex flex-wrap gap-3 justify-start w-[1480px] -ml-5 mr-3">
          {folders.map((folder, index) => {
            const bgColor = bgColors[index % bgColors.length];
            const { percentage, completed, total } = calculateProgress(folder);

            return (
              <div
                key={folder._id}
                  className={` w-[350px] border-[2px] border-black rounded-3xl shadow-md p-4 relative ${bgColor} text-black hover:shadow-xl transition-shadow cursor-pointer`}
                onClick={() => onFolderClick(folder._id)}
              >
                {/* Subject Pill */}
                <div className="absolute top-4 left-4 bg-black text-white text-sm rounded-xl px-3 py-1">
                  {folder.subject}
                </div>

                {/* Top-right Icons */}
                <div className="absolute top-4 right-4 flex space-x-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(folder._id);
                    }} 
                    title={deleteLabel}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-red-600 hover:text-red-800"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M6 2a1 1 0 00-1 1v1H3.5a.5.5 0 000 1H4v11a2 2 0 002 2h8a2 2 0 002-2V5h.5a.5.5 0 000-1H15V3a1 1 0 00-1-1H6zm3 5a.5.5 0 011 0v7a.5.5 0 01-1 0V7zm3 0a.5.5 0 011 0v7a.5.5 0 01-1 0V7z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>

                {/* Folder Name */}
                <h3 className="text-xl font-bold mb-1 mt-4">{folder.name}</h3>

                {/* Progress Bar */}
                {showProgress && userId && (
                  <div className=" mb-1">
                    <div className="flex justify-between text-sm font-medium mt-4 mb-1">
                      <span>Your Progress</span>
                      <span>{percentage}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-300 rounded-full">
                      <div
                        className="h-full bg-black rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-700 mt-1">
                      {completed} of {total} PDFs completed
                    </p>
                  </div>
                )}
                <div className="flex justify-between mb-2">
                {/* Member Avatars */}
                {folder.members && folder.members.length > 0 && (
                  <div className="flex items-center space-x-[-8px]">
                  {/* <div className="flex items-center space-x-[-8px]"> */}
                    {folder.members.slice(0, 3).map((member, i) => (
                      <img
                        key={i}
                        src={member.avatar || `/avatar${i + 1}.png`} 
                        className="w-8 h-8 rounded-full border-2 border-white"
                        alt={`Member ${i + 1}`}
                      />
                    ))}
                    {folder.members.length > 3 && (
                      <div className="w-8 h-8 rounded-full bg-black text-white text-xs flex items-center justify-center border-2 border-white">
                        +{folder.members.length - 3}
                      </div>
                    )}
                  </div>
                )}

                {/* Continue Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFolderClick(folder._id);
                    }}
                    className="bg-black text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors"
                    style={{ borderRadius: "1.5rem" }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-500 text-center">No folders available.</p>
      )}
    </div>
  );
};

export default FolderGrid;


