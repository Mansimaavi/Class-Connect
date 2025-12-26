import bcrypt from "bcryptjs";
import User from '../../models/User.js';

// Update Email
export const updateEmail  = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({ error: 'New email is required' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { email: newEmail },
      { new: true, runValidators: true }
    ).select('-password'); // Never return password

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ message: 'Email updated successfully', user });
  } catch (err) {
    console.error('Email Update Error:', err);
    res.status(500).json({ error: 'Failed to update email' });
  }
};

// Update Password
export const updatePassword  = async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new passwords are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password Update Error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
};
