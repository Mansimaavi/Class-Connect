import React from 'react';
import profile from '../../assets/user.png'
import activity from '../../assets/mobile.png';
import setting from '../../assets/account-settings.png';
const loggedInUser = JSON.parse(localStorage.getItem("user"));
const loggedInUserId = loggedInUser?._id;

const Sidebar = ({ activeSection, setActiveSection, sectionRefs, profileUserId }) => {
  const handleClick = (section) => {
    setActiveSection(section);
    sectionRefs[section].current.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  return (
    <div className="w-1/6  p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold text-gray mb-8">My Profile</h2>
      <div className="space-y-6 mt-4">
      <button
  className={`w-full flex items-center gap-3 p-3 text-left rounded transition duration-300 ease-in-out hover:bg-orange-200 ${ 
    activeSection === 'profile' ? 'bg-orange-400 text-white' : 'bg-orange-400 text-white'
  } mb-4`}
  onClick={() => handleClick('profile') }

  
>
<img src={profile} alt="Profile Icon" className="w-7 h-7" />

  <span className="text-xl">Profile</span>
</button>


        {/* Show only if logged-in user is viewing their own profile */}
        {loggedInUserId === profileUserId && (
          <button
            className={`w-full flex items-center gap-3 text-left p-3 rounded transition duration-300 ease-in-out hover:bg-orange-200 ${
              activeSection === 'security' ? 'bg-orange-400 text-white' : 'bg-orange-400 text-white'
            } mb-4`}
            onClick={() => handleClick('security')}
          >
            <img src={setting} alt="Profile Icon" className="w-7 h-7" />

            <span className="text-xl">Security</span>
          </button>
        )}

        <button
          className={`w-full flex items-center gap-3 text-left p-3 rounded transition duration-300 ease-in-out hover:bg-orange-200 ${
            activeSection === 'activity' ? 'bg-orange-400 text-white' : 'bg-orange-400 text-white'
          }`}
          onClick={() => handleClick('activity')}
        >
          <img src={activity} alt="Profile Icon" className="w-7 h-7" />

          <span className="text-xl">My Activity</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
