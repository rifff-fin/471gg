import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  FaBell,
  FaCheck,
  FaClock,
  FaMagnifyingGlass,
  FaPause,
  FaUserPlus,
} from "react-icons/fa6";
import api from "../services/api";

const decisions = {
  approve: {
    label: "Start work",
    hint: "Approve and move to active work.",
    note: "Your report has been reviewed and approved. Our team has started the next steps.",
  },
  progress: {
    label: "Post progress",
    hint: "Tell the resident what happens next.",
    note: "Work is in progress. We will share another update when the next milestone is complete.",
  },
  hold: {
    label: "Put on hold",
    hint: "Pause while coordination is needed.",
    note: "This case is temporarily on hold while we complete the required review.",
  },
  reject: {
    label: "Reject with reason",
    hint: "Explain why it cannot proceed.",
    note: "We cannot proceed with this report at this time because: ",
  },
  resolve: {
    label: "Mark resolved",
    hint: "Confirm the issue is completed.",
    note: "The reported issue has been resolved. Thank you for helping us improve the city.",
  },
  close: {
    label: "Close case",
    hint: "Close a duplicate or completed case.",
    note: "This case has been closed. Please submit a new report if the issue returns.",
  },
};
const relativeDate = (value) => {
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 86400000),
  );
  return days === 0 ? "Today" : `${days}d ago`;
};

