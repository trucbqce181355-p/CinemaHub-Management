import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCcw, Save, LayoutGrid } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];

const resolveDefaultSeatType = (rowIndex, totalRows) => {
  if (rowIndex >= totalRows - 2) return 'COUPLE';
  const remainingRows = Math.max(0, totalRows - 2);
  const standardRows = Math.floor(remainingRows / 2);
  return rowIndex < standardRows ? 'STANDARD' : 'VIP';
};

const buildDefaultSeats = (roomId, rowsCount, colsCount) => {
  const totalRows = Math.min(Math.max(rowsCount, 0), ROW_LABELS.length);
  const generated = [];
  for (let r = 0; r < totalRows; r++) {
    const row = ROW_LABELS[r];
    const seatType = resolveDefaultSeatType(r, totalRows);
    for (let col = 1; col <= colsCount; col++) {
      generated.push({
        roomId,
        row,
        col,
        seatNumber: `${row}${col}`,
        seatType,
        status: 'ACTIVE'
      });
    }
  }
  return generated;
};

const upgradeLegacyDefaultSeats = (loadedSeats) => {
  if (!Array.isArray(loadedSeats) || loadedSeats.length === 0) return null;
  const sortedRows = [...new Set(loadedSeats.map(s => s.row).filter(Boolean))].sort();
  if (sortedRows.length < 2) return null;

  let hasDifference = false;
  for (const s of loadedSeats) {
    if (s.status !== 'ACTIVE') return null;
    const legacyType = (s.row === 'F' || s.row === 'G')
      ? 'COUPLE'
      : (s.row === 'C' || s.row === 'D' || s.row === 'E')
        ? 'VIP'
        : 'STANDARD';
    if (s.seatType !== legacyType) return null;
    const expectedType = resolveDefaultSeatType(sortedRows.indexOf(s.row), sortedRows.length);
    if (expectedType !== s.seatType) hasDifference = true;
  }

  if (!hasDifference) return null;
  return loadedSeats.map(({ id: _id, ...rest }) => ({
    ...rest,
    seatType: resolveDefaultSeatType(sortedRows.indexOf(rest.row), sortedRows.length)
  }));
};

