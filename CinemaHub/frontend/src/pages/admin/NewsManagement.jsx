import React, { useState, useEffect, useMemo } from 'react';
import { 
  Newspaper, Plus, Search, Edit, Trash2, Eye, 
  Calendar, User, Tag, CheckCircle2, AlertCircle, X, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_BASE = 'http://localhost:5000/api/news';

const CATEGORIES = [
  { value: 'ALL', label: 'Tất cả danh mục' },
  { value: 'DIEN_ANH', label: 'Tin điện ảnh', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { value: 'SU_KIEN', label: 'Sự kiện & Trải nghiệm', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { value: 'KHUYEN_MAI', label: 'Khuyến mãi & Ưu đãi', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { value: 'REVIEW', label: 'Review & Đánh giá', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { value: 'THONG_BAO', label: 'Thông báo cụm rạp', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' }
];

export default function NewsManagement() {
  const { user } = useAuth();

  // State danh sách & tải dữ liệu
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // State bộ lọc & tìm kiếm
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // State Modal Tạo / Sửa
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    content: '',
    imageUrl: '',
    category: 'DIEN_ANH',
    author: '',
    tagsString: '',
    active: true
  });
  const [saving, setSaving] = useState(false);

  // State Modal Chi tiết (Preview)
  const [previewArticle, setPreviewArticle] = useState(null);

  // State Modal Xóa
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Toast helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getAuthHeaders = () => {
    const token = user?.token;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  // 1. Tải danh sách bài viết (View News List + Search For News)
  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (selectedStatus === 'ACTIVE') params.append('active', 'true');
      if (selectedStatus === 'INACTIVE') params.append('active', 'false');

      const url = `${API_BASE}?${params.toString()}`;
      const res = await fetch(url, {
        headers: getAuthHeaders()
      });

      if (!res.ok) throw new Error('Không thể tải danh sách bài viết');
      const data = await res.json();
      setArticles(data || []);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Lỗi kết nối máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchArticles();
    }, 250);
    return () => clearTimeout(timeout);
  }, [search, selectedCategory, selectedStatus]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = articles.length;
    const active = articles.filter(a => a.active).length;
    const inactive = total - active;
    const totalViews = articles.reduce((sum, a) => sum + (Number(a.views) || 0), 0);
    return { total, active, inactive, totalViews };
  }, [articles]);

  // 2. Mở modal tạo mới
  const handleOpenCreate = () => {
    setEditingArticle(null);
    setFormData({
      title: '',
      summary: '',
      content: '',
      imageUrl: '',
      category: 'DIEN_ANH',
      author: user?.fullName || user?.name || user?.username || 'HuyTG - CinemaHub Editor',
      tagsString: 'Phim mới, CinemaHub',
      active: true
    });
    setModalOpen(true);
  };

  // 3. Mở modal chỉnh sửa
  const handleOpenEdit = (article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title || '',
      summary: article.summary || '',
      content: article.content || '',
      imageUrl: article.imageUrl || '',
      category: article.category || 'DIEN_ANH',
      author: article.author || user?.fullName || 'CinemaHub Editor',
      tagsString: (article.tags || []).join(', '),
      active: article.active ?? true
    });
    setModalOpen(true);
  };

  // 4. Lưu bài viết (Create / Edit)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Vui lòng nhập tiêu đề bài viết', 'error');
      return;
    }
    if (!formData.content.trim()) {
      showToast('Vui lòng nhập nội dung bài viết', 'error');
      return;
    }

    try {
      setSaving(true);
      const tags = formData.tagsString
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const payload = {
        title: formData.title.trim(),
        summary: formData.summary.trim(),
        content: formData.content.trim(),
        imageUrl: formData.imageUrl.trim() || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop',
        category: formData.category,
        author: formData.author.trim(),
        tags: tags,
        active: formData.active
      };

      let res;
      if (editingArticle) {
        // Edit News Article
        res = await fetch(`${API_BASE}/${editingArticle.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
      } else {
        // Create News Article
        res = await fetch(API_BASE, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Lỗi khi lưu bài viết');
      }

      showToast(editingArticle ? 'Cập nhật bài viết thành công!' : 'Tạo bài viết mới thành công!');
      setModalOpen(false);
      fetchArticles();
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // 5. Bật/Tắt trạng thái (Enable/Disable News Article)
  const handleToggleStatus = async (article) => {
    const newStatus = !article.active;
    try {
      // Optimistic update
      setArticles(prev => prev.map(a => a.id === article.id ? { ...a, active: newStatus } : a));

      const res = await fetch(`${API_BASE}/${article.id}/status?active=${newStatus}`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });

      if (!res.ok) throw new Error('Không thể đổi trạng thái bài viết');
      showToast(`Đã ${newStatus ? 'hiển thị' : 'vô hiệu hóa'} bài viết: ${article.title}`);
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
      fetchArticles(); // Rollback
    }
  };

  // 6. Xóa bài viết (Delete News Article)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`${API_BASE}/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!res.ok) throw new Error('Không thể xóa bài viết');

      showToast('Đã xóa bài viết vĩnh viễn!');
      setDeleteTarget(null);
      fetchArticles();
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Helper lấy category badge
  const renderCategoryBadge = (catVal) => {
    const item = CATEGORIES.find(c => c.value === catVal) || { label: catVal, color: 'bg-white/10 text-gray-300 border-white/10' };
    return (
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${item.color}`}>
        {item.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-md animate-in slide-in-from-top-3 ${
          toast.type === 'error' 
            ? 'bg-red-500/20 text-red-300 border-red-500/30 shadow-red-500/10' 
            : 'bg-green-500/20 text-green-300 border-green-500/30 shadow-green-500/10'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/20 text-primary rounded-xl border border-primary/20">
              <Newspaper className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-wide">
                Quản lý Tin tức & Bài viết
              </h1>
              <p className="text-sm text-gray-400">
                Tạo, chỉnh sửa, kiểm soát hiển thị và tìm kiếm bài viết tin tức cho CinemaHub
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          <span>Tạo bài viết mới</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface/80 border border-white/5 p-4 rounded-2xl">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Tổng bài viết</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-surface/80 border border-white/5 p-4 rounded-2xl">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Đang hiển thị</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{stats.active}</p>
        </div>
        <div className="bg-surface/80 border border-white/5 p-4 rounded-2xl">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Đã tạm ẩn</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{stats.inactive}</p>
        </div>
        <div className="bg-surface/80 border border-white/5 p-4 rounded-2xl">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Tổng lượt xem</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{stats.totalViews.toLocaleString()}</p>
        </div>
      </div>

      {/* Search & Filter Bar (Task: Search For News) */}
      <div className="bg-surface/80 border border-white/5 p-4 rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Input Tìm kiếm */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề, tóm tắt, tác giả hoặc tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Lọc Thể loại */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-gray-300 focus:outline-none focus:border-primary/50"
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value} className="bg-surface text-white">
                {c.label}
              </option>
            ))}
          </select>

          {/* Lọc Trạng thái */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-gray-300 focus:outline-none focus:border-primary/50"
          >
            <option value="ALL" className="bg-surface text-white">Tất cả trạng thái</option>
            <option value="ACTIVE" className="bg-surface text-white">Đang hiển thị</option>
            <option value="INACTIVE" className="bg-surface text-white">Đã tạm ẩn</option>
          </select>

          <button
            onClick={() => {
              setSearch('');
              setSelectedCategory('ALL');
              setSelectedStatus('ALL');
            }}
            title="Tải lại / Xóa bộ lọc"
            className="flex items-center justify-center p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 hover:text-white transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bảng danh sách bài viết (Task: View News List) */}
      <div className="bg-surface/80 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/40 border-b border-white/5 text-gray-400 uppercase text-xs font-semibold tracking-wider">
              <tr>
                <th className="py-4 px-4">Bài viết & Hình ảnh</th>
                <th className="py-4 px-4">Danh mục</th>
                <th className="py-4 px-4">Tác giả & Ngày tạo</th>
                <th className="py-4 px-4 text-center">Lượt xem</th>
                <th className="py-4 px-4 text-center">Trạng thái (Enable/Disable)</th>
                <th className="py-4 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                      <span>Đang tải danh sách bài viết tin tức...</span>
                    </div>
                  </td>
                </tr>
              ) : articles.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Newspaper className="w-10 h-10 text-gray-600" />
                      <p className="font-medium text-gray-300">Không tìm thấy bài viết nào phù hợp</p>
                      <p className="text-xs text-gray-500">Hãy thử đổi từ khóa tìm kiếm hoặc nhấn "Tạo bài viết mới"</p>
                    </div>
                  </td>
                </tr>
              ) : (
                articles.map((article) => (
                  <tr key={article.id} className="hover:bg-white/[0.02] transition-colors group">
                    {/* Ảnh & Tiêu đề */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3.5 max-w-md">
                        <img
                          src={article.imageUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=300&auto=format&fit=crop'}
                          alt={article.title}
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=300&auto=format&fit=crop';
                          }}
                          className="w-16 h-12 object-cover rounded-lg border border-white/10 shrink-0 bg-neutral-900 shadow-sm"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate group-hover:text-primary transition-colors">
                            {article.title}
                          </p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {article.summary || 'Không có tóm tắt'}
                          </p>
                          {article.tags && article.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {article.tags.slice(0, 3).map((tag, idx) => (
                                <span key={idx} className="text-[10px] bg-white/5 text-gray-400 px-1.5 py-0.5 rounded">
                                  #{tag}
                                </span>
                              ))}
                              {article.tags.length > 3 && (
                                <span className="text-[10px] text-gray-500">+{article.tags.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Danh mục */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {renderCategoryBadge(article.category)}
                    </td>

                    {/* Tác giả & Ngày */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-gray-300">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span>{article.author || 'Admin'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {article.createdAt 
                              ? new Date(article.createdAt).toLocaleDateString('vi-VN', {
                                  day: '2-digit', month: '2-digit', year: 'numeric'
                                }) 
                              : 'Vừa xong'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Lượt xem */}
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-300 bg-white/5 px-2.5 py-1 rounded-lg">
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        {(article.views || 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Trạng thái & Toggle (Task: Enable/Disable News Article) */}
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(article)}
                        title={article.active ? 'Bấm để vô hiệu hóa / ẩn bài viết' : 'Bấm để kích hoạt / hiển thị bài viết'}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          article.active
                            ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20 shadow-sm'
                            : 'bg-neutral-800 text-gray-400 border-white/10 hover:bg-neutral-700'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${article.active ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                        <span>{article.active ? 'Đang hiện' : 'Đã ẩn'}</span>
                      </button>
                    </td>

                    {/* Thao tác (Task: View Details, Edit, Delete) */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Xem chi tiết */}
                        <button
                          onClick={() => setPreviewArticle(article)}
                          title="Xem chi tiết bài viết"
                          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Sửa bài viết */}
                        <button
                          onClick={() => handleOpenEdit(article)}
                          title="Chỉnh sửa bài viết"
                          className="p-2 text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Xóa bài viết */}
                        <button
                          onClick={() => setDeleteTarget(article)}
                          title="Xóa bài viết vĩnh viễn"
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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

      {/* MODAL: TẠO / SỬA BÀI VIẾT (Task: Create & Edit News Article) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-[#121212]/95 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary/20 text-primary rounded-lg">
                  <Newspaper className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  {editingArticle ? 'Chỉnh sửa bài viết tin tức' : 'Tạo bài viết tin tức mới'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              {/* Tiêu đề */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Tiêu đề bài viết <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tiêu đề hấp dẫn..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50"
                />
              </div>

              {/* Danh mục & Tác giả */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                    Danh mục chuyên mục <span className="text-primary">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50"
                  >
                    {CATEGORIES.filter(c => c.value !== 'ALL').map(c => (
                      <option key={c.value} value={c.value} className="bg-surface text-white">
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                    Tác giả / Người đăng
                  </label>
                  <input
                    type="text"
                    placeholder="Tên tác giả hoặc Ban biên tập..."
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              {/* URL Hình ảnh & Preview */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Link ảnh bìa bài viết (URL)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50"
                />
                {formData.imageUrl && (
                  <div className="mt-2 relative w-full h-36 bg-black/50 rounded-xl overflow-hidden border border-white/10">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      onError={(e) => { e.target.style.display = 'none'; }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Tóm tắt ngắn */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Mô tả tóm tắt ngắn (Summary)
                </label>
                <textarea
                  rows="2"
                  placeholder="Đoạn văn ngắn gọn xuất hiện trên thẻ tin tức và mạng xã hội..."
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50"
                />
              </div>

              {/* Nội dung chi tiết */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Nội dung chi tiết bài viết <span className="text-primary">*</span>
                </label>
                <textarea
                  rows="6"
                  required
                  placeholder="Nhập nội dung đầy đủ bài viết (hỗ trợ xuống dòng, chia đoạn tự nhiên)..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm font-sans focus:outline-none focus:border-primary/50 leading-relaxed"
                />
              </div>

              {/* Tags & Trạng thái Active */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                    Thẻ Tags (phân cách bằng dấu phẩy)
                  </label>
                  <input
                    type="text"
                    placeholder="Bom tấn, IMAX, Đặt vé sớm..."
                    value={formData.tagsString}
                    onChange={(e) => setFormData({ ...formData, tagsString: e.target.value })}
                    className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>

                <div className="pt-4 flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                  <div>
                    <span className="text-sm font-medium text-white">Hiển thị công khai</span>
                    <p className="text-xs text-gray-400">Cho phép người dùng xem bài viết này trên trang tin tức</p>
                  </div>
                </div>
              </div>

              {/* Nút lưu */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{editingArticle ? 'Lưu thay đổi' : 'Đăng bài viết'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: XEM CHI TIẾT BÀI VIẾT (Task: View News Details) */}
      {previewArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header image banner */}
            <div className="relative h-64 w-full bg-neutral-900">
              <img
                src={previewArticle.imageUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop'}
                alt={previewArticle.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/40 to-transparent" />
              <button
                onClick={() => setPreviewArticle(null)}
                className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-6 right-6">
                <div className="mb-2">
                  {renderCategoryBadge(previewArticle.category)}
                </div>
                <h2 className="text-2xl font-bold text-white drop-shadow-md">
                  {previewArticle.title}
                </h2>
              </div>
            </div>

            {/* Meta info */}
            <div className="px-6 py-3 bg-white/[0.02] border-b border-white/5 flex flex-wrap items-center justify-between text-xs text-gray-400 gap-4">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-primary" />
                  {previewArticle.author || 'CinemaHub Editor'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {previewArticle.createdAt 
                    ? new Date(previewArticle.createdAt).toLocaleString('vi-VN') 
                    : 'Vừa xong'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-blue-400" />
                  {(previewArticle.views || 0).toLocaleString()} lượt xem
                </span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                previewArticle.active ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {previewArticle.active ? 'Đang công khai' : 'Đã ẩn'}
              </span>
            </div>

            {/* Body Content */}
            <div className="p-6 space-y-4">
              {previewArticle.summary && (
                <div className="p-4 bg-primary/10 border-l-4 border-primary rounded-r-xl text-gray-200 text-sm italic font-medium leading-relaxed">
                  {previewArticle.summary}
                </div>
              )}

              <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line space-y-3 font-sans">
                {previewArticle.content}
              </div>

              {previewArticle.tags && previewArticle.tags.length > 0 && (
                <div className="pt-4 border-t border-white/5 flex flex-wrap items-center gap-2">
                  <Tag className="w-4 h-4 text-gray-500" />
                  {previewArticle.tags.map((tag, idx) => (
                    <span key={idx} className="text-xs bg-white/5 text-gray-300 px-2.5 py-1 rounded-lg border border-white/5">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setPreviewArticle(null)}
                className="px-5 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: XÁC NHẬN XÓA (Task: Delete News Article) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121212] border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-white">Xác nhận xóa bài viết?</h3>
              <p className="text-xs text-gray-400">
                Bạn có chắc chắn muốn xóa bài viết <span className="text-white font-semibold">"{deleteTarget.title}"</span>? Hành động này sẽ không thể hoàn tác.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-medium transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                {deleting && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Xóa vĩnh viễn</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

