import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const RegisterVerification = () => {
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const formData = location.state?.formData;

  if (!formData) {
    navigate("/register");
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const registerResponse = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, otp }),
      });

      const data = await registerResponse.json();
      if (registerResponse.ok) {
        alert("Registration complete! You can now log in.");
        navigate("/login");
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <form className="p-6 bg-white rounded shadow-md" onSubmit={handleSubmit}>
        <h2 className="text-xl mb-4">Enter OTP</h2>
        <input
          type="text"
          name="otp"
          placeholder="Enter OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="block w-full p-2 mb-2 border"
          required
        />
        <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">
          Verify
        </button>
      </form>
    </div>
  );
};

export default RegisterVerification;
