import { useState } from "react";
import { useAuth } from "@/app/AuthContext";

export function LoginScreen() {
  const auth = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await auth.login(username, password);
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-card__brand">
          <h1>
            <span>Case</span>
            <span className="app-header__flow">Flow</span>
            <span className="app-header__version">v1.0</span>
          </h1>
          <p>Internal matter management for firm use.</p>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Username</span>
            <input
              autoComplete="username"
              value={username}
              onChange={(event) => {
                auth.clearError();
                setUsername(event.target.value);
              }}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                auth.clearError();
                setPassword(event.target.value);
              }}
            />
          </label>

          {auth.error ? <p className="login-card__error">{auth.error}</p> : null}

          <button type="submit" className="button" disabled={auth.isLoading}>
            {auth.isLoading ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
