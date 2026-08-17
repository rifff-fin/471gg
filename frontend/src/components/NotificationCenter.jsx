import { useEffect, useState } from "react";
import { Link } from "react-router";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../services/api";
import { useAuth } from "../context/AuthContext";

const NotificationCenter = () => {
  const { user, token } = useAuth();
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    if (!user || !token) return undefined;
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      auth: { token },
    });
    socket.on("official:announcement", (payload) =>
      setNotice({
        message: payload.message || "A city leader shared a new post.",
      }),
    );
    socket.on("notification:new", (payload) => {
      window.dispatchEvent(new Event("notification:received"));
      setNotice({
        message:
          payload.message || payload.title || "You have a new case update.",
      });
    });
    return () => socket.disconnect();
  }, [user, token]);
  if (!notice) return null;
  return (
    <aside className="official-toast app-notification" role="status">
      <span>{notice.message}</span>
      <Link to="/notifications" onClick={() => setNotice(null)}>
        View inbox
      </Link>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => setNotice(null)}
      >
        ×
      </button>
    </aside>
  );
};

export default NotificationCenter;
