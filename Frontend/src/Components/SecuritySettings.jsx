import { useCallback, useEffect, useState } from "react";
import api, { getErrorMessage } from "../lib/api";
import { useAuth } from "./AuthComponents/AuthContext";

const Card = ({ title, description, children }) => (
  <div className="mb-6 rounded-lg border border-gray-100 p-5">
    <h3 className="mb-1 text-lg font-semibold text-gray-800">{title}</h3>
    {description && <p className="mb-4 text-sm text-gray-500">{description}</p>}
    {children}
  </div>
);

const inputClass = "mb-2 w-full rounded border px-4 py-2 outline-none focus:ring-2 focus:ring-purple-300";
const buttonClass = "rounded bg-purple-700 px-4 py-2 text-white hover:bg-purple-500 disabled:opacity-50";

const Feedback = ({ state }) =>
  state?.message ? (
    <p className={`mt-2 text-sm ${state.type === "error" ? "text-red-600" : "text-green-700"}`} role={state.type === "error" ? "alert" : "status"}>
      {state.message}
    </p>
  ) : null;

const RecoveryCodes = ({ codes, onDone }) => (
  <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">
    <p className="mb-2 font-semibold">Save these recovery codes</p>
    <p className="mb-3 text-sm text-gray-700">
      Each code works once if you lose your phone. This is the only time they&apos;ll be shown.
    </p>
    <div className="mb-3 grid grid-cols-2 gap-2 font-mono text-sm">
      {codes.map((code) => (
        <span key={code} className="rounded bg-white px-2 py-1">
          {code}
        </span>
      ))}
    </div>
    <div className="flex gap-2">
      <button className="rounded border bg-white px-3 py-1 text-sm" onClick={() => navigator.clipboard?.writeText(codes.join("\n"))}>
        Copy
      </button>
      <button className={buttonClass} onClick={onDone}>
        I&apos;ve saved them
      </button>
    </div>
  </div>
);

