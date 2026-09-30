import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Play, Ticket, Clock, Calendar as CalendarIcon, Info } from 'lucide-react';
import { motion } from 'framer-motion';

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('detail'); // 'detail' or 'trailer'

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/movies/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'DISABLED') {
            navigate('/', { state: { message: 'Phim này đã ngừng chiếu hoặc không khả dụng!' } });
            return;
          }
          setMovie(data);
          setLoading(false);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Lỗi khi tải thông tin phim:", error);
        setLoading(false);
      }
    };
    fetchMovie();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <h2 className="text-2xl text-gray-400">Không tìm thấy phim!</h2>
      </div>
    );
  }

  // Chuyển URL YouTube thông thường thành dạng embed
  const getEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('embed')) return url;
    if (url.includes('watch?v=')) {
      return url.replace('watch?v=', 'embed/');
    }
    if (url.includes('youtu.be/')) {
      return url.replace('youtu.be/', 'youtube.com/embed/');
    }
    return url;
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Header Title */}
        <div className="border-b-2 border-white/10 mb-8 pb-4">
          <h1 className="text-3xl font-display font-bold text-white uppercase tracking-wider">
            Nội Dung Phim
          </h1>
        </div>

        {/* Main Content (Poster + Details) */}
        <div className="flex flex-col md:flex-row gap-8 mb-12">
          {/* Poster */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full md:w-1/3 lg:w-1/4 shrink-0"
          >
            <div className="rounded-xl overflow-hidden border-2 border-white/5 shadow-2xl">
              <img 
                src={movie.posterUrl || movie.image || '/images/default-poster.jpg'} 
                alt={movie.title}
                className="w-full aspect-[2/3] object-cover"
              />
            </div>
          </motion.div>

          {/* Details */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col justify-start"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white uppercase mb-4">
              {movie.title} {movie.originalTitle ? `(${movie.originalTitle})` : ''}
            </h2>
            
            <div className="w-full h-px bg-white/10 mb-6"></div>

            <div className="space-y-3 text-gray-300 text-sm md:text-base">
              <p><strong className="text-white w-28 inline-block">Đạo diễn:</strong> {movie.directors?.join(', ') || 'Đang cập nhật'}</p>
              <p><strong className="text-white w-28 inline-block">Diễn viên:</strong> {movie.actors?.join(', ') || 'Đang cập nhật'}</p>
              <p><strong className="text-white w-28 inline-block">Thể loại:</strong> {movie.genres?.join(', ') || 'Đang cập nhật'}</p>
              <p><strong className="text-white w-28 inline-block">Khởi chiếu:</strong> {movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString('vi-VN') : 'Đang cập nhật'}</p>
              <p><strong className="text-white w-28 inline-block">Thời lượng:</strong> {movie.duration} phút</p>
              <p><strong className="text-white w-28 inline-block">Ngôn ngữ:</strong> Phụ đề Tiếng Việt</p>
              
              <div className="flex items-center gap-2 mt-4 pt-2">
                <strong className="text-white w-28">Rated:</strong> 
                <span className="bg-yellow-500 text-black font-bold px-2 py-0.5 rounded text-sm">
                  {movie.ageRating}
                </span>
                <span className="text-gray-400 text-sm">
                  - PHIM DÀNH CHO KHÁN GIẢ TỪ {movie.ageRating?.replace('C', '')} TUỔI TRỞ LÊN
                </span>
              </div>
            </div>

            {/* Mua vé Button */}
            <div className="mt-8">
              {movie.status === 'DISABLED' ? (
                <button 
                  disabled
                  className="inline-flex items-center gap-2 bg-gray-600 text-gray-300 font-bold py-3 px-8 rounded-lg uppercase tracking-wider cursor-not-allowed"
                >
                  <Ticket className="w-5 h-5" /> Phim Ngừng Chiếu
                </button>
              ) : (
                <Link 
                  to={`/booking/${movie._id || movie.id}`} 
                  className="inline-flex items-center gap-2 bg-[#e31837] hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition-colors uppercase tracking-wider shadow-lg shadow-red-500/20"
                >
                  <Ticket className="w-5 h-5" /> Mua Vé
                </Link>
              )}
            </div>
          </motion.div>
        </div>

        {/* Tabs: Chi tiết | Trailer */}
        <div className="w-full mt-12">
          {/* Tab Headers - Banner Style */}
          <div className="flex justify-center mb-8 relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Decorative background shape like in the image */}
                <div className="w-[300px] h-12 bg-[#e31837]" style={{ clipPath: 'polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%)' }}></div>
            </div>
            
            <div className="relative z-10 flex items-center gap-4 text-white font-bold uppercase tracking-widest px-12 py-3">
              <button 
                onClick={() => setActiveTab('detail')}
                className={`flex items-center gap-2 transition-colors ${activeTab === 'detail' ? 'text-white' : 'text-white/60 hover:text-white/80'}`}
              >
                <Info className="w-4 h-4" /> Chi tiết
              </button>
              <span className="text-white/50">|</span>
              <button 
                onClick={() => setActiveTab('trailer')}
                className={`flex items-center gap-2 transition-colors ${activeTab === 'trailer' ? 'text-white' : 'text-white/60 hover:text-white/80'}`}
              >
                <Play className="w-4 h-4" /> Trailer
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-white/5 shadow-xl">
            {activeTab === 'detail' ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="text-gray-300 leading-relaxed space-y-4"
              >
                {movie.description ? (
                  movie.description.split('\n').map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))
                ) : (
                  <p>Nội dung phim đang được cập nhật...</p>
                )}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="w-full aspect-video rounded-xl overflow-hidden bg-black"
              >
                {movie.trailerUrl ? (
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={getEmbedUrl(movie.trailerUrl)} 
                    title="Movie Trailer" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                    <Play className="w-12 h-12 mb-2 opacity-20" />
                    <p>Trailer chưa được cập nhật</p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default MovieDetails;
