
import Promotions from './pages/Promotions';
import React, { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation
} from 'react-router-dom';

import { useAuth } from './context/AuthContext';

import CustomerLayout from './layouts/CustomerLayout';
import AdminLayout from './layouts/AdminLayout';

import Home from './pages/Home';
import Booking from './pages/Booking';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import MovieDetails from './pages/MovieDetails';
import Movies from './pages/Movies';
import Cinemas from './pages/Cinemas';
import News from './pages/News';
import NewsDetails from './pages/NewsDetails';
import MovieAssistant from './pages/MovieAssistant';

import ForgotPassword from './pages/ForgotPassword';
import VerifyResetOtp from './pages/VerifyResetOtp';
import ResetPassword from './pages/ResetPassword';
import PaymentCallback from './pages/PaymentCallback';

// Admin pages
import UserManagement from './pages/admin/UserManagement';
import MembershipManagement from './pages/admin/MembershipManagement';
import MovieManagement from './pages/admin/MovieManagement';
import PromotionManagement from './pages/admin/PromotionManagement';
import TicketCheckIn from './pages/admin/TicketCheckIn';
import CinemaManagement from './pages/admin/CinemaManagement';
import ScreenRoomManagement from './pages/admin/ScreenRoomManagement';
import ShowtimeManagement from './pages/admin/ShowtimeManagement';
import ReviewManagement from './pages/admin/ReviewManagement';
import FoodManagement from './pages/admin/FoodManagement';
import CinemaStockManagement from './pages/admin/CinemaStockManagement';
import NewsManagement from './pages/admin/NewsManagement';
import NotificationManagement from './pages/admin/NotificationManagement';
import RefundManagement from './pages/admin/RefundManagement';
import BusinessDashboard from './pages/admin/BusinessDashboard';

// =====================================================
// PROTECTED ROUTE
// =====================================================

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.role?.toUpperCase();

    const isAllowed = allowedRoles.some(
      role => role.toUpperCase() === userRole
    );

    if (!isAllowed) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

// =====================================================
// GUEST ROUTE
// =====================================================

const GuestRoute = ({ children }) => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// =====================================================
// SESSION EXPIRED MODAL
// =====================================================

const SessionModal = () => {
  const { isSessionExpired, setIsSessionExpired } = useAuth();
  const navigate = useNavigate();

  if (!isSessionExpired) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md transition-all duration-300">
      <div className="w-full max-w-sm bg-[#121212] p-8 rounded-3xl border border-red-500/30 relative shadow-[0_0_50px_rgba(229,9,20,0.3)] transform animate-in fade-in zoom-in duration-300 flex flex-col items-center text-center">

        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <svg
            className="w-10 h-10 text-red-500"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">
          Hết phiên đăng nhập
        </h2>

        <p className="text-gray-400 mb-8 leading-relaxed">
          Vì lý do bảo mật, phiên làm việc của bạn đã hết hạn.
          Vui lòng đăng nhập lại để tiếp tục sử dụng hệ thống.
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

// =====================================================
// SCROLL TO TOP
// =====================================================

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// =====================================================
// MAIN APP
// =====================================================

function App() {
  return (
    <Router>
      <ScrollToTop />
      <SessionModal />

      <Routes>

        {/* ================= ADMIN ROUTES ================= */}

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'STAFF']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'STAFF']}>
                <BusinessDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="dashboard"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'STAFF']}>
                <BusinessDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="users" element={<UserManagement />} />
          <Route path="membership" element={<MembershipManagement />} />
          <Route path="movies" element={<MovieManagement />} />
          <Route path="cinemas" element={<CinemaManagement />} />

          <Route
            path="cinemas/:cinemaId/rooms"
            element={<ScreenRoomManagement />}
          />

          <Route path="promotions" element={<PromotionManagement />} />
          <Route path="showtimes" element={<ShowtimeManagement />} />
          <Route path="checkin" element={<TicketCheckIn />} />
          <Route path="refunds" element={<RefundManagement />} />
          <Route path="reviews" element={<ReviewManagement />} />
          <Route path="food" element={<FoodManagement />} />
          <Route path="food-stock" element={<CinemaStockManagement />} />
          <Route path="news" element={<NewsManagement />} />
          <Route path="notifications" element={<NotificationManagement />} />
        </Route>

        {/* ================= CUSTOMER ROUTES ================= */}

        <Route element={<CustomerLayout />}>

          <Route path="/" element={<Home />} />

          {/* UC01 - AI Movie Assistant */}
          <Route
            path="/movie-assistant"
            element={
              <ProtectedRoute>
                <MovieAssistant />
              </ProtectedRoute>
            }
          />

          <Route path="/promotions" element={<Promotions />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/cinemas" element={<Cinemas />} />
          <Route path="/news" element={<News />} />
          <Route path="/news/:id" element={<NewsDetails />} />

          <Route
            path="/membership"
            element={<Navigate to="/profile?tab=membership" replace />}
          />

          <Route path="/movie/:id" element={<MovieDetails />} />
          <Route path="/movies/:id" element={<MovieDetails />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/booking/:id" element={<Booking />} />

          <Route path="/food-beverage" element={<FoodManagement />} />

          {/* Authentication */}
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />

          <Route
            path="/register"
            element={
              <GuestRoute>
                <Register />
              </GuestRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-reset-otp" element={<VerifyResetOtp />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            path="/payment-callback"
            element={<PaymentCallback />}
          />

        </Route>

      </Routes>
    </Router>
  );
}

export default App;
