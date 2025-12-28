import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import { Link, useNavigate } from "react-router-dom";
import { Dropdown } from "react-bootstrap";
import { useAuth } from "./AuthComponents/AuthContext"; 
function NavbarComponent() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const handleClassNotesRedirect = () => {
    navigate("/class-notes"); // Change this route if your ClassNotesPage has a different route
  };

  return (
    <Navbar expand="lg" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      <Container>
        <Navbar.Brand as={Link} to="/" style={{ color: "#ff6600", fontWeight: "bold", fontSize: "1.5rem" }}>
          Learnify
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />

        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/" style={navLinkStyle}>Home</Nav.Link>
            <Nav.Link as={Link} to="/admin" style={navLinkStyle}>Admin</Nav.Link>
            <Nav.Link as={Link} to="/features" style={navLinkStyle}>Features</Nav.Link>
            <Nav.Link as={Link} to="/discussion" style={navLinkStyle}>Discussion</Nav.Link>
            <Nav.Link onClick={handleClassNotesRedirect} style={{ ...navLinkStyle, cursor: "pointer" }}>
              Class Notes
            </Nav.Link>
             
          </Nav>

          <Nav>
            {user ? (
              <Dropdown align="end">
                <Dropdown.Toggle variant="link" id="profile-dropdown" style={{ padding: 0 }}>
                  <div
                    className="profile-icon"
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
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </div>
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  <Dropdown.Header>
                    {user?.username || "User"}</Dropdown.Header>
                  <Dropdown.Item as={Link} to={`/profile/${user?._id}`}>
                    Profile
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/Dashboard">
                    Dashboard
                  </Dropdown.Item> 
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleLogout}>
                    Logout
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <Nav.Link as={Link} to="/register" style={navLinkStyle}>SignUp / SignIn</Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

// Style for nav links
const navLinkStyle = {
  color: "#333",
  fontWeight: "500",
  margin: "0 10px",
  padding: "8px 12px",
  borderRadius: "8px",
  transition: "all 0.3s ease",
};

export default NavbarComponent;