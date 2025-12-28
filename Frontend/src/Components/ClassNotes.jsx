// import React, { useEffect, useState } from "react";
// import axios from "axios";

// const ClassNotes = () => {
//   const [notes, setNotes] = useState([]);
//   const [file, setFile] = useState(null);
//   const [uploading, setUploading] = useState(false);
//   const [reviewState, setReviewState] = useState({}); // { [pdfId]: { rating, review } }

//   useEffect(() => {
//     fetchNotes();
//   }, []);

//   const fetchNotes = async () => {
//     try {
//       const { data } = await axios.get("http://localhost:5000/api/class-notes");
//       setNotes(data);
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const handleUpload = async () => {
//     if (!file) return alert("Please select a file.");
//     const stored = localStorage.getItem("user");
//     const user = stored ? JSON.parse(stored) : {};
//     if (!user._id) return alert("Log in first.");

//     const formData = new FormData();
//     formData.append("file", file);
//     formData.append("folderId", "65e75f9e2b1a4c3f947ea1b7");
//     formData.append("uploadedBy", user._id);
//     formData.append("topic", "Math Notes");

//     try {
//       setUploading(true);
//       await axios.post(
//         "http://localhost:5000/api/class-notes/upload",
//         formData,
//         { headers: { "Content-Type": "multipart/form-data" } }
//       );
//       alert("Uploaded");
//       setFile(null);
//       fetchNotes();
//     } catch (e) {
//       console.error(e);
//       alert("Upload failed");
//     } finally {
//       setUploading(false);
//     }
//   };

//   // Utility: get auth token from localStorage
//   const getAuthToken = () => {
//     let token = localStorage.getItem("token");
//     if (!token) {
//       const stored = localStorage.getItem("user");
//       const user = stored ? JSON.parse(stored) : {};
//       token = user.token;
//     }
//     return token;
//   };

//   const handleRating = async (pdfId, rating) => {
//     const stored = localStorage.getItem("user");
//     const user = stored ? JSON.parse(stored) : {};

//     try {
//       // Update the rating state immediately
//       setReviewState((prevState) => ({
//         ...prevState,
//         [pdfId]: { ...prevState[pdfId], rating }, // update the rating for this note
//       }));

//       // Send the rating to the backend
//       await axios.post("http://localhost:5000/api/class-notes/rate", {
//         pdfId,
//         userId: user._id,
//         rating,
//       });

//       fetchNotes(); // refresh list
//     } catch (err) {
//       console.error("Rating failed:", err);
//       alert("Rating failed. Try again.");
//     }
//   };

//   const handleSubmitReview = async (pdfId) => {
//     const token = getAuthToken();
//     if (!token) return alert("Log in first.");
//     const { rating, review } = reviewState[pdfId] || {};
//     if (!rating || !review) return alert("Select stars and type review.");
//     const note = notes.find((n) => n._id === pdfId) || {};
//     const folderId = note.folderId;
//     try {
//       await axios.post(
//         "http://localhost:5000/api/class-notes/rate",
//         { pdfId, rating, review, folderId },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       alert("Review submitted");
//       setReviewState((rs) => {
//         const newState = { ...rs };
//         delete newState[pdfId];
//         return newState;
//       });
//       fetchNotes();
//     } catch (err) {
//       console.error(err);
//       alert("Submit failed");
//     }
//   };

//   return (
//     <div className="max-w-4xl mx-auto p-6 bg-gray-50 rounded-lg shadow-lg">
//       <h2 className="text-3xl font-bold mb-6">Class Notes(written by goat people)</h2>

//       <div className="flex items-center gap-4 mb-6">
//         <input
//           type="file"
//           onChange={(e) => setFile(e.target.files[0])}
//           className="border rounded p-2"
//         />
//         <button
//           onClick={handleUpload}
//           disabled={uploading}
//           className="px-4 py-2 bg-blue-500 text-white rounded"
//         >
//           {uploading ? "Uploading..." : "Upload"}
//         </button>
//       </div>

//       <ul className="space-y-6">
//         {notes.map((note) => (
//           <li key={note._id} className="bg-white p-5 rounded shadow">
//             <h3 className="text-xl font-semibold mb-1">{note.name}</h3>
//             <p>By: {note.uploadedBy?.name || "Unknown"}</p>
//             <p>{new Date(note.createdAt).toLocaleString()}</p>
//             <a
//               href={note.path}
//               target="_blank"
//               rel="noopener noreferrer"
//               className="text-blue-500 underline"
//             >
//               View PDF
//             </a>

//             <div className="mt-4">
//               <p>Avg Rating: {note.averageRating || "N/A"}</p>
//               <div className="flex gap-1 mt-1">
//                 {[1, 2, 3, 4, 5].map((s) => (
//                   <button
//                     key={s}
//                     onClick={() => handleRating(note._id, s)} // Trigger rating on click
//                     className={
//                       (reviewState[note._id]?.rating || 0) >= s
//                         ? "text-yellow-500"
//                         : "text-gray-300"
//                     }
//                   >
//                     ★
//                   </button>
//                 ))}
//               </div>
//             </div>

//             {note.reviews?.length > 0 && (
//               <div className="mt-4 border-t pt-2">
//                 <h4 className="font-semibold">Reviews:</h4>
//                 {note.reviews.map((r, i) => (
//                   <div key={i} className="mt-1">
//                     <strong>{r.user?.name || "Anon"}:</strong> {r.review}
//                   </div>
//                 ))}
//               </div>
//             )}

//             <div className="mt-4 border-t pt-2">
//               <h4 className="font-semibold mb-2">Leave a review</h4>
//               <div className="flex items-start gap-2">
//                 {[1, 2, 3, 4, 5].map((s) => (
//                   <button
//                     key={s}
//                     onClick={() =>
//                       setReviewState((rs) => ({
//                         ...rs,
//                         [note._id]: { ...rs[note._id], rating: s },
//                       }))
//                     }
//                     className={
//                       (reviewState[note._id]?.rating || 0) >= s
//                         ? "text-yellow-500"
//                         : "text-gray-300"
//                     }
//                   >
//                     ★
//                   </button>
//                 ))}
//                 <textarea
//                   rows={2}
//                   value={reviewState[note._id]?.review || ""}
//                   onChange={(e) =>
//                     setReviewState((rs) => ({
//                       ...rs,
//                       [note._id]: { ...rs[note._id], review: e.target.value },
//                     }))
//                   }
//                   className="flex-1 border rounded p-1"
//                   placeholder="Your review..."
//                 />
//               </div>
//               <button
//                 onClick={() => handleSubmitReview(note._id)}
//                 className="mt-2 px-3 py-1 bg-green-500 text-white rounded"
//               >
//                 Submit Review
//               </button>
//             </div>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// };

// export default ClassNotes;
