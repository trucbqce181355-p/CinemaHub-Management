import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, Shield, Save, Phone, Calendar, Ticket, Heart, Bell, Star, LogOut, Clock, MapPin, Film } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'info'); // info, password, booking, favorites, notifications, membership

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
  const [passMessage, setPassMessage] = useState({ text: '', type: '' });
  const [passLoading, setPassLoading] = useState(false);

  // Handle tab change from navigation state
  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state]);

  // Fetch full user profile on load to get phone and DOB
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    const fetchProfile = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/users/profile', {
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
  }, [user, navigate]);

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    setInfoMessage({ text: '', type: '' });
    setInfoLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/users/profile', {
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
      const res = await fetch('http://localhost:5000/api/users/change-password', {
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

  const menuItems = [
    { id: 'info', icon: <User className="w-5 h-5" />, label: 'Personal Info' },
    { id: 'password', icon: <Lock className="w-5 h-5 text-orange-400" />, label: 'Change Pass' },
    { id: 'booking', icon: <Ticket className="w-5 h-5 text-blue-400" />, label: 'Booking Hist.' },
    { id: 'favorites', icon: <Heart className="w-5 h-5 text-pink-500" />, label: 'Favorites' },
    { id: 'notifications', icon: <Bell className="w-5 h-5 text-yellow-400" />, label: 'Notifications' },
    { id: 'membership', icon: <Star className="w-5 h-5 text-yellow-500" />, label: 'Membership' },
  ];

  const mockBookings = [
    {
      id: "TKT-892374",
      movie: "Mai",
      date: "25 Tháng 10, 2026",
      time: "19:30",
      cinema: "CinemaHub Landmark 81",
      room: "Rạp 3 (IMAX)",
      seats: ["H9", "H10"],
      total: "250,000đ",
      status: "Sắp chiếu",
      color: "bg-blue-500"
    },
    {
      id: "TKT-239102",
      movie: "Lật Mặt 7: Một Điều Ước",
      date: "12 Tháng 08, 2026",
      time: "20:00",
      cinema: "CinemaHub Aeon Mall Tân Phú",
      room: "Rạp 5",
      seats: ["J5", "J6", "J7"],
      total: "285,000đ",
      status: "Đã hoàn thành",
      color: "bg-green-500"
    },
    {
      id: "TKT-581932",
      movie: "Godzilla x Kong: Đế Chế Mới",
      date: "15 Tháng 05, 2026",
      time: "14:15",
      cinema: "CinemaHub Vivo City",
      room: "Rạp 1",
      seats: ["E12"],
      total: "95,000đ",
      status: "Đã hoàn thành",
      color: "bg-gray-500"
    }
  ];

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
                        type="password" 
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        className="w-full bg-background/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mật khẩu mới</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                        <Shield className="w-5 h-5" />
                      </div>
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full bg-background/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
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
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full bg-background/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
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
                <h2 className="text-2xl font-bold mb-8 pb-4 border-b border-white/10 uppercase tracking-wider text-gray-200">
                  Lịch sử đặt vé
                </h2>

                <div className="space-y-6">
                  {mockBookings.map((ticket, index) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      key={ticket.id}
                      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col md:flex-row hover:bg-white/10 transition-colors"
                    >
                      {/* Ticket Left Edge - Status indicator */}
                      <div className={`w-full md:w-2 ${ticket.status === 'Sắp chiếu' ? 'bg-primary' : 'bg-gray-600'}`}></div>
                      
                      <div className="p-6 flex-grow flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold text-white">{ticket.movie}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${ticket.status === 'Sắp chiếu' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}>
                              {ticket.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-6">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span>{ticket.date}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span>{ticket.time}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <MapPin className="w-4 h-4 text-gray-500" />
                              <span>{ticket.cinema}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Film className="w-4 h-4 text-gray-500" />
                              <span>{ticket.room}</span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-dashed border-white/20 pt-4 flex justify-between items-center">
                          <div>
                            <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Ghế của bạn</span>
                            <div className="flex gap-2">
                              {ticket.seats.map(seat => (
                                <span key={seat} className="bg-white/10 text-white font-mono text-sm px-2 py-1 rounded">{seat}</span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Mã vé / Tổng tiền</span>
                            <div className="flex flex-col items-end">
                              <span className="font-mono text-gray-400 text-xs mb-1">{ticket.id}</span>
                              <span className="text-lg font-bold text-primary">{ticket.total}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Ticket Right Edge - Tear off pattern (Desktop only) */}
                      <div className="hidden md:flex flex-col justify-between border-l border-dashed border-white/20 w-16 bg-white/[0.02] items-center py-6">
                        <div className="w-4 h-4 rounded-full bg-background -ml-2 -mt-8"></div>
                        <span className="[writing-mode:vertical-lr] text-xs font-mono tracking-[0.3em] text-gray-600 rotate-180 uppercase">
                          Admit One
                        </span>
                        <div className="w-4 h-4 rounded-full bg-background -ml-2 -mb-8"></div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* PLACEHOLDER FOR OTHER TABS */}
            {['favorites', 'notifications', 'membership'].includes(activeTab) && (
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
    </div>
  );
};

export default Profile;
