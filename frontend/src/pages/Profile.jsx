import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import IssueCard from "../components/IssueCard";

const Profile = () => {
  const { id } = useParams();
  const { user, getCurrentUser } = useAuth();
  const profileId = id || user?._id || user?.id;
  const [profile, setProfile] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", bio: "", ward: "", avatar: "" });
  const [notice, setNotice] = useState("");
  const ownProfile = String(profileId) === String(user?._id || user?.id);
  const load = async () => {
    try {
      const response = await api.get(`/auth/users/${profileId}`);
      setProfile(response.data.user);
      setComplaints(response.data.complaints || []);
      setForm({
        name: response.data.user.name || "",
        bio: response.data.user.bio || "",
        ward: response.data.user.ward || "",
        avatar: response.data.user.avatar || "",
      });
    } catch {
      setNotice("Profile not found.");
    }
  };
  useEffect(() => {
    if (profileId) load();
  }, [profileId]);
  const save = async (event) => {
    event.preventDefault();
    try {
      const response = await api.put("/auth/me", form);
      setProfile(response.data.user);
      setEditing(false);
      await getCurrentUser?.();
      setNotice("Profile updated.");
    } catch (error) {
      setNotice(error.response?.data?.message || "Could not update profile.");
    }
  };
  if (!profile)
    return (
      <main className="site-shell">
        <div className="empty-card">{notice || "Loading profile…"}</div>
      </main>
    );
  return (
    <main className="site-shell profile-page">
      <section className="profile-header">
        <div className="profile-avatar">
          {profile.avatar ? (
            <img src={profile.avatar} alt="" />
          ) : (
            profile.name?.[0]
          )}
        </div>
        <div>
          <p className="eyebrow">{profile.role}</p>
          <h1>{profile.name}</h1>
          <p>{profile.bio || "Ekotro community member"}</p>
          <small>{profile.ward || "Ward not listed"}</small>
        </div>
        {ownProfile && (
          <button
            className="button button--dark"
            onClick={() => setEditing(!editing)}
          >
            {editing ? "Cancel" : "Edit profile"}
          </button>
        )}
      </section>
      {notice && <div className="notice">{notice}</div>}
      {ownProfile && profile.role === "mayor" && (
        <section className="profile-official-tools">
          <div>
            <p className="eyebrow">Official account</p>
            <h2>Manage public communication</h2>
            <p>
              Monitor your jurisdiction, publish city updates, and manage your
              official posts.
            </p>
          </div>
          <Link className="button button--primary" to="/mayor-dashboard">
            Open mayor dashboard
          </Link>
        </section>
      )}
      {editing && (
        <form className="profile-form" onSubmit={save}>
          {["name", "ward", "avatar"].map((field) => (
            <label key={field}>
              {field}
              <input
                value={form[field]}
                onChange={(event) =>
                  setForm({ ...form, [field]: event.target.value })
                }
              />
            </label>
          ))}
          <label>
            Bio
            <textarea
              value={form.bio}
              onChange={(event) =>
                setForm({ ...form, bio: event.target.value })
              }
            />
          </label>
          <button className="button button--primary">Save profile</button>
        </form>
      )}
      <div className="section-heading">
        <div>
          <p className="eyebrow">Public activity</p>
          <h2>Reports by {profile.name}</h2>
        </div>
        <span>{complaints.length} reports</span>
      </div>
      <div className="issue-list">
        {complaints.map((item) => (
          <IssueCard key={item._id} complaint={item} />
        ))}
      </div>
    </main>
  );
};
export default Profile;
