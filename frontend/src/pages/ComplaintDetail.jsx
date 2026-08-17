import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  FaArrowLeft,
  FaArrowUp,
  FaComment,
  FaLocationDot,
  FaPaperPlane,
} from "react-icons/fa6";
import { io } from "socket.io-client";
import api, { SOCKET_URL } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../components/IssueCard";
import PrivateChat from "../components/PrivateChat";
import ComplaintLocationMap from "../components/ComplaintLocationMap";

const socketUrl = SOCKET_URL;
const CommentThread = ({ item, complaintId, canReply, onRefresh }) => {
  const [reply, setReply] = useState("");
  const submitReply = async (event) => {
    event.preventDefault();
    if (!reply.trim()) return;
    await api.post(`/complaints/${complaintId}/comments/${item._id}/replies`, {
      body: reply.trim(),
    });
    setReply("");
    onRefresh();
  };
  return (
    <article
      className={`comment ${["mayor", "councillor"].includes(item.authorRole) ? "comment--official" : ""}`}
    >
      <div className="comment-avatar">
        {item.authorName?.[0]?.toUpperCase() || "E"}
      </div>
      <div className="comment-body">
        <Link to={`/profiles/${item.authorId}`}>
          <strong>{item.authorName}</strong>
        </Link>
        <span>
          {item.authorRole} ·{" "}
          {item.createdAt ? formatDate(item.createdAt) : "Just now"}
        </span>
        <p>{item.body}</p>
        {(item.replies || []).map((replyItem) => (
          <div
            className={`comment-reply ${["mayor", "councillor"].includes(replyItem.authorRole) ? "comment-reply--official" : ""}`}
            key={replyItem._id}
          >
            <Link to={`/profiles/${replyItem.authorId}`}>
              <strong>{replyItem.authorName}</strong>
            </Link>
            <span>{replyItem.authorRole}</span>
            <p>{replyItem.body}</p>
          </div>
        ))}
        {canReply && (
          <form className="reply-form" onSubmit={submitReply}>
            <input
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="Reply to this comment"
            />
            <button disabled={!reply.trim()}>Reply</button>
          </form>
        )}
      </div>
    </article>
  );
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
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [officerAction, setOfficerAction] = useState("approve");
  const [officerNote, setOfficerNote] = useState("");
  const load = async () => {
    try {
      const response = await api.get(`/complaints/${id}`);
      setComplaint(response.data.data);
    } catch (error) {
      setNotice(
        error.response?.data?.message || "This issue could not be found.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [id]);
  useEffect(() => {
    const socket = io(socketUrl, { transports: ["websocket", "polling"] });
    socket.emit("complaint:join", { complaintId: id });
    const refresh = (payload) => {
      if (String(payload?.complaintId) === String(id)) load();
    };
    [
      "complaint:updated",
      "complaint:voted",
      "complaint:commented",
      "complaint:comment-replied",
      "complaint:message",
      "complaint:held",
      "complaint:released",
      "complaint:report-uploaded",
    ].forEach((event) => socket.on(event, refresh));
    return () => {
      socket.emit("complaint:leave", { complaintId: id });
      socket.disconnect();
    };
  }, [id]);
  const vote = async () => {
    if (!user) return navigate("/login");
    setSaving(true);
    try {
      const response = await api.post(`/complaints/${id}/vote`, { type: "up" });
      setComplaint(response.data.data);
      setNotice("Your support was recorded.");
    } catch (error) {
      setNotice(error.response?.data?.message || "Unable to register support.");
    } finally {
      setSaving(false);
    }
  };
  const postComment = async (event) => {
    event.preventDefault();
    if (!user) return navigate("/login");
    if (!comment.trim()) return;
    setSaving(true);
    try {
      await api.post(`/complaints/${id}/comments`, { body: comment.trim() });
      await load();
      setComment("");
    } catch (error) {
      setNotice(error.response?.data?.message || "Could not post this update.");
    } finally {
      setSaving(false);
    }
  };
  const submitOfficerDecision = async (event) => {
    event.preventDefault();
    if (!officerNote.trim()) return;
    setSaving(true);
    try {
      const response = await api.post(`/complaints/${id}/review`, {
        action: officerAction,
        note: officerNote.trim(),
      });
      setComplaint(response.data.data);
      setOfficerNote("");
      setNotice("Signed decision saved and the citizen was notified.");
    } catch (error) {
      setNotice(
        error.response?.data?.message || "Could not save the officer decision.",
      );
    } finally {
      setSaving(false);
    }
  };
  if (loading)
    return (
      <main className="site-shell">
        <div className="empty-card">Loading issue…</div>
      </main>
    );
  if (!complaint)
    return (
      <main className="site-shell">
        <Link className="back-link" to="/">
          <FaArrowLeft /> Back to reports
        </Link>
        <div className="empty-card">{notice}</div>
      </main>
    );
  const ownerId = complaint.createdBy?._id || complaint.createdBy;
  const privateChatAllowed =
    user &&
    (String(ownerId) === String(user._id || user.id) ||
      ["officer", "field_worker", "councillor", "mayor", "admin"].includes(
        user.role,
      ));
  const activities = (complaint.publicLedger || []).slice().reverse();
  const visibleActivities = showAllActivity
    ? activities
    : activities.slice(0, 5);
  return (
    <main className="site-shell detail-page">
      <Link className="back-link" to="/">
        <FaArrowLeft /> All community reports
      </Link>
      {notice && <div className="notice">{notice}</div>}
      <div className="detail-layout">
        <article className="detail-story">
          <div className="issue-card__meta">
            <span className="status">{complaint.status}</span>
            <span>{complaint.category}</span>
            <span>{complaint.department}</span>
          </div>
          <h1>{complaint.title}</h1>
          <p className="detail-description">{complaint.description}</p>
          {complaint.images?.length > 0 && (
            <div className="image-grid">
              {complaint.images.map((image) => (
                <img key={image.url} src={image.url} alt="Complaint evidence" />
              ))}
            </div>
          )}
          <div className="location-line">
            <FaLocationDot /> {complaint.ward || "Ward to be confirmed"}{" "}
            <span>·</span> Reported {formatDate(complaint.createdAt)}
          </div>
          <ComplaintLocationMap location={complaint.location} />
          <div className="timeline">
            <div className="timeline-heading">
              <h2>Public activity</h2>
              <span>{activities.length} events</span>
            </div>
            {visibleActivities.map((entry, index) => (
              <div
                className="timeline-item"
                key={`${entry.createdAt}-${index}`}
              >
                <span></span>
                <div>
                  <strong>{entry.action.replaceAll("_", " ")}</strong>
                  <p>{entry.message}</p>
                  {entry.createdAt && (
                    <small>{formatDate(entry.createdAt)}</small>
                  )}
                </div>
              </div>
            ))}
            {activities.length > 5 && (
              <button
                type="button"
                className="text-button timeline-toggle"
                onClick={() => setShowAllActivity((current) => !current)}
              >
                {showAllActivity
                  ? "Show fewer activities"
                  : `Show ${activities.length - 5} more activities`}
              </button>
            )}
          </div>
        </article>
        <aside className="detail-sidebar">
          <div className="support-card">
            <FaArrowUp />
            <strong>{complaint.upvotes || 0}</strong>
            <span>people support this issue</span>
            <button
              className="button button--primary"
              type="button"
              onClick={vote}
              disabled={saving}
            >
              Support this issue
            </button>
            <small>One verified support per account.</small>
          </div>
          <div className="facts-card">
            <h2>Issue details</h2>
            <dl>
              <div>
                <dt>Department</dt>
                <dd>{complaint.department}</dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd>{complaint.priorityLevel}</dd>
              </div>
              <div>
                <dt>Current state</dt>
                <dd>{complaint.status}</dd>
              </div>
            </dl>
          </div>
          {["officer", "admin"].includes(user?.role) && (
            <form
              className="facts-card officer-case-actions"
              onSubmit={submitOfficerDecision}
            >
              <h2>Officer decision</h2>
              <select
                value={officerAction}
                onChange={(event) => setOfficerAction(event.target.value)}
              >
                <option value="approve">Approve & start work</option>
                <option value="progress">Progress update</option>
                <option value="hold">Hold pending</option>
                <option value="reject">Reject</option>
                <option value="resolve">Resolve</option>
                <option value="close">Close</option>
              </select>
              <textarea
                required
                value={officerNote}
                onChange={(event) => setOfficerNote(event.target.value)}
                placeholder="Signed public note: explain the decision or next step…"
                rows="5"
              />
              <button className="button button--primary" disabled={saving}>
                Save and notify citizen
              </button>
            </form>
          )}
        </aside>
      </div>
      <section className="discussion">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Conversation</p>
            <h2>
              <FaComment /> Public updates
            </h2>
          </div>
          <span>{complaint.comments?.length || 0} posts</span>
        </div>
        {user ? (
          <form className="comment-form" onSubmit={postComment}>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Share a useful update with your community…"
              disabled={saving}
              rows="4"
            />
            <button
              className="button button--primary"
              disabled={saving || !comment.trim()}
            >
              <FaPaperPlane /> Post update
            </button>
          </form>
        ) : (
          <div className="sign-in-prompt">
            Want to add a public update?{" "}
            <Link to="/login">Sign in to join the conversation.</Link>
          </div>
        )}
        <div className="comment-list">
          {complaint.comments?.length ? (
            complaint.comments
              .slice()
              .reverse()
              .map((item, index) => (
                <CommentThread
                  key={`${item.createdAt}-${index}`}
                  item={item}
                  complaintId={id}
                  canReply={Boolean(user)}
                  onRefresh={load}
                />
              ))
          ) : (
            <div className="empty-card">No public updates yet.</div>
          )}
        </div>
      </section>
      {privateChatAllowed && (
        <PrivateChat complaintId={id} currentUserId={user._id || user.id} />
      )}
    </main>
  );
};
export default ComplaintDetail;
