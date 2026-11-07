import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Clock3, Clapperboard, CalendarClock, Check, Edit2, X, Plus, RefreshCcw, Search, ArrowUpRight, ArrowDownRight, LoaderCircle } from 'lucide-react';
import CustomSelect from './CustomSelect';
import QuickPresets from './QuickPresets';
import { annualDateLabel, dateForYear, parseAnnualDate } from '../utils/pricingRulePresets';
import { pricingRulePayload, weekendDaysLabel, weekendOptions } from '../utils/pricingRuleForm';
import { filterPricingShowtimes } from '../utils/pricingShowtimes';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const money = n => Number(n || 0).toLocaleString('vi-VN') + 'đ';
const dateLabel = d => new Date(d + 'T00:00:00').toLocaleDateString('vi-VN');
const types = [
  { id: 'WEEKEND', name: 'Cuối tuần', detail: 'Chọn Thứ Bảy, Chủ nhật hoặc cả hai', icon: CalendarDays },
  { id: 'HOLIDAY', name: 'Ngày lễ / ngày đặc biệt', detail: 'Chọn một hoặc nhiều ngày cụ thể', icon: CalendarClock },
  { id: 'LATE_NIGHT', name: 'Theo khung giờ', detail: 'Áp dụng từ giờ bắt đầu bạn chọn', icon: Clock3 },
  { id: 'SNEAK_SHOW', name: 'Suất chiếu sớm', detail: 'Chọn trực tiếp các suất chiếu', icon: Clapperboard },
];
const control = 'w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 disabled:opacity-50';
const section = 'rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5 space-y-4';

