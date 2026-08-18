import { useEffect, useState } from "react";
import { FaHelmetSafety, FaPaperPlane } from "react-icons/fa6";
import { io } from "socket.io-client";
import api, { SOCKET_URL } from "../services/api";
import { useAuth } from "../context/AuthContext";

const CrewChat = ({ complaintId, currentUserId }) => {
  const { token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const response = await api.get(`/complaints/${complaintId}/crew-messages`);
      setMessages(response.data.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Crew conversation unavailable.");
    }
  };

  useEffect(() => {
    load();
  }, [complaintId]);

  useEffect(() => {
    if (!token) return undefined;
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      auth: { token },
    });
    socket.on("connect", () => {
      socket.emit("coordination:join", { complaintId });
    });
    socket.on("crew-chat:message", (payload) => {
      if (String(payload?.complaintId) !== String(complaintId) || !payload.message) return;
      setMessages((items) => {
        if (items.some((item) => String(item._id) === String(payload.message._id))) return items;
        return [...items, payload.message];
      });
    });
    return () => {
      socket.emit("coordination:leave", { complaintId });
      socket.disconnect();
    };
  }, [complaintId, token]);

  const send = async (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    try {
      await api.post(`/complaints/${complaintId}/crew-messages`, { body: text.trim() });
      setText("");
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not send the crew message.");
    }
  };

  return (
    <section className="private-chat crew-chat">
      <header className="private-chat__header">
        <div>
          <p className="eyebrow"><FaHelmetSafety /> Internal crew channel</p>
          <h2>Officer & field worker chat</h2>
          <span>Only municipal officers and field workers can view this conversation.</span>
        </div>
      </header>
      {error ? <div className="notice notice--error">{error}</div> : <>
        <div className="chat-feed">
          {messages.length ? messages.map((message, index) => {
            const mine = String(message.authorId) === String(currentUserId);
            return <div className={`chat-message ${mine ? "chat-message--mine" : "chat-message--theirs"}`} key={message._id || `${message.createdAt}-${index}`}>
              <div className="chat-message__meta"><strong>{mine ? "You" : message.authorName}</strong><span>{message.authorRole}</span></div>
              <p>{message.body}</p>
            </div>;
          }) : <div className="chat-empty">Start the maintenance coordination conversation.</div>}
        </div>
        <form className="chat-compose" onSubmit={send}>
          <input value={text} maxLength="1500" onChange={(event) => setText(event.target.value)} placeholder="Write an internal update to the crew…" />
          <button disabled={!text.trim()}><FaPaperPlane /> Send</button>
        </form>
      </>}
    </section>
  );
};

export default CrewChat;
