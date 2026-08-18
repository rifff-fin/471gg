import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  FaBullhorn,
  FaChartLine,
  FaImage,
  FaPenToSquare,
  FaThumbtack,
  FaTrash,
  FaTriangleExclamation,
} from "react-icons/fa6";
import api from "../services/api";

const emptyForm = {
  title: "",
  body: "",
  type: "announcement",
  complaintId: "",
};

const MayorDashboard = () => {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [files, setFiles] = useState([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const response = await api.get("/announcements/dashboard");
      setData(response.data.data);
    } catch (error) {
      setNotice(
        error.response?.data?.message || "Could not load the mayor workspace.",
      );
    }
  };
  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const payload = new FormData();
      payload.append("title", form.title);
      payload.append("body", form.body);
      payload.append("type", form.type);
      if (form.complaintId.trim())
        payload.append("complaintId", form.complaintId.trim());
      files.forEach((file) => payload.append("attachments", file));
      if (editingId) await api.patch(`/announcements/${editingId}`, payload);
      else await api.post("/announcements", payload);
      setForm(emptyForm);
      setFiles([]);
      setEditingId("");
      setNotice(
        editingId
          ? "Official post updated."
          : "Official post published and citizens notified.",
      );
      await load();
    } catch (error) {
      setNotice(
        error.response?.data?.message || "Could not save the official post.",
      );
    } finally {
      setBusy(false);
    }
  };
  const edit = (post) => {
    setEditingId(post._id);
    setForm({
      title: post.title || "",
      body: post.body,
      type: post.type,
      complaintId: post.complaint?._id || post.complaint || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const remove = async (post) => {
    if (!window.confirm(`Delete “${post.title || "this official post"}”?`))
      return;
    setBusy(true);
    try {
      await api.delete(`/announcements/${post._id}`);
      setNotice("Official post deleted.");
      await load();
    } catch (error) {
      setNotice(error.response?.data?.message || "Could not delete the post.");
    } finally {
      setBusy(false);
    }
  };
  const pin = async (post, comment) => {
    try {
      await api.patch(`/announcements/${post._id}/comments/${comment._id}/pin`);
      setNotice("Response pinned at the top of this announcement.");
      await load();
    } catch (error) {
      setNotice(
        error.response?.data?.message || "Could not pin this response.",
      );
    }
  };
  if (!data)
    return (
      <main className="site-shell mayor-page">
        <div className="empty-card">{notice || "Loading mayor workspace…"}</div>
      </main>
    );
  const { stats, cases, posts, jurisdiction } = data;
  return (
    <main className="site-shell mayor-page">
      <header className="mayor-hero">
        <div>
          <p className="eyebrow">Mayor’s civic command centre</p>
          <h1>{jurisdiction}, at a glance.</h1>
          <p>
            Publish accountable updates, listen to residents, and track the
            cases that need city leadership.
          </p>
        </div>
        <Link className="button button--quiet" to="/profile">
          Manage official profile
        </Link>
      </header>
      {notice && (
        <div className="notice officer-notice">
          {notice}
          <button type="button" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      <section className="mayor-stats">
        <article>
          <FaChartLine />
          <strong>{stats.openCases}</strong>
          <span>open local cases</span>
        </article>
        <article>
          <FaTriangleExclamation />
          <strong>{stats.urgentCases}</strong>
          <span>high-priority cases</span>
        </article>
        <article>
          <FaBullhorn />
          <strong>{stats.officialPosts}</strong>
          <span>official posts</span>
        </article>
        <article>
          <FaChartLine />
          <strong>{stats.engagement}</strong>
          <span>post interactions</span>
        </article>
      </section>
      <section className="mayor-grid">
        <section className="mayor-composer">
          <div>
            <p className="eyebrow">Official communication</p>
            <h2>
              {editingId ? "Edit official post" : "Publish an official update"}
            </h2>
            <p>
              New posts are pinned on the home feed for 24 hours and then stay
              in the public archive.
            </p>
          </div>
          <form onSubmit={submit}>
            <label>
              Headline
              <input
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                maxLength="160"
                placeholder="Short public headline"
              />
            </label>
            <label>
              Update type
              <select
                value={form.type}
                onChange={(event) =>
                  setForm({ ...form, type: event.target.value })
                }
              >
                <option value="announcement">Announcement</option>
                <option value="progress_update">Progress update</option>
                <option value="official_response">Complaint response</option>
              </select>
            </label>
            <label>
              Message
              <textarea
                required
                rows="6"
                value={form.body}
                onChange={(event) =>
                  setForm({ ...form, body: event.target.value })
                }
                placeholder="Clear, factual, accessible update for residents"
              />
            </label>
            <label>
              Related complaint ID (optional)
              <input
                value={form.complaintId}
                onChange={(event) =>
                  setForm({ ...form, complaintId: event.target.value })
                }
                placeholder="Link a complaint in your jurisdiction"
              />
            </label>
            <label className="mayor-image-picker">
              <FaImage /> Add up to 4 Cloudinary images
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) =>
                  setFiles([...event.target.files].slice(0, 4))
                }
              />
              <small>
                {files.length
                  ? `${files.length} image(s) selected`
                  : "Optional: add verified visual evidence."}
              </small>
            </label>
            <div className="mayor-form-actions">
              {editingId && (
                <button
                  type="button"
                  className="button button--quiet"
                  onClick={() => {
                    setEditingId("");
                    setForm(emptyForm);
                  }}
                >
                  Cancel edit
                </button>
              )}
              <button className="button button--primary" disabled={busy}>
                {editingId ? "Save changes" : "Publish official update"}
              </button>
            </div>
          </form>
        </section>
        <section className="mayor-cases">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Situation monitor</p>
              <h2>Local case priorities</h2>
            </div>
            <span>{stats.totalCases} total</span>
          </div>
          {cases.length ? (
            cases.slice(0, 8).map((item) => (
              <Link
                className="mayor-case"
                key={item._id}
                to={`/complaints/${item._id}`}
              >
                <span
                  className={`status status--${item.status.toLowerCase().replaceAll(" ", "-")}`}
                >
                  {item.status}
                </span>
                <strong>{item.title}</strong>
                <small>
                  {item.category} · {item.upvotes || 0} supports ·{" "}
                  {item.comments?.length || 0} comments
                </small>
              </Link>
            ))
          ) : (
            <div className="empty-card">No cases in this jurisdiction yet.</div>
          )}
        </section>
      </section>
      <section className="mayor-posts">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your public record</p>
            <h2>Manage official posts</h2>
          </div>
          <span>Edit, delete, and pin a response</span>
        </div>
        {posts.length ? (
          <div className="mayor-post-list">
            {posts.map((post) => (
              <article key={post._id}>
                <header>
                  <div>
                    <span className="status">
                      {post.type.replaceAll("_", " ")}
                    </span>
                    <h3>{post.title || "Untitled update"}</h3>
                    <small>
                      {new Date(post.createdAt).toLocaleString()}{" "}
                      {post.editedAt ? "· edited" : ""}
                    </small>
                  </div>
                  <div>
                    <button
                      type="button"
                      title="Edit post"
                      onClick={() => edit(post)}
                    >
                      <FaPenToSquare />
                    </button>
                    <button
                      type="button"
                      title="Delete post"
                      onClick={() => remove(post)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </header>
                <p>{post.body}</p>
                {post.comments?.length ? (
                  <div className="mayor-post-comments">
                    {post.comments
                      .slice()
                      .sort((a, b) =>
                        String(a._id) === String(post.pinnedComment)
                          ? -1
                          : String(b._id) === String(post.pinnedComment)
                            ? 1
                            : 0,
                      )
                      .slice(0, 3)
                      .map((comment) => (
                        <div
                          key={comment._id}
                          className={
                            String(comment._id) === String(post.pinnedComment)
                              ? "is-pinned"
                              : ""
                          }
                        >
                          <strong>{comment.authorName}</strong>
                          <p>{comment.body}</p>
                          <button
                            type="button"
                            onClick={() => pin(post, comment)}
                          >
                            <FaThumbtack />{" "}
                            {String(comment._id) === String(post.pinnedComment)
                              ? "Pinned response"
                              : "Pin response"}
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <small>No citizen responses yet.</small>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-card">
            Publish your first public update above.
          </div>
        )}
      </section>
    </main>
  );
};
export default MayorDashboard;
