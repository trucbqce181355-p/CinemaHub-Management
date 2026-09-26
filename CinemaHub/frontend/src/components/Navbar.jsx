import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clapperboard, Search, User, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Trang chủ', path: '/' },
    { name: 'Phim đang chiếu', path: '/' },
    { name: 'Rạp phim', path: '/' },
    { name: 'Khuyến mãi', path: '/' },
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
            <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full border border-white/10 transition-all duration-300">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">Đăng nhập</span>
            </button>
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
            <div className="border-t border-white/10 mt-2 pt-4 flex gap-4 px-4">
               <button className="flex-1 btn-secondary text-sm">Tìm kiếm</button>
               <button className="flex-1 btn-primary text-sm">Đăng nhập</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
