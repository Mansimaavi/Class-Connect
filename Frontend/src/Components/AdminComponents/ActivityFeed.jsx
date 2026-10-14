import { Card, ListGroup } from "react-bootstrap";

const VARIANT = { user_registered: "primary", resource: "success", system: "secondary" };

/** Live admin feed (new sign-ups etc.), pushed over Socket.IO. */
const ActivityFeed = ({ notifications }) => (
  <Card className="mb-4 shadow-lg">
    <Card.Body>
      <Card.Title className="text-danger">🔴 Live updates</Card.Title>
      <ListGroup variant="flush" style={{ height: "250px", overflowY: "auto" }}>
        {notifications.length === 0 ? (
          <ListGroup.Item className="text-muted">No recent activity…</ListGroup.Item>
        ) : (
          [...notifications]
            .reverse()
            .slice(0, 20)
            .map((notification) => (
              <ListGroup.Item key={notification._id} className={`text-${VARIANT[notification.type] || "dark"}`}>
                {notification.message}
                <div className="small text-muted">{new Date(notification.createdAt).toLocaleString()}</div>
              </ListGroup.Item>
            ))
        )}
      </ListGroup>
    </Card.Body>
  </Card>
);

export default ActivityFeed;
