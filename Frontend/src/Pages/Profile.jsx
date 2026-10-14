import { FolderOpen, FolderPlus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import profileImg from "../assets/project_profile.webp";
import { useAuth } from "../Components/AuthComponents/AuthContext.jsx";
import NavbarComponent from "../Components/Navbar.jsx";
import SecuritySettings from "../Components/SecuritySettings.jsx";
import Sidebar from "../Components/Slider/Sidebar.jsx";
import api, { getErrorMessage } from "../lib/api";

const UserDashboard = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { userId } = useParams();
  const { user: loggedInUser } = useAuth();
  const [userStats, setUserStats] = useState({
    totalUploads: 0,
    totalDownloads: 0,
    totalCreatedClassrooms: 0,
    totalJoinedClassrooms: 0,
  });
  const [address, setAddress] = useState(null);
  const profileRef = useRef(null);
  const securityRef = useRef(null);
  const activityRef = useRef(null);
  const locationRef = useRef(null);
  const isSelf = loggedInUser?._id === userId;
  const handleTwoFactorChange = useCallback(
    (enabled) => setUserData((current) => (current ? { ...current, twoFactorEnabled: enabled } : current)),
    []
  );

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
    let cancelled = false;
    const fetchUserDetails = async () => {
      setLoading(true);
      setAddress(null);
      try {
        const { data } = await api.get(`/users/${userId}`);
        if (cancelled) return;
        setUserData(data.user);
        setUserStats(data.stats);
        setError(null);

        // Location is only returned for your own profile (or to admins).
        const loc = data.user.location;
        if (loc?.latitude && loc?.longitude) {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.latitude}&lon=${loc.longitude}`
          );
          const geo = await response.json();
          if (!cancelled && geo?.address) {
            const addr = geo.address;
            setAddress({
              road: addr.road || addr.neighbourhood || addr.suburb || "",
              city: addr.city || addr.town || addr.village || "",
              state: addr.state || "",
              country: addr.country || "",
            });
          }
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "Failed to load this profile."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchUserDetails();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) return <div className="text-center mt-10 text-lg">Loading user dashboard...</div>;
  if (error) return <div className="text-center mt-10 text-red-500">{error}</div>;
  if (!userData) return <div className="text-center mt-10 text-red-500">Failed to load user data.</div>;

  const { name, username, email, role, course, college } = userData;

  const totalActivity = userStats.totalUploads + userStats.totalDownloads;
  const uploadPercentage = totalActivity ? (userStats.totalUploads / totalActivity) * 100 : 0;
  const downloadPercentage = totalActivity ? (userStats.totalDownloads / totalActivity) * 100 : 0;

  const infoCard = (label, value, wide = false) => (
    <div className={`rounded bg-purple-100 p-3 shadow-sm ${wide ? "col-span-2" : ""}`}>
      <p className="mb-0 text-sm text-gray-500">{label}</p>
      <p className="mb-0 truncate text-lg font-semibold">{value || "—"}</p>
    </div>
  );

  return (
    <>
      <NavbarComponent />

      <div className="flex flex-col md:flex-row">
        <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} sectionRefs={sectionRefs} showSecurity={isSelf} />

        <div className="mx-auto flex-1 px-6 py-10">
          <h1 className="mb-6 text-2xl font-bold">{isSelf ? `Welcome, ${name}` : name}</h1>

          <div ref={profileRef} className="mb-6 flex flex-col gap-8 rounded p-6 shadow md:flex-row md:items-center">
            <div className="shrink-0 text-center md:ml-10">
              <img src={profileImg} alt="" className="mx-auto h-32 w-32 rounded-full object-cover" />
              <p className="mt-2 text-lg font-semibold">@{username}</p>
            </div>
            <div className="flex-1">
              <h2 className="mb-4 text-2xl font-semibold">Personal information</h2>
              <div className="grid grid-cols-2 gap-4">
                {infoCard("Name", name)}
                {infoCard("Username", username)}
                {email && infoCard("Email", email, true)}
                {infoCard("Role", role)}
                {infoCard("Course", course)}
                {infoCard("College", college)}
                {userData.twoFactorEnabled !== undefined && infoCard("Two-factor authentication", userData.twoFactorEnabled ? "On" : "Off")}
              </div>
            </div>
          </div>

          {address && (
            <div ref={locationRef} className="mb-6 rounded p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold">Location</h2>
              <p className="mb-3 text-sm text-gray-500">Only you and administrators can see this.</p>
              <div className="grid grid-cols-2 gap-4">
                {infoCard("Local address", address.road)}
                {infoCard("City", address.city)}
                {infoCard("State", address.state)}
                {infoCard("Country", address.country)}
              </div>
            </div>
          )}

          {isSelf && (
            <div ref={securityRef}>
              <SecuritySettings onTwoFactorChange={handleTwoFactorChange} />
            </div>
          )}

          <div ref={activityRef} className="mb-10 flex flex-col gap-6 rounded bg-white p-6 shadow md:flex-row">
            <div className="w-full md:w-1/2">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">{isSelf ? "My activity" : "Activity"}</h2>
              <div className="mb-4 flex items-center">
                <span className="w-24 text-sm text-gray-600">Uploads</span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-gray-200">
                  <div className="h-full bg-purple-500" style={{ width: `${uploadPercentage}%` }} />
                </div>
                <span className="ml-2 text-sm font-medium">{userStats.totalUploads}</span>
              </div>
              <div className="flex items-center">
                <span className="w-24 text-sm text-gray-600">Downloads</span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-gray-200">
                  <div className="h-full bg-blue-500" style={{ width: `${downloadPercentage}%` }} />
                </div>
                <span className="ml-2 text-sm font-medium">{userStats.totalDownloads}</span>
              </div>
            </div>

            <div className="w-full md:w-1/2">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">Classrooms</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-4 rounded bg-gray-50 p-2 shadow-inner">
                  <FolderPlus className="text-blue-600" size={28} />
                  <div>
                    <div className="text-sm text-gray-500">Created</div>
                    <div className="text-lg font-bold">{userStats.totalCreatedClassrooms}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded bg-gray-50 p-2 shadow-inner">
                  <FolderOpen className="text-green-600" size={28} />
                  <div>
                    <div className="text-sm text-gray-500">Joined</div>
                    <div className="text-lg font-bold">{userStats.totalJoinedClassrooms}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserDashboard;
