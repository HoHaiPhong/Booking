const axios = require('axios');

async function testBooking() {
  const data = {
    region: 'north',
    hotelId: 'KS01',
    tenKhach: 'Nguyen Van A',
    passport: 'P' + Date.now().toString().slice(-6),
    maPhong: 'P101',
    ngayNhanPhong: '2026-03-20',
    ngayTraPhong: '2026-03-22'
  };

  try {
    const res = await axios.post('http://localhost:5000/api/booking/create', data);
    console.log('✅ Đặt phòng thành công:', JSON.stringify(res.data, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi đặt phòng:', err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
    process.exit(1);
  }
}

testBooking();
