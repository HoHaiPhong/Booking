import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

const REGION_BADGE = {
  north:   { label: 'Miền Bắc',  cls: 'badge-bac' },
  central: { label: 'Miền Trung', cls: 'badge-trung' },
  south:   { label: 'Miền Nam',   cls: 'badge-nam' },
};

const LIMIT = 10;

export default function Customers() {
  const [search, setSearch]   = useState('');
  const [results, setResults] = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail]   = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCustomers = useCallback(async (q = search, p = 1) => {
    setLoading(true);
    setSelected(null);
    setDetail(null);
    try {
      const res = await axios.get(`${API}/customers`, { params: { search: q || undefined, page: p, limit: LIMIT } });
      setResults(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setPage(p);
      setSearched(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Tải danh sách khi vào trang
  useEffect(() => {
    fetchCustomers('', 1);
  }, [fetchCustomers]);

  // Khi thay đổi tìm kiếm → tải lại sau 400ms
  useEffect(() => {
    const timer = setTimeout(() => fetchCustomers(search, 1), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const viewDetail = async (passport) => {
    setDetailLoading(true);
    setSelected(passport);
    try {
      const res = await axios.get(`${API}/customers/${passport}`);
      setDetail(res.data.data);
    } catch { setDetail(null); }
    finally { setDetailLoading(false); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
  const formatCurr = (v) => v ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v) : '—';

  const PageButtons = () => {
    const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1);
    return (
      <div className="pagination">
        <button className="page-btn" onClick={() => fetchCustomers(search, page - 1)} disabled={page === 1}>‹</button>
        {pages.map((p) => (
          <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => fetchCustomers(search, p)}>{p}</button>
        ))}
        <button className="page-btn" onClick={() => fetchCustomers(search, page + 1)} disabled={page === totalPages}>›</button>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1>Khách hàng</h1>
        <p>Tra cứu xuyên 3 miền — Bắc, Trung, Nam</p>
      </div>

      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); fetchCustomers(search, 1); }} className="search-bar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo Passport hoặc mã khách..."
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? '⏳' : 'Tìm kiếm'}
        </button>
      </form>

      {loading && <div className="loading"><div className="spinner" /><span>Đang tra cứu toàn quốc...</span></div>}

      {!loading && searched && (
        <div style={{ display: 'grid', gridTemplateColumns: detail ? '1fr 380px' : '1fr', gap: 20, alignItems: 'start' }}>
          {/* Danh sách khách */}
          <div className="card" style={{ padding: 0 }}>
            <div className="card-header" style={{ padding: '16px 20px' }}>
              <h2>Kết quả ({total} khách hàng)</h2>
            </div>
            {results.length === 0 ? (
              <div className="empty-state">
                <div className="icon">👤</div>
                <p>Không tìm thấy khách hàng nào.</p>
              </div>
            ) : (
              <>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Họ & Tên</th>
                        <th>Số Passport</th>
                        <th>Điện thoại</th>
                        <th>Miền</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((c) => {
                        const badge = REGION_BADGE[c.region] || {};
                        return (
                          <tr key={`${c.SoPassport}-${c.region}`}
                            style={{ cursor: 'pointer', background: selected === c.SoPassport ? 'var(--gold-dim)' : '' }}
                            onClick={() => viewDetail(c.SoPassport)}>
                            <td><strong>{c.HoKhach} {c.TenKhach}</strong></td>
                            <td style={{ fontFamily: 'monospace' }}>{c.SoPassport}</td>
                            <td>{c.SoDienThoai || '—'}</td>
                            <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                            <td><span style={{ color: 'var(--gold)', fontSize: 12 }}>Chi tiết →</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '12px 0' }}><PageButtons /></div>
              </>
            )}
          </div>

          {/* Panel chi tiết */}
          {detail && (
            <div className="card" style={{ position: 'sticky', top: 20 }}>
              <div className="card-header">
                <h2>Hồ sơ khách</h2>
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={() => { setDetail(null); setSelected(null); }}>✕</button>
              </div>
              {detailLoading ? (
                <div className="loading"><div className="spinner" /></div>
              ) : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{detail.khach.HoKhach} {detail.khach.TenKhach}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>🪪 {detail.khach.SoPassport}</div>
                    {detail.khach.SoDienThoai && <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>📞 {detail.khach.SoDienThoai}</div>}
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                      <div style={{ flex: 1, padding: '8px 10px', background: 'var(--bg-card-2)', borderRadius: 6, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>💳 Thẻ tín dụng</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{detail.khach.CreditCard ? `**** **** **** ${detail.khach.CreditCard.slice(-4)}` : '—'}</div>
                      </div>
                      <div style={{ flex: 1, padding: '8px 10px', background: 'var(--bg-card-2)', borderRadius: 6, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>⭐ Điểm tích lũy</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>{detail.khach.TheTichDiem || 0} pts</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 10 }}>
                      Lịch sử đặt phòng ({detail.lichSu.length})
                    </div>
                    {detail.lichSu.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có lịch sử đặt phòng.</p>
                    ) : detail.lichSu.map((l, i) => (
                      <div key={i} style={{
                        padding: '10px 12px', marginBottom: 8,
                        background: 'var(--bg-card-2)', borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)'
                      }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{l.TenKhachSan}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          Phòng {l.MaPhong} • {l.LoaiPhong}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {formatDate(l.NgayNhanPhong)} → {formatDate(l.NgayTraPhong)}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 2 }}>
                          {formatCurr(l.GiaPhong)}/đêm • <span style={{ color: l.TrangThai === 'Đã đặt' ? 'var(--green)' : 'var(--text-muted)' }}>{l.TrangThai}</span>
                        </div>
                        <span className={`badge ${REGION_BADGE[l.region]?.cls || ''}`} style={{ marginTop: 4 }}>
                          {REGION_BADGE[l.region]?.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {!searched && !loading && (
        <div className="empty-state">
          <div className="icon">⏳</div>
          <p>Đang tải danh sách khách hàng...</p>
        </div>
      )}
    </div>
  );
}
