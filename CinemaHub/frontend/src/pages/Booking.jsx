import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Monitor, Info, CreditCard } from 'lucide-react';

const Booking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const [selectedSeats, setSelectedSeats] = useState([]);

  useEffect(() => {
    if (id) {
      fetch(`http://localhost:8080/api/movies/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'DISABLED') {
            navigate('/', { state: { message: 'Phim này đã ngừng chiếu hoặc không khả dụng!' } });
            return;
          }
          setMovie(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // Generate dummy seats (5 rows, 8 cols)
  const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
  const cols = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  
  // Simulate some booked seats
  const bookedSeats = ['A3', 'A4', 'C7', 'C8', 'D5', 'D6', 'F1', 'F2'];
  const vipRows = ['C', 'D'];

  const toggleSeat = (seatId) => {
    if (bookedSeats.includes(seatId)) return;
    
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter(id => id !== seatId));
    } else {
      setSelectedSeats([...selectedSeats, seatId]);
    }
  };

  const getSeatPrice = (seatId) => {
    const row = seatId.charAt(0);
    return vipRows.includes(row) ? 120000 : 90000;
  };

  const totalPrice = selectedSeats.reduce((total, seatId) => total + getSeatPrice(seatId), 0);

  return (
    <div className="min-h-screen pt-28 pb-20 bg-background relative overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="container mx-auto px-4 md:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Seat Map */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 md:p-10 flex flex-col items-center">
          <div className="w-full max-w-2xl text-center mb-12">
            <h2 className="text-2xl font-display font-bold mb-8">Chọn ghế của bạn</h2>
            
            {/* Screen Curve */}
            <div className="relative w-full h-12 border-t-4 border-secondary/50 rounded-t-[50%] flex items-center justify-center shadow-[0_-15px_30px_rgba(14,165,233,0.15)]">
               <span className="text-gray-400 text-sm tracking-[0.5em] mt-4 flex items-center gap-2">
                 <Monitor className="w-4 h-4" /> MÀN HÌNH
               </span>
            </div>
          </div>

          {/* Seat Grid */}
          <div className="flex flex-col gap-4 mb-12 overflow-x-auto w-full items-center">
            {rows.map(row => (
              <div key={row} className="flex items-center gap-4">
                <span className="text-gray-500 font-medium w-6 text-center">{row}</span>
                <div className="flex gap-2 sm:gap-3">
                  {cols.map(col => {
                    const seatId = `${row}${col}`;
                    const isBooked = bookedSeats.includes(seatId);
                    const isSelected = selectedSeats.includes(seatId);
                    const isVip = vipRows.includes(row);
                    
                    let seatClass = "w-8 h-8 sm:w-10 sm:h-10 rounded-t-lg rounded-b-sm flex items-center justify-center text-xs font-medium cursor-pointer transition-all duration-300 border-b-4 ";
                    
                    if (isBooked) {
                      seatClass += "bg-white/5 text-gray-600 border-white/5 cursor-not-allowed";
                    } else if (isSelected) {
                      seatClass += "bg-primary text-white border-primary-hover shadow-[0_0_15px_rgba(229,9,20,0.6)] transform scale-110";
                    } else if (isVip) {
                      seatClass += "bg-accent/20 text-accent hover:bg-accent/40 border-accent/40 hover:border-accent";
                    } else {
                      seatClass += "bg-white/10 text-gray-300 hover:bg-white/30 border-white/20 hover:border-white/50";
                    }

                    return (
                      <motion.button
                        whileHover={!isBooked && !isSelected ? { scale: 1.1, y: -2 } : {}}
                        whileTap={!isBooked ? { scale: 0.95 } : {}}
                        key={seatId}
                        onClick={() => toggleSeat(seatId)}
                        className={seatClass}
                        disabled={isBooked}
                        title={`${isVip ? 'VIP' : 'Thường'} - ${getSeatPrice(seatId).toLocaleString()}đ`}
                      >
                        {col}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-t bg-white/10 border-b-2 border-white/20"></div> Ghế Thường
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-t bg-accent/20 border-b-2 border-accent/40 text-accent flex items-center justify-center">V</div> Ghế VIP
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-t bg-primary border-b-2 border-primary-hover shadow-[0_0_8px_rgba(229,9,20,0.5)]"></div> Đang Chọn
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-t bg-white/5 border-b-2 border-white/5"></div> Đã Bán
            </div>
          </div>
        </div>

        {/* Right: Booking Summary */}
        <div className="lg:col-span-1">
          <div className="glass-panel rounded-2xl p-6 sticky top-28 border-t-[4px] border-t-primary">
            <h3 className="text-xl font-bold font-display mb-6">Thông tin đặt vé</h3>
            
            <div className="flex gap-4 mb-6 pb-6 border-b border-white/10">
              <img src={movie?.posterUrl || movie?.image || "/images/poster1.jpg"} alt="Movie" className="w-20 h-28 object-cover rounded-lg shadow-md" />
              <div>
                <h4 className="font-bold text-lg mb-1">{movie?.title || "Vui lòng chọn phim"}</h4>
                <p className="text-sm text-gray-400 mb-2">2D Phụ đề | {movie?.duration || 120} phút</p>
                {movie?.ageRating && <div className="inline-flex text-xs font-medium bg-red-500/20 text-red-400 px-2 py-1 rounded">{movie.ageRating}</div>}
              </div>
            </div>
            
            <div className="space-y-4 mb-6 pb-6 border-b border-white/10 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Rạp</span>
                <span className="font-medium text-right">CinemaHub Quận 1<br/><span className="text-xs text-gray-500">Phòng chiếu IMAX 01</span></span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Suất chiếu</span>
                <span className="font-medium">19:30 - Hôm nay</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Ghế chọn ({selectedSeats.length})</span>
                <span className="font-bold text-primary max-w-[150px] text-right">{selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Chưa chọn ghế'}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-end mb-8">
              <span className="text-gray-400">Tổng cộng</span>
              <span className="text-3xl font-bold font-display text-white">{totalPrice.toLocaleString()} đ</span>
            </div>
            
            <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-3 mb-6 flex gap-3 items-start">
               <Info className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
               <p className="text-xs text-gray-300">Ghế của bạn sẽ được giữ trong vòng <span className="text-secondary font-bold">10:00</span> phút. Vui lòng hoàn tất thanh toán.</p>
            </div>
            
            <button 
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300 ${
                selectedSeats.length > 0 
                  ? 'bg-primary hover:bg-primary-hover text-white shadow-[0_0_20px_rgba(229,9,20,0.4)]' 
                  : 'bg-white/5 text-gray-500 cursor-not-allowed'
              }`}
              disabled={selectedSeats.length === 0}
            >
              <CreditCard className="w-6 h-6" /> Thanh Toán Ngay
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Booking;
