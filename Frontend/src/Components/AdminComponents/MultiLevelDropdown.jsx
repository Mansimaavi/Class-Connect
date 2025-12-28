import { Dropdown, ButtonGroup } from "react-bootstrap";
import {useState} from 'react'
const MultiLevelDropdown = ({ setFilterType, setRoleFilter }) => {
  const [selectedFilter, setSelectedFilter] = useState("none");
  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
    setFilterType(filter);
    if (filter !== "role") {
      setRoleFilter(""); 
    }
  };
  
  return (
    <Dropdown as={ButtonGroup}>
      <Dropdown.Toggle variant="primary">
        {selectedFilter === "none"
          ? "Show All (No Filter)"
          : selectedFilter === "role"
          ? "Filter by Role"
          : `Sort by ${selectedFilter}`}
      </Dropdown.Toggle>

      <Dropdown.Menu>
        <Dropdown.Item onClick={() => handleFilterChange("none")}>
          🔄 Show All (No Filter)
        </Dropdown.Item>

        <Dropdown.Divider />

        {/* Role Filtering */}
        <Dropdown as={ButtonGroup} drop="end">
          <Dropdown.Toggle variant="light" id="dropdown-role">
            🏢 Filter by Role
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item onClick={() => { setFilterType("role"); setRoleFilter("admin"); }}>
              👨‍💼 Admin
            </Dropdown.Item>
            <Dropdown.Item onClick={() => { setFilterType("role"); setRoleFilter("user"); }}>
              👤 User
            </Dropdown.Item>
            <Dropdown.Item onClick={() => { setFilterType("role"); setRoleFilter("superadmin"); }}>
              👑 Superadmin
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>

        <Dropdown.Divider />

        {/* Sorting Options */}
        <Dropdown.Item onClick={() => handleFilterChange("lastLogin")}>
          🕒 Sort by Last Login
        </Dropdown.Item>
        <Dropdown.Item onClick={() => handleFilterChange("uploads")}>
          📤 Sort by Uploads
        </Dropdown.Item>
        <Dropdown.Item onClick={() => handleFilterChange("downloads")}>
          📥 Sort by Downloads
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default MultiLevelDropdown;