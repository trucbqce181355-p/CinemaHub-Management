import { useState, useEffect } from 'react';
import { Bell, Clock, Film, Sparkles, CheckCheck, Check, Search, RefreshCw, Send, AlertCircle, Eye, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = 'http://localhost:5000/api';

const NotificationManagement = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // UC-98 State: Send Automated Showtime Reminder
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [reminderResult, setReminderResult] = useState(null);

  // UC-99 State: Notify Ticket Opening for Coming-Soon Movies
  const [selectedMovieForOpening, setSelectedMovieForOpening] = useState('');
  const [isSendingOpening, setIsSendingOpening] = useState(false);
  const [openingResult, setOpeningResult] = useState(null);

  // UC-96 & 97 State: View Details Modal
  const [selectedNotifDetail, setSelectedNotifDetail] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!user?.token) return;
    try {
      setIsLoading(true);
      const [notifsRes, moviesRes] = await Promise.all([
        fetch(`${API_URL}/notifications`, {
          headers: { Authorization: `Bearer ${user.token}` }
        }),
        fetch(`${API_URL}/movies`, {
          headers: { Authorization: `Bearer ${user.token}` }
        })
      ]);

      if (notifsRes.ok) {
        const notifsData = await notifsRes.json();
        setNotifications(Array.isArray(notifsData) ? notifsData : []);
      }
      if (moviesRes.ok) {
        const moviesData = await moviesRes.json();
        const movieList = Array.isArray(moviesData) ? moviesData : [];
        setMovies(movieList);
        // Default select first coming-soon or active movie
        const comingSoon = movieList.find(m => m.status === 'COMING_SOON') || movieList[0];
        if (comingSoon) {
          setSelectedMovieForOpening(comingSoon.id || comingSoon._id);
        }
      }
    } catch (e) {
      console.error('Lỗi tải dữ liệu thông báo:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // UC-98: Trigger Automated Showtime Reminders
  const handleTriggerReminders = async () => {
    try {
      setIsSendingReminders(true);
      setReminderResult(null);
      const res = await fetch(`${API_URL}/notifications/trigger-reminders`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi kích hoạt lời nhắc');
      setReminderResult({
        success: true,
        message: data.message || `Đã gửi ${data.sentCount || 0} lời nhắc suất chiếu thành công!`,
        sentCount: data.sentCount || 0
      });
      await fetchData();
    } catch (err) {
      setReminderResult({
        success: false,
        message: err.message
      });
    } finally {
      setIsSendingReminders(false);
    }
  };

  // UC-99: Notify Ticket Opening for Coming-Soon Movie
  const handleNotifyTicketOpening = async () => {
    if (!selectedMovieForOpening) {
      alert('Vui lòng chọn một bộ phim để gửi thông báo mở bán vé');
      return;
    }
    const movie = movies.find(m => (m.id || m._id) === selectedMovieForOpening);
    if (!movie) return;

    if (!window.confirm(`Xác nhận gửi thông báo Mở Bán Vé cho phim "${movie.title}" tới tất cả khán giả?`)) {
      return;
    }

    try {
      setIsSendingOpening(true);
      setOpeningResult(null);
      const res = await fetch(`${API_URL}/notifications/notify-ticket-opening/${selectedMovieForOpening}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Lỗi khi gửi thông báo');
      setOpeningResult({
        success: true,
        message: `Đã gửi thông báo mở bán vé cho phim "${movie.title}" thành công tới tất cả khán giả!`
      });
      await fetchData();
    } catch (err) {
      setOpeningResult({
        success: false,
        message: err.message
      });
    } finally {
      setIsSendingOpening(false);
    }
  };

  // UC-97: Mark Single Notification as Read
  const handleMarkAsRead = async (notif) => {
    if (notif.isRead) return;
    try {
      await fetch(`${API_URL}/notifications/${notif.id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      if (selectedNotifDetail?.id === notif.id) {
        setSelectedNotifDetail(prev => prev ? { ...prev, isRead: true } : prev);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // UC-97: Mark All as Read
  const handleMarkAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const matchType = filterType === 'ALL' || n.type === filterType;
    const matchSearch = searchTerm === '' || 
      n.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.message?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchType && matchSearch;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white flex items-center gap-3">
            <Bell className="w-8 h-8 text-primary" />
            Trung tâm Thông báo & Tự động hóa
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Quản lý lời nhắc suất chiếu tự động (UC-98), thông báo mở bán vé (UC-99), và theo dõi thông báo in-app (UC-96, UC-97)
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl border border-white/10 text-xs font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Làm mới dữ liệu
        </button>
      </div>

      {/* Grid 2 Card Chức năng Tự Động */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD 1: Send Automated Showtime Reminder (UC-98) */}
        <div className="glass-panel p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  UC-98: Automated Job
                </span>
                <h3 className="text-lg font-bold text-white mt-1">Gửi Nhắc Nhở Suất Chiếu Tự Động</h3>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed mb-4">
              Hệ thống quét các suất chiếu sắp diễn ra trong vòng <strong>2 giờ tới</strong>. Tự động gửi thông báo đến các khán giả đã mua vé thành công, nhắc nhở có mặt trước 15 phút.
            </p>

            <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-xs text-gray-400 space-y-1 mb-4">
              <div className="flex justify-between">
                <span>Cơ chế kích hoạt:</span>
                <span className="text-amber-300 font-medium">Cronjob mỗi 5 phút + Kích hoạt thủ công</span>
              </div>
              <div className="flex justify-between">
                <span>Cửa sổ kiểm tra:</span>
                <span className="text-white font-medium">Trong vòng 2 giờ tới (Start &gt; now &amp;&amp; &lt; now+2h)</span>
              </div>
              <div className="flex justify-between">
                <span>Chống spam:</span>
                <span className="text-emerald-400 font-medium">Chỉ gửi 1 lần / suất chiếu / khách hàng</span>
              </div>
            </div>

            {reminderResult && (
              <div className={`p-3 rounded-xl border text-xs mb-4 ${
                reminderResult.success 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}>
                {reminderResult.message}
              </div>
            )}
          </div>

          <button
            onClick={handleTriggerReminders}
            disabled={isSendingReminders}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            <Clock className={`w-4 h-4 ${isSendingReminders ? 'animate-spin' : ''}`} />
            {isSendingReminders ? 'Đang quét và gửi lời nhắc...' : 'Kích hoạt Quét & Gửi Lời Nhắc Ngay'}
          </button>
        </div>

        {/* CARD 2: Notify Ticket Opening for Coming-Soon Movies (UC-99) */}
        <div className="glass-panel p-6 rounded-2xl border border-purple-500/20 bg-purple-500/5 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                  UC-99: Broadcast Notification
                </span>
                <h3 className="text-lg font-bold text-white mt-1">Thông Báo Mở Bán Vé Phim Mới</h3>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed mb-4">
              Gửi thông báo broadcast tức thì tới <strong>tất cả tài khoản khán giả</strong> khi bộ phim sắp chiếu chính thức mở bán vé trên hệ thống CinemaHub.
            </p>

            <div className="space-y-2 mb-4">
              <label className="block text-xs font-medium text-gray-300">
                Chọn phim cần thông báo mở bán vé:
              </label>
              <select
                value={selectedMovieForOpening}
                onChange={(e) => setSelectedMovieForOpening(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                {movies.map((m) => (
                  <option key={m.id || m._id} value={m.id || m._id} className="bg-[#181818]">
                    {m.title} ({m.status === 'COMING_SOON' ? 'Sắp chiếu' : m.status === 'ACTIVE' ? 'Đang chiếu' : 'Đã ẩn'})
                  </option>
                ))}
              </select>
            </div>

            {openingResult && (
              <div className={`p-3 rounded-xl border text-xs mb-4 ${
                openingResult.success 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}>
                {openingResult.message}
              </div>
            )}
          </div>

          <button
            onClick={handleNotifyTicketOpening}
            disabled={isSendingOpening || !selectedMovieForOpening}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50"
          >
            <Send className={`w-4 h-4 ${isSendingOpening ? 'animate-spin' : ''}`} />
            {isSendingOpening ? 'Đang gửi broadcast...' : 'Gửi Thông Báo Mở Bán Vé Cho Khán Giả'}
          </button>
        </div>

      </div>

      {/* CARD 3: In-App Notifications List & Audit (UC-96 & UC-97) */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Lịch sử Thông báo In-App (UC-96 &amp; UC-97)
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Tổng số {notifications.length} thông báo trong hệ thống ({unreadCount} thông báo chưa đọc)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                unreadCount > 0
                  ? 'bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30'
                  : 'bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed opacity-60'
              }`}
              title="Đánh dấu tất cả thông báo là đã đọc (Mark All as Read)"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Đánh dấu tất cả đã đọc
            </button>
          </div>
        </div>

        {/* Bộ lọc và Tìm kiếm */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề hoặc nội dung thông báo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'SHOWTIME_REMINDER', label: 'Nhắc suất chiếu' },
              { id: 'TICKET_OPENING', label: 'Mở bán vé' },
              { id: 'BOOKING', label: 'Đặt vé' },
              { id: 'SYSTEM', label: 'Hệ thống' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  filterType === tab.id
                    ? 'bg-primary text-white font-semibold'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bảng Danh Sách Thông Báo */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Loại thông báo</th>
                <th className="py-3 px-4">Tiêu đề &amp; Nội dung</th>
                <th className="py-3 px-4">Đối tượng</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notif) => (
                  <tr key={notif.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      {notif.type === 'SHOWTIME_REMINDER' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                          <Clock className="w-3 h-3" /> Nhắc suất chiếu
                        </span>
                      ) : notif.type === 'TICKET_OPENING' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <Film className="w-3 h-3" /> Mở bán vé
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <Sparkles className="w-3 h-3" /> Hệ thống
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <div className="font-semibold text-white">{notif.title}</div>
                      <div className="text-gray-400 text-[11px] line-clamp-1 mt-0.5">{notif.message}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                      {notif.userId === 'ALL' ? (
                        <span className="text-purple-300 font-semibold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                          Tất cả khán giả (Broadcast)
                        </span>
                      ) : (
                        <span className="text-gray-400">User: {notif.userId}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {!notif.isRead ? (
                        <span className="inline-flex items-center gap-1 text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          Chưa đọc
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium">
                          <CheckCheck className="w-3 h-3" /> Đã đọc
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-gray-500 text-[11px]">
                      {formatDateTime(notif.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                      {/* Xem chi tiết */}
                      <button
                        onClick={() => setSelectedNotifDetail(notif)}
                        title="Xem chi tiết thông báo (UC-96)"
                        className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Đánh dấu đã đọc */}
                      {!notif.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notif)}
                          title="Đánh dấu đã đọc (UC-97)"
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-500 text-xs">
                    Không tìm thấy thông báo nào phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Xem Chi Tiết Thông Báo (UC-96) */}
      {selectedNotifDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-white/10 w-full max-w-lg rounded-2xl p-6 relative shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                  {selectedNotifDetail.type === 'SHOWTIME_REMINDER' ? (
                    <Clock className="w-5 h-5 text-orange-400" />
                  ) : selectedNotifDetail.type === 'TICKET_OPENING' ? (
                    <Film className="w-5 h-5 text-purple-400" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-blue-400" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                    Chi tiết thông báo hệ thống (UC-96)
                  </span>
                  <h3 className="text-base font-bold text-white">{selectedNotifDetail.title}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedNotifDetail(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                {selectedNotifDetail.message}
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-white/5 rounded-xl border border-white/5 text-gray-300">
                <div>
                  <span className="text-gray-500 block mb-0.5">Người nhận:</span>
                  <span className="font-semibold text-white">{selectedNotifDetail.userId === 'ALL' ? 'Toàn bộ khán giả' : selectedNotifDetail.userId}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-0.5">Trạng thái:</span>
                  <span className={selectedNotifDetail.isRead ? 'text-emerald-400 font-semibold' : 'text-primary font-bold'}>
                    {selectedNotifDetail.isRead ? 'Đã đọc' : 'Chưa đọc'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-0.5">Thời gian gửi:</span>
                  <span>{formatDateTime(selectedNotifDetail.createdAt)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-0.5">Đường dẫn đính kèm:</span>
                  <span className="text-blue-400 font-mono text-[11px] truncate block">{selectedNotifDetail.link || 'Không có'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-white/10">
              {!selectedNotifDetail.isRead ? (
                <button
                  onClick={() => handleMarkAsRead(selectedNotifDetail)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> Đánh dấu đã đọc ngay
                </button>
              ) : (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCheck className="w-4 h-4" /> Đã được đánh dấu đã đọc
                </span>
              )}
              <button
                onClick={() => setSelectedNotifDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationManagement;
