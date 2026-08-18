import { useEffect, useMemo, useRef, useState } from "react";
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
import { io } from "socket.io-client";
import { SOCKET_URL } from "../services/api";
import { useAuth } from "../context/AuthContext";

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
  const { token } = useAuth();
  const coordinationSocket = useRef(null);
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
  const [serviceRequests, setServiceRequests] = useState([]);
  const [selectedServiceRequestId, setSelectedServiceRequestId] = useState("");
  const [serviceStatus, setServiceStatus] = useState("Processing");
  const [serviceNote, setServiceNote] = useState("");
  const [socketState, setSocketState] = useState("Connecting…");
  const [liveEvents, setLiveEvents] = useState([]);
  const [coordinationDraft, setCoordinationDraft] = useState("");
  const [crewSearch, setCrewSearch] = useState("");
  const [crewCandidates, setCrewCandidates] = useState([]);
  const [selectedCrew, setSelectedCrew] = useState(null);
  const [assignmentTask, setAssignmentTask] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const selected = cases.find((item) => item._id === selectedId) || cases[0];
  const selectedServiceRequest =
    serviceRequests.find((item) => item._id === selectedServiceRequestId) ||
    serviceRequests[0];
  const load = async (nextStatus = status) => {
    setBusy(true);
    try {
      const [response, summary, serviceRequestResponse] = await Promise.all([
        api.get("/complaints/officer/cases", {
          params: {
            search: query || undefined,
            status: nextStatus || undefined,
          },
        }),
        api.get("/notifications/summary"),
        api.get("/service-requests/officer"),
      ]);
      const items = response.data.data || [];
      setCases(items);
      setUnread(summary.data.data?.unreadCount || 0);
      const requests = serviceRequestResponse.data.data || [];
      setServiceRequests(requests);
      setSelectedServiceRequestId((current) =>
        requests.some((item) => item._id === current)
          ? current
          : requests[0]?._id || "",
      );
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
  useEffect(() => {
    if (!token || !selected?._id) return undefined;
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      auth: { token },
    });
    coordinationSocket.current = socket;
    const appendEvent = (type, payload) => {
      if (String(payload?.complaintId) !== String(selected._id)) return;
      setLiveEvents((items) => [
        { id: `${type}-${payload.id || payload.assignmentId || Date.now()}`, type, payload },
        ...items,
      ].slice(0, 20));
    };
    socket.on("connect", () => {
      setSocketState("Live");
      socket.emit("coordination:join", { complaintId: selected._id });
    });
    socket.on("disconnect", () => setSocketState("Reconnecting…"));
    socket.on("coordination:error", (payload) => setMessage(payload.message));
    socket.on("coordination:message", (payload) => appendEvent("message", payload));
    socket.on("coordination:assignment", (payload) => appendEvent("assignment", payload));
    socket.on("coordination:assignment_response", (payload) => appendEvent("assignment_response", payload));
    socket.on("coordination:progress", (payload) => appendEvent("progress", payload));
    return () => {
      socket.emit("coordination:leave", { complaintId: selected._id });
      socket.disconnect();
      coordinationSocket.current = null;
    };
  }, [token, selected?._id]);
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
    // VIVA: Officer decision and note are sent to the backend, which changes complaint status.
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
  const updateServiceRequest = async (event) => {
    event.preventDefault();
    if (!selectedServiceRequest || !serviceNote.trim()) {
      setMessage("Choose a service request and add an officer comment.");
      return;
    }
    setBusy(true);
    try {
      await api.patch(`/service-requests/${selectedServiceRequest._id}`, {
        status: serviceStatus,
        officerComment: serviceNote.trim(),
      });
      setMessage(
        `Service request ${serviceStatus.toLowerCase()}. The citizen received a live notification.`,
      );
      setServiceNote("");
      await load();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Could not update the service request.",
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
  const searchCrew = async (event) => {
    event.preventDefault();
    if (crewSearch.trim().length < 2) {
      setMessage("Enter at least two characters to find a field crew member.");
      return;
    }
    try {
      const response = await api.get("/officers/users", {
        params: { search: crewSearch.trim() },
      });
      const fieldWorkers = (response.data.data || []).filter(
        (person) => person.role === "field_worker",
      );
      setCrewCandidates(fieldWorkers);
      if (!fieldWorkers.length) setMessage("No field crew member matched that search.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not find field crew.");
    }
  };
  const sendCoordinationMessage = (event) => {
    event.preventDefault();
    if (!coordinationDraft.trim() || !selected) return;
    coordinationSocket.current?.emit(
      "coordination:message",
      { complaintId: selected._id, body: coordinationDraft.trim() },
      (result) => {
        if (!result?.ok) setMessage(result?.message || "Message could not be sent.");
        else setCoordinationDraft("");
      },
    );
  };
  const assignCrew = async (event) => {
    event.preventDefault();
    const crewEmail = selectedCrew?.email || crewSearch.trim();
    if (!crewEmail || !assignmentTask.trim() || !selected) {
      setMessage("Enter the field worker email and describe the repair task.");
      return;
    }
    setBusy(true);
    try {
      const response = await api.post(`/complaints/${selected._id}/assignments`, {
        crewMemberId: selectedCrew?._id,
        crewEmail,
        taskDescription: assignmentTask.trim(),
        estimatedTime,
      });
      setAssignmentTask("");
      setEstimatedTime("");
      setMessage(response.data.message);
    } catch (error) {
      setMessage(error.response?.data?.message || "Crew assignment could not be sent.");
    } finally {
      setBusy(false);
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
              <section className="live-coordination" aria-live="polite">
                <header>
                  <div>
                    <p className="eyebrow">Active maintenance bridge</p>
                    <h3>Officer & field crew coordination</h3>
                  </div>
                  <span className={`live-state live-state--${socketState === "Live" ? "connected" : "pending"}`}>
                    {socketState}
                  </span>
                </header>
                <div className="coordination-grid">
                  <section>
                    <h4>Live internal updates</h4>
                    <div className="coordination-feed">
                      {liveEvents.length ? liveEvents.map((event) => (
                        <article key={event.id}>
                          <strong>{event.type.replaceAll("_", " ")}</strong>
                          {event.type === "message" && <p>{event.payload.senderName}: {event.payload.body}</p>}
                          {event.type === "assignment" && <p>{event.payload.assignedByName} assigned: {event.payload.taskDescription}</p>}
                          {event.type === "assignment_response" && <p>{event.payload.crewMemberName} {event.payload.status} the assignment.</p>}
                          {event.type === "progress" && <p>{event.payload.crewMemberName}: {event.payload.progressPercentage}% — {event.payload.currentPhase}</p>}
                          <small>{new Date(event.payload.timestamp).toLocaleTimeString()}</small>
                        </article>
                      )) : <p className="completion-empty">No live coordination updates for this case yet.</p>}
                    </div>
                    <form className="coordination-compose" onSubmit={sendCoordinationMessage}>
                      <textarea rows="2" value={coordinationDraft} onChange={(event) => setCoordinationDraft(event.target.value)} placeholder="Send an internal instruction to the assigned field crew…" />
                      <button className="button button--dark" disabled={busy || socketState !== "Live" || !coordinationDraft.trim()}>Send update</button>
                    </form>
                  </section>
                  <section>
                    <h4>Assign field crew</h4>
                    <form className="crew-search" onSubmit={searchCrew}>
                      <input type="email" value={crewSearch} onChange={(event) => { setCrewSearch(event.target.value); setSelectedCrew(null); }} placeholder="Field worker email (e.g. field@worker.com)" />
                      <button className="button button--quiet crew-search__button">Find crew</button>
                    </form>
                    {crewCandidates.length > 0 && <div className="crew-candidates">
                      {crewCandidates.map((person) => <button type="button" key={person._id} className={selectedCrew?._id === person._id ? "is-selected" : ""} onClick={() => setSelectedCrew(person)}>{person.name}<small>{person.ward || "No ward"}</small></button>)}
                    </div>}
                    <form className="crew-assignment" onSubmit={assignCrew}>
                      <p>{selectedCrew ? `Selected: ${selectedCrew.name} (${selectedCrew.email})` : "Enter the field worker email, or use Find crew to confirm the account."}</p>
                      <textarea rows="2" value={assignmentTask} onChange={(event) => setAssignmentTask(event.target.value)} placeholder="Repair task and required action" />
                      <input value={estimatedTime} onChange={(event) => setEstimatedTime(event.target.value)} placeholder="Estimated completion time (optional)" />
                      <button className="button button--primary" disabled={busy || !crewSearch.trim() || !assignmentTask.trim()}>Send assignment</button>
                    </form>
                  </section>
                </div>
              </section>
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
                            <div>
                              <small>Before</small>
                              {(report.beforeImages || []).map((image) => (
                                <img
                                  key={image.url}
                                  src={image.url}
                                  alt="Before work evidence"
                                />
                              ))}
                            </div>
                            <div>
                              <small>After</small>
                              {(report.afterImages || []).map((image) => (
                                <img
                                  key={image.url}
                                  src={image.url}
                                  alt="After work evidence"
                                />
                              ))}
                            </div>
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
      <section className="service-request-review" aria-labelledby="service-request-heading">
        <header>
          <div>
            <p className="eyebrow">Government services</p>
            <h2 id="service-request-heading">Review and electronically sign requests</h2>
            <p>Choose a resident request, record the decision, and send the signed update.</p>
          </div>
          <span>{serviceRequests.length} request{serviceRequests.length === 1 ? "" : "s"}</span>
        </header>
        {serviceRequests.length ? (
          <div className="service-request-review__body">
            <div className="service-request-review__list" aria-label="Service request queue">
              {serviceRequests.map((request) => (
                <button
                  type="button"
                  key={request._id}
                  className={selectedServiceRequest?._id === request._id ? "is-selected" : ""}
                  onClick={() => {
                    setSelectedServiceRequestId(request._id);
                    setServiceStatus(request.status === "Pending" ? "Processing" : request.status);
                    setServiceNote(request.officerComment || "");
                  }}
                >
                  <span className={`status status--${request.status.toLowerCase()}`}>{request.status}</span>
                  <strong>{request.serviceType}</strong>
                  <small>{request.citizen?.name || "Citizen"}</small>
                </button>
              ))}
            </div>
            {selectedServiceRequest && (
              <form className="service-request-review__form" onSubmit={updateServiceRequest}>
                <div>
                  <h3>{selectedServiceRequest.serviceType}</h3>
                  <p>{selectedServiceRequest.description}</p>
                  <small>Requested by {selectedServiceRequest.citizen?.name || "Citizen"} ({selectedServiceRequest.citizen?.email || "No email"})</small>
                </div>
                <label>
                  <span>Decision</span>
                  <select value={serviceStatus} onChange={(event) => setServiceStatus(event.target.value)}>
                    <option>Processing</option>
                    <option>Approved</option>
                    <option>Rejected</option>
                    <option>Completed</option>
                  </select>
                </label>
                <label>
                  <span>Signed officer comment</span>
                  <textarea rows="4" required value={serviceNote} onChange={(event) => setServiceNote(event.target.value)} placeholder="Explain the decision for the resident." />
                </label>
                <div className="service-request-review__footer">
                  <small>The backend records your name, role, and decision time as the electronic signature.</small>
                  <button className="button button--primary" disabled={busy}>
                    {busy ? "Saving…" : "Save and sign decision"}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <p className="completion-empty">No service requests are waiting for review.</p>
        )}
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
