const axios = require('axios');

async function testAllRegions() {
  const tests = [
    { region: 'north', hotelId: 'KS01', maPhong: 'P101' },
    { region: 'central', hotelId: 'KS03', maPhong: 'P301' },
    { region: 'south', hotelId: 'KS05', maPhong: 'P501' }
  ];

  for (const t of tests) {
    const data = {
      ...t,
      tenKhach: 'Test Guest ' + t.region,
      passport: 'P' + Math.floor(Math.random() * 900000 + 100000),
      ngayNhanPhong: '2026-03-25',
      ngayTraPhong: '2026-03-27'
    };

    try {
      const res = await axios.post('http://localhost:5000/api/booking/create', data);
      console.log(`✅ ${t.region.toUpperCase()}: Thành công (Mã PD: ${res.data.data.maPhieuDat})`);
    } catch (err) {
      console.error(`❌ ${t.region.toUpperCase()}: Thất bại ->`, err.response ? JSON.stringify(err.response.data) : err.message);
    }
  }
}

testAllRegions();
