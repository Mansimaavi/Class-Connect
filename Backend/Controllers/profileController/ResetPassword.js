import User from "../../models/User.js"; // Ensure .js extension is added
import mailSender from "../../utils/MailSender.js"; // Ensure .js extension is added
import bcrypt from 'bcryptjs';

import crypto from "crypto";


export const resetPasswordToken = async (req, res) => {
	try {
		const email = req.body.email;
		const user = await User.findOne({ email: email });

		if (!user) {
			return res.status(404).json({
				success: false,
				message: `This Email: ${email} is not Registered With Us. Enter a Valid Email.`,
			});
		}

		// Generate Secure Token
		const token = crypto.randomBytes(32).toString("hex");
		const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

		// Store Hashed Token with Expiry
		await User.findOneAndUpdate(
			{ email: email },
			{
				token: hashedToken,
				resetPasswordExpires: Date.now() + 3600000, // 1 hour expiry
			},
			{ new: true }
		);

		// Generate Reset Link
		const resetURL = `http://localhost:3000/update-password/${token}`;

		// Send Email
		await mailSender(
			email,
			"Password Reset",
			`Your Link for password reset is ${resetURL}. Please click this URL to reset your password.`
		);

		res.status(200).json({
			success: true,
			message: "Email Sent Successfully, Please Check Your Email to Continue Further.",
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			success: false,
			message: "Error Sending the Reset Password Email",
			error: error.message,
		});
	}
};

export const resetPassword = async (req, res) => {
	try {
		const { password, confirmPassword, token } = req.body;

		// Validate passwords match
		if (password !== confirmPassword) {
			return res.status(400).json({
				success: false,
				message: "Password and Confirm Password do not match.",
			});
		}

		// Hash token to match stored token
		const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

		// Find user by token
		const user = await User.findOne({
			token: hashedToken,
			resetPasswordExpires: { $gt: Date.now() }, // Ensure token is not expired
		});

		if (!user) {
			return res.status(400).json({
				success: false,
				message: "Invalid or expired token.",
			});
		}

		// Encrypt new password
		const encryptedPassword = await bcrypt.hash(password, 10);

		// Update password & remove token
		await User.findByIdAndUpdate(
			user._id,
			{
				password: encryptedPassword,
				token: undefined,
				resetPasswordExpires: undefined,
			},
			{ new: true }
		);

		res.status(200).json({
			success: true,
			message: "Password Reset Successful. You can now log in with your new password.",
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			success: false,
			message: "Error resetting password.",
			error: error.message,
		});
	}
};
