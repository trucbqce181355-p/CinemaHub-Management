import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CalendarDays, Edit2, MapPin, Monitor, X } from 'lucide-react';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const dateInputStyle = 'mt-2 w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white outline-none focus:border-primary/50';
const localDate = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const displayTime = value => value ? String(value).replace('T', ' ').slice(0, 16) : 'Chưa cập nhật';

function DetailList({ title, items }) {
  return <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
    <h3 className="mb-3 font-semibold">{title}</h3>
    {items?.length ? <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-300">{items.map((item, index) => <li key={index} className="break-words">{item}</li>)}</ul> : <p className="text-sm text-gray-500">Chưa cập nhật</p>}
  </section>;
}

export default function CinemaDetailsModal({ cinema, request, onClose, onEdit }) {
  const dialogRef = useRef(null);
  const [details, setDetails] = useState(cinema);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [from, setFrom] = useState(() => localDate());
  const [to, setTo] = useState(() => localDate(7));
  const [showtimes, setShowtimes] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleRetry, setScheduleRetry] = useState(0);
  const rangeInvalid = !from || !to || to < from || (new Date(to) - new Date(from)) / 86400000 > 30;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    request(`/cinemas/${cinema.id}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setDetails(data); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause.message || 'Không tải được thông tin rạp.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [cinema.id, request, retry]);

  useEffect(() => {
    if (rangeInvalid) return;
    const controller = new AbortController();
    request(`/cinemas/${cinema.id}/showtimes?from=${from}&to=${to}`, { signal: controller.signal })
      .then(data => {
        if (!Array.isArray(data)) throw new Error('Dữ liệu lịch chiếu không hợp lệ.');
        if (!controller.signal.aborted) setShowtimes(data);
      })
      .catch(cause => { if (!controller.signal.aborted) setScheduleError(cause.message || 'Không tải được lịch chiếu.'); })
      .finally(() => { if (!controller.signal.aborted) setScheduleLoading(false); });
    return () => controller.abort();
  }, [cinema.id, request, from, to, rangeInvalid, scheduleRetry]);

  function changeDate(setDate, value) {
    setDate(value);
    setShowtimes([]);
    setScheduleError('');
    setScheduleLoading(true);
  }

  const image = details.imageUrl || (details.imageId ? `${API}/cinemas/images/${details.imageId}` : null);
  return <dialog ref={dialogRef} aria-labelledby="cinema-details-title" onCancel={event => { event.preventDefault(); onClose(); }} className="m-auto max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#121212] p-0 text-white shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-sm">
    <div className="flex max-h-[90vh] flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-6 py-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3"><div className="rounded-xl bg-primary/20 p-3 text-primary"><MapPin className="h-6 w-6" /></div><div><h2 id="cinema-details-title" className="font-display text-2xl font-bold">Chi tiết Cụm Rạp</h2><p className="mt-1 break-words text-sm text-gray-400">{details.name}</p></div></div>
        <button type="button" onClick={onClose} aria-label="Đóng chi tiết rạp" className="shrink-0 rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white"><X className="h-6 w-6" /></button>
      </header>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6 sm:p-8">
        {loading && <p role="status" className="text-sm text-gray-400">Đang cập nhật thông tin rạp...</p>}
        {error && <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"><AlertCircle className="h-4 w-4" />{error}<button type="button" onClick={() => { setError(''); setLoading(true); setRetry(value => value + 1); }} className="ml-auto underline">Thử lại</button></div>}
        <section className="overflow-hidden rounded-2xl border border-white/10">
          {image ? <img src={image} alt={`Ảnh ${details.name}`} className="block h-auto w-full" /> : <div className="flex h-40 flex-col items-center justify-center gap-2 bg-white/5 text-gray-500"><Monitor className="h-10 w-10" /><span className="text-sm">Chưa có ảnh rạp</span></div>}
          <div className="space-y-5 p-5">
            <h3 className="break-words text-xl font-bold">{details.name}</h3>
            <dl className="grid gap-5 text-sm sm:grid-cols-2">
              <div><dt className="mb-1 text-gray-500">Địa chỉ</dt><dd className="whitespace-pre-wrap break-words text-gray-200">{details.address || 'Chưa cập nhật'}</dd></div>
              <div><dt className="mb-1 text-gray-500">Email liên hệ</dt><dd className="break-all text-gray-200">{details.contactEmail || 'Chưa cập nhật'}</dd></div>
              <div><dt className="mb-1 text-gray-500">Số tổng đài</dt><dd className="text-gray-200">{details.contactPhone || 'Chưa cập nhật'}</dd></div>
              <div><dt className="mb-1 text-gray-500">Trạng thái hoạt động</dt><dd><span className={'inline-flex rounded-full border px-3 py-1 text-xs font-medium ' + (details.status === 'Disabled' ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-green-500/20 bg-green-500/10 text-green-400')}>{details.status === 'Disabled' ? 'Ngưng hoạt động' : 'Đang hoạt động'}</span></dd></div>
              <div className="sm:col-span-2"><dt className="mb-1 text-gray-500">Mô tả ngắn</dt><dd className="whitespace-pre-wrap break-words leading-relaxed text-gray-200">{details.description || 'Chưa cập nhật'}</dd></div>
              {details.mapCoordinates && Object.keys(details.mapCoordinates).length > 0 && <div className="sm:col-span-2"><dt className="mb-1 text-gray-500">Tọa độ bản đồ</dt><dd className="text-gray-200">{Object.entries(details.mapCoordinates).map(([key, value]) => `${key}: ${value}`).join(' · ')}</dd></div>}
            </dl>
          </div>
        </section>
        <DetailList title="Tiện ích" items={details.facilities} />
        <div className="grid gap-5 sm:grid-cols-2"><DetailList title="Quy định tại rạp" items={details.houseRules} /><DetailList title="Dịch vụ tại rạp" items={details.services} /></div>
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="flex items-center gap-2 font-semibold"><CalendarDays className="h-5 w-5 text-primary" />Lịch chiếu theo khoảng ngày</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm text-gray-300">Từ ngày<input type="date" value={from} onChange={event => changeDate(setFrom, event.target.value)} className={dateInputStyle} /></label><label className="text-sm text-gray-300">Đến ngày<input type="date" value={to} onChange={event => changeDate(setTo, event.target.value)} className={dateInputStyle} /></label></div>
          {rangeInvalid ? <p role="alert" className="mt-3 text-sm text-red-400">Chọn khoảng ngày hợp lệ, tối đa 31 ngày.</p> : scheduleError ? <p role="alert" className="mt-3 text-sm text-red-400">{scheduleError} <button type="button" onClick={() => { setScheduleError(''); setScheduleLoading(true); setScheduleRetry(value => value + 1); }} className="underline">Thử lại</button></p> : scheduleLoading ? <p role="status" className="mt-4 text-sm text-gray-400">Đang tải lịch chiếu...</p> : showtimes.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="text-gray-500"><tr><th className="p-2 font-medium">Phim / Phòng</th><th className="p-2 font-medium">Bắt đầu / Kết thúc</th><th className="p-2 font-medium">Trạng thái</th></tr></thead><tbody className="divide-y divide-white/5">{showtimes.map(showtime => <tr key={showtime.id}><td className="p-2"><p>{showtime.movieTitle || 'Chưa cập nhật'}</p><p className="mt-1 text-xs text-gray-400">{showtime.roomName || 'Phòng chiếu'} · {showtime.format}</p></td><td className="p-2 text-gray-300"><p>{displayTime(showtime.startTime)}</p><p className="mt-1 text-gray-500">{displayTime(showtime.endTime)}</p></td><td className="p-2 text-gray-300">{{ Active: 'Đang hoạt động', Cancelled: 'Đã hủy', Disabled: 'Ngưng hoạt động' }[showtime.status] || showtime.status}</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-gray-400">Chưa có suất chiếu trong khoảng ngày đã chọn.</p>}
        </section>
      </div>
      <footer className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-white/10 px-6 py-4 sm:px-8">
        <button type="button" onClick={onClose} className="rounded-xl px-5 py-3 text-gray-300 hover:bg-white/10">Đóng</button>
        <Link to={`/admin/cinemas/${details.id}/rooms`} className="flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-gray-200 hover:bg-white/15"><Monitor className="h-4 w-4" />Phòng chiếu</Link>
        <button type="button" disabled={loading || Boolean(error)} onClick={() => onEdit(details)} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold hover:bg-red-700 disabled:opacity-50"><Edit2 className="h-4 w-4" />Chỉnh sửa</button>
      </footer>
    </div>
  </dialog>;
}
