import { useEffect, useRef, useState } from 'react';
import { BadgePercent, Banknote, CalendarDays, Check, Image, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import { previewPromotion, promotionPayload } from '../utils/promotionForm';

const control = 'mt-2 w-full rounded-xl border border-white/15 bg-[#202020] px-3 py-3 text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50';
const card = 'space-y-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5';
const money = value => Number(value || 0).toLocaleString('vi-VN') + 'đ';
const localDateTime = date => {
  const d = new Date(date);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function PromotionEditor({ initialValue, editing, busy, error, onSave, onClose }) {
  const [form, setForm] = useState(initialValue);
  const [subtotal, setSubtotal] = useState(300000);
  const [localError, setLocalError] = useState('');
  const dialogRef = useRef(null), closeRef = useRef(onClose), busyRef = useRef(busy);
  useEffect(() => { closeRef.current = onClose; busyRef.current = busy; }, [onClose, busy]);
  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector('button')?.focus();
    const keydown = event => {
      if (event.key === 'Escape' && !busyRef.current) { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const controls = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter(el => el.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (!first) { event.preventDefault(); dialogRef.current.focus(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);

  const update = (key, value) => { setForm(prev => ({ ...prev, [key]: value })); setLocalError(''); };
  const condition = (key, value) => {
    setForm(prev => {
      const conditions = { ...prev.conditions };
      if (value === '') delete conditions[key]; else conditions[key] = value;
      return { ...prev, conditions };
    });
    setLocalError('');
  };
  const setDuration = days => {
    const start = form.startDate ? new Date(form.startDate) : new Date();
    const end = new Date(start.getTime() + days * 86400000);
    setForm(prev => ({ ...prev, startDate: prev.startDate || localDateTime(start), endDate: localDateTime(end) }));
    setLocalError('');
  };
  const result = previewPromotion(form, subtotal);
  const dateDescription = form.startDate && form.endDate
    ? new Date(form.startDate).toLocaleString('vi-VN') + ' → ' + new Date(form.endDate).toLocaleString('vi-VN')
    : 'Chưa chọn đủ thời gian';
  function submit(event) {
    event.preventDefault();
    if (busy) return;
    setLocalError('');
    try { onSave(promotionPayload(form)); }
    catch (cause) { setLocalError(cause.message); }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-5">
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="promotion-editor-title" className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#141414] text-white shadow-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
        <div><p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">Quản lý khuyến mãi</p><h2 id="promotion-editor-title" className="text-2xl font-bold">{editing ? 'Chỉnh sửa khuyến mãi' : 'Thêm khuyến mãi'}</h2><p className="mt-1 text-sm text-gray-400">Thiết lập mã, ưu đãi, thời gian và giới hạn sử dụng.</p></div>
        <button type="button" disabled={busy} onClick={onClose} aria-label="Đóng bảng khuyến mãi" className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-40"><X className="h-5 w-5" /></button>
      </header>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"><fieldset disabled={busy} className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
          <div className="min-w-0 space-y-5">
            <section className={card}><h3 className="font-bold">1. Thông tin chương trình</h3>
              <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Mã khuyến mãi <span className="text-primary">*</span><input required maxLength={64} pattern="[A-Za-z0-9_%\-]+" title="Chỉ dùng chữ, số, _, -, %; tối đa 64 ký tự" value={form.code} onChange={e => update('code', e.target.value.toUpperCase())} placeholder="Ví dụ: GIAM20%" className={control + ' font-semibold uppercase'} /></label><label className="text-sm">Tiêu đề hiển thị <span className="text-primary">*</span><input required maxLength={200} value={form.title} onChange={e => update('title', e.target.value)} placeholder="Ví dụ: Giảm 20% cuối tuần" className={control} /></label></div>
              <label className="block text-sm">Mô tả cho khách hàng<textarea rows={3} value={form.description || ''} onChange={e => update('description', e.target.value)} placeholder="Nội dung và lưu ý về chương trình…" className={control + ' resize-y'} /></label>
              <p className="text-xs text-gray-500">Mã có thể dùng chữ, số, _, - và %. Nếu mã đã được dùng trong booking, hệ thống sẽ không cho đổi mã để giữ lịch sử.</p>
            </section>
            <section className={card}><h3 className="font-bold">2. Hình thức và giá trị giảm</h3><div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Hình thức giảm giá">
              {[["Percentage", 'Theo phần trăm', 'Giảm theo tỷ lệ trên tổng tiền vé', BadgePercent], ['Fixed', 'Số tiền cố định', 'Trừ một khoản tiền VND', Banknote]].map(([value, label, detail, Icon]) => <button key={value} type="button" aria-pressed={form.discountType === value} onClick={() => update('discountType', value)} className={'flex items-start gap-3 rounded-xl border p-4 text-left ' + (form.discountType === value ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/30 hover:bg-white/5')}><Icon className={'mt-0.5 h-5 w-5 shrink-0 ' + (form.discountType === value ? 'text-primary' : 'text-gray-400')} /><span className="flex-1"><span className="block font-semibold">{label}</span><span className="mt-1 block text-xs text-gray-400">{detail}</span></span>{form.discountType === value && <Check className="h-4 w-4 text-primary" />}</button>)}
              </div><label className="block text-sm">Mức giảm <span className="text-primary">*</span><div className="relative"><input type="number" required min="0" max={form.discountType === 'Percentage' ? 100 : 1000000000} step={form.discountType === 'Percentage' ? '0.01' : '1'} value={form.discountValue ?? ''} onChange={e => update('discountValue', e.target.value)} placeholder={form.discountType === 'Percentage' ? 'Ví dụ: 20' : 'Ví dụ: 50000'} className={control + ' pr-16 text-lg font-semibold'} /><span className="absolute right-4 top-5 text-sm text-gray-400">{form.discountType === 'Percentage' ? '%' : 'VND'}</span></div></label>
              <div className="flex flex-wrap gap-2">{(form.discountType === 'Percentage' ? [5, 10, 15, 20, 25, 50] : [10000, 20000, 30000, 50000, 100000]).map(value => <button type="button" key={value} onClick={() => update('discountValue', value)} className={'rounded-lg border px-3 py-2 text-xs ' + (Number(form.discountValue) === value ? 'border-primary text-primary' : 'border-white/10 text-gray-400 hover:bg-white/5')}>{form.discountType === 'Percentage' ? value + '%' : money(value)}</button>)}</div>
              <p className="text-xs text-gray-500">Giảm theo % tối đa 100%; giảm cố định nhập số nguyên VND. Tiền giảm không vượt quá tiền vé.</p>
            </section>
            <section className={card}><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /><h3 className="font-bold">3. Thời gian hiệu lực</h3></div><div className="grid gap-4 sm:grid-cols-2">{[['startDate', 'Bắt đầu'], ['endDate', 'Kết thúc']].map(([key, label]) => <label key={key} className="text-sm">{label} <span className="text-primary">*</span><input type="datetime-local" required value={form[key]} onChange={e => update(key, e.target.value)} className={control + ' [color-scheme:dark]'} /></label>)}</div><div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-xs text-gray-400">Thiết lập nhanh:</span>{[[1, '1 ngày'], [7, '7 ngày'], [30, '30 ngày']].map(([days, label]) => <button key={days} type="button" onClick={() => setDuration(days)} className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/5">{label}</button>)}</div><p className="text-xs text-gray-500">Ngày kết thúc phải sau ngày bắt đầu. Khách chỉ dùng được mã trong khoảng này khi trạng thái là Đang áp dụng.</p></section>
            <section className={card}><h3 className="font-bold">4. Điều kiện và giới hạn</h3><div className="grid gap-4 sm:grid-cols-2">{[['minSpend', 'Đơn tối thiểu', 'Giá trị vé tối thiểu để dùng mã'], ['maxDiscount', 'Giảm tối đa', 'Hữu ích với mã giảm theo %'], ['usageLimit', 'Tổng lượt dùng', 'Giới hạn trên toàn bộ tài khoản'], ['perUserLimit', 'Lượt dùng / tài khoản', 'Giới hạn riêng cho mỗi khách']].map(([key, label, hint]) => <label key={key} className="text-sm">{label}<input type="number" min="0" max="1000000000" step="1" value={form.conditions?.[key] ?? ''} onChange={e => condition(key, e.target.value)} placeholder="Không giới hạn" className={control} /><span className="mt-1 block text-xs text-gray-500">{hint}</span></label>)}</div><p className="text-xs text-gray-500">Để trống điều kiện không cần dùng. Đơn giữ chỗ còn hiệu lực cũng giữ lượt; lượt được giải phóng khi hủy hoặc hết hạn.</p>{(form.conditions?.redeemedByUserId || form.conditions?.rewardVoucherId) && <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">Mã voucher thành viên: các điều kiện tài khoản được giữ nguyên khi chỉnh sửa.</p>}</section>
            <section className={card}><div className="flex items-center gap-2"><Image className="h-5 w-5 text-primary" /><h3 className="font-bold">5. Hình ảnh banner</h3></div><label className="block text-sm">URL ảnh (không bắt buộc)<input type="url" maxLength={2000} value={form.bannerImage || ''} onChange={e => update('bannerImage', e.target.value)} placeholder="https://example.com/banner.jpg" className={control} /></label>{/^https?:\/\/\S+$/i.test(form.bannerImage || '') && <img src={form.bannerImage} alt="Xem trước banner khuyến mãi" className="max-h-44 w-full rounded-xl border border-white/10 object-contain" />}</section>
          </div>
          <aside className="min-w-0 space-y-5"><section className={card}><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h3 className="font-bold">Trạng thái</h3></div>{[['Active', 'Đang áp dụng', 'Có thể sử dụng trong thời gian hiệu lực'], ['Disabled', 'Tạm ngừng', 'Giữ mã nhưng không cho khách sử dụng'], ...(form.status === 'Used' ? [['Used', 'Đã sử dụng', 'Giữ trạng thái hiện có của voucher']] : [])].map(([value, label, detail]) => <label key={value} className={'flex cursor-pointer items-start gap-3 rounded-xl border p-3 ' + (form.status === value ? 'border-primary/50 bg-primary/5' : 'border-white/10')}><input type="radio" name="promotion-status" value={value} checked={form.status === value} onChange={() => update('status', value)} className="mt-1 accent-red-600" /><span><span className="block text-sm font-semibold">{label}</span><span className="mt-1 block text-xs text-gray-500">{detail}</span></span></label>)}</section>
            <section className={card}><h3 className="font-bold">Tóm tắt & minh họa</h3><dl className="space-y-3 text-sm"><div><dt className="text-xs text-gray-500">Mã</dt><dd className="mt-1 font-semibold">{form.code || 'Chưa nhập mã'}</dd></div><div><dt className="text-xs text-gray-500">Ưu đãi</dt><dd className="mt-1 font-semibold text-green-400">{form.discountValue === '' ? 'Chưa nhập mức giảm' : form.discountType === 'Percentage' ? form.discountValue + '%' : money(form.discountValue)}</dd></div><div><dt className="text-xs text-gray-500">Hiệu lực</dt><dd className="mt-1 text-xs leading-relaxed">{dateDescription}</dd></div><div><dt className="text-xs text-gray-500">Điều kiện</dt><dd className="mt-1">{form.conditions?.minSpend != null ? 'Đơn từ ' + money(form.conditions.minSpend) : 'Không yêu cầu đơn tối thiểu'}</dd></div></dl>
              <div className="space-y-2 border-t border-white/10 pt-4"><label className="block text-xs text-gray-400">Tổng tiền vé minh họa<input type="number" min="0" step="1" value={subtotal} onChange={e => setSubtotal(e.target.value)} className={control + ' text-sm'} /></label><div className="flex justify-between text-sm"><span>Giảm dự kiến</span><span className="text-green-400">−{money(result.discount)}</span></div><div className="flex justify-between border-t border-white/10 pt-2 font-bold"><span>Còn thanh toán</span><span>{money(result.total)}</span></div>{!result.eligible && <p className="text-xs text-amber-400">Đơn minh họa chưa đạt mức tối thiểu.</p>}<p className="text-xs leading-relaxed text-gray-500">Minh họa chưa kiểm tra thời gian, trạng thái, lượt dùng hoặc voucher riêng. Số tiền thực tế được xác nhận khi đặt vé.</p></div>
            </section></aside>
        </fieldset></div>
        <footer className="shrink-0 border-t border-white/10 bg-[#181818] px-5 py-4 sm:px-7">{(localError || error) && <p role="alert" className="mb-3 text-sm text-red-400">{localError || error}</p>}<div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-gray-500">Kiểm tra mã, mức giảm và thời gian trước khi lưu.</p><div className="flex gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-white/15 px-5 py-2.5 text-sm hover:bg-white/5 disabled:opacity-40">Hủy</button><button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold hover:bg-primary/90 disabled:opacity-40">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{busy ? 'Đang lưu…' : 'Lưu khuyến mãi'}</button></div></div></footer>
      </form>
    </section>
  </div>;
}
