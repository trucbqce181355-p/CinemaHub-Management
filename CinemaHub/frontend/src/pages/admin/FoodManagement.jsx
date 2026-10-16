import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle, XCircle, Coffee, Package, Settings } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api/food-beverage'; // Đổi thành cổng Backend của bạn (5000 hoặc 8080)

export default function FoodManagement() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isComboMode, setIsComboMode] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'POPCORN',
    basePrice: '',
    imageUrl: '',
    size: 'L',
    flavor: 'Sweet',
    comboItems: []
  });

  // 17. Load danh sách món (View List)
  const fetchFoods = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_BASE_URL);
      const data = await res.json();
      setFoods(data);
    } catch (err) {
      console.error('Lỗi lấy dữ liệu F&B:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFoods();
  }, []);

  // Xử lý Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      description: formData.description,
      category: isComboMode ? 'COMBO' : formData.category,
      basePrice: Number(formData.basePrice),
      imageUrl: formData.imageUrl,
      attributes: {
        size: formData.size,
        flavor: formData.flavor
      },
      comboItems: isComboMode ? formData.comboItems : []
    };

    try {
      let url = API_BASE_URL;
      let method = 'POST';

      if (editingId) {
        url = `${API_BASE_URL}/${editingId}`;
        method = 'PUT';
      } else if (isComboMode) {
        url = `${API_BASE_URL}/combo`;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchFoods();
      }
    } catch (err) {
      console.error('Lỗi lưu món:', err);
    }
  };

  // 19. Disable / Xóa mềm
  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await fetch(`${API_BASE_URL}/${id}/status?active=${!currentStatus}`, {
        method: 'PATCH'
      });
      fetchFoods();
    } catch (err) {
      console.error('Lỗi toggle status:', err);
    }
  };

  // 18. Mở form chỉnh sửa
  const handleEdit = (item) => {
    setEditingId(item.id);
    setIsComboMode(item.isCombo || item.category === 'COMBO');
    setFormData({
      name: item.name,
      description: item.description || '',
      category: item.category,
      basePrice: item.basePrice,
      imageUrl: item.imageUrl || '',
      size: item.attributes?.size || 'L',
      flavor: item.attributes?.flavor || '',
      comboItems: item.comboItems || []
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setIsComboMode(false);
    setFormData({
      name: '',
      description: '',
      category: 'POPCORN',
      basePrice: '',
      imageUrl: '',
      size: 'L',
      flavor: 'Sweet',
      comboItems: []
    });
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-8">
      {/* Header & Nút thêm món */}
      <div className="flex justify-between items-center mb-8 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-red-500">Quản Lý Bắp Nước & Combo (F&B)</h1>
          <p className="text-neutral-400 mt-1">Quản trị danh mục món lẻ, thuộc tính và combo khuyến mãi</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { resetForm(); setIsComboMode(false); setShowModal(true); }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium"
          >
            <Plus size={18} /> Thêm Món Lẻ
          </button>
          <button
            onClick={() => { resetForm(); setIsComboMode(true); setShowModal(true); }}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg font-medium"
          >
            <Package size={18} /> Tạo Combo
          </button>
        </div>
      </div>

      {/* 17. Danh sách hiển thị dạng Thẻ (Grid Cards) */}
      {loading ? (
        <p className="text-center text-neutral-400">Đang tải dữ liệu...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {foods.map((item) => (
            <div key={item.id} className="bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700 flex flex-col justify-between">
              <div>
                <img
                  src={item.imageUrl || 'https://via.placeholder.com/300x200?text=Food+Image'}
                  alt={item.name}
                  className="w-full h-44 object-cover"
                />
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg">{item.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded font-semibold ${item.isCombo ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                      {item.category}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-400 mt-1 line-clamp-2">{item.description}</p>
                  
                  {/* 20. Hiển thị thuộc tính cấu hình */}
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {item.attributes?.size && (
                      <span className="text-xs bg-neutral-700 px-2 py-0.5 rounded text-neutral-300">Size: {item.attributes.size}</span>
                    )}
                    {item.attributes?.flavor && (
                      <span className="text-xs bg-neutral-700 px-2 py-0.5 rounded text-neutral-300">Vị: {item.attributes.flavor}</span>
                    )}
                  </div>

                  <div className="mt-4 text-xl font-extrabold text-red-400">
                    {item.basePrice?.toLocaleString()} đ
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-4 pt-0 border-t border-neutral-700/50 flex justify-between items-center mt-3">
                <span className={`text-xs flex items-center gap-1 ${item.active ? 'text-green-400' : 'text-neutral-500'}`}>
                  {item.active ? <CheckCircle size={14} /> : <XCircle size={14} />} {item.active ? 'Đang bán' : 'Tạm ngưng'}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(item)} className="p-2 hover:bg-neutral-700 rounded text-neutral-300">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleToggleStatus(item.id, item.active)} className="p-2 hover:bg-neutral-700 rounded text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Popup Thêm / Sửa / Tạo Combo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-800 rounded-2xl w-full max-w-md p-6 border border-neutral-700">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Chỉnh Sửa Món' : isComboMode ? 'Tạo Gói Combo Mới' : 'Thêm Món Lẻ Mới'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-neutral-400 block mb-1">Tên món</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-neutral-400 block mb-1">Danh mục</label>
                  <select
                    disabled={isComboMode}
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="POPCORN">Bắp rang (POPCORN)</option>
                    <option value="DRINK">Nước ngọt (DRINK)</option>
                    <option value="SNACK">Đồ ăn vặt (SNACK)</option>
                    {isComboMode && <option value="COMBO">COMBO</option>}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-neutral-400 block mb-1">Giá bán (VNĐ)</label>
                  <input
                    type="number"
                    required
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* Cấu hình thuộc tính */}
              {!isComboMode && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-neutral-400 block mb-1">Kích cỡ (Size)</label>
                    <select
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="S">Size S</option>
                      <option value="M">Size M</option>
                      <option value="L">Size L</option>
                      <option value="XL">Size XL</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-neutral-400 block mb-1">Hương vị (Vị)</label>
                    <input
                      type="text"
                      placeholder="Phô mai / Ngọt / Caramel"
                      value={formData.flavor}
                      onChange={(e) => setFormData({ ...formData, flavor: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm text-neutral-400 block mb-1">Đường dẫn hình ảnh (URL)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-sm text-neutral-400 block mb-1">Mô tả</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 font-semibold"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}