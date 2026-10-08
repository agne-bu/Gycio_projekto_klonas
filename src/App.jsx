import { useEffect, useState } from "react";
import TaskList from "./TaskList";
import ProgressBar from "./ProgressBar";
import Navbar from "./Navbar";
import AddTaskForm from "./AddTaskForm";
import Profile from "./Profile";
import "./App.css";

const TASKS_API_URL = "https://testapi.io/api/agne-bu/resource/tasklist";

async function readApiResponse(response) {
  const responseText = await response.text();
  let responseData = null;

  if (responseText) {
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }
  }

  if (!response.ok) {
    const message =
      typeof responseData === "object" && responseData?.message
        ? responseData.message
        : `Serverio klaida (${response.status}).`;
    throw new Error(message);
  }

  return responseData;
}

function normalizeTask(task) {
  const record = task?.data && !Array.isArray(task.data) ? task.data : task || {};
  const id = record.id ?? record._id;
  const title = record.title || record["Užduotis"] || "";
  const status = record.status || record["Būsena"] || "";
  const rawDeadline = record.deadline || record["Terminas"];
  const deadline = rawDeadline ? String(rawDeadline).slice(0, 10) : "";

  return {
    id,
    title: title || `Įrašas #${id ?? "be ID"}`,
    status: status || "Nepradėta",
    deadline,
    isIncomplete: !title || !status || !deadline,
  };
}

function App() {
  const [user, setUser] = useState({
    name: "Jonas Jonaitis",
    email: "jonas@flowly.lt",
  });

  const [activePage, setActivePage] = useState("home");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTasks() {
      try {
        const response = await fetch(TASKS_API_URL);
        const result = await readApiResponse(response);
        const records = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
            ? result.data
            : [];
        const loadedTasks = records
          .map(normalizeTask)
          .filter((task) => !task.isIncomplete);

        if (isMounted) {
          setTasks(loadedTasks);
          setApiError("");
        }
      } catch (error) {
        if (isMounted) {
          setApiError(`Nepavyko įkelti užduočių: ${error.message}`);
        }
      } finally {
        if (isMounted) setTasksLoading(false);
      }
    }

    loadTasks();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleSubmit(event) {
    event.preventDefault();

    if (email === "admin" && password === "admin") {
      setIsLoggedIn(true);
      setLoginError("");
      return;
    }

    setLoginError("Neteisingas vartotojo vardas arba slaptažodis.");
  }

  async function handleAddTask(newTask) {
    try {
      const response = await fetch(TASKS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "Užduotis": newTask.title,
          "Būsena": newTask.status,
          "Terminas": newTask.deadline,
        }),
      });
      const result = await readApiResponse(response);
      const savedTask = normalizeTask(result);

      if (savedTask.id == null) {
        throw new Error("API atsakyme trūksta išsaugotos užduoties ID.");
      }

      if (savedTask.isIncomplete) {
        throw new Error(
          "TestAPI priėmė įrašą, bet jo laukų neišsaugojo. Patikrink stulpelius Užduotis, Būsena ir Terminas.",
        );
      }

      setTasks((currentTasks) => [...currentTasks, savedTask]);
      setApiError("");
      return true;
    } catch (error) {
      setApiError(`Nepavyko išsaugoti užduoties: ${error.message}`);
      return false;
    }
  }

  async function updateTask(taskId, changes) {
    try {
      const currentTask = tasks.find(
        (task) => String(task.id) === String(taskId),
      );
      const updatedTask = { ...currentTask, ...changes };
      const apiChanges = {
        "Užduotis": updatedTask.title,
        "Būsena": updatedTask.status,
        "Terminas": updatedTask.deadline,
      };

      const response = await fetch(
        `${TASKS_API_URL}/${encodeURIComponent(taskId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiChanges),
        },
      );
      await readApiResponse(response);
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          String(task.id) === String(taskId) ? { ...task, ...changes } : task,
        ),
      );
      setApiError("");
    } catch (error) {
      setApiError(`Nepavyko atnaujinti užduoties: ${error.message}`);
    }
  }

  function handleTaskStatusChange(taskId, status) {
    return updateTask(taskId, { status });
  }

  function handleTaskDeadlineChange(taskId, deadline) {
    return updateTask(taskId, { deadline });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const completedTaskCount = tasks.filter(
    (task) => task.status === "Atlikta",
  ).length;
  const overdueTaskCount = tasks.filter((task) => {
    if (task.status === "Atlikta" || !task.deadline) return false;

    const deadline = new Date(`${task.deadline}T00:00:00`);
    return deadline < today;
  }).length;

  return (
    <>
      <Navbar activePage={activePage} onNavigate={setActivePage} />

      {activePage === "home" && (
        <>
          {isLoggedIn && (
            <header className="welcome-message">
              <h1>Sveiki sugrįžę, {user.name || "naudotojau"}!</h1>
            </header>
          )}

          <main className="login-page">
            {!isLoggedIn && (
              <div className="login-card">
                <>
                  <header className="login-card__header">
                    <h1>Prisijungti</h1>
                    <p>Įveskite savo duomenis, kad tęstumėte</p>
                  </header>

                  <form className="login-form" onSubmit={handleSubmit}>
                    <label className="login-field">
                      <span>Vartotojo vardas</span>
                      <input
                        type="text"
                        name="username"
                        autoComplete="username"
                        placeholder="admin"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                      />
                    </label>

                    <label className="login-field">
                      <span>Slaptažodis</span>
                      <input
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                      />
                    </label>

                    <button type="submit" className="login-submit">
                      Prisijungti
                    </button>

                    {loginError && (
                      <p className="login-error" role="alert">
                        {loginError}
                      </p>
                    )}
                  </form>
                </>
              </div>
            )}

            {isLoggedIn && (
              <>
                <section className="dashboard-summary" aria-label="Užduočių suvestinė">
                  <p>
                    <strong>{tasks.length} užduotys</strong>
                    <span aria-hidden="true">·</span>
                    <strong>{completedTaskCount} atliktos</strong>
                    <span aria-hidden="true">·</span>
                    <strong>{overdueTaskCount} vėluoja</strong>
                  </p>
                </section>

                {apiError && (
                  <p className="login-error" role="alert">
                    {apiError}
                  </p>
                )}

                <TaskList
                  tasks={tasks}
                  loading={tasksLoading}
                  onStatusChange={handleTaskStatusChange}
                  onDeadlineChange={handleTaskDeadlineChange}
                />

                <AddTaskForm onAddTask={handleAddTask} />

                <ProgressBar initialProgress={50} />
              </>
            )}
          </main>
        </>
      )}

      {activePage === "profile" && (
        <Profile user={user} tasks={tasks} onSaveProfile={setUser} />
      )}
    </>
  );
}

export default App;
