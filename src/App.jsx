import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Booking from './pages/Booking';
import Customers from './pages/Customers';
import Reception from './pages/Reception';
import RoomTypes from './pages/RoomTypes';
import Rooms from './pages/Rooms';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/booking"    element={<Booking />} />
            <Route path="/customers"  element={<Customers />} />
            <Route path="/reception"  element={<Reception />} />
            <Route path="/room-types" element={<RoomTypes />} />
            <Route path="/rooms"      element={<Rooms />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
