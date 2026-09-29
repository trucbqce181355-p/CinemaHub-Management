import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CustomerLayout from './layouts/CustomerLayout';
import AdminLayout from './layouts/AdminLayout';
import Home from './pages/Home';
import Booking from './pages/Booking';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import MovieDetails from './pages/MovieDetails';
import UserManagement from './pages/admin/UserManagement';
import MovieManagement from './pages/admin/MovieManagement';
import PromotionManagement from './pages/admin/PromotionManagement';
import TicketCheckIn from './pages/admin/TicketCheckIn';
import CinemaManagement from './pages/admin/CinemaManagement';
import ScreenRoomManagement from './pages/admin/ScreenRoomManagement';
import ForgotPassword from './pages/ForgotPassword';
import VerifyResetOtp from './pages/VerifyResetOtp';
import ResetPassword from './pages/ResetPassword';
import Movies from './pages/Movies';
import Cinemas from './pages/Cinemas';
import PaymentCallback from './pages/PaymentCallback';

function App() {
  return (
    <Router>
      <Routes>
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={
            <div className="space-y-6">
              <h1 className="text-3xl font-display font-bold text-white">Tổng quan hệ thống</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="glass-panel p-6 rounded-2xl border border-white/10">
                    <h3 className="text-gray-400 mb-2">Tổng doanh thu</h3>
                    <p className="text-3xl font-bold text-primary">120.5M VNĐ</p>
                 </div>
                 <div className="glass-panel p-6 rounded-2xl border border-white/10">
                    <h3 className="text-gray-400 mb-2">Người dùng mới</h3>
                    <p className="text-3xl font-bold text-green-400">+125</p>
                 </div>
                 <div className="glass-panel p-6 rounded-2xl border border-white/10">
                    <h3 className="text-gray-400 mb-2">Vé đã bán</h3>
                    <p className="text-3xl font-bold text-blue-400">1,240</p>
                 </div>
              </div>
            </div>
          } />
          <Route path="users" element={<UserManagement />} />
          <Route path="movies" element={<MovieManagement />} />
          <Route path="cinemas" element={<CinemaManagement />} />
          <Route path="cinemas/:cinemaId/rooms" element={<ScreenRoomManagement />} />
          <Route path="promotions" element={<PromotionManagement />} />
          <Route path="checkin" element={<TicketCheckIn />} />
        </Route>

        {/* Customer Routes */}
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/cinemas" element={<Cinemas />} />
          <Route path="/movie/:id" element={<MovieDetails />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-reset-otp" element={<VerifyResetOtp />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/payment-callback" element={<PaymentCallback />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
