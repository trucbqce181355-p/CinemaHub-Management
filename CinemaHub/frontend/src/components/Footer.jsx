import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Clapperboard, Globe, MessageCircle, Camera, Video } from 'lucide-react';

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleScrollTo = (e, id) => {
    e.preventDefault();
    if (location.pathname === '/') {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      window.history.pushState(null, '', '/#' + id);
    } else {
      navigate('/#' + id);
    }
  };
  return (
    <footer className="bg-surface border-t border-white/5 pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="bg-primary p-1.5 rounded-lg">
                <Clapperboard className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-display font-bold tracking-wider">
                Cinema<span className="text-primary">Hub</span>
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Hệ thống quản lý và đặt vé rạp chiếu phim tích hợp AI Recommendation. Nâng tầm trải nghiệm điện ảnh của bạn.
            </p>
            <div className="flex gap-4">
              <button className="text-gray-400 hover:text-white transition-colors"><Globe className="w-5 h-5" /></button>
              <button className="text-gray-400 hover:text-white transition-colors"><MessageCircle className="w-5 h-5" /></button>
              <button className="text-gray-400 hover:text-white transition-colors"><Camera className="w-5 h-5" /></button>
              <button className="text-gray-400 hover:text-white transition-colors"><Video className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-medium mb-4">Khám phá</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="/#phim-dang-chieu" onClick={(e) => handleScrollTo(e, 'phim-dang-chieu')} className="hover:text-primary transition-colors">Phim đang chiếu</a></li>
              <li><a href="/#phim-sap-chieu" onClick={(e) => handleScrollTo(e, 'phim-sap-chieu')} className="hover:text-primary transition-colors">Phim sắp chiếu</a></li>
              <li><Link to="/cinemas" className="hover:text-primary transition-colors">Rạp phim</Link></li>
              <li><Link to="/promotions" className="hover:text-primary transition-colors">Khuyến mãi</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Hỗ trợ</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/" className="hover:text-primary transition-colors">Điều khoản sử dụng</Link></li>
              <li><Link to="/" className="hover:text-primary transition-colors">Chính sách bảo mật</Link></li>
              <li><Link to="/" className="hover:text-primary transition-colors">Câu hỏi thường gặp</Link></li>
              <li><Link to="/" className="hover:text-primary transition-colors">Liên hệ</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-white font-medium mb-4">Đăng ký nhận tin</h4>
            <p className="text-sm text-gray-400 mb-4">Nhận thông tin về phim mới và ưu đãi hấp dẫn.</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Email của bạn"
                className="bg-background border border-white/10 rounded-lg px-4 py-2 text-sm w-full focus:outline-none focus:border-primary transition-colors"
              />
              <button className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm transition-colors shadow-lg">
                Gửi
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} CinemaHub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
