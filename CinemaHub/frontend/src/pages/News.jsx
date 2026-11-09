import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Newspaper, Search, Calendar, User, Eye, ArrowRight, 
  Sparkles, Film, ChevronRight, RefreshCw 
} from 'lucide-react';

const API_BASE = `${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')}/news`;

const CATEGORIES = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'DIEN_ANH', label: 'Tin điện ảnh' },
  { value: 'SU_KIEN', label: 'Sự kiện & Trải nghiệm' },
  { value: 'KHUYEN_MAI', label: 'Khuyến mãi & Ưu đãi' },
  { value: 'REVIEW', label: 'Review & Đánh giá' },
  { value: 'THONG_BAO', label: 'Thông báo cụm rạp' }
];

export default function News() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchPublicNews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);

      const res = await fetch(`${API_BASE}/public?${params.toString()}`);
      if (!res.ok) throw new Error('Không thể tải tin tức');
      const data = await res.json();
      setArticles(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchPublicNews();
    }, 250);
    return () => clearTimeout(delay);
  }, [search, selectedCategory]);

  const featuredArticle = articles.length > 0 ? articles[0] : null;
  const regularArticles = articles.length > 0 ? articles.slice(1) : [];

  const getCategoryLabel = (cat) => {
    const found = CATEGORIES.find(c => c.value === cat);
    return found ? found.label : cat;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-16">
      {/* Hero Header */}
      <div className="relative overflow-hidden mb-12">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/10 blur-3xl -z-10" />
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>CinemaHub Newsroom</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-extrabold text-white tracking-tight mb-4">
              Tin Tức & Sự Kiện Điện Ảnh
            </h1>
            <p className="text-gray-400 text-sm md:text-base leading-relaxed">
              Cập nhật liên tục những thông tin nóng hổi về các siêu phẩm bom tấn, trải nghiệm rạp chiếu chuẩn quốc tế và ngập tràn ưu đãi độc quyền tại CinemaHub.
            </p>
          </div>

          {/* Search & Tabs */}
          <div className="mt-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
            {/* Tabs thể loại */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat.value
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Ô tìm kiếm */}
            <div className="relative w-full md:w-80 shrink-0">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm bài viết, phim, sự kiện..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Đang tải tin tức điện ảnh mới nhất...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Newspaper className="w-12 h-12 text-gray-600 mx-auto" />
            <p className="text-lg font-semibold text-gray-300">Không tìm thấy bài viết tin tức nào</p>
            <p className="text-sm text-gray-500">Hãy thử tìm với từ khóa khác hoặc chuyển chuyên mục</p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Bài viết nổi bật (Featured) */}
            {featuredArticle && !search && selectedCategory === 'ALL' && (
              <Link
                to={`/news/${featuredArticle.id}`}
                className="group relative block rounded-3xl overflow-hidden border border-white/10 bg-neutral-900/60 hover:border-primary/40 transition-all duration-300 shadow-2xl"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                  <div className="lg:col-span-7 h-72 md:h-96 relative overflow-hidden bg-black">
                    <img
                      src={featuredArticle.imageUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop'}
                      alt={featuredArticle.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent lg:hidden" />
                  </div>
                  <div className="lg:col-span-5 p-6 md:p-10 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="px-3 py-1 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-md">
                          Tiêu Điểm
                        </span>
                        <span className="px-3 py-1 bg-white/10 text-gray-300 text-xs font-medium rounded-full">
                          {getCategoryLabel(featuredArticle.category)}
                        </span>
                      </div>
                      <h2 className="text-2xl md:text-3xl font-display font-bold text-white group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                        {featuredArticle.title}
                      </h2>
                      <p className="mt-4 text-gray-400 text-sm md:text-base line-clamp-3 leading-relaxed">
                        {featuredArticle.summary}
                      </p>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-primary" />
                          {featuredArticle.author || 'CinemaHub'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {featuredArticle.createdAt ? new Date(featuredArticle.createdAt).toLocaleDateString('vi-VN') : 'Mới'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                          {(featuredArticle.views || 0).toLocaleString()}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-primary font-bold group-hover:translate-x-1 transition-transform">
                        <span>Đọc tiếp</span>
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Lưới các bài viết */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                  <Film className="w-5 h-5 text-primary" />
                  <span>
                    {search || selectedCategory !== 'ALL' ? 'Kết quả bài viết' : 'Danh sách bài viết mới nhất'}
                  </span>
                </h3>
                <span className="text-xs text-gray-500">
                  Hiển thị {(search || selectedCategory !== 'ALL' ? articles : regularArticles).length} bài viết
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(search || selectedCategory !== 'ALL' ? articles : regularArticles).map((article) => (
                  <Link
                    key={article.id}
                    to={`/news/${article.id}`}
                    className="group bg-neutral-900/60 border border-white/5 hover:border-primary/40 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-primary/5"
                  >
                    <div>
                      {/* Ảnh bài viết */}
                      <div className="relative h-48 overflow-hidden bg-black">
                        <img
                          src={article.imageUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600&auto=format&fit=crop'}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3">
                          <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold rounded-lg border border-white/10">
                            {getCategoryLabel(article.category)}
                          </span>
                        </div>
                      </div>

                      {/* Nội dung */}
                      <div className="p-5">
                        <h4 className="font-display font-bold text-white group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                          {article.title}
                        </h4>
                        <p className="mt-2 text-xs text-gray-400 line-clamp-2 leading-relaxed">
                          {article.summary}
                        </p>
                      </div>
                    </div>

                    {/* Footer card */}
                    <div className="p-5 pt-0 mt-auto">
                      <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-500">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {article.createdAt ? new Date(article.createdAt).toLocaleDateString('vi-VN') : 'Mới'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-blue-400" />
                            {(article.views || 0).toLocaleString()}
                          </span>
                        </div>
                        <span className="text-primary font-semibold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                          <span>Chi tiết</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

