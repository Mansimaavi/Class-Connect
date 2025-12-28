import React from "react";
import { Card, ListGroup } from "react-bootstrap";

const Notifications = ({ notifications }) => {
  return (
    <Card className="shadow-lg mb-4">
      <Card.Body>
        <Card.Title className="text-danger animate-pulse animation-delay-0.00">🔴 Live Updates</Card.Title>
        <ListGroup variant="flush" style={{ height: "250px", overflowY: "auto" }}>
          {notifications.length === 0 ? (
            <ListGroup.Item className="text-muted">No recent activity...</ListGroup.Item>
          ) : (
            notifications.slice(-6).map((notif, index) => (
              <ListGroup.Item
                key={index}
                className={`text-${notif.type === "user" ? "primary" : notif.type === "upload" ? "success" : "danger"}`}
              >
                {notif.message}
              </ListGroup.Item>
            ))
          )}
        </ListGroup>
      </Card.Body>
    </Card>
  );
};

export default Notifications;