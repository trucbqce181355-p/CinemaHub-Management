import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, AlertTriangle, ArrowLeft, Check, Edit2, Eye, EyeOff, Filter, Monitor, Plus, Search, Trash2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CustomSelect from '../../components/CustomSelect';
import ScreenTypeBadge from '../../components/ScreenTypeBadge';
import SeatManagementModal from './SeatManagementModal';
import ScreenRoomDetailsModal from './ScreenRoomDetailsModal';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const inputStyle = 'mt-2 w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50';
const screenTypes = [
  { value: '2D', label: '2D Tiêu chuẩn' },
  { value: '3D', label: '3D Nổi' },
  { value: 'IMAX', label: 'IMAX Cực đại' },
  { value: '4DX', label: '4DX Chuyển động' },
];
const emptyRoom = () => ({ name: '', capacity: 50, screenType: '2D', status: 'Active' });

export default function ScreenRoomManagement() {
  const { cinemaId } = useParams();
  const { user } = useAuth();
  const [cinema, setCinema] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [editing, setEditing] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [busy, setBusy] = useState(false);
  const [seatModalRoom, setSeatModalRoom] = useState(null);
  const roomPath = `/cinemas/${cinemaId}/rooms`;

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(API + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token}`, ...options.headers },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || data?.message || `Yêu cầu thất bại (${response.status}).`);
    return data;
  }, [user?.token]);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const [cinemaData, roomData] = await Promise.all([
        request(`/cinemas/${cinemaId}`, { signal }),
        request(`/cinemas/${cinemaId}/rooms`, { signal }),
      ]);
      if (!Array.isArray(roomData)) throw new Error('Danh sách phòng chiếu không hợp lệ.');
      if (!signal?.aborted) {
        setCinema(cinemaData);
        setRooms(roomData);
      }
    } catch (cause) {
      if (!signal?.aborted) setError(cause.message || 'Không tải được phòng chiếu.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [cinemaId, request]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) load(controller.signal); });
    return () => controller.abort();
  }, [load]);

  const query = search.trim().toLocaleLowerCase('vi-VN');
  const filtered = rooms.filter(room =>
    !room.deleted && (filterStatus === 'All' || room.status === filterStatus) &&
    (!query || [room.name, room.screenType].some(value => String(value || '').toLocaleLowerCase('vi-VN').includes(query)))
  );

  function openForm(room = null) {
    setEditing(room);
    setForm(room ? { name: room.name || '', capacity: room.capacity, screenType: room.screenType || '2D', status: room.status || 'Active' } : emptyRoom());
    setFormError('');
    setNotice('');
  }

  function update(key, value) {
    setForm(current => ({ ...current, [key]: value }));
    setFormError('');
  }

  async function save(event) {
    event.preventDefault();
    if (busy) return;
    const name = form.name.trim();
    const capacity = Number(form.capacity);
    if (!name) { setFormError('Vui lòng nhập tên phòng chiếu.'); return; }
    if (!Number.isInteger(capacity) || capacity < 10) { setFormError('Sức chứa phải là số nguyên từ 10 ghế trở lên.'); return; }
    const payload = { ...(editing || {}), ...form, name, capacity };
    setBusy(true);
    setFormError('');
    try {
      await request(editing ? `${roomPath}/${editing.id}` : roomPath, {
        method: editing ? 'PUT' : 'POST', body: JSON.stringify(payload),
      });
      setForm(null);
      setEditing(null);
      setNotice(editing ? 'Đã cập nhật phòng chiếu.' : 'Đã thêm phòng chiếu.');
      await load();
    } catch (cause) {
      setFormError(cause.message || 'Không lưu được phòng chiếu.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(room) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const status = room.status === 'Disabled' ? 'Active' : 'Disabled';
      await request(`${roomPath}/${room.id}`, { method: 'PUT', body: JSON.stringify({ ...room, status }) });
      setNotice(status === 'Active' ? 'Đã kích hoạt phòng chiếu.' : 'Đã ngưng hoạt động phòng chiếu.');
      await load();
    } catch (cause) { setError(cause.message || 'Không đổi được trạng thái phòng chiếu.'); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    setDeleteError('');
    try {
      await request(`${roomPath}/${deleting.id}/soft-delete`, { method: 'DELETE' });
      setDeleting(null);
      setNotice('Đã xóa phòng chiếu khỏi danh sách. Dữ liệu vẫn được lưu giữ.');
      await load();
    } catch (cause) {
      setDeleteError(cause.message || 'Không xóa được phòng chiếu.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="h-full text-white"><div className="mx-auto max-w-7xl">
    <Link to="/admin/cinemas" className="mb-5 inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"><ArrowLeft className="h-4 w-4" />Quay lại Quản lý Cụm Rạp</Link>
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="flex items-center gap-3 font-display text-3xl font-bold"><Monitor className="h-8 w-8 text-primary" />Quản lý Phòng Chiếu</h1>
        {cinema && <p className="mt-2 text-sm text-gray-400">{cinema.name}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="group relative min-w-[250px] flex-1 sm:flex-none"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-primary" /><input type="search" aria-label="Tìm kiếm phòng chiếu" placeholder="Tìm tên phòng, loại màn hình..." value={search} onChange={event => setSearch(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] py-2.5 pl-9 pr-4 text-sm outline-none placeholder:text-gray-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50" /></div>
        <CustomSelect floating ariaLabel="Lọc trạng thái phòng chiếu" value={filterStatus} onChange={setFilterStatus} icon={Filter} options={[{ value: 'All', label: 'Tất cả trạng thái' }, { value: 'Active', label: 'Đang hoạt động' }, { value: 'Disabled', label: 'Ngưng hoạt động' }]} />
        <button type="button" disabled={busy || loading || !cinema} onClick={() => openForm()} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-medium shadow-lg shadow-primary/20 hover:bg-red-700 disabled:opacity-50"><Plus className="h-4 w-4" />Thêm phòng mới</button>
      </div>
    </div>

    {error && <div role="alert" className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"><AlertCircle className="h-4 w-4" />{error}<button type="button" onClick={() => load()} className="ml-auto underline">Thử lại</button></div>}
    {notice && <p role="status" className="mb-4 rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-300">{notice}</p>}
    <div className="glass-panel overflow-hidden rounded-2xl border border-white/10 bg-[#121212]/80 backdrop-blur-xl"><div className="overflow-x-auto"><table className="w-full min-w-[750px] border-collapse text-left">
      <thead><tr className="border-b border-white/10 bg-white/5 text-gray-300"><th className="p-4 font-medium">Tên phòng chiếu</th><th className="p-4 font-medium">Sức chứa</th><th className="p-4 font-medium">Loại màn hình</th><th className="p-4 font-medium">Trạng thái</th><th className="p-4 text-center font-medium">Hành động</th></tr></thead>
      <tbody className="divide-y divide-white/5">{loading ? <tr><td colSpan={5} className="p-8 text-center text-gray-400"><div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />Đang tải dữ liệu...</td></tr> : filtered.length === 0 ? <tr><td colSpan={5} className="p-12 text-center text-gray-400">{search || filterStatus !== 'All' ? 'Không tìm thấy phòng chiếu phù hợp.' : 'Chưa có phòng chiếu nào.'}</td></tr> : filtered.map(room => <tr key={room.id} onClick={event => { if (!busy && !event.target.closest('a, button, input, select, textarea')) setSelectedRoom(room); }} className="cursor-pointer transition-colors hover:bg-white/5">
        <td className="p-4"><button type="button" disabled={busy} onClick={() => setSelectedRoom(room)} aria-label={'Xem chi tiết ' + room.name} className="flex items-center gap-2 rounded text-left text-base font-bold hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40"><Monitor className="h-4 w-4 shrink-0 text-primary" />{room.name}</button></td>
        <td className="p-4 text-sm text-gray-300">{room.capacity} ghế</td>
        <td className="p-4"><ScreenTypeBadge screenType={room.screenType} /></td>
        <td className="p-4"><span className={'inline-flex rounded-full border px-3 py-1 text-xs font-medium ' + (room.status === 'Disabled' ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-green-500/20 bg-green-500/10 text-green-400')}>{room.status === 'Disabled' ? 'Ngưng hoạt động' : 'Đang hoạt động'}</span></td>
        <td className="p-4"><div className="flex items-center justify-center gap-2">
          <button type="button" disabled={busy} onClick={() => toggleStatus(room)} title={room.status === 'Disabled' ? 'Kích hoạt phòng chiếu' : 'Ngưng hoạt động'} aria-label={(room.status === 'Disabled' ? 'Kích hoạt ' : 'Ngưng hoạt động ') + room.name} className={'rounded-lg p-2 disabled:opacity-40 ' + (room.status === 'Disabled' ? 'text-green-400 hover:bg-green-400/20' : 'text-orange-400 hover:bg-orange-400/20')}>{room.status === 'Disabled' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
          <button type="button" disabled={busy || room.status !== 'Disabled'} onClick={() => { setDeleting(room); setDeleteError(''); }} title={room.status === 'Disabled' ? 'Xóa khỏi danh sách' : 'Ngưng hoạt động phòng chiếu trước khi xóa'} aria-label={'Xóa ' + room.name} className="rounded-lg p-2 text-red-400 hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
        </div></td>
      </tr>)}</tbody>
    </table></div></div>
  </div>

  {selectedRoom && <ScreenRoomDetailsModal room={selectedRoom} cinema={cinema} request={request} onClose={() => setSelectedRoom(null)} onEdit={room => { setSelectedRoom(null); openForm(room); }} onSeats={room => { setSelectedRoom(null); setSeatModalRoom(room); }} />}

  {form && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="room-form-title" className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#121212] shadow-2xl">
    <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-5 sm:px-8"><div className="flex items-center gap-3"><div className="rounded-xl bg-primary/20 p-3 text-primary">{editing ? <Edit2 className="h-6 w-6" /> : <Plus className="h-6 w-6" />}</div><h2 id="room-form-title" className="font-display text-2xl font-bold">{editing ? 'Cập nhật thông tin Phòng Chiếu' : 'Thêm Phòng Chiếu Mới'}</h2></div><button type="button" disabled={busy} onClick={() => setForm(null)} aria-label="Đóng" className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white"><X className="h-6 w-6" /></button></header>
    <form onSubmit={save} className="flex min-h-0 flex-1 flex-col"><div className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-8"><fieldset disabled={busy} className="space-y-6">
      {formError && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400"><AlertCircle className="h-5 w-5 shrink-0" />{formError}</div>}
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-400">Cụm rạp: <span className="font-medium text-white">{cinema?.name}</span></div>
      <div className="grid gap-6 md:grid-cols-2"><label className="text-sm font-medium text-gray-300">Tên phòng chiếu *<input required value={form.name} onChange={event => update('name', event.target.value)} placeholder="Hãy nhập Tên phòng chiếu..." className={inputStyle} /></label><label className="text-sm font-medium text-gray-300">Sức chứa (ghế) *<input required type="number" min={10} step={1} value={form.capacity} onChange={event => update('capacity', event.target.value)} className={inputStyle} /></label></div>
      <div className="grid gap-6 md:grid-cols-2"><div className="text-sm font-medium text-gray-300"><label htmlFor="room-screen-type">Loại màn hình *</label><CustomSelect id="room-screen-type" floating size="form" className="mt-2" disabled={busy} value={form.screenType} onChange={value => update('screenType', value)} options={screenTypes.some(type => type.value === form.screenType) ? screenTypes : [{ value: form.screenType, label: form.screenType }, ...screenTypes]} /></div><div className="text-sm font-medium text-gray-300"><label htmlFor="room-status">Trạng thái</label>{editing ? <CustomSelect id="room-status" floating size="form" className="mt-2" disabled={busy} value={form.status} onChange={value => update('status', value)} options={[{ value: 'Active', label: 'Đang hoạt động' }, { value: 'Disabled', label: 'Ngưng hoạt động' }]} /> : <input id="room-status" type="text" readOnly value="Đang hoạt động" className={inputStyle} />}</div></div>
    </fieldset></div><div className="flex shrink-0 justify-end gap-4 border-t border-white/10 bg-[#121212] px-6 py-4 sm:px-8"><button type="button" disabled={busy} onClick={() => setForm(null)} className="rounded-xl px-6 py-3 text-gray-300 hover:bg-white/10 hover:text-white">Hủy bỏ</button><button type="submit" disabled={busy} className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 font-bold shadow-lg shadow-primary/20 hover:bg-red-700 disabled:opacity-50">{busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Check className="h-5 w-5" />}{busy ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Thêm phòng'}</button></div></form>
  </section></div>}

  {deleting && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><section role="alertdialog" aria-modal="true" aria-labelledby="delete-room-title" className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[#121212] p-8 text-center shadow-2xl"><div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-red-500"><AlertTriangle className="h-8 w-8" /></div><h2 id="delete-room-title" className="mb-2 font-display text-2xl font-bold">Xóa Phòng Chiếu?</h2><p className="text-sm leading-relaxed text-gray-400"><strong className="text-white">{deleting.name}</strong> sẽ được ẩn khỏi danh sách. Dữ liệu phòng chiếu và sơ đồ ghế vẫn được lưu giữ trong hệ thống.</p>{deleteError && <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-left text-xs text-red-400">{deleteError}</p>}<div className="mt-7 flex justify-center gap-3"><button type="button" disabled={busy} onClick={() => setDeleting(null)} className="rounded-xl bg-white/10 px-5 py-3 font-medium hover:bg-white/15">Hủy bỏ</button><button type="button" disabled={busy} onClick={remove} className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-bold hover:bg-red-700 disabled:opacity-50"><Trash2 className="h-4 w-4" />{busy ? 'Đang xóa...' : 'Xóa khỏi danh sách'}</button></div></section></div>}
  {seatModalRoom && <SeatManagementModal room={seatModalRoom} onClose={() => { setSeatModalRoom(null); load(); }} />}
  </div>;
}
