import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";

const metrics = [
  { label: "Open incidents", value: "12", tone: "blue" },
  { label: "Pending fines", value: "8", tone: "amber" },
  { label: "Resolved today", value: "5", tone: "green" },
  { label: "Urgent alerts", value: "3", tone: "red" },
];

const actions = [
  {
    title: "Issue New Fine",
    text: "Create a traffic violation notice for an on-site incident.",
    to: "/police/create-fine",
    type: "primary",
  },
  {
    title: "Issued Fines",
    text: "Review completed notices and monitor open violations.",
    to: "/police/fines",
    type: "secondary",
  },
];

const PoliceDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="page-container police-dashboard">
      <header className="police-header">
        <div className="police-title-stack">
          <span className="police-kicker">Public safety desk</span>
          <h1>Police Desk</h1>
        </div>

        <div className="police-header-actions">
          <Link to="/police/create-fine">
            <button className="primary-btn">Issue fine</button>
          </Link>
          <Link to="/police/fines">
            <button className="secondary-btn">View fines</button>
          </Link>
        </div>
      </header>

      <p className="police-subtitle">
        Welcome back, {user?.name || "Officer"}. Manage active violations and keep the city response moving.
      </p>

      <div className="police-metrics">
        {metrics.map((item) => (
          <div key={item.label} className={`police-metric police-metric-${item.tone}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="police-card">
        <div className="police-card-header">
          <h3>Quick actions</h3>
        </div>

        <div className="police-action-grid">
          {actions.map((action) => (
            <Link key={action.title} to={action.to} className="police-action-link">
              <div className={`police-action police-action-${action.type}`}>
                <h4>{action.title}</h4>
                <p>{action.text}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PoliceDashboard;
