import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaArrowUp,
  FaArrowDown,
  FaCommentDots,
  FaUsers,
  FaUserShield,
} from "react-icons/fa";
import { io } from "socket.io-client";
import api, { SOCKET_URL } from "../services/api";
import { useAuth } from "../context/AuthContext";

const complaintCategories = [
  "Road & Infrastructure",
  "Waste Management",
  "Water Supply",
  "Electricity",
  "Public Safety",
  "Sanitation",
  "Other",
];

const createEmptyComplaintForm = (user) => ({
  citizenName: user?.name || "",
  citizenEmail: user?.email || "",
  title: "",
  category: complaintCategories[0],
  description: "",
  ward: "",
  priorityLevel: "Medium",
  severityCoefficient: "1",
  latitude: "",
  longitude: "",
});

const sortComplaints = (items) => {
  return [...items].sort((left, right) => {
    const upvoteDifference =
      Number(right.upvotes || 0) - Number(left.upvotes || 0);

    if (upvoteDifference !== 0) {
      return upvoteDifference;
    }

    const scoreDifference =
      Number(right.priorityScore || 0) - Number(left.priorityScore || 0);

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
  });
};

const socketUrl = SOCKET_URL;

const Home = () => {
  const { user } = useAuth();
  const socketRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedComplaintId, setSelectedComplaintId] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [createForm, setCreateForm] = useState(() =>
    createEmptyComplaintForm(user),
  );
  const [createFiles, setCreateFiles] = useState([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [internalDraft, setInternalDraft] = useState("");
  const [holdReason, setHoldReason] = useState("");
  const [reportNote, setReportNote] = useState("");
  const [beforeFiles, setBeforeFiles] = useState([]);
  const [afterFiles, setAfterFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [optimisticUpvotes, setOptimisticUpvotes] = useState({});
  const [heatmapHotspots, setHeatmapHotspots] = useState([]);
  const [slaBreaches, setSlaBreaches] = useState([]);
  const [streamThreshold, setStreamThreshold] = useState(24);

  const complaintStatuses = [
    "Pending",
    "In Progress",
    "Resolved",
    "Closed",
    "Held Pending",
  ];

  const selectedComplaint = useMemo(() => {
    if (!complaints.length) {
      return null;
    }

    return (
      complaints.find((item) => item._id === selectedComplaintId) ||
      complaints[0]
    );
  }, [complaints, selectedComplaintId]);

  const upsertComplaint = (incomingComplaint) => {
    if (!incomingComplaint?._id) {
      return;
    }

    const mergedUpvotes = Math.max(
      Number(incomingComplaint.upvotes || 0),
      Number(optimisticUpvotes[incomingComplaint._id] ?? 0),
    );

    const complaintToStore = {
      ...incomingComplaint,
      upvotes: mergedUpvotes,
    };

    setComplaints((current) => {
      const next = current.filter((item) => item._id !== incomingComplaint._id);
      return sortComplaints([complaintToStore, ...next]);
    });

    setOptimisticUpvotes((current) => {
      if (!(incomingComplaint._id in current)) {
        return current;
      }

      const next = { ...current };
      delete next[incomingComplaint._id];
      return next;
    });
  };

  const removeComplaint = (complaintId) => {
    setComplaints((current) =>
      current.filter((item) => item._id !== complaintId),
    );
  };

  const refreshComplaint = async (complaintId) => {
    const response = await api.get(`/complaints/${complaintId}`);
    const complaint = response.data.data;

    if (complaint) {
      upsertComplaint(complaint);
    }

    return complaint;
  };

  const buildComplaintQuery = () => {
    const params = {};
    if (categoryFilter) params.category = categoryFilter;
    if (statusFilter) params.status = statusFilter;
    if (dateFrom) params.fromDate = dateFrom;
    if (dateTo) params.toDate = dateTo;
    if (searchQuery) params.search = searchQuery;
    return params;
  };

  const loadComplaints = async () => {
    setLoading(true);

    try {
      const response = await api.get("/complaints", {
        params: buildComplaintQuery(),
      });
      const items = sortComplaints(response.data.data || []);

      setComplaints(items);

      if (!selectedComplaintId && items[0]?._id) {
        setSelectedComplaintId(items[0]._id);
      }
    } catch (error) {
      setStatusMessage(
        error.response?.data?.message ||
          error.message ||
          "Failed to load complaints.",
      );
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = async () => {
    setSearchQuery("");
    setCategoryFilter("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setLoading(true);

    try {
      const response = await api.get("/complaints");
      const items = sortComplaints(response.data.data || []);
      setComplaints(items);
      setStatusMessage("Filters reset.");
    } catch (error) {
      setStatusMessage(
        error.response?.data?.message ||
          error.message ||
          "Failed to reset filters.",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadAdminStream = async () => {
    try {
      const response = await api.get("/complaints/admin/stream");
      const data = response.data?.data || {};

      setHeatmapHotspots(data.hotspots || []);
      setSlaBreaches(data.breaches || []);
      setStreamThreshold(Number(data.thresholdHours || 24));
    } catch (error) {
      setStatusMessage(
        error.response?.data?.message ||
          error.message ||
          "Failed to load admin stream snapshot.",
      );
    }
  };

  useEffect(() => {
    setCreateForm(createEmptyComplaintForm(user));
  }, [user]);

  useEffect(() => {
    loadComplaints();
    loadAdminStream();
  }, []);

  useEffect(() => {
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    const appendAlert = (payload) => {
      setAlerts((current) =>
        [
          {
            id: `${Date.now()}-${Math.random()}`,
            message: payload.message || "Live update received.",
            type: payload.type || "update",
          },
          ...current,
        ].slice(0, 6),
      );
    };

    const syncComplaint = async (payload) => {
      if (payload?.complaint) {
        upsertComplaint(payload.complaint);
        return;
      }

      if (payload?.complaintId) {
        try {
          await refreshComplaint(payload.complaintId);
        } catch (error) {
          console.error("Realtime sync failed:", error);
        }
      }
    };

    socket.on("complaint:created", syncComplaint);
    socket.on("complaint:updated", syncComplaint);
    socket.on("complaint:upvoted", syncComplaint);
    socket.on("complaint:voted", syncComplaint);
    socket.on("complaint:held", syncComplaint);
    socket.on("complaint:released", syncComplaint);
    socket.on("complaint:report-uploaded", syncComplaint);
    socket.on("complaint:commented", async (payload) => {
      if (payload?.complaintId) {
        await refreshComplaint(payload.complaintId);
      }
    });
    socket.on("complaint:message", async (payload) => {
      if (payload?.complaintId) {
        await refreshComplaint(payload.complaintId);
      }
    });
    socket.on("complaint:deleted", (payload) =>
      removeComplaint(payload?.complaintId),
    );
    socket.on("dashboard:alert", appendAlert);
    socket.on("dashboard:heatmap", (payload) => {
      setHeatmapHotspots(payload?.hotspots || []);
      setStreamThreshold(Number(payload?.thresholdHours || streamThreshold));
    });
    socket.on("dashboard:alert", (payload) => {
      if (payload?.type === "sla-breach") {
        setSlaBreaches((current) => {
          const next = [
            {
              complaintId: payload.complaintId,
              title: payload.message,
              ward: payload.ward || "Unassigned",
              ageHours: Number(payload.ageHours || 0),
              priorityScore: Number(payload.priorityScore || 0),
            },
            ...current.filter(
              (entry) => entry.complaintId !== payload.complaintId,
            ),
          ];

          return next.slice(0, 20);
        });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!socketRef.current || !selectedComplaint?._id) {
      return undefined;
    }

    socketRef.current.emit("complaint:join", {
      complaintId: selectedComplaint._id,
    });

    return () => {
      socketRef.current?.emit("complaint:leave", {
        complaintId: selectedComplaint._id,
      });
    };
  }, [selectedComplaint?._id]);

  useEffect(() => {
    if (!selectedComplaintId && complaints[0]?._id) {
      setSelectedComplaintId(complaints[0]._id);
    }
  }, [complaints, selectedComplaintId]);

  const handleCreateComplaint = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatusMessage("Submitting complaint and uploading assets...");

    try {
      const formData = new FormData();

      formData.append("citizenName", createForm.citizenName);
      formData.append("citizenEmail", createForm.citizenEmail);
      formData.append("title", createForm.title);
      formData.append("category", createForm.category);
      formData.append("description", createForm.description);
      formData.append("ward", createForm.ward);
      formData.append("priorityLevel", createForm.priorityLevel);
      formData.append("severityCoefficient", createForm.severityCoefficient);
      formData.append("latitude", createForm.latitude);
      formData.append("longitude", createForm.longitude);

      createFiles.forEach((file) => formData.append("attachments", file));

      const response = await api.post("/complaints", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const createdComplaint = response.data.data;

      upsertComplaint(createdComplaint);
      setSelectedComplaintId(createdComplaint._id);
      setCreateForm(createEmptyComplaintForm(user));
      setCreateFiles([]);
      setStatusMessage(
        "Complaint created, uploaded, and prioritized successfully.",
      );
    } catch (error) {
      setStatusMessage(
        error.response?.data?.message ||
          error.message ||
          "Failed to create complaint.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleVote = async (complaintId, type) => {
    const targetComplaint = complaints.find((item) => item._id === complaintId);

    if (!targetComplaint || !user) {
      return;
    }

    const previousUpvotes = Number(targetComplaint.upvotes || 0);
    const previousDownvotes = Number(targetComplaint.downvotes || 0);
    const optimisticUp = type === "up" ? previousUpvotes + 1 : previousUpvotes;
    const optimisticDown =
      type === "down" ? previousDownvotes + 1 : previousDownvotes;

    setOptimisticUpvotes((current) => ({
      ...current,
      [complaintId]: optimisticUp,
    }));

    setComplaints((current) =>
      sortComplaints(
        current.map((item) =>
          item._id === complaintId
            ? { ...item, upvotes: optimisticUp, downvotes: optimisticDown }
            : item,
        ),
      ),
    );

    setSaving(true);

    try {
      const response = await api.post(`/complaints/${complaintId}/vote`, {
        type,
        supporterId: user?.id,
        supporterEmail: user?.email,
        supporterLabel: user?.name || user?.email,
        actor: user?.name,
      });

      const serverComplaint = response.data.data;
      upsertComplaint(serverComplaint);
      setSelectedComplaintId(complaintId);
      setStatusMessage(
        type === "up" ? "Upvote registered." : "Downvote registered.",
      );
    } catch (error) {
      setOptimisticUpvotes((current) => {
        const next = { ...current };
        delete next[complaintId];
        return next;
      });

      setComplaints((current) =>
        sortComplaints(
          current.map((item) =>
            item._id === complaintId
              ? {
                  ...item,
                  upvotes: previousUpvotes,
                  downvotes: previousDownvotes,
                }
              : item,
          ),
        ),
      );

      setStatusMessage(
        error.response?.data?.message ||
          error.message ||
          "Failed to record vote.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpvote = (complaintId) => handleVote(complaintId, "up");
  const handleDownvote = (complaintId) => handleVote(complaintId, "down");

  const handleHoldComplaint = async () => {
    if (!selectedComplaint?._id || !holdReason.trim()) {
      setStatusMessage(
        "Add a written rationale before placing the complaint on hold.",
      );
      return;
    }

    setSaving(true);

    try {
      const response = await api.post(
        `/complaints/${selectedComplaint._id}/hold`,
        {
          reason: holdReason,
          actor: user?.name,
        },
      );

      upsertComplaint(response.data.data);
      setHoldReason("");
      setStatusMessage(
        "Complaint moved to HELD_PENDING and logged to the public ledger.",
      );
    } catch (error) {
      setStatusMessage(
        error.response?.data?.message ||
          error.message ||
          "Failed to hold complaint.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReleaseComplaint = async () => {
    if (!selectedComplaint?._id) {
      return;
    }

    setSaving(true);

    try {
      const response = await api.post(
        `/complaints/${selectedComplaint._id}/release`,
        {
          actor: user?.name,
          status: "In Progress",
        },
      );

      upsertComplaint(response.data.data);
      setStatusMessage("Complaint released from hold.");
    } catch (error) {
      setStatusMessage(
        error.response?.data?.message ||
          error.message ||
          "Failed to release complaint.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCommentSubmit = async (channel) => {
    const text = channel === "internal" ? internalDraft : commentDraft;
    const endpoint = channel === "internal" ? "messages" : "comments";

    if (!selectedComplaint?._id || !text.trim()) {
      setStatusMessage("Enter a message before posting.");
      return;
    }

    setSaving(true);

    try {
      await api.post(`/complaints/${selectedComplaint._id}/${endpoint}`, {
        body: text,
        authorName: user?.name,
        authorRole: user?.role,
        channel,
      });

      await refreshComplaint(selectedComplaint._id);

      if (channel === "internal") {
        setInternalDraft("");
      } else {
        setCommentDraft("");
      }

      setStatusMessage(
        channel === "internal"
          ? "Internal chat message posted live."
          : "Public comment posted live.",
      );
    } catch (error) {
      setStatusMessage(
        error.response?.data?.message ||
          error.message ||
          "Failed to post message.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReportSubmit = async (event) => {
    event.preventDefault();

    if (!selectedComplaint?._id) {
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();

      formData.append("note", reportNote);
      formData.append("submittedBy", user?.name || "Field Worker");
      formData.append("status", "In Progress");

      beforeFiles.forEach((file) => formData.append("beforeImages", file));
      afterFiles.forEach((file) => formData.append("afterImages", file));

      await api.post(`/complaints/${selectedComplaint._id}/reports`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      await refreshComplaint(selectedComplaint._id);
      setReportNote("");
      setBeforeFiles([]);
      setAfterFiles([]);
      setStatusMessage("Before-and-after completion report delivered.");
    } catch (error) {
      setStatusMessage(
        error.response?.data?.message ||
          error.message ||
          "Failed to upload report.",
      );
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => {
    const total = complaints.length;
    const held = complaints.filter(
      (item) => item.holdState === "HELD_PENDING",
    ).length;
    const critical = complaints.filter(
      (item) => Number(item.priorityScore || 0) >= 80,
    ).length;
    const activeChats = complaints.reduce(
      (sum, item) => sum + (item.chatMessages?.length || 0),
      0,
    );

    return {
      total,
      held,
      critical,
      activeChats,
    };
  }, [complaints]);

  const topHotspot = heatmapHotspots[0];

  const getVisibleUpvotes = (complaint) => {
    if (!complaint?._id) {
      return 0;
    }

    if (optimisticUpvotes[complaint._id] !== undefined) {
      return optimisticUpvotes[complaint._id];
    }

    return complaint.upvotes || 0;
  };

  const getVoteTypeLabel = (voteType) =>
    voteType === "down" ? "Downvote" : "Upvote";
  const getSupporterLabel = (vote) =>
    vote.supporterLabel || vote.actor || "Citizen";
  const getSupporterRole = (vote) =>
    vote.supporterRole || vote.actor || "citizen";

  if (loading) {
    return (
      <div className="center-message">Loading Rifat command board...</div>
    );
  }

  return (
    <div className="dashboard-shell">
      <section className="hero-panel panel">
        <div className="hero-copy">
          <p className="eyebrow">Member 4 Workflow Center</p>
          <h1>
            Realtime complaint control, public ledger, and field coordination.
          </h1>
          <p>
            Submit complaint assets, push community upvotes, place cases on hold
            with a written rationale, stream field reports, and watch Socket.io
            alerts update the board in real time.
          </p>

          <div className="hero-actions">
            <button
              className="secondary-btn"
              type="button"
              onClick={loadComplaints}
              disabled={saving}
            >
              Refresh board
            </button>
            <span className="status-chip">Socket connected to {socketUrl}</span>
          </div>

          <div className="filter-panel">
            <div className="filter-row">
              <label className="field filter-field">
                <span>Search</span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search title, description, or ward"
                />
              </label>

              <label className="field filter-field">
                <span>Category</span>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  <option value="">All categories</option>
                  {complaintCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field filter-field">
                <span>Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="">All statuses</option>
                  {complaintStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field filter-field">
                <span>From</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </label>

              <label className="field filter-field">
                <span>To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </label>
            </div>

            <div className="filter-actions">
              <button
                className="secondary-btn"
                type="button"
                onClick={loadComplaints}
                disabled={saving}
              >
                Apply filters
              </button>
              <button
                className="ghost-btn"
                type="button"
                onClick={resetFilters}
                disabled={saving}
              >
                Reset filters
              </button>
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <article className="mini-stat">
            <span>Total cases</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="mini-stat">
            <span>Held pending</span>
            <strong>{stats.held}</strong>
          </article>
          <article className="mini-stat">
            <span>Critical score</span>
            <strong>{stats.critical}</strong>
          </article>
          <article className="mini-stat">
            <span>Live messages</span>
            <strong>{stats.activeChats}</strong>
          </article>
          <article className="mini-stat">
            <span>SLA breaches</span>
            <strong>{slaBreaches.length}</strong>
          </article>
          <article className="mini-stat">
            <span>Heatmap hotspots</span>
            <strong>{heatmapHotspots.length}</strong>
          </article>
        </div>
      </section>

      {statusMessage && <div className="status-banner">{statusMessage}</div>}

      <section className="dashboard-grid">
        <form className="panel form-panel" onSubmit={handleCreateComplaint}>
          <div className="panel-header">
            <div>
              <p className="eyebrow">Complaint intake</p>
              <h2>Submit a complaint with images and coordinates</h2>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                value={createForm.citizenName}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    citizenName: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={createForm.citizenEmail}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    citizenEmail: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="field field-span-2">
              <span>Title</span>
              <input
                type="text"
                value={createForm.title}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="field">
              <span>Category</span>
              <select
                value={createForm.category}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
              >
                {complaintCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Ward</span>
              <input
                type="text"
                value={createForm.ward}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    ward: event.target.value,
                  }))
                }
                placeholder="Ward 12"
              />
            </label>

            <label className="field field-span-2">
              <span>Description</span>
              <textarea
                rows="4"
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="field">
              <span>Priority</span>
              <select
                value={createForm.priorityLevel}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    priorityLevel: event.target.value,
                  }))
                }
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </label>

            <label className="field">
              <span>Severity coefficient</span>
              <input
                type="number"
                min="1"
                step="0.5"
                value={createForm.severityCoefficient}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    severityCoefficient: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Latitude</span>
              <input
                type="number"
                step="any"
                value={createForm.latitude}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    latitude: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="field">
              <span>Longitude</span>
              <input
                type="number"
                step="any"
                value={createForm.longitude}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    longitude: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="field field-span-2">
              <span>Complaint images</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(event) =>
                  setCreateFiles(Array.from(event.target.files || []))
                }
              />
            </label>
          </div>

          <button className="primary-btn" type="submit" disabled={saving}>
            {saving ? "Submitting..." : "Submit complaint with upload"}
          </button>
        </form>

        <aside className="panel stream-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Realtime stream</p>
              <h2>Socket.io alerts and priority changes</h2>
            </div>
          </div>

          <div className="alert-list">
            {alerts.length ? (
              alerts.map((alert) => (
                <article className="alert-item" key={alert.id}>
                  <span className={`alert-pill alert-${alert.type}`}>
                    {alert.type}
                  </span>
                  <p>{alert.message}</p>
                </article>
              ))
            ) : (
              <div className="empty-state">
                Waiting for live alerts from complaint activity.
              </div>
            )}
          </div>

          <div className="stream-divider" />

          <div className="stream-section">
            <h3>Live SLA breach feed ({streamThreshold}h threshold)</h3>
            <div className="alert-list compact-list">
              {slaBreaches.length ? (
                slaBreaches.slice(0, 5).map((breach) => (
                  <article
                    className="alert-item"
                    key={`${breach.complaintId}-${breach.ageHours}`}
                  >
                    <span className="alert-pill alert-sla-breach">SLA</span>
                    <p>
                      {breach.title} ({breach.ward})
                    </p>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  No active SLA breaches right now.
                </div>
              )}
            </div>
          </div>

          <div className="stream-section">
            <h3>Geographic heatmap hotspots</h3>
            {topHotspot ? (
              <div className="heatmap-summary">
                <strong>{topHotspot.ward}</strong>
                <p>
                  {topHotspot.complaintCount} high-priority complaints, avg
                  score {topHotspot.avgPriorityScore}
                </p>
                <small>
                  Center: {topHotspot.center?.lat?.toFixed?.(4)},{" "}
                  {topHotspot.center?.lng?.toFixed?.(4)}
                </small>
              </div>
            ) : (
              <div className="empty-state">
                No high-priority geographic hotspots yet.
              </div>
            )}

            <div className="hotspot-list">
              {heatmapHotspots.slice(0, 5).map((spot) => (
                <article className="hotspot-row" key={spot.key}>
                  <strong>{spot.ward}</strong>
                  <span>{spot.complaintCount} cases</span>
                  <span>avg {spot.avgPriorityScore}</span>
                </article>
              ))}
            </div>
          </div>
        </aside>

        <aside className="panel list-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Complaint queue</p>
              <h2>Sorted by live priority score</h2>
            </div>
          </div>

          <div className="complaint-list">
            {complaints.length ? (
              complaints.map((complaint) => (
                <article
                  key={complaint._id}
                  className={`complaint-card ${selectedComplaint?._id === complaint._id ? "selected" : ""}`}
                >
                  <button
                    type="button"
                    className="card-select"
                    onClick={() => setSelectedComplaintId(complaint._id)}
                  >
                    <div>
                      <strong>{complaint.title}</strong>
                      <p>
                        {complaint.category} · {complaint.ward || "No ward"}
                      </p>
                    </div>

                    <span className="score-badge">
                      {complaint.priorityScore || 0}
                    </span>
                  </button>

                  <div className="complaint-meta">
                    <span>{complaint.status}</span>
                    <span>{getVisibleUpvotes(complaint)} upvotes</span>
                    <span>{complaint.downvotes || 0} downvotes</span>
                    <span>{complaint.holdState}</span>
                  </div>

                  <p className="complaint-description">
                    {complaint.description}
                  </p>

                  <div className="complaint-actions">
                    <button
                      type="button"
                      className="secondary-btn upvote-btn"
                      onClick={() => handleUpvote(complaint._id)}
                      disabled={saving}
                      aria-label="Upvote complaint"
                      title="Upvote complaint"
                    >
                      <FaArrowUp /> {getVisibleUpvotes(complaint)}
                    </button>
                    <button
                      type="button"
                      className="ghost-btn downvote-btn"
                      onClick={() => handleDownvote(complaint._id)}
                      disabled={saving}
                      aria-label="Downvote complaint"
                      title="Downvote complaint"
                    >
                      <FaArrowDown /> {complaint.downvotes || 0}
                    </button>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => setSelectedComplaintId(complaint._id)}
                    >
                      Inspect
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                No complaints yet. Submit the first one from the intake form.
              </div>
            )}
          </div>
        </aside>
      </section>

      <section className="panel detail-panel">
        {selectedComplaint ? (
          <>
            <div className="panel-header split-header">
              <div>
                <p className="eyebrow">Selected complaint</p>
                <h2>{selectedComplaint.title}</h2>
              </div>

              <div className="detail-badges">
                <span className="status-chip">
                  Score {selectedComplaint.priorityScore || 0}
                </span>
                <span className="status-chip">
                  {selectedComplaint.priorityLevel}
                </span>
                <span className="status-chip">{selectedComplaint.status}</span>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-card">
                <div className="detail-card-header">
                  <h3>Public discussion</h3>
                  <span className="meta-pill comment-pill">
                    <FaCommentDots /> {selectedComplaint.comments?.length || 0}
                  </span>
                </div>

                <div className="stack">
                  <label className="field">
                    <span>Public comment</span>
                    <textarea
                      rows="3"
                      value={commentDraft}
                      onChange={(event) => setCommentDraft(event.target.value)}
                      placeholder="Citizens can comment on the complaint thread..."
                    />
                  </label>

                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => handleCommentSubmit("public")}
                    disabled={saving}
                  >
                    Post public comment
                  </button>
                </div>

                <div className="message-feed">
                  {(selectedComplaint.comments || [])
                    .slice(-5)
                    .reverse()
                    .map((comment, index) => (
                      <article
                        className="message-row"
                        key={`${comment.createdAt || index}-${index}`}
                      >
                        <div className="message-meta">
                          <span className="role-chip">
                            {comment.authorRole || "citizen"}
                          </span>
                          <strong>{comment.authorName}</strong>
                        </div>
                        <p>{comment.body}</p>
                      </article>
                    ))}
                </div>
              </div>

              <div className="detail-card">
                <div className="detail-card-header">
                  <h3>Internal coordination</h3>
                  <span className="meta-pill internal-pill">
                    <FaUserShield />{" "}
                    {selectedComplaint.chatMessages?.length || 0}
                  </span>
                </div>
                <div className="stack">
                  <label className="field">
                    <span>Team message</span>
                    <textarea
                      rows="3"
                      value={internalDraft}
                      onChange={(event) => setInternalDraft(event.target.value)}
                      placeholder="Dispatch field workers or coordinate with officers..."
                    />
                  </label>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => handleCommentSubmit("internal")}
                    disabled={saving}
                  >
                    Send internal message
                  </button>
                </div>

                <div className="message-feed">
                  {(selectedComplaint.chatMessages || [])
                    .slice(-5)
                    .reverse()
                    .map((message, index) => (
                      <article
                        className="message-row"
                        key={`${message.createdAt || index}-${index}`}
                      >
                        <div className="message-meta">
                          <span
                            className={`role-chip ${message.channel || "internal"}`}
                          >
                            {message.authorRole || "citizen"}
                          </span>
                          <strong>{message.authorName}</strong>
                          {message.channel && (
                            <span className="channel-pill">
                              {message.channel}
                            </span>
                          )}
                        </div>
                        <p>{message.body}</p>
                      </article>
                    ))}
                </div>
              </div>

              <div className="detail-card vote-panel">
                <div className="detail-card-header">
                  <h3>Live voters</h3>
                  <div className="vote-chip-row">
                    <span className="vote-pill vote-up">
                      <FaArrowUp /> {selectedComplaint.upvotes || 0}
                    </span>
                    <span className="vote-pill vote-down">
                      <FaArrowDown /> {selectedComplaint.downvotes || 0}
                    </span>
                  </div>
                </div>
                <div className="supporter-list">
                  {(selectedComplaint.votes || [])
                    .slice(-8)
                    .reverse()
                    .map((vote, index) => (
                      <div
                        className="supporter-row"
                        key={`${vote.supporterKey}-${index}`}
                      >
                        <span
                          className={`supporter-badge vote-${vote.voteType}`}
                        >
                          {getVoteTypeLabel(vote.voteType)}
                        </span>
                        <div className="supporter-info">
                          <strong>{getSupporterLabel(vote)}</strong>
                          <span className="supporter-meta">
                            {getSupporterRole(vote)}
                          </span>
                        </div>
                      </div>
                    ))}
                  {!(selectedComplaint.votes || []).length && (
                    <div className="empty-state">No votes recorded yet.</div>
                  )}
                </div>
              </div>

              <div className="detail-card">
                <h3>Hold and release</h3>
                <label className="field">
                  <span>Hold rationale</span>
                  <textarea
                    rows="3"
                    value={holdReason}
                    onChange={(event) => setHoldReason(event.target.value)}
                    placeholder="Write the mandatory rationale for HELD_PENDING..."
                  />
                </label>

                <div className="button-row">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={handleHoldComplaint}
                    disabled={saving}
                  >
                    Place on hold
                  </button>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={handleReleaseComplaint}
                    disabled={saving}
                  >
                    Release hold
                  </button>
                </div>

                <div className="ledger-preview">
                  <strong>Public ledger</strong>
                  {(selectedComplaint.publicLedger || [])
                    .slice(-5)
                    .reverse()
                    .map((entry, index) => (
                      <article
                        className="ledger-row"
                        key={`${entry.createdAt || index}-${index}`}
                      >
                        <span>{entry.action}</span>
                        <p>{entry.message}</p>
                      </article>
                    ))}
                </div>
              </div>

              <form className="detail-card" onSubmit={handleReportSubmit}>
                <h3>Before-and-after report</h3>

                <label className="field">
                  <span>Completion note</span>
                  <textarea
                    rows="3"
                    value={reportNote}
                    onChange={(event) => setReportNote(event.target.value)}
                    placeholder="Summarize the repair or field work performed..."
                  />
                </label>

                <label className="field">
                  <span>Before images</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(event) =>
                      setBeforeFiles(Array.from(event.target.files || []))
                    }
                  />
                </label>

                <label className="field">
                  <span>After images</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(event) =>
                      setAfterFiles(Array.from(event.target.files || []))
                    }
                  />
                </label>

                <button className="primary-btn" type="submit" disabled={saving}>
                  Upload completion report
                </button>

                <div className="report-list">
                  {(selectedComplaint.beforeAfterReports || [])
                    .slice(-3)
                    .reverse()
                    .map((report, index) => (
                      <article
                        className="report-row"
                        key={`${report.createdAt || index}-${index}`}
                      >
                        <strong>{report.submittedBy}</strong>
                        <p>{report.note || "Field report uploaded."}</p>
                      </article>
                    ))}
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="empty-state">
            Select a complaint to inspect comments, internal chat, holds, and
            field reports.
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
