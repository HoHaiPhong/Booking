const axios = require('axios');

async function check() {
  try {
    const res = await axios.get('http://localhost:5000/api/room-types');
    console.log('GET room-types SUCCESS:', res.data);
  } catch (err) {
    console.error('GET room-types FAILED:', err.response ? err.response.data : err.message);
  }

  try {
    const res = await axios.post('http://localhost:5000/api/reception/checkin', { MaKH: 'KH_TEST' });
    console.log('POST checkin SUCCESS:', res.data);
  } catch (err) {
    console.error('POST checkin FAILED:', err.response ? err.response.data : err.message);
  }
}

check();
