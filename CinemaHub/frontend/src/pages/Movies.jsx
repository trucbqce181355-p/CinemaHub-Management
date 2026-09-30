import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Clock, PlaySquare, ChevronDown, X } from 'lucide-react';
import { motion } from 'framer-motion';

const Movies = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGenre, setFilterGenre] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterAgeRating, setFilterAgeRating] = useState('All');

  const clearFilters = () => {
    setSearchTerm('');
    setFilterGenre('All');
    setFilterStatus('All');
    setFilterAgeRating('All');
  };

  // Extract unique genres for the dropdown
  const uniqueGenres = useMemo(() => {
    const genres = new Set();
    movies.forEach(m => {
      if (Array.isArray(m.genres)) {
        m.genres.forEach(g => genres.add(g));
      }
    });
    return Array.from(genres).sort();
  }, [movies]);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/movies');
        if (res.ok) {
          const data = await res.json();
          // Lọc bỏ phim đã ẩn (DISABLED)
          setMovies(data.filter(m => m.status !== 'DISABLED'));
        }
      } catch (error) {
        console.error("Error fetching movies:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  const filteredMovies = useMemo(() => {
    return movies.filter(movie => {
      // Tìm chung (Tên, Đạo diễn, Diễn viên)
      const term = searchTerm.toLowerCase();
      const matchSearch = term === '' ||
        movie.title?.toLowerCase().includes(term) ||
        (Array.isArray(movie.directors) && movie.directors.some(d => d.toLowerCase().includes(term))) ||
        (Array.isArray(movie.actors) && movie.actors.some(a => a.toLowerCase().includes(term)));

      // Lọc theo thể loại
      const matchGenre = filterGenre === 'All' ||
        (Array.isArray(movie.genres) && movie.genres.includes(filterGenre));

      // Lọc theo trạng thái
      const matchStatus = filterStatus === 'All' || movie.status === filterStatus;

      // Lọc theo độ tuổi
      const matchAge = filterAgeRating === 'All' || movie.ageRating === filterAgeRating;

      return matchSearch && matchGenre && matchStatus && matchAge;
    });
  }, [movies, searchTerm, filterGenre, filterStatus, filterAgeRating]);

  return (
    <div className="w-full min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 md:px-8">

        {/* Header Section */}
        <div className="mb-10 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold text-white mb-4"
          >
            Danh sách Phim
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 max-w-2xl mx-auto"
          >
            Khám phá thư viện phim khổng lồ. Sử dụng bộ lọc để tìm kiếm những tác phẩm điện ảnh yêu thích của bạn.
          </motion.p>
        </div>

        {/* Filter Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel p-6 rounded-2xl border border-white/10 mb-10 flex flex-col md:flex-row gap-4 items-center flex-wrap"
        >
          <div className="flex items-center gap-2 text-primary font-bold w-full md:w-auto md:pr-4">
            <Filter className="w-5 h-5" />
            BỘ LỌC
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 w-full">
            {/* Tên phim / Đạo diễn / Diễn viên */}
            <div className="relative md:col-span-4">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Tìm tên phim, đạo diễn, diễn viên..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>

            {/* Thể loại */}
            <div className="relative md:col-span-3">
              <select
                value={filterGenre}
                onChange={e => setFilterGenre(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
              >
                <option value="All">Tất cả thể loại</option>
                {uniqueGenres.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>

            {/* Độ tuổi */}
            <div className="relative md:col-span-2">
              <select
                value={filterAgeRating}
                onChange={e => setFilterAgeRating(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
              >
                <option value="All">Phân loại tuổi</option>
                <option value="P">P (Mọi lứa tuổi)</option>
                <option value="C13">C13 (Trên 13 tuổi)</option>
                <option value="C16">C16 (Trên 16 tuổi)</option>
                <option value="C18">C18 (Trên 18 tuổi)</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>

            {/* Trạng thái */}
            <div className="relative md:col-span-2">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
              >
                <option value="All">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang chiếu</option>
                <option value="COMING_SOON">Sắp chiếu</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>

            {/* Xóa lọc */}
            <div className="md:col-span-1 flex justify-end md:justify-center">
              <button
                onClick={clearFilters}
                className="p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors w-full flex items-center justify-center border border-white/10"
                title="Xóa bộ lọc"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Movie Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl font-bold text-gray-400 mb-2">Không tìm thấy phim nào!</p>
            <p className="text-gray-500">Vui lòng thử lại với các điều kiện lọc khác.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredMovies.map((movie, index) => (
              <motion.div
                key={movie.id || movie._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group relative rounded-xl overflow-hidden cursor-pointer bg-[#1a1a1a] border border-white/5 shadow-xl hover:shadow-primary/20 transition-all"
              >
                {/* Poster */}
                <div className="aspect-[3/4] overflow-hidden relative">
                  <img
                    src={movie.posterUrl || movie.image || '/images/default-poster.jpg'}
                    alt={movie.title}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                  {/* Status Badge */}
                  <div className={`absolute top-2 right-2 px-2 py-1 text-xs font-bold rounded-md backdrop-blur-md border ${movie.status === 'ACTIVE'
                      ? 'bg-green-500/80 text-white border-green-400'
                      : 'bg-blue-500/80 text-white border-blue-400'
                    }`}>
                    {movie.status === 'ACTIVE' ? 'Đang chiếu' : 'Sắp chiếu'}
                  </div>
                </div>

                {/* Details under poster (Mobile friendly fallback) */}
                <div className="p-4 md:hidden">
                  <h3 className="text-sm font-bold font-display truncate mb-1">{movie.title}</h3>
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>{movie.duration} phút</span>
                    <span className="font-bold text-primary">{movie.ageRating}</span>
                  </div>
                </div>

                {/* Overlay Hover Effect (Desktop mainly) */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/80 to-black/20 opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 hidden md:flex flex-col justify-end p-5">
                  <h3 className="text-lg font-bold font-display mb-1 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">{movie.title}</h3>
                  <p className="text-xs text-gray-300 mb-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75 line-clamp-1">
                    {movie.genres?.join(', ')}
                  </p>

                  <div className="space-y-1 mb-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-100 text-xs text-gray-400">
                    <p><span className="text-gray-500">Đạo diễn:</span> {movie.directors?.slice(0, 1).join(', ')}</p>
                    <p><span className="text-gray-500">Diễn viên:</span> {movie.actors?.slice(0, 2).join(', ')}</p>
                  </div>

                  <div className="flex items-center gap-2 mb-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-100">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="font-medium text-white text-sm">{movie.duration} phút</span>
                  </div>

                  <Link
                    to={`/movie/${movie._id || movie.id}`}
                    className="w-full py-2 bg-primary/90 hover:bg-primary text-center rounded-lg font-medium text-sm text-white backdrop-blur-sm transform translate-y-8 group-hover:translate-y-0 transition-all duration-300 delay-150"
                  >
                    Xem Chi Tiết
                  </Link>
                </div>

                {/* Mobile absolute link (since overlay is hidden) */}
                <Link to={`/movie/${movie._id || movie.id}`} className="absolute inset-0 md:hidden z-10"></Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Movies;
