import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { FaArrowRight, FaMagnifyingGlass, FaPlus } from "react-icons/fa6";
import { io } from "socket.io-client";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import IssueCard from "../components/IssueCard";
import OfficialAnnouncementList from "../components/OfficialAnnouncementList";

const categories = [
  "All categories",
  "Road & Infrastructure",
  "Waste Management",
  "Water Supply",
  "Electricity",
  "Public Safety",
  "Sanitation",
  "Other",
];
const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:1141";

const Feed = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [status, setStatus] = useState("All statuses");
  const [votingId, setVotingId] = useState("");
  const [announcementKey, setAnnouncementKey] = useState(0);
  const [officialNotice, setOfficialNotice] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (query.trim()) params.search = query.trim();
      if (category !== "All categories") params.category = category;
      if (status !== "All statuses") params.status = status;
      const response = await api.get("/complaints", { params });
      setComplaints(response.data.data || []);
      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not load community reports.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      auth: { token: localStorage.getItem("token") },
    });
    const replaceComplaint = (payload) => {
      const updated = payload?.complaint;
      if (!updated?._id) return;
      setComplaints((current) =>
        current.map((item) => (item._id === updated._id ? updated : item)),
      );
    };
    const addComment = (payload) => {
      if (!payload?.complaintId) return;
      setComplaints((current) =>
        current.map((item) =>
          item._id === payload.complaintId
            ? { ...item, comments: [...(item.comments || []), payload.comment] }
            : item,
        ),
      );
    };
    socket.on("complaint:created", () => load());
    socket.on("complaint:updated", replaceComplaint);
    socket.on("complaint:voted", replaceComplaint);
    socket.on("complaint:commented", addComment);
    socket.on("announcement:published", () =>
      setAnnouncementKey((value) => value + 1),
    );
    socket.on("official:announcement", (payload) =>
      setOfficialNotice(
        payload.message || "A new official update was published.",
      ),
    );
    return () => socket.disconnect();
  }, []);

  const stats = useMemo(
    () => ({
      open: complaints.filter(
        (item) => !["Resolved", "Closed"].includes(item.status),
      ).length,
      resolved: complaints.filter((item) => item.status === "Resolved").length,
      support: complaints.reduce(
        (total, item) => total + (item.upvotes || 0),
        0,
      ),
    }),
    [complaints],
  );

  const vote = async (complaint) => {
    if (!user) return navigate("/login");
    setVotingId(complaint._id);
    try {
      const response = await api.post(`/complaints/${complaint._id}/vote`, {
        type: "up",
      });
      setComplaints((current) =>
        current.map((item) =>
          item._id === complaint._id ? response.data.data : item,
        ),
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to register support.",
      );
    } finally {
      setVotingId("");
    }
  };

  return (
    <main className="site-shell feed-page">
      <section className="feed-hero">
        <div>
          <p className="eyebrow">Ekotro · civic action network</p>
          <h1>
            Make your neighbourhood <em>work better.</em>
          </h1>
          <p>
            Report a local issue, see what is already being addressed, and add
            your voice to the concerns that matter.
          </p>
          <div className="hero-actions">
            <Link
              className="button button--primary"
              to={user ? "/report" : "/login"}
            >
              <FaPlus /> Report an issue
            </Link>
            <a className="button button--quiet" href="#issues">
              Browse reports <FaArrowRight />
            </a>
          </div>
        </div>
        <div className="hero-stats">
          <div>
            <strong>{stats.open}</strong>
            <span>open reports</span>
          </div>
          <div>
            <strong>{stats.support}</strong>
            <span>community supports</span>
          </div>
          <div>
            <strong>{stats.resolved}</strong>
            <span>resolved</span>
          </div>
        </div>
      </section>

      {officialNotice && (
        <div className="official-toast" role="status">
          {officialNotice}
          <button type="button" onClick={() => setOfficialNotice("")}>
            ×
          </button>
        </div>
      )}
      <OfficialAnnouncementList refreshKey={announcementKey} />

      <section id="issues" className="feed-layout">
        <aside className="filter-card">
          <h2>Explore reports</h2>
          <label className="search-field">
            <FaMagnifyingGlass />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search issues"
            />
          </label>
          <label>
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option>All statuses</option>
              <option>Pending</option>
              <option>In Progress</option>
              <option>Held Pending</option>
              <option>Resolved</option>
              <option>Closed</option>
            </select>
          </label>
          <button className="button button--dark" type="button" onClick={load}>
            Apply filters
          </button>
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("All categories");
              setStatus("All statuses");
            }}
          >
            Clear filters
          </button>
        </aside>
        <section className="issues-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Community feed</p>
              <h2>Issues near all of us</h2>
            </div>
            <span>{complaints.length} reports</span>
          </div>
          {error && <div className="notice notice--error">{error}</div>}
          {loading ? (
            <div className="empty-card">Loading reports…</div>
          ) : complaints.length ? (
            <div className="issue-list">
              {complaints.map((item) => (
                <IssueCard
                  key={item._id}
                  complaint={item}
                  onVote={vote}
                  voting={votingId === item._id}
                />
              ))}
            </div>
          ) : (
            <div className="empty-card">
              No reports match those filters. Be the first to report an issue.
            </div>
          )}
        </section>
      </section>
    </main>
  );
};

export default Feed;
