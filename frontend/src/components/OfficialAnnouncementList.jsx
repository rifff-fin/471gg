import { useEffect, useState } from "react";
import { FaComment, FaHandsClapping } from "react-icons/fa6";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const formatDate = (value) =>
  new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const OfficialAnnouncementList = ({
  refreshKey = 0,
  pinnedForHours = null,
}) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [now, setNow] = useState(Date.now());
  const loadPosts = async () => {
    try {
      const response = await api.get("/announcements");
      setPosts(response.data.data || []);
    } catch {
      setPosts([]);
    }
  };
  useEffect(() => {
    loadPosts();
  }, [refreshKey]);
  useEffect(() => {
    if (!pinnedForHours) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, [pinnedForHours]);
  const updatePost = (id, patch) =>
    setPosts((current) =>
      current.map((post) => (post._id === id ? { ...post, ...patch } : post)),
    );
  const react = async (post) => {
    if (!user) return;
    const response = await api.post(`/announcements/${post._id}/reactions`);
    await loadPosts();
    return response;
  };
  const comment = async (event, post) => {
    event.preventDefault();
    const body = drafts[post._id]?.trim();
    if (!body || !user) return;
    const response = await api.post(`/announcements/${post._id}/comments`, {
      body,
    });
    updatePost(post._id, {
      comments: [...(post.comments || []), response.data.data],
    });
    setDrafts((current) => ({ ...current, [post._id]: "" }));
  };
  const visiblePosts = pinnedForHours
    // VIVA: This is a display rule—expired posts stay in the archive/database.
    ? posts.filter(
        (post) =>
          now - new Date(post.createdAt).getTime() <=
          pinnedForHours * 60 * 60 * 1000,
      )
    : posts;
  if (!visiblePosts.length) return null;
  return (
    <section className="official-feed" aria-label="Official community posts">
      <div className="official-feed__heading">
        <div>
          <p className="eyebrow">From your city leaders</p>
          <h2>
            {pinnedForHours ? "Today’s community updates" : "Community updates"}
          </h2>
        </div>
        <span>
          {pinnedForHours ? "Pinned for 24 hours" : "Verified accounts"}
        </span>
      </div>
      <div className="official-feed__list">
        {visiblePosts.map((post) => {
          const supported = post.reactions?.some(
            (reaction) =>
              String(reaction.user?._id || reaction.user) ===
              String(user?._id || user?.id),
          );
          return (
            <article className="official-post" key={post._id}>
              <header>
                <div className="official-post__avatar">
                  {post.authorName?.[0] || "E"}
                </div>
                <div>
                  <strong>✓ {post.authorName}</strong>
                  <span>
                    {post.authorRole} · {post.jurisdiction} ·{" "}
                    {formatDate(post.createdAt)}
                  </span>
                </div>
              </header>
              {post.title && <h3>{post.title}</h3>}
              <p className="official-post__body">{post.body}</p>
              {post.complaint?.title && (
                <small>Related report: {post.complaint.title}</small>
              )}
              <div className="official-post__stats">
                <span>{post.reactions?.length || 0} community supports</span>
                <span>{post.comments?.length || 0} comments</span>
              </div>
              <div className="official-post__actions">
                <button
                  className={supported ? "is-active" : ""}
                  type="button"
                  onClick={() => react(post)}
                  disabled={!user}
                >
                  <FaHandsClapping /> Support
                </button>
                <button
                  type="button"
                  disabled={!user}
                  onClick={(event) =>
                    event.currentTarget
                      .closest("article")
                      .querySelector("input")
                      .focus()
                  }
                >
                  <FaComment /> Comment
                </button>
              </div>
              <div className="official-post__comments">
                {(post.comments || []).slice(-3).map((item) => (
                  <div className="official-post__comment" key={item._id}>
                    <strong>{item.authorName}</strong>
                    <span>{item.authorRole}</span>
                    <p>{item.body}</p>
                  </div>
                ))}
              </div>
              {user ? (
                <form
                  className="official-post__composer"
                  onSubmit={(event) => comment(event, post)}
                >
                  <input
                    value={drafts[post._id] || ""}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [post._id]: event.target.value,
                      }))
                    }
                    placeholder="Write a respectful comment…"
                  />
                  <button type="submit">Post</button>
                </form>
              ) : (
                <p className="official-post__signin">
                  Sign in to support or comment.
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default OfficialAnnouncementList;
