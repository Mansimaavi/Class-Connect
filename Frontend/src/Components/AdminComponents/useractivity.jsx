import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import axios from 'axios';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: '#fff',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '5px'
      }}>
        <p><strong>{label}</strong></p>
        <p style={{ color: '#8884d8' }}>Logins: {payload.find(p => p.dataKey === "logins")?.value}</p>
        <p style={{ color: '#f58634' }}>Time Spent: {payload.find(p => p.dataKey === "timeSpent")?.value} mins</p>
      </div>
    );
  }
  return null;
};

const UserActivityBarChart = () => {
  const [data, setData] = useState([]);
  const [viewMode, setViewMode] = useState('today');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const endpoint =
          viewMode === 'today'
            ? 'http://localhost:5000/api/stat/activity'
            : 'http://localhost:5000/api/stat/allactivity';

        const res = await axios.get(endpoint, { withCredentials: true });

        console.log(`${viewMode} data:`, res.data);

        // Normalize the response structure
        const transformed = res.data.map(user => ({
          name: user.name || user._id || 'Unknown',
          logins: user.totalLogins || 0,
          timeSpent: Math.round((user.totalTimeSpent || 0) / 60), // Convert to minutes
        }));

        setData(transformed);
      } catch (err) {
        console.error('Failed to fetch activity data:', err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [viewMode]);

  return (
    <div style={{ width: '100%', height: 450 }}>
      <div style={{ marginBottom: 10 }}>
        <select
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
          style={{ padding: '5px 10px' }}
        >
          <option value="today">Today’s Activity</option>
          <option value="overall">Overall Activity</option>
        </select>
      </div>

      {loading ? (
        <p>Loading chart...</p>
      ) : data.length === 0 ? (
        <p>No user activity data available for {viewMode === 'today' ? 'today' : 'overall'}.</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            barCategoryGap="10%"
            barGap={5}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            <Legend />
            <Bar dataKey="logins" fill="#8884d8" barSize={20} minPointSize={2} />
            <Bar dataKey="timeSpent" fill="#f58634" barSize={20} minPointSize={2} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default UserActivityBarChart;
