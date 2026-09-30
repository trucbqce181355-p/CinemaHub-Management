import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Film, MapPin, Calendar, Clock, Monitor, ChevronRight, ChevronLeft, 
  Check, Ticket, QrCode, Tag, AlertTriangle, UserCheck, 
  RefreshCw, X, Sparkles, CreditCard, Heart, ArrowLeft, Printer
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://127.0.0.1:5000/api';

const Booking = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // CGV Stepper: 1: Chọn Phim/Rạp/Suất, 2: Chọn Ghế, 3: Thanh Toán (Hold 10p), 4: Vé Điện Tử (E-Ticket)
  const [currentStep, setCurrentStep] = useState(1);

  // Selection states (Step 1)
  const [movies, setMovies] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [showtimes, setShowtimes] = useState([]);

  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedCinema, setSelectedCinema] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedShowtime, setSelectedShowtime] = useState(null);

  // Seat state (Step 2)
  const [seatMatrix, setSeatMatrix] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seatLoading, setSeatLoading] = useState(false);

  // Hold & Timer (Step 3)
  const [activeBooking, setActiveBooking] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  // Pricing & Promo
  const [pricing, setPricing] = useState({ subtotal: 0, discount: 0, total: 0 });
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoMessage, setPromoMessage] = useState(null);

  // Customer & Payment Info
  const [customerName, setCustomerName] = useState(user?.username || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('MOMO');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmedData, setConfirmedData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Sync user info automatically when logged in
  useEffect(() => {
    if (user) {
      setCustomerName(user.name || user.username || '');
      setCustomerEmail(user.email || '');
      if (user.phone) setCustomerPhone(user.phone);
    }
  }, [user]);

  // CGV F&B Concession Combos (Bắp Nước CGV)
  const [combos, setCombos] = useState([
    { id: 'CGV_COMBO', name: 'CGV Combo', desc: '1 Bắp lớn 64oz + 2 Nước ngọt lớn 32oz', price: 115000, qty: 0, icon: '🍿🥤🥤' },
    { id: 'MY_COMBO', name: 'My Combo', desc: '1 Bắp vừa 44oz + 1 Nước ngọt vừa 22oz', price: 89000, qty: 0, icon: '🍿🥤' },
    { id: 'POPCORN_CHEESE', name: 'Bắp Phô Mai / Caramel', desc: '1 Bắp lớn 64oz lắc phô mai thơm giòn', price: 65000, qty: 0, icon: '🍿' },
    { id: 'SOFT_DRINK', name: 'Nước Ngọt (Coca / Sprite)', desc: '1 Ly nước ngọt mát lạnh 32oz', price: 35000, qty: 0, icon: '🥤' }
  ]);

  const comboTotal = combos.reduce((acc, c) => acc + (c.price * c.qty), 0);

  const updateComboQty = (id, delta) => {
    setCombos(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, qty: Math.max(0, c.qty + delta) };
      }
      return c;
    }));
  };

  // Counter mode for staff (Task 14)
  const [isCounterMode, setIsCounterMode] = useState(false);
  const isStaffOrAdmin = user?.role === 'Staff' || user?.role === 'Admin';

  // 1. Initial Load: Movies & Cinemas
  useEffect(() => {
    fetchMoviesAndCinemas();
  }, []);

  const fetchMoviesAndCinemas = async () => {
    try {
      const [resMovies, resCinemas] = await Promise.all([
        fetch(`${API_BASE}/movies`),
        fetch(`${API_BASE}/cinemas`)
      ]);
      const dataMovies = await resMovies.json();
      const dataCinemas = await resCinemas.json();

      setMovies(dataMovies || []);
      setCinemas(dataCinemas || []);

      const paramMovieId = searchParams.get('movieId');
      const paramCinemaId = searchParams.get('cinemaId');

      if (paramMovieId && dataMovies.length > 0) {
        const found = dataMovies.find(m => m.id === paramMovieId);
        if (found) setSelectedMovie(found);
      } else if (dataMovies.length > 0) {
        setSelectedMovie(dataMovies[0]);
      }

      if (paramCinemaId && dataCinemas.length > 0) {
        const foundCinema = dataCinemas.find(c => c.id === paramCinemaId);
        if (foundCinema) setSelectedCinema(foundCinema);
      } else if (dataCinemas.length > 0) {
        setSelectedCinema(dataCinemas[0]);
      }
    } catch (err) {
      console.error('Error fetching movies/cinemas:', err);
    }
  };

  // 2. Load Showtimes when Movie, Cinema, or Date changes
  useEffect(() => {
    if (!selectedMovie || !selectedCinema) return;

    const fetchShowtimes = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/showtimes?movieId=${selectedMovie.id}&cinemaId=${selectedCinema.id}&date=${selectedDate}`
        );
        const data = await res.json();

        // Check if selectedDate is today; if so, filter out past showtimes
        const todayStr = new Date().toISOString().split('T')[0];
        const isToday = selectedDate === todayStr;
        const now = new Date();

        const activeShowtimes = (data || []).filter(s => {
          if (isToday && s.startTime) {
            return new Date(s.startTime) > now;
          }
          return true;
        });

        setShowtimes(activeShowtimes);

        const paramShowtimeId = searchParams.get('showtimeId');
        const found = activeShowtimes.find(s => s.id === paramShowtimeId);
        if (found) {
          setSelectedShowtime(found);
        } else if (activeShowtimes && activeShowtimes.length > 0) {
          setSelectedShowtime(activeShowtimes[0]);
        } else {
          setSelectedShowtime(null);
        }
      } catch (err) {
        console.error('Error fetching showtimes:', err);
      }
    };

    fetchShowtimes();
  }, [selectedMovie, selectedCinema, selectedDate]);

  // 3. Load Seat Availability when Showtime changes
  useEffect(() => {
    if (!selectedShowtime) {
      setSeatMatrix([]);
      setSelectedSeats([]);
      return;
    }
    fetchSeatAvailability();
  }, [selectedShowtime]);

  const fetchSeatAvailability = async () => {
    if (!selectedShowtime) return;
    setSeatLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bookings/seats?showtimeId=${selectedShowtime.id}`);
      const data = await res.json();
      if (res.ok && data.seats) {
        setSeatMatrix(data.seats);
      }
    } catch (err) {
      console.error('Error loading seats:', err);
    } finally {
      setSeatLoading(false);
    }
  };

  // Live polling for seat status on Step 2 (Real-time seat holds and release)
  useEffect(() => {
    if (currentStep !== 2 || !selectedShowtime) return;
    const interval = setInterval(() => {
      fetch(`${API_BASE}/bookings/seats?showtimeId=${selectedShowtime.id}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.seats) {
            setSeatMatrix(data.seats);
          }
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [currentStep, selectedShowtime]);

  // 4. Calculate Price dynamically when selected seats change
  useEffect(() => {
    if (!selectedShowtime || selectedSeats.length === 0) {
      setPricing({ subtotal: 0, discount: 0, total: 0 });
      return;
    }

    const calcPrice = async () => {
      try {
        const res = await fetch(`${API_BASE}/bookings/calculate-price`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            showtimeId: selectedShowtime.id,
            seatIds: selectedSeats,
            promoCode: appliedPromo?.code || null
          })
        });
        const data = await res.json();
        if (res.ok) {
          setPricing({
            subtotal: data.subtotal || 0,
            discount: data.discountAmount || 0,
            total: data.totalAmount || 0
          });
        }
      } catch (err) {
        console.error('Calculate price error:', err);
      }
    };

    calcPrice();
  }, [selectedSeats, selectedShowtime, appliedPromo]);

  // 5. 10-Minute Hold Countdown Timer
  useEffect(() => {
    if (!activeBooking || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleHoldExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeBooking, remainingSeconds]);

  const handleHoldExpired = () => {
    setIsHolding(false);
    setActiveBooking(null);
    setSelectedSeats([]);
    setCurrentStep(2);
    setErrorMessage('Thời gian giữ ghế (10 phút) đã hết hạn! Vui lòng chọn lại ghế.');
    fetchSeatAvailability();
  };

  // Resume pending booking if navigated from Profile
  useEffect(() => {
    const resumeBookingId = searchParams.get('resumeBookingId');
    if (!resumeBookingId) return;

    const resumeBooking = async () => {
      try {
        const res = await fetch(`${API_BASE}/bookings/${resumeBookingId}`);
        const data = await res.json();
        if (res.ok && data.booking && data.booking.status === 'PENDING') {
          const b = data.booking;
          const now = new Date();
          const expiresAt = b.holdExpiresAt ? new Date(b.holdExpiresAt) : null;
          if (expiresAt && expiresAt > now) {
            const diffSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
            setActiveBooking(b);
            setIsHolding(true);
            setRemainingSeconds(diffSeconds);
            if (b.seats && b.seats.length > 0) {
              setSelectedSeats(b.seats.map(s => s.seatId || s.seatNumber || s));
            }
            if (b.customerName) setCustomerName(b.customerName);
            if (b.customerEmail) setCustomerEmail(b.customerEmail);
            if (b.customerPhone) setCustomerPhone(b.customerPhone);
            if (b.totalAmount) {
              setPricing({
                subtotal: b.subtotal || b.totalAmount,
                discount: b.discountAmount || 0,
                total: b.totalAmount
              });
            }
            setCurrentStep(3); // Jump right to Payment step!
          } else {
            setErrorMessage('Phiên giữ chỗ này đã hết hạn 10 phút. Vui lòng chọn lại ghế.');
          }
        }
      } catch (err) {
        console.error('Error resuming booking:', err);
      }
    };

    resumeBooking();
  }, [searchParams]);

  // CGV Orphan Seat Rule (Không được chừa lại 1 ghế trống đơn độc)
  const wouldCauseOrphanSeat = (seatId, currentSelected) => {
    const row = seatId.charAt(0);
    if (row === 'E' || row === 'F') return false; // Couple rows are paired

    const rowSeats = seatMatrix
      .filter(s => s.row === row)
      .sort((a, b) => parseInt(a.col, 10) - parseInt(b.col, 10));

    if (rowSeats.length <= 2) return false;

    const candidateSelection = currentSelected.includes(seatId)
      ? currentSelected.filter(id => id !== seatId)
      : [...currentSelected, seatId];

    const isOccupied = (s) => {
      if (!s) return true; // wall/boundary
      if (s.status === 'BOOKED') return true;
      if (s.status === 'HELD' && !candidateSelection.includes(s.seatId)) return true;
      return candidateSelection.includes(s.seatId);
    };

    for (let i = 0; i < rowSeats.length; i++) {
      const s = rowSeats[i];
      if (isOccupied(s)) continue;

      const leftOccupied = i === 0 || isOccupied(rowSeats[i - 1]);
      const rightOccupied = i === rowSeats.length - 1 || isOccupied(rowSeats[i + 1]);

      if (leftOccupied && rightOccupied) {
        return true;
      }
    }
    return false;
  };

  // Sweetbox & Seat Selection Logic (CGV Standard)
  const toggleSeat = (seat) => {
    if (seat.status !== 'AVAILABLE' && !selectedSeats.includes(seat.seatId)) return;
    setErrorMessage('');

    const isCouple = seat.seatType === 'COUPLE' || seat.row === 'E' || seat.row === 'F';

    // If it's a couple seat, pair with adjacent seat
    if (isCouple) {
      const colNum = parseInt(seat.col, 10);
      const partnerCol = colNum % 2 === 1 ? colNum + 1 : colNum - 1;
      const partnerSeatId = `${seat.row}${partnerCol}`;
      const partnerSeat = seatMatrix.find(s => s.seatId === partnerSeatId);

      // Check partner availability
      if (partnerSeat && partnerSeat.status !== 'AVAILABLE' && !selectedSeats.includes(partnerSeatId)) {
        setErrorMessage(`Ghế đôi ${seat.seatId}-${partnerSeatId} không thể chọn vì ghế ${partnerSeatId} không khả dụng!`);
        return;
      }

      if (selectedSeats.includes(seat.seatId)) {
        // Deselect pair
        setSelectedSeats(selectedSeats.filter(id => id !== seat.seatId && id !== partnerSeatId));
      } else {
        if (selectedSeats.length + 2 > 8) {
          setErrorMessage('Tối đa mỗi lần đặt là 8 ghế.');
          return;
        }
        setSelectedSeats([...selectedSeats, seat.seatId, partnerSeatId]);
      }
    } else {
      // Standard / VIP seat toggle
      if (selectedSeats.includes(seat.seatId)) {
        setSelectedSeats(selectedSeats.filter(id => id !== seat.seatId));
      } else {
        // CGV Orphan Seat Check (chỉ áp dụng khi khách tự đặt online)
        if (!isCounterMode && wouldCauseOrphanSeat(seat.seatId, selectedSeats)) {
          setErrorMessage('⚠️ Quy tắc CGV: Bạn không thể để lại 1 ghế trống đơn lẻ bên cạnh. Vui lòng chọn ghế liền kề hoặc đổi vị trí khác!');
          return;
        }

        if (selectedSeats.length >= 8) {
          setErrorMessage('Tối đa mỗi lần đặt là 8 ghế.');
          return;
        }
        setSelectedSeats([...selectedSeats, seat.seatId]);
      }
    }
  };

  // Step 1 -> Step 2: Require Login Check (Bắt buộc đăng nhập để chọn ghế)
  const handleProceedToStep2 = () => {
    if (!selectedShowtime) {
      setErrorMessage('Vui lòng chọn một suất chiếu để tiếp tục.');
      return;
    }
    if (!user && !isCounterMode) {
      setShowLoginModal(true);
      return;
    }
    setCurrentStep(2);
  };

  // Step 2 -> Step 3: Hold seats and proceed to payment
  const handleProceedToPayment = async () => {
    if (!selectedShowtime || selectedSeats.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất 1 ghế.');
      return;
    }

    if (isCounterMode) {
      // Staff counter skips online hold countdown
      setCurrentStep(3);
      return;
    }

    setErrorMessage('');
    setIsProcessing(true);

    try {
      const token = user?.token;
      const res = await fetch(`${API_BASE}/bookings/hold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          showtimeId: selectedShowtime.id,
          seatIds: selectedSeats,
          customerName: customerName || user?.name || user?.username || 'Khách hàng',
          customerEmail: customerEmail || user?.email || 'guest@cinemahub.com',
          customerPhone: customerPhone || user?.phone || '0900000000'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ghế vừa có người giữ hoặc đặt trước. Vui lòng chọn ghế khác.');
      }

      setActiveBooking(data);
      setIsHolding(true);
      setRemainingSeconds(600); // 10 minutes
      setCurrentStep(3);
      fetchSeatAvailability();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 3: Apply Promo Code
  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    setPromoMessage(null);

    try {
      const res = await fetch(`${API_BASE}/bookings/apply-promo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCodeInput.trim().toUpperCase(),
          subtotal: pricing.subtotal,
          bookingId: activeBooking?.id || null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Mã giảm giá không hợp lệ hoặc hết lượt dùng');
      }

      setAppliedPromo(data);
      setPricing(prev => ({
        ...prev,
        discount: data.discountAmount,
        total: data.newTotal
      }));
      setPromoMessage({ type: 'success', text: `Áp dụng thành công mã ${data.code}: -${data.discountAmount.toLocaleString()}đ` });
    } catch (err) {
      setPromoMessage({ type: 'error', text: err.message });
      setAppliedPromo(null);
    }
  };

  // Step 3: Confirm Booking (Customer Online)
  const handleConfirmBooking = async () => {
    if (!activeBooking) return;
    setIsProcessing(true);
    setErrorMessage('');

    try {
      const finalCustomerName = customerName || user?.name || user?.username || activeBooking.customerName || 'Khách hàng';
      const finalCustomerEmail = customerEmail || user?.email || activeBooking.customerEmail || 'customer@cinemahub.com';
      const finalCustomerPhone = customerPhone || user?.phone || activeBooking.customerPhone || '0900000000';

      // If user selected VNPAY payment gateway, redirect to VNPAY Sandbox
      if (paymentMethod === 'VNPAY') {
        const vnpRes = await fetch(`${API_BASE}/payment/create-vnpay-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: activeBooking.id,
            customerName: finalCustomerName,
            customerEmail: finalCustomerEmail,
            customerPhone: finalCustomerPhone,
            promoCode: appliedPromo?.code || null,
            bankCode: 'NCB'
          })
        });

        const vnpData = await vnpRes.json();
        if (!vnpRes.ok || !vnpData.paymentUrl) {
          throw new Error(vnpData.error || 'Khởi tạo thanh toán VNPAY thất bại');
        }

        // Redirect directly to VNPAY Sandbox payment gateway
        window.location.href = vnpData.paymentUrl;
        return;
      }

      const res = await fetch(`${API_BASE}/bookings/${activeBooking.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          customerName: finalCustomerName,
          customerEmail: finalCustomerEmail,
          customerPhone: finalCustomerPhone,
          promoCode: appliedPromo?.code || null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Xác nhận đặt vé thất bại');
      }

      setConfirmedData(data);
      setIsHolding(false);
      setActiveBooking(null);
      setCurrentStep(4); // Move to E-Ticket screen
      fetchSeatAvailability();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsProcessing(false);
    }
  };


  // Step 3 (Staff): Counter Booking at counter
  const handleCounterBooking = async () => {
    if (!selectedShowtime || selectedSeats.length === 0) return;
    if (!customerName.trim()) {
      setErrorMessage('Vui lòng nhập tên khách hàng tại quầy');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const token = user?.token;
      const res = await fetch(`${API_BASE}/bookings/counter-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          showtimeId: selectedShowtime.id,
          seatIds: selectedSeats,
          customerName,
          customerPhone: customerPhone || 'Khách vãng lai',
          customerEmail: customerEmail || '',
          paymentMethod,
          promoCode: appliedPromo?.code || null,
          staffNotes: `Xuất vé trực tiếp tại quầy bởi ${user?.username || 'Staff'}`
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Xuất vé tại quầy thất bại');
      }

      setConfirmedData(data);
      setSelectedSeats([]);
      setCurrentStep(4); // Move to E-Ticket screen
      fetchSeatAvailability();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancel hold session
  const handleCancelHold = async () => {
    if (activeBooking) {
      try {
        await fetch(`${API_BASE}/bookings/${activeBooking.id}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Khách hàng hủy phiên giữ chỗ' })
        });
      } catch (ignored) {}
    }

    setIsHolding(false);
    setActiveBooking(null);
    setSelectedSeats([]);
    setAppliedPromo(null);
    setCurrentStep(2);
    fetchSeatAvailability();
  };

  // Format seconds MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper date tabs for CGV style
  const getDatesList = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const dayName = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : `Thứ ${d.getDay() + 1 === 1 ? 'CN' : d.getDay() + 1}`;
      const dayDisplay = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      dates.push({ iso, dayName, dayDisplay });
    }
    return dates;
  };

  return (
    <div className="min-h-screen pt-24 pb-24 bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-4 max-w-7xl">

        {/* TOP BAR: CGV Header & Staff Counter Switch */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 mb-6 border-b border-white/10 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="bg-primary px-3 py-1 text-xs font-black tracking-widest uppercase rounded">CGV CINEMAHUB</span>
              <h1 className="text-2xl md:text-3xl font-display font-extrabold text-white">Hệ Thống Đặt Vé Trực Tuyến</h1>
            </div>
            <p className="text-xs text-gray-400 mt-1">Trải nghiệm đặt vé chuẩn rạp chiếu phim CGV - Nhanh chóng, giữ chỗ thời gian thực</p>
          </div>

          <div className="flex items-center gap-3">
            {isStaffOrAdmin && (
              <button
                onClick={() => setIsCounterMode(!isCounterMode)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                  isCounterMode
                    ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 border-white/10'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                {isCounterMode ? 'Chế độ Quầy Bán Vé (POS)' : 'Chuyển sang Quầy Nhân Viên'}
              </button>
            )}
          </div>
        </div>

        {/* STEPPER PROGRESS BAR (Chuẩn Flow CGV 4 bước) */}
        <div className="mb-8 bg-[#141414] p-4 rounded-2xl border border-white/10">
          <div className="grid grid-cols-4 gap-2 text-center text-xs md:text-sm font-bold">
            <div className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${currentStep === 1 ? 'bg-primary text-white shadow-lg' : currentStep > 1 ? 'text-green-400 bg-white/5' : 'text-gray-500'}`}>
              <Film className="w-4 h-4 hidden sm:inline" />
              <span>1. Chọn Suất Chiếu</span>
            </div>
            <div className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${currentStep === 2 ? 'bg-primary text-white shadow-lg' : currentStep > 2 ? 'text-green-400 bg-white/5' : 'text-gray-500'}`}>
              <Monitor className="w-4 h-4 hidden sm:inline" />
              <span>2. Chọn Ghế Ngồi</span>
            </div>
            <div className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${currentStep === 3 ? 'bg-primary text-white shadow-lg' : currentStep > 3 ? 'text-green-400 bg-white/5' : 'text-gray-500'}`}>
              <CreditCard className="w-4 h-4 hidden sm:inline" />
              <span>3. Thanh Toán {isHolding && `(${formatTime(remainingSeconds)})`}</span>
            </div>
            <div className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${currentStep === 4 ? 'bg-primary text-white shadow-lg' : 'text-gray-500'}`}>
              <Ticket className="w-4 h-4 hidden sm:inline" />
              <span>4. Vé Điện Tử</span>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-between text-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage('')}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: CHỌN PHIM, RẠP, NGÀY & SUẤT CHIẾU (CGV STYLE) */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            
            {/* Phim đang chọn & Đổi phim nhanh (CGV Style Header) */}
            {selectedMovie && (
              <div className="bg-[#141414] p-4 sm:p-5 rounded-2xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedMovie.posterUrl}
                    alt={selectedMovie.title}
                    className="w-16 h-24 sm:w-20 sm:h-28 object-cover rounded-xl shadow-lg border border-white/10 shrink-0"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-black bg-red-600/30 text-red-400 px-2.5 py-0.5 rounded border border-red-500/20">
                        {selectedMovie.ageRating || 'P'}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">{selectedMovie.duration} phút</span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-400">{selectedMovie.genres?.join(', ')}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white">{selectedMovie.title}</h2>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1 max-w-xl">
                      {selectedMovie.description || 'Đang công chiếu tại tất cả các cụm rạp trên toàn quốc.'}
                    </p>
                  </div>
                </div>

                {/* Quick Movie Switcher Dropdown */}
                {movies.length > 1 && (
                  <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                    <label htmlFor="movie-select" className="text-xs text-gray-400 font-medium shrink-0">
                      Đổi phim:
                    </label>
                    <select
                      id="movie-select"
                      value={selectedMovie?.id || ''}
                      onChange={(e) => {
                        const m = movies.find(item => item.id === e.target.value);
                        if (m) {
                          setSelectedMovie(m);
                          setSelectedSeats([]);
                          setSelectedShowtime(null);
                        }
                      }}
                      className="bg-[#1a1a1a] border border-white/20 rounded-xl px-3.5 py-2 text-sm font-semibold text-white focus:outline-none focus:border-primary transition-all cursor-pointer hover:border-white/40"
                    >
                      {movies.map(m => (
                        <option key={m.id} value={m.id} className="bg-[#1a1a1a] text-white">
                          [{m.ageRating || 'P'}] {m.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Chọn Cụm Rạp & Dải Ngày Chiếu */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-[#141414] p-6 rounded-2xl border border-white/10">
              
              {/* Chọn Rạp */}
              <div className="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-white/10 pb-6 lg:pb-0 lg:pr-6">
                <h3 className="text-sm uppercase font-bold text-gray-400 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> 1. Cụm Rạp CGV
                </h3>
                <div className="space-y-2">
                  {cinemas.map(c => {
                    const isSelected = selectedCinema?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCinema(c);
                          setSelectedSeats([]);
                          setSelectedShowtime(null);
                        }}
                        className={`w-full text-left p-3.5 rounded-xl border text-sm font-semibold transition-all ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-md'
                            : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                        }`}
                      >
                        <div className="font-bold">{c.name}</div>
                        <div className="text-xs opacity-75 truncate">{c.address}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dải Ngày Chiếu (CGV Date Picker) */}
              <div className="lg:col-span-2">
                <h3 className="text-sm uppercase font-bold text-gray-400 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" /> 2. Ngày Chiếu Phim
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-3 mb-6">
                  {getDatesList().map(item => {
                    const isSelected = selectedDate === item.iso;
                    return (
                      <button
                        key={item.iso}
                        onClick={() => setSelectedDate(item.iso)}
                        className={`px-4 py-3 rounded-xl border text-center shrink-0 min-w-[90px] transition-all ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-[0_0_15px_rgba(229,9,20,0.5)] scale-105'
                            : 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/10'
                        }`}
                      >
                        <div className="text-xs uppercase font-medium">{item.dayName}</div>
                        <div className="text-lg font-bold mt-0.5">{item.dayDisplay}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Suất Chiếu Khả Dụng Nhóm Theo Định Dạng (2D, 3D, IMAX) */}
                <h3 className="text-sm uppercase font-bold text-gray-400 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> 3. Suất Chiếu Khả Dụng ({showtimes.length})
                </h3>

                {showtimes.length === 0 ? (
                  <div className="p-8 text-center bg-white/5 rounded-xl text-gray-400 text-sm">
                    Hiện chưa có suất chiếu nào cho ngày {selectedDate}. Vui lòng chọn ngày khác hoặc chọn rạp khác.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Phân nhóm theo định dạng */}
                    {['IMAX', '2D', '3D'].map(fmt => {
                      const fmtShowtimes = showtimes.filter(s => s.format === fmt);
                      if (fmtShowtimes.length === 0) return null;
                      return (
                        <div key={fmt} className="bg-white/5 p-4 rounded-xl border border-white/5">
                          <span className="text-xs font-black px-2.5 py-1 bg-white/10 rounded text-amber-300 uppercase tracking-wider mb-3 inline-block">
                            Định dạng: {fmt}
                          </span>
                          <div className="flex flex-wrap gap-3 mt-2">
                            {fmtShowtimes.map(st => {
                              const isSelected = selectedShowtime?.id === st.id;
                              const timeStr = new Date(st.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              return (
                                <button
                                  key={st.id}
                                  onClick={() => setSelectedShowtime(st)}
                                  className={`px-4 py-3 rounded-xl border transition-all text-left min-w-[120px] ${
                                    isSelected
                                      ? 'bg-primary text-white border-primary shadow-[0_0_15px_rgba(229,9,20,0.5)] scale-105'
                                      : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                                  }`}
                                >
                                  <div className="text-base font-extrabold">{timeStr}</div>
                                  <div className="text-xs opacity-80">{st.roomName || 'Phòng 1'}</div>
                                  <div className="text-[11px] text-accent font-semibold mt-1">
                                    từ {st.basePrice?.toLocaleString()}đ
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Chuyển sang Bước 2 */}
            <div className="flex justify-end pt-4">
              <button
                disabled={!selectedShowtime}
                onClick={handleProceedToStep2}
                className="px-8 py-4 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-xl shadow-[0_0_20px_rgba(229,9,20,0.5)] flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
              >
                <span>Tiếp tục: Chọn ghế ngồi</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: SƠ ĐỒ CHỌN GHẾ CHUẨN CGV (SEAT MAP & SWEETBOX) */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* Thanh thông tin suất chiếu đã chọn */}
            <div className="bg-[#141414] p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 flex items-center gap-1 text-xs font-bold"
                >
                  <ArrowLeft className="w-4 h-4" /> Đổi suất
                </button>
                <div>
                  <h3 className="font-bold text-white text-base">{selectedMovie?.title}</h3>
                  <p className="text-xs text-gray-400">
                    {selectedCinema?.name} • {selectedShowtime?.roomName} • {new Date(selectedShowtime?.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({selectedDate})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={fetchSeatAvailability} 
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 bg-white/5 px-3 py-2 rounded-lg"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Làm mới ghế
                </button>
              </div>
            </div>

            {/* Màn hình chiếu cong CGV SCREEN */}
            <div className="bg-[#141414] p-8 md:p-12 rounded-3xl border border-white/10 flex flex-col items-center">
              
              <div className="w-full max-w-2xl text-center mb-10">
                <div className="relative w-full h-12 border-t-4 border-secondary/60 rounded-t-[50%] flex items-center justify-center shadow-[0_-20px_35px_rgba(14,165,233,0.25)]">
                  <span className="text-gray-300 text-xs tracking-[0.6em] mt-3 font-bold flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-secondary" /> MÀN HÌNH / SCREEN
                  </span>
                </div>
              </div>

              {/* Ma trận ghế */}
              {seatLoading ? (
                <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm">Đang tải trạng thái ghế...</p>
                </div>
              ) : seatMatrix.length === 0 ? (
                <p className="text-gray-400 py-12">Không tìm thấy sơ đồ ghế cho phòng chiếu này.</p>
              ) : (
                <div className="flex flex-col gap-3.5 mb-10 overflow-x-auto w-full items-center py-2">
                  {['A', 'B', 'C', 'D', 'E', 'F'].map(row => {
                    const rowSeats = seatMatrix.filter(s => s.row === row);
                    const isCoupleRow = row === 'E' || row === 'F';

                    return (
                      <div key={row} className="flex items-center gap-4">
                        <span className="text-gray-400 font-extrabold w-6 text-center text-sm">{row}</span>
                        <div className="flex gap-2 sm:gap-3">
                          {rowSeats.map(seat => {
                            const isSelected = selectedSeats.includes(seat.seatId);
                            const isBooked = seat.status === 'BOOKED';
                            const isHeld = seat.status === 'HELD' && !isSelected;
                            const isVip = seat.seatType === 'VIP' || row === 'C' || row === 'D';

                            let seatStyle = "w-8 h-8 sm:w-10 sm:h-10 rounded-t-lg rounded-b-sm flex items-center justify-center text-xs font-bold cursor-pointer transition-all duration-200 border-b-4 ";

                            if (isBooked) {
                              seatStyle += "bg-white/5 text-gray-600 border-white/5 cursor-not-allowed";
                            } else if (isHeld) {
                              seatStyle += "bg-amber-500/20 text-amber-400 border-amber-500/40 cursor-not-allowed animate-pulse";
                            } else if (isSelected) {
                              seatStyle += "bg-primary text-white border-red-700 shadow-[0_0_15px_rgba(229,9,20,0.7)] scale-110";
                            } else if (isCoupleRow) {
                              seatStyle += "bg-purple-600/20 text-purple-300 hover:bg-purple-600/40 border-purple-500/40";
                            } else if (isVip) {
                              seatStyle += "bg-amber-500/20 text-amber-300 hover:bg-amber-500/40 border-amber-500/40";
                            } else {
                              seatStyle += "bg-white/10 text-gray-300 hover:bg-white/20 border-white/20";
                            }

                            return (
                              <button
                                key={seat.seatId}
                                disabled={isBooked || isHeld}
                                onClick={() => toggleSeat(seat)}
                                className={seatStyle}
                                title={`${seat.seatId} (${isCoupleRow ? 'Sweetbox Ghế Đôi' : isVip ? 'VIP' : 'Standard'})`}
                              >
                                {isCoupleRow ? <Heart className="w-3.5 h-3.5 text-purple-400" /> : seat.col}
                              </button>
                            );
                          })}
                        </div>
                        <span className="text-gray-400 font-extrabold w-6 text-center text-sm">{row}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Chú thích loại ghế (Legend) */}
              <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-400 border-t border-white/10 pt-6 w-full max-w-3xl">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-t bg-white/10 border-b-2 border-white/20"></div> Ghế thường
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-t bg-amber-500/20 border-b-2 border-amber-500/40 text-amber-400"></div> Ghế VIP (+30k)
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-t bg-purple-600/20 border-b-2 border-purple-500/40 text-purple-300 flex items-center justify-center">
                    <Heart className="w-2.5 h-2.5 text-purple-400" />
                  </div> Ghế Đôi Sweetbox (Đi theo cặp)
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-t bg-primary border-b-2 border-red-700 shadow-[0_0_8px_rgba(229,9,20,0.6)]"></div> Đang chọn
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-t bg-amber-500/20 border-b-2 border-amber-500/40 animate-pulse"></div> Đang giữ chỗ
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-t bg-white/5 border-b-2 border-white/5 text-gray-600"></div> Đã bán
                </div>
              </div>
            </div>

            {/* CGV FLOATING BOTTOM BAR (Thanh tóm tắt nổi cố định ở dưới) */}
            <div className="sticky bottom-4 z-40 bg-[#181818]/95 backdrop-blur-md p-4 md:p-5 rounded-2xl border border-white/15 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="hidden sm:block">
                  <span className="text-xs text-gray-400 uppercase font-semibold">Ghế đang chọn:</span>
                  <div className="text-lg font-black text-primary">
                    {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Chưa chọn'}
                  </div>
                </div>
                <div className="border-l border-white/10 pl-4 hidden sm:block">
                  <span className="text-xs text-gray-400 uppercase font-semibold">Tạm tính:</span>
                  <div className="text-xl font-black text-white">
                    {pricing.subtotal.toLocaleString()} đ
                  </div>
                </div>
                {/* Mobile version */}
                <div className="sm:hidden flex justify-between w-full">
                  <div>
                    <span className="text-xs text-gray-400">Ghế: </span>
                    <span className="font-bold text-primary">{selectedSeats.join(', ') || 'Chưa chọn'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Tổng: </span>
                    <span className="font-bold text-white">{pricing.subtotal.toLocaleString()} đ</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-gray-300 font-bold rounded-xl text-sm transition-all"
                >
                  Quay lại
                </button>
                <button
                  disabled={selectedSeats.length === 0 || isProcessing}
                  onClick={handleProceedToPayment}
                  className="flex-1 sm:flex-none px-8 py-3.5 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-xl shadow-[0_0_20px_rgba(229,9,20,0.5)] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                  <span>{isCounterMode ? 'Xuất vé tại quầy' : 'Tiếp tục thanh toán'}</span>
                </button>
              </div>
            </div>

          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: THANH TOÁN & GIỮ CHỖ 10 PHÚT (CHECKOUT & PROMO) */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* Banner đếm ngược thời gian giữ ghế (10:00 Countdown) */}
            {isHolding && (
              <div className="bg-gradient-to-r from-amber-500/20 via-primary/20 to-amber-500/20 border border-amber-500/40 p-4 rounded-2xl flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/30 rounded-xl text-amber-300 animate-pulse">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-amber-300 text-sm md:text-base">Ghế Của Bạn Đang Được Tạm Giữ Trong 10 Phút</h3>
                    <p className="text-xs text-gray-300">Vui lòng hoàn tất thanh toán trước khi thời gian kết thúc để không bị mất ghế.</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl md:text-3xl font-mono font-black text-amber-400">
                    {formatTime(remainingSeconds)}
                  </div>
                  <button 
                    onClick={handleCancelHold} 
                    className="text-xs text-red-400 hover:text-red-300 underline font-semibold mt-1"
                  >
                    Hủy giữ ghế
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Cột trái: Thông tin nhận vé, Voucher & Cổng thanh toán */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* 3.1 Thông tin người nhận vé (Tự động từ tài khoản đã đăng nhập) */}
                <div className="bg-[#141414] p-6 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-primary" /> Thông Tin Khách Hàng (Tài Khoản Thành Viên)
                    </h3>
                    {user ? (
                      <span className="text-xs bg-green-500/20 text-green-400 font-bold px-3 py-1 rounded-full border border-green-500/30 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" /> Đã Xác Thực
                      </span>
                    ) : (
                      <span className="text-xs text-amber-400">Khách vãng lai</span>
                    )}
                  </div>

                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-extrabold text-base">
                        {(user?.name || user?.username || customerName || 'K').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-white text-base">
                          {user?.name || user?.username || customerName || 'Khách Hàng Thành Viên'}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {user?.email || customerEmail || 'customer@cinemahub.com'}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-primary font-bold bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                      Mã vé & QR tự động lưu vào tài khoản
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Tên người nhận vé:</label>
                      <input
                        type="text"
                        placeholder="Họ tên người nhận"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Số điện thoại nhận SMS:</label>
                      <input
                        type="tel"
                        placeholder="VD: 0912345678"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* 3.2 Combo Bắp Nước CGV (Concessions - CGV Style) */}
                <div className="bg-[#141414] p-6 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span className="text-xl">🍿</span> Combo Bắp Nước CGV (Tùy chọn)
                    </h3>
                    <span className="text-xs text-gray-400">Thêm bắp nước để trải nghiệm trọn vẹn</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {combos.map(item => (
                      <div key={item.id} className="p-3.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{item.icon}</span>
                          <div>
                            <div className="font-bold text-white text-sm">{item.name}</div>
                            <div className="text-[11px] text-gray-400 line-clamp-1">{item.desc}</div>
                            <div className="text-xs font-bold text-amber-400 mt-0.5">{item.price.toLocaleString()} đ</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1 border border-white/10">
                          <button
                            type="button"
                            onClick={() => updateComboQty(item.id, -1)}
                            disabled={item.qty === 0}
                            className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-bold flex items-center justify-center text-sm"
                          >
                            -
                          </button>
                          <span className="w-5 text-center font-bold text-sm text-primary">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateComboQty(item.id, 1)}
                            className="w-7 h-7 rounded bg-primary hover:bg-primary-hover text-white font-bold flex items-center justify-center text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3.3 Mã giảm giá (Voucher CGV) */}
                <div className="bg-[#141414] p-6 rounded-2xl border border-white/10">
                  <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-primary" /> Mã Khuyến Mãi / Voucher CGV
                  </h3>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Nhập mã: GIAM50K hoặc CHAO2026"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white uppercase text-sm font-semibold focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={handleApplyPromo}
                      disabled={!promoCodeInput.trim() || pricing.subtotal === 0}
                      className="px-6 py-3 bg-secondary hover:bg-secondary-hover text-white font-bold rounded-xl text-sm shrink-0 disabled:opacity-40 transition-all"
                    >
                      Áp dụng
                    </button>
                  </div>
                  {promoMessage && (
                    <p className={`text-xs mt-2.5 font-semibold ${promoMessage.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                      {promoMessage.text}
                    </p>
                  )}
                </div>

                {/* 3.4 Phương thức thanh toán chuẩn CGV */}
                <div className="bg-[#141414] p-6 rounded-2xl border border-white/10 space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" /> Chọn Cổng Thanh Toán
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'MOMO', name: 'Ví MoMo', desc: 'Thanh toán tức thì qua ứng dụng MoMo' },
                      { id: 'VNPAY', name: 'Cổng VNPAY', desc: 'Quét mã QR qua mọi ứng dụng ngân hàng' },
                      { id: 'CARD', name: 'Thẻ Quốc Tế', desc: 'Visa, MasterCard, JCB' },
                      ...(isCounterMode ? [{ id: 'CASH', name: 'Tiền Mặt (CASH)', desc: 'Thu tiền trực tiếp tại quầy' }] : [])
                    ].map(pm => {
                      const isSelected = paymentMethod === pm.id;
                      return (
                        <div
                          key={pm.id}
                          onClick={() => setPaymentMethod(pm.id)}
                          className={`cursor-pointer p-4 rounded-xl border flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-primary/10 border-primary ring-2 ring-primary/30 shadow-md'
                              : 'bg-white/5 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-white text-sm">{pm.name}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{pm.desc}</div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-gray-500'}`}>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Cột phải: Tóm tắt hóa đơn vé (Order Summary) */}
              <div className="lg:col-span-1">
                <div className="bg-[#141414] p-6 rounded-2xl border border-white/10 sticky top-28 space-y-6">
                  <h3 className="text-lg font-bold text-white border-b border-white/10 pb-4">
                    Tóm Tắt Hóa Đơn
                  </h3>

                  {/* Thông tin phim */}
                  <div className="flex gap-4">
                    <img 
                      src={selectedMovie?.posterUrl} 
                      alt={selectedMovie?.title} 
                      className="w-20 h-28 object-cover rounded-xl shrink-0 shadow-md"
                    />
                    <div>
                      <h4 className="font-bold text-white text-base line-clamp-1">{selectedMovie?.title}</h4>
                      <p className="text-xs text-gray-400 mt-1">{selectedShowtime?.format} • {selectedMovie?.duration}p</p>
                      <p className="text-xs text-gray-400">{selectedCinema?.name}</p>
                      <p className="text-xs text-primary font-bold mt-1">{selectedShowtime?.roomName}</p>
                    </div>
                  </div>

                  {/* Suất & Ghế */}
                  <div className="space-y-2 text-sm border-t border-b border-white/10 py-4 text-gray-300">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Suất chiếu:</span>
                      <span className="font-bold text-white">
                        {new Date(selectedShowtime?.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {selectedDate}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Ghế ({selectedSeats.length}):</span>
                      <span className="font-bold text-primary">{selectedSeats.join(', ')}</span>
                    </div>
                  </div>

                  {/* Bảng tính tiền */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-400">
                      <span>Tạm tính vé</span>
                      <span>{pricing.subtotal.toLocaleString()} đ</span>
                    </div>
                    {comboTotal > 0 && (
                      <div className="flex justify-between text-amber-300 font-semibold">
                        <span>Combo bắp nước</span>
                        <span>+{comboTotal.toLocaleString()} đ</span>
                      </div>
                    )}
                    {pricing.discount > 0 && (
                      <div className="flex justify-between text-green-400 font-bold">
                        <span>Voucher ({appliedPromo?.code})</span>
                        <span>-{pricing.discount.toLocaleString()} đ</span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline pt-3 border-t border-white/10">
                      <span className="text-base font-bold text-white">Tổng thanh toán</span>
                      <span className="text-2xl font-black text-primary">{(pricing.total + comboTotal).toLocaleString()} đ</span>
                    </div>
                  </div>

                  {/* Nút hành động */}
                  {isCounterMode ? (
                    <button
                      onClick={handleCounterBooking}
                      disabled={isProcessing}
                      className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
                    >
                      {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
                      <span>In Vé & Hoàn Tất Tại Quầy</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleConfirmBooking}
                      disabled={isProcessing}
                      className="w-full py-4 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-xl shadow-[0_0_20px_rgba(229,9,20,0.5)] flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
                    >
                      {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                      <span>{paymentMethod === 'VNPAY' ? 'Chuyển Tới Cổng VNPAY' : 'Xác Nhận & Thanh Toán Ngay'}</span>
                    </button>
                  )}


                  <button
                    onClick={() => setCurrentStep(2)}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-400 font-semibold rounded-xl text-xs transition-all"
                  >
                    Quay lại chọn lại ghế
                  </button>
                </div>
              </div>

            </div>

          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: VÉ ĐIỆN TỬ CGV E-TICKET (BOARDING PASS STYLE) */}
        {/* ========================================================================= */}
        {currentStep === 4 && confirmedData && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto space-y-6">
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-[0_0_25px_rgba(34,197,94,0.4)]">
                <Check className="w-8 h-8" />
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">Đặt Vé Thành Công!</h2>
              <p className="text-xs text-gray-400 mt-1">Thông tin vé điện tử đã được xác nhận và gửi tới email của bạn.</p>
            </div>

            {/* CGV E-TICKET CARD */}
            <div className="bg-[#141414] rounded-3xl border border-white/15 overflow-hidden shadow-2xl relative">
              
              {/* Ticket Header */}
              <div className="bg-primary p-6 text-center text-white relative">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] bg-black/20 px-3 py-1 rounded-full">
                  VÉ ĐIỆN TỬ • CGV CINEMAHUB E-TICKET
                </span>
                <h3 className="text-2xl font-black mt-2">{confirmedData.movieTitle}</h3>
                <p className="text-xs opacity-90">{confirmedData.cinemaName} • {confirmedData.roomName}</p>
              </div>

              {/* Ticket Body */}
              <div className="p-8 space-y-6">
                
                {/* QR Code Section */}
                <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-inner text-black">
                  <QRCodeSVG 
                    value={confirmedData.ticket?.qrCode || confirmedData.qrCode || `CINEMAHUB|${confirmedData.bookingReference || confirmedData.booking?.bookingReference}`} 
                    size={190}
                    level="H"
                    includeMargin={true}
                  />
                  <p className="text-xs font-mono font-bold tracking-widest mt-3 uppercase text-gray-800">
                    MÃ ĐẶT VÉ: {confirmedData.bookingReference || confirmedData.booking?.bookingReference}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5 text-center">Xuất trình mã này tại quầy hoặc cửa soát vé để vào rạp</p>
                </div>

                {/* Ticket Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center border-t border-b border-white/10 py-4 text-xs">
                  <div>
                    <span className="text-gray-400 block mb-0.5">Ngày Chiếu</span>
                    <span className="font-extrabold text-white text-sm">
                      {confirmedData.showtimeStart || confirmedData.booking?.showtimeStart 
                        ? new Date(confirmedData.showtimeStart || confirmedData.booking?.showtimeStart).toLocaleDateString('vi-VN') 
                        : selectedDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Giờ Chiếu</span>
                    <span className="font-extrabold text-white text-sm">
                      {new Date(confirmedData.showtimeStart || confirmedData.startTime || confirmedData.booking?.showtimeStart || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Phòng Chiếu</span>
                    <span className="font-extrabold text-white text-sm">{confirmedData.roomName || confirmedData.booking?.roomName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Ghế Ngồi</span>
                    <span className="font-extrabold text-primary text-base">
                      {confirmedData.seats?.map(s => s.seatNumber || s.seatId).join(', ') || confirmedData.booking?.seats?.map(s => s.seatNumber || s.seatId).join(', ') || selectedSeats.join(', ')}
                    </span>
                  </div>
                </div>

                {/* Meta details */}
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Người nhận: <strong className="text-white">{confirmedData.customerName || confirmedData.booking?.customerName}</strong></span>
                  <span>Tổng tiền: <strong className="text-white text-sm font-bold">{(confirmedData.totalAmount || confirmedData.booking?.totalAmount)?.toLocaleString()} đ</strong></span>
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
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-gray-200 font-bold text-xs rounded-xl"
                  >
                    Xem lịch sử vé
                  </button>
                  <button
                    onClick={() => {
                      setCurrentStep(1);
                      setSelectedSeats([]);
                      setConfirmedData(null);
                    }}
                    className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-extrabold text-xs rounded-xl shadow-md"
                  >
                    Đặt vé khác
                  </button>
                </div>
              </div>

            </div>

          </motion.div>
        )}

        {/* LOGIN REQUIRED MODAL (Bắt buộc đăng nhập để chọn ghế & giữ chỗ) */}
        <AnimatePresence>
          {showLoginModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#181818] border border-white/15 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative"
              >
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="w-16 h-16 rounded-2xl bg-primary/20 text-primary flex items-center justify-center mx-auto mb-4 shadow-[0_0_25px_rgba(229,9,20,0.4)]">
                  <UserCheck className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-bold font-display text-white text-center mb-2">
                  Đăng Nhập Để Chọn Ghế
                </h3>
                <p className="text-xs text-gray-300 text-center leading-relaxed mb-6">
                  Theo tiêu chuẩn rạp CGV, quý khách cần đăng nhập tài khoản thành viên để chọn vị trí ghế ngồi, kích hoạt giữ chỗ thời gian thực và nhận vé điện tử kèm mã QR.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/login', { state: { returnUrl: '/booking' } })}
                    className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-xl shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <span>Đăng Nhập Ngay</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => navigate('/register')}
                    className="w-full py-3 bg-white/10 hover:bg-white/20 text-gray-200 font-bold rounded-xl transition-all text-sm"
                  >
                    Đăng Ký Tài Khoản Mới
                  </button>

                  <button
                    onClick={() => setShowLoginModal(false)}
                    className="w-full py-2 text-xs text-gray-400 hover:text-white font-semibold"
                  >
                    Để sau / Tiếp tục xem suất chiếu
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default Booking;
