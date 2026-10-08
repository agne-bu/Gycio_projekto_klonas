import { useEffect, useState } from "react";
import TaskList from "./TaskList";
import ProgressBar from "./ProgressBar";
import Navbar from "./Navbar";
import AddTaskForm from "./AddTaskForm";
import Profile from "./Profile";
import "./App.css";

const TASKS_API_URL = "https://testapi.io/api/agne-bu/resource/tasklist";
const USERS_API_URL = "https://testapi.io/api/agne-bu/resource/Useriai";

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
  const ownerUsername = record["Vartotojo vardas"] || record.ownerUsername || "";

  return {
    id,
    title: title || `Įrašas #${id ?? "be ID"}`,
    status: status || "Nepradėta",
    deadline,
    ownerUsername,
    isIncomplete: !title || !status || !deadline,
  };
}

function getApiRecords(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

function normalizeUser(user) {
  const record = user?.data && !Array.isArray(user.data) ? user.data : user || {};

  return {
    id: record.id ?? record._id,
    username: record["Vartotojo vardas"] || record.username || "",
    password: record.Slaptazodis || record.password || "",
  };
}

function App() {
  const [user, setUser] = useState({
    name: "Jonas Jonaitis",
    email: "jonas@flowly.lt",
  });

  const [activePage, setActivePage] = useState("home");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    if (!isLoggedIn || !username.trim()) {
      setTasks([]);
      setTasksLoading(false);
      return undefined;
    }

    let isMounted = true;
    setTasksLoading(true);

    async function loadTasks() {
      try {
        const response = await fetch(TASKS_API_URL);
        const result = await readApiResponse(response);
        const records = getApiRecords(result);
        const loadedTasks = records
          .map(normalizeTask)
          .filter(
            (task) =>
              !task.isIncomplete && task.ownerUsername === username.trim(),
          );

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
  }, [isLoggedIn, username]);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoginError("");
    setIsAuthenticating(true);

    try {
      const usersResponse = await fetch(USERS_API_URL);
      const usersResult = await readApiResponse(usersResponse);
      const users = getApiRecords(usersResult).map(normalizeUser);
      const matchingUser = users.find(
        (user) => user.username === username.trim(),
      );

      if (isRegistering) {
        if (matchingUser) {
          setLoginError("Toks vartotojo vardas jau užregistruotas.");
          return;
        }

        const createResponse = await fetch(USERS_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            "Vartotojo vardas": username.trim(),
            Slaptazodis: password,
          }),
        });
        const createdUser = normalizeUser(await readApiResponse(createResponse));

        if (
          createdUser.username !== username.trim() ||
          createdUser.password !== password
        ) {
          throw new Error(
            "API neišsaugojo vartotojo duomenų. Patikrink laukų pavadinimus Vartotojo vardas ir Slaptazodis.",
          );
        }

        setPassword("");
        setIsRegistering(false);
        setLoginError("Paskyra sukurta. Dabar prisijunkite.");
        return;
      }

      if (!matchingUser || matchingUser.password !== password) {
        setLoginError("Neteisingas vartotojo vardas arba slaptažodis.");
        return;
      }

      setUser((currentUser) => ({
        ...currentUser,
        name: matchingUser.username,
      }));
      setUsername(matchingUser.username);
      setIsLoggedIn(true);
    } catch (error) {
      setLoginError(`Nepavyko prisijungti: ${error.message}`);
    } finally {
      setIsAuthenticating(false);
    }
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
          "Vartotojo vardas": username.trim(),
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

      if (savedTask.ownerUsername !== username.trim()) {
        throw new Error(
          "TestAPI neišsaugojo vartotojo ryšio. tasklist lentelėje sukurk stulpelį Vartotojo vardas.",
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
        "Vartotojo vardas": username.trim(),
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
      <Navbar
        activePage={activePage}
        onNavigate={setActivePage}
        isLoggedIn={isLoggedIn}
      />

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
                    <h1>{isRegistering ? "Registruotis" : "Prisijungti"}</h1>
                    <p>
                      {isRegistering
                        ? "Sukurkite paskyrą tęsdami žemiau"
                        : "Įveskite savo duomenis, kad tęstumėte"}
                    </p>
                  </header>

                  <form className="login-form" onSubmit={handleSubmit}>
                    <label className="login-field">
                      <span>Vartotojo vardas</span>
                      <input
                        type="text"
                        name="username"
                        autoComplete="username"
                        placeholder="admin"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        required
                      />
                    </label>

                    <label className="login-field">
                      <span>Slaptažodis</span>
                      <input
                        type="password"
                        name="password"
                        autoComplete={
                          isRegistering ? "new-password" : "current-password"
                        }
                        placeholder="••••••••"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                      />
                    </label>

                    <button
                      type="submit"
                      className="login-submit"
                      disabled={isAuthenticating}
                    >
                      {isAuthenticating
                        ? "Tikrinama..."
                        : isRegistering
                          ? "Sukurti paskyrą"
                          : "Prisijungti"}
                    </button>

                    <button
                      type="button"
                      className="login-switch"
                      disabled={isAuthenticating}
                      onClick={() => {
                        setIsRegistering((current) => !current);
                        setLoginError("");
                      }}
                    >
                      {isRegistering
                        ? "Jau turite paskyrą? Prisijunkite"
                        : "Neturite paskyros? Registruokitės"}
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
