import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clapperboard, Search, User, Menu, X, LogOut, Settings, Ticket, ChevronDown, Bell, Lock, Award, CheckCheck, Film, Clock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:5000/api';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const fetchNotifications = async () => {
    if (!user?.token) return;
    try {
      const res = await fetch(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
        const unread = (Array.isArray(data) ? data : []).filter(n => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 20000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  const handleMarkAsRead = async (notif) => {
    try {
      if (!notif.isRead) {
        await fetch(`${API_URL}/notifications/${notif.id}/read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setIsNotificationsOpen(false);
      if (notif.link) {
        navigate(notif.link);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const formatNotificationTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Trang chủ', path: '/' },
    { name: 'Phim', path: '/movies' },
    { name: 'Rạp phim', path: '/cinemas' },
    { name: 'Tin tức', path: '/news' },
  ];

  return (
    <nav className={`fixed w-full z-50 transition-all duration-500 ${isScrolled ? 'bg-background/90 backdrop-blur-md shadow-lg border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
      <div className="container mx-auto px-4 md:px-8 flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-primary p-2 rounded-lg group-hover:shadow-[0_0_15px_rgba(229,9,20,0.8)] transition-all duration-300">
            <Clapperboard className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-display font-bold tracking-wider">
            Cinema<span className="text-primary">Hub</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <div className="flex gap-6">
            {navLinks.map((link, idx) => (
              <Link key={idx} to={link.path} className="text-gray-300 hover:text-white font-medium transition-colors hover:scale-105 transform">
                {link.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4 border-l border-white/20 pl-6">
            <button className="text-gray-300 hover:text-white transition-colors">
              <Search className="w-5 h-5" />
            </button>
            {user ? (
              <div className="flex items-center gap-3">
                {/* Notifications Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsNotificationsOpen(!isNotificationsOpen);
                      setIsProfileOpen(false);
                      if (!isNotificationsOpen) fetchNotifications();
                    }}
                    className="relative flex items-center justify-center w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all duration-300"
                    title="Thông báo"
                  >
                    <Bell className="w-4 h-4 text-gray-300" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#121212] animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {isNotificationsOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 15, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[480px]"
                      >
                        <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white text-sm">Thông báo</h3>
                            {unreadCount > 0 && (
                              <span className="bg-primary/20 text-primary border border-primary/30 text-xs px-2 py-0.5 rounded-full font-semibold">
                                {unreadCount} mới
                              </span>
                            )}
                          </div>
                          {unreadCount > 0 && (
                            <button
                              onClick={handleMarkAllAsRead}
                              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                            >
                              <CheckCheck className="w-3.5 h-3.5" /> Đọc tất cả
                            </button>
                          )}
                        </div>

                        <div className="overflow-y-auto divide-y divide-white/5 flex-1">
                          {notifications.length > 0 ? (
                            notifications.map((notif) => (
                              <div
                                key={notif.id}
                                onClick={() => handleMarkAsRead(notif)}
                                className={`p-4 flex gap-3 cursor-pointer hover:bg-white/5 transition-colors relative ${
                                  !notif.isRead ? 'bg-primary/5' : ''
                                }`}
                              >
                                <div className="mt-1 shrink-0">
                                  {notif.type === 'SHOWTIME_REMINDER' ? (
                                    <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center">
                                      <Clock className="w-4 h-4" />
                                    </div>
                                  ) : notif.type === 'TICKET_OPENING' ? (
                                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                                      <Film className="w-4 h-4" />
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                                      <Sparkles className="w-4 h-4" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <h4 className={`text-xs truncate ${!notif.isRead ? 'font-bold text-white' : 'font-medium text-gray-300'}`}>
                                      {notif.title}
                                    </h4>
                                    {!notif.isRead && (
                                      <span className="w-2 h-2 rounded-full bg-primary shrink-0"></span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                                    {notif.message}
                                  </p>
                                  <span className="text-[10px] text-gray-500 mt-1.5 block">
                                    {formatNotificationTime(notif.createdAt)}
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-10 px-4 flex flex-col items-center justify-center text-center">
                              <Bell className="w-8 h-8 text-gray-600 mb-2" />
                              <p className="text-sm font-medium text-gray-400">Bạn chưa có thông báo nào</p>
                              <p className="text-xs text-gray-600 mt-1">Thông báo lịch chiếu và vé mới sẽ hiển thị tại đây.</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* User Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsProfileOpen(!isProfileOpen);
                      setIsNotificationsOpen(false);
                    }}
                    className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-2 py-1.5 pr-4 rounded-full border border-white/10 transition-all duration-300"
                  >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-orange-500 flex items-center justify-center shadow-lg text-white font-bold">
                    {(user?.name || user?.username || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium hidden lg:block">{user?.name || user?.username || user?.email}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-3 w-56 bg-surface/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl py-2 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-white/5 mb-1">
                        <p className="text-sm text-gray-400">Đăng nhập với tư cách</p>
                        <p className="text-sm font-bold text-white truncate">{user?.email}</p>
                      </div>

                      {!['Admin', 'Manager', 'Staff'].includes(user?.role) && (
                        <>
                          <Link to="/profile" state={{ tab: 'info' }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                            <Settings className="w-4 h-4" /> Tài khoản của tôi
                          </Link>
                          <Link to="/profile" state={{ tab: 'booking' }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                            <Ticket className="w-4 h-4" /> Lịch sử đặt vé
                          </Link>
                        </>
                      )}

                      {['Admin', 'Manager', 'Staff'].includes(user.role) && (
                        <>
                          <Link to="/profile" state={{ tab: 'password' }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                            <Lock className="w-4 h-4" /> Đổi mật khẩu
                          </Link>
                          <Link to="/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                            <User className="w-4 h-4" /> Quản trị hệ thống
                          </Link>
                        </>
                      )}

                      <div className="border-t border-white/5 mt-1 pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-primary hover:bg-primary/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> Đăng xuất
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            ) : (
              <Link to="/login" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full border border-white/10 transition-all duration-300">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Đăng nhập</span>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 w-full bg-surface/95 backdrop-blur-xl border-b border-white/10 md:hidden flex flex-col p-4 shadow-2xl"
          >
            {navLinks.map((link, idx) => (
              <Link key={idx} to={link.path} className="py-3 px-4 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg">
                {link.name}
              </Link>
            ))}
            <div className="border-t border-white/10 mt-2 pt-4 flex flex-col gap-4 px-4">
              <button className="w-full btn-secondary text-sm">Tìm kiếm</button>
              {user ? (
                <div className="flex items-center justify-between w-full bg-white/5 p-3 rounded-lg border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50 text-primary font-bold">
                      {(user?.name || user?.username || user?.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{user?.name || user?.username || user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-md relative" title="Thông báo">
                      <Bell className="w-4 h-4" />
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full"></span>
                    </button>
                    {user.role === 'Admin' && (
                      <Link to="/admin/users" onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-md">
                        <Settings className="w-4 h-4" />
                      </Link>
                    )}
                    <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-md">
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <Link to="/login" className="w-full btn-primary text-sm text-center">Đăng nhập</Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