const OfficerDashboard = () => {
  const [cases, setCases] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [action, setAction] = useState("approve");
  const [note, setNote] = useState(decisions.approve.note);
  const [comment, setComment] = useState("");
  const [verificationNote, setVerificationNote] = useState(
    "Work evidence reviewed on site.",
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAccess, setShowAccess] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [unread, setUnread] = useState(0);
  const selected = cases.find((item) => item._id === selectedId) || cases[0];
  const load = async (nextStatus = status) => {
    setBusy(true);
    try {
      const [response, summary] = await Promise.all([
        api.get("/complaints/officer/cases", {
          params: {
            search: query || undefined,
            status: nextStatus || undefined,
          },
        }),
        api.get("/notifications/summary"),
      ]);
      const items = response.data.data || [];
      setCases(items);
      setUnread(summary.data.data?.unreadCount || 0);
      setSelectedId((current) =>
        items.some((item) => item._id === current)
          ? current
          : items[0]?._id || "",
      );
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Could not load the case queue.",
      );
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const refresh = () => load();
    window.addEventListener("notification:received", refresh);
    return () => window.removeEventListener("notification:received", refresh);
  }, []);
  const stats = useMemo(
    () => ({
      pending: cases.filter((item) => item.status === "Pending").length,
      active: cases.filter((item) => item.status === "In Progress").length,
      evidence: cases.reduce(
        (total, item) =>
          total +
          (item.beforeAfterReports || []).filter(
            (report) =>
              report.verificationStatus === "Submitted" ||
              !report.verificationStatus,
          ).length,
        0,
      ),
      resolved: cases.filter((item) =>
        ["Resolved", "Closed"].includes(item.status),
      ).length,
    }),
    [cases],
  );
  const chooseAction = (next) => {
    setAction(next);
    setNote(decisions[next].note);
  };
  const review = async (event) => {
    event.preventDefault();
    if (!selected || !note.trim()) return;
    setBusy(true);
    try {
      await api.post(`/complaints/${selected._id}/review`, {
        action,
        note: note.trim(),
      });
      setMessage(`Decision saved. ${selected.citizenName} has been notified.`);
      await load();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Could not save the decision.",
      );
    } finally {
      setBusy(false);
    }
  };
  const addComment = async (event) => {
    event.preventDefault();
    if (!selected || !comment.trim()) return;
    setBusy(true);
    try {
      await api.post(`/complaints/${selected._id}/comments`, {
        body: comment.trim(),
      });
      setComment("");
      setMessage("Public case comment posted.");
      await load();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Could not post the comment.",
      );
    } finally {
      setBusy(false);
    }
  };
  const verifyReport = async (report, nextAction) => {
    if (!verificationNote.trim())
      return setMessage("Add a verification note before deciding.");
    setBusy(true);
    try {
      await api.post(
        `/complaints/${selected._id}/reports/${report._id}/verify`,
        { action: nextAction, note: verificationNote.trim() },
      );
      setMessage(
        nextAction === "verify"
          ? "Work verified and complaint marked resolved."
          : "Report returned to the field worker with your note.",
      );
      await load();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Could not review the work evidence.",
      );
    } finally {
      setBusy(false);
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
      setMessage(error.response?.data?.message || "Could not update access.");
    }
  };
  return (
    <main className="site-shell officer-page">
      <header className="officer-page__hero">
        <div>
          <p className="eyebrow">Municipal officer workspace</p>
          <h1>Make the next decision clear.</h1>
          <p>
            Review cases, answer residents, verify field evidence, and keep the
            public record current.
          </p>
        </div>
        <div className="officer-hero-actions">
          <Link className="officer-inbox" to="/notifications">
            <FaBell /> Inbox {unread ? <b>{unread}</b> : null}
          </Link>
          <button
            className="officer-refresh"
            type="button"
            onClick={() => load()}
            disabled={busy}
          >
            Refresh queue
          </button>
        </div>
      </header>
      {message && (
        <div className="notice officer-notice">
          {message}
          <button type="button" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}
      <section className="officer-stats">
        <button
          type="button"
          onClick={() => {
            setStatus("Pending");
            load("Pending");
          }}
        >
          <FaClock />
          <strong>{stats.pending}</strong>
          <span>Need review</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setStatus("In Progress");
            load("In Progress");
          }}
        >
          <FaCheck />
          <strong>{stats.active}</strong>
          <span>In progress</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setStatus("");
            load("");
          }}
        >
          <FaPause />
          <strong>{stats.evidence}</strong>
          <span>Evidence waiting</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setStatus("Resolved");
            load("Resolved");
          }}
        >
          <FaCheck />
          <strong>{stats.resolved}</strong>
          <span>Resolved</span>
        </button>
      </section>
      <section className="officer-workspace">
        <aside className="officer-queue">
          <div className="officer-queue__heading">
            <h2>Case queue</h2>
            <span>{cases.length} shown</span>
          </div>
          <form
            className="officer-search"
            onSubmit={(event) => {
              event.preventDefault();
              load();
            }}
          >
            <FaMagnifyingGlass />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search resident, title, ward…"
            />
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                load(event.target.value);
              }}
            >
              <option value="">All cases</option>
              <option>Pending</option>
              <option>In Progress</option>
              <option>Held Pending</option>
              <option>Rejected</option>
              <option>Resolved</option>
            </select>
          </form>
          <div className="officer-case-list">
            {busy && !cases.length ? (
              <div className="empty-card">Loading cases…</div>
            ) : (
              cases.map((item) => (
                <button
                  type="button"
                  className={
                    selected?._id === item._id
                      ? "officer-case is-selected"
                      : "officer-case"
                  }
                  onClick={() => setSelectedId(item._id)}
                  key={item._id}
                >
                  <div>
                    <span
                      className={`status status--${String(item.status).toLowerCase().replaceAll(" ", "-")}`}
                    >
                      {item.status}
                    </span>
                    <small>{relativeDate(item.createdAt)}</small>
                  </div>
                  <strong>{item.title}</strong>
                  <p>
                    {item.ward || "Unassigned ward"} · {item.category}
                  </p>
                  <footer>
                    <span>{item.citizenName}</span>
                    <span>
                      {item.upvotes || 0} votes · {item.comments?.length || 0}{" "}
                      comments
                    </span>
                  </footer>
                </button>
              ))
            )}
          </div>
        </aside>
        <section className="officer-review-card">
          {selected ? (
            <>
              <header>
                <div>
                  <p className="eyebrow">Reviewing case</p>
                  <h2>{selected.title}</h2>
                  <p>{selected.description}</p>
                </div>
                <Link to={`/complaints/${selected._id}`}>Open public view</Link>
              </header>
              <div className="officer-context">
                <span>
                  <small>Resident</small>
                  <strong>{selected.citizenName}</strong>
                  <em>{selected.citizenEmail}</em>
                </span>
                <span>
                  <small>Community signal</small>
                  <strong>{selected.upvotes || 0} supports</strong>
                  <em>{selected.comments?.length || 0} public comments</em>
                </span>
                <span>
                  <small>Current owner</small>
                  <strong>
                    {selected.assignedOfficer?.name || "Unassigned"}
                  </strong>
                  <em>{selected.department}</em>
                </span>
              </div>
              <div className="officer-collaboration">
                <section>
                  <h3>Public conversation</h3>
                  <div className="officer-comments">
                    {selected.comments?.length ? (
                      selected.comments.slice(-3).map((item) => (
                        <article
                          key={
                            item._id || `${item.authorName}-${item.createdAt}`
                          }
                        >
                          <strong>{item.authorName}</strong>
                          <small>{item.authorRole}</small>
                          <p>{item.body}</p>
                        </article>
                      ))
                    ) : (
                      <p className="completion-empty">
                        No public comments yet.
                      </p>
                    )}
                  </div>
                  <form onSubmit={addComment}>
                    <textarea
                      rows="3"
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="Reply publicly as an officer…"
                    />
                    <button className="button button--dark" disabled={busy}>
                      Post comment
                    </button>
                  </form>
                </section>
                <section>
                  <h3>Field-work evidence</h3>
                  {selected.beforeAfterReports?.length ? (
                    selected.beforeAfterReports
                      .slice()
                      .reverse()
                      .map((report) => (
                        <article className="evidence-card" key={report._id}>
                          <div>
                            <strong>{report.submittedBy}</strong>
                            <span
                              className={`status status--${String(report.verificationStatus || "Submitted").toLowerCase()}`}
                            >
                              {report.verificationStatus || "Submitted"}
                            </span>
                          </div>
                          <p>{report.note || "No work note added."}</p>
                          <div className="evidence-images">
                            {[
                              ...(report.beforeImages || []),
                              ...(report.afterImages || []),
                            ].map((image) => (
                              <img
                                key={image.url}
                                src={image.url}
                                alt="Field-work evidence"
                              />
                            ))}
                          </div>
                          {(report.verificationStatus || "Submitted") ===
                            "Submitted" && (
                            <>
                              <textarea
                                rows="2"
                                value={verificationNote}
                                onChange={(event) =>
                                  setVerificationNote(event.target.value)
                                }
                                placeholder="Signed verification note"
                              />
                              <div className="evidence-actions">
                                <button
                                  type="button"
                                  className="button button--primary"
                                  disabled={busy}
                                  onClick={() => verifyReport(report, "verify")}
                                >
                                  Verify & mark done
                                </button>
                                <button
                                  type="button"
                                  className="button button--quiet"
                                  disabled={busy}
                                  onClick={() => verifyReport(report, "return")}
                                >
                                  Return to worker
                                </button>
                              </div>
                            </>
                          )}
                        </article>
                      ))
                  ) : (
                    <p className="completion-empty">
                      No field evidence has been submitted.
                    </p>
                  )}
                </section>
              </div>
              <form className="officer-decision" onSubmit={review}>
                <fieldset>
                  <legend>Case decision</legend>
                  <div className="decision-grid">
                    {Object.entries(decisions).map(([key, item]) => (
                      <button
                        type="button"
                        key={key}
                        className={
                          action === key
                            ? "decision-option is-selected"
                            : "decision-option"
                        }
                        onClick={() => chooseAction(key)}
                      >
                        <strong>{item.label}</strong>
                        <span>{item.hint}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label>
                  <span>Signed resident update</span>
                  <textarea
                    required
                    rows="5"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                  <small>
                    Your name, role, decision time, and note appear in the case
                    history and the resident’s inbox.
                  </small>
                </label>
                <div className="officer-decision__footer">
                  <span>Citizen receives a live inbox notification.</span>
                  <button className="button button--primary" disabled={busy}>
                    {busy ? "Saving…" : "Save decision"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="empty-card">No cases match this view.</div>
          )}
        </section>
      </section>
      <section className="officer-access">
        <button type="button" onClick={() => setShowAccess((value) => !value)}>
          <span>
            <FaUserPlus /> Team access
          </span>
          <small>{showAccess ? "Hide" : "Add an officer"}</small>
        </button>
        {showAccess && (
          <div>
            <p>
              Search a registered user by name or email, then grant officer
              access.
            </p>
            <form onSubmit={findUsers}>
              <input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Name or email"
              />
              <button className="button button--dark">Search</button>
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
          </div>
        )}
      </section>
    </main>
  );
};
export default OfficerDashboard;
