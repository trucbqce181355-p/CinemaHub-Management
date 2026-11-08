import React, { useState, useEffect } from 'react';
import { Package, Save, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api'; // Hoặc port 8080 của bạn

export default function CinemaStockManagement() {
  const [cinemas, setCinemas] = useState([]);
  const [selectedCinema, setSelectedCinema] = useState('');
  const [foods, setFoods] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [loading, setLoading] = useState(false);

  // Load danh sách rạp
  useEffect(() => {
    fetch(`${API_BASE_URL}/cinemas`)
      .then(res => res.json())
      .then(data => {
        setCinemas(data);
        if (data.length > 0) setSelectedCinema(data[0].id || data[0]._id);
      })
      .catch(err => console.error("Lỗi tải rạp:", err));

    fetch(`${API_BASE_URL}/food-beverage`)
      .then(res => res.json())
      .then(data => setFoods(data))
      .catch(err => console.error("Lỗi tải F&B:", err));
  }, []);

  // Load kho khi chọn rạp
  const fetchStock = () => {
    if (!selectedCinema) return;
    setLoading(true);
    fetch(`${API_BASE_URL}/inventory/cinema/${selectedCinema}`)
      .then(res => res.json())
      .then(data => {
        const map = {};
        data.forEach(item => {
          map[item.foodItemId] = item.stockQuantity;
        });
        setStockMap(map);
      })
      .catch(err => console.error("Lỗi tải kho:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStock();
  }, [selectedCinema]);

  const handleStockChange = (foodId, value) => {
    setStockMap(prev => ({
      ...prev,
      [foodId]: Math.max(0, parseInt(value) || 0)
    }));
  };

  const handleSaveStock = async (foodId) => {
    const newStock = stockMap[foodId] || 0;
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cinemaId: selectedCinema,
          foodItemId: foodId,
          newStock: newStock
        })
      });
      if (res.ok) {
        alert("Cập nhật kho thành công!");
        fetchStock();
      }
    } catch (err) {
      alert("Lỗi cập nhật kho!");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-8">
      <div className="flex justify-between items-center mb-8 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-amber-500">Quản Lý Tồn Kho F&B Theo Rạp</h1>
          <p className="text-neutral-400 mt-1">Cập nhật số lượng nhập kho và tự động vô hiệu hóa khi hết hàng</p>
        </div>

        {/* Dropdown chọn rạp */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-neutral-400">Chọn rạp:</label>
          <select
            value={selectedCinema}
            onChange={(e) => setSelectedCinema(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 px-4 py-2 rounded-lg text-white font-medium outline-none focus:border-amber-500"
          >
            {cinemas.map(c => (
              <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-neutral-400">Đang tải dữ liệu tồn kho...</p>
      ) : (
        <div className="bg-neutral-800 border border-neutral-700 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-900/60 text-neutral-400 text-xs uppercase border-b border-neutral-700">
                <th className="p-4">Hình ảnh & Tên món</th>
                <th className="p-4">Phân loại</th>
                <th className="p-4">Trạng thái tồn kho</th>
                <th className="p-4">Số lượng tồn</th>
                <th className="p-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-700/60">
              {foods.map(item => {
                const itemId = item.id || item._id?.$oid || item._id;
                const currentStock = stockMap[itemId] ?? 0;
                const isOutOfStock = currentStock <= 0;

                return (
                  <tr key={itemId} className="hover:bg-neutral-700/30 transition">
                    <td className="p-4 flex items-center gap-3">
                      <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                      <div>
                        <div className="font-semibold">{item.name}</div>
                        <div className="text-xs text-neutral-400">{item.basePrice?.toLocaleString()} đ</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded font-semibold ${item.isCombo ? 'bg-amber-500/20 text-amber-400' : 'bg-neutral-700 text-neutral-300'}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="p-4">
                      {isOutOfStock ? (
                        <span className="text-xs flex items-center gap-1 text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full w-fit">
                          <AlertTriangle size={14} /> Hết hàng (Đã tự động tắt)
                        </span>
                      ) : (
                        <span className="text-xs flex items-center gap-1 text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full w-fit">
                          <CheckCircle size={14} /> Còn hàng
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <input
                        type="number"
                        min="0"
                        value={currentStock}
                        onChange={(e) => handleStockChange(itemId, e.target.value)}
                        className="w-24 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-center text-white outline-none focus:border-amber-500"
                      />
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleSaveStock(itemId)}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ml-auto transition"
                      >
                        <Save size={15} /> Lưu
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}