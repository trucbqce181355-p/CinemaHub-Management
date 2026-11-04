import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, CalendarDays, Check, Edit2, Eye, EyeOff, Filter, ImagePlus, Mail, MapPin, Phone, Plus, Search, Trash2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CustomSelect from '../../components/CustomSelect';
import CinemaDetailsModal from './CinemaDetailsModal';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const emptyCinema = () => ({ name: '', address: '', contactEmail: '', contactPhone: '', facilities: '', imageUrl: '', imageId: null, description: '', houseRules: '', services: '', status: 'Active' });
const inputStyle = 'mt-2 w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50';
const localDate = (offset = 0) => { const date = new Date(); date.setDate(date.getDate() + offset); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
const lines = value => value.split('\n').map(item => item.trim()).filter(Boolean);
const formatHotline = value => { const digits = value.replace(/\D/g, '').slice(0, 8); return digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits; };

export default function CinemaManagement() {
  const { user } = useAuth();
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [editing, setEditing] = useState(null);
  const [selectedCinema, setSelectedCinema] = useState(null);
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [busy, setBusy] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [scheduleFrom, setScheduleFrom] = useState(() => localDate());
  const [scheduleTo, setScheduleTo] = useState(() => localDate(7));
  const [showtimes, setShowtimes] = useState([]);
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const formOpen = form !== null;

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(API + path, { ...options, headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), Authorization: `Bearer ${user?.token}`, ...options.headers } });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || data?.message || `Yêu cầu thất bại (${response.status}).`);
    return data;
  }, [user?.token]);

  const load = useCallback(async (signal) => {
    setLoading(true); setError('');
    try {
      const data = await request('/cinemas', { signal });
      if (!Array.isArray(data)) throw new Error('Danh sách cụm rạp không hợp lệ.');
      if (!signal?.aborted) setCinemas(data);
    } catch (cause) {
      if (!signal?.aborted) setError(cause.message || 'Không tải được cụm rạp.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [request]);
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) load(controller.signal); });
    return () => controller.abort();
  }, [load]);
  useEffect(() => {
    if (!editing?.id || !formOpen) return;
    if (!scheduleFrom || !scheduleTo || scheduleTo < scheduleFrom || (new Date(scheduleTo) - new Date(scheduleFrom)) / 86400000 > 30) {
      queueMicrotask(() => { setScheduleError('Chọn khoảng ngày hợp lệ, tối đa 31 ngày.'); setShowtimes([]); });
      return;
    }
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) { setScheduleLoading(true); setScheduleError(''); } });
    request(`/cinemas/${editing.id}/showtimes?from=${scheduleFrom}&to=${scheduleTo}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setShowtimes(data); })
      .catch(cause => { if (!controller.signal.aborted) setScheduleError(cause.message || 'Không tải được lịch chiếu.'); })
      .finally(() => { if (!controller.signal.aborted) setScheduleLoading(false); });
    return () => controller.abort();
  }, [editing?.id, formOpen, scheduleFrom, scheduleTo, request]);

  const filtered = cinemas.filter(cinema => {
    const query = search.trim().toLocaleLowerCase('vi-VN');
    return !cinema.deleted && (filterStatus === 'All' || cinema.status === filterStatus) && (!query ||
      String(cinema.name || '').toLocaleLowerCase('vi-VN').includes(query));
  });
  function openForm(cinema = null) {
    setEditing(cinema);
    setForm(cinema ? { name: cinema.name || '', address: cinema.address || '', contactEmail: cinema.contactEmail || '',
      contactPhone: cinema.contactPhone || '', facilities: (cinema.facilities || []).join(', '), imageUrl: cinema.imageUrl || '', imageId: cinema.imageId || null,
      description: cinema.description || '', houseRules: (cinema.houseRules || []).join('\n'), services: (cinema.services || []).join('\n'), status: cinema.status || 'Active' } : emptyCinema());
    setImageFile(null); setScheduleFrom(localDate()); setScheduleTo(localDate(7)); setShowtimes([]); setScheduleError('');
    setFormError(''); setNotice('');
  }
  function update(key, value) { setForm(current => ({ ...current, [key]: value })); setFormError(''); }

  async function save(event) {
    event.preventDefault(); if (busy) return;
    const name = form.name.trim(), address = form.address.trim(), email = form.contactEmail.trim(), phone = form.contactPhone.trim();
    if (!name || !address) { setFormError('Vui lòng nhập tên và địa chỉ cụm rạp.'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFormError('Email liên hệ không hợp lệ.'); return; }
    if (phone && !/^1900\s\d{4}$/.test(phone)) { setFormError('Số tổng đài phải có dạng 1900 xxxx (ví dụ: 1900 1234).'); return; }
    if (form.imageUrl && !/^https:\/\/[^\s/]+/i.test(form.imageUrl.trim())) { setFormError('URL ảnh phải là đường dẫn HTTPS hợp lệ.'); return; }
    if (imageFile && imageFile.size > 5 * 1024 * 1024) { setFormError('Ảnh rạp không được vượt quá 5 MB.'); return; }
    if (form.description.length > 500) { setFormError('Mô tả ngắn tối đa 500 ký tự.'); return; }
    if ([lines(form.houseRules), lines(form.services)].some(items => items.length > 30 || items.some(item => item.length > 200))) { setFormError('Quy định và dịch vụ: tối đa 30 dòng, mỗi dòng tối đa 200 ký tự.'); return; }
    const payload = { ...(editing || {}), name, address, contactEmail: email, contactPhone: phone,
      facilities: form.facilities.split(',').map(value => value.trim()).filter(Boolean), imageUrl: form.imageUrl.trim(), imageId: imageFile ? null : form.imageId,
      description: form.description.trim(), houseRules: lines(form.houseRules), services: lines(form.services), status: form.status };
    setBusy(true); setFormError('');
    try {
      const body = imageFile ? new FormData() : JSON.stringify(payload);
      if (imageFile) { body.append('cinema', new Blob([JSON.stringify(payload)], { type: 'application/json' })); body.append('image', imageFile); }
      await request(editing ? `/cinemas/${editing.id}` : '/cinemas', { method: editing ? 'PUT' : 'POST', body });
      setForm(null); setEditing(null); setNotice(editing ? 'Đã cập nhật cụm rạp.' : 'Đã thêm cụm rạp.'); await load();
    } catch (cause) { setFormError(cause.message || 'Không lưu được cụm rạp.'); }
    finally { setBusy(false); }
  }
  async function toggleStatus(cinema) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const status = cinema.status === 'Disabled' ? 'Active' : 'Disabled';
      await request(`/cinemas/${cinema.id}`, { method: 'PUT', body: JSON.stringify({ ...cinema, status }) });
      setNotice(status === 'Active' ? 'Đã kích hoạt cụm rạp.' : 'Đã ngưng hoạt động cụm rạp.'); await load();
    } catch (cause) { setError(cause.message || 'Không đổi được trạng thái cụm rạp.'); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!deleting || busy) return;
    setBusy(true); setDeleteError('');
    try {
      await request(`/cinemas/${deleting.id}/soft-delete`, { method: 'DELETE' });
      setDeleting(null); setNotice('Đã xóa cụm rạp khỏi danh sách. Dữ liệu vẫn được lưu giữ.'); await load();
    } catch (cause) { setDeleteError(cause.message || 'Không xóa được cụm rạp.'); }
    finally { setBusy(false); }
  }

  return <div className="h-full text-white"><div className="mx-auto max-w-7xl">
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <h1 className="flex items-center gap-3 font-display text-3xl font-bold"><MapPin className="h-8 w-8 text-primary" />Quản lý Cụm Rạp</h1>
      <div className="flex flex-wrap items-center gap-3">
        <div className="group relative min-w-[250px] flex-1 sm:flex-none"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-primary" /><input type="search" aria-label="Tìm kiếm theo Tên rạp" placeholder="Tìm theo Tên rạp..." value={search} onChange={event => setSearch(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] py-2.5 pl-9 pr-4 text-sm outline-none placeholder:text-gray-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50" /></div>
        <CustomSelect floating ariaLabel="Lọc trạng thái cụm rạp" value={filterStatus} onChange={setFilterStatus} icon={Filter} options={[{ value: 'All', label: 'Tất cả trạng thái' }, { value: 'Active', label: 'Đang hoạt động' }, { value: 'Disabled', label: 'Ngưng hoạt động' }]} />
        <button type="button" onClick={() => openForm()} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-medium shadow-lg shadow-primary/20 hover:bg-red-700"><Plus className="h-4 w-4" />Thêm rạp mới</button>
      </div>
    </div>

    {error && <div role="alert" className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"><AlertCircle className="h-4 w-4" />{error}<button type="button" onClick={() => load()} className="ml-auto underline">Thử lại</button></div>}
    {notice && <p role="status" className="mb-4 rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-300">{notice}</p>}
    <div className="glass-panel overflow-hidden rounded-2xl border border-white/10 bg-[#121212]/80 backdrop-blur-xl"><div className="overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-left">
      <thead><tr className="border-b border-white/10 bg-white/5 text-gray-300"><th className="p-4 font-medium">Tên rạp</th><th className="p-4 font-medium">Địa chỉ</th><th className="p-4 font-medium">Liên hệ</th><th className="p-4 font-medium">Trạng thái</th><th className="p-4 text-center font-medium">Hành động</th></tr></thead>
      <tbody className="divide-y divide-white/5">{loading ? <tr><td colSpan={5} className="p-8 text-center text-gray-400"><div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />Đang tải dữ liệu...</td></tr> : filtered.length === 0 ? <tr><td colSpan={5} className="p-12 text-center text-gray-400">{search || filterStatus !== 'All' ? 'Không tìm thấy cụm rạp phù hợp.' : 'Chưa có cụm rạp nào.'}</td></tr> : filtered.map(cinema => <tr key={cinema.id} onClick={event => { if (!event.target.closest('a, button, input, select, textarea')) setSelectedCinema(cinema); }} className="cursor-pointer transition-colors hover:bg-white/5">
        <td className="p-4"><button type="button" onClick={() => setSelectedCinema(cinema)} aria-label={'Xem chi tiết ' + cinema.name} className="rounded text-left text-base font-bold hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{cinema.name || 'Chưa đặt tên'}</button></td>
        <td className="max-w-[280px] p-4 text-sm text-gray-300"><span title={cinema.address} className="line-clamp-2">{cinema.address || 'Chưa cập nhật'}</span></td>
        <td className="p-4 text-sm text-gray-300"><div className="space-y-1.5">{cinema.contactEmail ? <div className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-gray-500" /><span className="break-all">{cinema.contactEmail}</span></div> : null}{cinema.contactPhone ? <div className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-gray-500" />{cinema.contactPhone}</div> : null}{!cinema.contactEmail && !cinema.contactPhone && <span className="italic text-gray-500">Chưa cập nhật</span>}</div></td>
        <td className="p-4"><span className={'inline-flex rounded-full border px-3 py-1 text-xs font-medium ' + (cinema.status === 'Disabled' ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-green-500/20 bg-green-500/10 text-green-400')}>{cinema.status === 'Disabled' ? 'Ngưng hoạt động' : 'Đang hoạt động'}</span></td>
        <td className="p-4"><div className="flex items-center justify-center gap-2"><button type="button" disabled={busy} onClick={() => toggleStatus(cinema)} title={cinema.status === 'Disabled' ? 'Kích hoạt rạp' : 'Ngưng hoạt động'} aria-label={(cinema.status === 'Disabled' ? 'Kích hoạt ' : 'Ngưng hoạt động ') + cinema.name} className={'rounded-lg p-2 disabled:opacity-40 ' + (cinema.status === 'Disabled' ? 'text-green-400 hover:bg-green-400/20' : 'text-orange-400 hover:bg-orange-400/20')}>{cinema.status === 'Disabled' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button><button type="button" disabled={busy || cinema.status !== 'Disabled'} onClick={() => { setDeleting(cinema); setDeleteError(''); }} title={cinema.status === 'Disabled' ? 'Xóa khỏi danh sách' : 'Ngưng hoạt động rạp trước khi xóa'} aria-label={'Xóa ' + cinema.name} className="rounded-lg p-2 text-red-400 hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-4 w-4" /></button></div></td>
      </tr>)}</tbody>
    </table></div></div>
  </div>

  {selectedCinema && <CinemaDetailsModal cinema={selectedCinema} request={request} onClose={() => setSelectedCinema(null)} onEdit={cinema => { setSelectedCinema(null); openForm(cinema); }} />}

  {form && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="cinema-form-title" className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#121212] shadow-2xl">
    <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-5 sm:px-8"><div className="flex items-center gap-3"><div className="rounded-xl bg-primary/20 p-3 text-primary">{editing ? <Edit2 className="h-6 w-6" /> : <Plus className="h-6 w-6" />}</div><h2 id="cinema-form-title" className="font-display text-2xl font-bold">{editing ? 'Cập nhật thông tin Rạp' : 'Thêm Rạp Mới'}</h2></div><button type="button" disabled={busy} onClick={() => setForm(null)} aria-label="Đóng" className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white"><X className="h-6 w-6" /></button></header>
    <form onSubmit={save} className="flex min-h-0 flex-1 flex-col"><div className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-8"><fieldset disabled={busy} className="space-y-6">{formError && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400"><AlertCircle className="h-5 w-5 shrink-0" />{formError}</div>}
      <div className="grid gap-6 md:grid-cols-2"><label className="text-sm font-medium text-gray-300">Tên rạp *<input required maxLength={200} value={form.name} onChange={event => update('name', event.target.value)} placeholder="Hãy nhập Tên rạp..." className={inputStyle} /></label><label className="text-sm font-medium text-gray-300">Số tổng đài<input type="tel" inputMode="numeric" maxLength={9} value={form.contactPhone} onChange={event => update('contactPhone', formatHotline(event.target.value))} placeholder="Hãy nhập Số tổng đài..." className={inputStyle} /></label></div>
      <label className="block text-sm font-medium text-gray-300">Địa chỉ *<input required value={form.address} onChange={event => update('address', event.target.value)} placeholder="Hãy nhập Địa chỉ..." className={inputStyle} /></label>
      <div className="grid gap-6 md:grid-cols-2"><label className="text-sm font-medium text-gray-300">Email liên hệ<input type="email" value={form.contactEmail} onChange={event => update('contactEmail', event.target.value)} placeholder="Hãy nhập Email..." className={inputStyle} /></label><div className="text-sm font-medium text-gray-300"><label htmlFor="cinema-status">Trạng thái</label>{editing ? <CustomSelect id="cinema-status" floating size="form" className="mt-2" disabled={busy} value={form.status} onChange={value => update('status', value)} options={[{ value: 'Active', label: 'Đang hoạt động' }, { value: 'Disabled', label: 'Ngưng hoạt động' }]} /> : <input id="cinema-status" type="text" readOnly value="Đang hoạt động" className={inputStyle} />}</div></div>
      <label className="block text-sm font-medium text-gray-300">Tiện ích<input value={form.facilities} onChange={event => update('facilities', event.target.value)} placeholder="Hãy nhập Tiện ích..." className={inputStyle} /><span className="mt-2 block text-xs font-normal text-gray-500">Ngăn cách các tiện ích bằng dấu phẩy.</span></label>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4"><h3 className="flex items-center gap-2 font-semibold"><ImagePlus className="h-5 w-5 text-primary" />Ảnh và giới thiệu rạp</h3>
        <label className="block text-sm text-gray-300">URL ảnh rạp<input type="url" maxLength={2048} value={form.imageUrl} disabled={Boolean(imageFile)} onChange={event => { update('imageUrl', event.target.value); if (event.target.value) update('imageId', null); }} placeholder="Hãy nhập URL ảnh rạp..." className={inputStyle} /><span className="mt-1 block text-xs text-gray-500">Dùng URL HTTPS hoặc chọn file ảnh từ máy.</span></label>
        <label className="block text-sm text-gray-300">Tải ảnh từ máy<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.target.files?.[0] || null; setImageFile(file); if (file) { update('imageUrl', ''); setForm(current => ({ ...current, imageId: null })); } }} className={inputStyle} /><span className="mt-1 block text-xs text-gray-500">JPEG, PNG hoặc WebP; tối đa 5 MB. Ảnh được lưu cùng dữ liệu rạp.</span></label>
        {imageFile && <p className="text-sm text-green-300">Đã chọn: {imageFile.name} <button type="button" onClick={() => setImageFile(null)} className="ml-2 underline">Bỏ chọn</button></p>}
        {!imageFile && (form.imageUrl || form.imageId) && <div className="flex items-center gap-4"><img src={form.imageUrl || `${API}/cinemas/images/${form.imageId}`} alt="Xem trước ảnh rạp" className="h-24 w-40 rounded-lg border border-white/10 object-cover" /><button type="button" onClick={() => { update('imageUrl', ''); setForm(current => ({ ...current, imageId: null })); }} className="text-sm text-red-300 underline">Xóa ảnh</button></div>}
        <label className="block text-sm text-gray-300">Mô tả ngắn về rạp<textarea rows={3} maxLength={500} value={form.description} onChange={event => update('description', event.target.value)} placeholder="Hãy nhập Mô tả ngắn về rạp..." className={inputStyle} /><span className="mt-1 block text-xs text-gray-500">{form.description.length}/500 ký tự</span></label>
      </div>
      <div className="grid gap-5 md:grid-cols-2"><label className="block text-sm text-gray-300">Quy định tại rạp<textarea rows={5} value={form.houseRules} onChange={event => update('houseRules', event.target.value)} placeholder="Hãy nhập Quy định tại rạp..." className={inputStyle} /><span className="mt-1 block text-xs text-gray-500">Mỗi dòng là một quy định; tối đa 30 dòng.</span></label><label className="block text-sm text-gray-300">Dịch vụ tại rạp<textarea rows={5} value={form.services} onChange={event => update('services', event.target.value)} placeholder="Hãy nhập Dịch vụ tại rạp..." className={inputStyle} /><span className="mt-1 block text-xs text-gray-500">Mỗi dòng là một dịch vụ; tối đa 30 dòng.</span></label></div>
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><h3 className="flex items-center gap-2 font-semibold"><CalendarDays className="h-5 w-5 text-primary" />Lịch chiếu theo khoảng ngày</h3><p className="mt-2 text-sm text-gray-400">Lịch được lấy từ các suất chiếu đã tạo. Để thêm hoặc đổi suất chiếu, dùng trang <Link to="/admin/showtimes" className="text-blue-300 underline">Quản lý lịch chiếu</Link>.</p>
        {editing ? <><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm text-gray-300">Từ ngày<input type="date" value={scheduleFrom} onChange={event => setScheduleFrom(event.target.value)} className={inputStyle} /></label><label className="text-sm text-gray-300">Đến ngày<input type="date" value={scheduleTo} onChange={event => setScheduleTo(event.target.value)} className={inputStyle} /></label></div>
          {scheduleError && <p role="alert" className="mt-3 text-sm text-red-400">{scheduleError}</p>}
          {scheduleLoading ? <p className="mt-4 text-sm text-gray-400">Đang tải lịch chiếu...</p> : !scheduleError && <div className="mt-4 max-h-48 space-y-2 overflow-y-auto">{showtimes.length ? showtimes.map(showtime => <div key={showtime.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm"><span>{showtime.movieTitle || 'Phim'} · {showtime.roomName || 'Phòng chiếu'}</span><span className="text-gray-400">{String(showtime.startTime || '').replace('T', ' ').slice(0, 16)} · {showtime.status}</span></div>) : <p className="text-sm text-gray-400">Chưa có suất chiếu trong khoảng ngày đã chọn.</p>}</div>}</> : <p className="mt-4 text-sm text-gray-400">Lưu rạp trước, sau đó tạo phòng chiếu và suất chiếu để xem lịch tại đây.</p>}
      </section>
    </fieldset></div><div className="flex shrink-0 justify-end gap-4 border-t border-white/10 bg-[#121212] px-6 py-4 sm:px-8"><button type="button" disabled={busy} onClick={() => setForm(null)} className="rounded-xl px-6 py-3 text-gray-300 hover:bg-white/10 hover:text-white">Hủy bỏ</button><button type="submit" disabled={busy} className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 font-bold shadow-lg shadow-primary/20 hover:bg-red-700 disabled:opacity-50">{busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Check className="h-5 w-5" />}{busy ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Thêm rạp'}</button></div>
    </form>
  </section></div>}

  {deleting && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><section role="alertdialog" aria-modal="true" aria-labelledby="delete-cinema-title" className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[#121212] p-8 text-center shadow-2xl"><div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-red-500"><AlertTriangle className="h-8 w-8" /></div><h2 id="delete-cinema-title" className="mb-2 font-display text-2xl font-bold">Xóa Cụm Rạp?</h2><p className="text-sm leading-relaxed text-gray-400"><strong className="text-white">{deleting.name}</strong> sẽ được ẩn khỏi danh sách. Dữ liệu rạp, ảnh và các phòng chiếu vẫn được lưu giữ trong hệ thống.</p>{deleteError && <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-left text-xs text-red-400">{deleteError}</p>}<div className="mt-7 flex justify-center gap-3"><button type="button" disabled={busy} onClick={() => setDeleting(null)} className="rounded-xl bg-white/10 px-5 py-3 font-medium hover:bg-white/15">Hủy bỏ</button><button type="button" disabled={busy} onClick={remove} className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-bold hover:bg-red-700 disabled:opacity-50"><Trash2 className="h-4 w-4" />{busy ? 'Đang xóa...' : 'Xóa khỏi danh sách'}</button></div></section></div>}
  </div>;
}
