import { useEffect, useState } from "react";
import { FaBookOpen, FaEnvelope, FaLock, FaUniversity, FaUser, FaUserCircle } from "react-icons/fa";
import { Link, Navigate, useNavigate } from "react-router-dom";
import block from "../assets/block.webp";
import sittingchild from "../assets/sittting.webp";
import { useAuth } from "../Components/AuthComponents/AuthContext";
import api, { getErrorMessage, getFieldErrors } from "../lib/api";

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
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  // Location is optional: it only powers the admin's sign-up map.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setFormData((prevData) => ({
          ...prevData,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })),
      () => {}
    );
  }, []);

  if (isLoggedIn) return <Navigate to="/dashboard" replace />;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    const validationErrors = {};
    if (!formData.name.trim()) validationErrors.name = "Name is required.";
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(formData.username.trim()))
      validationErrors.username = "Username must be 3-30 letters, numbers, dots or underscores.";
    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) validationErrors.email = "Please enter a valid email.";
    if (formData.password.length < 8 || !/[A-Za-z]/.test(formData.password) || !/\d/.test(formData.password))
      validationErrors.password = "Use at least 8 characters with a letter and a number.";
    if (!formData.course.trim()) validationErrors.course = "Course/Degree is required.";
    if (!formData.college.trim()) validationErrors.college = "College name is required.";

    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      await api.post("/auth/send-otp", { email: formData.email.trim() });
      navigate("/register-verification", { state: { formData } });
    } catch (error) {
      setErrors(getFieldErrors(error));
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen bg-[#faf6f6] items-center justify-center px-4 overflow-hidden">
      {/* Right Form Section */}
      <div className="w-full md:w-1/3 p-8 bg-[#f8f8f8]">
        <h1 className="text-2xl font-extrabold  mb-1">Let's<br />Start Learning</h1>
        <p className="text-gray-600 mb-6">Create your account. We'll email you a code to verify it.</p>

        {formError && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
        <form onSubmit={handleSubmit} noValidate>
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
    disabled={submitting}
    className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded transition duration-200 disabled:opacity-60"
  >
    {submitting ? "Sending code…" : "Sign Up"}
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
        alt=""
        className="hidden sm:block absolute  bottom-1/12 right-70 w-52 md:w-50 lg:w-75 opacity-90"
        />
    </div>
  );
};

export default Register;
