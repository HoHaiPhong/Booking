import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const API = 'http://localhost:5000/api';

const formatCurrency = (val) =>
  val ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val) : '—';

export default function Dashboard() {
  const [revenue, setRevenue] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError('');
      try {
        const [revRes, roomsRes] = await Promise.all([
          axios.get(`${API}/dashboard/revenue`).catch(() => ({ data: { data: [] }})),
          axios.get(`${API}/dashboard/rooms-summary`).catch(() => ({ data: { data: [] }})),
        ]);
        setRevenue(revRes.data.data || []);
        setRooms(roomsRes.data.data || []);
      } catch (e) {
        setError('Không thể tải dữ liệu. Kiểm tra kết nối API server.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Tính tổng doanh thu theo miền
  const revByRegion = {};
  revenue.forEach((r) => {
    if (!revByRegion[r.MienKhuVuc]) revByRegion[r.MienKhuVuc] = 0;
    revByRegion[r.MienKhuVuc] += r.TongDoanhThu || 0;
  });

  // Chuẩn bị data biểu đồ theo tháng
  const chartDataMap = {};
  revenue.forEach((r) => {
    const key = `T${r.Thang}/${r.Nam}`;
    if (!chartDataMap[key]) chartDataMap[key] = { thang: key };
    chartDataMap[key][r.MienKhuVuc] = (chartDataMap[key][r.MienKhuVuc] || 0) + (r.TongDoanhThu || 0);
  });
  const chartData = Object.values(chartDataMap).slice(0, 6).reverse();

  const miensColor = ['#FFD700', '#FF6B35', '#22c55e'];
  const miens = [...new Set(revenue.map((r) => r.MienKhuVuc))];

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1>Tổng quan</h1>
          <p>Dữ liệu doanh thu toàn quốc từ 3 miền</p>
        </div>
        <div className="loading"><div className="spinner" /><span>Đang tải dữ liệu...</span></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Tổng quan</h1>
        <p>Dữ liệu doanh thu toàn quốc từ 3 miền • Cập nhật theo thời gian thực</p>
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      {/* Thống kê phòng trống */}
      <div className="stats-grid">
        {rooms.length > 0 ? rooms.map((r) => (
          <div key={r.region} className="stat-card">
            <div className="stat-label">{r.label}</div>
            <div className="stat-value">{r.soPhongTrong}</div>
            <div className="stat-sub">phòng đang trống</div>
            <div className="stat-icon">{r.region === 'north' ? '🏔️' : r.region === 'central' ? '🌊' : '🌴'}</div>
            {r.status === 'offline' && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--red)' }}>⚠️ Server offline</div>
            )}
          </div>
        )) : [
          { label: 'Miền Bắc', icon: '🏔️', note: 'PHONG\\MIENBAC' },
          { label: 'Miền Trung', icon: '🌊', note: 'PHONG\\MIENTRUNG' },
          { label: 'Miền Nam', icon: '🌴', note: 'PHONG\\MIENNAM' },
        ].map((r) => (
          <div key={r.label} className="stat-card">
            <div className="stat-label">{r.label}</div>
            <div className="stat-value" style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Đang kết nối…</div>
            <div className="stat-sub">{r.note}</div>
            <div className="stat-icon">{r.icon}</div>
          </div>
        ))}
      </div>

      {/* Doanh thu tổng theo miền */}
      {Object.keys(revByRegion).length > 0 && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {Object.entries(revByRegion).map(([mien, total], i) => (
            <div key={mien} className="stat-card">
              <div className="stat-label">Doanh thu • {mien}</div>
              <div className="stat-value" style={{ fontSize: '1.3rem' }}>{formatCurrency(total)}</div>
              <div className="stat-sub">Tổng tất cả tháng</div>
            </div>
          ))}
        </div>
      )}

      {/* Biểu đồ doanh thu */}
      <div className="card">
        <div className="card-header">
          <h2>📈 Biểu đồ Doanh thu theo Tháng</h2>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="thang" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                tickFormatter={(v) => v >= 1e9 ? `${(v/1e9).toFixed(1)}T` : v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : v} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }}
                formatter={(v) => formatCurrency(v)}
              />
              <Legend wrapperStyle={{ color: 'var(--text-secondary)', fontSize: 13 }} />
              {miens.map((m, i) => (
                <Bar key={m} dataKey={m} fill={miensColor[i] || '#888'} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state">
            <div className="icon">📊</div>
            <p>Chưa có dữ liệu doanh thu.<br />Kiểm tra View <strong>VW_DOANHTHU_TOAN_QUOC</strong> trên SSMS.</p>
          </div>
        )}
      </div>
    </div>
  );
}
