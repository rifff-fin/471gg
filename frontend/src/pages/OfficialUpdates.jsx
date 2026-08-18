import { useState } from "react";
import { Navigate, Link } from "react-router";
import { FaImage, FaShieldHeart } from "react-icons/fa6";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import OfficialAnnouncementList from "../components/OfficialAnnouncementList";

const emptyForm = {
  title: "",
  body: "",
  type: "announcement",
  complaintId: "",
};

const OfficialUpdates = () => {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);
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
      const data = new FormData();
      data.append("title", form.title.trim());
      data.append("body", form.body.trim());
      data.append("type", form.type);
      if (form.complaintId.trim())
        data.append("complaintId", form.complaintId.trim());
      files.forEach((file) => data.append("attachments", file));
      await api.post("/announcements", data);
      setForm(emptyForm);
      setFiles([]);
      setRefreshKey((value) => value + 1);
      setMessage(
        "Official update published. Citizens have received an in-app notification.",
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
    <main className="site-shell official-page official-newsroom">
      <header className="official-newsroom__hero">
        <div>
          <p className="eyebrow">Verified public communication</p>
          <h1>Keep residents informed with clarity.</h1>
          <p>
            Publish a factual city update, link it to a case when useful, and
            include visual evidence from approved municipal sources.
          </p>
        </div>
        {user.role === "mayor" && (
          <Link className="button button--quiet" to="/mayor-dashboard">
            Open mayor dashboard
          </Link>
        )}
      </header>
      <section className="official-composer-card">
        <header>
          <div className="official-post__avatar">{user.name?.[0] || "M"}</div>
          <div>
            <strong>{user.name}</strong>
            <span>
              Verified {user.role} · {user.jurisdiction}
            </span>
          </div>
        </header>
        {message && <div className="notice">{message}</div>}
        <form onSubmit={submit}>
          <input
            className="official-composer-card__title"
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
            maxLength="160"
            placeholder="Headline (optional but recommended)"
          />
          <textarea
            required
            rows="5"
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
            placeholder="What do residents need to know? Use clear, factual language."
          />
          <div className="official-composer-card__options">
            <label>
              Post type
              <select
                value={form.type}
                onChange={(event) =>
                  setForm({ ...form, type: event.target.value })
                }
              >
                <option value="announcement">Public announcement</option>
                <option value="progress_update">Progress update</option>
                <option value="official_response">Complaint response</option>
              </select>
            </label>
            <label>
              Related complaint ID{" "}
              <input
                value={form.complaintId}
                onChange={(event) =>
                  setForm({ ...form, complaintId: event.target.value })
                }
                placeholder="Optional case ID"
              />
            </label>
          </div>
          <div className="official-composer-card__footer">
            <label className="official-image-picker">
              <FaImage /> Add photos
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) =>
                  setFiles([...event.target.files].slice(0, 4))
                }
              />
            </label>
            <span>
              {files.length
                ? `${files.length} image${files.length > 1 ? "s" : ""} ready for Cloudinary`
                : "Up to 4 images"}
            </span>
            <button className="button button--primary" disabled={saving}>
              {saving ? "Publishing…" : "Publish update"}
            </button>
          </div>
        </form>
      </section>
      <aside className="official-publishing-note">
        <FaShieldHeart />
        <p>
          <strong>Public record standard.</strong> New posts appear at the top
          of the home feed for 24 hours, remain in the official archive, and
          show an edited marker if later corrected.
        </p>
      </aside>
      <OfficialAnnouncementList refreshKey={refreshKey} />
    </main>
  );
};
export default OfficialUpdates;
