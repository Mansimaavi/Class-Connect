import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import sittingchild from '../assets/sittting.png';
import block from '../assets/block.png';
import { FaUser, FaUserCircle, FaEnvelope, FaLock, FaBookOpen, FaUniversity } from "react-icons/fa";

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
      console.log("hey");
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
    <div className="relative flex min-h-screen bg-[#faf6f6] items-center justify-center px-4 overflow-hidden">
      {/* Right Form Section */}
      <div className="w-full md:w-1/3 p-8 bg-[#f8f8f8]">
        <h1 className="text-2xl font-extrabold font-Cal Sans mb-1">Let's<br />Start Learning</h1>
        <p className="text-gray-600 mb-6">Please login or sign up to continue</p>

        <form onSubmit={handleSubmit}>
        <div className="mb-2 relative">
    <FaUser className="absolute  top-1/2 left-3 transform -translate-y-1/2 text-gray-400" />
    <input
      type="text"
      name="name"
      placeholder="Name"
      value={formData.name}
      onChange={handleChange}
      className="w-full pl-12 px-10 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
    />
    {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
  </div>

  <div className="mb-2 relative">
    <FaUserCircle className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" />
    <input
      type="text"
      name="username"
      placeholder="Username"
      value={formData.username}
      onChange={handleChange}
      className="w-full pl-12 px-10 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
    />
    {errors.username && <p className="text-red-500 text-sm">{errors.username}</p>}
  </div>

  <div className="mb-2 relative">
    <FaEnvelope className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" />
    <input
      type="email"
      name="email"
      placeholder="Email"
      value={formData.email}
      onChange={handleChange}
      className="w-full pl-12 px-10 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
    />
    {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
  </div>

  <div className="mb-2 relative">
    <FaLock className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" />
    <input
      type="password"
      name="password"
      placeholder="Password"
      value={formData.password}
      onChange={handleChange}
      className="w-full pl-12 px-10 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
    />
    {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
  </div>

  <div className="mb-2 relative">
    <FaBookOpen className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" />
    <input
      type="text"
      name="course"
      placeholder="Course"
      value={formData.course}
      onChange={handleChange}
      className="w-full pl-12 px-10 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
    />
    {errors.course && <p className="text-red-500 text-sm">{errors.course}</p>}
  </div>

  <div className="mb-4 relative">
    <FaUniversity className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" />
    <input
      type="text"
      name="college"
      placeholder="College"
      value={formData.college}
      onChange={handleChange}
      className="w-full pl-12 px-10 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
    />
    {errors.college && <p className="text-red-500 text-sm">{errors.college}</p>}
  </div>

  <button
    type="submit"
    className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded transition duration-200"
  >
    Sign Up
  </button>

  <div className="my-4 flex items-center">
    <div className="flex-grow h-px bg-gray-300" />
    <span className="px-2 text-sm text-gray-500">or</span>
    <div className="flex-grow h-px bg-gray-300" />
  </div>

          <p className="text-sm text-center mt-4 text-gray-600">
            Already Have An Account?{" "}
            <Link to="/login" className="text-blue-600 hover:underline">
              Login
            </Link>
          </p>
        </form>
      </div>

      {/* Bottom Left Illustration */}
      <img
        src={sittingchild}
        alt="Child Sitting"
        className="hidden sm:block absolute bottom-1/8 left-1/9 w-52 md:w-64 lg:w-100 opacity-90"
        />
        <img
        src={block}
        alt="Child Sitting"
        className="hidden sm:block absolute  bottom-1/12 right-70 w-52 md:w-50 lg:w-75 opacity-90"
        />
    </div>
  );
};

export default Register;
