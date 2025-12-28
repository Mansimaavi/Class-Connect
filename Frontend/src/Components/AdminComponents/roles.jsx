import React, { useEffect, useState } from 'react';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import axios from 'axios';
import io from 'socket.io-client'; // Import Socket.IO client

Chart.register(ArcElement, Tooltip, Legend);

const Roles = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalUploads: 0,
    totalDownloads: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await axios.get("http://localhost:5000/api/stat/getStats");
        setStats(data);
        console.log(data);  
      } catch (error) {
        console.error("Error fetching stats:", error.message);
      }
    };

    fetchStats();

    // Initialize Socket.IO client
    const socket = io("http://localhost:5000");

    // Listen for real-time updates from the backend
    socket.on('stats-updated', (updatedStats) => {
      setStats(updatedStats); // Update the stats when new data is received
    });

    // Cleanup the socket connection on component unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  const userRoleData = {
    labels: ['Users', 'Admins'],
    datasets: [
      {
        label: 'User Roles',
        data: [stats.totalUsers, stats.totalAdmins],
        backgroundColor: ['rgba(255, 206, 86, 0.6)', 'rgba(255, 99, 132, 0.6)'],
        borderColor: ['rgba(255, 206, 86, 1)', 'rgba(255, 99, 132, 1)'],
        borderWidth: 1,
      },
    ],
  };

  const fileActivityData = {
    labels: ['Uploads', 'Downloads'],
    datasets: [
      {
        label: 'File Activities',
        data: [stats.totalUploads, stats.totalDownloads],
        backgroundColor: ['rgba(54, 162, 235, 0.6)', 'rgba(75, 192, 192, 0.6)'],
        borderColor: ['rgba(54, 162, 235, 1)', 'rgba(75, 192, 192, 1)'],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="flex justify-center items-start gap-10 mt-10">
      <div style={{ width: '300px' }}>
        <h2 className="text-center text-xl font-bold mb-4">User Roles</h2>
        <Doughnut data={userRoleData} />
      </div>

      <div style={{ width: '300px' }}>
        <h2 className="text-center text-xl font-bold mb-4">File Activities</h2>
        <Doughnut data={fileActivityData} />
      </div>
    </div>
  );
};

export default Roles;
