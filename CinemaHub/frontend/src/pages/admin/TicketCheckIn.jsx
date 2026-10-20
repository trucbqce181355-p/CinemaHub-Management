import { useCallback, useEffect, useRef, useState } from 'react';
import { Ticket, Camera, ScanLine, Search, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import CameraQrScanner from '../../components/CameraQrScanner';
import { useAuth } from '../../context/AuthContext';
import { formatScanTime, getTicketScanDetails } from '../../utils/ticketUsage';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const modes = [
  { id: 'camera', label: 'Camera', Icon: Camera },
  { id: 'scanner', label: 'Máy quét QR', Icon: ScanLine },
  { id: 'manual', label: 'Nhập thủ công', Icon: Search },
];

export default function TicketCheckIn() {
  const { user } = useAuth();
  const token = user?.token;
  const [ticketCode, setTicketCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [scanMode, setScanMode] = useState('camera');
  const inputRef = useRef(null);
  const inFlight = useRef(false);
  const requestRef = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; requestRef.current?.abort(); };
  }, []);
  useEffect(() => {
    if (scanMode !== 'camera' && !loading) inputRef.current?.focus();
  }, [scanMode, loading, result]);

  const checkIn = useCallback(async (rawCode, operation = 'verify') => {
    if (inFlight.current) return;
    const code = rawCode.trim();
    if (!code || code.length > 512) {
      setResult({ type: 'error', message: 'Vui lòng nhập hoặc quét mã vé hợp lệ.' });
      return;
    }
    if (!token) {
      setResult({ type: 'error', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
      return;
    }
    inFlight.current = true;
    setLoading(true);
    setResult(null);
    const controller = new AbortController();
    requestRef.current = controller;
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
    try {
      const response = await fetch(API_BASE + '/tickets/' + operation, {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ code }),
      });
      const data = await response.json().catch(() => ({}));
      if (!mounted.current) return;
      if (response.status === 401 || response.status === 403) {
        setResult({ type: 'error', message: 'Bạn không có quyền soát vé hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
      } else if (response.ok && data.ticket) {
        const partial = operation === 'verify' && data.usageStatus === 'PARTIALLY_USED';
        setResult({ type: partial ? 'partial' : 'success', verified: operation === 'verify' && data.canCheckIn !== false, code,
          message: data.message || (partial ? 'Chỉ check-in các ghế chưa sử dụng.'
            : operation === 'verify' ? 'Vé hợp lệ. Chưa thực hiện check-in.' : 'Check-in thành công!'), ticket: data.ticket });
      } else {
        setResult({
          type: data.code === 'ALREADY_CHECKED_IN' ? 'warning' : 'error',
          message: data.error || 'Không kiểm tra được vé. Vui lòng thử lại.',
          ticket: data.ticket,
        });
      }
    } catch {
      if (mounted.current) setResult({ type: 'error', message: timedOut
        ? 'Máy chủ phản hồi quá lâu. Hãy kiểm tra lại vé trước khi tiếp tục.'
        : 'Không kết nối được máy chủ. Vui lòng kiểm tra kết nối và thử lại.' });
    } finally {
      clearTimeout(timeout);
      inFlight.current = false;
      requestRef.current = null;
      if (mounted.current) { setLoading(false); setTicketCode(''); }
    }
  }, [token]);

  const submit = (event) => { event.preventDefault(); checkIn(ticketCode); };
  const { seats, latestScan } = getTicketScanDetails(result?.ticket);
  const usedCount = seats.filter(seat => seat.usageStatus === 'Used').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-3xl font-display font-bold text-white">Kiểm soát vé (Check-in)</h1>
        <div className="flex flex-wrap bg-white/5 p-1 rounded-xl border border-white/10">
          {modes.map(({ id, label, Icon }) => (
            <button key={id} type="button" disabled={loading} onClick={() => { setScanMode(id); setTicketCode(''); setResult(null); }}
              className={'px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50 ' + (scanMode === id ? 'bg-primary text-white' : 'text-gray-400 hover:text-white')}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-7 rounded-3xl border border-white/10 flex items-center justify-center relative min-h-[440px]">
          {scanMode === 'camera' ? (
            <CameraQrScanner onScan={checkIn} paused={loading || Boolean(result)} onRestart={() => setResult(null)} />
          ) : (
            <form onSubmit={submit} className="w-full space-y-5">
              <h2 className="text-xl font-bold">{scanMode === 'scanner' ? 'Quét QR bằng máy quét ngoài' : 'Nhập mã vé hoặc mã đặt chỗ'}</h2>
              <p className="text-sm text-gray-400">{scanMode === 'scanner'
                ? 'Đặt con trỏ trong ô bên dưới, quét mã và để máy quét gửi phím Enter.'
                : 'Nhập ID vé, mã đặt chỗ CH-... hoặc dán đầy đủ nội dung QR.'}</p>
              <label htmlFor="ticket-code" className="block text-sm text-gray-300">Mã vé / nội dung QR</label>
              <input ref={inputRef} id="ticket-code" type="text" value={ticketCode} maxLength={512} disabled={loading}
                onChange={event => setTicketCode(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false}
                placeholder="CH-261020-ABCD hoặc CINEMAHUB|..."
                className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-4 text-white focus:border-primary focus:outline-none" />
              <button type="submit" disabled={loading || !ticketCode.trim()} className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
                <Search className="w-5 h-5" /> Kiểm tra vé
              </button>
            </form>
          )}
          {loading && <div role="status" className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center z-10">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-bold text-lg text-primary">Đang xác thực vé...</p>
          </div>}
        </div>
        <div className="glass-panel p-7 rounded-3xl border border-white/10 min-h-[440px]">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Ticket className="w-6 h-6 text-primary" />Kết quả xác thực</h2>
          <div aria-live="polite" aria-atomic="true">
            {!result ? <p className="text-gray-400 py-16 text-center">Chưa có dữ liệu. Vui lòng quét hoặc nhập mã vé.</p> : <div className="space-y-5">
              <div role={result.type === 'error' ? 'alert' : 'status'} className={'p-4 rounded-xl border flex items-start gap-3 ' + (
                result.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                ['warning', 'partial'].includes(result.type) ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-red-500/10 border-red-500/30 text-red-400')}>
                {result.type === 'success' ? <CheckCircle className="w-6 h-6 shrink-0" /> : ['warning', 'partial'].includes(result.type) ? <AlertTriangle className="w-6 h-6 shrink-0" /> : <XCircle className="w-6 h-6 shrink-0" />}
                <div><h3 className="font-bold text-lg">{result.type === 'success' ? (result.verified ? 'Vé hợp lệ — chưa check-in' : 'Check-in thành công') : result.type === 'partial' ? 'Vé đã dùng một phần' : result.type === 'warning' ? 'Vé đã được sử dụng' : 'Không thể check-in'}</h3><p className="text-sm mt-1">{result.message}</p></div>
              </div>
              {result.verified && <button type="button" disabled={loading}
                onClick={() => checkIn(result.code, 'check-in')}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-4 rounded-xl">
                {result.type === 'partial' ? 'Xác nhận check-in ghế còn lại' : 'Xác nhận check-in'}
              </button>}
              {result.ticket && <div className="p-5 bg-white/5 rounded-xl space-y-3">
                <p className="text-gray-400 text-sm">Mã đặt chỗ <strong className="block text-white text-lg">{result.ticket.bookingReference}</strong></p>
                <p>Phim: <strong>{result.ticket.movieTitle || 'Chưa có thông tin'}</strong></p>
                <p>Suất chiếu: <strong>{result.ticket.showtimeStart ? new Date(result.ticket.showtimeStart).toLocaleString('vi-VN') : 'Chưa có thông tin'}</strong></p>
                <p>Ghế: <strong className="text-primary">{seats.map(seat => seat.seatNumber).join(', ')}</strong></p>
                <p className="text-sm text-gray-300">Đã dùng: {usedCount}/{seats.length} ghế</p>
                {latestScan ? <p className="text-sm text-gray-300" data-testid="latest-scan">
                  Lần soát gần nhất: {formatScanTime(latestScan.scannedAt)} · Cổng: {latestScan.scannedByGate || 'Chưa có thông tin'}
                </p> : usedCount > 0 && <p className="text-sm text-gray-400">Chưa có thông tin lần soát trước.</p>}
                <ul className="space-y-3 border-t border-white/10 pt-3" aria-label="Trạng thái từng ghế">
                  {seats.map((seat, index) => <li key={`${seat.seatId || 'seat'}-${index}`} className="text-sm" data-seat-id={seat.seatId}>
                    <p className="flex flex-wrap justify-between gap-2">
                      <strong>Ghế {seat.seatNumber || seat.seatId || 'Không xác định'}</strong>
                      <span className={seat.usageStatus === 'Used' ? 'text-orange-400' : 'text-gray-300'}>
                        {seat.usageStatus === 'Used' ? 'Đã sử dụng' : seat.usageStatus === 'Unused' ? 'Chưa sử dụng' : 'Không xác định'}
                      </span>
                    </p>
                    {seat.usageStatus === 'Used' && <p className="text-xs text-gray-400 mt-1">
                      Lần soát: {formatScanTime(seat.scanMetadata?.scannedAt)} · Cổng: {seat.scanMetadata?.scannedByGate || 'Chưa có thông tin'}
                    </p>}
                  </li>)}
                </ul>
              </div>}
            </div>}
          </div>
        </div>
      </div>
    </div>
  );
}
