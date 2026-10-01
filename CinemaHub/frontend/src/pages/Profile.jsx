import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, Shield, Save, Phone, Calendar, Ticket, Heart, Bell, Star, LogOut, Clock, MapPin, Film, QrCode, Printer, X, CheckCircle2, CreditCard, Eye, EyeOff } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
const Profile = () => {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const getInitialTab = () => {
    if (user && ['Admin', 'Manager', 'Staff'].includes(user.role)) {
      return 'password';
    }
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'booking' || tabParam === 'bookings' || tabParam === 'history') return 'booking';
    if (tabParam) return tabParam;
    if (location.state?.tab === 'booking' || location.state?.tab === 'bookings') return 'booking';
    return location.state?.tab || 'info';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [selectedTicketModal, setSelectedTicketModal] = useState(null);
  const [cancelModalBookingId, setCancelModalBookingId] = useState(null);
  const [cancelModalMessage, setCancelModalMessage] = useState({ text: '', type: '' });
  // Info state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [infoMessage, setInfoMessage] = useState({ text: '', type: '' });
  const [infoLoading, setInfoLoading] = useState(false);
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passMessage, setPassMessage] = useState({ text: '', type: '' });
  const [passLoading, setPassLoading] = useState(false);
  // Handle tab change from navigation state or URL query
  useEffect(() => {
    if (user && ['Admin', 'Manager', 'Staff'].includes(user.role)) {
      if (location.state?.tab && location.state.tab !== 'password') {
        setActiveTab('password');
      } else if (!location.state?.tab && activeTab !== 'password') {
        setActiveTab('password');
      }
    } else {
      const params = new URLSearchParams(location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'booking' || tabParam === 'bookings' || tabParam === 'history') {
        setActiveTab('booking');
      } else if (tabParam) {
        setActiveTab(tabParam);
      } else if (location.state?.tab) {
        setActiveTab(location.state.tab === 'bookings' ? 'booking' : location.state.tab);
      }
    }
  }, [location.search, location.state, user]);
  // Fetch full user profile on load to get phone and DOB
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }


    const fetchProfile = async () => {
      try {
        const res = await fetch('http://127.0.0.1:5000/api/users/profile', {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setUsername(data.username || '');
          setEmail(data.email || '');
          setPhoneNumber(data.phoneNumber || '');
          // Format date for input type="date" (YYYY-MM-DD)
          if (data.dateOfBirth) {
            setDateOfBirth(new Date(data.dateOfBirth).toISOString().split('T')[0]);
          }
        }
      } catch (err) {
        console.error("Error fetching profile", err);
      }
    };

    fetchProfile();
    fetchBookings();
  }, [user, navigate]);
  const [realBookings, setRealBookings] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const fetchBookings = async () => {
    if (!user) return;
    setBookingLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/bookings/my-history?email=${user.email || ''}`, {
        headers: user.token ? { Authorization: `Bearer ${user.token}` } : {}
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setRealBookings(data);
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
    } finally {
      setBookingLoading(false);
    }
  };
  const handleOpenTicketDetail = async (bookingItem) => {
    setSelectedTicketModal(bookingItem);
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/bookings/${bookingItem.id || bookingItem.bookingReference}`);
      const data = await res.json();
      if (res.ok && data.booking) {
        setSelectedTicketModal({
          ...data.booking,
          ticket: data.ticket
        });
      }
    } catch (err) {
      console.error("Error fetching ticket detail:", err);
    }
  };
  const handleContinuePayment = (booking) => {
    navigate(`/booking?movieId=${booking.movieId}&showtimeId=${booking.showtimeId}&resumeBookingId=${booking.id}`);
  };
  const handleCancelBooking = (bookingId) => {
    setCancelModalBookingId(bookingId);
    setCancelModalMessage({ text: '', type: '' });
  };

  const confirmCancelBooking = async () => {
    if (!cancelModalBookingId) return;
    setCancelModalMessage({ text: '', type: '' });
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/bookings/${cancelModalBookingId}/cancel`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {})
        },
        body: JSON.stringify({ reason: "Khách hàng tự hủy trên hồ sơ cá nhân" })
      });
      const data = await res.json();
      if (!res.ok) {
        setCancelModalMessage({ text: data.error || "Hủy vé thất bại", type: 'error' });
      } else {
        setCancelModalMessage({ text: "Đã hủy vé thành công!", type: 'success' });
        fetchBookings();
        setTimeout(() => setCancelModalBookingId(null), 1500);
      }
    } catch (err) {
      setCancelModalMessage({ text: "Lỗi khi kết nối đến máy chủ", type: 'error' });
    }
  };
  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    setInfoMessage({ text: '', type: '' });
    setInfoLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ username, email, phoneNumber, dateOfBirth }),
      });
      const data = await res.json();
      if (res.ok) {
        setInfoMessage({ text: 'Cập nhật thông tin thành công!', type: 'success' });
        login({ ...user, name: data.username, email: data.email });
      } else {
        setInfoMessage({ text: data.message || 'Cập nhật thất bại', type: 'error' });
      }
    } catch (err) {
      setInfoMessage({ text: 'Lỗi kết nối đến máy chủ', type: 'error' });
    } finally {
      setInfoLoading(false);
    }
  };
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassMessage({ text: '', type: '' });
    if (newPassword === currentPassword) {
      return setPassMessage({ text: 'Mật khẩu mới không được giống mật khẩu cũ!', type: 'error' });
    }
    if (newPassword !== confirmPassword) {
      return setPassMessage({ text: 'Mật khẩu mới và Nhập lại mật khẩu không khớp!', type: 'error' });
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return setPassMessage({ text: 'Mật khẩu mới phải có ít nhất 8 ký tự, 1 chữ hoa, 1 chữ thường và 1 số.', type: 'error' });
    }
    setPassLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:5000/api/users/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPassMessage({ text: 'Đổi mật khẩu thành công!', type: 'success' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassMessage({ text: data.message || 'Đổi mật khẩu thất bại', type: 'error' });
      }
    } catch (err) {
      setPassMessage({ text: 'Lỗi kết nối đến máy chủ', type: 'error' });
    } finally {
      setPassLoading(false);
    }
  };
  const handleLogout = () => {
    logout();
    navigate('/');
  };
  if (!user) return null;
  const allMenuItems = [
    { id: 'info', icon: <User className="w-5 h-5" />, label: 'Personal Info' },
    { id: 'password', icon: <Lock className="w-5 h-5 text-orange-400" />, label: 'Change Pass' },
    { id: 'booking', icon: <Ticket className="w-5 h-5 text-blue-400" />, label: 'Booking Hist.' },
    { id: 'favorites', icon: <Heart className="w-5 h-5 text-pink-500" />, label: 'Favorites' },
    { id: 'membership', icon: <Star className="w-5 h-5 text-yellow-500" />, label: 'Membership' },
  ];
  const menuItems = ['Admin', 'Manager', 'Staff'].includes(user.role)
    ? allMenuItems.filter(item => item.id === 'password')
    : allMenuItems;

  return (
    <div className="container mx-auto px-4 py-8 md:py-16 pt-24 min-h-screen">
      <h1 className="text-3xl font-display font-bold tracking-widest mb-10 text-center uppercase">MY PROFILE</h1>

      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 items-start">

        {/* Left Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full lg:w-[320px] shrink-0 space-y-6"
        >
          {/* Profile Card */}
          <div className="glass-panel p-8 rounded-2xl flex flex-col items-center text-center relative overflow-hidden">
            {/* Background decorative blob */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>

            <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-primary to-orange-500 flex items-center justify-center shadow-[0_0_20px_rgba(229,9,20,0.4)] text-white font-bold text-5xl mb-6 relative z-10 border-4 border-background">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-bold mb-1">{user.name}</h2>
            <p className="text-gray-400 text-sm mb-6">{user.email}</p>
            <div className="w-full py-2 bg-white/5 border border-white/10 rounded-xl text-primary font-bold tracking-wider text-sm">
              {user.role.toUpperCase()}
            </div>
          </div>
          {/* Navigation Menu */}
          <div className="glass-panel rounded-2xl overflow-hidden py-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 px-6 py-4 text-sm font-medium transition-all duration-300 relative ${activeTab === item.id ? 'text-white bg-white/10' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
              >
                {activeTab === item.id && (
                  <motion.div layoutId="active-indicator" className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                )}
                {item.icon}
                {item.label}
              </button>
            ))}

            <div className="mx-4 my-2 border-t border-white/10"></div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-6 py-4 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5" /> Logout
            </button>
          </div>
        </motion.div>
        {/* Right Content Area */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-grow w-full glass-panel p-8 md:p-12 rounded-2xl min-h-[600px]"
        >
          <AnimatePresence mode="wait">

            {/* TAB: PERSONAL INFO */}
            {activeTab === 'info' && (
              <motion.div
                key="info"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h2 className="text-2xl font-bold mb-8 pb-4 border-b border-white/10 uppercase tracking-wider text-gray-200">Thông tin cá nhân</h2>

                {infoMessage.text && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`mb-8 p-4 rounded-xl text-sm ${infoMessage.type === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                    {infoMessage.text}
                  </motion.div>
                )}
                <form onSubmit={handleUpdateInfo} className="space-y-6 max-w-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Username</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                          <User className="w-5 h-5" />
                        </div>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full bg-background/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                          <Mail className="w-5 h-5" />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-background/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone Number</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                          <Phone className="w-5 h-5" />
                        </div>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="Nhập số điện thoại"
                          className="w-full bg-background/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Date of Birth</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <input
                          type="date"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          className="w-full bg-background/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all [color-scheme:dark]"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="pt-8">
                    <button type="submit" disabled={infoLoading} className="btn-primary flex items-center gap-2 px-8 py-3 w-full md:w-auto justify-center">
                      {infoLoading ? 'Đang lưu...' : <><Save className="w-5 h-5" /> Save Changes</>}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
            {/* TAB: CHANGE PASSWORD */}
            {activeTab === 'password' && (
              <motion.div
                key="password"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h2 className="text-2xl font-bold mb-8 pb-4 border-b border-white/10 uppercase tracking-wider text-gray-200">Đổi mật khẩu</h2>

                {passMessage.text && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`mb-8 p-4 rounded-xl text-sm ${passMessage.type === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                    {passMessage.text}
                  </motion.div>
                )}
                <form onSubmit={handleChangePassword} className="space-y-6 max-w-xl">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mật khẩu hiện tại</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        className="w-full bg-background/50 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors"
                      >
                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mật khẩu mới</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                        <Shield className="w-5 h-5" />
                      </div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full bg-background/50 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Ít nhất 8 ký tự, 1 chữ hoa, 1 chữ thường và 1 số.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nhập lại mật khẩu mới</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                        <Shield className="w-5 h-5" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full bg-background/50 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="pt-4">
                    <button type="submit" disabled={passLoading} className="btn-primary flex items-center gap-2 px-8 py-3 w-full md:w-auto justify-center">
                      {passLoading ? 'Đang lưu...' : <><Save className="w-5 h-5" /> Cập nhật mật khẩu</>}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
            {/* TAB: BOOKING HISTORY */}
            {activeTab === 'booking' && (
              <motion.div
                key="booking"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                  <h2 className="text-2xl font-bold uppercase tracking-wider text-gray-200">
                    Lịch sử đặt vé ({realBookings.length})
                  </h2>
                  <button
                    onClick={fetchBookings}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    Làm mới
                  </button>
                </div>
                <div className="space-y-6">
                  {realBookings.length > 0 ? (
                    realBookings.map((b, index) => {
                      const isConfirmed = b.status === 'CONFIRMED';
                      const isCancelled = b.status === 'CANCELLED';
                      const isPending = b.status === 'PENDING';
                      let badgeColor = 'bg-gray-500/20 text-gray-400 border-gray-500/30';
                      if (isConfirmed) badgeColor = 'bg-green-500/20 text-green-400 border-green-500/30';
                      else if (isCancelled) badgeColor = 'bg-red-500/20 text-red-400 border-red-500/30';
                      else if (isPending) badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          key={b.id || b.bookingReference}
                          className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col md:flex-row hover:bg-white/10 transition-colors"
                        >
                          <div className={`w-full md:w-2 ${isConfirmed ? 'bg-green-500' : isCancelled ? 'bg-red-500' : 'bg-amber-500'}`}></div>

                          <div className="p-6 flex-grow flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h3 className="text-xl font-bold text-white">{b.movieTitle || 'Vé Xem Phim'}</h3>
                                  <span className="text-xs text-gray-400 font-mono">Mã đặt: {b.bookingReference}</span>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeColor}`}>
                                  {b.status === 'CONFIRMED' ? 'ĐÃ XÁC NHẬN' : b.status === 'CANCELLED' ? 'ĐÃ HỦY' : b.status === 'PENDING' ? 'CHỜ THANH TOÁN' : b.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-6">
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                  <Calendar className="w-4 h-4 text-gray-500" />
                                  <span>{b.showtimeStart ? new Date(b.showtimeStart).toLocaleDateString('vi-VN') : 'Hôm nay'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                  <Clock className="w-4 h-4 text-gray-500" />
                                  <span>{b.showtimeStart ? new Date(b.showtimeStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                  <MapPin className="w-4 h-4 text-gray-500" />
                                  <span>{b.cinemaName || 'CinemaHub'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                  <Film className="w-4 h-4 text-gray-500" />
                                  <span>{b.roomName || 'Phòng chiếu'} ({b.showtimeFormat || '2D'})</span>
                                </div>
                              </div>
                            </div>
                            <div className="border-t border-dashed border-white/20 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div>
                                <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Ghế đã chọn ({b.seats?.length || 0})</span>
                                <div className="flex flex-wrap gap-2">
                                  {b.seats?.map(seat => (
                                    <span key={seat.seatId || seat} className="bg-white/10 text-white font-mono text-sm px-2.5 py-1 rounded">
                                      {seat.seatNumber || seat.seatId || seat}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                <div className="text-right mr-1">
                                  <span className="text-xs text-gray-500 uppercase tracking-wider block mb-0.5">Tổng tiền</span>
                                  <span className="text-lg font-bold text-primary">{b.totalAmount?.toLocaleString()} đ</span>
                                </div>
                                {isConfirmed && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenTicketDetail(b)}
                                      className="px-3.5 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                    >
                                      <QrCode className="w-3.5 h-3.5" /> Xem Vé & Mã QR
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCancelBooking(b.id)}
                                      className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-xl text-xs font-bold transition-all"
                                    >
                                      Hủy vé
                                    </button>
                                  </>
                                )}
                                {isPending && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleContinuePayment(b)}
                                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 animate-pulse"
                                    >
                                      <CreditCard className="w-3.5 h-3.5" /> Thanh Toán Ngay
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCancelBooking(b.id)}
                                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 rounded-xl text-xs font-semibold transition-all"
                                    >
                                      Hủy giữ chỗ
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : !bookingLoading ? (
                    <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
                      <Ticket className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                      <h3 className="text-xl font-bold text-gray-300 mb-2">Bạn chưa có giao dịch nào</h3>
                      <p className="text-gray-500">Hãy đặt vé ngay để trải nghiệm những bộ phim hấp dẫn nhất!</p>
                      <button onClick={() => navigate('/movies')} className="mt-6 px-6 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-colors">
                        Xem lịch chiếu
                      </button>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            )}
            {/* PLACEHOLDER FOR OTHER TABS */}
            {['favorites', 'membership'].includes(activeTab) && (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-full text-center py-20"
              >
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                  <Star className="w-10 h-10 text-gray-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-300 mb-2">Tính năng đang phát triển</h2>
                <p className="text-gray-500 max-w-sm">Mục này sẽ sớm ra mắt trong các phiên bản cập nhật tiếp theo của hệ thống.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      {/* MODAL CHI TIẾT VÉ & MÃ QR */}
      <AnimatePresence>
        {selectedTicketModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#141414] border border-white/15 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative"
            >
              {/* Header */}
              <div className="bg-primary p-6 text-center text-white relative">
                <button
                  type="button"
                  onClick={() => setSelectedTicketModal(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] bg-black/20 px-3 py-1 rounded-full">
                  VÉ ĐIỆN TỬ • CGV CINEMAHUB E-TICKET
                </span>
                <h3 className="text-2xl font-black mt-2 leading-tight">{selectedTicketModal.movieTitle}</h3>
                <p className="text-xs opacity-90 mt-1">
                  {selectedTicketModal.cinemaName} • {selectedTicketModal.roomName} ({selectedTicketModal.showtimeFormat || '2D'})
                </p>
              </div>
              {/* Body */}
              <div className="p-6 space-y-5">
                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-5 bg-white rounded-2xl shadow-inner text-black">
                  <QRCodeSVG
                    value={selectedTicketModal.ticket?.qrCode || selectedTicketModal.qrCode || `CINEMAHUB|${selectedTicketModal.bookingReference}`}
                    size={185}
                    level="H"
                    includeMargin={true}
                  />
                  <p className="text-xs font-mono font-bold tracking-widest mt-2 uppercase text-gray-800">
                    MÃ ĐẶT VÉ: {selectedTicketModal.bookingReference}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5 text-center">
                    Quét mã này tại cổng soát vé hoặc quầy CGV để vào xem phim
                  </p>
                </div>
                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 bg-white/5 rounded-2xl p-4 border border-white/10 text-xs">
                  <div>
                    <span className="text-gray-400 block mb-0.5">Ngày & Giờ Chiếu</span>
                    <span className="font-bold text-white">
                      {selectedTicketModal.showtimeStart ? new Date(selectedTicketModal.showtimeStart).toLocaleDateString('vi-VN') : 'Hôm nay'}
                      {' - '}
                      {selectedTicketModal.showtimeStart ? new Date(selectedTicketModal.showtimeStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Ghế Ngồi ({selectedTicketModal.seats?.length || 0})</span>
                    <span className="font-bold text-primary text-sm">
                      {selectedTicketModal.seats?.map(s => s.seatNumber || s.seatId || s).join(', ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Khách Hàng</span>
                    <span className="font-bold text-white truncate block">
                      {selectedTicketModal.customerName || 'Khách hàng'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Trạng Thái & TT</span>
                    <span className="font-bold text-emerald-400">
                      {selectedTicketModal.status === 'CONFIRMED' ? 'Đã xác nhận' : selectedTicketModal.status === 'CANCELLED' ? 'Đã hủy' : selectedTicketModal.status}
                      {' '}({selectedTicketModal.paymentMethod || 'Online'})
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm pt-1 px-1">
                  <span className="text-gray-400">Tổng thanh toán:</span>
                  <span className="text-xl font-black text-primary">
                    {selectedTicketModal.totalAmount?.toLocaleString()} đ
                  </span>
                </div>
              </div>
              {/* Footer */}
              <div className="bg-[#1a1a1a] p-4 flex justify-between gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4" /> In vé
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTicketModal(null)}
                  className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl transition-colors"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CANCEL CONFIRMATION MODAL */}
      <AnimatePresence>
        {cancelModalBookingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setCancelModalBookingId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#181818] border border-white/10 rounded-2xl p-6 w-full max-w-sm relative z-10 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Ticket className="w-6 h-6 text-primary" /> Hủy giữ chỗ
              </h3>
              <p className="text-gray-300 text-sm mb-6">
                Bạn có chắc chắn muốn hủy vé này? Ghế sẽ được giải phóng cho người khác và bạn sẽ phải đặt lại từ đầu.
              </p>
              
              {cancelModalMessage.text && (
                <div className={`p-3 rounded-lg text-sm mb-6 font-semibold border ${
                  cancelModalMessage.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'
                }`}>
                  {cancelModalMessage.text}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setCancelModalBookingId(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-semibold transition-all text-sm"
                >
                  Không, quay lại
                </button>
                <button
                  onClick={confirmCancelBooking}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition-all text-sm shadow-[0_0_15px_rgba(229,9,20,0.3)]"
                >
                  Đồng ý hủy
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default Profile;
