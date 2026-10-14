import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../Components/AuthComponents/AuthContext";
import AuthLayout, { FormError, SubmitButton, TextField } from "../Components/AuthComponents/AuthLayout";
import { getErrorMessage } from "../lib/api";

const Login = () => {
  const { login, verifyTwoFactor, isLoggedIn, user, sessionMessage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const destinationFor = (signedInUser) =>
    location.state?.from || (["admin", "superadmin"].includes(signedInUser?.role) ? "/admin" : "/dashboard");

  if (isLoggedIn && !loading) return <Navigate to={destinationFor(user)} replace />;

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(identifier.trim(), password);
      if (result.requiresTwoFactor) {
        setTwoFactorToken(result.twoFactorToken);
        setLoading(false);
        return;
      }
      navigate(destinationFor(result.user), { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };

  const handleTwoFactor = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await verifyTwoFactor(twoFactorToken, code.trim());
      if (data.recoveryCodesRemaining !== undefined) {
        window.alert(
          `You signed in with a recovery code. You have ${data.recoveryCodesRemaining} left; generate new ones in Profile → Security.`
        );
      }
      navigate(destinationFor(data.user), { replace: true });
    } catch (err) {
      const message = getErrorMessage(err);
      if (err?.response?.data?.code === "TWO_FACTOR_CHALLENGE_EXPIRED") {
        setTwoFactorToken(null);
        setCode("");
      }
      setError(message);
      setLoading(false);
    }
  };

  if (twoFactorToken) {
    return (
      <AuthLayout title="Two-factor authentication" subtitle="Enter the 6-digit code from your authenticator app.">
        <FormError message={error} />
        <form onSubmit={handleTwoFactor} noValidate>
          <TextField
            id="code"
            label="Authentication code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <SubmitButton loading={loading} disabled={code.trim().length < 6}>
            Verify
          </SubmitButton>
        </form>
        <p className="mt-4 text-center text-xs text-gray-500">
          Lost your device? Enter one of your recovery codes instead (format XXXXX-XXXXX).
        </p>
        <button
          type="button"
          className="mt-2 w-full text-center text-sm text-blue-700 underline"
          onClick={() => {
            setTwoFactorToken(null);
            setCode("");
            setError("");
          }}
        >
          Use a different account
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Log in"
      subtitle="Welcome back! Sign in to your classrooms."
      footer={
        <>
          Don&apos;t have an account? <Link to="/register">Create one</Link>
        </>
      }
    >
      <FormError message={error || sessionMessage} />
      <form onSubmit={handleLogin} noValidate>
        <TextField
          id="identifier"
          label="Email or username"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <div className="mb-4 -mt-2 text-right text-sm">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <SubmitButton loading={loading} disabled={!identifier.trim() || !password}>
          Log in
        </SubmitButton>
      </form>
    </AuthLayout>
  );
};

export default Login;
