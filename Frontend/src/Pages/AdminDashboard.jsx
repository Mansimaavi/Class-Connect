import React, { useEffect, useState } from "react";
import { useAuth } from "../Components/AuthComponents/AuthContext";
import { useNavigate } from "react-router-dom";
import { Container, Spinner, Alert, Row, Col } from "react-bootstrap";
import axios from "axios";
import { io } from "socket.io-client";
import SearchBar from "../Components/search"; // Import the SearchBar component
import Notifications from "../Components/Notification";
import StatisticsCards from "../Components/AdminComponents/StatisticsCards";
import UsersTable from "../Components/AdminComponents/UsersTable";
import Role from "../Components/AdminComponents/roles";
import UserActivityGraph from "../Components/AdminComponents/UserActivity";
import Navbar  from "../Components/Navbar";
import Location from "../Components/Location";
import MultiLevelDropdown from "../Components/AdminComponents/MultiLevelDropdown";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const socket = io("http://localhost:5000");

const AdminDashboard = () => {
  const { isLoggedIn } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    activeUsersCount: 0,
    totalUploads: 0,
    totalDownloads: 0,
    mostActiveUsers: [],
  });
  const [filterType, setFilterType] = useState("none"); // Default: No filter
  const [roleFilter, setRoleFilter] = useState("");
  const [searchResults, setSearchResults] = useState([]); // State for search results
  const [isSearchActive, setIsSearchActive] = useState(false); // Track if search is active
  const [userId, setUserId] = useState(""); 
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/");
    } else {
      fetchStats();
      fetchUsers();
    }
  }, [isLoggedIn, navigate]);

  // Fetch notifications, stats, and users
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await axios.get("http://localhost:5000/api/notifications");
        setNotifications(data);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
  }, []);

  // Socket.IO event listeners
  useEffect(() => {
    socket.on("user-registered", (data) => {
      setNotifications((prev) => [...prev, { type: "user", message: data.message }]);
    });

    socket.on("file-uploaded", (data) => {
      setNotifications((prev) => [...prev, { type: "upload", message: data.message }]);
    });

    socket.on("file-downloaded", (data) => {
      setNotifications((prev) => [...prev, { type: "download", message: data.message }]);
    });

    return () => {
      socket.off("user-registered");
      socket.off("file-uploaded");
      socket.off("file-downloaded");
    };
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/stat/stats", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }
      const data = await response.json();
      setStats(data);
    } catch (error) {
      setError("Error fetching stats.");
    }
  };

  const fetchUsers = async () => {
    try {
      let url = `http://localhost:5000/api/admin/users?filterType=${filterType}`;

      // Add role filter if filterType is "role"
      if (filterType === "role" && roleFilter) {
        url += `&role=${roleFilter}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data);
      setLoading(false);
    } catch (error) {
      setError("Error fetching users.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, filterType]);

  const handlePromote = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/promote`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ userId }),
      });
  
      const data = await response.json();
      if (response.ok) {
        // Update the users state
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user._id === userId ? { ...user, role: "admin" } : user
          )
        );
  
        // Update the searchResults state
        setSearchResults((prevResults) =>
          prevResults.map((user) =>
            user._id === userId ? { ...user, role: "admin" } : user
          )
        );
      } else {
        setError(data.message || "Failed to promote user.");
      }
    } catch (error) {
      setError("Error promoting user. Please try again.");
    }
  };
  const handleBlockUnblock = async (userId, isBlocked) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/${isBlocked ? "unblock" : "block"}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ userId }),
      });
  
      const data = await response.json();
      if (response.ok) {
        // Update the users state
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user._id === userId ? { ...user, isBlocked: !isBlocked } : user
          )
        );
  
        // Update the searchResults state
        setSearchResults((prevResults) =>
          prevResults.map((user) =>
            user._id === userId ? { ...user, isBlocked: !isBlocked } : user
          )
        );
      } else {
        setError(data.message || `Failed to ${isBlocked ? "unblock" : "block"} user.`);
      }
    } catch (error) {
      setError(`Error ${isBlocked ? "unblocking" : "blocking"} user. Please try again.`);
    }
  };
  
  const handleDemote = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/demote`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ userId }),
      });
  
      const data = await response.json();
      if (response.ok) {
        // Update the users state
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user._id === userId ? { ...user, role: "user" } : user
          )
        );
  
        // Update the searchResults state
        setSearchResults((prevResults) =>
          prevResults.map((user) =>
            user._id === userId ? { ...user, role: "user" } : user
          )
        );
      } else {
        setError(data.message || "Failed to demote user.");
      }
    } catch (error) {
      setError("Error demoting user. Please try again.");
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      try {
        const response = await fetch(`http://localhost:5000/api/admin/user/${userId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
  
        if (response.ok) {
          // Update the users state
          setUsers((prevUsers) => prevUsers.filter((user) => user._id !== userId));
  
          // Update the searchResults state
          setSearchResults((prevResults) => prevResults.filter((user) => user._id !== userId));
        } else {
          setError("Failed to delete user.");
        }
      } catch (error) {
        setError("Error deleting user. Please try again.");
      }
    }
  };
  
  const resetSearch = () => {
    setSearchResults([]); // Clear search results
  };

  const handleSearch = async (query) => {
    try {
      const response = await fetch(`http://localhost:5000/api/stat/search?query=${query}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch search results");
      }

      const data = await response.json();
      setSearchResults(data); // Update search results
      setIsSearchActive(true); // Set search as active
    } catch (error) {
      console.error("Error searching users:", error);
    }
  };
  const handleViewProfile = (userId) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <>
    <Navbar/>
    <Container className="mt-5">
      <h2 className="text-center mb-4">Admin Dashboard</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      {loading ? (
        <div className="d-flex justify-content-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : (
        <>
          <Row className="mb-4">
        <Col md={12}>
          <UserActivityGraph />
        </Col>
      </Row>
          <Row className="mb-4">
            <Col md={12}>
              <div style={{
                border: '1px solid #ddd',
                borderRadius: '10px',
                overflow: 'hidden',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                height: '400px' // reduce height here
              }}>
                <Location />
              </div>
            </Col>
          </Row>
          <Row>
            <Col md={3}>
              <Notifications notifications={notifications} />
            </Col>
            <Col md={9}>
              <StatisticsCards stats={stats} />
              <Role />
              <Row className="mb-3">
                <Col md={6}>
                  <MultiLevelDropdown
                    setFilterType={setFilterType}
                    setRoleFilter={setRoleFilter}
                  />
                </Col>
              </Row>
              <Row>
        
      </Row>
              <Row className="mb-4">
                <Col md={8}>
                <SearchBar onSearch={handleSearch} resetSearch={resetSearch} />
                </Col>
              </Row>
     
              {/* Pass searchResults to UsersTable */}
              <UsersTable
              users={isSearchActive ? searchResults : users} 
                handlePromote={handlePromote}
                handleDemote={handleDemote}
                handleDelete={handleDelete}
                handleViewProfile={handleViewProfile}
                handleBlockUnblock={handleBlockUnblock}

              />
            </Col>
          </Row>
        </>
      )}
    </Container>
    </>
  );
};

export default AdminDashboard;