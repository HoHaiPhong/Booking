import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Booking from './pages/Booking';
import Customers from './pages/Customers';
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
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
