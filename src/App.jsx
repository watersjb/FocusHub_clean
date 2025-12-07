export default function App() {
  return (
    <div className="layout theme-light">
      <div className="header">
        <div className="app-title">
          FocusHub
          <span className="app-badge">BETA</span>
        </div>
        <div className="header-actions">
          <button className="btn ghost">Login</button>
          <button className="btn primary">Start Focus</button>
        </div>
      </div>

      <div className="card agent-card terminal-card">
        <h2 className="card-title">Agent</h2>
        <p className="agent-text">Welcome to FocusHub. You’re here to work, not to browse.</p>
      </div>
    </div>
  );
}

