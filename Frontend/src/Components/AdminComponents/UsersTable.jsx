import { Alert, Badge, Button, Pagination, Table } from "react-bootstrap";

const RANK = { user: 0, admin: 1, superadmin: 2 };
const ROLE_BADGE = { superadmin: "danger", admin: "success", user: "primary" };

/**
 * Server-paginated user table. Action buttons only appear for users the
 * current admin outranks; the API enforces the same rule.
 */
const UsersTable = ({ users, pagination, currentUser, onPageChange, onViewProfile, onChangeRole, onToggleBlock, onDelete }) => {
  if (!users.length) {
    return (
      <Alert variant="info" className="text-center">
        No users found.
      </Alert>
    );
  }

  const outranks = (target) => RANK[currentUser.role] > RANK[target.role] && target._id !== currentUser._id;
  const isSuperAdmin = currentUser.role === "superadmin";

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
            <th>Last active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user._id} className={user.isBlocked ? "table-secondary" : ""}>
              <td>
                <button type="button" className="btn btn-link p-0" onClick={() => onViewProfile(user._id)}>
                  {user.name}
                </button>
                <div className="small text-muted">@{user.username}</div>
              </td>
              <td>{user.email}</td>
              <td>
                <Badge bg={ROLE_BADGE[user.role]}>{user.role}</Badge>{" "}
                {user.isBlocked && <Badge bg="dark">blocked</Badge>}{" "}
                {user.twoFactor?.enabled && <Badge bg="info">2FA</Badge>}
              </td>
              <td>{user.uploadsCount}</td>
              <td>{user.downloadsCount}</td>
              <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"}</td>
              <td className="text-nowrap">
                {outranks(user) ? (
                  <>
                    {isSuperAdmin && (
                      <Button
                        variant={user.role === "admin" ? "secondary" : "warning"}
                        size="sm"
                        className="me-2"
                        onClick={() => onChangeRole(user, user.role === "admin" ? "user" : "admin")}
                      >
                        {user.role === "admin" ? "Demote" : "Make admin"}
                      </Button>
                    )}
                    <Button variant={user.isBlocked ? "success" : "outline-danger"} size="sm" className="me-2" onClick={() => onToggleBlock(user)}>
                      {user.isBlocked ? "Unblock" : "Block"}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => onDelete(user)}>
                      Delete
                    </Button>
                  </>
                ) : (
                  <span className="small text-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {pagination.pages > 1 && (
        <div className="d-flex justify-content-center">
          <Pagination>
            <Pagination.Prev onClick={() => onPageChange(pagination.page - 1)} disabled={pagination.page === 1} />
            {Array.from({ length: pagination.pages }, (_, index) => (
              <Pagination.Item key={index + 1} active={index + 1 === pagination.page} onClick={() => onPageChange(index + 1)}>
                {index + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next onClick={() => onPageChange(pagination.page + 1)} disabled={pagination.page === pagination.pages} />
          </Pagination>
        </div>
      )}
    </>
  );
};

export default UsersTable;
