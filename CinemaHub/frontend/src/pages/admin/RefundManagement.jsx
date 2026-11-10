import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import PaymentBookingActions, { refundLabels } from '../../components/PaymentBookingActions';

const BASE = 'http://127.0.0.1:5000/api/payment';
export default function RefundManagement() {
  const { user } = useAuth();
  const manager = user?.role === 'Manager';
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('PENDING_APPROVAL');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const [notes, setNotes] = useState({});
  const [lookup, setLookup] = useState('');
  const [lookupId, setLookupId] = useState('');
  const load = useCallback(async () => {
    if (!manager || !user?.token) return;
    try {
      const response = await fetch(`${BASE}/refunds${filter ? `?status=${filter}` : ''}`, { headers: { Authorization: `Bearer ${user.token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể tải danh sách');
      setRows(data);
    } catch (error) { setMessage(error.message); }
  }, [filter, manager, user?.token]);
  useEffect(() => { load(); }, [load]);

  const act = async (booking, action) => {
    if (action === 'approve' && !window.confirm('Gửi yêu cầu hoàn toàn bộ số tiền này đến VNPay? Hãy kiểm tra đúng môi trường sandbox/production trước khi xác nhận.')) return;
    setBusy(booking.id); setMessage('');
    try {
      const response = await fetch(`${BASE}/bookings/${booking.id}/refund/${action}`, {
        method: 'POST', headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' },
        ...(action === 'reject' ? { body: JSON.stringify({ reason: notes[booking.id] || '' }) } : {}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể xử lý hoàn tiền');
      setMessage(`Kết quả: ${refundLabels[data.status] || data.status}.`);
      await load();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(''); }
  };

  return <div className="space-y-6">
    <h1 className="text-3xl font-bold">Hoàn tiền vé</h1>
    <div className="rounded-xl border border-white/10 p-5 space-y-3">
      <h2 className="font-semibold">Tạo yêu cầu thay khách tại quầy</h2>
      <form className="flex gap-3" onSubmit={e => { e.preventDefault(); setLookupId(lookup.trim()); }}>
        <input value={lookup} onChange={e => setLookup(e.target.value)} required placeholder="Booking ID của khách"
          className="flex-1 rounded-lg border border-white/20 bg-black/30 p-3" />
        <button className="btn-primary">Kiểm tra</button>
      </form>
      {lookupId && <PaymentBookingActions key={lookupId} booking={{ id: lookupId }} staffRequest />}
    </div>
    {message && <p role="status" className="rounded-lg bg-amber-500/10 text-amber-200 p-4">{message}</p>}
    {manager && <>
      <div className="flex flex-wrap gap-3 items-center">
        <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-[#222] border border-white/20 rounded-lg p-3">
          <option value="">Tất cả trạng thái</option>{Object.entries(refundLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button onClick={load} className="rounded-lg border border-white/20 p-3">Làm mới</button>
      </div>
      <p className="text-sm text-gray-400">Chỉ Manager được duyệt. Kết quả chưa rõ cần đối soát; không bấm gửi lại lệnh hoàn tiền.</p>
      {rows.length === 0 && <p className="text-gray-400">Không có yêu cầu trong nhóm này.</p>}
      {rows.map(booking => <article key={booking.id} className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <div className="flex justify-between gap-3"><h2 className="font-bold">{booking.bookingReference} — {booking.movieTitle}</h2>
          <strong className="text-amber-200">{refundLabels[booking.refund.status]}</strong></div>
        <p>{booking.customerName} • {booking.customerEmail} • {Number(booking.refund.amount).toLocaleString('vi-VN')} đ</p>
        <p>Yêu cầu: {booking.refund.reason}</p>
        <p className="text-xs text-gray-400">Giao dịch gốc: {booking.payment?.transactionId} • Mã yêu cầu hoàn: {booking.refund.id} • Mã VNPay: {booking.refund.providerCode || 'Chưa gửi'}</p>
        {['PENDING_APPROVAL', 'FAILED'].includes(booking.refund.status) && <div className="flex flex-wrap gap-3">
          {booking.refund.status === 'PENDING_APPROVAL' && <button disabled={!!busy} onClick={() => act(booking, 'approve')}
            className="btn-primary disabled:opacity-50">Duyệt & gửi VNPay</button>}
          <input placeholder="Lý do từ chối (ít nhất 5 ký tự)" value={notes[booking.id] || ''}
            onChange={e => setNotes({ ...notes, [booking.id]: e.target.value })} maxLength={1000}
            className="rounded-lg border border-white/20 bg-black/30 p-3 flex-1" />
          <button disabled={!!busy || (notes[booking.id] || '').trim().length < 5} onClick={() => act(booking, 'reject')}
            className="rounded-lg bg-red-500/20 text-red-300 px-4 disabled:opacity-50">Từ chối</button>
        </div>}
        {['PROCESSING', 'REVIEW_REQUIRED'].includes(booking.refund.status) && <button disabled={!!busy} onClick={() => act(booking, 'reconcile')}
          className="rounded-lg border border-white/20 px-4 py-2">Đối soát VNPay (không gửi thêm lệnh hoàn)</button>}
        <details className="text-xs text-gray-400"><summary>Lịch sử xử lý</summary>
          {booking.refund.audit?.map((event, index) => <p key={index}>{event.at} • {event.actor} • {refundLabels[event.status] || event.status} • {event.code}</p>)}
        </details>
      </article>)}
    </>}
  </div>;
}
