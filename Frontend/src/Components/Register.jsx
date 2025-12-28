import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    course: "",
    college: "",
    latitude: null,
    longitude: null,
  });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  // Fetch user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prevData) => ({
            ...prevData,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Location access denied. Please enable location to continue.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let validationErrors = {};
    if (!formData.name) validationErrors.name = "Name is required.";
    if (!formData.username) validationErrors.username = "Username is required.";
    if (!formData.email.includes("@")) validationErrors.email = "Please enter a valid email.";
    if (formData.password.length < 8) validationErrors.password = "Password must be at least 8 characters long.";
    if (!formData.course) validationErrors.course = "Course/Degree is required.";
    if (!formData.college) validationErrors.college = "College name is required.";

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const otpResponse = await fetch("http://localhost:5000/api/auth/sendotp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });

      const otpData = await otpResponse.json();
      if (!otpResponse.ok) {
        alert(`Error sending OTP: ${otpData.message}`);
        return;
      }

      alert("OTP sent to your email. Please verify.");
      navigate("/register-verification", { state: { formData } });

    } catch (error) {
      console.error("OTP sending failed:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="bg-white p-4 rounded shadow-lg w-100" style={{ maxWidth: "400px" }}>
        <h2 className="text-center text-primary">Register</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
              className={`form-control ${errors.name ? "is-invalid" : ""}`}
              required
            />
            {errors.name && <div className="invalid-feedback">{errors.name}</div>}
          </div>

          <div className="mb-3">
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              className={`form-control ${errors.username ? "is-invalid" : ""}`}
              required
            />
            {errors.username && <div className="invalid-feedback">{errors.username}</div>}
          </div>

          <div className="mb-3">
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className={`form-control ${errors.email ? "is-invalid" : ""}`}
              required
            />
            {errors.email && <div className="invalid-feedback">{errors.email}</div>}
          </div>

          <div className="mb-3">
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className={`form-control ${errors.password ? "is-invalid" : ""}`}
              required
            />
            {errors.password && <div className="invalid-feedback">{errors.password}</div>}
          </div>

          <div className="mb-3">
            <input
              type="text"
              name="course"
              placeholder="Course"
              value={formData.course}
              onChange={handleChange}
              className={`form-control ${errors.course ? "is-invalid" : ""}`}
              required
            />
            {errors.course && <div className="invalid-feedback">{errors.course}</div>}
          </div>

          <div className="mb-3">
            <input
              type="text"
              name="college"
              placeholder="College"
              value={formData.college}
              onChange={handleChange}
              className={`form-control ${errors.college ? "is-invalid" : ""}`}
              required
            />
            {errors.college && <div className="invalid-feedback">{errors.college}</div>}
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-100"
            disabled={!formData.name || !formData.username || !formData.email || formData.password.length < 8}
          >
            Register
          </button>
        </form>

        <div className="mt-3 text-center">
          <p>
            Already have an account? <Link to="/login">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
