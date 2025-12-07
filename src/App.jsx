import { useState, useEffect } from "react";
import "./App.css";

// Firebase (anonymous login)
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAtB2RU0Ek2xsLt2m6mX8IVWLslDRDStZw",
  authDomain: "focushub-f1320.firebaseapp.com",
  projectId: "focushub-f1320",
  storageBucket: "focushub-f1320.appspot.com",
  messagingSenderId: "437953550940",
  appId: "1:437953550940:web:36fb5571c409a492ec6499"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Unique ID generator
let idCounter = 1;
const newId = () => idCounter++;

// Pomodoro config
const DEFAULT_SPRINT_MIN = 25;
const DEFAULT_SHORT_BREAK_MIN = 5;
const DEFAULT_LONG_BREAK_MIN = 15;
const SPRINTS_BEFORE_LONG_BREAK = 4;

// App component
export default function App() {
  const [theme, setTheme] = useState("light");

  // Auth state
  const [userId, setUserId] = useState(null);

  // Energy
  const [energy, setEnergy] = useState(0); // 0 unset, 1 fumes, 2 meh, 3 full

  // Timer
  const [mode, setMode] = useState("idle"); // idle | sprint | shortBreak | longBreak
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_SPRINT_MIN * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sprintsDoneToday, setSprintsDoneToday] = useState(0);
  const [sprintsSinceLongBreak, setSprintsSinceLongBreak] = useState(0);

  // Guided prompts
  const [nextSuggestion, setNextSuggestion] = useState("");
  const [agentMessage, setAgentMessage] = useState(
    "Welcome to FocusHub. You’re here to work, not to browse."
  );

  // Pro toggle
  const [isPro, setIsPro] = useState(false);

  // Daily grading
  const [dailyGrade, setDailyGrade] = useState(null);
  const [dailyScore, setDailyScore] = useState(null);

  // Tasks
  const [brainDumpInput, setBrainDumpInput] = useState("");
  const [tasks, setTasks] = useState({
    brain: [],
    urgent: [],
    deep: [],
    strategic: [],
    done: [],
  });

  // Distractions
  const [isDistractionOpen, setIsDistractionOpen] = useState(false);
  const [distractionInput, setDistractionInput] = useState("");
  const [distractions, setDistractions] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        // Load stored tasks and grades later
      } else {
        await signInAnonymously(auth);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, mode]);

  function energyAdjustedSprintMinutes() {
    if (energy === 3) return 30;
    if (energy === 2) return 25;
    if (energy === 1) return 15;
    return DEFAULT_SPRINT_MIN;
  }

  function startSprint() {
    const sprintMin = energyAdjustedSprintMinutes();
    setMode("sprint");
    setSecondsLeft(sprintMin * 60);
    setIsRunning(true);
    setNextSuggestion("");
    setAgentMessage(
      sprintMin >= 25
        ? "Deep Work time. No distractions. You can rest after."
        : "Short sprint. No excuses. Just move."
    );
  }

  function startShortBreak() {
    setMode("shortBreak");
    setSecondsLeft(DEFAULT_SHORT_BREAK_MIN * 60);
    setIsRunning(true);
    setNextSuggestion("");
    setAgentMessage(
      "Short break. Don’t wander off. Drink water. Stretch. Then back at it."
    );
  }
  function startLongBreak() {
    setMode("longBreak");
    setSecondsLeft(DEFAULT_LONG_BREAK_MIN * 60);
    setIsRunning(true);
    setNextSuggestion("");
    setAgentMessage(
      "Long break. Step away properly. Don’t turn this into a full escape."
    );
  }

  function resetTimer() {
    setIsRunning(false);
    setMode("idle");
    setSecondsLeft(energyAdjustedSprintMinutes() * 60);
    setNextSuggestion("");
    setAgentMessage("Timer reset. Decide: sprint or hiding?");
  }

  function handleTimerComplete() {
    setIsRunning(false);

    if (mode === "sprint") {
      setSprintsDoneToday((c) => c + 1);
      setSprintsSinceLongBreak((c) => c + 1);

      const longBreakDue = sprintsSinceLongBreak + 1 >= SPRINTS_BEFORE_LONG_BREAK;

      if (longBreakDue) {
        setNextSuggestion("Sprint done. Take a 15-minute long break.");
        setAgentMessage(
          "Sprint finished. You earned a real break. Take it, then get back in."
        );
      } else {
        setNextSuggestion("Sprint done. Take a 5-minute short break.");
        setAgentMessage(
          "Nice. Don’t get lost. Hit a 5-minute break, then we go again."
        );
      }
    } else if (mode === "shortBreak") {
      setNextSuggestion("Short break over. Start your next sprint.");
      setAgentMessage("Break’s over. Don’t overthink it. Start the next sprint.");
    } else if (mode === "longBreak") {
      setNextSuggestion("Long break over. Start your next sprint block.");
      setAgentMessage("You should feel reset. Start a new sprint block. No drifting.");
      setSprintsSinceLongBreak(0);
    } else {
      setNextSuggestion("");
    }
  }

  function calculateDailyGrade() {
    const urgentWeight = tasks.urgent.length * 1;
    const deepWeight = tasks.deep.length * 2;
    const strategicWeight = tasks.strategic.length * 3;
    const estimatedGoal = urgentWeight + deepWeight + strategicWeight || 4;

    const sprintRatio = Math.min(1, sprintsDoneToday / estimatedGoal);
    const distractionPenalty = Math.min(0.4, distractions.length * 0.05);
    const energyFactor = energy === 1 ? 0.85 : energy === 2 ? 0.95 : 1.0;

    let score = sprintRatio * energyFactor - distractionPenalty;
    score = Math.max(0, Math.min(1, score));
    const numericScore = Math.round(score * 100);

    let grade = "F";
    if (numericScore >= 90) grade = "A";
    else if (numericScore >= 80) grade = "B";
    else if (numericScore >= 70) grade = "C";
    else if (numericScore >= 60) grade = "D";

    setDailyGrade(grade);
    setDailyScore(numericScore);

    if (grade === "A") {
      setAgentMessage("That’s an A day. Don’t get cocky. Show me two in a row.");
    } else if (grade === "B") {
      setAgentMessage("Solid B. Good. Now tighten up the distractions and push to A.");
    } else if (grade === "C") {
      setAgentMessage(
        "C day. Passing, but barely. You’re capable of more. Tomorrow needs intention."
      );
    } else if (grade === "D") {
      setAgentMessage("D day. You know this isn’t your standard. Identify what derailed you.");
    } else {
      setAgentMessage("F day. No sugarcoating. You didn’t show up. Tomorrow is a reset.");
    }
  }

  function addBrainDumpTasks() {
    const text = brainDumpInput.trim();
    if (!text) return;

    const lines = text
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);

    setTasks((prev) => ({
      ...prev,
      brain: [...prev.brain, ...lines.map((line) => ({ id: newId(), text: line }))],
    }));

    setBrainDumpInput("");
    setAgentMessage("Brain dump captured. Good. But dumping isn’t doing.");
  }

  function moveTask(taskId, fromKey, toKey) {
    if (fromKey === toKey) return;

    setTasks((prev) => {
      const fromList = prev[fromKey];
      const task = fromList.find((t) => t.id === taskId);
      if (!task) return prev;

      const newFrom = fromList.filter((t) => t.id !== taskId);
      const newTo = [...prev[toKey], task];

      return {
        ...prev,
        [fromKey]: newFrom,
        [toKey]: newTo,
      };
    });

    if (toKey === "done") {
      setAgentMessage("Task moved to Done. Good. Do more of that.");
    } else if (fromKey === "brain" && toKey !== "brain") {
      setAgentMessage("You’re turning noise into action. Keep sorting.");
    }
  }

  function addDistraction() {
    const text = distractionInput.trim();
    if (!text) return;

    const d = {
      id: newId(),
      text,
      createdAt: new Date().toISOString(),
    };

    setDistractions((prev) => [d, ...prev]);
    setDistractionInput("");
    setAgentMessage("Good. You caught the distraction instead of chasing it. Back to the sprint.");
  }

  function promoteDistractionToTask(dId) {
    const distraction = distractions.find((d) => d.id === dId);
    if (!distraction) return;

    setTasks((prev) => ({
      ...prev,
      brain: [...prev.brain, { id: newId(), text: distraction.text }],
    }));

    setDistractions((prev) => prev.filter((d) => d.id !== dId));
    setAgentMessage("That distraction is now a task. It can wait its turn. Don’t jump to it now.");
  }
  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");

  function renderModeLabel() {
    if (mode === "sprint") return "Focus sprint";
    if (mode === "shortBreak") return "Short break";
    if (mode === "longBreak") return "Long break";
    return "Idle";
  }

  return (
    <div className={`app-root ${theme === "dark" ? "theme-dark" : "theme-light"}`}>
      <header className="header">
        <div className="logo-wrapper">
          <img
            src={theme === "dark" ? "/FocusHub_horiinv.svg" : "/FocusHub_horinorm.svg"}
            alt="FocusHub Logo"
            className="logo-img"
          />
        </div>
        <div className="header-actions">
          <button className="btn ghost" onClick={() => setIsDistractionOpen(true)}>
            Distractions ({distractions.length})
          </button>
          <button className="btn ghost" onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}>
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="top-row">
          <div className="card">
            <h2 className="card-title">Energy Check-in</h2>
            <div className="energy-buttons">
              <EnergyButton label="🚀 Full Power" selected={energy === 3} onClick={() => setEnergy(3)} />
              <EnergyButton label="😐 Meh" selected={energy === 2} onClick={() => setEnergy(2)} />
              <EnergyButton label="🔋 On Fumes" selected={energy === 1} onClick={() => setEnergy(1)} />
            </div>
            <div className="energy-text">
              {energy === 0 && <p>Select your energy so I can push you properly.</p>}
              {energy === 3 && <p>High energy. This is Deep Work time. Don’t waste it.</p>}
              {energy === 2 && <p>Medium energy. Pick solid tasks. No doom scrolling.</p>}
              {energy === 1 && <p>Low energy. Small tasks only. Momentum over perfection.</p>}
            </div>
          </div>

          <div className="card timer-card">
            <div className="timer-label">{renderModeLabel()}</div>
            <div className="timer-display">{minutes}:{secs}</div>
            <div className="timer-sub">Sprints today: <span>{sprintsDoneToday}</span></div>
            {nextSuggestion && <div className="timer-suggestion">{nextSuggestion}</div>}
            <div className="timer-buttons">
              <button className="btn primary" onClick={startSprint} disabled={isRunning && mode === "sprint"}>
                Start Sprint
              </button>
              <button
                className="btn success"
                onClick={() =>
                  sprintsSinceLongBreak >= SPRINTS_BEFORE_LONG_BREAK ? startLongBreak() : startShortBreak()
                }
                disabled={isRunning && (mode === "shortBreak" || mode === "longBreak")}
              >
                {sprintsSinceLongBreak >= SPRINTS_BEFORE_LONG_BREAK ? "Start Long Break" : "Start Short Break"}
              </button>
              <button className="btn neutral" onClick={resetTimer}>Reset</button>
            </div>
          </div>
        </section>

        <section className="task-row">
          <div className="task-column">
            <div className="card task-column-card">
              <h3 className="task-column-title">Brain Dump</h3>
              <p className="task-column-text">Dump everything in your head. One per line.</p>
              <textarea
                className="brain-input"
                rows={3}
                placeholder="Type or paste tasks..."
                value={brainDumpInput}
                onChange={(e) => setBrainDumpInput(e.target.value)}
              />
              <button className="btn primary small" onClick={addBrainDumpTasks}>
                Add to Brain Dump
              </button>
              <TaskList tasks={tasks.brain} onMove={(id, toKey) => moveTask(id, "brain", toKey)} />
            </div>

            <div className="card task-column-card">
              <h3 className="task-column-title">Done Today</h3>
              <TaskList tasks={tasks.done} isDone onMove={(id, toKey) => moveTask(id, "done", toKey)} />
            </div>
          </div>

          <div className="card task-priority">
            <h2 className="card-title">Prioritized Work</h2>
            <div className="priority-section">
              <h3 className="task-column-title">🔥 Urgent Admin</h3>
              <TaskList tasks={tasks.urgent} onMove={(id, toKey) => moveTask(id, "urgent", toKey)} />
            </div>
            <div className="priority-section">
              <h3 className="task-column-title">🏗️ Deep Work</h3>
              <TaskList tasks={tasks.deep} onMove={(id, toKey) => moveTask(id, "deep", toKey)} />
            </div>
            <div className="priority-section">
              <h3 className="task-column-title">🚀 Strategic Leap</h3>
              <TaskList tasks={tasks.strategic} onMove={(id, toKey) => moveTask(id, "strategic", toKey)} />
            </div>
          </div>
        </section>

        <section className="agent-row">
          <div className="card agent-card terminal-card">
            <h2 className="card-title">Agent</h2>
            <p className="agent-text monospace">{agentMessage}</p>
          </div>
        </section>
      </main>

      {isDistractionOpen && (
        <DistractionDrawer
          distractions={distractions}
          input={distractionInput}
          onChangeInput={setDistractionInput}
          onAdd={addDistraction}
          onPromote={promoteDistractionToTask}
          onClose={() => setIsDistractionOpen(false)}
        />
      )}
    </div>
  );
}

