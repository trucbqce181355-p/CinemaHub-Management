import { useEffect, useRef, useState } from 'react';
import { BadgePercent, Banknote, CalendarDays, Check, Edit2, Image, LoaderCircle, Plus, ShieldCheck, X } from 'lucide-react';
import CustomSelect from './CustomSelect';
import QuickPresets from './QuickPresets';
import { previewPromotion, promotionPayload } from '../utils/promotionForm';

const control = 'mt-2 w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 disabled:opacity-50';
const card = 'space-y-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5';
const money = value => Number(value || 0).toLocaleString('vi-VN') + 'đ';
const localDateTime = date => {
  const d = new Date(date);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function PromotionEditor({ initialValue, editing, busy, error, onSave, onClose, presetScope = 'local' }) {
  const [form, setForm] = useState({ ...initialValue, status: editing ? initialValue.status : 'Active' });
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
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end.getFullYear() > 9999) {
      setLocalError('Thời gian hiệu lực không hợp lệ. Vui lòng kiểm tra ngày bắt đầu.');
      return;
    }
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
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="promotion-editor-title" className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#121212] text-white shadow-2xl">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-6 py-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3"><div className="rounded-xl bg-primary/20 p-3 text-primary">{editing ? <Edit2 className="h-6 w-6" /> : <Plus className="h-6 w-6" />}</div><h2 id="promotion-editor-title" className="font-display text-2xl font-bold">{editing ? 'Cập nhật Khuyến mãi' : 'Thêm Khuyến mãi Mới'}</h2></div>
        <button type="button" disabled={busy} onClick={onClose} aria-label="Đóng bảng khuyến mãi" className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-40"><X className="h-5 w-5" /></button>
      </header>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-8"><fieldset disabled={busy} className="min-w-0 space-y-5">
          <div className="min-w-0 space-y-5">
            <section className={card}><h3 className="font-bold">1. Thông tin chương trình</h3>
              <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Mã khuyến mãi <span className="text-primary">*</span><input required maxLength={64} pattern="[A-Za-z0-9_%\-]+" title="Chỉ dùng chữ, số, _, -, %; tối đa 64 ký tự" value={form.code} onChange={e => update('code', e.target.value.toUpperCase())} placeholder="Ví dụ: GIAM20%" className={control + ' font-semibold uppercase'} /></label><label className="text-sm">Tiêu đề hiển thị <span className="text-primary">*</span><input required maxLength={200} value={form.title} onChange={e => update('title', e.target.value)} placeholder="Ví dụ: Giảm 20% cuối tuần" className={control} /></label></div>
              <label className="block text-sm">Mô tả cho khách hàng<textarea rows={3} value={form.description || ''} onChange={e => update('description', e.target.value)} placeholder="Nội dung và lưu ý về chương trình…" className={control + ' resize-y'} /></label>
            </section>
            <section className={card}><h3 className="font-bold">2. Hình thức và giá trị giảm</h3><div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Hình thức giảm giá">
              {[["Percentage", 'Theo phần trăm', 'Giảm theo tỷ lệ trên tổng tiền vé', BadgePercent], ['Fixed', 'Số tiền cố định', 'Trừ một khoản tiền VND', Banknote]].map(([value, label, detail, Icon]) => <button key={value} type="button" aria-pressed={form.discountType === value} onClick={() => update('discountType', value)} className={'flex items-start gap-3 rounded-xl border p-4 text-left ' + (form.discountType === value ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/30 hover:bg-white/5')}><Icon className={'mt-0.5 h-5 w-5 shrink-0 ' + (form.discountType === value ? 'text-primary' : 'text-gray-400')} /><span className="flex-1"><span className="block font-semibold">{label}</span><span className="mt-1 block text-xs text-gray-400">{detail}</span></span>{form.discountType === value && <Check className="h-4 w-4 text-primary" />}</button>)}
              </div><label className="block text-sm">Mức giảm <span className="text-primary">*</span><div className="relative"><input type="number" required min="0" max={form.discountType === 'Percentage' ? 100 : 1000000000} step={form.discountType === 'Percentage' ? '0.01' : '1'} value={form.discountValue ?? ''} onChange={e => update('discountValue', e.target.value)} placeholder={form.discountType === 'Percentage' ? 'Ví dụ: 20' : 'Ví dụ: 50000'} className={control + ' pr-16 text-lg font-semibold'} /><span className="absolute right-4 top-5 text-sm text-gray-400">{form.discountType === 'Percentage' ? '%' : 'VND'}</span></div></label>
              <QuickPresets key={presetScope + form.discountType} storageKey={'cinemahub:promotion-presets:v1:'+presetScope+':'+form.discountType} defaults={form.discountType === 'Percentage' ? [5, 10, 15, 20, 25, 50] : [10000, 20000, 30000, 50000, 100000]} limits={form.discountType === 'Percentage' ? { min: 0, max: 100, decimals: 2 } : { min: 0, max: 1000000000 }} label="Thiết lập giá trị nhanh" unit={form.discountType === 'Percentage' ? '%' : 'VND'} format={value => form.discountType === 'Percentage' ? value.toLocaleString('vi-VN') + '%' : money(value)} selectedValue={form.discountValue} onApply={value => update('discountValue', value)} disabled={busy} />
            </section>
            <section className={card}><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /><h3 className="font-bold">3. Thời gian hiệu lực</h3></div><div className="grid gap-4 sm:grid-cols-2">{[['startDate', 'Bắt đầu'], ['endDate', 'Kết thúc']].map(([key, label]) => <label key={key} className="text-sm">{label} <span className="text-primary">*</span><input type="datetime-local" required value={form[key]} onChange={e => update(key, e.target.value)} className={control + ' [color-scheme:dark]'} /></label>)}</div>
              <QuickPresets key={presetScope + ':duration'} storageKey={'cinemahub:promotion-presets:v1:'+presetScope+':duration'} defaults={[1, 7, 30]} limits={{ min: 1, max: 3650 }} label="Thiết lập thời gian nhanh" unit="ngày" format={days => days.toLocaleString('vi-VN')+' ngày'} selectedValue={form.startDate && form.endDate ? (new Date(form.endDate) - new Date(form.startDate)) / 86400000 : null} onApply={setDuration} disabled={busy} />
            </section>
            <section className={card}><h3 className="font-bold">4. Điều kiện và giới hạn</h3><div className="grid gap-4 sm:grid-cols-2">{[['minSpend', 'Đơn tối thiểu', 'Giá trị vé tối thiểu để dùng mã'], ['maxDiscount', 'Giảm tối đa', 'Hữu ích với mã giảm theo %'], ['usageLimit', 'Tổng lượt dùng', 'Giới hạn trên toàn bộ tài khoản'], ['perUserLimit', 'Lượt dùng / tài khoản', 'Giới hạn riêng cho mỗi khách']].map(([key, label, hint]) => <label key={key} className="text-sm">{label}<input type="number" min="0" max="1000000000" step="1" value={form.conditions?.[key] ?? ''} onChange={e => condition(key, e.target.value)} placeholder="Không giới hạn" className={control} /><span className="mt-1 block text-xs text-gray-500">{hint}</span></label>)}</div>{(form.conditions?.redeemedByUserId || form.conditions?.rewardVoucherId) && <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">Mã voucher thành viên: các điều kiện tài khoản được giữ nguyên khi chỉnh sửa.</p>}</section>
            <section className={card}><div className="flex items-center gap-2"><Image className="h-5 w-5 text-primary" /><h3 className="font-bold">5. Hình ảnh banner</h3></div><label className="block text-sm">URL ảnh (không bắt buộc)<input type="url" maxLength={2000} value={form.bannerImage || ''} onChange={e => update('bannerImage', e.target.value)} placeholder="https://example.com/banner.jpg" className={control} /></label>{/^https?:\/\/\S+$/i.test(form.bannerImage || '') && <img src={form.bannerImage} alt="Xem trước banner khuyến mãi" className="max-h-44 w-full rounded-xl border border-white/10 object-contain" />}</section>
          </div>
          <aside className="min-w-0 space-y-5"><section className={card}><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><label htmlFor="promotion-status" className="font-bold">Trạng thái</label></div>{editing ? <CustomSelect id="promotion-status" floating size="form" disabled={busy} value={form.status} onChange={value => update('status', value)} options={[{ value: 'Active', label: 'Đang hoạt động' }, { value: 'Disabled', label: 'Vô hiệu hóa' }, ...(form.status === 'Used' ? [{ value: 'Used', label: 'Đã sử dụng' }] : [])]} /> : <input id="promotion-status" readOnly value="Đang hoạt động" className={control} />}</section>
            <section className={card}><h3 className="font-bold">Tóm tắt & minh họa</h3><dl className="space-y-3 text-sm"><div><dt className="text-xs text-gray-500">Mã</dt><dd className="mt-1 font-semibold">{form.code || 'Chưa nhập mã'}</dd></div><div><dt className="text-xs text-gray-500">Ưu đãi</dt><dd className="mt-1 font-semibold text-green-400">{form.discountValue === '' ? 'Chưa nhập mức giảm' : form.discountType === 'Percentage' ? form.discountValue + '%' : money(form.discountValue)}</dd></div><div><dt className="text-xs text-gray-500">Hiệu lực</dt><dd className="mt-1 text-xs leading-relaxed">{dateDescription}</dd></div><div><dt className="text-xs text-gray-500">Điều kiện</dt><dd className="mt-1">{form.conditions?.minSpend != null ? 'Đơn từ ' + money(form.conditions.minSpend) : 'Không yêu cầu đơn tối thiểu'}</dd></div></dl>
              <div className="space-y-2 border-t border-white/10 pt-4"><label className="block text-xs text-gray-400">Tổng tiền vé minh họa<input type="number" min="0" step="1" value={subtotal} onChange={e => setSubtotal(e.target.value)} className={control + ' text-sm'} /></label><div className="flex justify-between text-sm"><span>Giảm dự kiến</span><span className="text-green-400">−{money(result.discount)}</span></div><div className="flex justify-between border-t border-white/10 pt-2 font-bold"><span>Còn thanh toán</span><span>{money(result.total)}</span></div>{!result.eligible && <p className="text-xs text-amber-400">Đơn minh họa chưa đạt mức tối thiểu.</p>}</div>
            </section></aside>
        </fieldset></div>
        <footer className="shrink-0 border-t border-white/10 bg-[#121212] px-6 py-4 sm:px-8">{(localError || error) && <p role="alert" className="mb-3 text-sm text-red-400">{localError || error}</p>}<div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-gray-500">Kiểm tra mã, mức giảm và thời gian trước khi lưu.</p><div className="flex gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl px-5 py-3 text-sm text-gray-300 hover:bg-white/10 disabled:opacity-40">Hủy bỏ</button><button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold hover:bg-red-700 disabled:opacity-40">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{busy ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm khuyến mãi'}</button></div></div></footer>
      </form>
    </section>
  </div>;
}
