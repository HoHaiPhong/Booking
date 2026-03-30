import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

export default function Reception() {
  const [stayingGuests, setStayingGuests] = useState([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  
  // Checkout & Check-in States
  const [checkInCustId, setCheckInCustId] = useState('');
  const [checkInResult, setCheckInResult] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState({ type: '', msg: '' });

  // 1. Tìm các Khách hàng đang lưu trú tại Đà Nẵng (Miền Trung)
  const fetchStayingGuests = async () => {
    setLoadingGuests(true);
    try {
      // API này sẽ gọi câu Query: Tìm Khách hàng đang lưu trú (TrangThai = 'DangO') tại Đà Nẵng
      const res = await axios.get(`${API}/reception/staying-danang`);
      setStayingGuests(res.data.data || []);
    } catch (err) {
      console.error(err);
      // Fallback state if API not ready
      setStayingGuests([]);
    } finally {
      setLoadingGuests(false);
    }
  };

  useEffect(() => {
    fetchStayingGuests();
  }, []);

  // 2. Chức năng Check-in gọi usp_CheckInKhachHang
  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (!checkInCustId) return;

    setCheckingIn(true);
    setCheckInStatus({ type: '', msg: '' });
    setCheckInResult(null);

    try {
      // Báo lễ tân gọi SP usp_CheckInKhachHang
      const res = await axios.post(`${API}/reception/checkin`, { MaKH: checkInCustId });
      
      setCheckInResult(res.data.data); // data chứa { Tên Khách, Điểm, Xếp Hạng }
      setCheckInStatus({ type: 'success', msg: 'Check-in thành công! Đã lấy dữ liệu thẻ từ Miền Nam.' });
      setCheckInCustId('');
      fetchStayingGuests(); // refresh danh sách lưu trú
    } catch (err) {
      setCheckInStatus({ 
        type: 'error', 
        msg: err.response?.data?.message || 'Không tìm thấy thông tin khách hàng hoặc lỗi kết nối Linked Server Miền Nam.' 
      });
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Lễ Tân (Reception)</h1>
        <p>Quản lý Check-in và tra cứu khách lưu trú — Kết nối liên vùng</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 2fr', gap: 20, alignItems: 'start' }}>
        
        {/* Panel 1: Thao tác Check-in */}
        <div className="card" style={{ padding: 0 }}>
          <div className="card-header" style={{ padding: '16px 20px' }}>
            <h2>🛎️ Thủ tục Check-in</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Gọi SP <code>usp_CheckInKhachHang</code> (Join dữ liệu Miền Nam)
            </p>
          </div>
          
          <div style={{ padding: 20 }}>
            {checkInStatus.msg && (
              <div className={`alert alert-${checkInStatus.type}`} style={{ marginBottom: 16, padding: '10px 14px' }}>
                {checkInStatus.msg}
              </div>
            )}

            <form onSubmit={handleCheckIn} style={{ display: 'flex', gap: 10 }}>
              <input 
                value={checkInCustId}
                onChange={(e) => setCheckInCustId(e.target.value)}
                placeholder="Nhập Mã Khách Hàng (VD: KH01)..."
                required
                style={{ flex: 1, padding: '10px 14px' }}
              />
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={checkingIn}
              >
                {checkingIn ? 'Đang gọi DB...' : 'Check-in'}
              </button>
            </form>

            {/* Hiển thị kết quả Check-in */}
            {checkInResult && (
              <div className={`vip-card ${checkInResult.XepHang?.includes('Vàng') ? 'vip-gold' : 'vip-silver'}`}>
                <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', opacity: 0.9 }}>
                  ✅ Hồ sơ thành viên (Lấy từ HQ Miền Nam)
                </div>
                <div>
                  <p>
                    <span>Họ Tên Khách:</span>
                    <strong>{checkInResult.HoTen || checkInResult.TenKhach}</strong>
                  </p>
                  <p>
                    <span>Điểm tích lũy:</span>
                    <strong style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>{checkInResult.DiemTichLuy} pts</strong>
                  </p>
                  <p style={{ borderBottom: 'none', paddingBottom: 0 }}>
                    <span>Xếp hạng thẻ:</span>
                    <span style={{ 
                      padding: '6px 14px', borderRadius: 100, fontSize: 13, fontWeight: 800,
                      background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)',
                      color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                      {checkInResult.XepHang || 'Thường'}
                    </span>
                  </p>
                </div>
                {checkInResult.XepHang?.includes('Vàng') && (
                  <div style={{ 
                    marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.15)',
                    fontSize: 14, color: '#fef3c7', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>👑</span> Ưu tiên: Miễn phí Upgrade hạng phòng!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Panel 2: Danh sách khách lưu trú tại Đà Nẵng */}
        <div className="card" style={{ padding: 0 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px' }}>
            <div>
              <h2>🌊 Khách lưu trú tại Đà Nẵng (Hôm nay)</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Query trực tiếp qua Linked Server Miền Trung
              </p>
            </div>
            <button className="btn btn-secondary" onClick={fetchStayingGuests} style={{ padding: '6px 12px', fontSize: 12 }}>
              🔄 Làm mới
            </button>
          </div>

          <div className="table-wrap">
            {loadingGuests ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>Đang truy vấn CSDL Miền Trung...</div>
            ) : stayingGuests.length === 0 ? (
              <div className="empty-state" style={{ minHeight: 200 }}>
                <div className="icon">🛏️</div>
                <p>Hiện tại không có khách nào đang lưu trú (DangO) tại Resort Đà Nẵng.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Mã Phiếu</th>
                    <th>Tên Khách</th>
                    <th>Khách Sạn</th>
                    <th>Ngày Đến</th>
                  </tr>
                </thead>
                <tbody>
                  {stayingGuests.map((g, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace' }}>{g.MaPhieu}</td>
                      <td style={{ fontWeight: 600 }}>{g.TenKhach}</td>
                      <td>{g.TenKhachSan}</td>
                      <td>{g.NgayDen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
