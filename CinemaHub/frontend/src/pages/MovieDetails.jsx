import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Play, Ticket, Clock, Calendar as CalendarIcon, Info, Star, 
  MessageSquare, Send, Sparkles, AlertCircle, CheckCircle, Flame,
  ShieldCheck, Eye, EyeOff, Flag, Edit3, Trash2, AlertTriangle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:5000/api';

const AVAILABLE_MOOD_TAGS = [
  'Hài hước', 'Kịch tính', 'Đồ họa đỉnh', 'Cảm động', 
  'Kinh dị', 'Hành động mãn nhãn', 'Nhạc phim hay', 'Diễn xuất đỉnh'
];

const REPORT_REASONS = [
  { value: 'INAPPROPRIATE_LANGUAGE', label: 'Ngôn từ phản cảm, thù địch hoặc thô tục' },
  { value: 'SPAM', label: 'Spam, quảng cáo rác, link cá cược/lừa đảo' },
  { value: 'SPOILER', label: 'Tiết lộ nội dung phim (Spoiler) mà không cảnh báo' },
  { value: 'HARASSMENT', label: 'Quấy rối, bôi nhọ người khác hoặc thông tin sai lệch' },
  { value: 'OTHER', label: 'Lý do vi phạm khác' }
];

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('detail'); // 'detail', 'trailer', 'reviews'

  // Reviews & Stats state
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ 
    averageRating: 0, 
    averageScore: 0,
    totalReviews: 0, 
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } 
  });

  // Eligibility state
  const [eligibility, setEligibility] = useState({
    canReview: false,
    hasReviewed: false,
    canEdit: false,
    reason: '',
    message: '',
    review: null,
    isVerifiedWatcher: false
  });
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [ratingInput, setRatingInput] = useState(10); // 1 to 10
  const [hoverRating, setHoverRating] = useState(0);
  const [titleInput, setTitleInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSpoilerInput, setIsSpoilerInput] = useState(false);

  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Spoilers unmasked in UI
  const [unmaskedReviews, setUnmaskedReviews] = useState(new Set());

  // Report Modal state
  const [reportingReview, setReportingReview] = useState(null);
  const [reportReason, setReportReason] = useState('INAPPROPRIATE_LANGUAGE');
  const [reportDesc, setReportDesc] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');

  // Recommended movies state
  const [recommendedMovies, setRecommendedMovies] = useState([]);

  useEffect(() => {
    fetchMovieDetails();
    fetchReviewsAndStats();
    fetchRecommendations();
  }, [id]);

  useEffect(() => {
    fetchEligibility();
  }, [id, user]);

  const fetchMovieDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/movies/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'DISABLED') {
          navigate('/', { state: { message: 'Phim này đã ngừng chiếu hoặc không khả dụng!' } });
          return;
        }
        setMovie(data);
      }
    } catch (error) {
      console.error("Lỗi khi tải thông tin phim:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewsAndStats = async () => {
    try {
      const [revRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/reviews/movie/${id}`),
        fetch(`${API_URL}/reviews/movie/${id}/stats`)
      ]);
      if (revRes.ok) {
        const revData = await revRes.json();
        setReviews(Array.isArray(revData) ? revData : []);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error("Lỗi khi tải đánh giá phim:", err);
    }
  };

  const fetchEligibility = async () => {
    if (!user || !user.token) {
      setEligibility({
        canReview: false,
        hasReviewed: false,
        reason: 'NOT_LOGGED_IN',
        message: 'Vui lòng đăng nhập tài khoản để có thể đánh giá và bình luận phim.',
        isVerifiedWatcher: false
      });
      return;
    }

    try {
      setIsCheckingEligibility(true);
      const res = await fetch(`${API_URL}/reviews/movie/${id}/eligibility`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEligibility(data);

        // Nếu đã có review hiện tại
        if (data.hasReviewed && data.review) {
          setRatingInput(data.review.rating || 10);
          setTitleInput(data.review.title || '');
          setCommentInput(data.review.comment || '');
          setSelectedTags(data.review.tags || []);
          setIsSpoilerInput(Boolean(data.review.isSpoiler));
        }
      }
    } catch (e) {
      console.error("Lỗi khi kiểm tra quyền đánh giá:", e);
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const res = await fetch(`${API_URL}/reviews/recommendations?excludeMovieId=${id}&limit=4`);
      if (res.ok) {
        const data = await res.json();
        setRecommendedMovies(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Lỗi khi tải phim gợi ý:", err);
    }
  };

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const toggleUnmaskSpoiler = (reviewId) => {
    setUnmaskedReviews(prev => {
      const next = new Set(prev);
      if (next.has(reviewId)) {
        next.delete(reviewId);
      } else {
        next.add(reviewId);
      }
      return next;
    });
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    if (commentInput.trim().length < 20) {
      setReviewError('Nội dung nhận xét tối thiểu 20 ký tự (chống spam).');
      return;
    }
    if (commentInput.trim().length > 1000) {
      setReviewError('Nội dung nhận xét tối đa 1.000 ký tự.');
      return;
    }

    setReviewError('');
    setReviewSuccess('');
    setIsSubmittingReview(true);

    try {
      const isUpdating = Boolean(eligibility.hasReviewed && eligibility.review);
      const url = isUpdating 
        ? `${API_URL}/reviews/${eligibility.review.id}` 
        : `${API_URL}/reviews`;
      const method = isUpdating ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          movieId: id,
          rating: ratingInput,
          title: titleInput,
          comment: commentInput,
          tags: selectedTags,
          isSpoiler: isSpoilerInput
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể gửi đánh giá');
      }

      if (data.status === 'PUBLISHED') {
        setReviewSuccess(isUpdating ? 'Cập nhật đánh giá thành công!' : 'Đánh giá của bạn đã được xuất bản công khai!');
      } else if (data.status === 'PENDING_MODERATION') {
        setReviewSuccess('Đánh giá của bạn đang được chuyển đến Ban kiểm duyệt do chứa từ khóa nghi vấn.');
      } else if (data.status === 'REJECTED') {
        setReviewError(`Đánh giá bị từ chối tự động: ${data.violationReason || 'Nội dung vi phạm tiêu chuẩn cộng đồng'}`);
      }

      setIsEditing(false);
      await fetchReviewsAndStats();
      await fetchEligibility();
      setTimeout(() => setReviewSuccess(''), 5000);
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!eligibility.review) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài đánh giá này?')) return;

    try {
      const res = await fetch(`${API_URL}/reviews/${eligibility.review.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Không thể xóa đánh giá');
      }
      setReviewSuccess('Đã xóa bài đánh giá thành công.');
      setIsEditing(false);
      setTitleInput('');
      setCommentInput('');
      setSelectedTags([]);
      setRatingInput(10);
      setIsSpoilerInput(false);
      await fetchReviewsAndStats();
      await fetchEligibility();
      setTimeout(() => setReviewSuccess(''), 4000);
    } catch (e) {
      setReviewError(e.message);
    }
  };

  const handleOpenReportModal = (review) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setReportingReview(review);
    setReportReason('INAPPROPRIATE_LANGUAGE');
    setReportDesc('');
    setReportError('');
    setReportSuccess('');
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportingReview) return;
    setIsSubmittingReport(true);
    setReportError('');
    setReportSuccess('');

    try {
      const res = await fetch(`${API_URL}/reviews/${reportingReview.id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          reason: reportReason,
          description: reportDesc
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể gửi báo cáo');
      }

      setReportSuccess(data.message || 'Báo cáo vi phạm đã được ghi nhận.');
      await fetchReviewsAndStats();
      setTimeout(() => {
        setReportingReview(null);
      }, 2000);
    } catch (err) {
      setReportError(err.message);
    } finally {
      setIsSubmittingReport(false);
    }
  };

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

  const getEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('embed')) return url;
    if (url.includes('watch?v=')) return url.replace('watch?v=', 'embed/');
    if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/');
    return url;
  };

  const formatReviewDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Header Title */}
        <div className="border-b-2 border-white/10 mb-8 pb-4 flex items-center justify-between">
          <h1 className="text-3xl font-display font-bold text-white uppercase tracking-wider">
            Nội Dung Phim
          </h1>
          {stats.totalReviews > 0 && (
            <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-2xl">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <div>
                <span className="text-sm font-bold text-amber-400">
                  {stats.averageScore ? `${stats.averageScore}/10` : `${stats.averageRating}/5.0`}
                </span>
                <span className="text-xs text-gray-400 ml-2">({stats.totalReviews} đánh giá)</span>
              </div>
            </div>
          )}
        </div>

        {/* Main Content (Poster + Details) */}
        <div className="flex flex-col md:flex-row gap-8 mb-12">
          {/* Poster */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full md:w-1/3 lg:w-1/4 shrink-0"
          >
            <div className="rounded-xl overflow-hidden border-2 border-white/5 shadow-2xl relative group">
              <img 
                src={movie.posterUrl || movie.image || '/images/default-poster.jpg'} 
                alt={movie.title}
                className="w-full aspect-[2/3] object-cover"
              />
              {stats.averageRating > 0 && (
                <div className="absolute top-3 right-3 bg-black/85 backdrop-blur-md border border-amber-500/40 text-amber-400 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-lg">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span className="text-xs font-bold">{stats.averageScore || (stats.averageRating * 2).toFixed(1)}/10</span>
                </div>
              )}
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
              <p><strong className="text-white w-28 inline-block">Đánh giá:</strong> 
                <span className="inline-flex items-center gap-1.5 text-amber-400 font-bold ml-1">
                  <Star className="w-4 h-4 fill-amber-400 inline" />
                  {stats.totalReviews > 0 
                    ? `${stats.averageScore || (stats.averageRating * 2).toFixed(1)} / 10 điểm (${stats.totalReviews} lượt)` 
                    : 'Chưa có đánh giá'}
                </span>
              </p>
              
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
            <div className="mt-8 flex items-center gap-4">
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

              <button
                onClick={() => {
                  setActiveTab('reviews');
                  const el = document.getElementById('tabs-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white font-medium py-3 px-6 rounded-lg transition-colors border border-white/10 text-sm"
              >
                <MessageSquare className="w-4 h-4 text-primary" /> Đánh Giá & Nhận Xét
              </button>
            </div>
          </motion.div>
        </div>

        {/* Tabs: Chi tiết | Trailer | Đánh giá & Bình luận */}
        <div id="tabs-section" className="w-full mt-12">
          {/* Tab Headers */}
          <div className="flex justify-center mb-8 relative">
            <div className="flex flex-wrap items-center justify-center gap-3 bg-[#1a1a1a] p-1.5 rounded-2xl border border-white/10 shadow-lg">
              <button 
                onClick={() => setActiveTab('detail')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${
                  activeTab === 'detail' ? 'bg-[#e31837] text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Info className="w-4 h-4" /> Chi tiết
              </button>

              <button 
                onClick={() => setActiveTab('trailer')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${
                  activeTab === 'trailer' ? 'bg-[#e31837] text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Play className="w-4 h-4" /> Trailer
              </button>

              <button 
                onClick={() => setActiveTab('reviews')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${
                  activeTab === 'reviews' ? 'bg-[#e31837] text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4" /> 
                <span>Đánh giá & Bình luận</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {stats.totalReviews}
                </span>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-[#1a1a1a] p-6 md:p-8 rounded-2xl border border-white/5 shadow-xl">
            {activeTab === 'detail' && (
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
            )}

            {activeTab === 'trailer' && (
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

            {activeTab === 'reviews' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* 1. Rating Stats Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl bg-[#141414] border border-white/10 items-center">
                  {/* Điểm TB */}
                  <div className="text-center md:border-r border-white/10 md:pr-6">
                    <div className="text-5xl font-extrabold text-amber-400 font-display">
                      {stats.totalReviews > 0 ? (stats.averageScore || (stats.averageRating * 2).toFixed(1)) : '10'}
                      <span className="text-2xl text-gray-500 font-normal">/10</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 my-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`w-5 h-5 ${
                            star <= Math.round(stats.averageRating || 5)
                              ? 'text-amber-400 fill-amber-400' 
                              : 'text-gray-600'
                          }`} 
                        />
                      ))}
                    </div>
                    <div className="text-xs text-gray-400">
                      Tương đương {stats.averageRating || 5.0}/5.0 sao ({stats.totalReviews} lượt đánh giá)
                    </div>
                  </div>

                  {/* Thanh phân bố sao */}
                  <div className="space-y-1.5 md:col-span-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = stats.distribution?.[star] ?? stats.distribution?.[String(star)] ?? 0;
                      const percent = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-3 text-xs">
                          <span className="w-12 text-gray-400 flex items-center gap-1 shrink-0">
                            {star} <Star className="w-3 h-3 text-amber-400 fill-amber-400 inline" />
                          </span>
                          <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                          <span className="w-8 text-right text-gray-500 font-mono text-[11px] shrink-0">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Review Form & Eligibility Section */}
                <div className="p-6 rounded-2xl bg-[#141414] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span>
                        {eligibility.hasReviewed && !isEditing 
                          ? 'Đánh giá của bạn' 
                          : (isEditing ? 'Chỉnh sửa bài đánh giá (Trong vòng 48h)' : 'Viết đánh giá & Nhận xét')}
                      </span>
                    </h3>

                    {eligibility.isVerifiedWatcher && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full font-medium">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        Khán giả đã xem rạp (Verified Watcher)
                      </span>
                    )}
                  </div>

                  {/* Thông báo thành công / lỗi */}
                  {reviewSuccess && (
                    <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>{reviewSuccess}</span>
                    </div>
                  )}

                  {reviewError && (
                    <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{reviewError}</span>
                    </div>
                  )}

                  {/* TH1: Người dùng chưa đăng nhập */}
                  {!user ? (
                    <div className="text-center py-6 text-sm text-gray-400 space-y-3">
                      <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto opacity-70" />
                      <p>Vui lòng đăng nhập tài khoản để có thể đánh giá và bình luận về bộ phim này.</p>
                      <Link 
                        to="/login" 
                        className="inline-flex items-center gap-2 bg-primary hover:bg-red-700 text-white font-medium px-5 py-2 rounded-xl transition-colors text-xs shadow-md"
                      >
                        Đăng nhập ngay
                      </Link>
                    </div>
                  ) : eligibility.hasReviewed && !isEditing ? (
                    /* TH2: Người dùng đã đánh giá phim này -> Hiển thị card review của chính họ */
                    <div className="p-4 rounded-xl bg-[#1c1c1c] border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <span className="text-sm font-bold text-amber-400">{eligibility.review?.rating} / 10 điểm</span>
                          </div>
                          {eligibility.review?.status === 'PUBLISHED' && (
                            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                              ✓ Đã xuất bản công khai
                            </span>
                          )}
                          {eligibility.review?.status === 'PENDING_MODERATION' && (
                            <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                              ⏳ Đang chờ Quản trị viên duyệt
                            </span>
                          )}
                          {eligibility.review?.status === 'REJECTED' && (
                            <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full">
                              ✕ Bị từ chối: {eligibility.review?.violationReason}
                            </span>
                          )}
                        </div>

                        {/* Nút Sửa / Xóa */}
                        <div className="flex items-center gap-2">
                          {eligibility.canEdit ? (
                            <button
                              onClick={() => setIsEditing(true)}
                              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-white hover:bg-primary/30 border border-primary/40 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa
                            </button>
                          ) : (
                            <span className="text-[11px] text-gray-500">
                              (Hết thời hạn 48h chỉnh sửa)
                            </span>
                          )}

                          <button
                            onClick={handleDeleteReview}
                            className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-white hover:bg-red-500/30 border border-red-500/40 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Xóa
                          </button>
                        </div>
                      </div>

                      {eligibility.review?.title && (
                        <h4 className="font-bold text-white text-sm">
                          {eligibility.review.title}
                        </h4>
                      )}

                      <p className="text-gray-300 text-sm leading-relaxed">
                        {eligibility.review?.comment}
                      </p>

                      {eligibility.review?.tags && eligibility.review.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {eligibility.review.tags.map((t, idx) => (
                            <span key={idx} className="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-gray-400">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}

                      {eligibility.review?.editHistory && eligibility.review.editHistory.length > 0 && (
                        <div className="text-[11px] text-gray-500 pt-2 border-t border-white/5">
                          Đã chỉnh sửa {eligibility.review.editHistory.length} lần (Lần sửa gần nhất: {formatReviewDate(eligibility.review.updatedAt)})
                        </div>
                      )}
                    </div>
                  ) : !eligibility.canReview && !isEditing ? (
                    /* TH3: Người dùng KHÔNG đủ điều kiện (Chưa mua vé / Chưa kết thúc suất chiếu / Bị khóa) */
                    <div className="p-5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center space-y-3">
                      <div className="inline-flex p-3 rounded-full bg-amber-500/10 text-amber-400">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <h4 className="text-white font-bold text-sm">
                        Quy tắc &quot;Khán Giả Đã Xem Tại Rạp&quot; (Verified Watcher)
                      </h4>
                      <p className="text-xs text-gray-300 max-w-lg mx-auto leading-relaxed">
                        {eligibility.message || 'Để đảm bảo tính khách quan và chống thao túng điểm số, chỉ khán giả đã mua vé và thưởng thức xong bộ phim mới có thể để lại đánh giá.'}
                      </p>
                      
                      {eligibility.reason === 'NO_BOOKING' && (
                        <div className="pt-2">
                          <Link 
                            to={`/booking/${movie._id || movie.id}`} 
                            className="inline-flex items-center gap-2 bg-[#e31837] hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors"
                          >
                            <Ticket className="w-4 h-4" /> Đặt Vé Xem Phim Ngay
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* TH4: Người dùng ĐỦ ĐIỀU KIỆN hoặc ĐANG CHỈNH SỬA -> Hiển thị form đánh giá chuẩn */
                    <form onSubmit={handleSubmitReview} className="space-y-4 pt-1">
                      {/* Chọn điểm số từ 1 đến 10 */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-medium text-gray-300">
                            Chấm điểm bộ phim (Thang điểm 1 - 10):
                          </label>
                          <span className="text-sm font-bold text-amber-400 font-mono">
                            {ratingInput} / 10 điểm ({Math.round(ratingInput / 2 * 10) / 10} sao)
                          </span>
                        </div>

                        {/* Nút bấm nhanh 1 -> 10 */}
                        <div className="grid grid-cols-10 gap-1 sm:gap-2">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setRatingInput(num)}
                              onMouseEnter={() => setHoverRating(num)}
                              onMouseLeave={() => setHoverRating(0)}
                              className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                                (hoverRating || ratingInput) >= num
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.2)]'
                                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tiêu đề đánh giá */}
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">
                          Tiêu đề nhận xét (tối đa 150 ký tự):
                        </label>
                        <input
                          type="text"
                          maxLength={150}
                          value={titleInput}
                          onChange={(e) => setTitleInput(e.target.value)}
                          placeholder="Ví dụ: Kỹ xảo choáng ngợp, cốt truyện bất ngờ..."
                          className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>

                      {/* Tag cảm xúc */}
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1.5">
                          Chọn cảm xúc nổi bật về phim:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {AVAILABLE_MOOD_TAGS.map((tag) => {
                            const isSelected = selectedTags.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                className={`text-xs px-3 py-1 rounded-full border transition-all ${
                                  isSelected
                                    ? 'bg-primary/20 border-primary text-white font-medium shadow-[0_0_10px_rgba(229,9,20,0.3)]'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                                }`}
                              >
                                + {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Comment input with char count */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-medium text-gray-300">
                            Nội dung đánh giá & cảm nhận (20 - 1.000 ký tự):
                          </label>
                          <span className={`text-[11px] font-mono ${commentInput.trim().length < 20 ? 'text-amber-400' : 'text-gray-400'}`}>
                            {commentInput.trim().length} / 1000 ký tự {commentInput.trim().length < 20 && '(tối thiểu 20 ký tự)'}
                          </span>
                        </div>
                        <textarea
                          required
                          rows={4}
                          maxLength={1000}
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          placeholder="Hãy chia sẻ cảm nhận chi tiết về kịch bản, diễn xuất, âm thanh, hình ảnh và trải nghiệm tại rạp..."
                          className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm leading-relaxed placeholder:text-gray-600"
                        />
                      </div>

                      {/* Spoiler Checkbox */}
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
                        <input
                          type="checkbox"
                          id="spoilerCheck"
                          checked={isSpoilerInput}
                          onChange={(e) => setIsSpoilerInput(e.target.checked)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary bg-black border-white/30"
                        />
                        <label htmlFor="spoilerCheck" className="text-xs text-gray-300 select-none cursor-pointer">
                          <strong className="text-amber-400">Cảnh báo Spoilers:</strong> Nội dung nhận xét có tiết lộ tình tiết cốt truyện quan trọng của phim.
                        </label>
                      </div>

                      {/* Submit / Cancel Buttons */}
                      <div className="flex items-center justify-end gap-3 pt-2">
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            Hủy
                          </button>
                        )}

                        <button
                          type="submit"
                          disabled={isSubmittingReview || commentInput.trim().length < 20}
                          className="inline-flex items-center gap-2 bg-primary hover:bg-red-700 text-white font-medium px-6 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(229,9,20,0.3)] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="w-4 h-4" />
                          <span>{isSubmittingReview ? 'Đang gửi...' : (isEditing ? 'Lưu chỉnh sửa' : 'Gửi đánh giá')}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* 3. Danh sách Đánh giá của Khán giả */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center justify-between border-b border-white/5 pb-2">
                    <span>Nhận xét từ khán giả ({reviews.length})</span>
                    <span className="text-xs text-gray-400 font-normal">Chỉ hiển thị các đánh giá đã kiểm duyệt</span>
                  </h3>

                  {reviews.length > 0 ? (
                    <div className="space-y-3">
                      {reviews.map((r) => {
                        const isMe = user && r.userId === user.id;
                        const isSpoiler = Boolean(r.isSpoiler);
                        const isUnmasked = unmaskedReviews.has(r.id);

                        return (
                          <div 
                            key={r.id}
                            className={`p-4 rounded-2xl border transition-colors ${
                              isMe 
                                ? 'bg-primary/[0.04] border-primary/30' 
                                : 'bg-[#141414] border-white/5'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-orange-500 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md">
                                  {r.userName?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-white text-sm">
                                      {r.userName || 'Khán giả'}
                                    </span>
                                    {isMe && (
                                      <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.2 rounded font-medium">
                                        Bạn
                                      </span>
                                    )}
                                    {r.isVerifiedWatcher && (
                                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                                        <ShieldCheck className="w-3 h-3" /> Đã xem tại rạp
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-gray-500 mt-0.5">
                                    {formatReviewDate(r.createdAt)}
                                  </div>
                                </div>
                              </div>

                              {/* Sao / Điểm số */}
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                  <span className="text-xs font-bold text-amber-400">
                                    {r.rating} / 10
                                  </span>
                                </div>

                                {/* Nút Báo Cáo Vi Phạm (nếu không phải review của chính mình) */}
                                {!isMe && (
                                  <button
                                    onClick={() => handleOpenReportModal(r)}
                                    title="Báo cáo đánh giá vi phạm"
                                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                                  >
                                    <Flag className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Tiêu đề nhận xét */}
                            {r.title && (
                              <h4 className="font-bold text-white text-sm mt-3 pl-12">
                                {r.title}
                              </h4>
                            )}

                            {/* Nội dung nhận xét (Xử lý Spoiler Masking) */}
                            <div className="mt-2 pl-12">
                              {isSpoiler && !isUnmasked ? (
                                <div className="relative rounded-xl p-4 bg-amber-500/5 border border-amber-500/20 overflow-hidden">
                                  <p className="text-sm text-gray-400 blur-sm select-none filter">
                                    {r.comment}
                                  </p>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-[2px]">
                                    <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
                                      <AlertTriangle className="w-4 h-4" />
                                      <span>Nội dung có tiết lộ tình tiết phim (Spoiler)</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => toggleUnmaskSpoiler(r.id)}
                                      className="inline-flex items-center gap-1.5 text-xs text-white bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/40 px-3 py-1 rounded-lg transition-colors mt-1 font-medium"
                                    >
                                      <Eye className="w-3.5 h-3.5" /> Xem nội dung
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-sm text-gray-300 leading-relaxed">
                                    {r.comment}
                                  </p>
                                  {isSpoiler && isUnmasked && (
                                    <button
                                      type="button"
                                      onClick={() => toggleUnmaskSpoiler(r.id)}
                                      className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300 mt-2"
                                    >
                                      <EyeOff className="w-3 h-3" /> Làm mờ lại nội dung
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Mood Tags */}
                              {r.tags && r.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2.5">
                                  {r.tags.map((tag, idx) => (
                                    <span 
                                      key={idx}
                                      className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-400"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500 bg-[#141414] rounded-2xl border border-white/5">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p>Chưa có đánh giá nào cho phim này. Hãy là người đầu tiên để lại nhận xét!</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Gợi ý phim dành cho bạn */}
        {recommendedMovies.length > 0 && (
          <div className="mt-16 pt-10 border-t border-white/10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                  <Flame className="w-6 h-6 text-primary" />
                  <span>Phim Gợi Ý Dành Cho Bạn</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Được đề xuất dựa trên điểm đánh giá cao và phản hồi tích cực từ cộng đồng khán giả
                </p>
              </div>
              <Link 
                to="/movies" 
                className="text-xs text-primary hover:underline font-medium"
              >
                Xem tất cả phim &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {recommendedMovies.map((recMovie) => (
                <div 
                  key={recMovie.id}
                  className="group bg-[#141414] rounded-2xl overflow-hidden border border-white/10 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_30px_-10px_rgba(229,9,20,0.3)] flex flex-col"
                >
                  <div className="relative aspect-[2/3] overflow-hidden bg-black/50">
                    <img 
                      src={recMovie.posterUrl || '/images/default-poster.jpg'} 
                      alt={recMovie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2.5 right-2.5 bg-black/85 backdrop-blur-md border border-amber-500/40 text-amber-400 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-md">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span className="text-xs font-bold">{recMovie.averageRating || '5.0'}</span>
                    </div>

                    {recMovie.ageRating && (
                      <div className="absolute top-2.5 left-2.5 bg-yellow-500 text-black px-1.5 py-0.5 rounded text-[10px] font-bold">
                        {recMovie.ageRating}
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm line-clamp-1 group-hover:text-primary transition-colors">
                        {recMovie.title}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                        {recMovie.genres?.join(', ') || 'Đang cập nhật'}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{recMovie.duration} phút</span>
                        <span>•</span>
                        <span>{recMovie.reviewCount || 0} đánh giá</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex gap-2">
                      <Link 
                        to={`/movie/${recMovie.id}`} 
                        className="flex-1 py-1.5 text-center rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 transition-colors"
                      >
                        Chi tiết
                      </Link>
                      <Link 
                        to={`/booking/${recMovie.id}`} 
                        className="flex-1 py-1.5 text-center rounded-lg bg-primary hover:bg-red-700 text-xs font-bold text-white transition-colors"
                      >
                        Mua vé
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Báo Cáo Vi Phạm (Community Report Modal) */}
        <AnimatePresence>
          {reportingReview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-[#181818] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Flag className="w-4 h-4 text-red-500" />
                    <span>Báo cáo đánh giá vi phạm</span>
                  </h3>
                  <button
                    onClick={() => setReportingReview(null)}
                    className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {reportSuccess ? (
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <span>{reportSuccess}</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitReport} className="space-y-4">
                    {reportError && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                        {reportError}
                      </div>
                    )}

                    <div className="text-xs text-gray-400">
                      Báo cáo đánh giá của <strong className="text-white">{reportingReview.userName}</strong>:
                      <div className="mt-1 p-2 bg-black/40 rounded-lg text-gray-300 italic line-clamp-2">
                        &quot;{reportingReview.comment}&quot;
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">
                        Chọn lý do vi phạm:
                      </label>
                      <select
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="w-full bg-[#222] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-primary"
                      >
                        {REPORT_REASONS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Mô tả chi tiết (tùy chọn):
                      </label>
                      <textarea
                        rows={3}
                        value={reportDesc}
                        onChange={(e) => setReportDesc(e.target.value)}
                        placeholder="Cung cấp thêm ngữ cảnh vi phạm để ban kiểm duyệt xử lý nhanh chóng..."
                        className="w-full bg-[#222] border border-white/10 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setReportingReview(null)}
                        className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingReport}
                        className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-medium px-5 py-2 rounded-xl text-xs transition-colors disabled:opacity-50"
                      >
                        {isSubmittingReport ? 'Đang gửi...' : 'Gửi báo cáo'}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default MovieDetails;
