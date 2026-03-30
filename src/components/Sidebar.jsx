import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import axios from 'axios';

const NAV_ITEMS = [
  { path: '/',           icon: '📊', label: 'Tổng quan' },
  { path: '/booking',    icon: '🛎️', label: 'Đặt phòng' },
  { path: '/customers',  icon: '👤', label: 'Khách hàng' },
  { path: '/reception',  icon: '🔑', label: 'Lễ tân' },
  { path: '/room-types', icon: '🛏️', label: 'Loại phòng' },
  { path: '/rooms',      icon: '🚪', label: 'Phòng ốc' },
];

export default function Sidebar() {
  const [status, setStatus] = useState({ north: 'checking', central: 'checking', south: 'checking' });

  const fetchStatus = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/dashboard/status', { timeout: 5000 });
      setStatus(res.data);
    } catch {
      setStatus({ north: 'offline', central: 'offline', south: 'offline' });
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getColor = (s) => s === 'online' ? '#22c55e' : s === 'offline' ? '#ef4444' : '#f59e0b';

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0,
      width: 'var(--sidebar-w)',
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.5px' }}>
          <span style={{ background: 'linear-gradient(135deg, var(--gold), var(--orange))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🏨 Grand Vietnam
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>Hệ thống quản lý khách sạn</div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '16px 12px' }}>
        {NAV_ITEMS.map(({ path, icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 14px', borderRadius: 'var(--radius-sm)',
              textDecoration: 'none', marginBottom: 4,
              fontSize: '14px', fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--gold)' : 'var(--text-secondary)',
              background: isActive ? 'var(--gold-dim)' : 'transparent',
              border: `1px solid ${isActive ? 'var(--gold-glow)' : 'transparent'}`,
              transition: 'all 0.15s',
            })}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Server Status */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Trạng thái Server
        </div>
        {[
          { key: 'north',   label: 'Miền Bắc (PHONG\\MIENBAC)' },
          { key: 'central', label: 'Miền Trung (PHONG\\MIENTRUNG)' },
          { key: 'south',   label: 'Miền Nam (PHONG\\MIENNAM)' },
        ].map(({ key, label }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: getColor(status[key]),
              boxShadow: `0 0 6px ${getColor(status[key])}`,
              transition: 'background 0.3s',
            }} />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>{label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
