import { useEffect, useState } from "react";
import api from "../services/api";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      auth: { token },
    });
    socket.on("notification:new", loadNotifications);
    return () => socket.disconnect();
  }, [token]);

  const loadNotifications = async () => {
    try {
      const response = await api.get("/notifications");

      setNotifications(response.data.data || []);
    } catch (error) {
      console.log("Notification error", error);
    }
  };

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((items) =>
      items.map((item) => (item._id === id ? { ...item, read: true } : item)),
    );
    window.dispatchEvent(new Event("notification:received"));
  };
  const destinationFor = (item) => {
    const complaintId = item.complaint?._id || item.complaint;
    if (complaintId) return `/complaints/${complaintId}`;
    if (item.announcement) return "/official-updates";
    if (item.serviceRequest) return "/government-services";
    return "/";
  };
  const openNotification = async (item) => {
    try {
      if (!item.read) await markRead(item._id);
    } finally {
      navigate(destinationFor(item));
    }
  };

  return (
    <div className="page-container">
      <h1>Notifications</h1>

      {notifications.length === 0 ? (
        <p>No notifications yet.</p>
      ) : (
        notifications.map((item) => (
          <button
            key={item._id}
            type="button"
            className={`fine-card notification-card ${item.read ? "" : "is-unread"}`}
            onClick={() => openNotification(item)}
          >
            <h3>{item.title}</h3>

            <p>{item.message}</p>

            <small>{new Date(item.createdAt).toLocaleString()}</small>
            <span className="notification-card__link">Open related item →</span>
          </button>
        ))
      )}
    </div>
  );
};

export default Notifications;
