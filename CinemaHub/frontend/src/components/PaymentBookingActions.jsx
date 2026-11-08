import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const refundLabels = {
  PENDING_APPROVAL: 'Chờ duyệt', PROCESSING: 'Đang gửi VNPay', SUCCEEDED: 'Đã hoàn tiền',
  REJECTED: 'Đã từ chối', FAILED: 'VNPay từ chối hoàn tiền', REVIEW_REQUIRED: 'Cần đối soát VNPay',
};
const BASE = 'http://127.0.0.1:5000/api/payment/bookings';

export default function PaymentBookingActions({ booking, onChanged, staffRequest = false }) {
  const { user } = useAuth();
  const id = booking.id || booking._id;
  const [policy, setPolicy] = useState(null);
  const [email, setEmail] = useState(null);
  const [reason, setReason] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const request = useCallback(async (suffix, options = {}) => {
    const response = await fetch(`${BASE}/${encodeURIComponent(id)}${suffix}`, {
      ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || 'Không thể xử lý yêu cầu');
    return data;
  }, [id, user?.token]);

  useEffect(() => {
    let cancelled = false;
    setPolicy(null); setEmail(null); setMessage(''); setOpen(false);
    if (!id || !user?.token) return;
    request('/refund').then(data => { if (!cancelled) setPolicy(data); })
      .catch(error => { if (!cancelled) setMessage(error.message); });
    if (!staffRequest) request('/ticket/email').then(data => { if (!cancelled) setEmail(data); }).catch(() => {});
    return () => { cancelled = true; };
  }, [request, staffRequest, id, user?.token, booking.refund?.status]);

  const act = async action => {
    setBusy(true); setMessage('');
    try { await action(); } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  const refund = policy?.refund || booking.refund;
  const availableTicket = booking.status === 'CONFIRMED' && booking.payment?.status === 'SUCCESS'
    && (!refund || refund.status === 'REJECTED');

  const download = async () => {
    const response = await fetch(`${BASE}/${encodeURIComponent(id)}/ticket/qr`, {
      headers: { Authorization: `Bearer ${user?.token}` },
    });
    if (!response.ok) {
      const data = await response.json(); throw new Error(data.message || 'Không thể tải QR');
    }
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'CinemaHub-ticket-QR.png'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <div className="mt-4 border-t border-white/10 pt-4 space-y-3 text-sm">
    {staffRequest && policy && <p>{policy.bookingReference} • {policy.movieTitle} • {Number(policy.amount).toLocaleString('vi-VN')} đ • {policy.showtimeStart}</p>}
    {refund && <div className="rounded-lg bg-amber-500/10 p-3 text-amber-200">
      Hoàn tiền: <strong>{refundLabels[refund.status] || refund.status}</strong>
      <span className="ml-2">{Number(refund.amount).toLocaleString('vi-VN')} đ</span>
      {refund.decisionReason && <p className="mt-1">{refund.decisionReason}</p>}
      {['PENDING_APPROVAL', 'PROCESSING', 'REVIEW_REQUIRED', 'FAILED'].includes(refund.status)
        && <p className="text-xs mt-1">Vé đang tạm ngừng check-in. Ghế vẫn được giữ đến khi có kết quả xử lý.</p>}
    </div>}
    <div className="flex flex-wrap gap-3">
      {!staffRequest && availableTicket && <>
        <button disabled={busy} onClick={() => act(download)} className="rounded-lg border border-white/20 px-3 py-2 disabled:opacity-50">Tải QR vé (PNG)</button>
        <button disabled={busy} onClick={() => act(async () => {
          const data = await request('/ticket/email', { method: 'POST' }); setEmail(data);
          setMessage(data.status === 'SENT' ? 'Vé đã được gửi email, không gửi trùng.' : data.enabled
            ? 'Đã tiếp nhận yêu cầu gửi vé qua email.' : 'Đã xếp hàng gửi vé. Hệ thống chưa bật dịch vụ email.');
        })} className="rounded-lg border border-white/20 px-3 py-2 disabled:opacity-50">Gửi vé qua email</button>
      </>}
      {policy?.eligible && !refund && <button disabled={busy} onClick={() => setOpen(!open)}
        className="rounded-lg bg-primary/20 text-primary px-3 py-2">Yêu cầu hoàn tiền</button>}
    </div>
    {email && !staffRequest && <p className="text-xs text-gray-400">Email vé: {email.status}{!email.enabled ? ' — dịch vụ gửi email chưa bật' : ''}</p>}
    {policy && !policy.eligible && !refund && <p className="text-xs text-gray-400">{policy.message}</p>}
    {open && policy?.eligible && <form className="space-y-3 rounded-xl bg-white/5 p-4" onSubmit={event => {
      event.preventDefault(); act(async () => {
        await request('/refund', { method: 'POST', body: JSON.stringify({ reason, agreeToPolicy: agreed }) });
        setPolicy(await request('/refund')); setOpen(false); setMessage('Đã gửi yêu cầu đến Manager/Admin. Chưa hoàn tiền.');
        onChanged?.();
      });
    }}>
      <p>Hoàn toàn bộ số tiền đã trả qua VNPay. Vé chưa sử dụng; yêu cầu gửi trước giờ chiếu ít nhất {policy.cutoffMinutes} phút. Manager/Admin duyệt trước khi gửi lệnh hoàn.</p>
      <textarea required minLength={5} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)}
        placeholder="Lý do hoàn tiền (5–1000 ký tự)" className="w-full rounded-lg bg-black/30 border border-white/20 p-3" />
      <label className="flex gap-2 items-start"><input required type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
        Tôi đồng ý chính sách và tạm ngừng sử dụng vé trong thời gian xử lý.</label>
      <button disabled={busy || !agreed} className="btn-primary disabled:opacity-50">{busy ? 'Đang gửi...' : 'Gửi yêu cầu hoàn tiền'}</button>
    </form>}
    {message && <p role="status" className="text-sm text-amber-200">{message}</p>}
  </div>;
}
