import React, { useState } from "react";
import { Table, Button, Badge, Alert, Pagination } from "react-bootstrap";

const UsersTable = ({ users, handlePromote, handleDemote, handleDelete, handleViewProfile, handleBlockUnblock }) => {
  const [currentPage, setCurrentPage] = useState(1); // State for current page
  const usersPerPage = 10; // Number of users to display per page

  // Calculate the total number of pages
  const totalPages = Math.ceil(users.length / usersPerPage);

  // Get the users for the current page
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  
  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  if (!users || users.length === 0) {
    return (
      <Alert variant="info" className="text-center">
        No users found.
      </Alert>
    );
  }

  return (
    <>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Uploads</th>
            <th>Downloads</th>
            <th>Last Active</th>
          </tr>
        </thead>
        <tbody>
          {currentUsers.map((user) => (
            <tr key={user._id} className={user.role === "superadmin" ? "bg-warning" : ""}>
              <td>
                <span
                  className="text-primary"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleViewProfile(user._id)}
                >
                  {user.name}
                </span>
              </td>
              <td>{user.email}</td>
              <td>
                <Badge
                  bg={
                    user.role === "superadmin"
                      ? "danger"
                      : user.role === "admin"
                      ? "success"
                      : "primary"
                  }
                >
                  {user.role}
                </Badge>
              </td>
              <td>{user.uploadsCount || 0}</td>
              <td>{user.downloadsCount || 0}</td>
              <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"}</td>
              <td>
                {user.role !== "superadmin" && (
                  <>
                    {user.role !== "admin" && (
                      <Button
                        variant="warning"
                        size="sm"
                        className="me-2"
                        onClick={() => handlePromote(user._id)}
                      >
                        Promote to Admin
                      </Button>
                    )}
                    {user.role === "admin" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="me-2"
                        onClick={() => handleDemote(user._id)}
                      >
                        Demote to User
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(user._id)}
                    >
                      Delete
                    </Button>
                    <Button
  variant={user.isBlocked ? "success" : "danger"} // Green for unblock, red for block
  size="sm"
  onClick={() => handleBlockUnblock(user._id, user.isBlocked)}
>
  {user.isBlocked ? "Unblock" : "Block"}
</Button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Pagination */}
      <div className="d-flex justify-content-center">
        <Pagination>
          <Pagination.Prev
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          />
          {Array.from({ length: totalPages }, (_, index) => (
            <Pagination.Item
              key={index + 1}
              active={index + 1 === currentPage}
              onClick={() => handlePageChange(index + 1)}
            >
              {index + 1}
            </Pagination.Item>
          ))}
          <Pagination.Next
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          />
        </Pagination>
      </div>
    </>
  );
};

export default UsersTable;