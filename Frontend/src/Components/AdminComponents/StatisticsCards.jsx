import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from "chart.js";
import { useEffect, useState } from "react";
import { Card, Col, Form, Row } from "react-bootstrap";
import { Bar } from "react-chartjs-2";
import api from "../../lib/api";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const RANGE_LABELS = {
  last24hours: "last 24 hours",
  last7days: "last 7 days",
  lastMonth: "last month",
  lastYear: "last year",
  overall: "all time",
};

const StatisticsCards = () => {
  const [stats, setStats] = useState({
    activeUsersCount: 0,
    totalUploads: 0,
    totalDownloads: 0,
    mostActiveUsers: [],
  });

  const [timeRange, setTimeRange] = useState("last7days"); // Default time range

  // Fetch Data Based on Time Range
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get("/admin/stats", { params: { range: timeRange } });
        setStats(data.stats);
      } catch (error) {
        console.error("Error fetching statistics:", error);
      }
    };

    fetchStats();
  }, [timeRange]); // Fetch data whenever timeRange changes

  // Chart Data for Active Users
  const activeUsersChartData = {
    labels: [`Active users (${RANGE_LABELS[timeRange]})`],
    datasets: [
      {
        label: "Active Users",
        data: [stats.activeUsersCount],
        backgroundColor: "rgba(75, 192, 192, 0.5)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  // Chart Data for Uploads and Downloads
  const fileStatsChartData = {
    labels: ["Uploads", "Downloads"],
    datasets: [
      {
        label: `Files (${RANGE_LABELS[timeRange]})`,
        data: [stats.totalUploads, stats.totalDownloads],
        backgroundColor: ["rgba(153, 102, 255, 0.5)", "rgba(54, 162, 235, 0.5)"],
        borderColor: ["rgba(153, 102, 255, 1)", "rgba(54, 162, 235, 1)"],
        borderWidth: 1,
      },
    ],
  };

  const activeUsersData = {
    labels: stats.mostActiveUsers?.map((user) => user.name || user.username ) || [],
    datasets: [
      {
        label: `Top uploaders (${RANGE_LABELS[timeRange]})`,
        data: stats.mostActiveUsers?.map((user) => user.totalUploads) || [],
        backgroundColor: "rgba(255, 159, 64, 0.5)",
        borderColor: "rgba(255, 159, 64, 1)",
        borderWidth: 1,
      },
    ],
  };
  

  return (
    <>
      <Row className="mb-3">
        <Col md={4}>
          <Form.Select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <option value="last24hours">Last 24 Hours</option>
            <option value="last7days">Last 7 Days</option>
            <option value="lastMonth">Last Month</option>
            <option value="lastYear">Last Year</option>
            <option value="overall">Overall</option>
          </Form.Select>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={4}>
          <Card className="shadow-lg mb-4">
            <Card.Body>
              <Card.Title>Active users</Card.Title>
              <h3>{stats.activeUsersCount}</h3>
              <Bar data={activeUsersChartData} options={{ responsive: true }} />
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-lg mb-4">
            <Card.Body>
              <Card.Title>Uploads &amp; downloads</Card.Title>
              <Bar data={fileStatsChartData} options={{ responsive: true }} />
              <div className="mt-2">
                <h4>Uploads: {stats.totalUploads}</h4>
                <h4>Downloads: {stats.totalDownloads}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-lg mb-4">
            <Card.Body>
              <Card.Title>Top uploaders</Card.Title>
              <Bar data={activeUsersData} options={{ responsive: true }} />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default StatisticsCards;
