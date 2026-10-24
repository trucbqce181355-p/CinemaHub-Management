import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Award, Star, Gift, Settings, Search, Plus, Edit2, Trash2, 
  CheckCircle2, AlertCircle, RefreshCw, ArrowUpRight, ArrowDownRight,
  TrendingUp, Users, Ticket, Tag, ShieldCheck, X, ChevronRight, Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'http://localhost:5000/api';

const MembershipManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('tiers'); // 'tiers', 'customers', 'transactions', 'rewards'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // 1. Tiers & Rules State
  const [tiers, setTiers] = useState([]);
  const [rules, setRules] = useState({
    earnRateVndPerPoint: 1000,
    pointExpiryDays: 365,
    minPointsToRedeem: 500,
    termsAndConditions: ''
  });
  const [isEditingRules, setIsEditingRules] = useState(false);
  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [newPerkInput, setNewPerkInput] = useState('');

  // 2. Customers & Point Adjustment State
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [adjustType, setAdjustType] = useState('ADD'); // 'ADD' or 'DEDUCT'
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  // 3. Transactions Audit State
  const [transactions, setTransactions] = useState([]);

  // 4. Rewards Catalog State
  const [rewards, setRewards] = useState([]);
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState(null);

  // Guard: Only Manager can manage this page
  if (user && user.role !== 'Manager') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Truy cập bị từ chối</h2>
        <p className="text-gray-400 max-w-md text-sm mb-6">
          Trang quản lý Hội viên & Điểm thưởng chỉ dành riêng cho quyền Quản lý (Manager).
        </p>
        <Link to="/admin" className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-colors">
          Quay lại Bảng điều khiển
        </Link>
      </div>
    );
  }

  // Fetch initial data
  useEffect(() => {
    fetchTiers();
    fetchRules();
    fetchCustomers();
    fetchTransactions();
    fetchRewards();
  }, [user]);

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const fetchTiers = async () => {
    try {
      const res = await fetch(`${API_BASE}/membership/all-tiers`, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTiers(data);
      }
    } catch (err) {
      console.error("Error fetching tiers", err);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await fetch(`${API_BASE}/membership/rules`);
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (err) {
      console.error("Error fetching rules", err);
    }
  };

  const fetchCustomers = async (search = '') => {
    try {
      const url = search 
        ? `${API_BASE}/membership/admin/customers?search=${encodeURIComponent(search)}`
        : `${API_BASE}/membership/admin/customers`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error("Error fetching customers", err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_BASE}/membership/admin/transactions`, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error("Error fetching transactions", err);
    }
  };

  const fetchRewards = async () => {
    try {
      const res = await fetch(`${API_BASE}/membership/all-rewards`, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRewards(data);
      }
    } catch (err) {
      console.error("Error fetching rewards", err);
    }
  };

  // --- ACTIONS: TIERS & RULES ---
  const handleSaveRules = async (e) => {
    e.preventDefault();
    const payload = {
      ...rules,
      earnRateVndPerPoint: Number(rules.earnRateVndPerPoint) || 1000,
      pointExpiryDays: Number(rules.pointExpiryDays) || 365,
      minPointsToRedeem: Number(rules.minPointsToRedeem) || 500
    };
    try {
      const res = await fetch(`${API_BASE}/membership/rules`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast("Cập nhật quy tắc tích điểm thành công!");
        setIsEditingRules(false);
        fetchRules();
      } else {
        showToast("Cập nhật quy tắc thất bại", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối", "error");
    }
  };

  const handleOpenTierModal = (tier = null) => {
    if (tier) {
      setEditingTier({ ...tier, benefits: tier.benefits ? [...tier.benefits] : [] });
    } else {
      setEditingTier({
        code: '',
        name: '',
        level: tiers.length + 1,
        minPoints: 0,
        minSpend: 0,
        pointsMultiplier: 1.0,
        ticketDiscountPercent: 0,
        fnbDiscountPercent: 0,
        birthdayGift: '',
        badgeColor: '#EAB308',
        status: 'Active',
        description: '',
        benefits: []
      });
    }
    setNewPerkInput('');
    setTierModalOpen(true);
  };

  const handleSaveTier = async (e) => {
    e.preventDefault();
    if (!editingTier.name || !editingTier.code) {
      showToast("Vui lòng nhập đầy đủ tên và mã hạng", "error");
      return;
    }
    const payload = {
      ...editingTier,
      level: Number(editingTier.level) || 1,
      minPoints: Number(editingTier.minPoints) || 0,
      minSpend: Number(editingTier.minSpend) || 0,
      pointsMultiplier: Number(editingTier.pointsMultiplier) || 1.0,
      ticketDiscountPercent: Number(editingTier.ticketDiscountPercent) || 0,
      fnbDiscountPercent: Number(editingTier.fnbDiscountPercent) || 0
    };
    try {
      const res = await fetch(`${API_BASE}/membership/tiers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast("Lưu hạng thành viên thành công!");
        setTierModalOpen(false);
        fetchTiers();
      } else {
        showToast("Lỗi khi lưu hạng thành viên", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối", "error");
    }
  };

  const handleDeleteTier = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa hạng thành viên này?")) return;
    try {
      const res = await fetch(`${API_BASE}/membership/tiers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      if (res.ok) {
        showToast("Đã xóa hạng thành viên!");
        fetchTiers();
      } else {
        showToast("Không thể xóa hạng thành viên", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối", "error");
    }
  };

  const handleAddPerk = () => {
    if (!newPerkInput.trim()) return;
    setEditingTier({
      ...editingTier,
      benefits: [...(editingTier.benefits || []), newPerkInput.trim()]
    });
    setNewPerkInput('');
  };

  const handleRemovePerk = (index) => {
    setEditingTier({
      ...editingTier,
      benefits: editingTier.benefits.filter((_, i) => i !== index)
    });
  };

  // --- ACTIONS: ADJUST CUSTOMER POINTS ---
  const handleOpenAdjustModal = (customer) => {
    setSelectedCustomer(customer);
    setAdjustType('ADD');
    setAdjustAmount('');
    setAdjustReason('');
    setAdjustModalOpen(true);
  };

  const handleConfirmAdjustPoints = async (e) => {
    e.preventDefault();
    const amountNum = parseInt(adjustAmount, 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast("Số điểm phải là số nguyên dương lớn hơn 0", "error");
      return;
    }
    if (!adjustReason.trim()) {
      showToast("Vui lòng nhập lý do điều chỉnh điểm", "error");
      return;
    }

    const delta = adjustType === 'ADD' ? amountNum : -amountNum;
    setAdjustSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/membership/adjust-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          userId: selectedCustomer.id,
          points: delta,
          reason: adjustReason.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Điều chỉnh ${delta > 0 ? '+' : ''}${delta} điểm thành công cho ${selectedCustomer.username}!`);
        setAdjustModalOpen(false);
        fetchCustomers(customerSearch);
        fetchTransactions();
      } else {
        showToast(data.error || "Điều chỉnh điểm thất bại", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // --- ACTIONS: REWARDS CATALOG ---
  const handleOpenRewardModal = (reward = null) => {
    if (reward) {
      setEditingReward({ ...reward });
    } else {
      setEditingReward({
        title: '',
        description: '',
        pointsRequired: 100,
        discountType: 'FIXED_AMOUNT',
        discountValue: 50000,
        minSpend: 0,
        validityDays: 30,
        icon: 'ticket',
        status: 'Active'
      });
    }
    setRewardModalOpen(true);
  };

  const handleSaveReward = async (e) => {
    e.preventDefault();
    if (!editingReward.title || !editingReward.pointsRequired || !editingReward.discountValue) {
      showToast("Vui lòng nhập đầy đủ thông tin quà thưởng", "error");
      return;
    }
    const payload = {
      ...editingReward,
      pointsRequired: Number(editingReward.pointsRequired) || 500,
      discountValue: Number(editingReward.discountValue) || 0,
      minSpend: Number(editingReward.minSpend) || 0,
      validityDays: Number(editingReward.validityDays) || 30
    };
    try {
      const res = await fetch(`${API_BASE}/membership/rewards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast("Lưu quà thưởng thành công!");
        setRewardModalOpen(false);
        fetchRewards();
      } else {
        showToast("Lỗi khi lưu quà thưởng", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối", "error");
    }
  };

  const handleDeleteReward = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa phần quà này?")) return;
    try {
      const res = await fetch(`${API_BASE}/membership/rewards/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      if (res.ok) {
        showToast("Đã xóa phần quà!");
        fetchRewards();
      } else {
        showToast("Lỗi khi xóa", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối", "error");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md border ${
              message.type === 'error'
                ? 'bg-red-500/90 text-white border-red-400/40'
                : 'bg-emerald-500/90 text-white border-emerald-400/40'
            }`}
          >
            {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            <span className="font-semibold text-sm">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-red-950/40 via-surface to-surface border border-white/10 p-6 md:p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 border border-primary/30 rounded-full text-xs font-bold text-primary uppercase tracking-wider mb-3">
            <Award className="w-3.5 h-3.5" /> CinemaHub Loyalty Engine
          </div>
          <h1 className="text-3xl font-display font-extrabold text-white tracking-wide">
            HỘI VIÊN & ĐIỂM THƯỞNG
          </h1>
          <p className="text-gray-400 text-sm mt-1 max-w-xl">
            Quản trị quy tắc thăng hạng, cấu hình quyền lợi hội viên, điều chỉnh điểm thủ công cho khách hàng và kho voucher đổi điểm.
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 min-w-[130px]">
            <span className="text-xs text-gray-400 block font-medium">Tổng thành viên</span>
            <span className="text-2xl font-black text-white mt-1 block">{customers.length}</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 min-w-[130px]">
            <span className="text-xs text-gray-400 block font-medium">Hạng kích hoạt</span>
            <span className="text-2xl font-black text-amber-400 mt-1 block">
              {tiers.filter(t => t.status === 'Active').length}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('tiers')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'tiers'
              ? 'bg-primary text-white shadow-lg shadow-primary/25 border border-primary/40'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Award className="w-4 h-4" /> Hạng thành viên & Quyền lợi
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'customers'
              ? 'bg-primary text-white shadow-lg shadow-primary/25 border border-primary/40'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Users className="w-4 h-4" /> Khách hàng & Điểm số
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'transactions'
              ? 'bg-primary text-white shadow-lg shadow-primary/25 border border-primary/40'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Lịch sử biến động điểm
        </button>

        <button
          onClick={() => setActiveTab('rewards')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'rewards'
              ? 'bg-primary text-white shadow-lg shadow-primary/25 border border-primary/40'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Gift className="w-4 h-4" /> Kho quà đổi điểm
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MEMBERSHIP TIERS & BENEFITS & RULES */}
      {/* ========================================================================= */}
      {activeTab === 'tiers' && (
        <div className="space-y-8">
          {/* Global Rule Settings Card */}
          <div className="bg-surface border border-white/10 rounded-3xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Quy tắc tích điểm & hiệu lực chung</h3>
                  <p className="text-xs text-gray-400">Thiết lập tỷ lệ quy đổi doanh số ra điểm và thời hạn sử dụng điểm</p>
                </div>
              </div>
              {!isEditingRules ? (
                <button
                  onClick={() => setIsEditingRules(true)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Chỉnh sửa quy tắc
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditingRules(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-xl transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSaveRules}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-colors shadow-md shadow-primary/20"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                <span className="text-xs text-gray-400 font-medium block mb-1">Tỷ lệ quy đổi điểm</span>
                {isEditingRules ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      value={rules.earnRateVndPerPoint ?? ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setRules({ ...rules, earnRateVndPerPoint: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                      className="w-28 px-3 py-1.5 bg-black/40 border border-white/20 rounded-lg text-sm text-white font-bold"
                    />
                    <span className="text-xs text-gray-400">đ = 1 Điểm</span>
                  </div>
                ) : (
                  <p className="text-lg font-extrabold text-amber-400">
                    {(rules.earnRateVndPerPoint || 1000).toLocaleString()} đ <span className="text-xs text-gray-400 font-normal">= 1 Điểm</span>
                  </p>
                )}
                <span className="text-[11px] text-gray-500 mt-1 block">Chi tiêu vé hoặc bắp nước để tích điểm</span>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                <span className="text-xs text-gray-400 font-medium block mb-1">Thời hạn hiệu lực điểm</span>
                {isEditingRules ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      value={rules.pointExpiryDays ?? ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setRules({ ...rules, pointExpiryDays: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                      className="w-24 px-3 py-1.5 bg-black/40 border border-white/20 rounded-lg text-sm text-white font-bold"
                    />
                    <span className="text-xs text-gray-400">ngày</span>
                  </div>
                ) : (
                  <p className="text-lg font-extrabold text-white">
                    {rules.pointExpiryDays || 365} <span className="text-xs text-gray-400 font-normal">ngày (12 tháng)</span>
                  </p>
                )}
                <span className="text-[11px] text-gray-500 mt-1 block">Điểm hết hạn tự động sau chu kỳ tính từ ngày phát sinh</span>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                <span className="text-xs text-gray-400 font-medium block mb-1">Điểm tối thiểu đổi quà</span>
                {isEditingRules ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      value={rules.minPointsToRedeem ?? ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setRules({ ...rules, minPointsToRedeem: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                      className="w-24 px-3 py-1.5 bg-black/40 border border-white/20 rounded-lg text-sm text-white font-bold"
                    />
                    <span className="text-xs text-gray-400">điểm</span>
                  </div>
                ) : (
                  <p className="text-lg font-extrabold text-emerald-400">
                    {rules.minPointsToRedeem || 500} <span className="text-xs text-gray-400 font-normal">điểm</span>
                  </p>
                )}
                <span className="text-[11px] text-gray-500 mt-1 block">Khách hàng cần tối thiểu số điểm này để đổi voucher</span>
              </div>
            </div>
          </div>

          {/* Tiers Header & Add Button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Các hạng hội viên & Quyền lợi chi tiết</h2>
              <p className="text-xs text-gray-400">Phân cấp hạng từ thấp đến cao, tự động nâng cấp khi tích lũy đủ điểm</p>
            </div>
            {user?.role === 'Manager' && (
              <button
                onClick={() => handleOpenTierModal()}
                className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Thêm hạng mới
              </button>
            )}
          </div>

          {/* Tiers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tiers.map((tier) => (
              <motion.div
                key={tier.id || tier.code}
                whileHover={{ y: -4 }}
                className="bg-surface border border-white/10 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group shadow-xl"
              >
                {/* Glow border matching tier badge color */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1.5 transition-all"
                  style={{ backgroundColor: tier.badgeColor || '#EAB308' }}
                />

                <div>
                  {/* Tier Header */}
                  <div className="flex items-center justify-between mb-4">
                    <span 
                      className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full text-black font-mono shadow-sm"
                      style={{ backgroundColor: tier.badgeColor || '#EAB308' }}
                    >
                      Cấp {tier.level || 1} • {tier.code}
                    </span>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      tier.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {tier.status === 'Active' ? 'Đang hoạt động' : 'Tạm dừng'}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-white">{tier.name}</h3>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2 min-h-[32px]">{tier.description}</p>

                  {/* Requirements Box */}
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-3 my-4 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Điểm yêu cầu:</span>
                      <span className="font-bold text-amber-400">{tier.minPoints?.toLocaleString()} điểm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Chi tiêu tối thiểu:</span>
                      <span className="font-bold text-white">{tier.minSpend ? `${tier.minSpend?.toLocaleString()} đ` : '0 đ'}</span>
                    </div>
                  </div>

                  {/* Perks Summary Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-center py-2 border-y border-white/5 my-3">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase block">Giảm vé</span>
                      <span className="text-sm font-black text-amber-400">{tier.ticketDiscountPercent || 0}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase block">Bắp nước</span>
                      <span className="text-sm font-black text-blue-400">{tier.fnbDiscountPercent || 0}%</span>
                    </div>
                  </div>

                  {/* Birthday Gift */}
                  {tier.birthdayGift && (
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-2.5 my-3 flex items-center gap-2">
                      <Gift className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs text-gray-200 font-medium truncate">Sinh nhật: {tier.birthdayGift}</span>
                    </div>
                  )}

                  {/* Bullet Benefits List */}
                  <div className="space-y-2 mt-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                      Đặc quyền nổi bật ({tier.benefits?.length || 0})
                    </span>
                    <ul className="space-y-1.5 text-xs text-gray-300">
                      {tier.benefits?.map((b, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                {user?.role === 'Manager' && (
                  <div className="flex gap-2 pt-6 mt-6 border-t border-white/5">
                    <button
                      onClick={() => handleOpenTierModal(tier)}
                      className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Chỉnh sửa
                    </button>
                    <button
                      onClick={() => handleDeleteTier(tier.id)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all"
                      title="Xóa hạng"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CUSTOMERS & POINT ADJUSTMENT */}
      {/* ========================================================================= */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          {/* Search bar & Refresh */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-surface border border-white/10 rounded-2xl p-4">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  fetchCustomers(e.target.value);
                }}
                placeholder="Tìm khách hàng theo Tên, Email, SĐT, Mã thẻ..."
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-all"
              />
            </div>
            <button
              onClick={() => fetchCustomers(customerSearch)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 self-end sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Làm mới
            </button>
          </div>

          {/* Customers Table */}
          <div className="bg-surface border border-white/10 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-gray-400 text-xs uppercase tracking-wider font-semibold">
                    <th className="py-4 px-6">Khách hàng</th>
                    <th className="py-4 px-6">Mã thẻ hội viên</th>
                    <th className="py-4 px-6">Hạng hiện tại</th>
                    <th className="py-4 px-6 text-right">Điểm khả dụng</th>
                    <th className="py-4 px-6 text-right">Điểm trọn đời</th>
                    <th className="py-4 px-6 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {customers.length > 0 ? (
                    customers.map((c) => (
                      <tr key={c.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-orange-500 flex items-center justify-center font-black text-white shadow-md">
                              {c.username ? c.username.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <p className="font-bold text-white">{c.username}</p>
                              <p className="text-xs text-gray-400">{c.email} • {c.phoneNumber || 'Chưa cập nhật SĐT'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-mono text-xs font-bold text-gray-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                            {c.membershipCardNumber || `CH-${c.id?.substring(0, 6).toUpperCase()}`}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span 
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-black"
                            style={{ backgroundColor: c.badgeColor || '#CD7F32' }}
                          >
                            <Award className="w-3.5 h-3.5" />
                            {c.tierName || c.membershipTier}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="font-black text-amber-400 text-base">
                            {(c.rewardPoints || 0).toLocaleString()} <span className="text-xs text-gray-400 font-normal">điểm</span>
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="font-bold text-gray-300 text-sm">
                            {(c.lifetimePoints || 0).toLocaleString()} <span className="text-xs text-gray-500 font-normal">điểm</span>
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => handleOpenAdjustModal(c)}
                            className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 mx-auto"
                          >
                            <Coins className="w-3.5 h-3.5" /> Điều chỉnh điểm
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500 text-xs">
                        Không tìm thấy khách hàng nào phù hợp với từ khóa
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: POINT AUDIT TRANSACTIONS */}
      {/* ========================================================================= */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Lịch sử giao dịch & Biến động điểm thưởng</h2>
              <p className="text-xs text-gray-400">Ghi nhận toàn bộ hoạt động tích điểm vé, đổi quà voucher và thao tác điều chỉnh từ nhân viên</p>
            </div>
            <button
              onClick={fetchTransactions}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Làm mới
            </button>
          </div>

          <div className="bg-surface border border-white/10 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-gray-400 text-xs uppercase tracking-wider font-semibold">
                    <th className="py-4 px-6">Thời gian</th>
                    <th className="py-4 px-6">Khách hàng</th>
                    <th className="py-4 px-6 text-right">Biến động</th>
                    <th className="py-4 px-6 text-right">Số dư sau</th>
                    <th className="py-4 px-6">Lý do / Tham chiếu</th>
                    <th className="py-4 px-6">Người thực hiện</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {transactions.length > 0 ? (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/5 transition-colors text-xs">
                        <td className="py-4 px-6 text-gray-400 font-mono whitespace-nowrap">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : '--'}
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-bold text-white">{tx.userName || 'Khách hàng'}</p>
                          <p className="text-gray-500 text-[11px]">{tx.userEmail}</p>
                        </td>
                        <td className="py-4 px-6 text-right font-black">
                          <span className={tx.points > 0 ? 'text-emerald-400 text-sm' : 'text-red-400 text-sm'}>
                            {tx.points > 0 ? `+${tx.points}` : tx.points}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-gray-300">
                          {tx.balanceAfter?.toLocaleString()} đ
                        </td>
                        <td className="py-4 px-6 text-gray-300 max-w-xs truncate">
                          {tx.reason || '--'}
                        </td>
                        <td className="py-4 px-6 text-gray-400">
                          <span className="font-medium text-white">{tx.adjustedByName || 'Hệ thống'}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500 text-xs">
                        Chưa có giao dịch biến động điểm nào được ghi nhận
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: REWARDS STORE / VOUCHERS CATALOG */}
      {/* ========================================================================= */}
      {activeTab === 'rewards' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Kho phần quà & Mã giảm giá đổi điểm</h2>
              <p className="text-xs text-gray-400">Quản lý danh mục các voucher mà khách hàng có thể dùng điểm thưởng để đổi</p>
            </div>
            {user?.role === 'Manager' && (
              <button
                onClick={() => handleOpenRewardModal()}
                className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Thêm phần quà mới
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewards.map((r) => (
              <div
                key={r.id}
                className="bg-surface border border-white/10 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
                      {r.pointsRequired} ĐIỂM
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      r.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {r.status === 'Active' ? 'Khả dụng' : 'Tạm ẩn'}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white">{r.title}</h3>
                  <p className="text-xs text-gray-400 mt-1 min-h-[32px]">{r.description}</p>

                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 my-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Giá trị ưu đãi:</span>
                      <span className="font-extrabold text-primary text-sm">
                        {r.discountType === 'PERCENTAGE' 
                          ? `Giảm ${r.discountValue}%` 
                          : `Giảm ${r.discountValue?.toLocaleString()} đ`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Đơn tối thiểu:</span>
                      <span className="font-bold text-white">
                        {r.minSpend ? `${r.minSpend?.toLocaleString()} đ` : 'Không yêu cầu'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Hạn sử dụng:</span>
                      <span className="font-bold text-gray-300">{r.validityDays || 30} ngày sau khi đổi</span>
                    </div>
                  </div>
                </div>

                {user?.role === 'Manager' && (
                  <div className="flex gap-2 pt-4 border-t border-white/5">
                    <button
                      onClick={() => handleOpenRewardModal(r)}
                      className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Sửa
                    </button>
                    <button
                      onClick={() => handleDeleteReward(r.id)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all"
                      title="Xóa phần quà"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADJUST CUSTOMER POINTS */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {adjustModalOpen && selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#141414] border border-white/15 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Điều chỉnh điểm khách hàng</h3>
                    <p className="text-xs text-gray-400">Cộng hoặc trừ điểm thủ công kèm lý do kiểm toán</p>
                  </div>
                </div>
                <button
                  onClick={() => setAdjustModalOpen(false)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmAdjustPoints} className="p-6 space-y-5">
                {/* Customer card info */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Khách hàng được chọn</p>
                    <p className="text-base font-extrabold text-white mt-0.5">{selectedCustomer.username}</p>
                    <p className="text-xs text-gray-400">{selectedCustomer.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Số dư hiện tại</p>
                    <p className="text-xl font-black text-amber-400 mt-0.5">
                      {(selectedCustomer.rewardPoints || 0).toLocaleString()} <span className="text-xs text-gray-400">điểm</span>
                    </p>
                  </div>
                </div>

                {/* Adjust Type Selection */}
                <div>
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2">
                    Loại thao tác
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAdjustType('ADD')}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        adjustType === 'ADD'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      <ArrowUpRight className="w-4 h-4" /> + Cộng điểm thưởng
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType('DEDUCT')}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        adjustType === 'DEDUCT'
                          ? 'bg-red-500/20 border-red-500 text-red-400 shadow-md'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      <ArrowDownRight className="w-4 h-4" /> - Khấu trừ điểm
                    </button>
                  </div>
                </div>

                {/* Amount input */}
                <div>
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2">
                    Số điểm điều chỉnh
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustAmount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="Ví dụ: 500"
                    className="w-full px-4 py-3 bg-black/40 border border-white/15 rounded-xl text-white font-bold text-lg focus:outline-none focus:border-primary"
                  />
                  {adjustAmount && !isNaN(parseInt(adjustAmount, 10)) && (
                    <p className="text-xs text-gray-400 mt-2">
                      Số dư sau điều chỉnh:{' '}
                      <span className="font-bold text-white">
                        {Math.max(
                          0,
                          (selectedCustomer.rewardPoints || 0) +
                            (adjustType === 'ADD' ? parseInt(adjustAmount, 10) : -parseInt(adjustAmount, 10))
                        ).toLocaleString()}{' '}
                        điểm
                      </span>
                    </p>
                  )}
                </div>

                {/* Reason Input */}
                <div>
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2">
                    Lý do điều chỉnh (Bắt buộc)
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="Ví dụ: Bù điểm cho khách do lỗi thanh toán, tặng thưởng thành viên ngày sinh nhật..."
                    className="w-full px-4 py-3 bg-black/40 border border-white/15 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Submit button */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdjustModalOpen(false)}
                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold rounded-xl transition-colors"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={adjustSubmitting}
                    className="flex-1 py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-primary/25"
                  >
                    {adjustSubmitting ? 'Đang cập nhật...' : 'Xác nhận điều chỉnh'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT MEMBERSHIP TIER */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {tierModalOpen && editingTier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#141414] border border-white/15 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl my-8"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingTier.id ? 'Chỉnh sửa hạng thành viên' : 'Thêm hạng thành viên mới'}
                  </h3>
                  <p className="text-xs text-gray-400">Thiết lập điều kiện thăng hạng và các quyền lợi đặc quyền</p>
                </div>
                <button onClick={() => setTierModalOpen(false)} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTier} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1.5">Tên hạng thành viên</label>
                    <input
                      type="text"
                      required
                      value={editingTier.name}
                      onChange={(e) => setEditingTier({ ...editingTier, name: e.target.value })}
                      placeholder="Ví dụ: Thành viên Vàng"
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1.5">Mã hạng (CODE)</label>
                    <input
                      type="text"
                      required
                      value={editingTier.code}
                      onChange={(e) => setEditingTier({ ...editingTier, code: e.target.value })}
                      placeholder="Ví dụ: GOLD"
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white uppercase focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1.5">Cấp bậc (Level)</label>
                    <input
                      type="number"
                      required
                      value={editingTier.level ?? ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setEditingTier({ ...editingTier, level: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1.5">Điểm tối thiểu</label>
                    <input
                      type="number"
                      required
                      value={editingTier.minPoints ?? ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setEditingTier({ ...editingTier, minPoints: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1.5">Chi tiêu tối thiểu (VNĐ)</label>
                    <input
                      type="number"
                      value={editingTier.minSpend ?? ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setEditingTier({ ...editingTier, minSpend: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1.5">Giảm giá vé (%)</label>
                    <input
                      type="number"
                      value={editingTier.ticketDiscountPercent ?? ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setEditingTier({ ...editingTier, ticketDiscountPercent: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1.5">Giảm bắp nước (%)</label>
                    <input
                      type="number"
                      value={editingTier.fnbDiscountPercent ?? ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setEditingTier({ ...editingTier, fnbDiscountPercent: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1.5">Màu huy hiệu (Hex color)</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={editingTier.badgeColor || '#EAB308'}
                        onChange={(e) => setEditingTier({ ...editingTier, badgeColor: e.target.value })}
                        className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={editingTier.badgeColor || '#EAB308'}
                        onChange={(e) => setEditingTier({ ...editingTier, badgeColor: e.target.value })}
                        className="flex-1 px-3 py-2.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white uppercase focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1.5">Trạng thái</label>
                    <select
                      value={editingTier.status || 'Active'}
                      onChange={(e) => setEditingTier({ ...editingTier, status: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                    >
                      <option value="Active">Hoạt động</option>
                      <option value="Inactive">Tạm ngưng</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1.5">Quà tặng sinh nhật</label>
                  <input
                    type="text"
                    value={editingTier.birthdayGift || ''}
                    onChange={(e) => setEditingTier({ ...editingTier, birthdayGift: e.target.value })}
                    placeholder="Ví dụ: 1 Vé 2D miễn phí + Combo Bắp Nước"
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1.5">Mô tả ngắn</label>
                  <textarea
                    rows={2}
                    value={editingTier.description || ''}
                    onChange={(e) => setEditingTier({ ...editingTier, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Benefits List */}
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1.5">Danh sách quyền lợi hội viên</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newPerkInput}
                      onChange={(e) => setNewPerkInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPerk(); } }}
                      placeholder="Thêm một đặc quyền mới..."
                      className="flex-1 px-3.5 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={handleAddPerk}
                      className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold"
                    >
                      Thêm
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {editingTier.benefits?.map((b, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white/5 px-3 py-1.5 rounded-lg text-xs">
                        <span className="text-gray-200">{b}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePerk(idx)}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setTierModalOpen(false)}
                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold rounded-xl transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-primary/25"
                  >
                    Lưu hạng thành viên
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT REWARD VOUCHER */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {rewardModalOpen && editingReward && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#141414] border border-white/15 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingReward.id ? 'Chỉnh sửa phần quà đổi điểm' : 'Thêm phần quà đổi điểm mới'}
                  </h3>
                  <p className="text-xs text-gray-400">Voucher được tự động tạo mã và tích hợp vào hệ thống thanh toán</p>
                </div>
                <button onClick={() => setRewardModalOpen(false)} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveReward} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1.5">Tiêu đề phần quà</label>
                  <input
                    type="text"
                    required
                    value={editingReward.title}
                    onChange={(e) => setEditingReward({ ...editingReward, title: e.target.value })}
                    placeholder="Ví dụ: Mã giảm giá 50.000đ"
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1.5">Điểm cần đổi</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={editingReward.pointsRequired ?? ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setEditingReward({ ...editingReward, pointsRequired: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1.5">Loại giảm giá</label>
                    <select
                      value={editingReward.discountType}
                      onChange={(e) => setEditingReward({ ...editingReward, discountType: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                    >
                      <option value="FIXED_AMOUNT">Số tiền cố định (VNĐ)</option>
                      <option value="PERCENTAGE">Phần trăm (%)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1.5">Giá trị giảm</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={editingReward.discountValue ?? ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setEditingReward({ ...editingReward, discountValue: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      placeholder={editingReward.discountType === 'PERCENTAGE' ? '20' : '50000'}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1.5">Đơn tối thiểu (VNĐ)</label>
                    <input
                      type="number"
                      value={editingReward.minSpend ?? ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setEditingReward({ ...editingReward, minSpend: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1.5">Hạn dùng sau khi đổi (ngày)</label>
                    <input
                      type="number"
                      min="1"
                      value={editingReward.validityDays ?? ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setEditingReward({ ...editingReward, validityDays: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1.5">Trạng thái</label>
                    <select
                      value={editingReward.status || 'Active'}
                      onChange={(e) => setEditingReward({ ...editingReward, status: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                    >
                      <option value="Active">Khả dụng</option>
                      <option value="Inactive">Tạm ẩn</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1.5">Mô tả chi tiết</label>
                  <textarea
                    rows={2}
                    value={editingReward.description || ''}
                    onChange={(e) => setEditingReward({ ...editingReward, description: e.target.value })}
                    placeholder="Áp dụng cho mọi hóa đơn đặt vé..."
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setRewardModalOpen(false)}
                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold rounded-xl transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-primary/25"
                  >
                    Lưu phần quà
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MembershipManagement;
