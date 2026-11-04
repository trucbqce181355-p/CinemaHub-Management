import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, BadgePercent, CalendarDays, CheckCircle2, Tag, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';
import PublicListFilters from '../components/PublicListFilters';
import { matchesPromotionFilters } from '../utils/publicListFilters';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const number = value => Number(value || 0).toLocaleString('vi-VN');
const date = value => {
  if (!value) return 'Chưa cập nhật';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Chưa cập nhật' : parsed.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

function PromotionCard({ promotion, index }) {
  const [failedBanner, setFailedBanner] = useState(null);
  const percentage = promotion.discountType?.toUpperCase() === 'PERCENTAGE';

  return <motion.article
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: Math.min(index * 0.1, 0.5) }}
    className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-surface/50 p-8 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:border-primary/50 hover:shadow-[0_20px_40px_-15px_rgba(229,9,20,0.3)]"
  >
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
    <div className="relative z-10 flex flex-1 flex-col">
      {promotion.bannerImage && failedBanner !== promotion.bannerImage && <img src={promotion.bannerImage} alt={promotion.title} loading="lazy" onError={() => setFailedBanner(promotion.bannerImage)} className="mb-6 h-44 w-full rounded-2xl object-cover" />}
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-orange-500/20 text-primary transition-all duration-500 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(229,9,20,0.4)]"><Ticket className="h-7 w-7" /></div>
        <h2 className="break-words font-display text-2xl font-bold text-white">{promotion.title}</h2>
      </div>
      {promotion.description && <p className="mb-6 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-300">{promotion.description}</p>}

      <div className="space-y-4 text-gray-300">
        <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3 transition-colors hover:bg-white/10"><Tag className="h-5 w-5 shrink-0 text-gray-400" /><div className="min-w-0"><p className="mb-1 text-xs text-gray-500">Mã khuyến mãi</p><p className="break-all text-sm font-bold tracking-wide text-primary">{promotion.code}</p></div></div>
        <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3 transition-colors hover:bg-white/10"><BadgePercent className="h-5 w-5 shrink-0 text-gray-400" /><p className="text-sm font-semibold">Giảm {number(promotion.discountValue)}{percentage ? '%' : 'đ'}</p></div>
        <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-3 transition-colors hover:bg-white/10"><CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" /><div className="space-y-1 text-sm leading-relaxed">{promotion.startDate && <p><span className="text-gray-500">Từ </span>{date(promotion.startDate)}</p>}<p><span className="text-gray-500">Đến </span>{date(promotion.endDate)}</p></div></div>
      </div>

      {(promotion.minSpend != null || promotion.maxDiscount != null) && <div className="mt-8 border-t border-white/10 pt-6"><h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">Điều kiện áp dụng</h3><div className="flex flex-wrap gap-2">
        {promotion.minSpend != null && <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />Đơn tối thiểu: {number(promotion.minSpend)}đ</span>}
        {promotion.maxDiscount != null && <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />Giảm tối đa: {number(promotion.maxDiscount)}đ</span>}
      </div></div>}
      <div className="mt-auto pt-8"><div className="border-t border-white/10 pt-6"><p className="mb-4 text-xs leading-relaxed text-gray-400">Tình trạng và lượt sử dụng được kiểm tra khi áp mã.</p><Link to="/movies" className="inline-flex items-center gap-2 rounded-lg font-semibold text-primary transition-colors hover:text-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">Chọn phim và đặt vé<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link></div></div>
    </div>
  </motion.article>;
}

export default function Promotions() {
  const [items, setItems] = useState([]), [error, setError] = useState(''), [loading, setLoading] = useState(true), [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const [discountType, setDiscountType] = useState('');
  const [minSpend, setMinSpend] = useState('');
  const filteredItems = items.filter(promotion => matchesPromotionFilters(promotion, { search, discountType, minSpend }));
  const clearFilters = () => { setSearch(''); setDiscountType(''); setMinSpend(''); };
  useEffect(() => {
    const controller = new AbortController();
    fetch(API + '/promotions/active', { signal: controller.signal })
      .then(async res => { if (!res.ok) throw new Error('Không tải được danh sách khuyến mãi.'); const data = await res.json(); if (!Array.isArray(data)) throw new Error('Dữ liệu không hợp lệ.'); return data; })
      .then(data => { if (!controller.signal.aborted) setItems(data); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  return <div className="relative min-h-screen overflow-hidden bg-background pb-20 pt-24 text-white">
    <div aria-hidden="true" className="pointer-events-none absolute left-0 top-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-primary/20 mix-blend-screen blur-[120px]" />
    <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 -z-10 h-[600px] w-[600px] rounded-full bg-blue-600/10 mix-blend-screen blur-[150px]" />
    <div className="container mx-auto px-4 md:px-8">
      <div className="relative z-10 mb-10 text-center">
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 font-display text-4xl font-bold text-white md:text-5xl">Khuyến mãi <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">CinemaHub</span></motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mx-auto max-w-2xl text-lg text-gray-400">Khám phá các chương trình ưu đãi và tận hưởng những bộ phim yêu thích cùng CinemaHub.</motion.p>
      </div>
      <PublicListFilters label="Bộ lọc khuyến mãi" search={search} onSearchChange={setSearch} searchLabel="Tìm tên hoặc mã khuyến mãi" searchPlaceholder="Tìm tên hoặc mã khuyến mãi..." onClear={clearFilters} filters={[
        { key: 'discountType', label: 'Lọc theo loại ưu đãi', value: discountType, onChange: setDiscountType, options: [{ value: '', label: 'Tất cả loại ưu đãi' }, { value: 'PERCENTAGE', label: 'Giảm theo phần trăm' }, { value: 'FIXED', label: 'Giảm số tiền cố định' }] },
        { key: 'minSpend', label: 'Lọc theo mức đơn tối thiểu', value: minSpend, onChange: setMinSpend, options: [{ value: '', label: 'Tất cả mức đơn tối thiểu' }, { value: 'none', label: 'Không yêu cầu đơn tối thiểu' }, ...[100000, 200000, 500000].map(value => ({ value: String(value), label: `Đơn tối thiểu ≤ ${number(value)}đ` }))] },
      ]} />
      {loading ? <div role="status" className="flex flex-col items-center gap-4 py-20 text-sm text-gray-400"><div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" /><p>Đang tải khuyến mãi...</p></div> : error ? <div role="alert" className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center"><AlertCircle className="h-8 w-8 text-red-400" /><p className="text-gray-300">{error}</p><button type="button" onClick={() => { setLoading(true); setError(''); setRetry(n => n + 1); }} className="rounded-xl bg-primary px-5 py-2.5 font-medium text-white hover:bg-red-700">Thử lại</button></div> : filteredItems.length === 0 ? <div className="py-12 text-center text-gray-400"><p className="mb-2 text-xl font-bold">{items.length ? 'Không tìm thấy khuyến mãi phù hợp.' : 'Hiện chưa có chương trình khuyến mãi đang diễn ra.'}</p>{items.length > 0 && <p className="text-sm text-gray-500">Vui lòng thử điều kiện khác hoặc xóa bộ lọc.</p>}</div> : <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">{filteredItems.map((promotion, index) => <PromotionCard key={promotion.code} promotion={promotion} index={index} />)}</div>}
    </div>
  </div>;
}
