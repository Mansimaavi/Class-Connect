import { useCallback, useEffect, useState } from "react";
import { Alert, Col, Container, Form, Row, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import ActivityFeed from "../Components/AdminComponents/ActivityFeed.jsx";
import Location from "../Components/AdminComponents/Location.jsx";
import RoleCharts from "../Components/AdminComponents/RoleCharts.jsx";
import StatisticsCards from "../Components/AdminComponents/StatisticsCards.jsx";
import UserActivityChart from "../Components/AdminComponents/UserActivityChart.jsx";
import UserSearchBar from "../Components/AdminComponents/UserSearchBar.jsx";
import UsersTable from "../Components/AdminComponents/UsersTable.jsx";
import { useAuth } from "../Components/AuthComponents/AuthContext.jsx";
import Navbar from "../Components/Navbar";
import { useSocketEvent } from "../hooks/useSocket";
import api, { getErrorMessage } from "../lib/api";

const AdminDashboard = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: "", role: "", status: "", sort: "lastLogin", page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState([]);

  const fetchUsers = useCallback(async () => {
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ""));
      const { data } = await api.get("/admin/users", { params: { ...params, limit: 10 } });
      setUsers(data.users);
      setPagination(data.pagination);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load users."));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    api
      .get("/admin/notifications")
      .then(({ data }) => setNotifications(data.notifications))
      .catch(() => {});
  }, []);

  useSocketEvent("admin:activity", (entry) => setNotifications((current) => [...current, entry].slice(-50)));

  const updateFilters = (changes) => setFilters((current) => ({ ...current, ...changes, page: changes.page ?? 1 }));

  const replaceUser = (updated) => setUsers((current) => current.map((u) => (u._id === updated._id ? { ...u, ...updated } : u)));

  const changeRole = async (user, role) => {
    const verb = role === "admin" ? "make an admin" : "demote to a regular user";
    if (!window.confirm(`Are you sure you want to ${verb}: ${user.name}?`)) return;
    try {
      const { data } = await api.patch(`/admin/users/${user._id}/role`, { role });
      replaceUser(data.user);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const toggleBlock = async (user) => {
    const blocked = !user.isBlocked;
    if (blocked && !window.confirm(`Block ${user.name}? They'll be signed out immediately.`)) return;
    try {
      const { data } = await api.patch(`/admin/users/${user._id}/status`, { blocked });
      replaceUser(data.user);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.name}? Classrooms they own will be deleted too. This can't be undone.`)) return;
    try {
      await api.delete(`/admin/users/${user._id}`);
      fetchUsers();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <>
      <Navbar />
      <Container className="mt-5 mb-5">
        <h2 className="mb-4 text-center">Admin dashboard</h2>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Row className="mb-4">
          <Col md={3}>
            <ActivityFeed notifications={notifications} />
          </Col>
          <Col md={9}>
            <StatisticsCards />
            <RoleCharts />
          </Col>
        </Row>

        <h4 className="mb-3">Users</h4>
        <Row className="mb-3 g-2">
          <Col md={5}>
            <UserSearchBar onSearch={(search) => updateFilters({ search })} resetSearch={() => updateFilters({ search: "" })} />
          </Col>
          <Col md={2}>
            <Form.Select value={filters.role} onChange={(e) => updateFilters({ role: e.target.value })} aria-label="Filter by role">
              <option value="">All roles</option>
              <option value="user">Users</option>
              <option value="admin">Admins</option>
              <option value="superadmin">Super admins</option>
            </Form.Select>
          </Col>
          <Col md={2}>
            <Form.Select value={filters.status} onChange={(e) => updateFilters({ status: e.target.value })} aria-label="Filter by status">
              <option value="">Any status</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </Form.Select>
          </Col>
          <Col md={3}>
            <Form.Select value={filters.sort} onChange={(e) => updateFilters({ sort: e.target.value })} aria-label="Sort users">
              <option value="lastLogin">Sort: last active</option>
              <option value="createdAt">Sort: newest</option>
              <option value="name">Sort: name</option>
            </Form.Select>
          </Col>
        </Row>

        {loading ? (
          <div className="d-flex justify-content-center">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading…</span>
            </Spinner>
          </div>
        ) : (
          <UsersTable
            users={users}
            pagination={pagination}
            currentUser={currentUser}
            onPageChange={(page) => updateFilters({ page })}
            onViewProfile={(userId) => navigate(`/profile/${userId}`)}
            onChangeRole={changeRole}
            onToggleBlock={toggleBlock}
            onDelete={deleteUser}
          />
        )}

        <Row className="mb-4 mt-5">
          <Col md={12}>
            <h4 className="mb-3">Daily activity</h4>
            <UserActivityChart />
          </Col>
        </Row>
        <Row className="mb-4">
          <Col md={12}>
            <h4 className="mb-3">Where users signed up</h4>
            <Location />
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default AdminDashboard;
