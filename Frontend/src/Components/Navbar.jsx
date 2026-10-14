import { Dropdown } from "react-bootstrap";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthComponents/AuthContext";
import NotificationBell from "./NotificationBell";

const navLinkStyle = {
  color: "#333",
  fontWeight: "500",
  margin: "0 10px",
  padding: "8px 12px",
  borderRadius: "8px",
  transition: "all 0.3s ease",
};

function NavbarComponent() {
  const { user, isLoggedIn, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    // Leave protected pages first, otherwise they redirect to /login as the session clears.
    navigate("/", { replace: true });
    await logout();
  };

  return (
    <Navbar expand="lg" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      <Container>
        <Navbar.Brand as={Link} to="/" style={{ color: "#ff6600", fontWeight: "bold", fontSize: "1.5rem" }}>
          ClassConnect
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-navbar" />

        <Navbar.Collapse id="main-navbar">
          <Nav className="me-auto">
            <Nav.Link as={NavLink} to="/" end style={navLinkStyle}>
              Home
            </Nav.Link>
            {isLoggedIn && (
              <Nav.Link as={NavLink} to="/dashboard" style={navLinkStyle}>
                My Classrooms
              </Nav.Link>
            )}
            <Nav.Link as={NavLink} to="/discussion" style={navLinkStyle}>
              Discussion
            </Nav.Link>
            <Nav.Link as={NavLink} to="/class-notes" style={navLinkStyle}>
              Class Notes
            </Nav.Link>
            {isAdmin && (
              <Nav.Link as={NavLink} to="/admin" style={navLinkStyle}>
                Admin
              </Nav.Link>
            )}
          </Nav>

          <Nav className="align-items-lg-center">
            {isLoggedIn ? (
              <>
                <NotificationBell />
                <Dropdown align="end">
                  <Dropdown.Toggle variant="link" id="profile-dropdown" style={{ padding: 0 }} aria-label="Account menu">
                    <div
                      style={{
                        width: "35px",
                        height: "35px",
                        borderRadius: "50%",
                        backgroundColor: "#ff6600",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: "bold",
                      }}
                    >
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  </Dropdown.Toggle>

                  <Dropdown.Menu>
                    <Dropdown.Header>
                      {user?.name}
                      <br />
                      <small className="text-muted">@{user?.username}</small>
                    </Dropdown.Header>
                    <Dropdown.Item as={Link} to={`/profile/${user?._id}`}>
                      Profile &amp; security
                    </Dropdown.Item>
                    <Dropdown.Item as={Link} to="/dashboard">
                      Dashboard
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={handleLogout}>Log out</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/login" style={navLinkStyle}>
                  Log in
                </Nav.Link>
                <Nav.Link as={Link} to="/register" style={{ ...navLinkStyle, background: "#ff6600", color: "#fff" }}>
                  Sign up
                </Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavbarComponent;
