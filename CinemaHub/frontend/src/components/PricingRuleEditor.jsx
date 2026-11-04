import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Clock3, Clapperboard, CalendarClock, Check, X, Plus, Search, ArrowUpRight, ArrowDownRight, LoaderCircle } from 'lucide-react';
import { pricingRulePayload } from '../utils/pricingRuleForm';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const money = n => Number(n || 0).toLocaleString('vi-VN') + 'đ';
const dateLabel = d => new Date(d + 'T00:00:00').toLocaleDateString('vi-VN');
const types = [
  { id: 'WEEKEND', name: 'Cuối tuần', detail: 'Áp dụng vào thứ Bảy và Chủ nhật', icon: CalendarDays },
  { id: 'HOLIDAY', name: 'Ngày lễ / ngày đặc biệt', detail: 'Chọn một hoặc nhiều ngày cụ thể', icon: CalendarClock },
  { id: 'LATE_NIGHT', name: 'Theo khung giờ', detail: 'Áp dụng từ giờ bắt đầu bạn chọn', icon: Clock3 },
  { id: 'SNEAK_SHOW', name: 'Suất chiếu sớm', detail: 'Chọn trực tiếp các suất chiếu', icon: Clapperboard },
];
const control = 'w-full rounded-xl border border-white/15 bg-[#202020] px-3 py-3 text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50';
const section = 'rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5 space-y-4';

