import { useEffect, useState } from "react";
import { Link } from "react-router";
import { FaMagnifyingGlass, FaUpload } from "react-icons/fa6";
import api from "../services/api";

const UploadCompletionReport = () => {
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [beforeFiles, setBeforeFiles] = useState([]);
  const [afterFiles, setAfterFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const findComplaints = async (term = search) => {
    try {
      const response = await api.get("/complaints", {
        params: { search: term.trim() || undefined },
      });
      setMatches(response.data.data || []);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Could not search complaints.",
      );
    }
  };
  useEffect(() => {
    findComplaints("");
  }, []);
  const submit = async (event) => {
    event.preventDefault();
    if (!selected)
      return setMessage("Search for and select the complaint first.");
    if (!beforeFiles.length || !afterFiles.length)
      return setMessage("Add at least one before photo and one after photo.");
    setLoading(true);
    setMessage("");
    try {
      const data = new FormData();
      data.append("note", note.trim());
      beforeFiles.forEach((file) => data.append("beforeImages", file));
      afterFiles.forEach((file) => data.append("afterImages", file));
      await api.post(`/complaints/${selected._id}/reports`, data);
      setMessage(
        "Evidence submitted. The assigned officer has been notified for verification.",
      );
      setNote("");
      setBeforeFiles([]);
      setAfterFiles([]);
      await findComplaints(search);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Could not submit the completion report.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="site-shell completion-page">
      <header className="completion-page__hero">
        <p className="eyebrow">Field worker evidence</p>
        <h1>Close the loop with proof.</h1>
        <p>
          Select the real complaint, upload before-and-after photos, and send it
          to the assigned officer for review.
        </p>
      </header>
      {message && <div className="notice officer-notice">{message}</div>}
      <div className="completion-layout">
        <section className="completion-search">
          <h2>1. Find the complaint</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              findComplaints();
            }}
            className="officer-search"
          >
            <FaMagnifyingGlass />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, ward, or description"
            />
          </form>
          <div className="completion-results">
            {matches.length ? (
              matches.map((complaint) => (
                <button
                  type="button"
                  key={complaint._id}
                  onClick={() => setSelected(complaint)}
                  className={
                    selected?._id === complaint._id
                      ? "completion-result is-selected"
                      : "completion-result"
                  }
                >
                  <span
                    className={`status status--${complaint.status.toLowerCase().replaceAll(" ", "-")}`}
                  >
                    {complaint.status}
                  </span>
                  <strong>{complaint.title}</strong>
                  <small>
                    {complaint.ward || "Unassigned ward"} · {complaint.category}
                  </small>
                </button>
              ))
            ) : (
              <div className="empty-card">
                No live complaints found. A citizen must submit a complaint
                before work proof can be attached.
              </div>
            )}
          </div>
        </section>
        <section className="completion-form-card">
          <h2>2. Upload work evidence</h2>
          {selected ? (
            <div className="completion-selected">
              <strong>{selected.title}</strong>
              <span>
                {selected.citizenName} · {selected.ward || "Unassigned ward"}
              </span>
              <Link to={`/complaints/${selected._id}`}>Open complaint</Link>
            </div>
          ) : (
            <p className="completion-empty">
              Choose a complaint from the live results to attach evidence.
            </p>
          )}
          <form onSubmit={submit}>
            <label>
              <span>Before work photos</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => setBeforeFiles([...event.target.files])}
              />
              <small>
                {beforeFiles.length
                  ? `${beforeFiles.length} photo(s) selected`
                  : "Required: show the reported condition."}
              </small>
            </label>
            <label>
              <span>After work photos</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => setAfterFiles([...event.target.files])}
              />
              <small>
                {afterFiles.length
                  ? `${afterFiles.length} photo(s) selected`
                  : "Required: show the completed work."}
              </small>
            </label>
            <label>
              <span>Work note</span>
              <textarea
                rows="5"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="What was completed? Include material, location detail, or anything the officer should verify."
                required
              />
            </label>
            <button
              className="button button--primary"
              disabled={loading || !selected}
            >
              <FaUpload />{" "}
              {loading
                ? "Uploading evidence…"
                : "Submit for officer verification"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
};
export default UploadCompletionReport;
