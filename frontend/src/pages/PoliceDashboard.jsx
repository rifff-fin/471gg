import { Link } from "react-router";

const PoliceDashboard = () => {
  return (
    <div className="page-container">
      <h1>Police Dashboard</h1>

      <p>Manage traffic violations and issue digital fines.</p>

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <Link to="/police/create-fine">
          <button className="primary-btn">Issue New Fine</button>
        </Link>

        <Link to="/police/fines">
          <button className="primary-btn">View Issued Fines</button>
        </Link>
      </div>
    </div>
  );
};

export default PoliceDashboard;
