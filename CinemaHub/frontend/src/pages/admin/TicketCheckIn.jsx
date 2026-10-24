import { useCallback, useEffect, useRef, useState } from 'react';
import { Ticket, Camera, ScanLine, Search, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import CameraQrScanner from '../../components/CameraQrScanner';
import { useAuth } from '../../context/AuthContext';
import { formatScanTime, getTicketScanDetails } from '../../utils/ticketUsage';
import { requestTicketAdmission } from '../../utils/ticketAdmission';

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
  const [scanDate, setScanDate] = useState(() => {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  });
  const [showtimes, setShowtimes] = useState([]);
  const [selectedShowtimeId, setSelectedShowtimeId] = useState('');
  const [showtimesLoading, setShowtimesLoading] = useState(true);
  const [showtimesError, setShowtimesError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const inputRef = useRef(null);
  const selectedShowtimeRef = useRef('');
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

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const timeout = setTimeout(() => controller.abort(), 15000);
    const load = async () => {
      try {
        if (!token) throw new Error('Vui lòng đăng nhập lại để tải lịch chiếu.');
        if (!scanDate) throw new Error('Vui lòng chọn ngày soát vé.');
        const params = new URLSearchParams({ date: scanDate, includePast: 'true', allStatuses: 'true' });
        const response = await fetch(API_BASE + '/showtimes?' + params, {
          signal: controller.signal, headers: { Authorization: 'Bearer ' + token },
        });
        if (!response.ok) throw new Error('Không tải được lịch chiếu. Vui lòng thử lại.');
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Dữ liệu lịch chiếu không hợp lệ.');
        if (!disposed) {
          setShowtimes(data);
          if (!data.some(showtime => showtime.id === selectedShowtimeRef.current)) {
            selectedShowtimeRef.current = '';
            setSelectedShowtimeId('');
          }
          setShowtimesError('');
        }
      } catch (error) {
        if (!disposed) {
          setShowtimes([]);
          selectedShowtimeRef.current = '';
          setSelectedShowtimeId('');
          setShowtimesError(error.name === 'AbortError' ? 'Tải lịch chiếu quá lâu. Vui lòng thử lại.'
            : error instanceof TypeError || error instanceof SyntaxError ? 'Không tải được lịch chiếu. Vui lòng kiểm tra kết nối và thử lại.' : error.message);
        }
      } finally {
        clearTimeout(timeout);
        if (!disposed) setShowtimesLoading(false);
      }
    };
    load();
    return () => { disposed = true; controller.abort(); clearTimeout(timeout); };
  }, [token, scanDate, reloadKey]);

  const checkIn = useCallback(async (rawCode, operation = 'verify', expectedShowtimeId = selectedShowtimeId) => {
    if (inFlight.current) return;
    if (showtimesLoading || !expectedShowtimeId) {
      setResult({ type: 'error', message: 'Vui lòng chọn suất chiếu đang soát trước khi quét vé.' });
      return;
    }
    if (expectedShowtimeId !== selectedShowtimeRef.current) {
      if (operation === 'check-in') setResult({ type: 'error', message: 'Suất đang soát đã thay đổi. Vui lòng kiểm tra lại vé.' });
      return;
    }
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
    const previousResult = result;
    setLoading(true);
    setResult(null);
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const { response, data, uncertain, reconciled } = await requestTicketAdmission({
        base: API_BASE, token, code, expectedShowtimeId, operation, signal: controller.signal,
      });
      if (!mounted.current || selectedShowtimeRef.current !== expectedShowtimeId) return;
      if (data.showtime?.id === expectedShowtimeId) {
        setShowtimes(current => current.map(showtime => showtime.id === expectedShowtimeId ? data.showtime : showtime));
      }
      if (uncertain) {
        setResult({ type: 'uncertain', code, expectedShowtimeId,
          message: 'Chưa xác định được kết quả xác nhận. Vé có thể đã được check-in. Hãy kiểm tra lại trạng thái trước khi quyết định cho khách vào.',
          ticket: data.ticket?.showtimeId === expectedShowtimeId ? data.ticket : previousResult?.ticket,
          showtime: data.showtime || previousResult?.showtime });
      } else if (reconciled) {
        setResult({ type: 'warning', ticket: data.ticket, showtime: data.showtime,
          message: 'Đã kiểm tra lại: vé đã được ghi nhận sử dụng. Xem thời gian và cổng soát bên dưới; không xác nhận thêm.' });
      } else if (response.status === 401 || response.status === 403) {
        setResult({ type: 'error', message: 'Bạn không có quyền soát vé hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
      } else if (response.ok && data.ticket) {
        const partial = operation === 'verify' && data.usageStatus === 'PARTIALLY_USED';
        setResult({ type: partial ? 'partial' : 'success', verified: operation === 'verify' && data.canCheckIn !== false, code, expectedShowtimeId, showtime: data.showtime,
          message: data.message || (partial ? 'Chỉ check-in các ghế chưa sử dụng.'
            : operation === 'verify' ? 'Vé hợp lệ. Chưa thực hiện check-in.' : 'Check-in thành công!'), ticket: data.ticket });
      } else {
        setResult({
          type: data.code === 'ALREADY_CHECKED_IN' ? 'warning' : 'error',
          message: data.error || 'Không kiểm tra được vé. Vui lòng thử lại.',
          ticket: data.ticket, showtime: data.showtime,
        });
      }
    } catch (error) {
      if (mounted.current && selectedShowtimeRef.current === expectedShowtimeId) setResult({ type: 'error',
        message: error.name === 'AbortError' ? 'Máy chủ phản hồi quá lâu. Hãy kiểm tra lại vé trước khi tiếp tục.'
          : 'Không kết nối được máy chủ. Vui lòng kiểm tra kết nối và thử lại.' });
    } finally {
      inFlight.current = false;
      requestRef.current = null;
      if (mounted.current) { setLoading(false); setTicketCode(''); }
    }
  }, [token, selectedShowtimeId, showtimesLoading, result]);

  const submit = (event) => { event.preventDefault(); checkIn(ticketCode); };
  const { seats, latestScan } = getTicketScanDetails(result?.ticket);
  const selectedShowtime = showtimes.find(showtime => showtime.id === selectedShowtimeId);
  const showtimeLabel = showtime => [showtime.movieTitle || 'Phim chưa có tên', showtime.cinemaName || showtime.cinemaId,
    showtime.roomName || showtime.roomId, formatScanTime(showtime.startTime),
    showtime.status === 'Active' ? '' : showtime.status || 'Không rõ trạng thái'].filter(Boolean).join(' · ');
  const resetResult = () => { setResult(null); setTicketCode(''); };
  const refreshShowtimes = () => { resetResult(); setShowtimesLoading(true); setReloadKey(value => value + 1); };
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
      <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3">
        <p className="font-bold">Suất chiếu đang soát</p>
        <p className="text-sm text-gray-400">Chọn đúng ngày, suất chiếu, phòng và rạp. Vé thuộc suất khác sẽ bị từ chối.</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label htmlFor="checkin-date" className="block text-sm text-gray-300 mb-2">Ngày soát vé</label>
            <input id="checkin-date" type="date" value={scanDate} disabled={loading}
              onChange={event => { resetResult(); selectedShowtimeRef.current = ''; setSelectedShowtimeId(''); setShowtimes([]); setShowtimesLoading(true); setScanDate(event.target.value); }}
              className="bg-black border border-white/20 rounded-xl px-3 py-3 text-white" />
          </div>
          <div className="flex-1 min-w-0 basis-64">
            <label htmlFor="checkin-showtime" className="block text-sm text-gray-300 mb-2">Suất / phòng / rạp</label>
            <select id="checkin-showtime" value={selectedShowtimeId} disabled={loading || showtimesLoading}
              onChange={event => { resetResult(); selectedShowtimeRef.current = event.target.value; setSelectedShowtimeId(event.target.value); }}
              className="w-full bg-black border border-white/20 rounded-xl px-3 py-3 text-white">
              <option value="">{showtimesLoading ? 'Đang tải lịch chiếu...' : 'Chọn suất chiếu đang soát'}</option>
              {showtimes.map(showtime => <option key={showtime.id} value={showtime.id}>{showtimeLabel(showtime)}</option>)}
            </select>
          </div>
          <button type="button" onClick={refreshShowtimes} disabled={loading || showtimesLoading}
            className="px-4 py-3 bg-white/10 rounded-xl disabled:opacity-50">Tải lại lịch</button>
        </div>
        {showtimesError && <p role="alert" className="text-sm text-red-400">{showtimesError}</p>}
        {!showtimesLoading && !showtimesError && showtimes.length === 0 && <p className="text-sm text-gray-400">Không có suất chiếu trong ngày đã chọn.</p>}
        {selectedShowtime && <p className="text-sm text-primary" data-testid="selected-showtime">Đang soát: {showtimeLabel(selectedShowtime)}</p>}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-7 rounded-3xl border border-white/10 flex items-center justify-center relative min-h-[440px]">
          {scanMode === 'camera' && (!selectedShowtimeId || showtimesLoading) ? (
            <p className="text-gray-400 text-center">Chọn suất chiếu đang soát để bật camera.</p>
          ) : scanMode === 'camera' ? (
            <CameraQrScanner key={selectedShowtimeId} onScan={checkIn} paused={loading || Boolean(result)} onRestart={() => setResult(null)} />
          ) : (
            <form onSubmit={submit} className="w-full space-y-5">
              <h2 className="text-xl font-bold">{scanMode === 'scanner' ? 'Quét QR bằng máy quét ngoài' : 'Nhập mã vé hoặc mã đặt chỗ'}</h2>
              <p className="text-sm text-gray-400">{scanMode === 'scanner'
                ? 'Đặt con trỏ trong ô bên dưới, quét mã và để máy quét gửi phím Enter.'
                : 'Nhập ID vé, mã đặt chỗ CH-... hoặc dán đầy đủ nội dung QR.'}</p>
              <label htmlFor="ticket-code" className="block text-sm text-gray-300">Mã vé / nội dung QR</label>
              <input ref={inputRef} id="ticket-code" type="text" value={ticketCode} maxLength={512} disabled={loading || showtimesLoading || !selectedShowtimeId}
                onChange={event => setTicketCode(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false}
                placeholder="CH-261020-ABCD hoặc CINEMAHUB|..."
                className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-4 text-white focus:border-primary focus:outline-none" />
              <button type="submit" disabled={loading || showtimesLoading || !selectedShowtimeId || !ticketCode.trim()} className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
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
                ['warning', 'partial', 'uncertain'].includes(result.type) ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-red-500/10 border-red-500/30 text-red-400')}>
                {result.type === 'success' ? <CheckCircle className="w-6 h-6 shrink-0" /> : ['warning', 'partial', 'uncertain'].includes(result.type) ? <AlertTriangle className="w-6 h-6 shrink-0" /> : <XCircle className="w-6 h-6 shrink-0" />}
                <div><h3 className="font-bold text-lg">{result.type === 'success' ? (result.verified ? 'Vé hợp lệ — chưa check-in' : 'Check-in thành công') : result.type === 'partial' ? 'Vé đã dùng một phần' : result.type === 'warning' ? 'Vé đã được sử dụng' : result.type === 'uncertain' ? 'Chưa xác định kết quả check-in' : 'Không thể check-in'}</h3><p className="text-sm mt-1">{result.message}</p></div>
              </div>
              {result.type === 'uncertain' && <button type="button" disabled={loading}
                onClick={() => checkIn(result.code, 'resolve', result.expectedShowtimeId)}
                className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl">
                Kiểm tra lại trạng thái
              </button>}
              {result.verified && <button type="button" disabled={loading}
                onClick={() => checkIn(result.code, 'check-in', result.expectedShowtimeId)}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-4 rounded-xl">
                {result.type === 'partial' ? 'Xác nhận check-in ghế còn lại' : 'Xác nhận check-in'}
              </button>}
              {result.ticket && <div className="p-5 bg-white/5 rounded-xl space-y-3">
                <p className="text-gray-400 text-sm">Mã đặt chỗ <strong className="block text-white text-lg">{result.ticket.bookingReference}</strong></p>
                <p>Phim: <strong>{result.ticket.movieTitle || 'Chưa có thông tin'}</strong></p>
                {result.showtime ? <div className="space-y-2" data-testid="current-showtime">
                  <p>Suất chiếu hiện tại: <strong>{formatScanTime(result.showtime.startTime)} – {formatScanTime(result.showtime.endTime)}</strong></p>
                  <p>Rạp / phòng: <strong>{result.showtime.cinemaName || result.showtime.cinemaId} / {result.showtime.roomName || result.showtime.roomId}</strong></p>
                  {result.ticket.showtimeStart && result.ticket.showtimeStart !== result.showtime.startTime && <p className="text-sm text-amber-400">
                    Lịch chiếu đã thay đổi. Giờ lưu trên vé lúc phát hành: {formatScanTime(result.ticket.showtimeStart)}.
                  </p>}
                </div> : <p className="text-sm text-amber-400">Không có lịch chiếu hiện tại. Giờ lưu trên vé lúc phát hành: {formatScanTime(result.ticket.showtimeStart)}.</p>}
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
