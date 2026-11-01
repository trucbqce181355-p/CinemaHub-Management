import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
export default function Promotions() {
  const [items, setItems] = useState([]), [error, setError] = useState(''), [loading, setLoading] = useState(true), [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    fetch(API + '/promotions/active', { signal: controller.signal })
      .then(async res => { if (!res.ok) throw new Error('Không tải được danh sách khuyến mãi.'); const data = await res.json(); if (!Array.isArray(data)) throw new Error('Dữ liệu không hợp lệ.'); return data; })
      .then(data => { if (!controller.signal.aborted) setItems(data); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  return <main className="max-w-6xl mx-auto px-5 py-12 text-white min-h-[60vh]">
    <h1 className="text-3xl font-bold mb-8">Khuyến mãi</h1>
    {loading && <p role="status">Đang tải khuyến mãi…</p>}
    {error && <div role="alert"><p>{error}</p><button className="mt-4 text-primary" onClick={() => setRetry(n => n + 1)}>Thử lại</button></div>}
    {!loading && !error && items.length === 0 && <p>Hiện chưa có chương trình khuyến mãi đang diễn ra.</p>}
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{!error && items.map(p => <article key={p.code} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      {p.bannerImage && <img src={p.bannerImage} alt={p.title} className="w-full h-44 object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />}
      <div className="p-5 space-y-3"><h2 className="text-xl font-bold">{p.title}</h2><p>{p.description}</p><p className="text-primary font-bold">Mã: {p.code}</p>
        <p>Giảm {Number(p.discountValue || 0).toLocaleString('vi-VN')}{p.discountType?.toUpperCase() === 'PERCENTAGE' ? '%' : 'đ'}</p>
        {p.minSpend != null && <p>Đơn tối thiểu: {Number(p.minSpend).toLocaleString('vi-VN')}đ</p>}
        {p.maxDiscount != null && <p>Giảm tối đa: {Number(p.maxDiscount).toLocaleString('vi-VN')}đ</p>}
        <p className="text-sm text-gray-400">Đến {new Date(p.endDate).toLocaleString('vi-VN')}</p><p className="text-xs text-gray-400">Tình trạng và lượt sử dụng được kiểm tra khi áp mã.</p>
        <Link className="inline-block text-primary font-semibold" to="/movies">Chọn phim và đặt vé</Link>
      </div></article>)}</div>
  </main>;
}
