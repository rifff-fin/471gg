import { useEffect, useState } from "react";
import api from "../services/api";

const typeLabel = {
  announcement: "Official announcement",
  progress_update: "Progress update",
  official_response: "Official response",
};

const OfficialAnnouncementList = ({ refreshKey = 0 }) => {
  const [announcements, setAnnouncements] = useState([]);
  useEffect(() => {
    api
      .get("/announcements")
      .then((response) => setAnnouncements(response.data.data || []))
      .catch(() => setAnnouncements([]));
  }, [refreshKey]);
  if (!announcements.length) return null;
  return (
    <section className="official-updates" aria-label="Official updates">
      <div className="official-updates__heading">
        <div>
          <p className="eyebrow">Verified city hall</p>
          <h2>Official updates</h2>
        </div>
        <span>Shown first</span>
      </div>
      <div className="official-updates__list">
        {announcements.slice(0, 3).map((announcement) => (
          <article className="official-update" key={announcement._id}>
            <div className="official-update__meta">
              <strong>✓ {announcement.authorName}</strong>
              <span>
                {announcement.authorRole} · {announcement.jurisdiction}
              </span>
            </div>
            <span className="official-update__type">
              {typeLabel[announcement.type]}
            </span>
            <h3>{announcement.title}</h3>
            <p>{announcement.body}</p>
            {announcement.complaint?.title && (
              <small>Regarding: {announcement.complaint.title}</small>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};

export default OfficialAnnouncementList;
