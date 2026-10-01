import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowRight, Printer, RefreshCw, Calendar, Clock, MapPin, Film, Home } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const API_BASE = 'http://localhost:5000/api';

const PaymentCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!location.search) {
        setError('Không tìm thấy thông tin phản hồi từ cổng thanh toán VNPAY');
        setLoading(false);
        return;
      }

      try {
        const token = JSON.parse(localStorage.getItem('user') || '{}').token;
        if (!token) { setError('Vui lòng đăng nhập lại để xem kết quả thanh toán.'); return; }
        const res = await fetch(`${API_BASE}/payment/vnpay-callback${location.search}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (res.ok && data.status === 'SUCCESS') {
          setResult(data);
          if (!data.ticket) setError('Đã ghi nhận thanh toán. Vé đang được xử lý; vui lòng tải lại sau ít phút.');
        } else {
          setError(data.status === 'REVIEW_REQUIRED' ? 'Thanh toán nhận sau khi đơn đã hết hạn. Cần liên hệ hỗ trợ để đối soát; chưa phát hành vé.' : data.message || 'Giao dịch chưa thành công hoặc đã hết hạn.');
          setResult(data);
        }
      } catch (err) {
        console.error('VNPAY callback error:', err);
        setError('Lỗi kết nối khi xác thực giao dịch với máy chủ.');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [location.search]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
          className="text-primary mb-4"
        >
          <RefreshCw className="w-12 h-12" />
        </motion.div>
        <h2 className="text-xl font-bold text-white mb-2">Đang xác thực kết quả thanh toán VNPAY...</h2>
        <p className="text-sm text-gray-400">Vui lòng không tắt hoặc tải lại trang web.</p>
      </div>
    );
  }

  const isSuccess = result?.status === 'SUCCESS';
  const booking = result?.booking;
  const ticket = result?.ticket;

  return (
    <div className="min-h-[85vh] py-10 px-4 max-w-3xl mx-auto flex flex-col items-center justify-center">
      {isSuccess && booking && ticket ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-6"
        >
          {/* Success Banner */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-2">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-white">Thanh Toán VNPAY Thành Công!</h1>
            <p className="text-sm text-gray-400">
              Giao dịch qua cổng VNPAY đã được ghi nhận. Vé xem phim điện tử của bạn đã sẵn sàng.
            </p>
          </div>

          {/* CGV E-Ticket Card */}
          <div className="bg-[#141414] rounded-3xl border border-white/15 overflow-hidden shadow-2xl relative">
            {/* Ticket Header */}
            <div className="bg-primary p-6 text-center text-white relative">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] bg-black/20 px-3 py-1 rounded-full">
                VÉ ĐIỆN TỬ • CGV CINEMAHUB E-TICKET
              </span>
              <h3 className="text-2xl font-black mt-2">{booking.movieTitle}</h3>
              <p className="text-xs opacity-90">{booking.cinemaName} • {booking.roomName}</p>
            </div>

            {/* Ticket Body */}
            <div className="p-8 space-y-6">
              {/* QR Code Section */}
              <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-inner text-black">
                <QRCodeSVG
                  value={ticket?.qrCode || `CINEMAHUB|${booking.bookingReference}`}
                  size={190}
                  level="H"
                  includeMargin={true}
                />
                <p className="text-xs font-mono font-bold tracking-widest mt-3 uppercase text-gray-800">
                  MÃ ĐẶT VÉ: {booking.bookingReference}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Xuất trình mã này tại quầy hoặc cửa soát vé để vào rạp
                </p>
                {result?.transactionNo && (
                  <p className="text-[10px] text-gray-400 mt-1 font-mono">
                    Mã GD VNPAY: {result.transactionNo} • Ngân hàng: {result.bankCode || 'VNPAY'}
                  </p>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center border-t border-b border-white/10 py-4 text-xs">
                <div>
                  <span className="text-gray-400 block mb-0.5">Ngày Chiếu</span>
                  <span className="font-extrabold text-white text-sm">
                    {booking.showtimeStart ? new Date(booking.showtimeStart).toLocaleDateString('vi-VN') : 'Hôm nay'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Giờ Chiếu</span>
                  <span className="font-extrabold text-white text-sm">
                    {booking.showtimeStart ? new Date(booking.showtimeStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Phòng Chiếu</span>
                  <span className="font-extrabold text-white text-sm">{booking.roomName} ({booking.showtimeFormat || '2D'})</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Ghế Ngồi</span>
                  <span className="font-extrabold text-primary text-base">
                    {booking.seats?.map(s => s.seatNumber || s.seatId).join(', ')}
                  </span>
                </div>
              </div>

              {/* Meta details */}
              <div className="flex flex-wrap justify-between items-center text-xs text-gray-400 gap-2">
                <span>Khách hàng: <strong className="text-white">{booking.customerName}</strong></span>
                <span>Phương thức: <strong className="text-emerald-400 font-bold">Cổng VNPAY (Đã thanh toán)</strong></span>
                <span>Tổng tiền: <strong className="text-white text-sm font-bold">{booking.totalAmount?.toLocaleString()} đ</strong></span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="bg-[#1a1a1a] p-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10">
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-gray-200 font-bold text-xs rounded-xl flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> In vé điện tử
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/profile?tab=booking', { state: { tab: 'booking' } })}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-gray-200 font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  Xem lịch sử đặt vé <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/booking')}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-extrabold text-xs rounded-xl shadow-md"
                >
                  Đặt vé tiếp
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 text-center space-y-6"
        >
          <div className="inline-flex p-4 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
            <XCircle className="w-12 h-12" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Thanh Toán Chưa Hoàn Tất</h2>
            <p className="text-sm text-gray-400">
              {error || 'Giao dịch qua cổng VNPAY đã bị hủy hoặc không thành công.'}
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={() => navigate('/booking')}
              className="w-full btn-primary py-3 rounded-xl font-bold text-sm"
            >
              Thử Đặt Vé Lại
            </button>
            <Link
              to="/"
              className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl font-medium text-sm flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" /> Về Trang Chủ
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default PaymentCallback;
