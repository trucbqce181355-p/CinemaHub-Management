import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
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
import ForgotPassword from './pages/ForgotPassword';
import VerifyResetOtp from './pages/VerifyResetOtp';
import ResetPassword from './pages/ResetPassword';
import Movies from './pages/Movies';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const GuestRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const SessionModal = () => {
  const { isSessionExpired, setIsSessionExpired } = useAuth();
  const navigate = useNavigate();

  if (!isSessionExpired) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md transition-all duration-300">
      <div className="w-full max-w-sm bg-[#121212] p-8 rounded-3xl border border-red-500/30 relative shadow-[0_0_50px_rgba(229,9,20,0.3)] transform animate-in fade-in zoom-in duration-300 flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <svg className="w-10 h-10 text-red-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-3">Hết phiên đăng nhập</h2>
        <p className="text-gray-400 mb-8 leading-relaxed">
          Vì lý do bảo mật, phiên làm việc của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục sử dụng hệ thống.
        </p>
        
        <button
          onClick={() => {
            setIsSessionExpired(false);
            navigate('/login');
          }}
          className="w-full py-3.5 px-4 bg-[#e31837] hover:bg-red-700 text-white rounded-xl font-bold tracking-wide transition-all shadow-lg shadow-red-500/20"
        >
          Đăng nhập lại
        </button>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <SessionModal />
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
        </Route>

        {/* Customer Routes */}
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/movie/:id" element={<MovieDetails />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/booking/:id" element={<Booking />} />
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-reset-otp" element={<VerifyResetOtp />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
