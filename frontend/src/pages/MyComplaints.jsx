import { useEffect, useState } from "react";
import { Link } from "react-router";
import { FaPen, FaTrash, FaUser } from "react-icons/fa6";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const steps = ["Pending", "In Progress", "Resolved"];
const progressFor = (status) =>
  status === "Resolved" || status === "Closed"
    ? 100
    : status === "In Progress"
      ? 55
      : status === "Held Pending"
        ? 30
        : 18;

const MyComplaints = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const load = async () => {
    try {
      const response = await api.get("/complaints/my");
      setComplaints(response.data.data || []);
    } catch (error) {
      setNotice(
        error.response?.data?.message || "Could not load your reports.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const remove = async (id) => {
    if (!window.confirm("Delete this unassigned report?")) return;
    try {
      await api.delete(`/complaints/${id}`);
      setComplaints((current) => current.filter((item) => item._id !== id));
    } catch (error) {
      setNotice(
        error.response?.data?.message || "Could not delete this report.",
      );
    }
  };
  return (
    <main className="site-shell my-reports-page">
      <section className="my-reports-hero">
        <div>
          <p className="eyebrow">Your civic record</p>
          <h1>My reports</h1>
          <p>
            Track every issue you have raised and keep your details current.
          </p>
        </div>
        <Link className="button button--dark" to="/profile">
          <FaUser /> My profile
        </Link>
      </section>
      {notice && <div className="notice notice--error">{notice}</div>}
      {loading ? (
        <div className="empty-card">Loading your reports…</div>
      ) : complaints.length ? (
        <div className="my-report-list">
          {complaints.map((item) => (
            <article className="my-report" key={item._id}>
              <div className="my-report__heading">
                <div>
                  <span className="status">{item.status}</span>
                  <Link to={`/complaints/${item._id}`}>
                    <h2>{item.title}</h2>
                  </Link>
                  <p>
                    {item.category} · {item.department}
                  </p>
                </div>
                <strong>{progressFor(item.status)}%</strong>
              </div>
              <div className="progress-track">
                <span style={{ width: `${progressFor(item.status)}%` }} />
              </div>
              <div className="progress-steps">
                {steps.map((step) => (
                  <span
                    className={
                      progressFor(item.status) >= progressFor(step)
                        ? "done"
                        : ""
                    }
                    key={step}
                  >
                    {step}
                  </span>
                ))}
              </div>
              <div className="my-report__actions">
                <Link
                  className="button button--quiet-dark"
                  to={`/complaints/${item._id}`}
                >
                  Open case
                </Link>
                {!item.assigned && (
                  <Link
                    className="text-button"
                    to={`/edit-complaint/${item._id}`}
                  >
                    <FaPen /> Edit
                  </Link>
                )}
                {!item.assigned && (
                  <button
                    className="text-button danger-text"
                    onClick={() => remove(item._id)}
                  >
                    <FaTrash /> Delete
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-card">You have not submitted a report yet.</div>
      )}
    </main>
  );
};
export default MyComplaints;
