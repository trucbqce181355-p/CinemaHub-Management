import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, AlertCircle, X, Calendar, Clock, Film, Eye, EyeOff, Sparkles, Info, CheckCircle2, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = 'http://localhost:5000/api';



export default function ShowtimeManagement() {
  const { user } = useAuth();
  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Detail Modal state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailShowtime, setDetailShowtime] = useState(null);

  // Auto-generate state
  const [isAutoGenModalOpen, setIsAutoGenModalOpen] = useState(false);
  const [autoGenRooms, setAutoGenRooms] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoGenError, setAutoGenError] = useState('');
  const [autoGenSuccess, setAutoGenSuccess] = useState('');
  const [autoGenData, setAutoGenData] = useState({
    movieId: '',
    cinemaId: '',
    roomId: '',
    startDate: '',
    endDate: '',
    dailyStartTime: '09:00',
    dailyEndTime: '23:00',
    breakMinutes: 15,
    basePrice: ''
  });

  // Filter states
  const [filterMovie, setFilterMovie] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isReminding, setIsReminding] = useState(false);
  
  // Custom Movie Dropdown state
  const [isMovieSearchOpen, setIsMovieSearchOpen] = useState(false);
  const [movieSearchTerm, setMovieSearchTerm] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    id: '',
    movieId: '',
    cinemaId: '',
    roomId: '',
    startTime: '',
    basePrice: '',
    status: 'ACTIVE'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [showtimesRes, moviesRes, cinemasRes] = await Promise.all([
        fetch(`${API_URL}/showtimes?includePast=true&allStatuses=true`, { headers: { Authorization: `Bearer ${user.token}` } }),
        fetch(`${API_URL}/movies`, { headers: { Authorization: `Bearer ${user.token}` } }),
        fetch(`${API_URL}/cinemas`, { headers: { Authorization: `Bearer ${user.token}` } })
      ]);
      if (!showtimesRes.ok || !moviesRes.ok || !cinemasRes.ok) throw new Error("Unauthorized");
      const showtimesData = await showtimesRes.json();
      const moviesData = await moviesRes.json();
      const cinemasData = await cinemasRes.json();
      const cinemasArray = Array.isArray(cinemasData) ? cinemasData : (cinemasData.content || []);
      
      setShowtimes(Array.isArray(showtimesData) ? showtimesData : (showtimesData.content || []));
      setMovies(Array.isArray(moviesData) ? moviesData : (moviesData.content || []));
      setCinemas(cinemasArray);

      // Fetch all rooms to display names instead of ObjectIDs
      let allRoomsTemp = [];
      await Promise.all(cinemasArray.map(async (c) => {
        try {
          const rRes = await fetch(`${API_URL}/cinemas/${c.id || c._id}/rooms`, { headers: { Authorization: `Bearer ${user.token}` } });
          if (rRes.ok) {
            const rData = await rRes.json();
            allRoomsTemp = [...allRoomsTemp, ...(Array.isArray(rData) ? rData : [])];
          }
        } catch (e) {}
      }));
      setAllRooms(allRoomsTemp);
    } catch (err) {
      setError('Lỗi kết nối máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  const getMovieTitle = (id) => {
    const movie = movies.find(m => m.id === id || m._id === id);
    return movie ? movie.title : 'Phim không tồn tại';
  };

  const getCinemaName = (id) => {
    const cinema = cinemas.find(c => c.id === id || c._id === id);
    return cinema ? cinema.name : 'Rạp không tồn tại';
  };

  const getRoomName = (id) => {
    const room = allRooms.find(r => r.id === id || r._id === id);
    return room ? room.name : id; // Fallback to id if not found
  };

  const fetchRoomsForCinema = async (cinemaId) => {
    if (!cinemaId) {
      setAvailableRooms([]);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/cinemas/${cinemaId}/rooms`, { headers: { Authorization: `Bearer ${user.token}` } });
      if (res.ok) {
        const data = await res.json();
        setAvailableRooms(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch rooms', err);
    }
  };

  const handleOpenModal = async (showtime = null) => {
    if (showtime) {
      setIsEditMode(true);
      await fetchRoomsForCinema(showtime.cinemaId);
      setFormData({
        id: showtime.id,
        movieId: showtime.movieId || '',
        cinemaId: showtime.cinemaId || '',
        roomId: showtime.roomId || '',
        startTime: showtime.startTime ? showtime.startTime.substring(0, 16) : '',
        basePrice: (showtime.basePrice !== undefined && showtime.basePrice !== null) ? showtime.basePrice : '',
        status: showtime.status || 'ACTIVE'
      });
    } else {
      setIsEditMode(false);
      setAvailableRooms([]);
      const firstMovieId = movies[0]?.id || movies[0]?._id || '';
      const firstCinemaId = cinemas[0]?.id || cinemas[0]?._id || '';
      if (firstCinemaId) {
        fetchRoomsForCinema(firstCinemaId);
      }
      setFormData({
        id: '',
        movieId: firstMovieId,
        cinemaId: firstCinemaId,
        roomId: '',
        startTime: '',
        basePrice: '',
        status: 'ACTIVE'
      });
    }
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError('');
  };

  const handleOpenDetail = (st) => {
    setDetailShowtime(st);
    setIsDetailModalOpen(true);
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const offset = tomorrow.getTimezoneOffset() * 60000;
    const localTomorrow = new Date(tomorrow.getTime() - offset);
    return localTomorrow.toISOString().slice(0, 10);
  };

  const handleOpenAutoGenModal = () => {
    setAutoGenError('');
    setAutoGenSuccess('');
    setAutoGenRooms([]);
    const tomorrowStr = getTomorrowDate();
    const firstCinemaId = cinemas[0]?.id || cinemas[0]?._id || '';
    if (firstCinemaId) {
      fetchRoomsForAutoGen(firstCinemaId);
    }
    setAutoGenData({
      movieId: movies[0]?.id || movies[0]?._id || '',
      cinemaId: firstCinemaId,
      roomId: '',
      startDate: tomorrowStr,
      endDate: tomorrowStr,
      dailyStartTime: '09:00',
      dailyEndTime: '23:00',
      breakMinutes: 15,
      basePrice: ''
    });
    setIsAutoGenModalOpen(true);
  };

  const fetchRoomsForAutoGen = async (cinemaId) => {
    if (!cinemaId) {
      setAutoGenRooms([]);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/cinemas/${cinemaId}/rooms`, { headers: { Authorization: `Bearer ${user.token}` } });
      if (res.ok) {
        const data = await res.json();
        const rooms = Array.isArray(data) ? data : [];
        setAutoGenRooms(rooms);
        if (rooms.length > 0) {
          setAutoGenData(prev => ({ ...prev, roomId: rooms[0].id || rooms[0]._id }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAutoGenSubmit = async (e) => {
    e.preventDefault();
    setAutoGenError('');
    setAutoGenSuccess('');
    setIsGenerating(true);
    
    const tomorrowStr = getTomorrowDate();
    if (autoGenData.startDate < tomorrowStr) {
      setAutoGenError('Chỉ được tạo suất chiếu từ ngày hôm sau (trước ít nhất 24 giờ). Vui lòng chọn từ ngày mai trở đi.');
      setIsGenerating(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/showtimes/auto-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          movieId: autoGenData.movieId,
          cinemaId: autoGenData.cinemaId,
          roomId: autoGenData.roomId,
          startDate: autoGenData.startDate,
          endDate: autoGenData.endDate,
          dailyStartTime: autoGenData.dailyStartTime,
          dailyEndTime: autoGenData.dailyEndTime,
          breakMinutes: Number(autoGenData.breakMinutes) || 15,
          basePrice: autoGenData.basePrice !== '' ? Math.max(0, Number(autoGenData.basePrice)) : null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Lỗi khi tạo suất chiếu tự động');
      }

      setAutoGenSuccess(data.message || `Đã tạo thành công ${data.count} suất chiếu!`);
      await fetchData();
      setTimeout(() => {
        setIsAutoGenModalOpen(false);
      }, 1500);
    } catch (err) {
      setAutoGenError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = isEditMode ? `${API_URL}/showtimes/${formData.id}` : `${API_URL}/showtimes`;
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token || ''}`
        },
        body: JSON.stringify({
          movieId: formData.movieId,
          movieTitle: getMovieTitle(formData.movieId),
          cinemaId: formData.cinemaId,
          cinemaName: getCinemaName(formData.cinemaId),
          roomId: formData.roomId,
          roomName: getRoomName(formData.roomId),
          startTime: formData.startTime,
          status: formData.status
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Thời gian chiếu bị trùng');
      }

      await fetchData();
      handleCloseModal();
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Không thể kết nối đến máy chủ. Vui lòng thử lại.' : err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa suất chiếu này?')) return;
    try {
      const res = await fetch(`${API_URL}/showtimes/${id}`, { 
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token || ''}` }
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Không thể xóa suất chiếu');
      }
      await fetchData();
    } catch (err) {
      alert(err.message === 'Failed to fetch' ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại.' : err.message);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const isDeactivating = (currentStatus === 'ACTIVE' || currentStatus === 'Active');
    const msg = isDeactivating 
        ? 'Bạn có chắc chắn muốn hủy suất chiếu này không?' 
        : 'Bạn có chắc chắn muốn mở lại suất chiếu này không?';
        
    if (!window.confirm(msg)) return;

    try {
      const newStatus = isDeactivating ? 'DISABLED' : 'ACTIVE';
      const res = await fetch(`${API_URL}/showtimes/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token || ''}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Không thể thay đổi trạng thái');
      }
      await fetchData();
    } catch (err) {
      alert(err.message === 'Failed to fetch' ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại.' : err.message);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    return date.toLocaleString('vi-VN', { 
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
    });
  };

  const handleTriggerReminders = async () => {
    setIsReminding(true);
    try {
      const res = await fetch(`${API_URL}/notifications/trigger-reminders`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user?.token || ''}` }
      });
      const data = await res.json();
      alert(data.message || 'Đã gửi lời nhắc thành công');
    } catch (err) {
      alert('Không thể gửi lời nhắc: ' + err.message);
    } finally {
      setIsReminding(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  // Filter for Search Functionality
  const filteredShowtimes = showtimes.filter(st => {
    const matchMovie = !filterMovie || getMovieTitle(st.movieId).toLowerCase().includes(filterMovie.toLowerCase());
    const matchRoom = !filterRoom || st.roomId === filterRoom;
    const matchStatus = !filterStatus || st.status === filterStatus;
    const matchDate = !filterDate || (st.startTime && st.startTime.startsWith(filterDate));
    return matchMovie && matchRoom && matchStatus && matchDate;
  });

  if (isLoading) return <div className="text-white p-6">Đang tải dữ liệu...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Quản lý Suất chiếu</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleTriggerReminders}
            disabled={isReminding}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-200 px-4 py-2 rounded-xl transition-all border border-white/10 font-medium text-sm disabled:opacity-50"
            title="Quét và gửi lời nhắc cho các suất chiếu diễn ra trong 2 giờ tới"
          >
            <Bell className="w-4 h-4 text-amber-400" /> {isReminding ? 'Đang gửi...' : 'Gửi lời nhắc suất chiếu'}
          </button>
          <button 
            onClick={() => handleOpenAutoGenModal()}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_25px_rgba(147,51,234,0.5)] font-medium text-sm"
          >
            <Sparkles className="w-4 h-4" /> Tự động tạo suất chiếu
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-primary hover:bg-red-700 text-white px-4 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(229,9,20,0.3)] hover:shadow-[0_0_25px_rgba(229,9,20,0.5)] font-medium text-sm"
          >
            <Plus className="w-4 h-4" /> Thêm Suất chiếu
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-white/10 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tên phim */}
        <div className="relative">
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Tên phim</label>
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
             <input 
               type="text" 
               placeholder="Tìm tên phim..."
               value={filterMovie}
               onChange={(e) => setFilterMovie(e.target.value)}
               className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-2 pl-9 pr-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
             />
          </div>
        </div>

        {/* Phòng chiếu */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Phòng chiếu</label>
          <select 
            value={filterRoom}
            onChange={(e) => setFilterRoom(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
          >
            <option value="">Tất cả phòng</option>
            {allRooms.map(r => <option key={r.id || r._id} value={r.id || r._id}>{r.name} ({getCinemaName(r.cinemaId)})</option>)}
          </select>
        </div>

        {/* Ngày chiếu */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Ngày chiếu</label>
          <input 
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-primary transition-colors text-sm [color-scheme:dark]"
          />
        </div>

        {/* Trạng thái */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Trạng thái</label>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="DISABLED">Đã hủy</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-[#1a1a1a] text-xs uppercase text-gray-400 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-medium">Phim</th>
                <th className="px-6 py-4 font-medium">Cụm rạp</th>
                <th className="px-6 py-4 font-medium">Phòng chiếu</th>
                <th className="px-6 py-4 font-medium">Thời gian bắt đầu</th>
                <th className="px-6 py-4 font-medium">Thời gian kết thúc</th>
                <th className="px-6 py-4 font-medium">Trạng thái</th>
                <th className="px-6 py-4 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredShowtimes.length > 0 ? filteredShowtimes.map((st) => (
                <tr key={st.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Film className="w-5 h-5 text-gray-500" />
                        <span className="font-medium text-white">{getMovieTitle(st.movieId)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-blue-400">
                    {getCinemaName(st.cinemaId)}
                  </td>
                  <td className="px-6 py-4 font-medium text-green-500">
                    {getRoomName(st.roomId)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {formatTime(st.startTime)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        {formatTime(st.endTime)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span 
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                            st.status === 'ACTIVE' 
                                ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                    >
                        {st.status === 'ACTIVE' ? 'Hoạt động' : 'Đã hủy'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3 transition-opacity">
                      <button onClick={() => handleOpenDetail(st)} className="p-2 text-purple-400 hover:bg-purple-400/20 rounded-lg transition-colors" title="Xem chi tiết">
                        <Info className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleOpenModal(st)} className="p-2 text-blue-400 hover:bg-blue-400/20 rounded-lg transition-colors" title="Sửa">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(st.id, st.status)} 
                        className={`p-2 rounded-lg transition-colors ${
                          st.status === 'ACTIVE' ? 'text-orange-400 hover:bg-orange-400/20' : 'text-green-400 hover:bg-green-400/20'
                        }`} 
                        title={st.status === 'ACTIVE' ? 'Hủy suất chiếu' : 'Mở lại suất chiếu'}
                      >
                        {st.status === 'ACTIVE' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDelete(st.id)} className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors" title="Xóa">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    Chưa có suất chiếu nào được tạo hoặc tìm thấy.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm / Cập nhật Suất chiếu */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all duration-300">
          <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-lg rounded-3xl p-6 relative shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {isEditMode ? 'Cập nhật Suất chiếu' : 'Thêm Suất chiếu mới'}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {isEditMode ? 'Chỉnh sửa thông tin phòng chiếu và thời gian' : 'Tạo suất chiếu mới theo phim, rạp và phòng chiếu'}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Chọn phim áp dụng</label>
                <select 
                  required
                  value={formData.movieId}
                  onChange={e => setFormData({...formData, movieId: e.target.value})}
                  className="w-full bg-[#242424] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary"
                >
                  <option value="" disabled>-- Chọn phim --</option>
                  {movies.map(m => (
                    <option key={m.id || m._id} value={m.id || m._id}>
                      {m.title} ({m.duration || 120} phút)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Cụm rạp</label>
                  <select 
                    required
                    value={formData.cinemaId}
                    onChange={(e) => {
                      const newCinemaId = e.target.value;
                      setFormData({...formData, cinemaId: newCinemaId, roomId: ''});
                      fetchRoomsForCinema(newCinemaId);
                    }}
                    className="w-full bg-[#242424] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="" disabled>-- Chọn rạp --</option>
                    {cinemas.map(c => (
                      <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Phòng chiếu</label>
                  <select 
                    required
                    value={formData.roomId}
                    onChange={e => setFormData({...formData, roomId: e.target.value})}
                    className="w-full bg-[#242424] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                    disabled={!formData.cinemaId}
                  >
                    <option value="" disabled>-- Chọn phòng --</option>
                    {availableRooms.map(r => (
                      <option key={r.id || r._id} value={r.id || r._id}>{r.name} ({r.screenType})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Thời gian bắt đầu</label>
                  <input 
                    type="datetime-local" 
                    required
                    min={getMinDateTime()}
                    value={formData.startTime}
                    onChange={e => setFormData({...formData, startTime: e.target.value})}
                    className="w-full bg-[#242424] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-primary [color-scheme:dark]"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Thời gian kết thúc (Tự động)</label>
                  <input 
                    type="text" 
                    disabled
                    value={(() => {
                      if (!formData.startTime || !formData.movieId) return '---';
                      const m = movies.find(x => x.id === formData.movieId || x._id === formData.movieId);
                      const duration = m?.duration || 120;
                      const date = new Date(formData.startTime);
                      date.setMinutes(date.getMinutes() + duration);
                      return date.toLocaleString('vi-VN', { 
                          year: 'numeric', month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit', hour12: false
                      });
                    })()}
                    className="w-full bg-[#242424]/50 border border-white/5 rounded-xl px-3 py-2 text-gray-500 text-sm cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex gap-3">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium border border-white/10 hover:bg-white/5 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium bg-primary hover:bg-red-700 text-white transition-all shadow-[0_0_15px_rgba(229,9,20,0.3)]"
                >
                  {isEditMode ? 'Cập nhật' : 'Lưu suất chiếu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL XEM CHI TIẾT SUẤT CHIẾU */}
      {isDetailModalOpen && detailShowtime && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all">
          <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-lg rounded-3xl p-6 relative shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Chi tiết Suất chiếu</h2>
                  <p className="text-xs text-gray-400">ID: {detailShowtime.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-400">Tên phim:</span>
                  <span className="text-sm font-semibold text-white text-right max-w-[65%]">
                    {detailShowtime.movieTitle || getMovieTitle(detailShowtime.movieId)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Cụm rạp:</span>
                  <span className="text-sm font-medium text-blue-400">
                    {detailShowtime.cinemaName || getCinemaName(detailShowtime.cinemaId)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Phòng chiếu:</span>
                  <span className="text-sm font-medium text-green-400">
                    {detailShowtime.roomName || getRoomName(detailShowtime.roomId)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Định dạng (Format):</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white">
                    {detailShowtime.format || '2D'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-xs text-gray-400 block mb-1">Thời gian bắt đầu</span>
                  <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-primary" /> {formatTime(detailShowtime.startTime)}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-xs text-gray-400 block mb-1">Thời gian kết thúc</span>
                  <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-gray-400" /> {formatTime(detailShowtime.endTime)}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex justify-between items-center">
                <div>
                  <span className="text-xs text-gray-400 block">Giá vé cơ bản</span>
                  <span className="text-base font-bold text-primary">
                    {(detailShowtime.basePrice || 90000).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block mb-1 text-right">Trạng thái</span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                    detailShowtime.status === 'ACTIVE' 
                      ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {detailShowtime.status === 'ACTIVE' ? 'Hoạt động' : 'Đã hủy'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="py-2.5 px-6 rounded-xl font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TỰ ĐỘNG TẠO SUẤT CHIẾU */}
      {isAutoGenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all">
          <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-lg rounded-3xl p-6 relative shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Tự động tạo Suất chiếu</h2>
                  <p className="text-xs text-gray-400">Chỉ tạo suất chiếu từ ngày hôm sau (trước ít nhất 24 giờ)</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAutoGenModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {autoGenError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-400 text-xs">{autoGenError}</p>
              </div>
            )}

            {autoGenSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                <p className="text-green-300 text-xs font-semibold">{autoGenSuccess}</p>
              </div>
            )}

            <form onSubmit={handleAutoGenSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Chọn phim áp dụng</label>
                <select 
                  required
                  value={autoGenData.movieId}
                  onChange={e => setAutoGenData({...autoGenData, movieId: e.target.value})}
                  className="w-full bg-[#242424] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="" disabled>-- Chọn phim --</option>
                  {movies.map(m => (
                    <option key={m.id || m._id} value={m.id || m._id}>
                      {m.title} ({m.duration || 120} phút)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Cụm rạp</label>
                  <select 
                    required
                    value={autoGenData.cinemaId}
                    onChange={e => {
                      const cid = e.target.value;
                      setAutoGenData({...autoGenData, cinemaId: cid, roomId: ''});
                      fetchRoomsForAutoGen(cid);
                    }}
                    className="w-full bg-[#242424] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="" disabled>-- Chọn rạp --</option>
                    {cinemas.map(c => (
                      <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Phòng chiếu</label>
                  <select 
                    required
                    disabled={!autoGenData.cinemaId}
                    value={autoGenData.roomId}
                    onChange={e => setAutoGenData({...autoGenData, roomId: e.target.value})}
                    className="w-full bg-[#242424] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50"
                  >
                    <option value="" disabled>-- Chọn phòng --</option>
                    {autoGenRooms.map(r => (
                      <option key={r.id || r._id} value={r.id || r._id}>{r.name} ({r.screenType})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Từ ngày (Từ ngày mai)</label>
                  <input 
                    type="date"
                    required
                    min={getTomorrowDate()}
                    value={autoGenData.startDate}
                    onChange={e => {
                      const newStart = e.target.value;
                      setAutoGenData(prev => ({
                        ...prev,
                        startDate: newStart,
                        endDate: prev.endDate < newStart ? newStart : prev.endDate
                      }));
                    }}
                    className="w-full bg-[#242424] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Đến ngày</label>
                  <input 
                    type="date"
                    required
                    min={autoGenData.startDate || getTomorrowDate()}
                    value={autoGenData.endDate}
                    onChange={e => setAutoGenData({...autoGenData, endDate: e.target.value})}
                    className="w-full bg-[#242424] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Giờ mở cửa</label>
                  <input 
                    type="time"
                    required
                    value={autoGenData.dailyStartTime}
                    onChange={e => setAutoGenData({...autoGenData, dailyStartTime: e.target.value})}
                    className="w-full bg-[#242424] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Giờ đóng cửa</label>
                  <input 
                    type="time"
                    required
                    value={autoGenData.dailyEndTime}
                    onChange={e => setAutoGenData({...autoGenData, dailyEndTime: e.target.value})}
                    className="w-full bg-[#242424] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Nghỉ (phút)</label>
                  <input 
                    type="number"
                    min="10"
                    max="60"
                    required
                    value={autoGenData.breakMinutes}
                    onChange={e => setAutoGenData({...autoGenData, breakMinutes: e.target.value})}
                    className="w-full bg-[#242424] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsAutoGenModalOpen(false)}
                  disabled={isGenerating}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium border border-white/10 hover:bg-white/5 transition-colors"
                >
                  Đóng
                </button>
                <button 
                  type="submit" 
                  disabled={isGenerating}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] disabled:opacity-50"
                >
                  {isGenerating ? 'Đang tạo suất chiếu...' : 'Bắt đầu tạo tự động'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
