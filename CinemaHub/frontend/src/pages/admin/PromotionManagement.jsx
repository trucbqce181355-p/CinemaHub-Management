import { useState, useEffect } from 'react';
import { Tag, Plus, Edit, Trash2 } from 'lucide-react';

const PromotionManagement = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      const userStr = localStorage.getItem('user');
      const token = userStr ? JSON.parse(userStr).token : '';

      const res = await fetch('http://localhost:5000/api/promotions/active', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setPromotions(data);
      } else {
        console.error('Failed to fetch promotions');
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-display font-bold text-white">Quản lý Khuyến Mãi</h1>
        <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all">
          <Plus className="w-5 h-5" /> Thêm Mã Khuyến Mãi
        </button>
      </div>

      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden bg-surface">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Đang tải dữ liệu...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-sm">
                <th className="p-4 font-medium">Mã Khuyến Mãi</th>
                <th className="p-4 font-medium">Tiêu Đề</th>
                <th className="p-4 font-medium">Giảm Giá</th>
                <th className="p-4 font-medium">Thời Hạn</th>
                <th className="p-4 font-medium text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {promotions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-400">Không có mã khuyến mãi nào đang hoạt động.</td>
                </tr>
              ) : (
                promotions.map((promo) => (
                  <tr key={promo.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/20 text-primary border border-primary/20 font-mono text-sm font-bold">
                        <Tag className="w-3.5 h-3.5" /> {promo.code}
                      </span>
                    </td>
                    <td className="p-4 text-gray-200">{promo.title}</td>
                    <td className="p-4 text-green-400 font-medium">
                      {promo.discountValue.toLocaleString()} {promo.discountType === 'FIXED_AMOUNT' ? 'VNĐ' : '%'}
                    </td>
                    <td className="p-4 text-sm text-gray-400">
                      Từ: {new Date(promo.startDate).toLocaleDateString()}<br/>
                      Đến: {new Date(promo.endDate).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors" title="Sửa">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="Xóa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PromotionManagement;