export default function PricingRuleEditor({ initialValue, editing, busy, error, onSave, onClose }) {
  const [trigger, setTrigger] = useState(initialValue.triggerVariable);
  const [direction, setDirection] = useState(Number(initialValue.adjustmentValue) < 0 ? 'decrease' : 'increase');
  const [amount, setAmount] = useState(initialValue.adjustmentValue === '' ? '' : Math.abs(Number(initialValue.adjustmentValue)));
  const [dates, setDates] = useState(initialValue.conditionParams?.dates || []);
  const [showtimeIds, setShowtimeIds] = useState(initialValue.conditionParams?.showtimeIds || []);
  const [startHour, setStartHour] = useState(initialValue.conditionParams?.startHour ?? 22);
  const [status, setStatus] = useState(initialValue.status || 'Active');
  const [draftDate, setDraftDate] = useState(''), [year, setYear] = useState(new Date().getFullYear());
  const [showtimes, setShowtimes] = useState([]), [showLoading, setShowLoading] = useState(false), [showError, setShowError] = useState(''), [retry, setRetry] = useState(0);
  const [search, setSearch] = useState(''), [cinema, setCinema] = useState(''), [movie, setMovie] = useState(''), [screeningDate, setScreeningDate] = useState('');
  const [onlyUpcoming, setOnlyUpcoming] = useState(true), [localError, setLocalError] = useState(''), [example, setExample] = useState(100000);
  const dialogRef = useRef(null), closeRef = useRef(onClose), busyRef = useRef(busy);
  useEffect(() => { closeRef.current = onClose; busyRef.current = busy; }, [onClose, busy]);
  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; dialogRef.current?.querySelector('button')?.focus();
    const keydown = e => {
      if (e.key === 'Escape' && !busyRef.current) { e.preventDefault(); closeRef.current(); }
      if (e.key !== 'Tab') return;
      const controls = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')].filter(el => el.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (!first) { e.preventDefault(); dialogRef.current.focus(); return; }
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);
  useEffect(() => {
    if (trigger !== 'SNEAK_SHOW') return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('timeout'), 15000);
    Promise.resolve().then(() => { if (!controller.signal.aborted) { setShowLoading(true); setShowError(''); } });
    fetch(API + '/showtimes?includePast=true&allStatuses=true', { signal: controller.signal })
      .then(async res => { if (!res.ok) throw new Error('Không tải được danh sách suất chiếu.'); const data = await res.json(); if (!Array.isArray(data)) throw new Error('Danh sách suất chiếu không hợp lệ.'); return data; })
      .then(data => { if (!controller.signal.aborted) setShowtimes(data.filter(s => s.id).sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)))); })
      .catch(e => { if (!controller.signal.aborted || controller.signal.reason === 'timeout') setShowError(controller.signal.reason === 'timeout' ? 'Tải suất chiếu quá thời gian. Vui lòng thử lại.' : e.message); })
      .finally(() => { clearTimeout(timeout); if (!controller.signal.aborted || controller.signal.reason === 'timeout') setShowLoading(false); });
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [trigger, retry]);

  const currentType = types.find(t => t.id === trigger);
  const signed = Number(amount || 0) * (direction === 'decrease' ? -1 : 1);
  const preview = Math.max(1000, Math.min(2000000, Number(example || 0) + signed));
  const cinemaOptions = [...new Map(showtimes.filter(s => s.cinemaId).map(s => [s.cinemaId, s.cinemaName || 'Rạp chưa có tên'])).entries()];
  const movieOptions = [...new Map(showtimes.filter(s => s.movieId).map(s => [s.movieId, s.movieTitle || 'Phim chưa có tên'])).entries()];
  const upcoming = s => String(s.status).toLowerCase() === 'active' && new Date(s.startTime) > new Date();
  const filtered = showtimes.filter(s => (!cinema || s.cinemaId === cinema) && (!movie || s.movieId === movie)
    && (!screeningDate || s.startTime?.slice(0, 10) === screeningDate) && (!onlyUpcoming || upcoming(s) || showtimeIds.includes(s.id))
    && [s.movieTitle, s.cinemaName, s.roomName].join(' ').toLocaleLowerCase('vi-VN').includes(search.toLocaleLowerCase('vi-VN')));
  const selectable = filtered.filter(upcoming).map(s => s.id);
  const allSelected = selectable.length > 0 && selectable.every(id => showtimeIds.includes(id));
  function toggleShowtime(id) { setShowtimeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 366 ? [...prev, id] : prev); setLocalError(''); }
  function addDate(value) { if (value && !dates.includes(value) && dates.length < 366) setDates(prev => [...prev, value].sort()); setDraftDate(''); setLocalError(''); }
  function submit(e) {
    e.preventDefault(); if (busy) return; setLocalError('');
    try {
      const payload = pricingRulePayload({ trigger, direction, amount, dates, showtimeIds, startHour, status, version: initialValue.version ?? null });
      if (trigger === 'SNEAK_SHOW' && (showLoading || showError || showtimeIds.some(id => !showtimes.some(s => s.id === id))))
        throw new Error('Vui lòng tải danh sách và bỏ các suất chiếu không còn tồn tại trước khi lưu.');
      onSave(payload);
    } catch (e) { setLocalError(e.message); }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-5 backdrop-blur-sm">
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="pricing-editor-title" className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#141414] text-white shadow-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
        <div><p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">Quản lý giá vé</p><h2 id="pricing-editor-title" className="text-2xl font-bold">{editing ? 'Chỉnh sửa luật giá động' : 'Thêm luật giá động'}</h2><p className="mt-1 text-sm text-gray-400">Chọn điều kiện, mức điều chỉnh và kiểm tra trước khi lưu.</p></div>
        <button type="button" disabled={busy} onClick={onClose} aria-label="Đóng bảng giá động" className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-40"><X className="h-5 w-5" /></button>
      </header>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <fieldset disabled={busy} className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
            <div className="min-w-0 space-y-5">
              <section className={section}><h3 className="font-bold">1. Loại luật áp dụng</h3><div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Loại luật giá">
                {types.map(({ id, name, detail, icon: Icon }) => <button key={id} type="button" aria-pressed={trigger === id} onClick={() => { setTrigger(id); setLocalError(''); }} className={'flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ' + (trigger === id ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/30 hover:bg-white/5')}>
                  <Icon className={'mt-0.5 h-5 w-5 shrink-0 ' + (trigger === id ? 'text-primary' : 'text-gray-400')} /><span className="flex-1"><span className="block font-semibold">{name}</span><span className="mt-1 block text-xs text-gray-400">{detail}</span></span>{trigger === id && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>)}
              </div></section>

              <section className={section}><h3 className="font-bold">2. Điều kiện áp dụng</h3>
                {trigger === 'WEEKEND' && <div className="rounded-xl bg-white/5 p-4"><div className="flex flex-wrap gap-3">{['Thứ Bảy', 'Chủ nhật'].map(day => <span key={day} className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm"><Check className="h-4 w-4 text-primary" />{day}</span>)}</div><p className="mt-3 text-sm text-gray-400">Tự động áp dụng cho các suất chiếu vào hai ngày này mỗi tuần.</p></div>}
                {trigger === 'LATE_NIGHT' && <><label className="block text-sm">Áp dụng cho suất chiếu bắt đầu từ<select className={control + ' mt-2'} value={startHour} onChange={e => setStartHour(Number(e.target.value))}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}</select></label><p className="text-sm text-gray-400">Từ {String(startHour).padStart(2, '0')}:00 đến hết ngày, tính theo giờ bắt đầu suất chiếu.</p></>}
                {trigger === 'HOLIDAY' && <>
                  <div className="flex flex-wrap items-end gap-3"><label className="flex-1 text-sm">Chọn ngày<input type="date" value={draftDate} onChange={e => setDraftDate(e.target.value)} className={control + ' mt-2 [color-scheme:dark]'} /></label><button type="button" disabled={!draftDate || dates.length >= 366} onClick={() => addDate(draftDate)} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm hover:bg-white/15 disabled:opacity-40"><Plus className="h-4 w-4" />Thêm ngày</button></div>
                  <div className="rounded-xl border border-white/10 p-3"><div className="mb-3 flex items-center justify-between gap-3"><span className="text-xs text-gray-400">Chọn nhanh ngày thường dùng</span><label className="text-xs">Năm <select aria-label="Năm chọn nhanh" className="ml-2 rounded-lg bg-[#252525] p-2" value={year} onChange={e => setYear(Number(e.target.value))}>{Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(y => <option key={y}>{y}</option>)}</select></label></div><div className="flex flex-wrap gap-2">{[['01-01', '01/01'], ['04-30', '30/04'], ['05-01', '01/05'], ['09-02', '02/09'], ['12-24', '24/12'], ['12-31', '31/12']].map(([date, label]) => <button type="button" key={date} aria-pressed={dates.includes(year + '-' + date)} onClick={() => addDate(year + '-' + date)} className={'rounded-lg border px-3 py-2 text-xs ' + (dates.includes(year + '-' + date) ? 'border-primary text-primary' : 'border-white/15 hover:bg-white/5')}>{label}</button>)}</div></div>
                  <div className="flex items-center justify-between text-sm"><span>Đã chọn {dates.length} ngày</span>{dates.length > 0 && <button type="button" onClick={() => setDates([])} className="text-gray-400 hover:text-white">Bỏ chọn tất cả</button>}</div><div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">{dates.map(d => <button type="button" key={d} onClick={() => setDates(prev => prev.filter(x => x !== d))} aria-label={'Bỏ ngày ' + dateLabel(d)} className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-red-200">{dateLabel(d)}<X className="h-3 w-3" /></button>)}</div><p className="text-xs text-gray-500">Có thể chọn tối đa 366 ngày. Với dịp âm lịch, chọn ngày dương lịch tương ứng.</p>
                </>}
                {trigger === 'SNEAK_SHOW' && <>
                  <div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" /><input aria-label="Tìm suất chiếu" placeholder="Tìm phim, rạp hoặc phòng chiếu…" value={search} onChange={e => setSearch(e.target.value)} className={control + ' pl-10'} /></div>
                  <div className="grid gap-3 sm:grid-cols-3"><label className="text-xs text-gray-400">Rạp<select className={control + ' mt-1 text-sm'} value={cinema} onChange={e => setCinema(e.target.value)}><option value="">Tất cả rạp</option>{cinemaOptions.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label><label className="text-xs text-gray-400">Phim<select className={control + ' mt-1 text-sm'} value={movie} onChange={e => setMovie(e.target.value)}><option value="">Tất cả phim</option>{movieOptions.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label><label className="text-xs text-gray-400">Ngày chiếu<input type="date" value={screeningDate} onChange={e => setScreeningDate(e.target.value)} className={control + ' mt-1 text-sm [color-scheme:dark]'} /></label></div>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs"><label className="flex items-center gap-2"><input type="checkbox" checked={onlyUpcoming} onChange={e => setOnlyUpcoming(e.target.checked)} className="accent-red-600" />Chỉ suất sắp tới và các suất đã chọn</label><span className="text-primary">Đã chọn {showtimeIds.length}/366 suất</span></div>
                  {showLoading ? <p role="status" className="flex items-center gap-2 py-5 text-sm text-gray-400"><LoaderCircle className="h-4 w-4 animate-spin" />Đang tải suất chiếu…</p> : showError ? <div role="alert" className="rounded-xl bg-red-500/10 p-4 text-sm text-red-300">{showError}<button type="button" onClick={() => setRetry(n => n + 1)} className="ml-3 underline">Thử lại</button></div> : <div className="max-h-72 overflow-auto rounded-xl border border-white/10"><table className="w-full min-w-[520px] text-left text-xs"><thead className="sticky top-0 z-10 bg-[#252525]"><tr><th className="p-3"><input type="checkbox" aria-label="Chọn tất cả suất hợp lệ trong bộ lọc" checked={allSelected} disabled={!selectable.length} onChange={() => setShowtimeIds(prev => allSelected ? prev.filter(id => !selectable.includes(id)) : [...new Set([...prev, ...selectable])].slice(0, 366))} className="accent-red-600" /></th><th className="p-3">Phim</th><th className="p-3">Rạp / Phòng</th><th className="p-3">Giờ chiếu</th></tr></thead><tbody>{filtered.map(s => { const checked = showtimeIds.includes(s.id); return <tr key={s.id} className={'border-t border-white/5 ' + (checked ? 'bg-primary/5' : 'hover:bg-white/5')}><td className="p-3"><input type="checkbox" aria-label={'Chọn ' + s.movieTitle + ' ' + s.startTime + ' ' + s.roomName} checked={checked} disabled={!checked && (!upcoming(s) || showtimeIds.length >= 366)} onChange={() => toggleShowtime(s.id)} className="accent-red-600" /></td><td className="p-3 font-semibold">{s.movieTitle || 'Chưa có tên phim'}<span className="mt-1 block font-normal text-gray-500">{s.format}</span></td><td className="p-3 text-gray-300">{s.cinemaName}<span className="mt-1 block text-gray-500">{s.roomName}</span></td><td className="whitespace-nowrap p-3">{new Date(s.startTime).toLocaleString('vi-VN')}{!upcoming(s) && <span className="mt-1 block text-amber-400">Đã qua / Ngừng hoạt động</span>}</td></tr>; })}{!filtered.length && <tr><td colSpan="4" className="p-6 text-center text-gray-500">Không có suất chiếu phù hợp với bộ lọc.</td></tr>}</tbody></table></div>}
                  {showtimeIds.length > 0 && <div className="flex flex-wrap gap-2">{showtimeIds.map(id => { const s = showtimes.find(row => row.id === id); return <button key={id} type="button" onClick={() => toggleShowtime(id)} className={'inline-flex max-w-full items-center gap-2 rounded-lg px-3 py-2 text-xs ' + (s ? 'bg-white/5 text-gray-300' : 'bg-red-500/10 text-red-300')}><span className="truncate">{s ? (s.movieTitle || 'Phim') + ' · ' + new Date(s.startTime).toLocaleString('vi-VN') + ' · ' + (s.roomName || 'Phòng chiếu') : showLoading ? 'Đang tải suất đã chọn…' : 'Suất chiếu không còn tồn tại'}</span><X className="h-3 w-3 shrink-0" /></button>; })}<button type="button" onClick={() => setShowtimeIds([])} className="px-2 text-xs text-gray-500 hover:text-white">Bỏ chọn tất cả</button></div>}
                </>}
              </section>

              <section className={section}><h3 className="font-bold">3. Điều chỉnh giá vé</h3><div className="grid grid-cols-2 gap-3" role="group" aria-label="Hình thức điều chỉnh">{[['increase', 'Tăng giá', ArrowUpRight], ['decrease', 'Giảm giá', ArrowDownRight]].map(([value, label, Icon]) => <button key={value} type="button" aria-pressed={direction === value} onClick={() => setDirection(value)} className={'flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ' + (direction === value ? 'border-primary bg-primary/10 text-red-200' : 'border-white/10 text-gray-400 hover:bg-white/5')}><Icon className="h-4 w-4" />{label}</button>)}</div>
                <label className="block text-sm">Số tiền điều chỉnh trên mỗi ghế<div className="relative mt-2"><input type="number" min="0" max="1000000" step="1" required value={amount} onChange={e => setAmount(e.target.value)} className={control + ' pr-20 text-lg font-semibold'} placeholder="Ví dụ: 20000" /><span className="absolute right-4 top-3.5 text-sm text-gray-500">VND/ghế</span></div></label><div className="flex flex-wrap gap-2">{[10000, 20000, 30000, 50000, 100000].map(value => <button type="button" key={value} onClick={() => setAmount(value)} className={'rounded-lg border px-3 py-2 text-xs ' + (Number(amount) === value ? 'border-primary text-primary' : 'border-white/10 text-gray-400 hover:bg-white/5')}>{money(value)}</button>)}</div><p className="text-xs text-gray-500">Nhập số tiền dương; chọn Tăng hoặc Giảm ở trên. Tối đa 1.000.000đ/ghế.</p>
              </section>
            </div>

            <aside className="min-w-0 space-y-5"><section className={section}><h3 className="font-bold">Trạng thái</h3>{[['Active', 'Đang áp dụng', 'Tự động tính cho suất chiếu phù hợp'], ['Disabled', 'Tạm ngừng', 'Lưu luật để sử dụng sau']].map(([value, label, detail]) => <label key={value} className={'flex cursor-pointer items-start gap-3 rounded-xl border p-3 ' + (status === value ? 'border-primary/50 bg-primary/5' : 'border-white/10')}><input type="radio" name="pricing-rule-status" value={value} checked={status === value} onChange={() => setStatus(value)} className="mt-1 accent-red-600" /><span><span className="block text-sm font-semibold">{label}</span><span className="mt-1 block text-xs text-gray-500">{detail}</span></span></label>)}</section>
              <section className={section}><h3 className="font-bold">Tóm tắt luật giá</h3><dl className="space-y-3 text-sm"><div><dt className="text-xs text-gray-500">Loại áp dụng</dt><dd className="mt-1 font-semibold">{currentType?.name || 'Chưa chọn'}</dd></div><div><dt className="text-xs text-gray-500">Phạm vi</dt><dd className="mt-1">{trigger === 'WEEKEND' ? 'Thứ Bảy và Chủ nhật' : trigger === 'HOLIDAY' ? dates.length + ' ngày đã chọn' : trigger === 'LATE_NIGHT' ? 'Từ ' + String(startHour).padStart(2, '0') + ':00 mỗi ngày' : showtimeIds.length + ' suất đã chọn'}</dd></div><div><dt className="text-xs text-gray-500">Mức điều chỉnh</dt><dd className={'mt-1 text-lg font-bold ' + (direction === 'increase' ? 'text-amber-400' : 'text-green-400')}>{direction === 'increase' ? '+' : '−'}{money(amount)}</dd></div></dl>
                <div className="border-t border-white/10 pt-4"><label className="text-xs text-gray-400">Giá vé minh họa trước điều chỉnh<input type="number" min="1000" max="2000000" step="1" value={example} onChange={e => setExample(e.target.value)} className={control + ' mt-2 text-sm'} /></label><p className="mt-3 text-xs text-gray-500">Khi áp dụng riêng luật này</p><p className="mt-1 text-2xl font-bold text-white">{money(preview)}</p><p className="mt-2 text-xs leading-relaxed text-gray-500">Giá cuối mỗi ghế được giới hạn 1.000–2.000.000đ. Các luật khác và khuyến mãi được tính khi đặt vé.</p></div>
              </section><p className="px-1 text-xs leading-relaxed text-gray-500">Thay đổi chỉ ảnh hưởng báo giá và booking mới. Giá booking đang giữ được bảo toàn.</p>
            </aside>
          </fieldset>
        </div>
        <footer className="shrink-0 border-t border-white/10 bg-[#181818] px-5 py-4 sm:px-7">{(localError || error) && <p role="alert" className="mb-3 text-sm text-red-400">{localError || error}</p>}<div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-gray-500">Kiểm tra phạm vi và mức điều chỉnh trước khi lưu.</p><div className="flex gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-white/15 px-5 py-2.5 text-sm hover:bg-white/5 disabled:opacity-40">Hủy</button><button type="submit" disabled={busy || (trigger === 'SNEAK_SHOW' && (showLoading || !!showError))} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold hover:bg-primary/90 disabled:opacity-40">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{busy ? 'Đang lưu…' : 'Lưu luật giá'}</button></div></div></footer>
      </form>
    </section>
  </div>;
}
