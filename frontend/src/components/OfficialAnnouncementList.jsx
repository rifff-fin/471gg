import { useEffect, useState } from "react";
import { FaComment, FaHandsClapping } from "react-icons/fa6";
import { io } from "socket.io-client";
import api from "../services/api";
import { SOCKET_URL } from "../services/api";
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
  const [archiveFilter, setArchiveFilter] = useState("all");
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
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    const refresh = () => loadPosts();
    socket.on("announcement:published", refresh);
    socket.on("announcement:updated", refresh);
    socket.on("announcement:deleted", refresh);
    return () => socket.disconnect();
  }, []);
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
    ? // VIVA: This is a display rule—expired posts stay in the archive/database.
      posts.filter(
        (post) =>
          now - new Date(post.createdAt).getTime() <=
          pinnedForHours * 60 * 60 * 1000,
      )
    : posts;
  const dayInMs = 24 * 60 * 60 * 1000;
  const displayPosts = pinnedForHours
    ? visiblePosts
    : posts.filter((post) => {
        const isPast = now - new Date(post.createdAt).getTime() > dayInMs;
        return (
          archiveFilter === "all" ||
          (archiveFilter === "past" ? isPast : !isPast)
        );
      });
  if (!posts.length) return null;
  return (
    <section className="official-feed" aria-label="Official community posts">
      <div className="official-feed__heading">
        <div>
          <p className="eyebrow">From your city leaders</p>
          <h2>
            {pinnedForHours ? "Today’s community updates" : "Community updates"}
          </h2>
        </div>
        {pinnedForHours ? (
          <span>Pinned for 24 hours</span>
        ) : (
          <div className="official-feed__tabs">
            <button
              type="button"
              className={archiveFilter === "all" ? "is-active" : ""}
              onClick={() => setArchiveFilter("all")}
            >
              All updates
            </button>
            <button
              type="button"
              className={archiveFilter === "current" ? "is-active" : ""}
              onClick={() => setArchiveFilter("current")}
            >
              Last 24 hours
            </button>
            <button
              type="button"
              className={archiveFilter === "past" ? "is-active" : ""}
              onClick={() => setArchiveFilter("past")}
            >
              Past updates
            </button>
          </div>
        )}
      </div>
      <div className="official-feed__list">
        {displayPosts.length ? (
          displayPosts.map((post) => {
            const supported = post.reactions?.some(
              (reaction) =>
                String(reaction.user?._id || reaction.user) ===
                String(user?._id || user?.id),
            );
            return (
              <article
                className={`official-post official-post--${post.type}`}
                key={post._id}
              >
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
                <span className="official-post__type">
                  {post.type.replaceAll("_", " ")}
                </span>
                {post.title && <h3>{post.title}</h3>}
                <p className="official-post__body">{post.body}</p>
                {post.images?.length > 0 && (
                  <div className="official-post__images">
                    {post.images.map((image) => (
                      <img
                        key={image.url}
                        src={image.url}
                        alt="Official update attachment"
                      />
                    ))}
                  </div>
                )}
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
                  {(post.comments || [])
                    .slice()
                    .sort((left, right) =>
                      String(left._id) === String(post.pinnedComment)
                        ? -1
                        : String(right._id) === String(post.pinnedComment)
                          ? 1
                          : 0,
                    )
                    .slice(0, 3)
                    .map((item) => (
                      <div
                        className={
                          String(item._id) === String(post.pinnedComment)
                            ? "official-post__comment is-pinned"
                            : "official-post__comment"
                        }
                        key={item._id}
                      >
                        {String(item._id) === String(post.pinnedComment) && (
                          <small>Mayor-pinned response</small>
                        )}
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
          })
        ) : (
          <div className="empty-card">
            No {archiveFilter === "past" ? "past" : "recent"} official updates
            to show.
          </div>
        )}
      </div>
    </section>
  );
};

export default OfficialAnnouncementList;
