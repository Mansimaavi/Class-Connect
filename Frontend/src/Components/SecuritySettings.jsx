import React, { useState } from 'react';

const SecuritySettings = ({ userId }) => {
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');

  const handleEmailUpdate = async () => {
    try {
      if (!/\S+@\S+\.\S+/.test(newEmail)) {
        return alert("Please enter a valid email.");
      }

      const response = await fetch(`http://localhost:5000/api/profile/${userId}/email`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newEmail }),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error("Server responded with:", result);
        throw new Error(result.message || "Failed to update email.");
      }

      alert("Email updated successfully!");
      setNewEmail('');
    } catch (error) {
      console.error(error);
      alert("Failed to update email.");
    }
  };

  const handlePasswordUpdate = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/profile/${userId}/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to update password.");
      }

      alert("Password updated successfully!");
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      console.error(error);
      alert(error.message || "Password update failed.");
    }
  };

  return (
    <div className="bg-white shadow rounded p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-700 mb-6">Security Settings</h2>

      {/* Email Update */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-600 mb-1">Update Email</label>
        <input
          type="email"
          className="w-full px-4 py-2 border rounded mb-2"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="Enter new email"
        />
        <button
          onClick={handleEmailUpdate}
          className="px-4 py-2 bg-purple-700 text-white rounded  hover:bg-purple-500"
        >
          Update Email
        </button>
      </div>

      {/* Password Update */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Current Password</label>
        <input
          type="password"
          className="w-full px-4 py-2 border rounded mb-2"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Enter current password"
        />

        <label className="block text-sm font-medium text-gray-600 mb-1">New Password</label>
        <input
          type="password"
          className="w-full px-4 py-2 border rounded mb-2"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter new password"
        />

        <button
          onClick={handlePasswordUpdate}
          className="px-4 py-2 bg-purple-700 text-white rounded hover:bg-purple-500"
        >
          Update Password
        </button>
      </div>
    </div>
  );
};

export default SecuritySettings;
