import { Link } from 'react-router-dom';
import { Play, Calendar, Star, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const Home = () => {
  const movies = [
    { id: 1, title: 'Astral Bound', genre: 'Sci-Fi / Phiêu lưu', rating: '9.2', image: '/images/poster1.jpg', isTrending: true },
    { id: 2, title: 'Night Fire', genre: 'Hành động / Tội phạm', rating: '8.8', image: '/images/poster2.jpg', isTrending: true },
    // Repeat for UI purposes
    { id: 3, title: 'Cyber Drift', genre: 'Hành động / Sci-Fi', rating: '8.5', image: '/images/poster1.jpg' },
    { id: 4, title: 'Urban Chaos', genre: 'Hành động / Giật gân', rating: '9.0', image: '/images/poster2.jpg' },
  ];

  return (
    <div className="w-full">
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

      {/* AI Recommendation Section */}
      <section className="py-20 bg-background relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-10"
          >
            <Sparkles className="w-8 h-8 text-secondary animate-pulse-glow" />
            <h2 className="text-3xl md:text-4xl font-display font-bold">Gợi ý dành riêng cho bạn (AI)</h2>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {movies.map((movie, index) => (
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
                    src={movie.image} 
                    alt={movie.title} 
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                </div>
                
                {/* Overlay Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <h3 className="text-xl font-bold font-display mb-1 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">{movie.title}</h3>
                  <p className="text-sm text-gray-300 mb-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">{movie.genre}</p>
                  <div className="flex items-center gap-2 mb-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-100">
                     <Star className="w-4 h-4 text-accent fill-accent" />
                     <span className="font-medium text-white">{movie.rating}</span>
                  </div>
                  <Link 
                    to="/booking" 
                    className="w-full py-2 bg-primary/90 hover:bg-primary text-center rounded-lg font-medium backdrop-blur-sm transform translate-y-8 group-hover:translate-y-0 transition-all duration-300 delay-150"
                  >
                    Đặt Vé
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
