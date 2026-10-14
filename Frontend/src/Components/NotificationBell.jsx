import { useCallback, useEffect, useState } from "react";
import { Dropdown } from "react-bootstrap";
import { IoIosNotifications } from "react-icons/io";
import ReactTimeAgo from "react-time-ago";
import { useNavigate } from "react-router-dom";
import { useSocketEvent } from "../hooks/useSocket";
import api from "../lib/api";

/** Bell icon with an unread badge; new notifications arrive over the socket. */
const NotificationBell = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications", { params: { limit: 15 } });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // the bell just stays empty
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useSocketEvent("notification:new", (notification) => {
    setNotifications((current) => [notification, ...current].slice(0, 15));
    setUnreadCount((count) => count + 1);
  });

  const open = async (notification) => {
    if (!notification.read) {
      setNotifications((current) => current.map((n) => (n._id === notification._id ? { ...n, read: true } : n)));
      setUnreadCount((count) => Math.max(0, count - 1));
      api.patch(`/notifications/${notification._id}/read`).catch(() => {});
    }
    if (notification.link) navigate(notification.link);
  };

  const markAllRead = async () => {
    setNotifications((current) => current.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    api.patch("/notifications/read-all").catch(() => {});
  };

  return (
    <Dropdown align="end" className="me-3">
      <Dropdown.Toggle variant="link" id="notifications-dropdown" className="relative p-1 text-gray-700" aria-label="Notifications">
        <IoIosNotifications size={26} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Dropdown.Toggle>
      <Dropdown.Menu style={{ width: 340, maxHeight: 420, overflowY: "auto" }}>
        <div className="flex items-center justify-between px-3 py-1">
          <span className="font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button type="button" onClick={markAllRead} className="text-xs text-blue-700 hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <Dropdown.Divider />
        {notifications.length === 0 ? (
          <p className="px-3 py-2 text-sm text-gray-500">You&apos;re all caught up.</p>
        ) : (
          notifications.map((notification) => (
            <Dropdown.Item
              key={notification._id}
              onClick={() => open(notification)}
              className={`whitespace-normal py-2 ${notification.read ? "" : "bg-orange-50"}`}
            >
              <p className="mb-0 text-sm font-semibold">{notification.title}</p>
              <p className="mb-0 text-sm text-gray-600">{notification.message}</p>
              <p className="mb-0 text-xs text-gray-400">
                <ReactTimeAgo date={new Date(notification.createdAt)} locale="en-US" timeStyle="round" />
              </p>
            </Dropdown.Item>
          ))
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default NotificationBell;
