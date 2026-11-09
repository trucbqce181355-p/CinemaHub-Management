import { useEffect, useState } from 'react';
import { Tag } from 'lucide-react';
import ProgramModal from './ProgramModal';

const money = value => Number(value || 0).toLocaleString('vi-VN') + ' đ';

export default function BookingPromotionPicker({ base, token, bookingId, counterBody, busy, blocked, appliedCode, onApply, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    const timer = setTimeout(() => controller.abort(), 15000);
    setLoading(true);
    setError('');
    const url = counterBody ? `${base}/bookings/counter-promotions` : `${base}/bookings/${encodeURIComponent(bookingId)}/promotions`;
    fetch(url, {
      method: counterBody ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(counterBody ? { 'Content-Type': 'application/json' } : {}) },
      body: counterBody || undefined,
      signal: controller.signal,
      cache: 'no-store',
    }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || 'Không thể tải mã khuyến mãi');
      if (!Array.isArray(data)) throw new Error('Danh sách khuyến mãi không hợp lệ');
      if (live) setItems(data);
    }).catch(err => {
      if (live) setError(controller.signal.aborted ? 'Tải mã quá lâu. Vui lòng thử lại.' : err.message);
    }).finally(() => {
      clearTimeout(timer);
      if (live) setLoading(false);
    });
    return () => { live = false; clearTimeout(timer); controller.abort(); };
  }, [base, token, bookingId, counterBody, reload]);

  const apply = async code => {
    setError('');
    if (await onApply(code)) onClose();
    else {
      setError('Chưa áp dụng được mã. Vui lòng kiểm tra thông báo và điều kiện mới nhất.');
      setReload(value => value + 1);
    }
  };

  return <ProgramModal title="Chọn mã khuyến mãi" subtitle="Mã chưa đủ điều kiện được hiển thị màu xám kèm lý do." icon={Tag} busy={busy} onClose={onClose}
    footer={<button type="button" disabled={busy} onClick={onClose} className="rounded-xl bg-white/10 px-5 py-2.5 disabled:opacity-40">Đóng</button>}>
    {loading ? <p role="status" className="text-gray-400">Đang kiểm tra điều kiện khuyến mãi...</p> : error ? <div role="alert" className="space-y-3 text-red-400"><p>{error}</p><button type="button" onClick={() => setReload(value => value + 1)} className="underline">Thử lại</button></div> : !items.length ? <p className="text-gray-400">Hiện không có mã khuyến mãi đang có hiệu lực.</p> : <div className="space-y-3">
      {[...items].sort((a, b) => Number(b.eligible) - Number(a.eligible)
        || (Number(b.discountAmount) || 0) - (Number(a.discountAmount) || 0)
        || a.code.localeCompare(b.code)).map(item => {
        const selected = item.code === appliedCode;
        return <article key={item.code} className={`rounded-2xl border p-4 ${item.eligible ? 'border-primary/30 bg-primary/5' : 'border-white/10 bg-white/5 text-gray-500'}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 break-words"><h3 className={`font-bold ${item.eligible ? 'text-primary' : ''}`}>{item.code}</h3><p className="mt-1 font-semibold">{item.title}</p></div>
            <button type="button" disabled={!item.eligible || selected || busy || blocked} onClick={() => apply(item.code)} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-gray-500">{selected ? 'Đang áp dụng' : busy ? 'Đang xử lý...' : 'Áp dụng'}</button>
          </div>
          <p className="mt-2 text-sm">{item.discountType === 'Percentage' ? `Giảm ${item.discountValue}%` : `Giảm ${money(item.discountValue)}`}{item.maxDiscount != null ? ` · Tối đa ${money(item.maxDiscount)}` : ''}</p>
          {item.description && <p className="mt-1 break-words text-sm">{item.description}</p>}
          <p className="mt-2 text-xs">{item.minSpend != null ? `Đơn từ ${money(item.minSpend)} · ` : ''}Lượt sử dụng còn lại: {item.remainingUses == null ? 'Không giới hạn' : `${Number(item.remainingUses).toLocaleString('vi-VN')} lượt`}</p>
          <p className={`mt-2 text-sm ${item.eligible ? 'text-green-400' : 'text-gray-500'}`}>{item.eligible ? `Đơn này được giảm ${money(item.discountAmount)}` : item.reason}</p>
        </article>;
      })}
    </div>}
  </ProgramModal>;
}
