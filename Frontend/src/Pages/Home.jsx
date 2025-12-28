import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import NavbarComponent from "../Components/Navbar";
import { Link } from "react-router-dom";
import { useAuth } from "../Components/AuthComponents/AuthContext";
import flyingGirl from "../assets/fg2.png";

export default function LearnifyHomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [mostDownloadedPdf, setMostDownloadedPdf] = useState(null);
  const [topRatedPdf, setTopRatedPdf] = useState(null);
  const [recentNote, setRecentNote] = useState(null);

  useEffect(() => {
    const fetchMostDownloaded = async () => {
      try {
        const res = await axios.get("/api/pdfs/most-downloaded");
        setMostDownloadedPdf(res.data.pdf);
      } catch (error) {
        console.error("Failed to fetch most downloaded PDF", error);
      }
    };
    fetchMostDownloaded();
  }, []);

  useEffect(() => {
    const fetchTopRatedPdf = async () => {
      try {
        const res = await axios.get("/api/class-notes");
        const notes = res.data;

        const sorted = [...notes]
          .filter(note => note.path?.startsWith("https://"))
          .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
        setTopRatedPdf(sorted[0]);
      } catch (error) {
        console.error("Top rated fetch error:", error);
      }
    };
    fetchTopRatedPdf();
  }, []);

  useEffect(() => {
    const fetchRecentNote = async () => {
      try {
        const res = await axios.get("/api/class-notes");
        const notes = res.data;

        const sorted = [...notes]
          .filter(n => n.path?.startsWith("https://"))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setRecentNote(sorted[0]);
      } catch (error) {
        console.error("Recently uploaded fetch error:", error);
      }
    };
    fetchRecentNote();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    const query = searchTerm.trim().toLowerCase();
    if (!query) return;

    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/folders/myfolders", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const joinedFolders = res.data.joinedFolders || [];
      const match = joinedFolders.find(
        (folder) => folder.name.toLowerCase() === query
      );

      if (match) {
        navigate(`/folder/${match._id}`);
      } else {
        alert("No folder found.");
      }
    } catch (err) {
      console.error("Search error:", err);
      alert("Error while searching. Try again.");
    }
  };

  return (
    <div style={{ backgroundColor: "rgb(255,255,253)" }} className="min-h-screen">
      <NavbarComponent />
    
      {/* Hero Section + CTAs */}

      <div className="min-h-screen px-6 py-10 md:px-16">
       
{/* Refined Hero Section */}
<section className="mt-0.5 px-4 md:px-10 flex flex-col lg:flex-row items-center justify-between gap-8">
  {/* Left Column */}
  
  <div className="flex-1 space-y-3 text-left w-full">
     <h1 className="text-2xl font-bold ">
            <span
           className="text-orange-500">Learnify </span>
           </h1>
   

    <p className="text-2xl text-gray-800 font-medium">
      🚀 One platform. Unlimited learning.
    </p>
    <p className="text-gray-600 text-base">
      Access notes, share insights, and collaborate with classmates in real-time.
    </p>

    {/* Search Bar */}
    <form onSubmit={handleSearch} className="mt-3">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="🔍 Search folder by name (joined folders only)"
        className="w-full max-w-md px-4 py-3 border border-orange-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
      />
    </form>
  </div>

  {/* Right Column - Image */}
  <div className="flex-1 max-w-sm w-full">
    <img src={flyingGirl} alt="Flying girl" className="w-full" />
  </div>
</section>

{/* CTA: Upload + Discussion */}
<section className="mt-20">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
    
    {/* Upload Notes CTA */}
    <div className="bg-orange-100 rounded-3xl px-8 py-12 text-center shadow-md hover:shadow-lg transition">
      <h2 className="text-3xl font-extrabold text-gray-900 mb-4">📤 Have great notes?</h2>
      <p className="text-gray-700 text-lg mb-6">
        Help others by uploading your study material and notes!
      </p>
      <Link
        to="/class-notes"
        className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-md transition"
      >
        Upload Now
      </Link>
    </div>

    {/* Discussion Panel CTA */}
    <div className="bg-blue-50 rounded-3xl px-8 py-12 text-center shadow-md hover:shadow-lg transition">
      <h2 className="text-3xl font-extrabold text-gray-900 mb-4">🤔 Have a doubt?</h2>
      <p className="text-gray-700 text-lg mb-6">
        Get help from your peers. Ask questions, get answers, and join academic discussions.
      </p>
      <Link
        to="/discussion"
        className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-md transition"
      >
        Go to Discussion Panel →
      </Link>
    </div>

  </div>
</section>

  <div className=" mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
  {/* Most Downloaded */}
  <div className="bg-white border rounded-xl p-8 shadow-sm hover:shadow-lg transition">
    <h3 className="text-xl font-semibold text-orange-500 mb-2">🔥 Most Downloaded</h3>
    <p className="text-gray-600 mb-2 text-base">
      {mostDownloadedPdf
        ? `${mostDownloadedPdf.name} (${mostDownloadedPdf.folderName})`
        : "Fetching most downloaded PDF..."}
    </p>
    {mostDownloadedPdf?.path?.startsWith("https://") ? (
      <a
        href={mostDownloadedPdf.path}
        target="_blank"
        rel="noopener noreferrer"
        className="text-base text-blue-600 underline"
      >
        View Note →
      </a>
    ) : (
      <span className="text-red-500 text-base">File not available</span>
    )}
  </div>

  {/* Top Rated */}
  <div className="bg-white border rounded-xl p-8 shadow-sm hover:shadow-lg transition">
    <h3 className="text-xl font-semibold text-orange-500 mb-2">⭐ Top Rated</h3>
    <p className="text-gray-600 mb-2 text-base">
      {topRatedPdf
        ? `${topRatedPdf.name} (⭐ ${topRatedPdf.averageRating})`
        : "Fetching top-rated note..."}
    </p>
    {topRatedPdf?.path?.startsWith("https://") ? (
      <a
        href={topRatedPdf.path}
        target="_blank"
        rel="noopener noreferrer"
        className="text-base text-blue-600 underline"
      >
        View Note →
      </a>
    ) : (
      <span className="text-red-500 text-base">Note not available or not hosted on Cloudinary</span>
    )}
  </div>

  {/* Recently Uploaded */}
  <div className="bg-white border rounded-xl p-8 shadow-sm hover:shadow-lg transition">
    <h3 className="text-xl font-semibold text-orange-500 mb-2">🆕 Recently Uploaded</h3>
    <p className="text-gray-600 mb-2 text-base">
      {recentNote ? `${recentNote.name} (${recentNote.topic})` : "Fetching..."}
    </p>
    {recentNote?.path?.startsWith("https://") ? (
      <a
        href={recentNote.path}
        target="_blank"
        rel="noopener noreferrer"
        className="text-base text-blue-600 underline"
      >
        View Note →
      </a>
    ) : (
      <span className="text-red-500 text-base">File not available</span>
    )}
  </div>
</div>


        {/* Testimonials */}
        <section className="mt-20">
          <h2 className="text-3xl font-extrabold text-center text-gray-900 mb-10">💬 What Students Are Saying</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border rounded-xl p-6 shadow hover:shadow-lg transition">
              <p className="text-gray-700 mb-4 italic">“I found all my Computer Science notes here—super organized and easy to download.”</p>
              <div className="font-semibold text-orange-500">Riya Sharma</div>
              <div className="text-sm text-gray-500">B.Tech CSE, 3rd Year</div>
            </div>
            <div className="bg-white border rounded-xl p-6 shadow hover:shadow-lg transition">
              <p className="text-gray-700 mb-4 italic">“This platform helped me crack my exams by giving access to previous year papers and quick summaries.”</p>
              <div className="font-semibold text-orange-500">Aman Verma</div>
              <div className="text-sm text-gray-500">MBA, 1st Year</div>
            </div>
            <div className="bg-white border rounded-xl p-6 shadow hover:shadow-lg transition">
              <p className="text-gray-700 mb-4 italic">“Uploading my notes was super simple—and I loved seeing others find them useful.”</p>
              <div className="font-semibold text-orange-500">Mehak Gill</div>
              <div className="text-sm text-gray-500">B.Sc Chemistry, Final Year</div>
            </div>
          </div>
        </section>
        

        {/* Footer */}
        <footer className="mt-24 bg-gray-900 text-white py-10 px-6 md:px-16 w-full">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-xl font-semibold mb-4">About Us</h4>
              <p className="text-sm text-gray-300">
                Learnify is a student-driven platform that makes study materials accessible for everyone.
              </p>
            </div>
            <div>
              <h4 className="text-xl font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>Email: support@learnify.com</li>
                <li>Phone: +91-XXXXXXXXX</li>
                <li>Mumbai, Maharashtra, India</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xl font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><Link to="/terms">Terms & Conditions</Link></li>
                <li><Link to="/privacy">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xl font-semibold mb-4">Follow Us</h4>
              <div className="flex gap-4 text-lg">
                <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-orange-400">📘</a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-orange-400">📸</a>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-orange-400">💼</a>
              </div>
            </div>
          </div>
          <div className="mt-10 text-center text-sm text-gray-400 border-t border-gray-700 pt-6">
            Disclaimer: All materials shared are for educational purposes only. We do not claim ownership unless stated.
            <br />
            © {new Date().getFullYear()} Learnify. All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  );
}
