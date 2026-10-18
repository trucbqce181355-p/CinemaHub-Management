import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageSquare, Star, Search, Filter, AlertTriangle, Eye, EyeOff, 
  Trash2, ShieldAlert, CheckCircle, Film, User, Calendar, RefreshCw, X,
  Clock, ShieldCheck, Flag, Check, Ban, Lock, Tag, AlertCircle, FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = 'http://localhost:5000/api';

const STANDARD_REJECTION_REASONS = [
  'Nội dung chứa ngôn từ thù địch, xúc phạm hoặc thô tục',
  'Quảng cáo rác, spam liên kết ngoài hoặc lừa đảo cá cược',
  'Tiết lộ nội dung phim (Spoiler) mà cố tình không cảnh báo',
  'Thông tin sai lệch, bôi nhọ đoàn làm phim hoặc rạp',
  'Vi phạm tiêu chuẩn cộng đồng CinemaHub'
];

export default function ReviewManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('queue'); // 'queue', 'all'
  const [reviews, setReviews] = useState([]);
  const [queueReviews, setQueueReviews] = useState([]);
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters for All Reviews
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMovie, setFilterMovie] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal Từ chối review (Reject Modal)
  const [selectedReviewToReject, setSelectedReviewToReject] = useState(null);
  const [rejectReason, setRejectReason] = useState(STANDARD_REJECTION_REASONS[0]);
  const [customRejectReason, setCustomRejectReason] = useState('');

  // Modal Khóa quyền đánh giá User (Ban/Restrict Modal)
  const [selectedUserToRestrict, setSelectedUserToRestrict] = useState(null);
  const [restrictDays, setRestrictDays] = useState(7);
  const [restrictReason, setRestrictReason] = useState('Vi phạm tiêu chuẩn đánh giá nhiều lần');

  // Modal Xem chi tiết Reports (Community Reports Modal)
  const [viewingReportsReview, setViewingReportsReview] = useState(null);
  const [reviewReportsList, setReviewReportsList] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [allRes, queueRes, moviesRes] = await Promise.all([
        fetch(`${API_URL}/reviews/admin/all`, {
          headers: { Authorization: `Bearer ${user.token}` }
        }),
        fetch(`${API_URL}/reviews/admin/moderation-queue`, {
          headers: { Authorization: `Bearer ${user.token}` }
        }),
        fetch(`${API_URL}/movies`, {
          headers: { Authorization: `Bearer ${user.token}` }
        })
      ]);

      if (allRes.ok) {
        const data = await allRes.json();
        setReviews(Array.isArray(data) ? data : []);
      }
      if (queueRes.ok) {
        const queueData = await queueRes.json();
        setQueueReviews(Array.isArray(queueData) ? queueData : []);
      }
      if (moviesRes.ok) {
        const moviesData = await moviesRes.json();
        setMovies(Array.isArray(moviesData) ? moviesData : (moviesData.content || []));
      }
    } catch (err) {
      setError('Lỗi khi tải dữ liệu đánh giá: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Thống kê tổng quan
  const stats = useMemo(() => {
    const total = reviews.length;
    const publishedCount = reviews.filter(r => r.status === 'PUBLISHED').length;
    const queueCount = queueReviews.length;
    const rejectedCount = reviews.filter(r => r.status === 'REJECTED').length;
    const avg = total > 0 
      ? (reviews.reduce((sum, r) => sum + (r.rating || 10), 0) / total).toFixed(1)
      : '0.0';
    return { total, publishedCount, queueCount, rejectedCount, avg };
  }, [reviews, queueReviews]);

  // Lọc danh sách All Reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
      if (filterMovie && r.movieId !== filterMovie) return false;
      if (filterRating && r.rating !== Number(filterRating)) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchUser = r.userName?.toLowerCase().includes(q) || r.userEmail?.toLowerCase().includes(q);
        const matchMovie = r.movieTitle?.toLowerCase().includes(q);
        const matchComment = r.comment?.toLowerCase().includes(q);
        const matchTitle = r.title?.toLowerCase().includes(q);
        if (!matchUser && !matchMovie && !matchComment && !matchTitle) return false;
      }
      return true;
    });
  }, [reviews, filterStatus, filterMovie, filterRating, searchTerm]);

  // 1. Phê duyệt (Approve)
  const handleApprove = async (reviewId) => {
    try {
      const res = await fetch(`${API_URL}/reviews/${reviewId}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Không thể phê duyệt');
      }
      setSuccessMsg('Đã phê duyệt đánh giá thành công! Bài viết đã chuyển sang PUBLISHED.');
      setTimeout(() => setSuccessMsg(''), 3000);
      await fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // 2. Từ chối (Reject)
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!selectedReviewToReject) return;
    try {
      const finalReason = customRejectReason.trim() ? customRejectReason.trim() : rejectReason;
      const res = await fetch(`${API_URL}/reviews/${selectedReviewToReject.id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({ reason: finalReason })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Không thể từ chối');
      }
      setSuccessMsg('Đã từ chối bài đánh giá thành công.');
      setSelectedReviewToReject(null);
      setCustomRejectReason('');
      setTimeout(() => setSuccessMsg(''), 3000);
      await fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // 3. Mask Spoiler & Approve
  const handleMaskSpoiler = async (reviewId) => {
    if (!window.confirm('Bật cờ Spoilers cho đánh giá này và phê duyệt hiển thị công khai? Nội dung sẽ được làm mờ ngoài trang phim.')) return;
    try {
      const res = await fetch(`${API_URL}/reviews/${reviewId}/mask-spoiler`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Không thể thao tác');
      }
      setSuccessMsg('Đã gắn cờ Spoilers và phê duyệt đánh giá thành công!');
      setTimeout(() => setSuccessMsg(''), 3000);
      await fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // 4. Khóa quyền đánh giá User (Ban / Restrict)
  const handleConfirmRestrictUser = async (e) => {
    e.preventDefault();
    if (!selectedUserToRestrict) return;
    try {
      const res = await fetch(`${API_URL}/reviews/admin/restrict-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          userId: selectedUserToRestrict.userId,
          days: Number(restrictDays),
          reason: restrictReason
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Không thể khóa quyền');
      }
      setSuccessMsg(`Đã khóa quyền đánh giá của người dùng ${selectedUserToRestrict.userName || selectedUserToRestrict.userEmail} thành công!`);
      setSelectedUserToRestrict(null);
      setTimeout(() => setSuccessMsg(''), 3000);
      await fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // 5. Xem chi tiết báo cáo vi phạm từ cộng đồng
  const handleViewReports = async (review) => {
    setViewingReportsReview(review);
    setLoadingReports(true);
    try {
      const res = await fetch(`${API_URL}/reviews/${review.id}/reports`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReviewReportsList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReports(false);
    }
  };

  // 6. Xóa vĩnh viễn review
  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn XÓA VĨNH VIỄN đánh giá này? Điểm trung bình của phim sẽ được tính toán lại.')) return;
    try {
      const res = await fetch(`${API_URL}/reviews/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (!res.ok) throw new Error('Không thể xóa đánh giá');
      setSuccessMsg('Đã xóa đánh giá thành công.');
      setTimeout(() => setSuccessMsg(''), 3000);
      await fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (isLoading) return <div className="text-white p-6">Đang tải dữ liệu kiểm duyệt...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <span>Kiểm Duyệt Đánh Giá Phim</span>
            {stats.queueCount > 0 && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                {stats.queueCount} cần duyệt
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Hàng đợi kiểm duyệt tự động, xử lý báo cáo vi phạm cộng đồng và quản lý đánh giá khán giả.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-4 py-2 rounded-xl transition-all border border-white/10 text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Làm mới
        </button>
      </div>

      {/* Thông báo thành công */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Thống kê nhanh */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#141414] border border-white/10 p-4 rounded-2xl">
          <div className="text-xs text-gray-400 uppercase tracking-wider">Hàng Đợi Kiểm Duyệt</div>
          <div className="text-2xl font-bold text-amber-400 mt-1 flex items-center gap-2">
            <span>{stats.queueCount}</span>
            <span className="text-xs font-normal text-gray-400">bài chờ</span>
          </div>
        </div>

        <div className="bg-[#141414] border border-white/10 p-4 rounded-2xl">
          <div className="text-xs text-gray-400 uppercase tracking-wider">Đã Xuất Bản (Public)</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 flex items-center gap-2">
            <span>{stats.publishedCount}</span>
            <span className="text-xs font-normal text-gray-400">bài</span>
          </div>
        </div>

        <div className="bg-[#141414] border border-white/10 p-4 rounded-2xl">
          <div className="text-xs text-gray-400 uppercase tracking-wider">Đã Từ Chối / Vi Phạm</div>
          <div className="text-2xl font-bold text-red-400 mt-1 flex items-center gap-2">
            <span>{stats.rejectedCount}</span>
            <span className="text-xs font-normal text-gray-400">bài</span>
          </div>
        </div>

        <div className="bg-[#141414] border border-white/10 p-4 rounded-2xl">
          <div className="text-xs text-gray-400 uppercase tracking-wider">Tổng Đánh Giá</div>
          <div className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
            <span>{stats.total}</span>
            <span className="text-xs font-normal text-gray-400">Điểm TB: {stats.avg}/10</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'queue'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Hàng Đợi Kiểm Duyệt (Moderation Queue)</span>
          {stats.queueCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-black/30 text-black font-extrabold">
              {stats.queueCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'all'
              ? 'bg-primary text-white shadow-lg shadow-red-500/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Tất Cả Đánh Giá ({reviews.length})</span>
        </button>
      </div>

      {/* TAB 1: MODERATION QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Hàng đợi gom các đánh giá dính từ khóa nghi vấn, spam liên kết hoặc bị cộng đồng báo cáo (≥3 lượt).</span>
            <span>Hiển thị: <strong>{queueReviews.length}</strong> mục</span>
          </div>

          {queueReviews.length === 0 ? (
            <div className="text-center py-16 bg-[#141414] rounded-2xl border border-white/10 space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto opacity-70" />
              <h3 className="text-base font-bold text-white">Hàng đợi kiểm duyệt đang trống!</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Hiện tại không có đánh giá nào bị nghi vấn từ khóa vi phạm hoặc bị cộng đồng báo cáo.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {queueReviews.map((rev) => {
                const hasReports = rev.reportCount && rev.reportCount > 0;
                return (
                  <div 
                    key={rev.id}
                    className="p-5 rounded-2xl bg-[#141414] border border-amber-500/30 hover:border-amber-500/50 transition-colors space-y-4 shadow-xl"
                  >
                    {/* Header Item */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                          {rev.rating}đ
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-base">{rev.movieTitle}</span>
                            {rev.isVerifiedWatcher && (
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                                <ShieldCheck className="w-3 h-3" /> Khán giả đã xem rạp
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                            <span>Người gửi: <strong className="text-gray-300">{rev.userName}</strong> ({rev.userEmail})</span>
                            <span>•</span>
                            <span>{formatDateTime(rev.createdAt)}</span>
                            {rev.bookingId && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-gray-500">Mã đặt chỗ: #{rev.bookingId.substring(0, 8)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Badges lý do đưa vào hàng đợi */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {rev.flaggedKeywords && rev.flaggedKeywords.length > 0 && (
                          <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Từ khóa nghi vấn: {rev.flaggedKeywords.join(', ')}
                          </span>
                        )}

                        {hasReports && (
                          <button
                            onClick={() => handleViewReports(rev)}
                            className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium transition-colors cursor-pointer"
                          >
                            <Flag className="w-3.5 h-3.5" />
                            {rev.reportCount} lượt báo cáo vi phạm (Xem chi tiết)
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Nội dung Review */}
                    <div className="space-y-2">
                      {rev.title && (
                        <h4 className="font-bold text-white text-sm">
                          Tiêu đề: {rev.title}
                        </h4>
                      )}

                      <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 text-gray-200 text-sm leading-relaxed">
                        {rev.comment}
                      </div>

                      {rev.violationReason && (
                        <div className="text-xs text-amber-400/90 italic flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Ghi chú hệ thống: {rev.violationReason}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons for Manager */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        {/* Khóa quyền User */}
                        <button
                          onClick={() => setSelectedUserToRestrict({ userId: rev.userId, userName: rev.userName, userEmail: rev.userEmail })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-300 border border-white/10 hover:border-red-500/30 text-xs transition-colors"
                        >
                          <Ban className="w-3.5 h-3.5" /> Khóa quyền đánh giá user
                        </button>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {/* Từ chối (Reject) */}
                        <button
                          onClick={() => setSelectedReviewToReject(rev)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold transition-colors"
                        >
                          <X className="w-4 h-4" /> Từ chối bài viết
                        </button>

                        {/* Mask Spoiler & Approve */}
                        <button
                          onClick={() => handleMaskSpoiler(rev.id)}
                          title="Bật cảnh báo Spoilers và phê duyệt hiển thị"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors"
                        >
                          <EyeOff className="w-4 h-4" /> Bật cờ Spoilers & Duyệt
                        </button>

                        {/* Phê duyệt (Approve) */}
                        <button
                          onClick={() => handleApprove(rev.id)}
                          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
                        >
                          <Check className="w-4 h-4" /> Phê duyệt (Publish)
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL REVIEWS (Tìm kiếm & Quản trị toàn diện) */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-[#141414] rounded-2xl border border-white/10">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm user, phim, nhận xét..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white text-xs focus:outline-none focus:border-primary"
              />
            </div>

            {/* Filter Movie */}
            <div>
              <select
                value={filterMovie}
                onChange={(e) => setFilterMovie(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-primary"
              >
                <option value="">Tất cả các phim</option>
                {movies.map((m) => (
                  <option key={m.id || m._id} value={m.id || m._id}>{m.title}</option>
                ))}
              </select>
            </div>

            {/* Filter Status */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-primary"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PUBLISHED">PUBLISHED (Đã duyệt / Công khai)</option>
                <option value="PENDING_MODERATION">PENDING_MODERATION (Chờ duyệt)</option>
                <option value="REJECTED">REJECTED (Bị từ chối)</option>
                <option value="HIDDEN">HIDDEN (Đã ẩn)</option>
              </select>
            </div>

            {/* Filter Rating */}
            <div>
              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-primary"
              >
                <option value="">Tất cả mức điểm</option>
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>{r} điểm</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table List */}
          <div className="bg-[#141414] rounded-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1a1a1a] text-gray-400 uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Phim & Khán giả</th>
                    <th className="py-3 px-4">Điểm số</th>
                    <th className="py-3 px-4">Nội dung nhận xét</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4">Thời gian</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {filteredReviews.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-gray-500">
                        Không tìm thấy đánh giá nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredReviews.map((r) => (
                      <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white text-sm">{r.movieTitle}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            {r.userName} ({r.userEmail})
                          </div>
                          {r.isVerifiedWatcher && (
                            <span className="inline-block mt-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-medium">
                              ✓ Verified Watcher
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 font-bold text-amber-400">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span>{r.rating}/10</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 max-w-xs">
                          {r.title && (
                            <div className="font-semibold text-white truncate text-xs">{r.title}</div>
                          )}
                          <div className="line-clamp-2 text-gray-300 text-xs mt-0.5">{r.comment}</div>
                          {r.isSpoiler && (
                            <span className="inline-block mt-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">
                              ⚠️ Spoiler
                            </span>
                          )}
                          {r.violationReason && (
                            <div className="text-[11px] text-red-400 italic mt-0.5">
                              Lý do: {r.violationReason}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {r.status === 'PUBLISHED' && (
                            <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                              PUBLISHED
                            </span>
                          )}
                          {r.status === 'PENDING_MODERATION' && (
                            <span className="text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
                              PENDING
                            </span>
                          )}
                          {r.status === 'REJECTED' && (
                            <span className="text-[11px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-medium">
                              REJECTED
                            </span>
                          )}
                          {r.status === 'HIDDEN' && (
                            <span className="text-[11px] bg-gray-500/10 text-gray-400 border border-gray-500/20 px-2 py-0.5 rounded-full font-medium">
                              HIDDEN
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-gray-400 text-[11px]">
                          {formatDateTime(r.createdAt)}
                        </td>

                        <td className="py-3 px-4 text-right space-x-1">
                          {r.status !== 'PUBLISHED' && (
                            <button
                              onClick={() => handleApprove(r.id)}
                              title="Phê duyệt bài viết"
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {r.status === 'PUBLISHED' && (
                            <button
                              onClick={() => setSelectedReviewToReject(r)}
                              title="Từ chối / Gỡ bài viết"
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(r.id)}
                            title="Xóa vĩnh viễn"
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: TỪ CHỐI REVIEW (REJECT MODAL) */}
      {selectedReviewToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#181818] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <X className="w-4 h-4 text-red-500" />
                <span>Từ chối bài đánh giá</span>
              </h3>
              <button
                onClick={() => setSelectedReviewToReject(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div className="text-xs text-gray-400">
                Từ chối đánh giá của <strong className="text-white">{selectedReviewToReject.userName}</strong>:
                <div className="mt-1 p-2 bg-black/40 rounded-lg text-gray-300 italic line-clamp-2">
                  &quot;{selectedReviewToReject.comment}&quot;
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Chọn lý do vi phạm theo danh mục chuẩn:
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-[#222] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-primary"
                >
                  {STANDARD_REJECTION_REASONS.map((reason, idx) => (
                    <option key={idx} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Hoặc ghi chú lý do tùy chỉnh:
                </label>
                <textarea
                  rows={2}
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                  placeholder="Nhập lý do cụ thể gửi đến người dùng..."
                  className="w-full bg-[#222] border border-white/10 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReviewToReject(null)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white font-medium px-5 py-2 rounded-xl text-xs transition-colors"
                >
                  Xác nhận Từ chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: KHÓA QUYỀN ĐÁNH GIÁ CỦA USER */}
      {selectedUserToRestrict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#181818] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-500" />
                <span>Khóa quyền đánh giá tài khoản</span>
              </h3>
              <button
                onClick={() => setSelectedUserToRestrict(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRestrictUser} className="space-y-4">
              <div className="text-xs text-gray-400">
                Tài khoản: <strong className="text-white">{selectedUserToRestrict.userName}</strong> ({selectedUserToRestrict.userEmail})
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Thời hạn khóa quyền:
                </label>
                <select
                  value={restrictDays}
                  onChange={(e) => setRestrictDays(e.target.value)}
                  className="w-full bg-[#222] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-primary"
                >
                  <option value={7}>7 ngày</option>
                  <option value={30}>30 ngày</option>
                  <option value={90}>90 ngày</option>
                  <option value={0}>Vĩnh viễn (Permanent Ban)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Lý do xử phạt:
                </label>
                <textarea
                  rows={2}
                  required
                  value={restrictReason}
                  onChange={(e) => setRestrictReason(e.target.value)}
                  className="w-full bg-[#222] border border-white/10 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserToRestrict(null)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white font-medium px-5 py-2 rounded-xl text-xs transition-colors"
                >
                  Xác nhận Khóa quyền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: XEM CHI TIẾT BÁO CÁO CỘNG ĐỒNG */}
      {viewingReportsReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#181818] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Flag className="w-4 h-4 text-red-500" />
                <span>Chi tiết các báo cáo từ cộng đồng ({reviewReportsList.length})</span>
              </h3>
              <button
                onClick={() => setViewingReportsReview(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-gray-300 p-3 bg-black/40 rounded-xl border border-white/5">
              Đánh giá của <strong className="text-white">{viewingReportsReview.userName}</strong>: &quot;{viewingReportsReview.comment}&quot;
            </div>

            {loadingReports ? (
              <div className="text-center py-6 text-gray-400 text-xs">Đang tải danh sách báo cáo...</div>
            ) : reviewReportsList.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs">Chưa có bản ghi báo cáo chi tiết nào.</div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
                {reviewReportsList.map((rep) => (
                  <div key={rep.id} className="p-3 rounded-xl bg-[#222] border border-white/5 text-xs space-y-1">
                    <div className="flex items-center justify-between text-gray-400">
                      <span className="font-semibold text-white">{rep.reporterUserName || rep.reporterEmail || 'Khán giả'}</span>
                      <span>{formatDateTime(rep.createdAt)}</span>
                    </div>
                    <div className="text-red-400 font-medium">Lý do: {rep.reason}</div>
                    {rep.description && (
                      <div className="text-gray-300 italic">&quot;{rep.description}&quot;</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setViewingReportsReview(null)}
                className="px-5 py-2 rounded-xl text-xs bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
