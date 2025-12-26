import bcrypt from 'bcryptjs';
import User from '../../models/User.js'; 
import OTP from '../../models/OTP.js'; 
import jwt from 'jsonwebtoken';
import otpGenerator from 'otp-generator';
import mailSender from '../../utils/MailSender.js';  
import { passwordUpdated } from '../../mail/templates/passwordUpdate.js';
import { emitUserRegistered } from '../../index.js';
import Notification from '../../models/Notification.js';
import dotenv from 'dotenv';
import { sendVerificationEmail } from '../../models/OTP.js';

dotenv.config();

export const register = async (req, res) => {
  const { name, username, email, password, course, college, latitude, longitude, otp } = req.body;

  console.log("Request body:", req.body);

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: "Username or Email already exists" });
    }

    // Find the most recent OTP for the email
    const response = await OTP.find({ email }).sort({ createdAt: -1 }).limit(1);
    console.log(response);
    if (response.length === 0) {
      // OTP not found for the email
      return res.status(400).json({
        success: false,
        message: "The OTP is not valid",
      });
    } else if (otp !== response[0].otp) {
      // Invalid OTP
      return res.status(400).json({
        success: false,
        message: "The OTP is not valid",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      username,
      email,
      password: hashedPassword,
      course,
      college,
      location: { latitude, longitude },
      otp
    });

    await newUser.save();

    // Save notification with user's name
    const notification = new Notification({
      type: "user",
      message: `New user registered: ${name} (${username})`,
      name: name, // Store the user's name in the notification
    });
    await notification.save();
    emitUserRegistered(newUser);

    console.log("New User:", newUser);
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    if (!user.password) {
      return res.status(500).json({ message: "User password is missing." });
    }

    const match = await bcrypt.compare(req.body.password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Wrong credentials!" });
    }

    const token = jwt.sign(
      { _id: user._id, username: user.username, email: user.email, role: user.role },
      process.env.SECRET,
      { expiresIn: "3d" }
    );
    const today = new Date().toISOString().split("T")[0]; // Get today's date
    const activityIndex = user.activityLog.findIndex(
      (log) => log.date.toISOString().split("T")[0] === today
    );

    if (activityIndex !== -1) {
      user.activityLog[activityIndex].logins += 1;
    } else {
      user.activityLog.push({ logins: 1, totalTimeSpent: 0, date: new Date() });
    }

    user.lastLogin = new Date(); // Store login time
    user.sessionStart = new Date(); // Track session start time

    await user.save();
    const { password, ...userData } = user._doc;

    res.status(200).json({
      message: "Login successful",
      token,  // Send token directly
      user: userData,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(400).json({ message: "User not found!" });
    }

    if (!user.sessionStart) {
      return res.status(400).json({ message: "User session not found!" });
    }

    console.log("User sessionStart:", user.sessionStart);

    const sessionEnd = new Date(); // Logout time
    const sessionStart = user.sessionStart; // Stored at login

    let sessionDuration = (sessionEnd - sessionStart) / 1000; // Seconds

    if (!sessionStart) {
      return res.status(400).json({ message: "Session start time not found!" });
    }

    const sessionStartDate = sessionStart.toISOString().split("T")[0];
    const sessionEndDate = sessionEnd.toISOString().split("T")[0];

    // Handle session spanning multiple days
    if (sessionStartDate !== sessionEndDate) {
      const midnight = new Date(sessionStart);
      midnight.setHours(23, 59, 59, 999);

      let timeOnLoginDay = (midnight - sessionStart) / 1000;
      let timeOnNextDay = sessionDuration - timeOnLoginDay;

      updateActivityLog(user, sessionStartDate, timeOnLoginDay);
      updateActivityLog(user, sessionEndDate, timeOnNextDay);
    } else {
      updateActivityLog(user, sessionStartDate, sessionDuration);
    }

    user.sessionStart = null;
    await user.save();
    res.status(200).json({ message: "User logged out successfully!" });

  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Function to update activity log with time spent
function updateActivityLog(user, date, duration) {
  const activityIndex = user.activityLog.findIndex(
    (log) => log.date.toISOString().split("T")[0] === date
  );

  if (activityIndex !== -1) {
    user.activityLog[activityIndex].totalTimeSpent += duration;
  } else {
    user.activityLog.push({ logins: 1, totalTimeSpent: duration, date: new Date(date) });
  }
}

// Change Password function
export const changePassword = async (req, res) => {
  const { userId } = req.params; // Assuming you're passing userId in the URL
  const { oldPassword, newPassword } = req.body;

  try {
    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    // Check if old password matches
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect old password!" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully!" });
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const sendotp = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if the email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    // Generate a 6-digit OTP
    const otp = otpGenerator.generate(6, { upperCase: false, specialChars: false });

    // Save the OTP to the database with the email
    const newOtp = new OTP({
      email,
      otp,
    });

    await newOtp.save();

    // Send the OTP to the user's email
    await sendVerificationEmail(email, otp);

    // Respond with success message
    res.status(200).json({ message: "OTP sent successfully to your email!" });
  } catch (error) {
    console.error("OTP sending error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

