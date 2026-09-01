import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import api, { SOCKET_URL } from "../services/api";
import { useAuth } from "../context/AuthContext";

// VIVA: Interactive admin dashboard — complaint statistics, department
// performance, citizen engagement, service request analytics and system
// activity, refreshed live over Socket.io.

const Bar = ({ label, value, max, suffix = "" }) => (
  <div className="admin-bar-row">
    <span className="admin-bar-label">{label}</span>
    <div className="admin-bar-track">
      <div
        className="admin-bar-fill"
        style={{ width: `${max ? Math.round((value / max) * 100) : 0}%` }}
      />
    </div>
    <strong className="admin-bar-value">
      {value}
      {suffix}
    </strong>
  </div>
);

const Panel = ({ title, subtitle, children }) => (
  <section className="panel admin-panel">
    <header className="admin-panel__header">
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </header>
    {children}
  </section>
);

const AdminDashboard = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [liveState, setLiveState] = useState("Connecting…");

  const load = async () => {
    try {
      const response = await api.get("/complaints/admin/analytics");
      setData(response.data?.data || null);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not load admin analytics.",
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      auth: { token },
    });
    socket.on("connect", () => setLiveState("Live"));
    socket.on("disconnect", () => setLiveState("Reconnecting…"));
    // Refresh analytics whenever anything in the system changes live.
    [
      "complaint:created",
      "complaint:updated",
      "complaint:voted",
      "complaint:commented",
      "complaint:deleted",
      "complaint:report-uploaded",
      "dashboard:heatmap",
      "announcement:published",
      "notification:new",
    ].forEach((event) => socket.on(event, load));
    return () => socket.disconnect();
  }, [token]);

  if (error) {
    return <div className="center-message">{error}</div>;
  }
  if (!data) {
    return <div className="center-message">Loading admin analytics…</div>;
  }

  const { complaintStats, departmentPerformance, engagement, serviceRequestAnalytics, systemActivity } = data;
  const statusEntries = Object.entries(complaintStats.statusBreakdown || {});
  const priorityEntries = Object.entries(complaintStats.priorityBreakdown || {});
  const maxStatus = Math.max(...statusEntries.map(([, v]) => v), 1);
  const maxPriority = Math.max(...priorityEntries.map(([, v]) => v), 1);
  const maxDeptTotal = Math.max(...departmentPerformance.map((d) => d.total), 1);
  const maxServiceType = Math.max(
    ...Object.values(serviceRequestAnalytics.serviceTypeBreakdown || {}), 1,
  );

  return (
    <div className="dashboard-shell">
      <section className="hero-panel panel">
        <div className="hero-copy">
          <p className="eyebrow">Administrator control</p>
          <h1>System-wide analytics dashboard</h1>
          <p>
            Complaint statistics, department performance, citizen engagement,
            service request analytics, and overall system activity — updating
            live over Socket.io.
          </p>
          <div className="hero-actions">
            <button className="secondary-btn" type="button" onClick={load}>
              Refresh analytics
            </button>
            <span className={`live-state live-state--${liveState === "Live" ? "connected" : "pending"}`}>
              {liveState}
            </span>
          </div>
        </div>
      </section>

      <div className="stats-grid">
        <article className="mini-stat"><span>Total complaints</span><strong>{complaintStats.total}</strong></article>
        <article className="mini-stat"><span>Service requests</span><strong>{serviceRequestAnalytics.total}</strong></article>
        <article className="mini-stat"><span>Registered users</span><strong>{systemActivity.totalUsers}</strong></article>
        <article className="mini-stat"><span>Citizen interactions</span><strong>{engagement.totalComments + engagement.totalChatMessages + engagement.totalUpvotes}</strong></article>
      </div>

      <Panel title="Complaint statistics">
        <div className="admin-columns">
          <div>
            <h3>By status</h3>
            {statusEntries.map(([status, count]) => (
              <Bar key={status} label={status} value={count} max={maxStatus} />
            ))}
          </div>
          <div>
            <h3>By priority</h3>
            {priorityEntries.map(([level, count]) => (
              <Bar key={level} label={level} value={count} max={maxPriority} />
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="Department performance" subtitle="Resolution rate per responsible department">
        {departmentPerformance.map((dept) => (
          <article className="admin-dept-row" key={dept.department}>
            <div className="admin-dept-row__head">
              <strong>{dept.department}</strong>
              <span>{dept.resolutionRate}% resolved · {dept.total} cases</span>
            </div>
            <Bar label="Cases" value={dept.total} max={maxDeptTotal} />
            <Bar label="Resolved" value={dept.resolved} max={maxDeptTotal} />
            <small>
              Pending {dept.pending} · In progress {dept.inProgress} · Held {dept.held} · Rejected {dept.rejected} · Avg priority {dept.avgPriorityScore}
            </small>
          </article>
        ))}
      </Panel>

      <Panel title="Citizen engagement">
        <div className="stats-grid">
          <article className="mini-stat"><span>Upvotes</span><strong>{engagement.totalUpvotes}</strong></article>
          <article className="mini-stat"><span>Downvotes</span><strong>{engagement.totalDownvotes}</strong></article>
          <article className="mini-stat"><span>Public comments</span><strong>{engagement.totalComments}</strong></article>
          <article className="mini-stat"><span>Live chat messages</span><strong>{engagement.totalChatMessages}</strong></article>
        </div>
        {engagement.mostActiveComplaint && (
          <p className="admin-highlight">
            Most discussed: <strong>{engagement.mostActiveComplaint.title}</strong> with {engagement.mostActiveComplaint.interactions} interactions.
          </p>
        )}
      </Panel>

      <Panel title="Service request analytics">
        <div className="stats-grid">
          <article className="mini-stat"><span>Total</span><strong>{serviceRequestAnalytics.total}</strong></article>
          <article className="mini-stat"><span>Electronically signed</span><strong>{serviceRequestAnalytics.signed}</strong></article>
          <article className="mini-stat"><span>Pending</span><strong>{serviceRequestAnalytics.pending}</strong></article>
          <article className="mini-stat"><span>Avg review time (h)</span><strong>{serviceRequestAnalytics.avgReviewHours}</strong></article>
        </div>
        <h3>By service type</h3>
        {Object.entries(serviceRequestAnalytics.serviceTypeBreakdown || {}).map(([type, count]) => (
          <Bar key={type} label={type} value={count} max={maxServiceType} />
        ))}
        <h3>By status</h3>
        {Object.entries(serviceRequestAnalytics.serviceStatusBreakdown || {}).map(([status, count]) => (
          <Bar key={status} label={status} value={count} max={serviceRequestAnalytics.total || 1} />
        ))}
      </Panel>

      <Panel title="Overall system activity">
        <h3>Users by role</h3>
        {Object.entries(systemActivity.roleBreakdown || {}).map(([role, count]) => (
          <Bar key={role} label={role} value={count} max={systemActivity.totalUsers || 1} />
        ))}
        <div className="admin-columns">
          <div>
            <h3>Newest members</h3>
            {systemActivity.recentRegistrations.map((user, index) => (
              <p key={index} className="admin-feed-item">
                <strong>{user.name}</strong> · {user.role}
              </p>
            ))}
          </div>
          <div>
            <h3>Latest complaints</h3>
            {systemActivity.recentComplaints.map((item) => (
              <p key={item.complaintId} className="admin-feed-item">
                <strong>{item.title}</strong> · {item.status}
              </p>
            ))}
          </div>
          <div>
            <h3>Latest service requests</h3>
            {systemActivity.recentServiceRequests.map((item) => (
              <p key={item.requestId} className="admin-feed-item">
                <strong>{item.serviceType}</strong> · {item.status} · {item.citizen}
              </p>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
};

export default AdminDashboard;
