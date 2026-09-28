import { useState, useEffect, useRef } from 'react';
import { Ticket, Search, CheckCircle, XCircle, AlertTriangle, QrCode, ScanLine, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TicketCheckIn = () => {
  const [ticketId, setTicketId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [scanMode, setScanMode] = useState('qr'); // 'qr' or 'manual'
  const inputRef = useRef(null);

  // Auto-focus input for hardware scanner integration
  useEffect(() => {
    if (scanMode === 'qr' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [scanMode, result]);

  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (!ticketId.trim()) return;

    setLoading(true);
    setResult(null);
    try {
      const userStr = localStorage.getItem('user');
      const token = userStr ? JSON.parse(userStr).token : '';

      const response = await fetch(`http://localhost:5000/api/tickets/check-in/${ticketId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      // Simulate verification delay for visual feedback (UC-85, 86, 87, 88)
      setTimeout(() => {
        if (response.ok) {
          setResult({ type: 'success', message: data.message, ticket: data.ticket });
        } else {
          const errorMsg = data.error || 'Có lỗi xảy ra!';
          if (errorMsg.includes('đã được Check-in')) {
            setResult({ type: 'warning', message: errorMsg, ticket: data.ticket });
          } else {
            setResult({ type: 'error', message: errorMsg });
          }
        }
        setLoading(false);
        setTicketId(''); // Clear for next scan
      }, 800);

    } catch (err) {
      setResult({ type: 'error', message: 'Lỗi kết nối đến máy chủ!' });
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-display font-bold text-white">Kiểm soát vé (Check-in)</h1>
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setScanMode('qr')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${scanMode === 'qr' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            <QrCode className="w-4 h-4" /> Quét mã QR
          </button>
          <button
            onClick={() => setScanMode('manual')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${scanMode === 'manual' ? 'bg-white/20 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            <Search className="w-4 h-4" /> Nhập thủ công
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Scanner Panel */}
        <div className="glass-panel p-8 rounded-3xl border border-white/10 flex flex-col items-center justify-center relative overflow-hidden h-[450px]">
          {scanMode === 'qr' ? (
            <>
              <h2 className="text-xl font-bold mb-6 text-gray-300">Đưa mã QR vào khu vực quét</h2>

              <div className="relative w-64 h-64 border-2 border-dashed border-gray-500 rounded-2xl flex items-center justify-center overflow-hidden group">
                <div className="absolute inset-0 bg-primary/5"></div>
                <ScanLine className="w-20 h-20 text-primary opacity-50" />

                {/* Laser Animation */}
                <motion.div
                  animate={{ y: [-128, 128, -128] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                  className="absolute left-0 right-0 h-1 bg-primary shadow-[0_0_15px_rgba(229,9,20,1)]"
                ></motion.div>

                {/* Corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl"></div>
              </div>

              <p className="mt-6 text-sm text-gray-400 animate-pulse">Hệ thống đang chờ dữ liệu từ máy quét...</p>

              {/* Hidden input to capture barcode scanner hardware strokes */}
              <form onSubmit={handleCheckIn}>
                <input
                  ref={inputRef}
                  type="text"
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  className="absolute opacity-0 -z-10"
                  autoFocus
                  autoComplete="off"
                />
              </form>
            </>
          ) : (
            <div className="w-full">
              <h2 className="text-xl font-bold mb-6">Nhập Mã Vé</h2>
              <form onSubmit={handleCheckIn} className="space-y-4">
                <input
                  type="text"
                  placeholder="VD: 60a1b2c3d4..."
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-4 text-white text-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
                <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all">
                  <Search className="w-5 h-5" /> Kiểm tra vé
                </button>
              </form>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-bold text-lg animate-pulse text-primary">Đang xác thực dữ liệu...</p>
            </div>
          )}
        </div>

        {/* Validation Results Panel */}
        <div className="glass-panel p-8 rounded-3xl border border-white/10 h-[450px] flex flex-col">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Ticket className="w-6 h-6 text-primary" /> Kết quả Xác thực
          </h2>

          {!result ? (
            <div className="flex-grow flex flex-col items-center justify-center text-gray-500 space-y-4">
              <QrCode className="w-16 h-16 opacity-20" />
              <p>Chưa có dữ liệu. Vui lòng quét vé.</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={result.type}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-grow space-y-6"
              >
                {/* Result Banner */}
                <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-lg
                  ${result.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : ''}
                  ${result.type === 'warning' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : ''}
                  ${result.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : ''}
                `}>
                  {result.type === 'success' && <CheckCircle className="w-6 h-6 shrink-0" />}
                  {result.type === 'warning' && <AlertTriangle className="w-6 h-6 shrink-0" />}
                  {result.type === 'error' && <XCircle className="w-6 h-6 shrink-0" />}

                  <div>
                    <h3 className="font-bold text-lg">{
                      result.type === 'success' ? 'Hợp lệ - Check-in Thành công' :
                        result.type === 'warning' ? 'Cảnh báo - Vé đã sử dụng' : 'Vé Không Hợp Lệ'
                    }</h3>
                    <p className="text-sm mt-1 opacity-90">{result.message}</p>
                  </div>
                </div>

                {/* UC Checklists */}
                <div className="bg-black/30 rounded-xl p-5 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Xác thực hệ thống</span>
                    {result.type !== 'error' ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Kiểm tra Suất chiếu</span>
                    {result.type !== 'error' ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Trạng thái Sử dụng</span>
                    {result.type === 'success' ? <CheckCircle className="w-4 h-4 text-green-400" /> :
                      result.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-orange-400" /> : <XCircle className="w-4 h-4 text-gray-600" />}
                  </div>
                </div>

                {result.ticket && (
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="text-center mb-2">
                      <p className="text-xs text-gray-400 uppercase tracking-widest">Phim</p>
                      <p className="font-bold text-lg text-white">{result.ticket.movieName}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center border-t border-white/10 pt-4 mt-2">
                      <div>
                        <p className="text-xs text-gray-400">Phòng chiếu</p>
                        <p className="font-bold text-white">{result.ticket.screenRoomName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Ghế ngồi</p>
                        <p className="font-bold text-primary text-lg">
                          {result.ticket.seats ? result.ticket.seats.map(s => s.seatNumber).join(', ') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketCheckIn;
