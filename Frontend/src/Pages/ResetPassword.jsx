import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AuthLayout, { FormError, SubmitButton, TextField } from "../Components/AuthComponents/AuthLayout";
import api, { getErrorMessage, getFieldErrors } from "../lib/api";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords don't match" });
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password, confirmPassword });
      navigate("/login", { replace: true, state: { from: "/dashboard" } });
      window.alert("Password updated. Please sign in with your new password.");
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Choose a new password" subtitle="Use at least 8 characters with a letter and a number." footer={<Link to="/login">Back to log in</Link>}>
      <FormError message={error} />
      <form onSubmit={handleSubmit} noValidate>
        <TextField
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          error={fieldErrors.password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <TextField
          id="confirmPassword"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          error={fieldErrors.confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <SubmitButton loading={loading} disabled={!password || !confirmPassword}>
          Update password
        </SubmitButton>
      </form>
    </AuthLayout>
  );
};

export default ResetPassword;
