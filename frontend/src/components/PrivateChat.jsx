import { useEffect, useState } from "react";
import { FaLock, FaPaperPlane } from "react-icons/fa6";
import api from "../services/api";

const PrivateChat = ({ complaintId, currentUserId }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    try {
      const response = await api.get(`/complaints/${complaintId}/messages`);
      setMessages(response.data.data || []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Private conversation unavailable.",
      );
    }
  };
  useEffect(() => {
    load();
  }, [complaintId]);
  const send = async (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    try {
      await api.post(`/complaints/${complaintId}/messages`, {
        body: text.trim(),
      });
      setText("");
      load();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Could not send message.",
      );
    }
  };
  return (
    <section className="private-chat">
      <header className="private-chat__header">
        <div>
          <p className="eyebrow">
            <FaLock /> Private channel
          </p>
          <h2>Reporter & authority chat</h2>
          <span>
            Only the reporter and assigned municipal authority can view this
            conversation.
          </span>
        </div>
      </header>
      {error ? (
        <div className="notice notice--error">{error}</div>
      ) : (
        <>
          <div className="chat-feed">
            {messages.length ? (
              messages.map((message, index) => {
                const mine = String(message.authorId) === String(currentUserId);
                return (
                  <div
                    className={`chat-message ${mine ? "chat-message--mine" : "chat-message--theirs"}`}
                    key={`${message.createdAt}-${index}`}
                  >
                    <div className="chat-message__meta">
                      <strong>{mine ? "You" : message.authorName}</strong>
                      <span>{message.authorRole}</span>
                    </div>
                    <p>{message.body}</p>
                  </div>
                );
              })
            ) : (
              <div className="chat-empty">
                Start the secure case conversation.
              </div>
            )}
          </div>
          <form className="chat-compose" onSubmit={send}>
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Write a private message…"
            />
            <button disabled={!text.trim()}>
              <FaPaperPlane /> Send
            </button>
          </form>
        </>
      )}
    </section>
  );
};
export default PrivateChat;
