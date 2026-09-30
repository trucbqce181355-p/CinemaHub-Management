import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Edit2, Trash2, Plus, Search, Filter, Image as ImageIcon,
  PlaySquare, X, Film, Check, AlertCircle, Eye, EyeOff
} from 'lucide-react';

const MovieManagement = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Data State
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGenre, setFilterGenre] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [movieToDelete, setMovieToDelete] = useState(null);

  // Form State
  const initialFormState = {
    title: '',
    originalTitle: '',
    description: '',
    releaseDate: '',
    duration: '',
    ageRating: 'P',
    status: 'ACTIVE',
    trailerUrl: '',
    posterUrl: '',
    genres: '',
    directors: '',
    actors: ''
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchMovies = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append('search', searchTerm);
      if (filterStatus !== 'All') queryParams.append('status', filterStatus);

      const res = await fetch(`http://localhost:5000/api/movies?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setMovies(data);
      } else {
        console.error('Failed to fetch movies', data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, [searchTerm, filterStatus]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAddMovie = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      const payload = {
        ...formData,
        duration: Number(formData.duration),
        genres: typeof formData.genres === 'string' ? formData.genres.split(',').map(s => s.trim()).filter(Boolean) : formData.genres,
        directors: typeof formData.directors === 'string' ? formData.directors.split(',').map(s => s.trim()).filter(Boolean) : formData.directors,
        actors: typeof formData.actors === 'string' ? formData.actors.split(',').map(s => s.trim()).filter(Boolean) : formData.actors,
      };
      const res = await fetch('http://localhost:5000/api/movies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        setFormData(initialFormState);
        fetchMovies();
      } else {
        const errorData = await res.text();
        console.error("Lỗi Backend:", errorData);
        setFormError(`Lỗi server (${res.status}): Vui lòng kiểm tra Terminal Backend để xem nguyên nhân`);
        if (res.status === 401) {
          logout();
          navigate('/login');
        }
      }
    } catch (err) {
      console.error(err);
      setFormError('Lỗi kết nối máy chủ, backend chưa chạy hoặc sai cổng');
    } finally {
      setFormLoading(false);
    }
  };

  const openEditModal = (movie) => {
    setFormData({
      ...movie,
      genres: movie.genres?.join(', ') || '',
      directors: movie.directors?.join(', ') || '',
      actors: movie.actors?.join(', ') || ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditMovie = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      const payload = {
        ...formData,
        duration: Number(formData.duration),
        genres: typeof formData.genres === 'string' ? formData.genres.split(',').map(s => s.trim()).filter(Boolean) : formData.genres,
        directors: typeof formData.directors === 'string' ? formData.directors.split(',').map(s => s.trim()).filter(Boolean) : formData.directors,
        actors: typeof formData.actors === 'string' ? formData.actors.split(',').map(s => s.trim()).filter(Boolean) : formData.actors,
      };
      const res = await fetch(`http://localhost:5000/api/movies/${formData._id || formData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        fetchMovies();
      } else {
        const errorData = await res.text();
        console.error("Lỗi Backend:", errorData);
        setFormError(`Lỗi server (${res.status}): Vui lòng kiểm tra Terminal Backend`);
        if (res.status === 401) {
          logout();
          navigate('/login');
        }
      }
    } catch (err) {
      console.error(err);
      setFormError('Lỗi kết nối máy chủ');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
    try {
      const res = await fetch(`http://localhost:5000/api/movies/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchMovies();
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = (movie) => {
    setMovieToDelete(movie);
  };

  const executeDelete = async () => {
    if (!movieToDelete) return;
    try {
      const res = await fetch(`http://localhost:5000/api/movies/${movieToDelete.id || movieToDelete._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      if (res.ok) {
        setMovieToDelete(null);
        fetchMovies();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-full">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <Film className="w-8 h-8 text-primary" />
            Quản lý Phim
          </h1>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Bar */}
            <div className="relative group min-w-[250px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm phim..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-gray-500"
              />
            </div>

            {/* Filter Status */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Filter className="w-4 h-4" />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[#1a1a1a] border border-white/10 rounded-xl pl-9 pr-8 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
              >
                <option value="All">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang chiếu</option>
                <option value="COMING_SOON">Sắp chiếu</option>
                <option value="DISABLED">Đã ẩn</option>
              </select>
            </div>

            <button
              onClick={() => {
                setFormData(initialFormState);
                setIsAddModalOpen(true);
              }}
              className="btn-primary flex items-center gap-2 py-2.5 px-4 bg-primary hover:bg-red-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" /> Thêm phim mới
            </button>
          </div>
        </div>

        {/* Movies Table */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 bg-[#121212]/80 backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-gray-300">
                  <th className="p-4 font-medium">Tên phim</th>
                  <th className="p-4 font-medium">Thời lượng</th>
                  <th className="p-4 font-medium">Phân loại</th>
                  <th className="p-4 font-medium">Thể loại</th>
                  <th className="p-4 font-medium">Trạng thái</th>
                  <th className="p-4 font-medium text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-400">
                      <div className="flex justify-center mb-2">
                        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                      </div>
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : movies.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-gray-400">
                      Không tìm thấy phim nào.
                    </td>
                  </tr>
                ) : (
                  movies.map((movie) => (
                    <tr key={movie.id || movie._id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-white text-base">{movie.title}</div>
                      </td>
                      <td className="p-4 text-gray-300">{movie.duration} phút</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 text-xs rounded-md font-bold bg-white/10 text-white border border-white/20">
                          {movie.ageRating}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {movie.genres.map((g, idx) => (
                            <span key={idx} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                              {g}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-3 py-1 text-xs rounded-full font-medium ${movie.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                            movie.status === 'COMING_SOON' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                              'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}>
                          {movie.status === 'ACTIVE' ? 'Đang chiếu' : movie.status === 'COMING_SOON' ? 'Sắp chiếu' : 'Đã ẩn'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(movie)}
                            title="Chỉnh sửa thông tin"
                            className="p-2 text-blue-400 hover:bg-blue-400/20 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(movie.id || movie._id, movie.status)}
                            title={movie.status === 'DISABLED' ? 'Hiển thị phim' : 'Ẩn phim'}
                            className={`p-2 rounded-lg transition-colors ${movie.status === 'DISABLED' ? 'text-green-400 hover:bg-green-400/20' : 'text-orange-400 hover:bg-orange-400/20'
                              }`}
                          >
                            {movie.status === 'DISABLED' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => confirmDelete(movie)}
                            title="Xóa phim"
                            className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Movie Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-4xl bg-[#121212] rounded-3xl border border-white/10 relative shadow-2xl flex flex-col max-h-[90vh]">
            <div className="shrink-0 bg-[#121212] z-10 px-8 py-6 border-b border-white/10 rounded-t-3xl flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/20 rounded-xl text-primary">
                  {isEditModalOpen ? <Edit2 className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                </div>
                <h2 className="text-2xl font-display font-bold text-white">
                  {isEditModalOpen ? 'Cập nhật thông tin Phim' : 'Thêm Phim Mới'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto">
              {formError && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  {formError}
                </div>
              )}

              <form onSubmit={isEditModalOpen ? handleEditMovie : handleAddMovie} className="space-y-6">

                {/* Row 1: Titles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Tên phim (Tiếng Việt) *</label>
                    <input
                      type="text"
                      name="title"
                      required
                      value={formData.title}
                      onChange={handleInputChange}
                      className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                      placeholder="VD: Hành Tinh Cát: Phần 2"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Thể loại </label>
                    <input
                      type="text"
                      name="genres"
                      value={formData.genres}
                      onChange={handleInputChange}
                      className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                      placeholder="Hành động, Viễn tưởng..."
                    />
                  </div>
                </div>

                {/* Row: Directors & Actors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Đạo diễn </label>
                    <input
                      type="text"
                      name="directors"
                      value={formData.directors}
                      onChange={handleInputChange}
                      className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                      placeholder="Christopher Nolan, Denis Villeneuve..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Diễn viên </label>
                    <input
                      type="text"
                      name="actors"
                      value={formData.actors}
                      onChange={handleInputChange}
                      className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                      placeholder="Timothée Chalamet, Zendaya..."
                    />
                  </div>
                </div>

                {/* Row 2: Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Thời lượng (phút) *</label>
                    <input
                      type="number"
                      name="duration"
                      required
                      min="1"
                      value={formData.duration}
                      onChange={handleInputChange}
                      className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                      placeholder="120"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Ngày khởi chiếu *</label>
                    <input
                      type="date"
                      name="releaseDate"
                      required
                      value={formData.releaseDate}
                      onChange={handleInputChange}
                      className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 style-color-scheme-dark"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Phân loại tuổi *</label>
                    <select
                      name="ageRating"
                      required
                      value={formData.ageRating}
                      onChange={handleInputChange}
                      className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                    >
                      <option value="P">P (Mọi lứa tuổi)</option>
                      <option value="C13">C13 (Trên 13 tuổi)</option>
                      <option value="C16">C16 (Trên 16 tuổi)</option>
                      <option value="C18">C18 (Trên 18 tuổi)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Trạng thái *</label>
                    <select
                      name="status"
                      required
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                    >
                      <option value="ACTIVE">Đang chiếu</option>
                      <option value="COMING_SOON">Sắp chiếu</option>
                      <option value="DISABLED">Đã ẩn (Disabled)</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Media */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" /> Link Poster URL
                    </label>
                    <input
                      type="url"
                      name="posterUrl"
                      value={formData.posterUrl}
                      onChange={handleInputChange}
                      className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
                      <PlaySquare className="w-4 h-4" /> Link Trailer (YouTube)
                    </label>
                    <input
                      type="url"
                      name="trailerUrl"
                      value={formData.trailerUrl}
                      onChange={handleInputChange}
                      className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>
                </div>

                {/* Row 4: Description */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Nội dung phim / Mô tả</label>
                  <textarea
                    name="description"
                    rows="4"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 resize-y"
                    placeholder="Nhập tóm tắt nội dung phim..."
                  ></textarea>
                </div>

                {/* Action Buttons */}
                <div className="pt-6 border-t border-white/10 flex justify-end gap-4 sticky bottom-0 bg-[#121212] py-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setIsEditModalOpen(false);
                    }}
                    className="px-6 py-3 rounded-xl font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-8 py-3 bg-primary hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {formLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <><Check className="w-5 h-5" /> {isEditModalOpen ? 'Lưu thay đổi' : 'Thêm phim'}</>
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {movieToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-md bg-[#121212] rounded-3xl border border-red-500/30 relative shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-display font-bold text-white mb-2">Xóa Bộ Phim?</h3>
            <p className="text-gray-400 mb-8">
              Bạn có chắc chắn muốn xóa phim <span className="font-bold text-white">"{movieToDelete.title}"</span> không? Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => setMovieToDelete(null)}
                className="px-6 py-3 rounded-xl font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors flex-1"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={executeDelete}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-500/20 flex-1"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MovieManagement;
