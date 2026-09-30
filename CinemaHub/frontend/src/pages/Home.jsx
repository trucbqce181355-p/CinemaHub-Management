import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Play, Calendar, Star, Sparkles, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const Home = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (location.state?.message) {
      setToastMessage(location.state.message);
      navigate('/', { replace: true, state: {} });
      
      // Tự động tắt sau 5 giây
      setTimeout(() => {
        setToastMessage('');
      }, 5000);
    }
  }, [location, navigate]);

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

  const activeMovies = movies.filter(m => m.status === 'ACTIVE');
  const comingSoonMovies = movies.filter(m => m.status === 'COMING_SOON');

  return (
    <div className="w-full relative">
      {/* Toast Popup */}
      {toastMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#e31837] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3"
        >
          <span className="font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage('')} className="bg-white/20 hover:bg-white/40 p-1 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </motion.div>
      )}

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img src="/images/hero_bg.jpg" alt="Hero Background" className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent"></div>
        </div>

        {/* Hero Content */}
        <div className="container mx-auto px-4 md:px-8 relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-20">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col gap-6"
          >
            <div className="inline-flex items-center gap-2 bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full w-max text-sm font-medium backdrop-blur-md">
              <Star className="w-4 h-4" /> Đang Thịnh Hành Số 1
            </div>
            <h1 className="text-5xl md:text-7xl font-bold font-display leading-tight text-white drop-shadow-2xl">
              TRẢI NGHIỆM ĐIỆN ẢNH ĐỈNH CAO
            </h1>
            <p className="text-lg text-gray-300 max-w-lg leading-relaxed">
              Khám phá những siêu phẩm bom tấn với hệ thống gợi ý AI thông minh. Đặt vé ngay hôm nay để nhận ưu đãi đặc biệt.
            </p>
            <div className="flex flex-wrap gap-4 mt-4">
              <Link to="/booking" className="btn-primary flex items-center gap-2">
                <Calendar className="w-5 h-5" /> Mua Vé Ngay
              </Link>
              <button className="btn-secondary flex items-center gap-2">
                <Play className="w-5 h-5" /> Xem Trailer
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Phim Đang Chiếu Section */}
      <section className="py-16 bg-background relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-10"
          >
            <Play className="w-8 h-8 text-primary" />
            <h2 className="text-3xl md:text-4xl font-display font-bold">Phim đang chiếu</h2>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {activeMovies.length === 0 && <p className="text-gray-400">Chưa có phim nào đang chiếu.</p>}
            {activeMovies.map((movie, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative rounded-xl overflow-hidden cursor-pointer"
              >
                {/* Poster */}
                <div className="aspect-[3/4] overflow-hidden">
                  <img 
                    src={movie.posterUrl || movie.image || '/images/default-poster.jpg'} 
                    alt={movie.title} 
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                </div>
                
                {/* Overlay Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <h3 className="text-xl font-bold font-display mb-1 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">{movie.title}</h3>
                  <p className="text-sm text-gray-300 mb-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">{movie.genres?.join(', ')}</p>
                  <div className="flex items-center gap-2 mb-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-100">
                     <Clock className="w-4 h-4 text-gray-400" />
                     <span className="font-medium text-white">{movie.duration} phút</span>
                  </div>
                  <Link 
                    to={`/movie/${movie._id || movie.id}`} 
                    className="w-full py-2 bg-primary/90 hover:bg-primary text-center rounded-lg font-medium backdrop-blur-sm transform translate-y-8 group-hover:translate-y-0 transition-all duration-300 delay-150"
                  >
                    Đặt Vé / Chi Tiết
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Phim Sắp Chiếu Section */}
      <section className="py-16 bg-[#121212] relative overflow-hidden border-t border-white/5">
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-10"
          >
            <Calendar className="w-8 h-8 text-secondary" />
            <h2 className="text-3xl md:text-4xl font-display font-bold">Phim sắp chiếu</h2>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {comingSoonMovies.length === 0 && <p className="text-gray-400">Chưa có phim nào sắp chiếu.</p>}
            {comingSoonMovies.map((movie, index) => (
              <motion.div
                key={movie._id || index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative rounded-xl overflow-hidden cursor-pointer"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  <img 
                    src={movie.posterUrl || movie.image || '/images/default-poster.jpg'} 
                    alt={movie.title} 
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <h3 className="text-xl font-bold font-display mb-1 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">{movie.title}</h3>
                  <p className="text-sm text-gray-300 mb-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">{movie.genres?.join(', ')}</p>
                  <p className="text-sm text-primary font-bold mb-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-100">
                     Dự kiến: {movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString('vi-VN') : 'Sắp ra mắt'}
                  </p>
                  <Link 
                    to={`/movie/${movie._id || movie.id}`} 
                    className="w-full py-2 bg-primary/90 hover:bg-primary text-center rounded-lg font-medium text-white backdrop-blur-sm transform translate-y-8 group-hover:translate-y-0 transition-all duration-300 delay-150"
                  >
                    Xem Thông Tin
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
