import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { FolderPlus, FolderOpen } from 'lucide-react';
import profileImg from '../assets/project_profile.png';
import Sidebar from '../Components/Slider/Sidebar.jsx'; // Import Sidebar component
import SecuritySettings from '../Components/SecuritySettings.jsx';



import NavbarComponent from '../Components/Navbar.jsx';
const UserDashboard = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationText, setLocationText] = useState('');
  

  const { userId } = useParams();
  const [userStats, setUserStats] = useState({
    totalUploads: 0,
    totalDownloads: 0,
    totalCreatedFolders: 0,
    totalJoinedFolders: 0,
  });
  const [road, setRoad] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  // Create refs for each section you want to scroll to
  const profileRef = useRef(null);
  const securityRef = useRef(null);
  const activityRef = useRef(null);
  const locationRef = useRef(null);
  const loggedInUser = JSON.parse(localStorage.getItem("user"));
  const loggedInUserId = loggedInUser?._id;
  
  // Track active section
  const [activeSection, setActiveSection] = useState('profile');

  // Assign the refs to an object
  const sectionRefs = {
    profile: profileRef,
    security: securityRef,
    activity: activityRef,
    location: locationRef,
  };
 
  
  
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/profile/user/${userId}`);
        setUserData(res.data);
  
        const statsRes = await axios.get(`http://localhost:5000/api/admin/user/${userId}/stats`);
        setUserStats(statsRes.data);
  
        const loc = res.data.userDetails.location;
        if (loc?.latitude && loc?.longitude) {
          const geoRes = await axios.get('https://nominatim.openstreetmap.org/reverse', {
            params: {
              lat: loc.latitude,
              lon: loc.longitude,
              format: 'json',
            },
            headers: {
              'User-Agent': 'YourAppName/1.0 (your-email@example.com)',
            },
          });
  
          const addr = geoRes.data.address;
  
          setRoad(addr.road || addr.neighbourhood || addr.suburb || "");
          setCity(addr.city || addr.town || addr.village || "");
          setState(addr.state || "");
          setCountry(addr.country || "");
        } else {
          setLocationText('Location not available');
        }
  
        setLoading(false);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load user data.');
        setLoading(false);
      }
    };
  
    fetchUserDetails();
  }, [userId]);
  

  if (loading) return <div className="text-center mt-10 text-lg">Loading user dashboard...</div>;
  if (error) return <div className="text-center mt-10 text-red-500">{error}</div>;
  if (!userData) return <div className="text-center mt-10 text-red-500">Failed to load user data.</div>;

  const { userDetails } = userData;
  const { name, username, email, role, course, college } = userDetails;

  const totalActivity = userStats.totalUploads + userStats.totalDownloads;
  const uploadPercentage = totalActivity ? (userStats.totalUploads / totalActivity) * 100 : 0;
  const downloadPercentage = totalActivity ? (userStats.totalDownloads / totalActivity) * 100 : 0;

  return <>

    <NavbarComponent className="fixed top-0 left-0 w-full z-50"/>

    <div className="flex "  >
      
      {/* Sidebar with refs passed down */}
      
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} sectionRefs={sectionRefs} profileUserId={userId} />
      

      <div className="m-full mx-auto px-6 py-10 flex-1">
        <h1 className="text-2xl font-bold mb-6">Welcome, {name}</h1>

        {/* Profile Section */}
        <div ref={profileRef} className=" shadow rounded p-6 mb-6 flex items-center ">
          <div className="flex">
            <div className="flex-shrink-0 ml-20 mt-15">
              <img
                src={profileImg}
                alt="User Avatar"
                className="w-32 h-32 rounded-full object-cover"
              />
              <p className="text-center mt-2 text-xl font-semibold">{email}</p>
            </div>
            <div className="ml-41">
              <h2 className="text-2xl font-semibold mb-4">Personal Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-100  p-3 rounded shadow-sm w-60 h-16">
                  <p className="text-sm text-gray-500 mb-0">Name</p>
                  <p className="text-lg font-semibold">{name}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded shadow-sm w-60 h-16">
                  <p className="text-sm text-gray-500 mb-0">Username</p>
                  <p className="text-lg font-semibold">{username}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded shadow-sm w-full h-16 max-w-full">
                  <p className="text-sm text-gray-500 mb-0">Email</p>
                  <p className="text-lg font-semibold">{email}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded shadow-sm w-60 h-16">
                  <p className="text-sm text-gray-500 mb-0">Role</p>
                  <p className="text-lg font-semibold">{role}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded shadow-sm w-60 h-16">
                  <p className="text-sm text-gray-500 mb-0">Course</p>
                  <p className="text-lg font-semibold">{course}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded shadow-sm w-60 h-16">
                  <p className="text-sm text-gray-500 mb-0">College</p>
                  <p className="text-lg font-semibold">{college}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div ref={locationRef} className=" shadow rounded p-6 mb-6">
           {/* Location Card */}
          <h2 className="text-xl font-semibold mb-4">Location</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded shadow-sm w-70 h-16 bg-purple-100">
              <p className="text-sm text-gray-500 mb-0">Local Address</p>
              <p className="text-lg font-semibold">{road}</p>
            </div>

            <div className=" p-3 rounded shadow-sm w-70 h-16 bg-purple-100">
              <p className="text-sm text-gray-500 mb-0">City</p>
              <p className="text-lg font-semibold">{city}</p>
            </div>

            <div className=" p-3 rounded shadow-sm w-70 h-16 bg-purple-100 ">
              <p className="text-sm text-gray-500 mb-0">State</p>
              <p className="text-lg font-semibold">{state}</p>
            </div>

            <div className=" p-3 rounded shadow-sm w-70 h-16 bg-purple-100">
              <p className="text-sm text-gray-500 mb-0">Country</p>
              <p className="text-lg font-semibold">{country}</p>
            </div>
          </div>
        
        </div>
        {loggedInUserId === userId && (
  <div ref={securityRef}>
    <SecuritySettings userId={userId} />
  </div>
)}

        {/* Activity Section */}
        <div ref={activityRef} className="flex flex-col md:flex-row gap-6 bg-white shadow rounded p-6 mb-10">
          <div className="w-full md:w-1/2">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">My Activity</h2>
            <div className="flex items-center mb-4">
              <span className="w-24 text-sm text-gray-600">Uploads</span>
              <div className="flex-1 h-4 bg-gray-200 rounded overflow-hidden">
                <div className="bg-purple-500 h-full" style={{ width: `${uploadPercentage}%` }}></div>
              </div>
              <span className="ml-2 text-sm font-medium">{userStats.totalUploads}</span>
            </div>
            <div className="flex items-center">
              <span className="w-24 text-sm text-gray-600">Downloads</span>
              <div className="flex-1 h-4 bg-gray-200 rounded overflow-hidden">
                <div className="bg-blue-500 h-full" style={{ width: `${downloadPercentage}%` }}></div>
              </div>
              <span className="ml-2 text-sm font-medium">{userStats.totalDownloads}</span>
            </div>
          </div>

          <div className="w-full md:w-1/2">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">My Classroom</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 shadow-inner rounded p-2 flex items-center gap-4">
                <FolderPlus className="text-blue-600" size={28} />
                <div>
                  <div className="text-sm text-gray-500">Created Folders</div>
                  <div className="text-lg font-bold">{userStats.totalCreatedFolders}</div>
                </div>
              </div>
              <div className="bg-gray-50 shadow-inner rounded p-2 flex items-center gap-4">
                <FolderOpen className="text-green-600" size={28} />
                <div>
                  <div className="text-sm text-gray-500">Joined Folders</div>
                  <div className="text-lg font-bold">{userStats.totalJoinedFolders}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
 
  </>
};

export default UserDashboard;
