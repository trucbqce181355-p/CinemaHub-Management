import React, { useState, useEffect } from 'react';
import { X, RefreshCcw, Save, Trash2 } from 'lucide-react';

const SeatManagementModal = ({ room, onClose }) => {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genConfig, setGenConfig] = useState({ rows: 6, cols: 10 });
  const [saveMessage, setSaveMessage] = useState(null);

  const getAuthHeaders = () => {
    const userStr = localStorage.getItem('user');
    const token = userStr ? JSON.parse(userStr).token : '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchSeats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/seats/${room.id}`, { headers: getAuthHeaders() });
      if (res.ok) {
        setSeats(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSeats();
  }, [room.id]);

  const handleGenerateClick = () => {
    setShowGenModal(true);
  };

  const doGenerate = async () => {
    setShowGenModal(false);
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/seats/${room.id}/generate?rows=${genConfig.rows}&cols=${genConfig.cols}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) setSeats(await res.json());
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/seats/${room.id}/save`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(seats)
      });
      if (res.ok) {
        setSaveMessage({ text: "Lưu sơ đồ ghế thành công!", type: 'success' });
        setSeats(await res.json());
      } else {
        setSaveMessage({ text: "Lưu thất bại. Vui lòng thử lại.", type: 'error' });
      }
    } catch (err) { 
      console.error(err); 
      setSaveMessage({ text: "Lỗi kết nối máy chủ", type: 'error' });
    }
    setLoading(false);
    setTimeout(() => setSaveMessage(null), 2500);
  };

  const handleSeatClick = (seatId) => {
    setSeats(seats.map(s => {
      if (s.id !== seatId && s.seatNumber !== seatId) return s;

      // Cycle through Types and Status
      // Logic: STANDARD(Active) -> VIP(Active) -> COUPLE(Active) -> DISABLED
      let newType = s.seatType;
      let newStatus = s.status;

      if (s.status !== 'ACTIVE') {
        newStatus = 'ACTIVE';
        newType = 'STANDARD';
      } else if (s.seatType === 'STANDARD') {
        newType = 'VIP';
      } else if (s.seatType === 'VIP') {
        newType = 'COUPLE';
      } else {
        newStatus = 'DISABLED';
      }

      return { ...s, seatType: newType, status: newStatus };
    }));
  };

  const getSeatColor = (s) => {
    if (s.status !== 'ACTIVE') return 'bg-gray-800 text-gray-500 opacity-30 border-gray-700 line-through';
    if (s.seatType === 'VIP') return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
    if (s.seatType === 'COUPLE') return 'bg-pink-500/20 text-pink-400 border-pink-500/50 rounded-full w-14';
    return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
  };

  // Group seats by row for display
  const rows = [...new Set(seats.map(s => s.row))].sort();

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-4xl border border-white/10 relative max-h-[90vh] overflow-hidden flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold font-display text-white">
            Sơ đồ ghế: <span className="text-primary">{room.name}</span>
          </h2>
          <div className="flex gap-2">
            <button onClick={handleGenerateClick} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-2 transition-colors">
              <RefreshCcw className="w-4 h-4" /> Tạo Mẫu
            </button>
            <button onClick={handleSave} className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-2 transition-colors font-bold shadow-lg shadow-primary/20">
              <Save className="w-4 h-4" /> Lưu Lại
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6 mb-6 justify-center p-4 bg-black/50 rounded-xl border border-white/5">
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-500/20 border border-blue-500/50 rounded"></div><span className="text-sm text-gray-400">Thường</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-orange-500/20 border border-orange-500/50 rounded"></div><span className="text-sm text-gray-400">VIP</span></div>
          <div className="flex items-center gap-2"><div className="w-6 h-4 bg-pink-500/20 border border-pink-500/50 rounded-full"></div><span className="text-sm text-gray-400">Couple</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-800 border border-gray-700 rounded opacity-50"></div><span className="text-sm text-gray-400">Bảo trì/Ẩn</span></div>
          <span className="text-xs text-gray-500 ml-4 italic">(Click vào ghế để đổi loại)</span>
        </div>

        <div className="flex-1 overflow-auto bg-black/30 rounded-xl p-8 border border-white/5 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400 animate-pulse">Đang tải sơ đồ...</div>
          ) : seats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
              <p>Phòng này chưa có sơ đồ ghế.</p>
              <button onClick={handleGenerateClick} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">Tạo Sơ Đồ Mặc Định</button>
            </div>
          ) : (
            <div className="min-w-max mx-auto space-y-4">
              <div className="w-full text-center py-2 bg-white/10 text-gray-400 rounded-lg mb-12 uppercase tracking-[1em] text-sm">Màn hình</div>

              {rows.map(row => (
                <div key={row} className="flex justify-center items-center gap-4">
                  <div className="w-8 text-center font-bold text-gray-500">{row}</div>
                  <div className="flex gap-2">
                    {seats.filter(s => s.row === row).sort((a, b) => a.col - b.col).map(s => (
                      <button
                        key={s.id || s.seatNumber}
                        onClick={() => handleSeatClick(s.id || s.seatNumber)}
                        className={`w-10 h-10 flex items-center justify-center text-xs font-bold border rounded transition-all duration-300 hover:scale-110 ${getSeatColor(s)}`}
                        title={`Ghế ${s.seatNumber} - ${s.seatType} - ${s.status}`}
                      >
                        {s.seatNumber}
                      </button>
                    ))}
                  </div>
                  <div className="w-8 text-center font-bold text-gray-500">{row}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Generate Modal */}
        {showGenModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#121212] border border-primary/30 p-8 rounded-2xl w-full max-w-md shadow-[0_0_40px_rgba(255,255,255,0.05)] transform transition-all scale-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold font-display text-white">Cấu Hình Tạo Mẫu Sơ Đồ</h3>
                <button onClick={() => setShowGenModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="flex justify-between text-sm font-medium text-gray-300">
                    <span>Số Hàng (Rows)</span>
                    <span className="text-primary font-bold">{genConfig.rows}</span>
                  </label>
                  <input type="range" min="4" max="15" value={genConfig.rows} onChange={e => setGenConfig({ ...genConfig, rows: parseInt(e.target.value) })} className="w-full accent-primary" />
                  <div className="flex justify-between text-xs text-gray-500"><span>4</span><span>15</span></div>
                </div>

                <div className="space-y-2">
                  <label className="flex justify-between text-sm font-medium text-gray-300">
                    <span>Số Ghế Mỗi Hàng (Cols)</span>
                    <span className="text-primary font-bold">{genConfig.cols}</span>
                  </label>
                  <input type="range" min="6" max="20" value={genConfig.cols} onChange={e => setGenConfig({ ...genConfig, cols: parseInt(e.target.value) })} className="w-full accent-primary" />
                  <div className="flex justify-between text-xs text-gray-500"><span>6</span><span>20</span></div>
                </div>



                <button onClick={doGenerate} className="w-full py-3 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-bold rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-95">
                  Xác Nhận Tạo Sơ Đồ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SAVE SUCCESS/ERROR POPUP */}
      {saveMessage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSaveMessage(null)} />
          <div className="bg-[#181818] border border-white/10 rounded-2xl p-6 w-full max-w-sm relative z-10 shadow-2xl flex flex-col items-center text-center transform scale-100 animate-in fade-in zoom-in duration-200">
            {saveMessage.type === 'success' ? (
              <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-4">
                <X className="w-8 h-8" />
              </div>
            )}
            <h3 className="text-xl font-bold text-white mb-2">
              {saveMessage.type === 'success' ? 'Thành công' : 'Thất bại'}
            </h3>
            <p className="text-gray-300 text-sm mb-6">
              {saveMessage.text}
            </p>
            <button
              onClick={() => setSaveMessage(null)}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatManagementModal;
