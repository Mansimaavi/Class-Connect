import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../../lib/api";
import AuthLayout, { FormError, FormSuccess, SubmitButton, TextField } from "./AuthLayout";

const RegisterVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const formData = location.state?.formData;

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  if (!formData) return <Navigate to="/register" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/register", { ...formData, otp: otp.trim() });
      navigate("/login", { replace: true });
      window.alert("Your account is ready. Please sign in.");
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };

  const resend = async () => {
    setError("");
    setNotice("");
    setResending(true);
    try {
      await api.post("/auth/send-otp", { email: formData.email });
      setNotice("A new code is on its way.");
      setOtp("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={`We sent a 6-digit code to ${formData.email}. It expires in 10 minutes.`}
      footer={<Link to="/register">Use a different email</Link>}
    >
      <FormError message={error} />
      <FormSuccess message={notice} />
      <form onSubmit={handleSubmit} noValidate>
        <TextField
          id="otp"
          label="Verification code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          autoFocus
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
        />
        <SubmitButton loading={loading} disabled={otp.length !== 6}>
          Create account
        </SubmitButton>
      </form>
      <button type="button" onClick={resend} disabled={resending} className="mt-3 w-full text-sm text-blue-700 underline disabled:opacity-50">
        {resending ? "Sending…" : "Didn't get it? Send a new code"}
      </button>
    </AuthLayout>
  );
};

export default RegisterVerification;
