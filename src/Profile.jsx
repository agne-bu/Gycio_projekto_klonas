import { useState } from "react";
import "./Profile.css";

function getInitials(name = "") {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "F";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function Profile({ user = {}, tasks = [], onSaveProfile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || user?.username || "",
    email: user?.email || "",
  });
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const name = user?.name || user?.username || "Flowly naudotojas";
  const email = user?.email || "Nenurodytas";
  const completedTasks = safeTasks.filter(
    (task) => task?.status === "Atlikta",
  ).length;
  const progress = safeTasks.length
    ? Math.round((completedTasks / safeTasks.length) * 100)
    : 0;

  function handleEdit() {
    setFormData({ name, email: email === "Nenurodytas" ? "" : email });
    setIsEditing(true);
  }

  function handleCancel() {
    setFormData({ name, email: email === "Nenurodytas" ? "" : email });
    setIsEditing(false);
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSaveProfile?.({
      name: formData.name.trim(),
      email: formData.email.trim(),
    });
    setIsEditing(false);
  }

  return (
    <main className="profile-page">
      <header className="profile-header profile-card">
        <div className="profile-avatar" aria-hidden="true">
          {getInitials(name)}
        </div>
        <div className="profile-header__details">
          <p className="profile-eyebrow">Flowly naudotojas</p>
          <h1>{name}</h1>
          <p className="profile-email">{email}</p>
        </div>
      </header>

      <section className="profile-card profile-progress" aria-labelledby="profile-progress-title">
        <div className="profile-section-heading">
          <div>
            <p className="profile-eyebrow">Apžvalga</p>
            <h2 id="profile-progress-title">Mano progresas</h2>
          </div>
          <span className="profile-progress__value">{progress}%</span>
        </div>

        <div
          className="profile-progress__bar"
          role="progressbar"
          aria-label="Užduočių atlikimo progresas"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={progress}
        >
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className="profile-stats">
          <div className="profile-stat">
            <span className="profile-stat__value">{safeTasks.length}</span>
            <span className="profile-stat__label">Visos užduotys</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat__value">{completedTasks}</span>
            <span className="profile-stat__label">Atliktos užduotys</span>
          </div>
        </div>
      </section>

      <section className="profile-card profile-account" aria-labelledby="profile-account-title">
        <div className="profile-section-heading">
          <div>
            <p className="profile-eyebrow">Paskyra</p>
            <h2 id="profile-account-title">Paskyros informacija</h2>
          </div>
        </div>

        {isEditing ? (
          <form className="profile-edit-form" onSubmit={handleSubmit}>
            <label className="profile-edit-field">
              <span>Vardas</span>
              <input
                type="text"
                value={formData.name}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, name: event.target.value }))
                }
                autoComplete="name"
                required
              />
            </label>
            <label className="profile-edit-field">
              <span>El. paštas</span>
              <input
                type="email"
                value={formData.email}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, email: event.target.value }))
                }
                autoComplete="email"
                required
              />
            </label>
            <div className="profile-edit-actions">
              <button className="profile-edit-button" type="submit">
                Išsaugoti
              </button>
              <button
                className="profile-cancel-button"
                type="button"
                onClick={handleCancel}
              >
                Atšaukti
              </button>
            </div>
          </form>
        ) : (
          <>
            <dl className="profile-account__details">
              <div>
                <dt>Vardas</dt>
                <dd>{name}</dd>
              </div>
              <div>
                <dt>El. paštas</dt>
                <dd>{email}</dd>
              </div>
            </dl>

            <button className="profile-edit-button" type="button" onClick={handleEdit}>
              Redaguoti profilį
            </button>
          </>
        )}
      </section>
    </main>
  );
}

export default Profile;
