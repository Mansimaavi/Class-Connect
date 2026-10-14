import { ArcElement, Chart, Legend, Tooltip } from "chart.js";
import { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { useSocketEvent } from "../../hooks/useSocket";
import api from "../../lib/api";

Chart.register(ArcElement, Tooltip, Legend);

const Roles = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalUploads: 0,
    totalDownloads: 0,
  });

  useEffect(() => {
    api
      .get("/admin/stats/overview")
      .then(({ data }) => setStats(data.stats))
      .catch(() => {});
  }, []);

  // The server pushes fresh totals whenever users, roles or files change.
  useSocketEvent("stats:updated", setStats);

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
