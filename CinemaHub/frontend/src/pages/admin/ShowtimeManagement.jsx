import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, AlertCircle, X, Calendar, Clock, Film, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = 'http://localhost:8081/api';

const ROOMS = ['Room 1', 'Room 2', 'Room 3', 'Room 4', 'Room 5'];

export default function ShowtimeManagement() {
  const { user } = useAuth();
  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Filter states
  const [filterMovie, setFilterMovie] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Custom Movie Dropdown state
  const [isMovieSearchOpen, setIsMovieSearchOpen] = useState(false);
  const [movieSearchTerm, setMovieSearchTerm] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    id: '',
    movieId: '',
    roomId: ROOMS[0],
    startTime: '',
    status: 'ACTIVE'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [showtimesRes, moviesRes] = await Promise.all([
        fetch(`${API_URL}/showtimes`, { headers: { Authorization: `Bearer ${user.token}` } }),
        fetch(`${API_URL}/movies`, { headers: { Authorization: `Bearer ${user.token}` } })
      ]);
      if (!showtimesRes.ok || !moviesRes.ok) throw new Error("Unauthorized");
      const showtimesData = await showtimesRes.json();
      const moviesData = await moviesRes.json();
      
      // Kiểm tra nếu backend trả về Array thì mới set (tránh lỗi nếu lỡ trả về string/html lỗi)
      setShowtimes(Array.isArray(showtimesData) ? showtimesData : (showtimesData.content || []));
      setMovies(Array.isArray(moviesData) ? moviesData : (moviesData.content || []));
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

  const handleOpenModal = (showtime = null) => {
    if (showtime) {
      setIsEditMode(true);
      setMovieSearchTerm(getMovieTitle(showtime.movieId));
      setFormData({
        id: showtime.id,
        movieId: showtime.movieId,
        roomId: showtime.roomId,
        // Chuyển đổi định dạng LocalDateTime từ backend (vd: 2024-05-12T14:30:00) 
        // thành chuẩn của thẻ input type="datetime-local" (YYYY-MM-DDThh:mm)
        startTime: showtime.startTime ? showtime.startTime.substring(0, 16) : '',
        status: showtime.status || 'ACTIVE'
      });
    } else {
      setIsEditMode(false);
      setMovieSearchTerm('');
      setFormData({
        id: '',
        movieId: '',
        roomId: ROOMS[0],
        startTime: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = isEditMode ? `${API_URL}/showtimes/${formData.id}` : `${API_URL}/showtimes`;
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          movieId: formData.movieId,
          roomId: formData.roomId,
          startTime: formData.startTime, // Cần format ISO (thẻ input đã làm phần này)
          status: formData.status
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Lỗi khi lưu suất chiếu');
      }

      await fetchData();
      handleCloseModal();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa suất chiếu này?')) return;
    try {
      const res = await fetch(`${API_URL}/showtimes/${id}`, { 
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (!res.ok) throw new Error('Không thể xóa suất chiếu');
      await fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const isDeactivating = currentStatus === 'ACTIVE';
    const msg = isDeactivating 
        ? 'Bạn có chắc chắn muốn hủy suất chiếu này không?' 
        : 'Bạn có chắc chắn muốn mở lại suất chiếu này không?';
        
    if (!window.confirm(msg)) return;

    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
      const res = await fetch(`${API_URL}/showtimes/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Không thể thay đổi trạng thái');
      await fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    return date.toLocaleString('vi-VN', { 
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
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
          <h1 className="text-3xl font-display font-bold text-white">Quản lý Lịch chiếu</h1>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-primary hover:bg-red-700 text-white px-4 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(229,9,20,0.3)] hover:shadow-[0_0_25px_rgba(229,9,20,0.5)] font-medium"
        >
          <Plus className="w-5 h-5" /> Thêm Lịch chiếu
        </button>
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
            {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
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
                  <td className="px-6 py-4 font-medium text-green-500">
                    {st.roomId}
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
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    Chưa có suất chiếu nào được lên lịch hoặc tìm thấy.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all duration-300">
          <div className="bg-surface border border-white/10 w-full max-w-md rounded-3xl p-6 relative shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                {isEditMode ? 'Cập nhật Suất chiếu' : 'Thêm Suất chiếu mới'}
              </h2>
              <button 
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-500 text-sm leading-relaxed">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Phim</label>
                <div 
                  className="relative"
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) setIsMovieSearchOpen(false);
                  }}
                >
                  <input 
                    type="text"
                    placeholder="-- Chọn phim --"
                    required
                    value={movieSearchTerm}
                    onFocus={() => setIsMovieSearchOpen(true)}
                    onChange={(e) => {
                       setMovieSearchTerm(e.target.value);
                       setFormData({...formData, movieId: ''});
                       setIsMovieSearchOpen(true);
                    }}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                  />
                  {/* Hidden input to ensure form validation requires a valid movie selection */}
                  <input type="hidden" required value={formData.movieId} />
                  
                  {isMovieSearchOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-[#2a2a2a] border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                      {movies.filter(m => m.title.toLowerCase().includes(movieSearchTerm.toLowerCase())).map(m => (
                        <button
                          key={m.id || m._id}
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-primary/20 hover:text-primary text-white transition-colors border-b border-white/5 last:border-0"
                          onClick={() => {
                            setFormData({...formData, movieId: m.id || m._id});
                            setMovieSearchTerm(m.title);
                            setIsMovieSearchOpen(false);
                          }}
                        >
                          {m.title}
                        </button>
                      ))}
                      {movies.filter(m => m.title.toLowerCase().includes(movieSearchTerm.toLowerCase())).length === 0 && (
                        <div className="px-4 py-3 text-gray-400">Không tìm thấy phim phù hợp</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Phòng chiếu</label>
                <select 
                  required
                  value={formData.roomId}
                  onChange={e => setFormData({...formData, roomId: e.target.value})}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                >
                  {ROOMS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Thời gian bắt đầu</label>
                <input 
                  type="datetime-local" 
                  required
                  min={getMinDateTime()}
                  value={formData.startTime}
                  onChange={e => setFormData({...formData, startTime: e.target.value})}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors [color-scheme:dark]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Trạng thái</label>
                <select 
                  required
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                  <option value="DISABLED">Vô hiệu hóa (DISABLED)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-white/5 flex gap-3">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="flex-1 py-3 px-4 rounded-xl font-medium border border-white/10 hover:bg-white/5 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 px-4 rounded-xl font-medium bg-primary hover:bg-red-700 text-white transition-all shadow-[0_0_15px_rgba(229,9,20,0.3)]"
                >
                  {isEditMode ? 'Cập nhật' : 'Lưu suất chiếu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