export default function PricingRuleEditor({ initialValue, editing, busy, error, onSave, onClose, presetScope = 'local' }) {
  const [trigger, setTrigger] = useState(initialValue.triggerVariable);
  const [direction, setDirection] = useState(Number(initialValue.adjustmentValue) < 0 ? 'decrease' : 'increase');
  const [amount, setAmount] = useState(initialValue.adjustmentValue === '' ? '' : Math.abs(Number(initialValue.adjustmentValue)));
  const [dates, setDates] = useState(initialValue.conditionParams?.dates || []);
  const [showtimeIds, setShowtimeIds] = useState(initialValue.conditionParams?.showtimeIds || []);
  const [startHour, setStartHour] = useState(initialValue.conditionParams?.startHour ?? 22);
  const [weekendDays, setWeekendDays] = useState(initialValue.conditionParams?.daysOfWeek ?? (editing ? ['SATURDAY', 'SUNDAY'] : []));
  const [status, setStatus] = useState(editing ? initialValue.status || 'Active' : 'Active');
  const [draftDate, setDraftDate] = useState('');
  const [showtimes, setShowtimes] = useState([]), [showLoading, setShowLoading] = useState(initialValue.triggerVariable === 'SNEAK_SHOW'), [showError, setShowError] = useState(''), [retry, setRetry] = useState(0);
  const [search, setSearch] = useState(''), [cinema, setCinema] = useState(''), [movie, setMovie] = useState(''), [screeningDate, setScreeningDate] = useState('');
  const [showtimeClock, setShowtimeClock] = useState(() => Date.now());
  const [localError, setLocalError] = useState(''), [example, setExample] = useState(100000);
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
    fetch(API + '/showtimes?includePast=true&allStatuses=true', { signal: controller.signal, cache: 'no-store' })
      .then(async res => { if (!res.ok) throw new Error('Không tải được danh sách suất chiếu.'); const data = await res.json(); if (!Array.isArray(data)) throw new Error('Danh sách suất chiếu không hợp lệ.'); return data; })
      .then(data => { if (!controller.signal.aborted) { setShowtimes(data.filter(s => s?.id)); setShowtimeClock(Date.now()); } })
      .catch(e => { if (!controller.signal.aborted || controller.signal.reason === 'timeout') setShowError(controller.signal.reason === 'timeout' ? 'Tải suất chiếu quá thời gian. Vui lòng thử lại.' : e.message); })
      .finally(() => { clearTimeout(timeout); if (!controller.signal.aborted || controller.signal.reason === 'timeout') setShowLoading(false); });
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [trigger, retry]);
  useEffect(() => {
    if (trigger !== 'SNEAK_SHOW') return;
    const refresh = () => {
      if (!document.hidden && !busyRef.current) { setShowtimeClock(Date.now()); setRetry(value => value + 1); }
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [trigger]);

  const currentType = types.find(t => t.id === trigger);
  const signed = Number(amount || 0) * (direction === 'decrease' ? -1 : 1);
  const preview = Math.max(1000, Math.min(2000000, Number(example || 0) + signed));
  const eligibleShowtimes = filterPricingShowtimes(showtimes, { now: showtimeClock });
  const cinemaOptions = [...new Map(eligibleShowtimes.filter(s => s.cinemaId).map(s => [s.cinemaId, s.cinemaName || 'Rạp chưa có tên'])).entries()];
  const movieOptions = [...new Map(eligibleShowtimes.filter(s => s.movieId).map(s => [s.movieId, s.movieTitle || 'Phim chưa có tên'])).entries()];
  const filtered = filterPricingShowtimes(showtimes, { cinema, movie, date: screeningDate, search, now: showtimeClock });
  const selectedShowtimes = eligibleShowtimes.filter(s => showtimeIds.includes(s.id));
  const hiddenSelectedIds = showtimeIds.filter(id => !eligibleShowtimes.some(s => s.id === id));
  const selectable = filtered.map(s => s.id);
  const allSelected = selectable.length > 0 && selectable.every(id => showtimeIds.includes(id));
  function toggleShowtime(id) { setShowtimeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 366 ? [...prev, id] : prev); setLocalError(''); }
  function addDate(value) { if (value && !dates.includes(value) && dates.length < 366) setDates(prev => [...prev, value].sort()); setDraftDate(''); setLocalError(''); }
  function applyDatePreset(monthDay) {
    try {
      const value = dateForYear(new Date().getFullYear(), monthDay);
      if (!dates.includes(value) && dates.length >= 366) throw new Error('Chỉ được chọn tối đa 366 ngày.');
      addDate(value);
    } catch (cause) { setLocalError(cause.message); }
  }
  function submit(e) {
    e.preventDefault(); if (busy) return; setLocalError('');
    try {
      const payload = pricingRulePayload({ trigger, direction, amount, dates, showtimeIds, startHour, weekendDays, status, version: initialValue.version ?? null });
      if (trigger === 'SNEAK_SHOW' && (showLoading || showError || showtimeIds.some(id => !showtimes.some(s => s.id === id))))
        throw new Error('Vui lòng tải danh sách và bỏ các suất chiếu không còn tồn tại trước khi lưu.');
      if (trigger === 'SNEAK_SHOW' && showtimeIds.some(id => !(initialValue.conditionParams?.showtimeIds || []).includes(id)
        && !filterPricingShowtimes(showtimes).some(s => s.id === id)))
        throw new Error('Một số suất vừa chọn không còn hợp lệ. Hãy tải lại và bỏ các suất đã ẩn trước khi lưu.');
      onSave(payload);
    } catch (e) { setLocalError(e.message); }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="pricing-editor-title" className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#121212] text-white shadow-2xl">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-6 py-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3"><div className="rounded-xl bg-primary/20 p-3 text-primary">{editing ? <Edit2 className="h-6 w-6" /> : <Plus className="h-6 w-6" />}</div><h2 id="pricing-editor-title" className="font-display text-2xl font-bold">{editing ? 'Cập nhật Luật Giá động' : 'Thêm Luật Giá động Mới'}</h2></div>
        <button type="button" disabled={busy} onClick={onClose} aria-label="Đóng bảng giá động" className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-40"><X className="h-5 w-5" /></button>
      </header>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-8">
          <fieldset disabled={busy} className="min-w-0 space-y-5">
            <div className="min-w-0 space-y-5">
              <section className={section}><h3 className="font-bold">1. Loại luật áp dụng</h3><div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Loại luật giá">
                {types.map(({ id, name, detail, icon: Icon }) => <button key={id} type="button" aria-pressed={trigger === id} onClick={() => { setTrigger(id); setLocalError(''); }} className={'flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ' + (trigger === id ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/30 hover:bg-white/5')}>
                  <Icon className={'mt-0.5 h-5 w-5 shrink-0 ' + (trigger === id ? 'text-primary' : 'text-gray-400')} /><span className="flex-1"><span className="block font-semibold">{name}</span><span className="mt-1 block text-xs text-gray-400">{detail}</span></span>{trigger === id && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>)}
              </div></section>

              <section className={section}><h3 className="font-bold">2. Điều kiện áp dụng</h3>
                {trigger === 'WEEKEND' && <div className="grid gap-3 sm:grid-cols-2">{weekendOptions.map(day => <label key={day.value} className={'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm '+(weekendDays.includes(day.value)?'border-primary/50 bg-primary/10':'border-white/10 hover:bg-white/5')}><input type="checkbox" checked={weekendDays.includes(day.value)} onChange={event => { setWeekendDays(current => event.target.checked ? [...current, day.value] : current.filter(value => value !== day.value)); setLocalError(''); }} className="h-4 w-4 accent-red-600" />{day.label}</label>)}</div>}
                {trigger === 'LATE_NIGHT' && <><div className="text-sm"><label htmlFor="pricing-start-hour">Áp dụng cho suất chiếu bắt đầu từ</label><CustomSelect id="pricing-start-hour" floating size="form" className="mt-2" disabled={busy} value={startHour} onChange={setStartHour} options={Array.from({ length: 24 }, (_, h) => ({ value: h, label: String(h).padStart(2, '0') + ':00' }))} /></div><QuickPresets key={presetScope+':hours'} storageKey={'cinemahub:pricing-presets:v1:'+presetScope+':hours'} defaults={[18, 20, 22]} limits={{ min: 0, max: 23 }} label="Thiết lập giờ nhanh" unit="giờ (0–23)" format={hour => String(hour).padStart(2, '0')+':00'} selectedValue={startHour} onApply={value => { setStartHour(value); setLocalError(''); }} disabled={busy} /><p className="text-sm text-gray-400">Từ {String(startHour).padStart(2, '0')}:00 đến hết ngày, tính theo giờ bắt đầu suất chiếu.</p></>}
                {trigger === 'HOLIDAY' && <>
                  <div className="flex flex-wrap items-end gap-3"><label className="flex-1 text-sm">Chọn ngày<input type="date" value={draftDate} onChange={e => setDraftDate(e.target.value)} className={control + ' mt-2 [color-scheme:dark]'} /></label><button type="button" disabled={!draftDate || dates.length >= 366} onClick={() => addDate(draftDate)} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm hover:bg-white/15 disabled:opacity-40"><Plus className="h-4 w-4" />Thêm ngày</button></div>
                  <div className="rounded-xl border border-white/10 p-3"><QuickPresets key={presetScope+':dates'} storageKey={'cinemahub:pricing-presets:v1:'+presetScope+':dates'} defaults={['01-01', '04-30', '05-01', '09-02', '12-24', '12-31']} limits={{}} parseValue={parseAnnualDate} formatInput={annualDateLabel} inputMode="text" placeholder="DD/MM, ví dụ 25/12" label="Thiết lập ngày nhanh" unit="DD/MM" format={annualDateLabel} selectedValues={dates.filter(date => date.startsWith(new Date().getFullYear()+'-')).map(date => date.slice(5))} onApply={applyDatePreset} disabled={busy} /></div>
                  <div className="flex items-center justify-between text-sm"><span>Đã chọn {dates.length} ngày</span>{dates.length > 0 && <button type="button" onClick={() => setDates([])} className="text-gray-400 hover:text-white">Bỏ chọn tất cả</button>}</div><div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">{dates.map(d => <button type="button" key={d} onClick={() => setDates(prev => prev.filter(x => x !== d))} aria-label={'Bỏ ngày ' + dateLabel(d)} className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-red-200">{dateLabel(d)}<X className="h-3 w-3" /></button>)}</div>
                </>}
                {trigger === 'SNEAK_SHOW' && <>
                  <div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" /><input aria-label="Tìm suất chiếu" placeholder="Tìm phim, rạp hoặc phòng chiếu…" value={search} onChange={e => setSearch(e.target.value)} className={control + ' pl-10'} /></div>
                  <div className="grid gap-3 sm:grid-cols-2"><div className="min-w-0 text-xs text-gray-400"><label htmlFor="pricing-cinema">Rạp</label><CustomSelect id="pricing-cinema" floating className="mt-1" disabled={busy} value={cinema} onChange={setCinema} options={[{ value: '', label: 'Tất cả rạp' }, ...cinemaOptions.map(([id, title]) => ({ value: id, label: title }))]} /></div><div className="min-w-0 text-xs text-gray-400"><label htmlFor="pricing-movie">Phim</label><CustomSelect id="pricing-movie" floating className="mt-1" disabled={busy} value={movie} onChange={setMovie} options={[{ value: '', label: 'Tất cả phim' }, ...movieOptions.map(([id, title]) => ({ value: id, label: title }))]} /></div><label className="text-xs text-gray-400 sm:col-span-2">Ngày chiếu<input type="date" value={screeningDate} onChange={e => setScreeningDate(e.target.value)} className={control + ' mt-1 text-sm [color-scheme:dark]'} /></label></div>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs"><button type="button" disabled={showLoading || busy} onClick={() => { setShowtimeClock(Date.now()); setRetry(n => n + 1); }} className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-gray-300 hover:bg-white/10 disabled:opacity-40"><RefreshCcw className="h-3.5 w-3.5" />Tải lại suất chiếu</button><span className="text-primary">Đã chọn {selectedShowtimes.length} suất sắp chiếu</span></div>
                  {showLoading ? <p role="status" className="flex items-center gap-2 py-5 text-sm text-gray-400"><LoaderCircle className="h-4 w-4 animate-spin" />Đang tải suất chiếu…</p> : showError ? <div role="alert" className="rounded-xl bg-red-500/10 p-4 text-sm text-red-300">{showError}<button type="button" onClick={() => setRetry(n => n + 1)} className="ml-3 underline">Thử lại</button></div> : <div className="max-h-72 overflow-auto rounded-xl border border-white/10"><table className="w-full min-w-[520px] text-left text-xs"><thead className="sticky top-0 z-10 bg-[#252525]"><tr><th className="p-3"><input type="checkbox" aria-label="Chọn tất cả suất hợp lệ trong bộ lọc" checked={allSelected} disabled={!selectable.length} onChange={() => setShowtimeIds(prev => allSelected ? prev.filter(id => !selectable.includes(id)) : [...new Set([...prev, ...selectable])].slice(0, 366))} className="accent-red-600" /></th><th className="p-3">Phim</th><th className="p-3">Rạp / Phòng</th><th className="p-3">Giờ chiếu</th></tr></thead><tbody>{filtered.map(s => { const checked = showtimeIds.includes(s.id); return <tr key={s.id} className={'border-t border-white/5 ' + (checked ? 'bg-primary/5' : 'hover:bg-white/5')}><td className="p-3"><input type="checkbox" aria-label={'Chọn ' + s.movieTitle + ' ' + s.startTime + ' ' + s.roomName} checked={checked} disabled={!checked && showtimeIds.length >= 366} onChange={() => toggleShowtime(s.id)} className="accent-red-600" /></td><td className="p-3 font-semibold">{s.movieTitle || 'Chưa có tên phim'}<span className="mt-1 block font-normal text-gray-500">{s.format}</span></td><td className="p-3 text-gray-300">{s.cinemaName}<span className="mt-1 block text-gray-500">{s.roomName}</span></td><td className="whitespace-nowrap p-3">{new Date(s.startTime).toLocaleString('vi-VN')}</td></tr>; })}{!filtered.length && <tr><td colSpan="4" className="p-6 text-center text-gray-500">Không có suất chiếu sắp tới đang hoạt động phù hợp với bộ lọc.</td></tr>}</tbody></table></div>}
                  {!showLoading && !showError && selectedShowtimes.length > 0 && <div className="flex flex-wrap gap-2">{selectedShowtimes.map(s => <button key={s.id} type="button" onClick={() => toggleShowtime(s.id)} className="inline-flex max-w-full items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-gray-300"><span className="truncate">{(s.movieTitle || 'Phim') + ' · ' + new Date(s.startTime).toLocaleString('vi-VN') + ' · ' + (s.roomName || 'Phòng chiếu')}</span><X className="h-3 w-3 shrink-0" /></button>)}</div>}
                  {!showLoading && !showError && hiddenSelectedIds.length > 0 && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 p-3 text-xs text-gray-400"><span>{hiddenSelectedIds.length} suất cũ hoặc không còn hợp lệ đã được ẩn; cấu hình được giữ nguyên.</span><button type="button" onClick={() => { setShowtimeIds(current => current.filter(id => !hiddenSelectedIds.includes(id))); setLocalError(''); }} className="text-red-300 hover:text-red-200">Bỏ các suất đã ẩn</button></div>}
                  {showtimeIds.length > 0 && <button type="button" onClick={() => { setShowtimeIds([]); setLocalError(''); }} className="px-2 text-xs text-gray-500 hover:text-white">Bỏ chọn tất cả</button>}
                </>}
              </section>

              <section className={section}><h3 className="font-bold">3. Điều chỉnh giá vé</h3><div className="grid grid-cols-2 gap-3" role="group" aria-label="Hình thức điều chỉnh">{[['increase', 'Tăng giá', ArrowUpRight], ['decrease', 'Giảm giá', ArrowDownRight]].map(([value, label, Icon]) => <button key={value} type="button" aria-pressed={direction === value} onClick={() => setDirection(value)} className={'flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ' + (direction === value ? 'border-primary bg-primary/10 text-red-200' : 'border-white/10 text-gray-400 hover:bg-white/5')}><Icon className="h-4 w-4" />{label}</button>)}</div>
                <label className="block text-sm">Số tiền điều chỉnh trên mỗi ghế<div className="relative mt-2"><input type="number" min="0" max="1000000" step="1" required value={amount} onChange={e => setAmount(e.target.value)} className={control + ' pr-20 text-lg font-semibold'} placeholder="Ví dụ: 20000" /><span className="absolute right-4 top-3.5 text-sm text-gray-500">VND/ghế</span></div></label><QuickPresets key={presetScope+':amount'} storageKey={'cinemahub:pricing-presets:v1:'+presetScope+':amount'} defaults={[10000, 20000, 30000, 50000, 100000]} limits={{ min: 0, max: 1000000 }} label="Thiết lập mức điều chỉnh nhanh" unit="VND/ghế" format={money} selectedValue={amount} onApply={value => { setAmount(value); setLocalError(''); }} disabled={busy} />
              </section>
            </div>

            <aside className="min-w-0 space-y-5"><section className={section}><label htmlFor="pricing-status" className="block font-bold">Trạng thái</label>{editing ? <CustomSelect id="pricing-status" floating size="form" disabled={busy} value={status} onChange={setStatus} options={[{ value: 'Active', label: 'Đang hoạt động' }, { value: 'Disabled', label: 'Vô hiệu hóa' }]} /> : <input id="pricing-status" readOnly value="Đang hoạt động" className={control} />}</section>
              <section className={section}><h3 className="font-bold">Tóm tắt luật giá</h3><dl className="space-y-3 text-sm"><div><dt className="text-xs text-gray-500">Loại áp dụng</dt><dd className="mt-1 font-semibold">{currentType?.name || 'Chưa chọn'}</dd></div><div><dt className="text-xs text-gray-500">Phạm vi</dt><dd className="mt-1">{trigger === 'WEEKEND' ? weekendDaysLabel(weekendDays) : trigger === 'HOLIDAY' ? dates.length + ' ngày đã chọn' : trigger === 'LATE_NIGHT' ? 'Từ ' + String(startHour).padStart(2, '0') + ':00 mỗi ngày' : showtimeIds.length + ' suất đã chọn'}</dd></div><div><dt className="text-xs text-gray-500">Mức điều chỉnh</dt><dd className={'mt-1 text-lg font-bold ' + (direction === 'increase' ? 'text-amber-400' : 'text-green-400')}>{direction === 'increase' ? '+' : '−'}{money(amount)}</dd></div></dl>
                <div className="border-t border-white/10 pt-4"><label className="text-xs text-gray-400">Giá vé minh họa trước điều chỉnh<input type="number" min="1000" max="2000000" step="1" value={example} onChange={e => setExample(e.target.value)} className={control + ' mt-2 text-sm'} /></label><p className="mt-3 text-xs text-gray-500">Khi áp dụng riêng luật này</p><p className="mt-1 text-2xl font-bold text-white">{money(preview)}</p></div>
              </section>
            </aside>
          </fieldset>
        </div>
        <footer className="shrink-0 border-t border-white/10 bg-[#121212] px-6 py-4 sm:px-8">{(localError || error) && <p role="alert" className="mb-3 text-sm text-red-400">{localError || error}</p>}<div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-gray-500">Kiểm tra phạm vi và mức điều chỉnh trước khi lưu.</p><div className="flex gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl px-5 py-3 text-sm text-gray-300 hover:bg-white/10 disabled:opacity-40">Hủy bỏ</button><button type="submit" disabled={busy || (trigger === 'SNEAK_SHOW' && (showLoading || !!showError))} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold hover:bg-red-700 disabled:opacity-40">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{busy ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm luật giá'}</button></div></div></footer>
      </form>
    </section>
  </div>;
}