// Subcomponents

function EnergyButton({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`energy-btn ${selected ? "energy-btn-selected" : ""}`}
    >
      {label}
    </button>
  );
}

const MOVE_TARGETS = [
  { key: "brain", label: "Brain" },
  { key: "urgent", label: "Urgent" },
  { key: "deep", label: "Deep" },
  { key: "strategic", label: "Strategic" },
  { key: "done", label: "Done" },
];

function TaskList({ tasks, onMove, isDone }) {
  if (!tasks || tasks.length === 0) {
    return <div className="task-dropzone empty">Empty.</div>;
  }
  return (
    <div className="task-dropzone">
      {tasks.map((task) => (
        <div key={task.id} className={`task-item ${isDone ? "task-done" : ""}`}>
          <div className="task-text">{task.text}</div>
          {!isDone && (
            <div className="task-move">
              {MOVE_TARGETS.map((t) => (
                <button
                  key={t.key}
                  className="task-move-btn"
                  onClick={() => onMove(task.id, t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DistractionDrawer({ distractions, input, onChangeInput, onAdd, onPromote, onClose }) {
  return (
    <div className="drawer-overlay">
      <div className="drawer-backdrop" onClick={onClose}></div>
      <div className="drawer">
        <div className="drawer-header">
          <h2 className="drawer-title">Distraction Catcher</h2>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        <p className="drawer-text">
          When your brain says “oh I need to…” capture it here instead of acting on it.
        </p>

        <div className="drawer-input-row">
          <input
            className="drawer-input"
            type="text"
            placeholder="Type distraction and hit Add"
            value={input}
            onChange={(e) => onChangeInput(e.target.value)}
          />
          <button className="btn primary small" onClick={onAdd}>Add</button>
        </div>

        <div className="drawer-list">
          {distractions.length === 0 ? (
            <span className="task-empty">No distractions logged yet.</span>
          ) : (
            distractions.map((d) => (
              <div key={d.id} className="distraction-item">
                <div className="distraction-text">{d.text}</div>
                <button className="task-move-btn" onClick={() => onPromote(d.id)}>
                  Turn into task
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
