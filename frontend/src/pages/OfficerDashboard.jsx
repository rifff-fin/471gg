import { useEffect, useState } from "react";
import { Link } from "react-router";
import api from "../services/api";

const actions = ["approve", "progress", "hold", "reject", "resolve", "close"];

const OfficerDashboard = () => {
  const [cases, setCases] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [action, setAction] = useState("approve");
  const [message, setMessage] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [users, setUsers] = useState([]);
  const load = async () => {
    const response = await api.get("/complaints/officer/cases", {
      params: { search: query || undefined, status: status || undefined },
    });
    setCases(response.data.data || []);
  };
  useEffect(() => {
    load().catch((error) =>
      setMessage(error.response?.data?.message || "Could not load cases."),
    );
  }, []);
  const review = async (event) => {
    event.preventDefault();
    if (!selected) return;
    try {
      await api.post(`/complaints/${selected._id}/review`, { action, note });
      setNote("");
      setMessage("Decision saved and the citizen has been notified.");
      await load();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Could not save the decision.",
      );
    }
  };
  const findUsers = async (event) => {
    event.preventDefault();
    try {
      const response = await api.get("/officers/users", {
        params: { search: userSearch },
      });
      setUsers(response.data.data || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "User search failed.");
    }
  };
  const promote = async (id) => {
    try {
      const response = await api.patch(`/officers/users/${id}/promote`);
      setUsers((items) =>
        items.map((user) => (user._id === id ? response.data.data : user)),
      );
      setMessage(response.data.message);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Could not update this user.",
      );
    }
  };
  return (
    <main className="site-shell officer-page">
      <header className="officer-page__hero">
        <div>
          <p className="eyebrow">Municipal officer workspace</p>
          <h1>Review and resolve resident cases.</h1>
          <p>
            Every decision is signed, added to the public case history, and
            delivered to the reporting citizen.
          </p>
        </div>
        <strong>{cases.length} active cases</strong>
      </header>
      {message && <div className="notice">{message}</div>}
      <section className="officer-grid">
        <aside className="officer-panel">
          <h2>Case queue</h2>
          <form
            className="officer-filters"
            onSubmit={(event) => {
              event.preventDefault();
              load();
            }}
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, citizen, ward…"
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All statuses</option>
              <option>Pending</option>
              <option>In Progress</option>
              <option>Held Pending</option>
              <option>Rejected</option>
              <option>Resolved</option>
            </select>
            <button className="button button--primary">Search</button>
          </form>
          <div className="officer-case-list">
            {cases.map((item) => (
              <button
                type="button"
                className={
                  selected?._id === item._id
                    ? "officer-case is-selected"
                    : "officer-case"
                }
                onClick={() => setSelected(item)}
                key={item._id}
              >
                <span
                  className={`status status--${String(item.status).toLowerCase().replaceAll(" ", "-")}`}
                >
                  {item.status}
                </span>
                <strong>{item.title}</strong>
                <small>
                  {item.citizenName} · {item.category} ·{" "}
                  {item.comments?.length || 0} comments
                </small>
              </button>
            ))}
          </div>
        </aside>
        <section className="officer-panel officer-review">
          {selected ? (
            <>
              <div className="officer-review__heading">
                <div>
                  <span className="eyebrow">Selected complaint</span>
                  <h2>{selected.title}</h2>
                  <p>{selected.description}</p>
                </div>
                <Link to={`/complaints/${selected._id}`}>Open public case</Link>
              </div>
              <dl>
                <div>
                  <dt>Citizen</dt>
                  <dd>
                    {selected.citizenName} ({selected.citizenEmail})
                  </dd>
                </div>
                <div>
                  <dt>Ward</dt>
                  <dd>{selected.ward || "Unassigned"}</dd>
                </div>
                <div>
                  <dt>Engagement</dt>
                  <dd>
                    {selected.comments?.length || 0} comments ·{" "}
                    {selected.upvotes || 0} supports
                  </dd>
                </div>
              </dl>
              <form onSubmit={review} className="officer-decision">
                <label>
                  Decision
                  <select
                    value={action}
                    onChange={(event) => setAction(event.target.value)}
                  >
                    {actions.map((item) => (
                      <option key={item} value={item}>
                        {item[0].toUpperCase() + item.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Signed public note
                  <textarea
                    required
                    rows="5"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Explain the decision, next step, or what must be corrected…"
                  />
                </label>
                <button className="button button--primary">
                  Save decision and notify citizen
                </button>
              </form>
            </>
          ) : (
            <div className="empty-card">Select a complaint to review it.</div>
          )}
        </section>
      </section>
      <section className="officer-panel officer-users">
        <h2>Officer access</h2>
        <p>Search a registered user and grant the officer role.</p>
        <form onSubmit={findUsers}>
          <input
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder="Name or email"
          />
          <button className="button button--dark">Find user</button>
        </form>
        {users.map((user) => (
          <div className="officer-user" key={user._id}>
            <span>
              <strong>{user.name}</strong>
              <small>
                {user.email} · {user.role}
              </small>
            </span>
            <button
              className="button button--primary"
              type="button"
              onClick={() => promote(user._id)}
              disabled={user.role === "officer"}
            >
              Make officer
            </button>
          </div>
        ))}
      </section>
    </main>
  );
};

export default OfficerDashboard;
