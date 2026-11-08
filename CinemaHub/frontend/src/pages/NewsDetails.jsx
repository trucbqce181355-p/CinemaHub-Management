import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Calendar, User, Eye, ArrowLeft, Share2, Tag, 
  Sparkles, Newspaper, ChevronRight, RefreshCw, Check
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api/news';

export default function NewsDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchArticleAndRelated = async () => {
      try {
        setLoading(true);
        setError(null);

        // Lấy chi tiết bài viết (tự động tăng views)
        const res = await fetch(`${API_BASE}/${id}?incrementViews=true`);
        if (!res.ok) throw new Error('Không tìm thấy bài viết hoặc bài viết đã bị xóa');
        const data = await res.json();
        setArticle(data);

        // Lấy danh sách tin liên quan
        const relRes = await fetch(`${API_BASE}/public`);
        if (relRes.ok) {
          const relData = await relRes.json();
          setRelatedArticles((relData || []).filter(item => item.id !== id).slice(0, 4));
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchArticleAndRelated();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getCategoryName = (cat) => {
    switch (cat) {
      case 'DIEN_ANH': return 'Tin điện ảnh';
      case 'SU_KIEN': return 'Sự kiện & Trải nghiệm';
      case 'KHUYEN_MAI': return 'Khuyến mãi & Ưu đãi';
      case 'REVIEW': return 'Review & Đánh giá';
      case 'THONG_BAO': return 'Thông báo rạp';
      default: return cat || 'Tin tức';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white pt-32 pb-20 flex flex-col items-center justify-center gap-4">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-gray-400">Đang tải bài viết...</p>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white pt-32 pb-20 container mx-auto px-4 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <Newspaper className="w-16 h-16 text-gray-600 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Không tìm thấy bài viết</h2>
          <p className="text-sm text-gray-400">{error || 'Bài viết không tồn tại hoặc đã bị ẩn khỏi hệ thống.'}</p>
          <button
            onClick={() => navigate('/news')}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-semibold rounded-xl text-sm transition-transform hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại trang tin tức</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-20">
      <div className="container mx-auto px-4 md:px-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-8 overflow-x-auto whitespace-nowrap">
          <Link to="/" className="hover:text-white transition-colors">Trang chủ</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          <Link to="/news" className="hover:text-white transition-colors">Tin tức & Sự kiện</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          <span className="text-gray-200 truncate max-w-xs">{article.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Article Content */}
          <div className="lg:col-span-8 space-y-8">
            <div>
              {/* Category & Badge */}
              <div className="flex items-center justify-between gap-4 mb-4">
                <span className="px-3.5 py-1 bg-primary/20 text-primary border border-primary/30 text-xs font-bold uppercase tracking-wider rounded-full">
                  {getCategoryName(article.category)}
                </span>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-medium transition-colors border border-white/5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã sao chép liên kết!' : 'Chia sẻ'}</span>
                </button>
              </div>

              {/* Title */}
              <h1 className="text-2xl md:text-4xl font-display font-extrabold text-white tracking-tight leading-snug">
                {article.title}
              </h1>

              {/* Meta information */}
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-6 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-200">{article.author || 'CinemaHub Editor'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  <span>
                    {article.createdAt 
                      ? new Date(article.createdAt).toLocaleString('vi-VN', {
                          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) 
                      : 'Mới cập nhật'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  <span>{(article.views || 0).toLocaleString()} lượt xem</span>
                </div>
              </div>
            </div>

            {/* Banner Image */}
            <div className="rounded-3xl overflow-hidden border border-white/10 bg-neutral-900 shadow-2xl relative">
              <img
                src={article.imageUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop'}
                alt={article.title}
                className="w-full h-auto max-h-[480px] object-cover"
              />
            </div>

            {/* Summary highlight */}
            {article.summary && (
              <div className="p-5 md:p-6 bg-gradient-to-r from-primary/15 to-transparent border-l-4 border-primary rounded-r-2xl text-gray-200 text-base md:text-lg font-medium italic leading-relaxed">
                "{article.summary}"
              </div>
            )}

            {/* Body Content */}
            <div className="prose prose-invert max-w-none text-gray-300 text-base leading-relaxed whitespace-pre-line space-y-4 font-sans">
              {article.content}
            </div>

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="pt-6 border-t border-white/10 flex flex-wrap items-center gap-2">
                <Tag className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-400 font-medium">Chủ đề:</span>
                {article.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-medium border border-white/5 transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Footer buttons */}
            <div className="pt-6 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => navigate('/news')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-semibold transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Xem tất cả tin tức</span>
              </button>

              <Link
                to="/movies"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105"
              >
                <span>Đặt vé xem phim ngay</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Sidebar - Related News */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-neutral-900/60 border border-white/5 p-6 rounded-3xl sticky top-28 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="font-display font-bold text-white text-lg flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Tin tức nổi bật khác</span>
                </h3>
                <Link to="/news" className="text-xs text-primary hover:underline font-medium">
                  Xem tất cả
                </Link>
              </div>

              <div className="space-y-4">
                {relatedArticles.length === 0 ? (
                  <p className="text-xs text-gray-500 py-4 text-center">Không có tin tức liên quan</p>
                ) : (
                  relatedArticles.map((item) => (
                    <Link
                      key={item.id}
                      to={`/news/${item.id}`}
                      className="group flex gap-3.5 items-start p-2 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <img
                        src={item.imageUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=200&auto=format&fit=crop'}
                        alt={item.title}
                        className="w-20 h-16 object-cover rounded-lg shrink-0 border border-white/10 bg-black"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">
                          {getCategoryName(item.category)}
                        </span>
                        <h4 className="text-xs font-semibold text-white group-hover:text-primary transition-colors line-clamp-2 leading-snug mt-0.5">
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
                          <Eye className="w-3 h-3 text-blue-400" />
                          {(item.views || 0).toLocaleString()} lượt xem
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              {/* Promo box */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 via-black to-black border border-primary/30 space-y-2">
                <p className="text-xs font-bold text-primary uppercase tracking-wider">Ưu đãi thành viên</p>
                <p className="text-xs text-gray-300 font-medium">
                  Đăng ký tài khoản CinemaHub ngay để nhận voucher giảm giá 50% vé xem phim và combo bắp nước!
                </p>
                <Link
                  to="/register"
                  className="inline-block mt-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 px-3.5 py-1.5 rounded-lg transition-colors"
                >
                  Đăng ký ngay
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

