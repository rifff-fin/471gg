import { useEffect, useState } from "react";
import api from "../services/api";

const PrivateChat = ({ complaintId }) => {
  const [messages, setMessages] = useState([]); const [text, setText] = useState(""); const [error, setError] = useState("");
  const load = async () => { try { const response = await api.get(`/complaints/${complaintId}/messages`); setMessages(response.data.data || []); } catch (requestError) { setError(requestError.response?.data?.message || "Private conversation unavailable."); } };
  useEffect(() => { load(); }, [complaintId]);
  const send = async (event) => { event.preventDefault(); if (!text.trim()) return; try { await api.post(`/complaints/${complaintId}/messages`, { body: text.trim() }); setText(""); load(); } catch (requestError) { setError(requestError.response?.data?.message || "Could not send message."); } };
  return <section className="private-chat"><div className="section-heading"><div><p className="eyebrow">Private channel</p><h2>Reporter & authority chat</h2></div></div>{error ? <div className="notice notice--error">{error}</div> : <><div className="chat-feed">{messages.map((message, index) => <div className="chat-message" key={`${message.createdAt}-${index}`}><strong>{message.authorName}</strong><span>{message.authorRole}</span><p>{message.body}</p></div>)}</div><form className="reply-form" onSubmit={send}><input value={text} onChange={(event) => setText(event.target.value)} placeholder="Write a private message" /><button disabled={!text.trim()}>Send</button></form></>}</section>;
};
export default PrivateChat;
