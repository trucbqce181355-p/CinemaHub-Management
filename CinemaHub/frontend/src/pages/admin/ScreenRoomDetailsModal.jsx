import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Edit2, LayoutGrid, Monitor, X } from 'lucide-react';
import ScreenTypeBadge from '../../components/ScreenTypeBadge';

export default function ScreenRoomDetailsModal({ room, cinema, request, onClose, onEdit, onSeats }) {
  const dialogRef = useRef(null);
  const [details, setDetails] = useState(room);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    request(`/cinemas/${room.cinemaId}/rooms/${room.id}`, { signal: controller.signal })
      .then(data => {
        if (!data || data.id !== room.id || data.cinemaId !== room.cinemaId) throw new Error('Thông tin phòng chiếu không hợp lệ.');
        if (!controller.signal.aborted) setDetails(data);
      })
      .catch(cause => { if (!controller.signal.aborted) setError(cause.message || 'Không tải được thông tin phòng chiếu.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [room.id, room.cinemaId, request, retry]);

  const actionsDisabled = loading || Boolean(error) || details.deleted;
  return <dialog ref={dialogRef} aria-labelledby="room-details-title" onCancel={event => { event.preventDefault(); onClose(); }} className="m-auto max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#121212] p-0 text-white shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-sm">
    <div className="flex max-h-[90vh] flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-6 py-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3"><div className="rounded-xl bg-primary/20 p-3 text-primary"><Monitor className="h-6 w-6" /></div><div><h2 id="room-details-title" className="font-display text-2xl font-bold">Chi tiết Phòng Chiếu</h2><p className="mt-1 break-words text-sm text-gray-400">{details.name}</p></div></div>
        <button type="button" onClick={onClose} aria-label="Đóng chi tiết phòng chiếu" className="shrink-0 rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white"><X className="h-6 w-6" /></button>
      </header>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6 sm:p-8">
        {loading && <p role="status" className="text-sm text-gray-400">Đang cập nhật thông tin phòng chiếu...</p>}
        {error && <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"><AlertCircle className="h-4 w-4" />{error}<button type="button" onClick={() => { setError(''); setLoading(true); setRetry(value => value + 1); }} className="ml-auto underline">Thử lại</button></div>}
        {details.deleted && <p role="alert" className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm text-orange-300">Phòng chiếu đã được xóa khỏi danh sách.</p>}
        <section className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="break-words text-xl font-bold">{details.name || 'Chưa đặt tên'}</h3>
          <dl className="grid gap-6 text-sm sm:grid-cols-2">
            <div><dt className="mb-1 text-gray-500">Cụm rạp</dt><dd className="break-words text-gray-200">{cinema?.name || 'Chưa cập nhật'}</dd></div>
            <div><dt className="mb-1 text-gray-500">Trạng thái hoạt động</dt><dd><span className={'inline-flex rounded-full border px-3 py-1 text-xs font-medium ' + (details.status === 'Disabled' ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-green-500/20 bg-green-500/10 text-green-400')}>{details.status === 'Disabled' ? 'Ngưng hoạt động' : 'Đang hoạt động'}</span></dd></div>
            <div><dt className="mb-1 text-gray-500">Sức chứa</dt><dd className="text-gray-200">{details.capacity != null ? `${details.capacity} ghế` : 'Chưa cập nhật'}</dd></div>
            <div><dt className="mb-1 text-gray-500">Loại màn hình</dt><dd><ScreenTypeBadge screenType={details.screenType} /></dd></div>
          </dl>
        </section>
      </div>
      <footer className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-white/10 px-6 py-4 sm:px-8">
        <button type="button" onClick={onClose} className="rounded-xl px-5 py-3 text-gray-300 hover:bg-white/10">Đóng</button>
        <button type="button" disabled={actionsDisabled} onClick={() => onSeats(details)} className="flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-gray-200 hover:bg-white/15 disabled:opacity-50"><LayoutGrid className="h-4 w-4" />Sơ đồ ghế</button>
        <button type="button" disabled={actionsDisabled} onClick={() => onEdit(details)} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold hover:bg-red-700 disabled:opacity-50"><Edit2 className="h-4 w-4" />Chỉnh sửa</button>
      </footer>
    </div>
  </dialog>;
}
