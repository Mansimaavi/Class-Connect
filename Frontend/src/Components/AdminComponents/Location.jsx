import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Auto-fit all marker bounds
const FitBounds = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
};

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const Location = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserLocations = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/admin/locations');
        if (!response.ok) throw new Error('Failed to fetch locations');
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserLocations();
  }, []);

  const validUsers = users.filter((user) => user.latitude && user.longitude);
  const bounds = validUsers.map((user) => [user.latitude, user.longitude]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading user locations...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', color: 'red', padding: '50px' }}>{error}</div>;
  }

  return (
    <div style={{ height: '600px', width: '100%' }}>
      {validUsers.length > 0 ? (
        <MapContainer center={[20, 78]} zoom={5} style={{ height: '100%', width: '100%', borderRadius: '10px', boxShadow: '0 0 15px rgba(0,0,0,0.2)' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {validUsers.map((user) => (
            <Marker key={user._id || user.name} position={[user.latitude, user.longitude]}>
              <Popup>
                <div style={{ textAlign: 'center' }}>
                  <strong>{user.name}</strong><br />
                  📍 {user.latitude.toFixed(4)}, {user.longitude.toFixed(4)}<br />
                  {user.email && <div>✉️ {user.email}</div>}
                </div>
              </Popup>
            </Marker>
          ))}
          <FitBounds bounds={bounds} />
        </MapContainer>
      ) : (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          No users with valid location data.
        </div>
      )}
    </div>
  );
};

export default Location;
