import { useState } from "react";
import { LogIn, PanelsTopLeft } from "lucide-react";
import { Button } from "../components/ui";
import { login, loginErrorMessage } from "../lib/api";

export function Login() {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      // On success the token store changes and App swaps this page for the workspace.
      await login(password);
    } catch (failure) {
      setError(loginErrorMessage(failure));
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="panel login-panel">
        <span className="brand-mark">
          <PanelsTopLeft size={23} strokeWidth={1.9} />
        </span>
        <h1 className="login-title">Sign in</h1>
        <p className="login-lead">
          Enter the admin password to open your leads.
        </p>
        <form onSubmit={submit}>
          <div className="form-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              maxLength={256}
              value={password}
              disabled={submitting}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby={error ? "login-error" : undefined}
              aria-invalid={error ? true : undefined}
            />
          </div>
          {error && (
            <p id="login-error" className="login-error" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            icon={LogIn}
            busy={submitting}
            className="login-submit"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </section>
    </main>
  );
}
