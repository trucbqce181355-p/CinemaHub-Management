import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tag, Plus, Edit, Trash2, X, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PromotionManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'promotions';
  const setActiveTab = (tab) => setSearchParams({ tab });
  const [promotions, setPromotions] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form states
  const [promoForm, setPromoForm] = useState({
    code: '', title: '', description: '', discountType: 'Percentage', discountValue: '',
    startDate: '', endDate: '', status: 'Active'
  });

  const [pricingForm, setPricingForm] = useState({
    triggerVariable: '', adjustmentValue: '', status: 'Active'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      const token = userStr ? JSON.parse(userStr).token : '';
      const headers = { 'Authorization': `Bearer ${token}` };

      const [promoRes, pricingRes] = await Promise.all([
        fetch('http://localhost:5000/api/promotions', { headers }),
        fetch('http://localhost:5000/api/pricing-rules', { headers })
      ]);

      if (promoRes.ok) setPromotions(await promoRes.json());
      if (pricingRes.ok) setPricingRules(await pricingRes.json());
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // ----- HANDLERS FOR PROMOTIONS -----
  const openPromoModal = (promo = null) => {
    if (promo) {
      setEditingItem(promo.id);
      setPromoForm({
        ...promo,
        startDate: promo.startDate ? promo.startDate.substring(0, 16) : '',
        endDate: promo.endDate ? promo.endDate.substring(0, 16) : ''
      });
    } else {
      setEditingItem(null);
      setPromoForm({ code: '', title: '', description: '', discountType: 'Percentage', discountValue: '', startDate: '', endDate: '', status: 'Active' });
    }
    setShowPromoModal(true);
  };

  const savePromotion = async (e) => {
    e.preventDefault();
    const userStr = localStorage.getItem('user');
    const token = userStr ? JSON.parse(userStr).token : '';
    const url = editingItem ? `http://localhost:5000/api/promotions/${editingItem}` : 'http://localhost:5000/api/promotions';

    try {
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(promoForm)
      });
      if (res.ok) {
        setShowPromoModal(false);
        fetchData();
      } else {
        alert('Lỗi khi lưu Khuyến Mãi');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deletePromotion = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn vô hiệu hóa Khuyến Mãi này? (Sẽ chuyển trạng thái thành Disabled)')) return;
    const userStr = localStorage.getItem('user');
    const token = userStr ? JSON.parse(userStr).token : '';
    await fetch(`http://localhost:5000/api/promotions/${id}`, {
      method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchData();
  };

  // ----- HANDLERS FOR PRICING RULES -----
  const openPricingModal = (rule = null) => {
    if (rule) {
      setEditingItem(rule.id);
      setPricingForm(rule);
    } else {
      setEditingItem(null);
      setPricingForm({ triggerVariable: 'Cuối tuần', adjustmentValue: '', status: 'Active' });
    }
    setShowPricingModal(true);
  };

  const savePricingRule = async (e) => {
    e.preventDefault();
    const userStr = localStorage.getItem('user');
    const token = userStr ? JSON.parse(userStr).token : '';
    const url = editingItem ? `http://localhost:5000/api/pricing-rules/${editingItem}` : 'http://localhost:5000/api/pricing-rules';

    try {
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(pricingForm)
      });
      if (res.ok) {
        setShowPricingModal(false);
        fetchData();
      } else {
        alert('Lỗi khi lưu Giá động');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deletePricingRule = async (id) => {
    if (!window.confirm('Bạn có chắc muốn vô hiệu hóa Luật giá này?')) return;
    const userStr = localStorage.getItem('user');
    const token = userStr ? JSON.parse(userStr).token : '';
    await fetch(`http://localhost:5000/api/pricing-rules/${id}`, {
      method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Quản lý Khuyến Mãi & Giá Động</h1>
          <p className="text-gray-400 mt-1">Điều chỉnh giá linh hoạt và tạo các chiến dịch Marketing</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => activeTab === 'promotions' ? openPromoModal() : openPricingModal()}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-bold shadow-lg shadow-primary/30"
          >
            <Plus className="w-5 h-5" /> {activeTab === 'promotions' ? 'Thêm Khuyến Mãi' : 'Thêm Luật Giá'}
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-max">
        <button
          onClick={() => setActiveTab('promotions')}
          className={`px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${activeTab === 'promotions' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
        >
          <Tag className="w-4 h-4" /> Khuyến Mãi
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${activeTab === 'pricing' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
        >
          <DollarSign className="w-4 h-4" /> Giá Động
        </button>
      </div>

      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden bg-surface shadow-2xl relative min-h-[400px]">
        {loading ? (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : activeTab === 'promotions' ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-sm">
                <th className="p-4 font-medium uppercase tracking-wider">Mã giảm giá</th>
                <th className="p-4 font-medium uppercase tracking-wider">Tiêu đề</th>
                <th className="p-4 font-medium uppercase tracking-wider">Giảm giá</th>
                <th className="p-4 font-medium uppercase tracking-wider">Thời gian</th>
                <th className="p-4 font-medium uppercase tracking-wider text-center">Trạng thái</th>
                <th className="p-4 font-medium uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-200">
              {promotions.map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4 font-bold text-primary">{p.code}</td>
                  <td className="p-4">{p.title}</td>
                  <td className="p-4">{p.discountType === 'Percentage' ? `${p.discountValue}%` : `${p.discountValue.toLocaleString()} VNĐ`}</td>
                  <td className="p-4 text-sm text-gray-400">
                    <div>Từ: {new Date(p.startDate).toLocaleDateString('vi-VN')}</div>
                    <div>Đến: {new Date(p.endDate).toLocaleDateString('vi-VN')}</div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${p.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2 transition-opacity">
                      <button onClick={() => openPromoModal(p)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"><Edit className="w-4 h-4" /></button>
                      {p.status === 'Active' && (
                        <button onClick={() => deletePromotion(p.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {promotions.length === 0 && (
                <tr><td colSpan="6" className="p-8 text-center text-gray-500">Chưa có khuyến mãi nào.</td></tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-sm">
                <th className="p-4 font-medium uppercase tracking-wider">Sự kiện</th>
                <th className="p-4 font-medium uppercase tracking-wider">Mức điều chỉnh giá</th>
                <th className="p-4 font-medium uppercase tracking-wider text-center">Trạng thái</th>
                <th className="p-4 font-medium uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-200">
              {pricingRules.map((r) => (
                <tr key={r.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4 font-bold">{r.triggerVariable}</td>
                  <td className="p-4">
                    <span className={`font-bold ${r.adjustmentValue > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {r.adjustmentValue > 0 ? '+' : ''}{r.adjustmentValue.toLocaleString()} VNĐ
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${r.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2 transition-opacity">
                      <button onClick={() => openPricingModal(r)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"><Edit className="w-4 h-4" /></button>
                      {r.status === 'Active' && (
                        <button onClick={() => deletePricingRule(r.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {pricingRules.length === 0 && (
                <tr><td colSpan="4" className="p-8 text-center text-gray-500">Chưa có luật giá động nào.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* PROMO MODAL */}
      <AnimatePresence>
        {showPromoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPromoModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#141414] border border-white/10 rounded-2xl p-8 w-full max-w-2xl relative z-10 shadow-2xl">
              <button onClick={() => setShowPromoModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
              <h2 className="text-2xl font-bold mb-6 text-white">{editingItem ? 'Sửa Khuyến Mãi' : 'Thêm Khuyến Mãi Mới'}</h2>
              <form onSubmit={savePromotion} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Mã Code *</label>
                    <input type="text" required value={promoForm.code} onChange={e => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none" placeholder="VD: SUMMER20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Tiêu đề *</label>
                    <input type="text" required value={promoForm.title} onChange={e => setPromoForm({ ...promoForm, title: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Mô tả</label>
                  <textarea value={promoForm.description} onChange={e => setPromoForm({ ...promoForm, description: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none" rows="2"></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Loại giảm giá *</label>
                    <select value={promoForm.discountType} onChange={e => setPromoForm({ ...promoForm, discountType: e.target.value })} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none">
                      <option value="Percentage">Theo phần trăm (%)</option>
                      <option value="Fixed">Số tiền cố định (VNĐ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Giá trị *</label>
                    <input type="number" min="0" required value={promoForm.discountValue} onChange={e => setPromoForm({ ...promoForm, discountValue: e.target.value === '' ? '' : Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Từ ngày *</label>
                    <input type="datetime-local" required value={promoForm.startDate} onChange={e => setPromoForm({ ...promoForm, startDate: e.target.value })} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Đến ngày *</label>
                    <input type="datetime-local" required value={promoForm.endDate} onChange={e => setPromoForm({ ...promoForm, endDate: e.target.value })} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none [color-scheme:dark]" />
                  </div>
                </div>

                {editingItem && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Trạng thái</label>
                    <select value={promoForm.status} onChange={e => setPromoForm({ ...promoForm, status: e.target.value })} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none">
                      <option value="Active">Hoạt động (Active)</option>
                      <option value="Disabled">Ngưng hoạt động (Disabled)</option>
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-8">
                  <button type="button" onClick={() => setShowPromoModal(false)} className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">Hủy</button>
                  <button type="submit" className="px-6 py-3 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white transition-colors">Lưu Khuyến Mãi</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* PRICING MODAL */}
        {showPricingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPricingModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#141414] border border-white/10 rounded-2xl p-8 w-full max-w-md relative z-10 shadow-2xl">
              <button onClick={() => setShowPricingModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
              <h2 className="text-2xl font-bold mb-6 text-white">{editingItem ? 'Sửa Luật Giá Động' : 'Thêm Luật Giá'}</h2>
              <form onSubmit={savePricingRule} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Sự kiện *</label>
                  <select value={pricingForm.triggerVariable} onChange={e => setPricingForm({ ...pricingForm, triggerVariable: e.target.value })} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none">
                    <option value="Cuối tuần">Cuối tuần (T7, CN)</option>
                    <option value="Ngày Lễ">Ngày Lễ Tết</option>
                    <option value="Giờ vàng">Giờ vàng (Sau 22h)</option>
                    <option value="Suất chiếu sớm">Suất chiếu sớm (Sneak Show)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Điều chỉnh giá vé *</label>
                  <input type="number" required value={pricingForm.adjustmentValue} onChange={e => setPricingForm({ ...pricingForm, adjustmentValue: e.target.value === '' ? '' : Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none" />
                  <p className="text-xs text-gray-500 mt-2">Dùng số âm để giảm giá, số dương để tăng giá.</p>
                </div>

                {editingItem && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Trạng thái</label>
                    <select value={pricingForm.status} onChange={e => setPricingForm({ ...pricingForm, status: e.target.value })} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none">
                      <option value="Active">Hoạt động (Active)</option>
                      <option value="Disabled">Ngưng hoạt động (Disabled)</option>
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-8">
                  <button type="button" onClick={() => setShowPricingModal(false)} className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">Hủy</button>
                  <button type="submit" className="px-6 py-3 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white transition-colors">Lưu Luật Giá</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PromotionManagement;
