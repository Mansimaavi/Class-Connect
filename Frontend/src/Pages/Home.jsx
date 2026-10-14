import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import flyingGirl from "../assets/fg2.webp";
import { useAuth } from "../Components/AuthComponents/AuthContext";
import NavbarComponent from "../Components/Navbar";
import api, { getErrorMessage } from "../lib/api";

const fetchTopNote = async (sort) => {
  const { data } = await api.get("/class-notes", { params: { sort, limit: 1 } });
  return data.notes[0] || null;
};

const NoteCard = ({ title, note, detail }) => (
  <div className="rounded-xl border bg-white p-8 shadow-sm transition hover:shadow-lg">
    <h3 className="mb-2 text-xl font-semibold text-orange-500">{title}</h3>
    <p className="mb-2 text-base text-gray-600">
      {note === undefined ? "Loading…" : note ? `${note.title} (${detail(note)})` : "No notes shared yet."}
    </p>
    {note && (
      <a href={note.url} target="_blank" rel="noopener noreferrer" className="text-base text-blue-600 underline">
        View note →
      </a>
    )}
  </div>
);

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchError, setSearchError] = useState("");
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [mostViewed, setMostViewed] = useState(undefined);
  const [topRated, setTopRated] = useState(undefined);
  const [recentNote, setRecentNote] = useState(undefined);

  useEffect(() => {
    fetchTopNote("popular").then(setMostViewed).catch(() => setMostViewed(null));
    fetchTopNote("rating").then(setTopRated).catch(() => setTopRated(null));
    fetchTopNote("recent").then(setRecentNote).catch(() => setRecentNote(null));
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchError("");
    const query = searchTerm.trim().toLowerCase();
    if (!query) return;

    if (!isLoggedIn) {
      navigate("/login", { state: { from: "/dashboard" } });
      return;
    }

    try {
      const { data } = await api.get("/classrooms");
      const match =
        data.classrooms.find((c) => c.name.toLowerCase() === query) ||
        data.classrooms.find((c) => c.name.toLowerCase().includes(query) || c.subject.toLowerCase().includes(query));
      if (match) navigate(`/classroom/${match._id}`);
      else setSearchError("None of your classrooms match that name.");
    } catch (err) {
      setSearchError(getErrorMessage(err));
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
           className="text-orange-500">ClassConnect </span>
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
        placeholder="🔍 Jump to one of your classrooms by name"
        className="w-full max-w-md px-4 py-3 border border-orange-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
      />
      {searchError && <p className="mt-2 text-sm text-red-600">{searchError}</p>}
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

  <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
    <NoteCard title="🔥 Most Viewed" note={mostViewed} detail={(n) => `${n.viewCount} views`} />
    <NoteCard title="⭐ Top Rated" note={topRated} detail={(n) => (n.ratingCount ? `⭐ ${n.averageRating}` : "not rated yet")} />
    <NoteCard title="🆕 Recently Uploaded" note={recentNote} detail={(n) => n.topic} />
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
                ClassConnect is a student-driven platform that makes study materials accessible for everyone.
              </p>
            </div>
            <div>
              <h4 className="text-xl font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                                <li>Phone: +91-XXXXXXXXX</li>
                <li>Mumbai, Maharashtra, India</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xl font-semibold mb-4">Explore</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><Link to="/discussion">Discussion</Link></li>
                <li><Link to="/class-notes">Class Notes</Link></li>
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
            © {new Date().getFullYear()} ClassConnect. All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  );
}