const TwoFactorSection = ({ onStatusChange }) => {
  const [status, setStatus] = useState(null);
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/2fa");
      setStatus(data);
      onStatusChange?.(data.enabled);
    } catch (err) {
      setFeedback({ type: "error", message: getErrorMessage(err) });
    }
  }, [onStatusChange]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const run = async (action) => {
    setBusy(true);
    setFeedback(null);
    try {
      await action();
    } catch (err) {
      setFeedback({ type: "error", message: getErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const startSetup = () =>
    run(async () => {
      const { data } = await api.post("/auth/2fa/setup");
      setSetup(data);
      setCode("");
    });

  const enable = () =>
    run(async () => {
      const { data } = await api.post("/auth/2fa/enable", { code: code.trim() });
      setSetup(null);
      setCode("");
      setRecoveryCodes(data.recoveryCodes);
      await loadStatus();
    });

  const disable = () =>
    run(async () => {
      await api.post("/auth/2fa/disable", { password, code: code.trim() });
      setPassword("");
      setCode("");
      setFeedback({ type: "success", message: "Two-factor authentication is now off." });
      await loadStatus();
    });

  const regenerate = () =>
    run(async () => {
      const { data } = await api.post("/auth/2fa/recovery-codes", { code: code.trim() });
      setCode("");
      setRecoveryCodes(data.recoveryCodes);
      await loadStatus();
    });

  if (!status) return <Card title="Two-factor authentication">Loading…</Card>;

  return (
    <Card
      title="Two-factor authentication"
      description="Protect your account with a 6-digit code from an authenticator app (Google Authenticator, Authy, 1Password…) in addition to your password."
    >
      {recoveryCodes ? (
        <RecoveryCodes codes={recoveryCodes} onDone={() => setRecoveryCodes(null)} />
      ) : status.enabled ? (
        <>
          <p className="mb-3 text-sm">
            <span className="mr-2 rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-700">On</span>
            {status.recoveryCodesRemaining} recovery code{status.recoveryCodesRemaining === 1 ? "" : "s"} left
          </p>
          <input className={inputClass} placeholder="Code from your app" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} />
          <div className="mb-3 flex flex-wrap gap-2">
            <button className={buttonClass} disabled={busy || code.trim().length < 6} onClick={regenerate}>
              New recovery codes
            </button>
          </div>
          <input
            className={inputClass}
            type="password"
            placeholder="Password (to turn 2FA off)"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-500 disabled:opacity-50"
            disabled={busy || !password || code.trim().length < 6}
            onClick={disable}
          >
            Turn off 2FA
          </button>
        </>
      ) : setup ? (
        <div className="flex flex-col gap-4 md:flex-row">
          <img src={setup.qrCode} alt="QR code to scan with your authenticator app" className="h-44 w-44 rounded border" />
          <div className="flex-1">
            <ol className="mb-3 pl-4 text-sm text-gray-700">
              <li>Scan the QR code with your authenticator app.</li>
              <li>
                Or enter this key manually: <code className="break-all">{setup.secret}</code>
              </li>
              <li>Type the 6-digit code it shows to finish.</li>
            </ol>
            <input className={inputClass} placeholder="123456" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
            <div className="flex gap-2">
              <button className={buttonClass} disabled={busy || code.trim().length !== 6} onClick={enable}>
                Turn on
              </button>
              <button className="rounded border px-4 py-2" onClick={() => setSetup(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button className={buttonClass} disabled={busy} onClick={startSetup}>
          Set up two-factor authentication
        </button>
      )}
      <Feedback state={feedback} />
    </Card>
  );
};

const SessionsSection = () => {
  const { logoutEverywhere } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [feedback, setFeedback] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/sessions");
      setSessions(data.sessions);
    } catch (err) {
      setFeedback({ type: "error", message: getErrorMessage(err) });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const revoke = async (id) => {
    try {
      await api.delete(`/auth/sessions/${id}`);
      setSessions((current) => current.filter((s) => s.id !== id));
    } catch (err) {
      setFeedback({ type: "error", message: getErrorMessage(err) });
    }
  };

  const describe = (userAgent = "") => {
    const browser = /Edg\//.test(userAgent) ? "Edge" : /Chrome\//.test(userAgent) ? "Chrome" : /Firefox\//.test(userAgent) ? "Firefox" : /Safari\//.test(userAgent) ? "Safari" : "Browser";
    const os = /Windows/.test(userAgent) ? "Windows" : /Mac OS X/.test(userAgent) ? "macOS" : /Android/.test(userAgent) ? "Android" : /iPhone|iPad/.test(userAgent) ? "iOS" : /Linux/.test(userAgent) ? "Linux" : "";
    return [browser, os].filter(Boolean).join(" on ");
  };

  return (
    <Card title="Where you're signed in" description="Sign out of devices you don't recognise.">
      <ul className="mb-3 divide-y p-0">
        {sessions.map((session) => (
          <li key={session.id} className="flex items-center justify-between py-2 text-sm">
            <span>
              {describe(session.userAgent)}
              <span className="block text-xs text-gray-500">Last active {new Date(session.lastUsedAt).toLocaleString()}</span>
            </span>
            <button className="text-red-600 hover:underline" onClick={() => revoke(session.id)}>
              Sign out
            </button>
          </li>
        ))}
      </ul>
      <button
        className="rounded border border-red-600 px-4 py-2 text-red-600 hover:bg-red-50"
        onClick={() => window.confirm("Sign out of every device, including this one?") && logoutEverywhere()}
      >
        Sign out everywhere
      </button>
      <Feedback state={feedback} />
    </Card>
  );
};

const SecuritySettings = ({ onTwoFactorChange }) => {
  const { updateUser, replaceAccessToken } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [emailFeedback, setEmailFeedback] = useState(null);
  const [passwordFeedback, setPasswordFeedback] = useState(null);

  const handleEmailUpdate = async () => {
    setEmailFeedback(null);
    try {
      const { data } = await api.patch("/users/me/email", { newEmail: newEmail.trim(), password: emailPassword });
      updateUser({ email: data.user.email });
      setNewEmail("");
      setEmailPassword("");
      setEmailFeedback({ type: "success", message: "Email updated." });
    } catch (err) {
      setEmailFeedback({ type: "error", message: getErrorMessage(err) });
    }
  };

  const handlePasswordUpdate = async () => {
    setPasswordFeedback(null);
    try {
      const { data } = await api.patch("/users/me/password", { currentPassword, newPassword });
      replaceAccessToken(data.accessToken);
      setCurrentPassword("");
      setNewPassword("");
      setPasswordFeedback({ type: "success", message: "Password updated. Your other devices have been signed out." });
    } catch (err) {
      setPasswordFeedback({ type: "error", message: getErrorMessage(err) });
    }
  };

  return (
    <div className="mb-6 rounded bg-white p-6 shadow">
      <h2 className="mb-6 text-xl font-semibold text-gray-700">Security settings</h2>

      <TwoFactorSection onStatusChange={onTwoFactorChange} />

      <Card title="Change email">
        <input type="email" className={inputClass} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="New email" />
        <input
          type="password"
          className={inputClass}
          value={emailPassword}
          onChange={(e) => setEmailPassword(e.target.value)}
          placeholder="Current password"
          autoComplete="current-password"
        />
        <button onClick={handleEmailUpdate} className={buttonClass} disabled={!newEmail.includes("@") || !emailPassword}>
          Update email
        </button>
        <Feedback state={emailFeedback} />
      </Card>

      <Card title="Change password" description="At least 8 characters with a letter and a number.">
        <input
          type="password"
          className={inputClass}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Current password"
          autoComplete="current-password"
        />
        <input
          type="password"
          className={inputClass}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password"
          autoComplete="new-password"
        />
        <button onClick={handlePasswordUpdate} className={buttonClass} disabled={!currentPassword || newPassword.length < 8}>
          Update password
        </button>
        <Feedback state={passwordFeedback} />
      </Card>

      <SessionsSection />
    </div>
  );
};

export default SecuritySettings;
