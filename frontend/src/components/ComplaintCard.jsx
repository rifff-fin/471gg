import { useNavigate } from "react-router";

function ComplaintCard({ complaint, onDelete }) {
  const navigate = useNavigate();

  return (
    <div className="complaint-card">
      <h3>{complaint.title}</h3>

      <p>{complaint.description}</p>

      <p>
        <strong>Status:</strong>{" "}
        <span className="status">{complaint.status}</span>
      </p>

      <p>
        <strong>Department:</strong> {complaint.department}
      </p>

      <p>
        <strong>Assigned:</strong> {complaint.assigned ? "Yes" : "No"}
      </p>

      {!complaint.assigned && (
        <div>
          <button
            className="primary-btn"
            onClick={() => navigate(`/edit-complaint/${complaint._id}`)}
          >
            Edit
          </button>

          <button
            className="danger-btn"
            onClick={() => onDelete(complaint._id)}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default ComplaintCard;
