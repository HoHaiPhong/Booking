import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

const REGIONS = [
  { code: 'BAC',   label: 'Miền Bắc (NORTH)' },
  { code: 'TRUNG', label: 'Miền Trung (CENTRAL)' },
  { code: 'NAM',   label: 'Miền Nam (SOUTH)' },
];

export default function Rooms() {
  const [region, setRegion] = useState('');
  const [provinces, setProvinces] = useState([]);
  const [provinceId, setProvinceId] = useState('');
  const [districts, setDistricts] = useState([]);
  const [districtId, setDistrictId] = useState('');
  const [hotels, setHotels] = useState([]);
  const [hotelId, setHotelId] = useState('');

  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ maPhong: '', soPhong: '', maLoai: '' });

  // Load danh sách Loại Phòng (DB Miền Nam) cho Dropdown
  useEffect(() => {
    axios.get(`${API}/room-types`)
      .then(res => setRoomTypes(res.data.data || []))
      .catch(err => console.error("Lỗi lấy loại phòng:", err));
  }, []);

  // 1. Tải Tỉnh/Thành khi chọn Miền
  useEffect(() => {
    if (!region) { setProvinces([]); setDistricts([]); setHotels([]); setRooms([]); return; }
    setProvinceId(''); setDistrictId(''); setHotelId(''); setRooms([]);
    axios.get(`${API}/booking/provinces?region=${region}`).then(r => setProvinces(r.data.data || []));
  }, [region]);

  // 2. Tải Quận/Huyện khi chọn Tỉnh
  useEffect(() => {
    if (!provinceId || !region) { setDistricts([]); setHotels([]); setRooms([]); return; }
    setDistrictId(''); setHotelId(''); setRooms([]);
    axios.get(`${API}/booking/districts?region=${region}&provinceId=${provinceId}`).then(r => setDistricts(r.data.data || []));
  }, [provinceId, region]);

  // 3. Tải Khách sạn khi chọn Quận
  useEffect(() => {
    if (!districtId || !region) { setHotels([]); setRooms([]); return; }
    setHotelId(''); setRooms([]);
    axios.get(`${API}/booking/hotels?region=${region}&districtId=${districtId}`).then(r => setHotels(r.data.data || []));
  }, [districtId, region]);

  // 4. Lấy danh sách phòng khi chọn Khách Sạn
  const fetchRooms = () => {
    if (!hotelId || !region) return;
    setLoading(true);
    axios.get(`${API}/rooms?region=${region}&hotelId=${hotelId}`)
      .then(res => setRooms(res.data.data || []))
      .catch(err => {
        setStatus({ type: 'error', msg: err.response?.data?.message || 'Lỗi tải danh sách phòng.' });
        setRooms([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRooms();
  }, [hotelId, region]);

  // Handle Form Input
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Add Room
  const handleSave = async (e) => {
    e.preventDefault();
    setStatus({ type: '', msg: '' });
    setSaving(true);
    try {
      await axios.post(`${API}/rooms`, {
        region, maKS: hotelId,
        maPhong: form.maPhong, soPhong: form.soPhong, maLoai: form.maLoai
      });
      setStatus({ type: 'success', msg: `Thêm phòng ${form.maPhong} thành công!` });
      setShowModal(false);
      setForm({ maPhong: '', soPhong: '', maLoai: '' }); // Reset
      fetchRooms(); // Tải lại danh sách
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.message || 'Lỗi thêm phòng.' });
    } finally {
      setSaving(false);
    }
  };

  // Delete Room
  const handleDelete = async (maPhong) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa phòng ${maPhong}?`)) return;
    setStatus({ type: '', msg: '' });
    try {
      await axios.delete(`${API}/rooms/${maPhong}?region=${region}`);
      setStatus({ type: 'success', msg: `Đã xóa phòng ${maPhong}.` });
      fetchRooms();
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.message || 'Lỗi khi xóa phòng.' });
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Quản lý Danh mục Phòng</h1>
        <p>Quản lý số lượng phòng thực tế tại từng Khách sạn trên các Chi nhánh (Local Node).</p>
      </div>

      {status.msg && (
        <div className={`alert alert-${status.type}`}>
          {status.msg}
        </div>
      )}

      {/* Bộ lọc Khách Sạn */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="form-grid">
          <div className="form-group">
            <label>Khu vực (Phân mảnh)</label>
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">-- Chọn khu vực --</option>
              {REGIONS.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Tỉnh/Thành phố</label>
            <select value={provinceId} onChange={(e) => setProvinceId(e.target.value)} disabled={!region || provinces.length === 0}>
              <option value="">-- Chọn Tỉnh/Thành --</option>
              {provinces.map((p) => <option key={p.MaTinh} value={p.MaTinh}>{p.TenTinh}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Quận/Huyện</label>
            <select value={districtId} onChange={(e) => setDistrictId(e.target.value)} disabled={!provinceId || districts.length === 0}>
              <option value="">-- Chọn Quận/Huyện --</option>
              {districts.map((d) => <option key={d.MaQuan} value={d.MaQuan}>{d.TenQuan}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Khách Sạn</label>
            <select value={hotelId} onChange={(e) => setHotelId(e.target.value)} disabled={!districtId || hotels.length === 0}>
              <option value="">-- Chọn Khách Sạn --</option>
              {hotels.map((h) => <option key={h.MaKhachSan} value={h.MaKhachSan}>{h.TenKhachSan}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Bảng Danh sách Phòng */}
      {hotelId && (
        <div className="card" style={{ padding: 0 }}>
          <div className="card-header" style={{ padding: '24px 24px 0 24px' }}>
            <h2>Danh sách Phòng</h2>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Thêm Phòng</button>
          </div>
          <div className="table-wrap" style={{ margin: 24, border: '1px solid var(--border)' }}>
            {loading ? (
              <div className="loading"><div className="spinner" /></div>
            ) : rooms.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🚪</div>
                <p>Khách sạn này chưa có phòng nào. Hãy thêm mới!</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Mã Phòng</th>
                    <th>Số Phòng</th>
                    <th>Loại Phòng</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((r) => (
                    <tr key={r.MaPhong}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.MaPhong}</td>
                      <td>{r.SoPhong}</td>
                      <td style={{ color: 'var(--gold)', fontWeight: 600 }}>{r.TenLoaiPhong || r.MaLoai}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '6px 10px', fontSize: 13, background: '#fef2f2', color: '#dc2626', borderColor: '#fca5a5' }}
                          onClick={() => handleDelete(r.MaPhong)}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal Thêm Phòng */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 450, padding: 32 }}>
            <h2 style={{ marginBottom: 20 }}>Thêm Phòng Mới</h2>
            <form onSubmit={handleSave} className="form-group" style={{ gap: 16 }}>
              <div className="form-group">
                <label>Mã Phòng (Khóa chính Unique)</label>
                <input name="maPhong" value={form.maPhong} onChange={handleChange} required placeholder="VD: P101_HN" style={{ fontFamily: 'monospace' }}/>
              </div>
              <div className="form-group">
                <label>Số Phòng / Tầng</label>
                <input name="soPhong" value={form.soPhong} onChange={handleChange} required placeholder="VD: 101" />
              </div>
              <div className="form-group">
                <label>Loại Phòng</label>
                <select name="maLoai" value={form.maLoai} onChange={handleChange} required>
                  <option value="">-- Chọn Loại Phòng --</option>
                  {roomTypes.map(rt => <option key={rt.MaLoai} value={rt.MaLoai}>{rt.TenLoai} - {new Intl.NumberFormat('vi-VN').format(rt.GiaNiemYet)} đ</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)} disabled={saving}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? 'Đang thêm...' : 'Lưu Phòng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
