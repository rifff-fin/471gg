import { useEffect, useState } from "react";
import { Link } from "react-router";
import { FaBell } from "react-icons/fa6";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const NotificationBell = () => {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const load = async () => {
    try {
      const response = await api.get("/notifications/summary");
      setUnread(response.data.data?.unreadCount || 0);
    } catch {
      setUnread(0);
    }
  };
  useEffect(() => {
    if (user) load();
  }, [user]);
  useEffect(() => {
    const refresh = () => load();
    window.addEventListener("notification:received", refresh);
    return () => window.removeEventListener("notification:received", refresh);
  }, []);
  if (!user) return null;
  return (
    <Link
      className="notification-bell"
      to="/notifications"
      aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
    >
      <FaBell />
      {unread > 0 && <span>{unread > 99 ? "99+" : unread}</span>}
    </Link>
  );
};

export default NotificationBell;
