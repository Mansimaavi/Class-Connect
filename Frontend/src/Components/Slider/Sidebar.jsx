import setting from "../../assets/account-settings.webp";
import activity from "../../assets/mobile.webp";
import profile from "../../assets/user.webp";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: profile },
  { id: "security", label: "Security", icon: setting, ownOnly: true },
  { id: "activity", label: "Activity", icon: activity },
];

const Sidebar = ({ activeSection, setActiveSection, sectionRefs, showSecurity }) => {
  const handleClick = (section) => {
    setActiveSection(section);
    sectionRefs[section]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav className="rounded-lg p-6 shadow-lg md:w-1/5" aria-label="Profile sections">
      <h2 className="mb-6 text-2xl font-semibold">Profile</h2>
      <div className="flex gap-3 md:flex-col">
        {SECTIONS.filter((section) => !section.ownOnly || showSecurity).map((section) => (
          <button
            key={section.id}
            onClick={() => handleClick(section.id)}
            className={`flex w-full items-center gap-3 rounded p-3 text-left text-white transition duration-300 ease-in-out hover:bg-orange-300 ${
              activeSection === section.id ? "bg-orange-500" : "bg-orange-400"
            }`}
          >
            <img src={section.icon} alt="" className="h-7 w-7" />
            <span className="text-lg">{section.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Sidebar;
