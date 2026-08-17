import { useState } from "react";
import { Navigate } from "react-router";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import OfficialAnnouncementList from "../components/OfficialAnnouncementList";

const OfficialUpdates = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: "",
    body: "",
    type: "announcement",
    complaintId: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  if (!user || !["mayor", "councillor"].includes(user.role))
    return <Navigate to="/" replace />;
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await api.post("/announcements", {
        ...form,
        complaintId: form.complaintId.trim() || undefined,
      });
      setForm({ title: "", body: "", type: "announcement", complaintId: "" });
      setRefreshKey((value) => value + 1);
      setMessage(
        "Official update published. Mayors and councillors have been notified.",
      );
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Could not publish the update.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <main className="site-shell official-page">
      <section className="official-page__intro">
        <p className="eyebrow">Verified official console</p>
        <h1>Publish a city update</h1>
        <p>
          Posts appear at the top of the public feed. Live notifications go only
          to mayor and councillor accounts.
        </p>
      </section>
      <form className="official-form" onSubmit={submit}>
        {message && <div className="notice">{message}</div>}
        <label>
          Title
          <input
            required
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
          />
        </label>
        <label>
          Update type
          <select
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value })}
          >
            <option value="announcement">Announcement</option>
            <option value="progress_update">Progress update</option>
            <option value="official_response">Complaint response</option>
          </select>
        </label>
        <label className="form-wide">
          Message
          <textarea
            required
            rows="6"
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
          />
        </label>
        <label className="form-wide">
          Complaint ID (optional)
          <input
            value={form.complaintId}
            onChange={(event) =>
              setForm({ ...form, complaintId: event.target.value })
            }
          />
        </label>
        <button
          className="button button--primary form-submit"
          disabled={saving}
        >
          {saving ? "Publishing…" : "Publish official update"}
        </button>
      </form>
      <OfficialAnnouncementList refreshKey={refreshKey} />
    </main>
  );
};

export default OfficialUpdates;
