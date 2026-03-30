import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

export default function RoomTypes() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', msg: '' });
  
  // States for Create/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ MaLoai: '', TenLoai: '', GiaNiemYet: '' });
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch Room Types
  const fetchTypes = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/room-types`);
      setTypes(res.data.data || []);
    } catch (err) {
      setStatus({ type: 'error', msg: 'Không thể tải danh sách Loại Phòng (Cần API GET /room-types).' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  // Handle Form Change
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle Save (Create/Update)
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus({ type: '', msg: '' });

    try {
      if (isEdit) {
        await axios.put(`${API}/room-types/${form.MaLoai}`, form);
        setStatus({ type: 'success', msg: `Cập nhật loại phòng ${form.MaLoai} thành công.` });
      } else {
        await axios.post(`${API}/room-types`, form);
        setStatus({ type: 'success', msg: `Thêm loại phòng ${form.MaLoai} thành công.` });
      }
      setShowModal(false);
      fetchTypes();
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.message || 'Có lỗi xảy ra khi lưu Loại Phòng.' });
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete (Trigger test)
  const handleDelete = async (maLoai) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa Loại phòng ${maLoai} không?`)) return;
    
    setStatus({ type: '', msg: '' });
    try {
      await axios.delete(`${API}/room-types/${maLoai}`);
      setStatus({ type: 'success', msg: `Đã xóa loại phòng ${maLoai} thành công.` });
      fetchTypes();
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      // Đặc biệt xử lý hiển thị lỗi do Trigger tr_KiemTraXoaLoaiPhong ném ra
      setStatus({ 
        type: 'error', 
        msg: `❌ Xóa thất bại! Trigger báo lỗi: ${errorMsg}` 
      });
    }
  };

  const openAddModal = () => {
    setForm({ MaLoai: '', TenLoai: '', GiaNiemYet: '' });
    setIsEdit(false);
    setShowModal(true);
  };

  const openEditModal = (t) => {
    setForm({ MaLoai: t.MaLoai, TenLoai: t.TenLoai, GiaNiemYet: t.GiaNiemYet });
    setIsEdit(true);
    setShowModal(true);
  };

  const formatCurrency = (val) =>
    val ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val) : '—';

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Loại phòng</h1>
          <p>Quản lý danh mục loại phòng (Admin Miền Nam) — Test Trigger <code>tr_KiemTraXoaLoaiPhong</code></p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>+ Thêm Loại Phòng</button>
      </div>

      {status.msg && (
        <div className={`alert alert-${status.type}`}>
          {status.msg}
        </div>
      )}

      {loading ? (
        <div className="loading"><div className="spinner" /><span>Đang tải dữ liệu...</span></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã Loại</th>
                  <th>Tên Loại</th>
                  <th>Giá Niêm Yết</th>
                  <th style={{ width: 150, textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {types.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                      Không có loại phòng nào.
                    </td>
                  </tr>
                ) : (
                  types.map((t) => (
                    <tr key={t.MaLoai}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{t.MaLoai}</td>
                      <td>{t.TenLoai}</td>
                      <td style={{ color: 'var(--gold)' }}>{formatCurrency(t.GiaNiemYet)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn" 
                          style={{ padding: '4px 8px', fontSize: 12, marginRight: 8, background: 'var(--bg-card-2)', border: '1px solid var(--border)' }}
                          onClick={() => openEditModal(t)}
                        >
                          Sửa
                        </button>
                        <button 
                          className="btn" 
                          style={{ padding: '4px 8px', fontSize: 12, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                          onClick={() => handleDelete(t.MaLoai)}
                        >
                          Xóa (Trigger)
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal CRUD */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 400, padding: 20 }}>
            <h2 style={{ marginBottom: 16 }}>{isEdit ? 'Sửa Loại Phòng' : 'Thêm Loại Phòng'}</h2>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Mã Loại (Khóa chính)</label>
                <input 
                  name="MaLoai" value={form.MaLoai} onChange={handleChange} 
                  required disabled={isEdit} placeholder="Ví dụ: L1" 
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
              <div className="form-group">
                <label>Tên Loại</label>
                <input 
                  name="TenLoai" value={form.TenLoai} onChange={handleChange} 
                  required placeholder="Ví dụ: Phòng Standard" 
                />
              </div>
              <div className="form-group">
                <label>Giá Niêm Yết (VNĐ)</label>
                <input 
                  type="number" name="GiaNiemYet" value={form.GiaNiemYet} onChange={handleChange} 
                  required min="0" placeholder="500000" 
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)} disabled={saving}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
