import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Lock, Shield, Save, Phone, Calendar, Ticket, Heart, Bell, Star, 
  LogOut, Clock, MapPin, Film, QrCode, Printer, X, CheckCircle2, CreditCard, 
  Eye, EyeOff, Award, Gift, Coins, Copy, Check, Sparkles, ChevronRight, 
  Info, ExternalLink, ArrowUpRight, ArrowDownRight, Tag, TrendingUp 
} from 'lucide-react';
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
  const [passMessage, setPassMessage] = useState({ text: '', type: '' });
  const [passLoading, setPassLoading] = useState(false);

  // Membership & Points State
  const [membershipData, setMembershipData] = useState(null);
  const [memberTransactions, setMemberTransactions] = useState([]);
  const [redeemableRewards, setRedeemableRewards] = useState([]);
  const [myVouchers, setMyVouchers] = useState([]);
  const [publicTiers, setPublicTiers] = useState([]);
  const [memberSubTab, setMemberSubTab] = useState('benefits'); // 'benefits', 'redeem', 'my_vouchers', 'history'
  const [selectedRewardToRedeem, setSelectedRewardToRedeem] = useState(null);
  const [redeemSuccessVoucher, setRedeemSuccessVoucher] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [redeemLoading, setRedeemLoading] = useState(false);

  const fetchMembershipData = async () => {
    setMembershipLoading(true);
    try {
      // Always fetch public tiers and rewards so they always show even if my-membership fails or user has 0 points
      const publicFetches = [
        fetch('http://127.0.0.1:5000/api/membership/tiers'),
        fetch('http://127.0.0.1:5000/api/membership/rewards')
      ];

      const authFetches = user?.token ? [
        fetch('http://127.0.0.1:5000/api/membership/my-membership', {
          headers: { Authorization: `Bearer ${user.token}` }
        }),
        fetch('http://127.0.0.1:5000/api/membership/my-transactions', {
          headers: { Authorization: `Bearer ${user.token}` }
        }),
        fetch('http://127.0.0.1:5000/api/membership/my-vouchers', {
          headers: { Authorization: `Bearer ${user.token}` }
        })
      ] : [];

      const [tiersRes, rewRes] = await Promise.all(publicFetches);
      if (tiersRes.ok) setPublicTiers(await tiersRes.json());
      if (rewRes.ok) setRedeemableRewards(await rewRes.json());

      if (authFetches.length > 0) {
        const [memRes, txRes, vouchRes] = await Promise.all(authFetches);
        if (memRes.ok) {
          const memData = await memRes.json();
          setMembershipData(memData);
        }
        if (txRes.ok) setMemberTransactions(await txRes.json());
        if (vouchRes.ok) setMyVouchers(await vouchRes.json());
      }
    } catch (err) {
      console.error("Error fetching membership data:", err);
    } finally {
      setMembershipLoading(false);
    }
  };

  const handleRedeemReward = async (reward) => {
    if (!reward) return;
    setRedeemLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:5000/api/membership/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({ rewardId: reward.id })
      });
      const data = await res.json();
      if (res.ok) {
        setRedeemSuccessVoucher(data.voucher);
        setSelectedRewardToRedeem(null);
        fetchMembershipData();
      } else {
        alert(data.error || "Đổi điểm thất bại");
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setRedeemLoading(false);
    }
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };
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
    fetchMembershipData();
  }, [user, navigate]);

  useEffect(() => {
    if (activeTab === 'membership' && user?.token) {
      fetchMembershipData();
    }
  }, [activeTab, user]);
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
    { id: 'membership', icon: <Award className="w-5 h-5 text-amber-400" />, label: 'Membership' },
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
              {(user?.name || user?.username || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-bold mb-1">{user?.name || user?.username || user?.email || 'Thành viên'}</h2>
            <p className="text-gray-400 text-sm mb-6">{user?.email || ''}</p>
            <div className="w-full py-2 bg-white/5 border border-white/10 rounded-xl text-primary font-bold tracking-wider text-sm">
              {(user?.role || 'Customer').toUpperCase()}
            </div>

            {membershipData && (
              <div className="w-full mt-3 p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold" style={{ color: membershipData.currentTier?.badgeColor || '#EAB308' }}>
                  <Award className="w-4 h-4" />
                  <span>{membershipData.currentTier?.name || 'Thành viên'}</span>
                </div>
                <div className="flex items-center gap-1 font-black text-amber-400">
                  <Coins className="w-3.5 h-3.5" />
                  <span>{(membershipData.rewardPoints || 0).toLocaleString()} đ</span>
                </div>
              </div>
            )}
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
            {/* TAB: FAVORITES PLACEHOLDER */}
            {activeTab === 'favorites' && (
              <motion.div
                key="favorites"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-full text-center py-20"
              >
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                  <Heart className="w-10 h-10 text-pink-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-300 mb-2">Phim yêu thích của bạn</h2>
                <p className="text-gray-500 max-w-sm">Danh sách phim đã lưu sẽ xuất hiện tại đây khi bạn bấm thích phim.</p>
              </motion.div>
            )}

            {/* TAB: MEMBERSHIP & REWARD POINTS */}
            {activeTab === 'membership' && (
              <motion.div
                key="membership"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                {/* Header & Loyalty Rule Banner */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div>
                    <h2 className="text-2xl font-bold uppercase tracking-wider text-gray-200">
                      Thành viên & Điểm thưởng
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                      Xem thẻ VIP, kiểm tra điểm khả dụng, đổi mã giảm giá vé và tra cứu đặc quyền hạng thẻ
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-400">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span>Quy ước: 1.000 VNĐ = 1 Điểm thưởng</span>
                  </div>
                </div>

                {/* 1. VIP DIGITAL MEMBERSHIP CARD */}
                <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 bg-gradient-to-br from-zinc-900 via-neutral-900 to-black border border-white/20 shadow-2xl">
                  {/* Holographic background sheen */}
                  <div 
                    className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
                    style={{ backgroundColor: membershipData?.currentTier?.badgeColor || '#EAB308' }}
                  />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />

                  <div className="relative z-10 flex flex-col justify-between min-h-[190px]">
                    {/* Card Top: Logo & Tier Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary p-2 rounded-xl shadow-lg">
                          <Film className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <span className="font-display font-extrabold tracking-widest text-lg text-white">
                            CINEMA<span className="text-primary">HUB</span>
                          </span>
                          <span className="block text-[9px] uppercase tracking-[0.25em] text-gray-400 font-bold">
                            VIP MEMBER PASS
                          </span>
                        </div>
                      </div>

                      <div 
                        className="flex items-center gap-2 px-4 py-1.5 rounded-full font-black text-xs text-black shadow-lg"
                        style={{ backgroundColor: membershipData?.currentTier?.badgeColor || '#EAB308' }}
                      >
                        <Award className="w-4 h-4" />
                        <span>{membershipData?.currentTier?.name || 'Thành viên Chuẩn'}</span>
                      </div>
                    </div>

                    {/* Card Middle: Chip & Card Number */}
                    <div className="my-6 flex items-center justify-between">
                      <div className="w-11 h-8 rounded-lg bg-gradient-to-tr from-amber-200 via-amber-400 to-yellow-600 border border-yellow-300 shadow-inner flex items-center justify-center opacity-90">
                        <div className="w-7 h-5 border border-amber-800/40 rounded-sm grid grid-cols-2 gap-0.5 p-0.5">
                          <div className="bg-amber-900/30 rounded-xs"></div>
                          <div className="bg-amber-900/30 rounded-xs"></div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest block font-medium">MÃ THẺ THÀNH VIÊN</span>
                        <span className="font-mono text-lg sm:text-xl font-bold tracking-[0.2em] text-white">
                          {membershipData?.membershipCardNumber || `CH-${user.id?.substring(0, 6).toUpperCase() || '8829-1029'}`}
                        </span>
                      </div>
                    </div>

                    {/* Card Bottom: Holder Name & Benefits overview */}
                    <div className="flex items-end justify-between pt-2 border-t border-white/10">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-medium">Chủ thẻ</span>
                        <span className="font-extrabold text-white text-base tracking-wide uppercase">
                          {user?.name || user?.username || user?.email || 'Thành viên'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-medium">Đặc quyền vé</span>
                          <span className="font-black text-amber-400 text-sm">
                            Giảm {membershipData?.currentTier?.ticketDiscountPercent || 0}% giá vé
                          </span>
                        </div>
                        <div className="hidden sm:block p-2 bg-white rounded-lg shadow-md">
                          <QRCodeSVG
                            value={`CINEMAHUB|MEMBER|${membershipData?.membershipCardNumber || user?.email || 'MEMBER'}`}
                            size={36}
                            level="M"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. POINTS BALANCE & PROGRESSION BAR */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Available points */}
                  <div className="bg-surface border border-white/10 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Điểm khả dụng</span>
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <Coins className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-amber-400">
                          {(membershipData?.rewardPoints || 0).toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-400 font-bold">điểm</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">Dùng để đổi các mã giảm giá và vé miễn phí</p>
                    </div>
                  </div>

                  {/* Lifetime points */}
                  <div className="bg-surface border border-white/10 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Điểm tích lũy trọn đời</span>
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white">
                          {(membershipData?.lifetimePoints || 0).toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-400 font-bold">điểm</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">Dùng để xét duyệt nâng cấp hạng thành viên</p>
                    </div>
                  </div>

                  {/* Next Tier Milestone */}
                  <div className="bg-surface border border-white/10 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Thăng hạng kế tiếp</span>
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      {membershipData?.nextTier ? (
                        <>
                          <div className="flex justify-between items-baseline mb-1.5">
                            <span className="text-sm font-bold text-white">
                              Lên {membershipData.nextTier.name}
                            </span>
                            <span className="text-xs font-extrabold text-primary">
                              Còn {membershipData.pointsNeededForNextTier?.toLocaleString()} điểm
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${membershipData.progressPercent || 0}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className="bg-gradient-to-r from-amber-500 to-primary h-full rounded-full"
                            />
                          </div>
                          <span className="text-[10px] text-gray-500 mt-1.5 block text-right font-semibold">
                            Tiến độ: {membershipData.progressPercent || 0}%
                          </span>
                        </>
                      ) : (
                        <div>
                          <span className="text-lg font-black text-amber-400 block">HẠNG CAO NHẤT</span>
                          <span className="text-xs text-gray-400">Bạn đang sở hữu mọi đặc quyền tối đa của CinemaHub!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. SUB-TABS NAVIGATION */}
                <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
                  <button
                    onClick={() => setMemberSubTab('benefits')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      memberSubTab === 'benefits'
                        ? 'bg-primary text-white shadow-lg shadow-primary/20 border border-primary/40'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Award className="w-4 h-4" /> Đặc quyền hội viên
                  </button>

                  <button
                    onClick={() => setMemberSubTab('redeem')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      memberSubTab === 'redeem'
                        ? 'bg-primary text-white shadow-lg shadow-primary/20 border border-primary/40'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Gift className="w-4 h-4" /> Đổi điểm nhận quà ({redeemableRewards.length})
                  </button>

                  <button
                    onClick={() => setMemberSubTab('my_vouchers')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      memberSubTab === 'my_vouchers'
                        ? 'bg-primary text-white shadow-lg shadow-primary/20 border border-primary/40'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Tag className="w-4 h-4" /> Mã ưu đãi của tôi ({myVouchers.filter(v => v.status === 'UNUSED').length})
                  </button>

                  <button
                    onClick={() => setMemberSubTab('history')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      memberSubTab === 'history'
                        ? 'bg-primary text-white shadow-lg shadow-primary/20 border border-primary/40'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Clock className="w-4 h-4" /> Lịch sử điểm thưởng
                  </button>
                </div>

                {/* 4. SUB-TAB 1: TIER BENEFITS COMPARISON */}
                {memberSubTab === 'benefits' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white">Bảng so sánh quyền lợi các hạng hội viên</h3>
                      <p className="text-xs text-gray-400 mt-1">
                        Càng tích lũy nhiều điểm, bạn càng nhận được nhiều ưu đãi giảm giá vé, bắp nước và quyền ưu tiên đặc biệt.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {(membershipData?.allTiers && membershipData.allTiers.length > 0 ? membershipData.allTiers : publicTiers)?.map((tier) => {
                        const isCurrent = tier.code === (membershipData?.currentTier?.code || 'BRONZE');
                        return (
                          <div
                            key={tier.id || tier.code}
                            className={`rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden transition-all ${
                              isCurrent
                                ? 'bg-surface border-2 shadow-2xl shadow-primary/20 scale-[1.02]'
                                : 'bg-surface/70 border border-white/10 hover:border-white/20'
                            }`}
                            style={{ borderColor: isCurrent ? (tier.badgeColor || '#EAB308') : undefined }}
                          >
                            {isCurrent && (
                              <div 
                                className="absolute top-0 right-0 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-black rounded-bl-xl shadow-md"
                                style={{ backgroundColor: tier.badgeColor || '#EAB308' }}
                              >
                                HẠNG CỦA BẠN
                              </div>
                            )}

                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <div 
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-black font-black text-xs"
                                  style={{ backgroundColor: tier.badgeColor || '#EAB308' }}
                                >
                                  {tier.level || 1}
                                </div>
                                <h4 className="text-lg font-black text-white">{tier.name}</h4>
                              </div>

                              <p className="text-xs text-gray-400 min-h-[32px]">{tier.description}</p>

                              <div className="bg-white/5 border border-white/5 rounded-2xl p-3 my-4 space-y-1.5 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Điểm yêu cầu:</span>
                                  <span className="font-bold text-amber-400">{tier.minPoints?.toLocaleString()} điểm</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Chi tiêu tối thiểu:</span>
                                  <span className="font-bold text-white">{tier.minSpend ? `${tier.minSpend?.toLocaleString()} đ` : '0 đ'}</span>
                                </div>
                              </div>

                              {/* Highlight Perks Grid */}
                              <div className="grid grid-cols-2 gap-2 text-center py-2.5 border-y border-white/5 my-3 text-xs">
                                <div>
                                  <span className="text-[10px] text-gray-500 uppercase block">Giảm vé</span>
                                  <span className="font-black text-amber-400">{tier.ticketDiscountPercent || 0}%</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-gray-500 uppercase block">Bắp nước</span>
                                  <span className="font-black text-blue-400">{tier.fnbDiscountPercent || 0}%</span>
                                </div>
                              </div>

                              {tier.birthdayGift && (
                                <div className="bg-primary/10 border border-primary/20 rounded-xl p-2.5 my-3 flex items-center gap-2">
                                  <Gift className="w-4 h-4 text-primary shrink-0" />
                                  <span className="text-xs text-gray-200 font-medium truncate">Sinh nhật: {tier.birthdayGift}</span>
                                </div>
                              )}

                              <div className="space-y-2 mt-4">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Đặc quyền bao gồm:</span>
                                <ul className="space-y-1.5 text-xs text-gray-300">
                                  {tier.benefits?.map((b, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                      <span>{b}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 5. SUB-TAB 2: REDEEM REWARDS STORE */}
                {memberSubTab === 'redeem' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-white">Đổi điểm lấy mã giảm giá vé & bắp nước</h3>
                        <p className="text-xs text-gray-400 mt-1">
                          Số dư khả dụng hiện tại:{' '}
                          <span className="font-extrabold text-amber-400">
                            {(membershipData?.rewardPoints || 0).toLocaleString()} điểm
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {redeemableRewards.map((reward) => {
                        const userPoints = membershipData?.rewardPoints || 0;
                        const canAfford = userPoints >= reward.pointsRequired;
                        const needed = reward.pointsRequired - userPoints;

                        return (
                          <div
                            key={reward.id}
                            className="bg-surface border border-white/10 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group shadow-xl hover:border-white/20 transition-all"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-black font-mono">
                                  {reward.pointsRequired} ĐIỂM
                                </span>
                                <span className="text-[11px] text-gray-400 font-medium">
                                  Hạn dùng: {reward.validityDays || 30} ngày
                                </span>
                              </div>

                              <h4 className="text-lg font-black text-white">{reward.title}</h4>
                              <p className="text-xs text-gray-400 mt-1 min-h-[32px]">{reward.description}</p>

                              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 my-4 space-y-2 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Mức giảm:</span>
                                  <span className="font-black text-primary text-sm">
                                    {reward.discountType === 'PERCENTAGE' 
                                      ? `Giảm ${reward.discountValue}%` 
                                      : `Giảm ${reward.discountValue?.toLocaleString()} đ`}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Đơn tối thiểu:</span>
                                  <span className="font-bold text-white">
                                    {reward.minSpend ? `${reward.minSpend?.toLocaleString()} đ` : 'Không yêu cầu'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedRewardToRedeem(reward)}
                              disabled={!canAfford}
                              className={`w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                canAfford
                                  ? 'bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/25 cursor-pointer'
                                  : 'bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed'
                              }`}
                            >
                              <Gift className="w-4 h-4" />
                              {canAfford ? 'Đổi voucher ngay' : `Cần thêm ${needed?.toLocaleString()} điểm`}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 6. SUB-TAB 3: MY REDEEMED VOUCHERS */}
                {memberSubTab === 'my_vouchers' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white">Mã ưu đãi đã đổi của bạn</h3>
                      <p className="text-xs text-gray-400 mt-1">
                        Sao chép mã voucher và nhập vào ô khuyến mãi khi thanh toán vé xem phim
                      </p>
                    </div>

                    {myVouchers.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myVouchers.map((v) => {
                          const isUnused = v.status === 'UNUSED';
                          const isExpired = v.expiresAt && new Date(v.expiresAt) < new Date();

                          return (
                            <div
                              key={v.id}
                              className={`rounded-3xl p-6 border flex flex-col justify-between relative overflow-hidden ${
                                isUnused && !isExpired
                                  ? 'bg-surface border-white/15 shadow-xl'
                                  : 'bg-surface/50 border-white/5 opacity-60'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                    isUnused && !isExpired
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      : v.status === 'USED'
                                      ? 'bg-blue-500/20 text-blue-400'
                                      : 'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {isUnused && !isExpired ? 'Chưa sử dụng' : v.status === 'USED' ? 'Đã sử dụng' : 'Hết hạn'}
                                  </span>
                                  <span className="text-[11px] text-gray-400 font-mono">
                                    HSD: {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString('vi-VN') : '--'}
                                  </span>
                                </div>

                                <h4 className="text-base font-black text-white">{v.title}</h4>
                                <p className="text-xs text-gray-400 mt-1">
                                  {v.discountType === 'PERCENTAGE'
                                    ? `Giảm ${v.discountValue}% trên tổng đơn vé`
                                    : `Giảm ${v.discountValue?.toLocaleString()} đ trực tiếp`}
                                </p>

                                {/* Voucher Coupon Box */}
                                <div className="my-4 p-3 bg-black/50 border border-dashed border-white/20 rounded-2xl flex items-center justify-between">
                                  <span className="font-mono text-base font-black tracking-widest text-amber-400">
                                    {v.code}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyCode(v.code)}
                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                                  >
                                    {copiedCode === v.code ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Đã sao chép!
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" /> Chép mã
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>

                              {isUnused && !isExpired && (
                                <button
                                  type="button"
                                  onClick={() => navigate('/movies')}
                                  className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                >
                                  Đặt vé dùng mã ngay <ChevronRight className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-16 bg-white/5 border border-white/10 rounded-3xl">
                        <Gift className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                        <h4 className="text-base font-bold text-gray-300">Bạn chưa có voucher nào</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          Hãy dùng điểm thưởng để đổi các mã giảm giá vé cực kỳ hấp dẫn!
                        </p>
                        <button
                          type="button"
                          onClick={() => setMemberSubTab('redeem')}
                          className="mt-4 px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary/20"
                        >
                          Xem kho quà đổi điểm
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 7. SUB-TAB 4: POINTS TRANSACTION HISTORY */}
                {memberSubTab === 'history' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white">Lịch sử tích lũy & tiêu điểm</h3>
                      <p className="text-xs text-gray-400 mt-1">
                        Chi tiết từng lần biến động số dư điểm thưởng trong tài khoản của bạn
                      </p>
                    </div>

                    <div className="bg-surface border border-white/10 rounded-3xl overflow-hidden shadow-xl">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-white/10 bg-white/5 text-gray-400 text-xs uppercase tracking-wider font-semibold">
                              <th className="py-4 px-6">Thời gian</th>
                              <th className="py-4 px-6">Hoạt động</th>
                              <th className="py-4 px-6 text-right">Biến động</th>
                              <th className="py-4 px-6 text-right">Số dư sau</th>
                              <th className="py-4 px-6">Ghi chú</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-xs">
                            {memberTransactions.length > 0 ? (
                              memberTransactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                                  <td className="py-4 px-6 text-gray-400 font-mono whitespace-nowrap">
                                    {tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : '--'}
                                  </td>
                                  <td className="py-4 px-6">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                      tx.type === 'EARN'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : tx.type === 'REDEEM'
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        : 'bg-blue-500/20 text-blue-400'
                                    }`}>
                                      {tx.type === 'EARN' ? 'Tích điểm vé' : tx.type === 'REDEEM' ? 'Đổi voucher' : 'Điều chỉnh điểm'}
                                    </span>
                                  </td>
                                  <td className="py-4 px-6 text-right font-black">
                                    <span className={tx.points > 0 ? 'text-emerald-400 text-sm' : 'text-red-400 text-sm'}>
                                      {tx.points > 0 ? `+${tx.points}` : tx.points}
                                    </span>
                                  </td>
                                  <td className="py-4 px-6 text-right font-bold text-gray-300">
                                    {tx.balanceAfter?.toLocaleString()} đ
                                  </td>
                                  <td className="py-4 px-6 text-gray-300">
                                    {tx.reason || '--'}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="py-12 text-center text-gray-500 text-xs">
                                  Bạn chưa có biến động điểm nào trong lịch sử
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* CONFIRMATION MODAL FOR REDEEMING REWARD */}
      <AnimatePresence>
        {selectedRewardToRedeem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#141414] border border-white/15 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl relative"
            >
              <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
                <Gift className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-black text-white">Xác nhận đổi điểm</h3>
              <p className="text-xs text-gray-400 mt-2">
                Bạn có chắc chắn muốn dùng{' '}
                <span className="font-extrabold text-amber-400">{selectedRewardToRedeem.pointsRequired} điểm</span>{' '}
                để nhận voucher:
              </p>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 my-4 text-sm font-bold text-white">
                {selectedRewardToRedeem.title}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRewardToRedeem(null)}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-gray-300 rounded-xl text-xs font-bold transition-all"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => handleRedeemReward(selectedRewardToRedeem)}
                  disabled={redeemLoading}
                  className="flex-1 py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/25"
                >
                  {redeemLoading ? 'Đang đổi...' : 'Đồng ý đổi'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUCCESS REDEEMED CELEBRATION MODAL */}
      <AnimatePresence>
        {redeemSuccessVoucher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#141414] border border-amber-500/30 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-primary to-orange-500" />
              
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                <Sparkles className="w-8 h-8" />
              </div>

              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400 block mb-1">
                CHÚC MỪNG BẠN!
              </span>
              <h3 className="text-2xl font-black text-white">Đổi voucher thành công</h3>
              <p className="text-xs text-gray-400 mt-1">{redeemSuccessVoucher.title}</p>

              {/* Coupon Box */}
              <div className="my-6 p-4 bg-black/60 border-2 border-dashed border-amber-500/40 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-gray-400 uppercase tracking-widest block font-bold text-left">MÃ KHUYẾN MÃI</span>
                  <span className="font-mono text-xl font-black text-amber-400 tracking-wider">
                    {redeemSuccessVoucher.code}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCode(redeemSuccessVoucher.code)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  {copiedCode === redeemSuccessVoucher.code ? (
                    <>
                      <Check className="w-4 h-4" /> Đã chép
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Sao chép
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-gray-400 mb-6">
                Mã đã được lưu vào ví "Mã ưu đãi của tôi". Hạn dùng đến ngày{' '}
                <span className="text-white font-bold">
                  {redeemSuccessVoucher.expiresAt ? new Date(redeemSuccessVoucher.expiresAt).toLocaleDateString('vi-VN') : '30 ngày'}
                </span>.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRedeemSuccessVoucher(null);
                    setMemberSubTab('my_vouchers');
                  }}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-gray-200 rounded-xl text-xs font-bold transition-all"
                >
                  Xem ví voucher
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRedeemSuccessVoucher(null);
                    navigate('/movies');
                  }}
                  className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/25"
                >
                  Đặt vé ngay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