const SeatManagementModal = ({ room, onClose }) => {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genConfig, setGenConfig] = useState({ rows: 6, cols: 10 });
  const [saveMessage, setSaveMessage] = useState(null);
  const mapViewportRef = useRef(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const viewport = mapViewportRef.current;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setMapSize({ width, height });
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

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
      const res = await fetch(`${API_BASE}/seats/${room.id}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const loaded = await res.json();
        const upgraded = upgradeLegacyDefaultSeats(loaded);
        if (upgraded) {
          setSeats(upgraded);
          const saveRes = await fetch(`${API_BASE}/seats/${room.id}/save`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(upgraded)
          });
          if (saveRes.ok) {
            setSeats(await saveRes.json());
          }
        } else {
          setSeats(loaded);
        }
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
    if (seats.length > 0) {
      const currentRows = new Set(seats.map(s => s.row)).size;
      const currentCols = new Set(seats.map(s => s.col)).size;
      setGenConfig({
        rows: Math.min(15, Math.max(4, currentRows || 6)),
        cols: Math.min(20, Math.max(6, currentCols || 10))
      });
    }
    setShowGenModal(true);
  };

  const doGenerate = async () => {
    setShowGenModal(false);
    setLoading(true);
    try {
      const defaultSeats = buildDefaultSeats(room.id, genConfig.rows, genConfig.cols);
      const res = await fetch(`${API_BASE}/seats/${room.id}/save`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(defaultSeats)
      });
      if (res.ok) {
        setSeats(await res.json());
      } else {
        setSeats(defaultSeats);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/seats/${room.id}/save`, {
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
    if (s.seatType === 'COUPLE') return 'bg-pink-500/20 text-pink-400 border-pink-500/50 rounded-full';
    return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
  };

  const totalGenRows = Math.min(Math.max(genConfig.rows, 0), ROW_LABELS.length);
  const coupleRowCount = Math.min(2, totalGenRows);
  const remainingRowCount = Math.max(0, totalGenRows - coupleRowCount);
  const standardRowCount = Math.floor(remainingRowCount / 2);
  const vipRowCount = remainingRowCount - standardRowCount;
  const formatRowRange = (start, count) => {
    if (count <= 0) return '0 hàng';
    const first = ROW_LABELS[start];
    const last = ROW_LABELS[start + count - 1];
    return count === 1 ? `1 hàng (${first})` : `${count} hàng (${first}–${last})`;
  };

  // Group seats by row for display
  const rows = [...new Set(seats.map(s => s.row))].sort();
  const seatRows = rows.map(row => ({ row, seats: seats.filter(s => s.row === row).sort((a, b) => a.col - b.col) }));
  const columns = [...new Set(seats.map(seat => seat.col))].sort((a, b) => a - b);
  const seatGridWidth = columns.length * 32 + Math.max(0, columns.length - 1) * 6;
  // All seat types share a column footprint so changing a type cannot stretch the map.
  const mapWidth = Math.max(180, seatGridWidth + 60);
  const mapHeight = 48 + rows.length * 32 + Math.max(0, rows.length - 1) * 10;
  const mapScale = Math.min(1, mapSize.width / mapWidth, mapSize.height / mapHeight);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="seat-map-title" className="bg-[#121212] rounded-3xl w-full max-w-2xl border border-white/10 relative max-h-[90vh] overflow-hidden flex flex-col text-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-6 py-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-primary/20 p-3 text-primary"><LayoutGrid className="h-6 w-6" /></div>
            <div className="min-w-0"><h2 id="seat-map-title" className="text-2xl font-bold font-display">Sơ đồ ghế</h2><p className="mt-1 break-words text-sm text-gray-400">{room.name}</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng sơ đồ ghế" className="shrink-0 rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white"><X className="w-6 h-6" /></button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 justify-center p-4 bg-white/[0.03] rounded-2xl border border-white/10">
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-500/20 border border-blue-500/50 rounded"></div><span className="text-sm text-gray-400">Thường</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-orange-500/20 border border-orange-500/50 rounded"></div><span className="text-sm text-gray-400">VIP</span></div>
          <div className="flex items-center gap-2"><div className="w-6 h-4 bg-pink-500/20 border border-pink-500/50 rounded-full"></div><span className="text-sm text-gray-400">Couple</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-800 border border-gray-700 rounded opacity-50"></div><span className="text-sm text-gray-400">Bảo trì/Ẩn</span></div>
          <span className="w-full text-center text-xs text-gray-500 italic">(Click vào ghế để đổi loại)</span>
        </div>

        <div className="relative h-[clamp(180px,40vh,360px)] overflow-hidden bg-white/[0.03] rounded-2xl border border-white/10">
          <div ref={mapViewportRef} className="absolute inset-3 flex items-center justify-center">
          {loading ? (
            <div className="flex items-center justify-center min-h-32 text-gray-400 animate-pulse">Đang tải sơ đồ...</div>
          ) : seats.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-32 text-center text-sm text-gray-500 gap-4">
              <p>Phòng này chưa có sơ đồ ghế.</p>
              <button onClick={handleGenerateClick} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">Tạo Sơ Đồ Mặc Định</button>
            </div>
          ) : (
            <div className="relative shrink-0" style={{ width: mapWidth * mapScale, height: mapHeight * mapScale }}>
            <div className="absolute left-0 top-0 origin-top-left" style={{ width: mapWidth, height: mapHeight, transform: `scale(${mapScale})` }}>
              <div style={{ width: seatGridWidth }} className="h-6 mx-auto flex items-center justify-center bg-white/10 text-gray-400 rounded-lg mb-6 uppercase tracking-[0.5em] text-xs">Màn hình</div>

              <div className="flex flex-col gap-2.5">
              {seatRows.map(({ row, seats: rowSeats }) => (
                <div key={row} className="flex justify-center items-center gap-2.5">
                  <div className="w-5 shrink-0 text-center text-xs font-bold text-gray-500">{row}</div>
                  <div className="grid items-center gap-1.5" style={{ width: seatGridWidth, gridTemplateColumns: `repeat(${columns.length}, 32px)`, gridTemplateRows: '32px' }}>
                    {rowSeats.map(s => (
                      <button
                        type="button"
                        key={s.id || s.seatNumber}
                        onClick={() => handleSeatClick(s.id || s.seatNumber)}
                        style={{ gridColumn: columns.indexOf(s.col) + 1, gridRow: 1, width: 32, height: s.seatType === 'COUPLE' ? 24 : 32 }}
                        className={`shrink-0 flex items-center justify-center text-[10px] font-bold border rounded transition-colors hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white ${getSeatColor(s)}`}
                        title={`Ghế ${s.seatNumber} - ${s.seatType} - ${s.status}`}
                      >
                        {s.seatNumber}
                      </button>
                    ))}
                  </div>
                  <div className="w-5 shrink-0 text-center text-xs font-bold text-gray-500">{row}</div>
                </div>
              ))}
              </div>
            </div>
            </div>
          )}
          </div>
        </div>
        </div>

        <footer className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-white/10 px-6 py-4 sm:px-8">
          <button type="button" onClick={onClose} className="rounded-xl px-5 py-3 text-gray-300 hover:bg-white/10">Đóng</button>
          <button type="button" onClick={handleGenerateClick} disabled={loading} className="flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-gray-200 hover:bg-white/15 disabled:opacity-50"><RefreshCcw className="h-4 w-4" />Tạo mẫu</button>
          <button type="button" onClick={handleSave} disabled={loading || seats.length === 0} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold hover:bg-red-700 disabled:opacity-50"><Save className="h-4 w-4" />Lưu lại</button>
        </footer>

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

                <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-gray-300">
                    <span className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-500/20 border border-blue-500/50 rounded inline-block"></span>Thường</span>
                    <span className="font-semibold text-blue-400">{formatRowRange(0, standardRowCount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-300">
                    <span className="flex items-center gap-2"><span className="w-3 h-3 bg-orange-500/20 border border-orange-500/50 rounded inline-block"></span>VIP</span>
                    <span className="font-semibold text-orange-400">{formatRowRange(standardRowCount, vipRowCount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-300">
                    <span className="flex items-center gap-2"><span className="w-4 h-3 bg-pink-500/20 border border-pink-500/50 rounded-full inline-block"></span>Couple</span>
                    <span className="font-semibold text-pink-400">{formatRowRange(standardRowCount + vipRowCount, coupleRowCount)}</span>
                  </div>
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
