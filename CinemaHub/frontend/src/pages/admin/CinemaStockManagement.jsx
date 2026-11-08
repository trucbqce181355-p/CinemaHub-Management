import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Save, AlertTriangle, CheckCircle, RefreshCw, ArrowLeft, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

export default function CinemaStockManagement() {
  const { user } = useAuth();
  const [cinemas, setCinemas] = useState([]);
  const [selectedCinema, setSelectedCinema] = useState('');
  const [foods, setFoods] = useState([]);
  const [inventoryMap, setInventoryMap] = useState({});
  const [stockMap, setStockMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Load danh sách rạp và danh sách F&B
  useEffect(() => {
    fetch(`${API_BASE_URL}/cinemas`)
      .then(res => res.json())
      .then(data => {
        setCinemas(data || []);
        if (data && data.length > 0) setSelectedCinema(data[0].id || data[0]._id);
      })
      .catch(err => console.error('Lỗi tải rạp:', err));

    fetch(`${API_BASE_URL}/food-beverage`)
      .then(res => res.json())
      .then(data => setFoods((data || []).filter(item => item.active !== false)))
      .catch(err => console.error('Lỗi tải F&B:', err));
  }, []);

  // Load kho khi chọn rạp
  const fetchStock = () => {
    if (!selectedCinema) return;
    setLoading(true);
    fetch(`${API_BASE_URL}/inventory/cinema/${selectedCinema}`, {
      headers: user?.token ? { Authorization: `Bearer ${user.token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        const invMap = {};
        const stMap = {};
        (data || []).forEach(item => {
          if (item.foodItemId) {
            invMap[item.foodItemId] = item;
            stMap[item.foodItemId] = item.stockQuantity ?? 0;
          }
        });
        setInventoryMap(invMap);
        setStockMap(stMap);
      })
      .catch(err => {
        console.error('Lỗi tải kho:', err);
        showToast('error', 'Không thể tải dữ liệu tồn kho của rạp');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStock();
  }, [selectedCinema]);

  const handleStockChange = (foodId, value) => {
    setStockMap(prev => ({
      ...prev,
      [foodId]: Math.max(0, parseInt(value, 10) || 0)
    }));
  };

  const handleSaveStock = async (foodId) => {
    const newStock = stockMap[foodId] ?? 0;
    setSavingId(foodId);
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/stock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {})
        },
        body: JSON.stringify({
          cinemaId: selectedCinema,
          foodItemId: foodId,
          newStock: newStock
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast('success', 'Đã cập nhật số lượng tồn kho thành công!');
        fetchStock();
      } else {
        showToast('error', data.message || data.error || 'Cập nhật kho thất bại!');
      }
    } catch (err) {
      showToast('error', 'Lỗi kết nối khi cập nhật kho!');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast popup */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-semibold flex items-center gap-2 animate-fade-in ${
          toast.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
            : 'bg-red-950/90 border-red-500/40 text-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/food"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition"
              title="Quay lại Quản lý F&B"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white flex items-center gap-2.5">
              <Package className="w-7 h-7 text-amber-500" />
              Tồn Kho Bắp Nước Theo Rạp
            </h1>
          </div>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Quản lý số lượng nhập kho từng cụm rạp. Hệ thống tự động tắt món và combo khi hết hàng.
          </p>
        </div>

        {/* Dropdown chọn rạp */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs sm:text-sm text-gray-400 shrink-0 flex items-center gap-1.5 font-medium">
            <Building2 className="w-4 h-4 text-amber-500" />
            Cụm rạp:
          </label>
          <select
            value={selectedCinema}
            onChange={(e) => setSelectedCinema(e.target.value)}
            className="flex-1 sm:w-64 bg-[#141414] border border-white/15 px-3.5 py-2 rounded-xl text-white text-sm font-medium outline-none focus:border-amber-500 transition"
          >
            {cinemas.map(c => (
              <option key={c.id || c._id} value={c.id || c._id} className="bg-[#1a1a1a] text-white">
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-2">
          <RefreshCw className="w-7 h-7 animate-spin text-amber-500" />
          <p className="text-sm">Đang tải dữ liệu tồn kho...</p>
        </div>
      ) : (
        <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider border-b border-white/10">
                  <th className="p-4">Hình ảnh & Tên món</th>
                  <th className="p-4">Phân loại</th>
                  <th className="p-4">Trạng thái tại rạp</th>
                  <th className="p-4 text-center">Số lượng tồn</th>
                  <th className="p-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {foods.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400 text-sm">
                      Không có món F&B nào đang hoạt động.
                    </td>
                  </tr>
                ) : (
                  foods.map(item => {
                    const itemId = item.id || item._id?.$oid || item._id;
                    const inv = inventoryMap[itemId];
                    const currentStock = stockMap[itemId] ?? 0;
                    const isAvailable = inv?.isAvailable !== false && currentStock > 0;
                    const isSaving = savingId === itemId;

                    return (
                      <tr key={itemId} className="hover:bg-white/[0.02] transition">
                        <td className="p-4 flex items-center gap-3">
                          <img
                            src={item.imageUrl || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500'}
                            alt={item.name}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500';
                            }}
                            className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-white">{item.name}</div>
                            <div className="text-xs text-primary font-semibold mt-0.5">
                              {item.basePrice?.toLocaleString()} đ
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`text-[11px] px-2.5 py-1 rounded-md font-bold tracking-wide ${
                            item.isCombo || item.category === 'COMBO'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-white/10 text-gray-300'
                          }`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="p-4">
                          {isAvailable ? (
                            <span className="text-xs inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-semibold">
                              <CheckCircle className="w-3.5 h-3.5" /> Còn hàng (Đang mở bán)
                            </span>
                          ) : (
                            <span className="text-xs inline-flex items-center gap-1.5 text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {currentStock <= 0 ? 'Hết hàng (Tự động tắt)' : 'Tạm tắt (Thiếu món con)'}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <input
                            type="number"
                            min="0"
                            max="9999"
                            value={currentStock}
                            onChange={(e) => handleStockChange(itemId, e.target.value)}
                            className="w-24 bg-[#0d0d0d] border border-white/20 rounded-xl px-3 py-1.5 text-center text-white font-bold outline-none focus:border-amber-500 transition"
                          />
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleSaveStock(itemId)}
                            disabled={isSaving}
                            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-extrabold px-3.5 py-1.5 rounded-xl text-xs inline-flex items-center gap-1.5 transition ml-auto shadow-md"
                          >
                            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            <span>Lưu kho</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
