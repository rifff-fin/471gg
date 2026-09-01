import { Link } from "react-router";
import { FaArrowUp, FaClock, FaComment, FaLocationDot } from "react-icons/fa6";

const statusClass = (status) =>
  String(status || "Pending")
    .toLowerCase()
    .replace(/\s+/g, "-");

export const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "recently";
  return new Intl.DateTimeFormat("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const IssueCard = ({ complaint = {}, onVote, voting = false }) => {
  const title = complaint.title || "Untitled community report";
  const commentCount = Array.isArray(complaint.comments)
    ? complaint.comments.length
    : 0;
  return (
    <article className="issue-card">
      <div className="issue-card__content">
        <div className="issue-card__meta">
          <span className={`status status--${statusClass(complaint.status)}`}>
            {complaint.status || "Pending"}
          </span>
          <span>{complaint.category || "General"}</span>
          {complaint.ward && (
            <span>
              <FaLocationDot /> {complaint.ward}
            </span>
          )}
        </div>
        <Link
          className="issue-card__title"
          to={`/complaints/${complaint._id || ""}`}
        >
          {title}
        </Link>
        {complaint.images?.length > 0 && (
          <div className="issue-card__images">
            {complaint.images.slice(0, 2).map((image) => (
              <img
                key={image.url || image.publicId || image.originalName}
                src={image.url}
                alt={title}
              />
            ))}
          </div>
        )}
        <p>{complaint.description || "No description was provided."}</p>
        <div className="issue-card__footer">
          <span>
            <FaClock /> Reported {formatDate(complaint.createdAt)}
          </span>
          <span>
            <FaComment /> {commentCount} updates
          </span>
          <span>Assigned to {complaint.department || "triage"}</span>
        </div>
      </div>
      <div className="vote-box">
        <button
          type="button"
          onClick={() => onVote?.(complaint)}
          disabled={voting || !complaint._id}
          aria-label={`Support ${title}`}
        >
          <FaArrowUp />
        </button>
        <strong>{complaint.upvotes || 0}</strong>
        <span>support</span>
      </div>
    </article>
  );
};

export default IssueCard;
