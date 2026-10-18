import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle, XCircle, Coffee, Package, Minus, PlusCircle } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api/food-beverage'; 

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

  // Load danh sách món (View List)
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

  // Danh sách các món lẻ dùng để ghép combo (loại trừ các món COMBO)
  const availableSingleItems = foods.filter(
    (item) => !item.isCombo && item.category !== 'COMBO'
  );

  // Xử lý thêm món vào combo
  const handleAddComboItem = (selectedId) => {
    if (!selectedId) return;
    const targetItem = foods.find((f) => (f.id || f._id?.$oid || f._id) === selectedId);
    if (!targetItem) return;

    const itemId = targetItem.id || targetItem._id?.$oid || targetItem._id;
    const exists = formData.comboItems.find((ci) => ci.foodItemId === itemId);

    if (exists) {
      setFormData({
        ...formData,
        comboItems: formData.comboItems.map((ci) =>
          ci.foodItemId === itemId ? { ...ci, quantity: ci.quantity + 1 } : ci
        )
      });
    } else {
      setFormData({
        ...formData,
        comboItems: [
          ...formData.comboItems,
          {
            foodItemId: itemId,
            itemName: targetItem.name,
            quantity: 1
          }
        ]
      });
    }
  };

  // Cập nhật số lượng món trong combo
  const handleUpdateQuantity = (foodItemId, delta) => {
    setFormData({
      ...formData,
      comboItems: formData.comboItems
        .map((ci) => {
          if (ci.foodItemId === foodItemId) {
            const newQty = ci.quantity + delta;
            return newQty > 0 ? { ...ci, quantity: newQty } : null;
          }
          return ci;
        })
        .filter(Boolean)
    });
  };

  // Xử lý Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isComboMode && (!formData.comboItems || formData.comboItems.length === 0)) {
      alert('Vui lòng chọn ít nhất 1 món thành phần cho combo!');
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description,
      category: isComboMode ? 'COMBO' : formData.category,
      basePrice: Number(formData.basePrice),
      imageUrl: formData.imageUrl,
      isCombo: isComboMode,
      attributes: isComboMode
        ? {}
        : {
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
      } else {
        alert('Có lỗi xảy ra khi lưu dữ liệu!');
      }
    } catch (err) {
      console.error('Lỗi lưu món:', err);
    }
  };

  // Disable / Xóa mềm
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

  // Mở form chỉnh sửa
  const handleEdit = (item) => {
    const itemId = item.id || item._id?.$oid || item._id;
    setEditingId(itemId);
    const isCombo = item.isCombo || item.category === 'COMBO';
    setIsComboMode(isCombo);
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
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition"
          >
            <Plus size={18} /> Thêm Món Lẻ
          </button>
          <button
            onClick={() => { resetForm(); setIsComboMode(true); setShowModal(true); }}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg font-medium transition"
          >
            <Package size={18} /> Tạo Combo
          </button>
        </div>
      </div>

      {/* Danh sách hiển thị dạng Thẻ (Grid Cards) */}
      {loading ? (
        <p className="text-center text-neutral-400">Đang tải dữ liệu...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {foods.map((item) => {
            const itemId = item.id || item._id?.$oid || item._id;
            const isCombo = item.isCombo || item.category === 'COMBO';

            return (
              <div key={itemId} className="bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700 flex flex-col justify-between shadow-lg">
                <div>
                  <img
                    src={item.imageUrl || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=500&q=80'}
                    alt={item.name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=500&q=80';
                    }}
                    className="w-full h-44 object-cover"
                  />
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg leading-snug">{item.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded font-semibold ${isCombo ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                        {item.category}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-400 mt-1 line-clamp-2">{item.description}</p>
                    
                    {/* Cấu hình thuộc tính cho món lẻ */}
                    {!isCombo && (
                      <div className="mt-3 flex gap-2 flex-wrap">
                        {item.attributes?.size && (
                          <span className="text-xs bg-neutral-700 px-2 py-0.5 rounded text-neutral-300">Size: {item.attributes.size}</span>
                        )}
                        {item.attributes?.flavor && (
                          <span className="text-xs bg-neutral-700 px-2 py-0.5 rounded text-neutral-300">Vị: {item.attributes.flavor}</span>
                        )}
                      </div>
                    )}

                    {/* Danh sách món kèm theo nếu là Combo */}
                    {isCombo && item.comboItems && item.comboItems.length > 0 && (
                      <div className="mt-3 bg-neutral-900/60 p-2 rounded text-xs space-y-1 border border-neutral-700/50">
                        <span className="text-amber-400 font-semibold block">Gồm có:</span>
                        {item.comboItems.map((ci, idx) => (
                          <div key={idx} className="text-neutral-300 flex justify-between">
                            <span>• {ci.itemName}</span>
                            <span className="font-medium text-amber-200">x{ci.quantity}</span>
                          </div>
                        ))}
                      </div>
                    )}

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
                    <button onClick={() => handleToggleStatus(itemId, item.active)} className="p-2 hover:bg-neutral-700 rounded text-red-400">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Popup Thêm / Sửa / Tạo Combo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-neutral-800 rounded-2xl w-full max-w-lg p-6 border border-neutral-700 my-8">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Chỉnh Sửa Món' : isComboMode ? 'Tạo Gói Combo Mới' : 'Thêm Món Lẻ Mới'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-neutral-400 block mb-1">Tên {isComboMode ? 'Combo' : 'món'}</label>
                <input
                  type="text"
                  required
                  placeholder={isComboMode ? 'Ví dụ: Combo Phim Hot 2 người' : 'Ví dụ: Bắp Rang Bơ (Ngọt)'}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-neutral-400 block mb-1">Danh mục</label>
                  <select
                    disabled={isComboMode}
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
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
                    min="0"
                    placeholder="50000"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Cấu hình thuộc tính cho món lẻ */}
              {!isComboMode && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-neutral-400 block mb-1">Kích cỡ (Size)</label>
                    <select
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
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
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              )}

              {/* Phần chọn thành phần Combo (Create / Edit Combo) */}
              {isComboMode && (
                <div className="bg-neutral-900/80 p-4 rounded-xl border border-neutral-700 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-amber-400">Chọn món kèm theo trong Combo:</label>
                  </div>

                  {/* Dropdown thêm món */}
                  <div className="flex gap-2">
                    <select
                      id="selectComboItem"
                      defaultValue=""
                      className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
                    >
                      <option value="" disabled>-- Chọn món lẻ để thêm vào combo --</option>
                      {availableSingleItems.map((item) => {
                        const id = item.id || item._id?.$oid || item._id;
                        return (
                          <option key={id} value={id}>
                            {item.name} ({item.basePrice?.toLocaleString()} đ)
                          </option>
                        );
                      })}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const selectEl = document.getElementById('selectComboItem');
                        handleAddComboItem(selectEl.value);
                        selectEl.value = '';
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1"
                    >
                      <PlusCircle size={16} /> Thêm
                    </button>
                  </div>

                  {/* Danh sách các món đã chọn trong combo */}
                  <div className="space-y-2 max-h-40 overflow-y-auto pt-1">
                    {formData.comboItems.length === 0 ? (
                      <p className="text-xs text-neutral-500 italic">Chưa chọn món nào cho combo này.</p>
                    ) : (
                      formData.comboItems.map((ci) => (
                        <div
                          key={ci.foodItemId}
                          className="flex items-center justify-between bg-neutral-800 px-3 py-2 rounded-lg border border-neutral-700/60"
                        >
                          <span className="text-sm text-neutral-200">{ci.itemName}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(ci.foodItemId, -1)}
                              className="p-1 hover:bg-neutral-700 rounded text-neutral-400"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="text-sm font-semibold w-5 text-center">{ci.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(ci.foodItemId, 1)}
                              className="p-1 hover:bg-neutral-700 rounded text-amber-400"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm text-neutral-400 block mb-1">Đường dẫn hình ảnh (URL)</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-sm text-neutral-400 block mb-1">Mô tả</label>
                <textarea
                  rows="2"
                  placeholder={isComboMode ? 'Tiết kiệm 20%: Bao gồm 1 bắp lớn + 2 nước ngọt lớn' : 'Mô tả hương vị, nguyên liệu...'}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white outline-none focus:border-red-500"
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