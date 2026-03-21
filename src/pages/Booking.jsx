import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

const REGIONS = [
  { code: 'BAC',   label: 'Miền Bắc',  icon: '🏔️' },
  { code: 'TRUNG', label: 'Miền Trung', icon: '🌊' },
  { code: 'NAM',   label: 'Miền Nam',   icon: '🌴' },
];

export default function Booking() {
  const [form, setForm] = useState({
    region: '', provinceId: '', districtId: '', hotelId: '', roomTypeId: '', hoKhach: '', tenKhach: '',
    passport: '', soDienThoai: '', ngayNhanPhong: '', ngayTraPhong: '', ghiChu: '',
  });
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [hotels, setHotels]   = useState([]);
  const [rooms, setRooms]     = useState([]);
  const [loading, setLoading] = useState({ 
    provinces: false, districts: false, hotels: false, rooms: false, submit: false 
  });
  const [status, setStatus]   = useState({ type: '', msg: '' });

  // 1. Khi chọn Miền → Tải Tỉnh/Thành
  useEffect(() => {
    if (!form.region) { 
      setProvinces([]); setDistricts([]); setHotels([]); setRooms([]); 
      return; 
    }
    setLoading((l) => ({ ...l, provinces: true }));
    setForm((f) => ({ ...f, provinceId: '', districtId: '', hotelId: '', maPhong: '' }));
    setDistricts([]); setHotels([]); setRooms([]);

    axios.get(`${API}/booking/provinces?region=${form.region}`)
      .then((r) => setProvinces(r.data.data || []))
      .catch(() => setStatus({ type: 'error', msg: 'Không tải được danh sách tỉnh thành.' }))
      .finally(() => setLoading((l) => ({ ...l, provinces: false })));
  }, [form.region]);

  // 2. Khi chọn Tỉnh/Thành → Tải Quận/Huyện (DiaChi trong ChiNhanh)
  useEffect(() => {
    if (!form.provinceId || !form.region) { 
      setDistricts([]); setHotels([]); setRooms([]); 
      return; 
    }
    setLoading((l) => ({ ...l, districts: true }));
    setForm((f) => ({ ...f, districtId: '', hotelId: '', maPhong: '' }));
    setHotels([]); setRooms([]);

    axios.get(`${API}/booking/districts?region=${form.region}&provinceId=${form.provinceId}`)
      .then((r) => setDistricts(r.data.data || []))
      .catch(() => setStatus({ type: 'error', msg: 'Không tải được danh sách quận huyện.' }))
      .finally(() => setLoading((l) => ({ ...l, districts: false })));
  }, [form.provinceId]);

  // 3. Khi chọn Quận/Huyện → Tải Khách sạn
  useEffect(() => {
    if (!form.districtId || !form.region) { 
      setHotels([]); setRooms([]); 
      return; 
    }
    setLoading((l) => ({ ...l, hotels: true }));
    setForm((f) => ({ ...f, hotelId: '', maPhong: '' }));
    setRooms([]);

    axios.get(`${API}/booking/hotels?region=${form.region}&districtId=${form.districtId}`)
      .then((r) => setHotels(r.data.data || []))
      .catch(() => setStatus({ type: 'error', msg: 'Không tải được danh sách khách sạn.' }))
      .finally(() => setLoading((l) => ({ ...l, hotels: false })));
  }, [form.districtId]);

  // 4. Khi chọn khách sạn → tải danh sách LOẠI PHÒNG trống
  useEffect(() => {
    if (!form.hotelId || !form.region) { setRooms([]); return; }
    setLoading((l) => ({ ...l, rooms: true }));
    setForm((f) => ({ ...f, roomTypeId: '' }));
    axios.get(`${API}/booking/rooms?hotelId=${form.hotelId}&region=${form.region}`)
      .then((r) => setRooms(r.data.data || []))
      .catch(() => setStatus({ type: 'error', msg: 'Không tải được danh sách loại phòng.' }))
      .finally(() => setLoading((l) => ({ ...l, rooms: false })));
  }, [form.hotelId]);

  const selectedRoom = rooms.find((r) => r.MaLoai === form.roomTypeId);

  // Tính toán tổng tiền dự kiến
  const calculateTotal = () => {
    if (!selectedRoom || !form.ngayNhanPhong || !form.ngayTraPhong) return 0;
    const start = new Date(form.ngayNhanPhong);
    const end = new Date(form.ngayTraPhong);
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights * selectedRoom.GiaPhong : 0;
  };

  const totalEstimated = calculateTotal();

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Logic chặn chọn ngày trả phòng trước ngày nhận phòng
    if (name === 'ngayTraPhong' && form.ngayNhanPhong) {
      if (new Date(value) <= new Date(form.ngayNhanPhong)) {
        setStatus({ type: 'error', msg: 'Ngày trả phòng phải sau ngày nhận phòng.' });
        return;
      }
    }
    
    if (name === 'ngayNhanPhong' && form.ngayTraPhong) {
      if (new Date(value) >= new Date(form.ngayTraPhong)) {
        setForm(f => ({ ...f, ngayTraPhong: '', [name]: value }));
        setStatus({ type: 'info', msg: 'Hệ thống đã reset ngày trả phòng do ngày nhận mới không hợp lệ.' });
        return;
      }
    }

    setForm((f) => ({ ...f, [name]: value }));
    if (status.type === 'error' || status.type === 'info') setStatus({ type: '', msg: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.roomTypeId) return setStatus({ type: 'error', msg: 'Vui lòng chọn loại phòng.' });
    if (totalEstimated <= 0) return setStatus({ type: 'error', msg: 'Thời gian lưu trú không hợp lệ.' });
    
    setLoading((l) => ({ ...l, submit: true }));
    setStatus({ type: '', msg: '' });
    try {
      const res = await axios.post(`${API}/booking/create`, form);
      const { maPhieuDat, maPhong } = res.data.data;
      setStatus({ 
        type: 'success', 
        msg: `✅ Đặt phòng thành công! Mã phiếu: ${maPhieuDat}. Phòng đã gán: ${maPhong}` 
      });
      // Reset form giữ lại region
      setForm((f) => ({ 
        ...f, provinceId: '', districtId: '', hotelId: '', maPhong: '', 
        hoKhach: '', tenKhach: '', passport: '', soDienThoai: '', 
        ngayNhanPhong: '', ngayTraPhong: '', ghiChu: '' 
      }));
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.message || 'Đặt phòng thất bại.' });
    } finally {
      setLoading((l) => ({ ...l, submit: false }));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Đặt phòng</h1>
        <p>Tạo phiếu đặt phòng mới — trigger SQL Server sẽ tự cập nhật trạng thái phòng</p>
      </div>

      {status.msg && (
        <div className={`alert alert-${status.type === 'success' ? 'success' : 'error'}`}>
          {status.msg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Cột trái: Chọn phòng */}
          <div className="card" style={{ height: 'fit-content' }}>
            <div className="card-header"><h2>🏨 Chọn phòng</h2></div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Miền *</label>
              <select name="region" value={form.region} onChange={handleChange} required>
                <option value="">— Chọn miền —</option>
                {REGIONS.map(({ code, label, icon }) => (
                  <option key={code} value={code}>{icon} {label}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Tỉnh / Thành phố *</label>
              {loading.provinces ? (
                <div style={{ padding: '10px 0', color: 'var(--text-muted)', fontSize: 13 }}>⏳ Đang tải...</div>
              ) : (
                <select name="provinceId" value={form.provinceId} onChange={handleChange} required disabled={!form.region}>
                  <option value="">— Chọn tỉnh thành —</option>
                  {provinces.map((p) => (
                    <option key={p.MaTinh} value={p.MaTinh}>{p.TenTinh}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Quận / Huyện *</label>
              {loading.districts ? (
                <div style={{ padding: '10px 0', color: 'var(--text-muted)', fontSize: 13 }}>⏳ Đang tải...</div>
              ) : (
                <select name="districtId" value={form.districtId} onChange={handleChange} required disabled={!form.provinceId}>
                  <option value="">— Chọn quận huyện —</option>
                  {districts.map((d) => (
                    <option key={d.MaQuan} value={d.MaQuan}>{d.TenQuan}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Khách sạn *</label>
              {loading.hotels ? (
                <div style={{ padding: '10px 0', color: 'var(--text-muted)', fontSize: 13 }}>⏳ Đang tải...</div>
              ) : (
                <select name="hotelId" value={form.hotelId} onChange={handleChange} required disabled={!form.districtId}>
                  <option value="">— Chọn khách sạn —</option>
                  {hotels.map((h) => (
                    <option key={h.MaKhachSan} value={h.MaKhachSan}>
                      {'⭐'.repeat(h.SaoXep || 3)} {h.TenKhachSan}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Loại phòng *</label>
              {loading.rooms ? (
                <div style={{ padding: '10px 0', color: 'var(--text-muted)', fontSize: 13 }}>⏳ Đang kiểm tra phòng...</div>
              ) : (
                <>
                  <select name="roomTypeId" value={form.roomTypeId} onChange={handleChange} required disabled={!form.hotelId}>
                    <option value="">— Chọn loại phòng —</option>
                    {rooms.map((r) => (
                      <option key={r.MaLoai} value={r.MaLoai}>
                        {r.LoaiPhong} (Còn {r.SoLuongTrong} trống)
                      </option>
                    ))}
                  </select>
                  {selectedRoom && (
                    <div style={{ fontSize: 12, color: '#4ade80', marginTop: 6, fontWeight: 500 }}>
                      ✅ Còn {selectedRoom.SoLuongTrong} phòng trống thuộc loại {selectedRoom.LoaiPhong}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Hiển thị giá phòng & Tổng tiền */}
            {selectedRoom && (
              <div style={{ marginTop: 16 }}>
                <div style={{ padding: '14px 16px', background: 'var(--gold-dim)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,215,0,0.25)', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, marginBottom: 4 }}>💰 Giá phòng</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--gold-light)' }}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedRoom.GiaPhong)}
                    <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)' }}> / đêm</span>
                  </div>
                </div>

                {totalEstimated > 0 && (
                  <div style={{ padding: '14px 16px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                    <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 600, marginBottom: 4 }}>💳 Tổng tiền dự kiến</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#22c55e' }}>
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalEstimated)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      * Đã bao gồm thuế và phí dịch vụ
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cột phải: Thông tin khách */}
          <div className="card" style={{ height: 'fit-content' }}>
            <div className="card-header"><h2>👤 Thông tin khách</h2></div>
            <div className="form-grid">
              <div className="form-group">
                <label>Họ *</label>
                <input name="hoKhach" value={form.hoKhach} onChange={handleChange} placeholder="Nguyễn" required />
              </div>
              <div className="form-group">
                <label>Tên *</label>
                <input name="tenKhach" value={form.tenKhach} onChange={handleChange} placeholder="Văn A" required />
              </div>
              <div className="form-group">
                <label>Số Passport / CMND *</label>
                <input name="passport" value={form.passport} onChange={handleChange} placeholder="P12345678" required />
              </div>
              <div className="form-group">
                <label>Số điện thoại</label>
                <input name="soDienThoai" value={form.soDienThoai} onChange={handleChange} placeholder="0901234567" />
              </div>
              <div className="form-group">
                <label>Ngày nhận phòng *</label>
                <input type="date" name="ngayNhanPhong" value={form.ngayNhanPhong} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Ngày trả phòng *</label>
                <input type="date" name="ngayTraPhong" value={form.ngayTraPhong} onChange={handleChange} required />
              </div>
              <div className="form-group full">
                <label>Ghi chú</label>
                <textarea name="ghiChu" value={form.ghiChu} onChange={handleChange}
                  placeholder="Yêu cầu đặc biệt, số người lưu trú..." rows={3} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary"
              style={{ 
                width: '100%', marginTop: 16, justifyContent: 'center', padding: '14px',
                opacity: (form.hotelId && form.roomTypeId && form.hoKhach && form.tenKhach && form.passport && form.ngayNhanPhong && form.ngayTraPhong) ? 1 : 0.6
              }}
              disabled={loading.submit || !(form.hotelId && form.roomTypeId && form.hoKhach && form.tenKhach && form.passport && form.ngayNhanPhong && form.ngayTraPhong)}>
              {loading.submit ? '⏳ Đang xử lý...' : '✅ Xác nhận đặt phòng'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
