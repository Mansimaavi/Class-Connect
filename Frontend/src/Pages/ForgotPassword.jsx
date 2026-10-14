import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout, { FormError, FormSuccess, SubmitButton, TextField } from "../Components/AuthComponents/AuthLayout";
import api, { getErrorMessage } from "../lib/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email: email.trim() });
      setMessage(data.message);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a link to reset it."
      footer={<Link to="/login">Back to log in</Link>}
    >
      <FormError message={error} />
      <FormSuccess message={message} />
      {!message && (
        <form onSubmit={handleSubmit} noValidate>
          <TextField id="email" label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <SubmitButton loading={loading} disabled={!email.includes("@")}>
            Send reset link
          </SubmitButton>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
