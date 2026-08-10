import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { FaArrowLeft, FaArrowUp, FaComment, FaLocationDot, FaPaperPlane } from "react-icons/fa6";
import { io } from "socket.io-client";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../components/IssueCard";
import PrivateChat from "../components/PrivateChat";

const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:1141";

const CommentThread = ({ item, complaintId, canReply, onRefresh }) => {
  const [reply, setReply] = useState("");
  const submitReply = async (event) => {
    event.preventDefault();
    if (!reply.trim()) return;
    await api.post(`/complaints/${complaintId}/comments/${item._id}/replies`, { body: reply.trim() });
    setReply(""); onRefresh();
  };
  return <article className="comment"><div className="comment-avatar">{item.authorName?.charAt(0)?.toUpperCase() || "E"}</div><div className="comment-body"><Link to={`/profiles/${item.authorId}`}><strong>{item.authorName}</strong></Link><span>{item.authorRole} · {item.createdAt ? formatDate(item.createdAt) : "Just now"}</span><p>{item.body}</p>{(item.replies || []).map((replyItem) => <div className="comment-reply" key={replyItem._id}><Link to={`/profiles/${replyItem.authorId}`}><strong>{replyItem.authorName}</strong></Link><span>{replyItem.authorRole}</span><p>{replyItem.body}</p></div>)}{canReply && <form className="reply-form" onSubmit={submitReply}><input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply to this comment" /><button disabled={!reply.trim()}>Reply</button></form>}</div></article>;
};

const ComplaintDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const load = async () => {
    try { const response = await api.get(`/complaints/${id}`); setComplaint(response.data.data); }
    catch (error) { setNotice(error.response?.data?.message || "This issue could not be found."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    const socket = io(socketUrl, { transports: ["websocket", "polling"] });
    socket.emit("complaint:join", { complaintId: id });
    const refreshIssue = (payload) => {
      if (String(payload?.complaintId) === String(id)) load();
    };
    socket.on("complaint:updated", refreshIssue);
    socket.on("complaint:voted", refreshIssue);
    socket.on("complaint:commented", refreshIssue);
    socket.on("complaint:held", refreshIssue);
    socket.on("complaint:released", refreshIssue);
    socket.on("complaint:report-uploaded", refreshIssue);
    return () => { socket.emit("complaint:leave", { complaintId: id }); socket.disconnect(); };
  }, [id]);

  const vote = async () => {
    if (!user) return navigate("/login");
    setSaving(true);
    try { const response = await api.post(`/complaints/${id}/vote`, { type: "up" }); setComplaint(response.data.data); setNotice("Your support was recorded."); }
    catch (error) { setNotice(error.response?.data?.message || "Unable to register support."); }
    finally { setSaving(false); }
  };
  const postComment = async (event) => {
    event.preventDefault();
    if (!user) return navigate("/login");
    if (!comment.trim()) return;
    setSaving(true);
    try {
      await api.post(`/complaints/${id}/comments`, { body: comment.trim() });
      await load();
      setComment(""); setNotice("Your update is now public.");
    } catch (error) { setNotice(error.response?.data?.message || "Could not post this update."); }
    finally { setSaving(false); }
  };

  if (loading) return <main className="site-shell"><div className="empty-card">Loading issue…</div></main>;
  if (!complaint) return <main className="site-shell"><Link className="back-link" to="/"><FaArrowLeft /> Back to reports</Link><div className="empty-card">{notice}</div></main>;
  const ownerId = complaint.createdBy?._id || complaint.createdBy;
  const privateChatAllowed = user && (String(ownerId) === String(user._id || user.id) || ["officer", "field_worker", "councillor", "mayor", "admin"].includes(user.role));

  return <main className="site-shell detail-page">
    <Link className="back-link" to="/"><FaArrowLeft /> All community reports</Link>
    {notice && <div className="notice">{notice}</div>}
    <div className="detail-layout">
      <article className="detail-story">
        <div className="issue-card__meta"><span className={`status status--${complaint.status.toLowerCase().replace(/\s+/g, "-")}`}>{complaint.status}</span><span>{complaint.category}</span><span>{complaint.department}</span></div>
        <h1>{complaint.title}</h1>
        <p className="detail-description">{complaint.description}</p>
        {complaint.images?.length > 0 && <div className="image-grid">{complaint.images.map((image) => <img key={image.url} src={image.url} alt="Complaint evidence" />)}</div>}
        <div className="location-line"><FaLocationDot /> {complaint.ward || "Ward to be confirmed"} <span>·</span> Reported {formatDate(complaint.createdAt)}</div>
        <div className="timeline"><h2>Public activity</h2>{(complaint.publicLedger || []).slice().reverse().map((entry, index) => <div className="timeline-item" key={`${entry.createdAt}-${index}`}><span></span><div><strong>{entry.action.replaceAll("_", " ")}</strong><p>{entry.message}</p>{entry.createdAt && <small>{formatDate(entry.createdAt)}</small>}</div></div>)}</div>
      </article>
      <aside className="detail-sidebar">
        <div className="support-card"><FaArrowUp /><strong>{complaint.upvotes || 0}</strong><span>people support this issue</span><button className="button button--primary" type="button" onClick={vote} disabled={saving}>Support this issue</button><small>One verified support per account.</small></div>
        <div className="facts-card"><h2>Issue details</h2><dl><div><dt>Department</dt><dd>{complaint.department}</dd></div><div><dt>Priority</dt><dd>{complaint.priorityLevel}</dd></div><div><dt>Current state</dt><dd>{complaint.status}</dd></div></dl></div>
      </aside>
    </div>
    <section className="discussion"><div className="section-heading"><div><p className="eyebrow">Conversation</p><h2><FaComment /> Public updates</h2></div><span>{complaint.comments?.length || 0} posts</span></div>
      {user ? <form className="comment-form" onSubmit={postComment}><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Share a useful update with your community…" disabled={saving} rows="4" /><button className="button button--primary" disabled={saving || !comment.trim()}><FaPaperPlane /> Post update</button></form> : <div className="sign-in-prompt">Want to add a public update? <Link to="/login">Sign in to join the conversation.</Link></div>}
      <div className="comment-list">{complaint.comments?.length ? complaint.comments.slice().reverse().map((item, index) => <CommentThread key={`${item.createdAt}-${index}`} item={item} complaintId={id} canReply={Boolean(user)} onRefresh={load} />) : <div className="empty-card">No public updates yet. Add the first useful update.</div>}</div>
    </section>
    {privateChatAllowed && <PrivateChat complaintId={id} />}
  </main>;
};
export default ComplaintDetail;
