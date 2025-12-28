import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../Components/AuthComponents/AuthContext"; // Ensure correct import

const Login = () => {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const { login } = useAuth(); // Get login function from AuthContext
  const navigate = useNavigate();

  // Validate form before submission
  const validateForm = () => {
    let valid = true;
    setEmailError("");
    setPasswordError("");

    if (!emailOrUsername.trim()) {
      setEmailError("Email/Username is required.");
      valid = false;
    }

    if (!password.trim()) {
      setPasswordError("Password is required.");
      valid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      valid = false;
    }

    return valid;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;
    if (!emailOrUsername || !password) {
      setError("Both email/username and password are required.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailOrUsername.trim(), password: password.trim() }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed. Please try again.");
      }

      if (!data.token || !data.user || !data.user.role) {
        throw new Error("Invalid response from server. Please try again.");
      }

      // ✅ Store user & token globally
      login(data.user, data.token);

      // ✅ Redirect based on role
      if (["superadmin"].includes(data.user.role.toLowerCase())) {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      console.error("Error during login:", error);
      setError(error.message || "Something went wrong. Please try again later.");
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#F4F7FB' }}>
      <div style={{
        backgroundColor: 'white', 
        padding: '40px', 
        borderRadius: '10px', 
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)', 
        width: '100%',
        maxWidth: '400px'
      }}>
        <h2 style={{ textAlign: 'center', color: '#1E3A8A' }}>Log in</h2>
        {error && <p style={{ color: '#D32F2F', textAlign: 'center' }}>{error}</p>}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Email or Username"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                borderRadius: '8px',
                border: emailError ? '1px solid #D32F2F' : '1px solid #E0E0E0',
                outline: 'none'
              }}
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              required
            />
            {emailError && <div style={{ color: '#D32F2F', fontSize: '12px', marginTop: '5px' }}>{emailError}</div>}
          </div>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="password"
              placeholder="Password"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                borderRadius: '8px',
                border: passwordError ? '1px solid #D32F2F' : '1px solid #E0E0E0',
                outline: 'none'
              }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {passwordError && <div style={{ color: '#D32F2F', fontSize: '12px', marginTop: '5px' }}>{passwordError}</div>}
          </div>
          <button 
            type="submit" 
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              backgroundColor: '#1E3A8A',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              opacity: !emailOrUsername.trim() || !password.trim() || password.length < 6 ? 0.6 : 1
            }}
            disabled={!emailOrUsername.trim() || !password.trim() || password.length < 6}
          >
            Log in
          </button>
        </form>

        {/* Create Account Link */}
        <div className="mt-3 text-center">
          <p>
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
