import { useState, useEffect } from 'react';
import { MapPin, Plus, Edit, Trash2, Monitor, X, XOctagon } from 'lucide-react';
import { Link } from 'react-router-dom';

const CinemaManagement = () => {
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCinema, setEditingCinema] = useState(null);
  const [formData, setFormData] = useState({ name: '', address: '', contactEmail: '', contactPhone: '' });

  const getAuthHeaders = () => {
    const userStr = localStorage.getItem('user');
    const token = userStr ? JSON.parse(userStr).token : '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchCinemas = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/cinemas', {
        headers: getAuthHeaders()
      });
      if (res.ok) setCinemas(await res.json());
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCinemas(); }, []);

  const validatePhone = (phone) => {
    const phoneRegex = /^(0|\+84|84)[3|5|7|8|9][0-9]{8}$/;
    return phoneRegex.test(phone);
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.contactEmail && !validateEmail(formData.contactEmail)) {
      alert("LỖI: Email không hợp lệ! Vui lòng kiểm tra lại định dạng email.");
      return;
    }

    if (formData.contactPhone && !validatePhone(formData.contactPhone)) {
      alert("LỖI: Số điện thoại không hợp lệ! Vui lòng nhập số điện thoại Việt Nam hợp lệ (Ví dụ: 0987654321 hoặc +84987654321).");
      return;
    }

    const url = editingCinema ? `http://localhost:5000/api/cinemas/${editingCinema.id}` : 'http://localhost:5000/api/cinemas';
    const method = editingCinema ? 'PUT' : 'POST';
    
    try {
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
         const data = await response.json();
         alert('LỖI: ' + (data.error || 'Có lỗi xảy ra'));
         return;
      }
      
      setShowModal(false);
      setEditingCinema(null);
      setFormData({ name: '', address: '', contactEmail: '', contactPhone: '' });
      fetchCinemas();
    } catch (err) { 
      console.error(err);
      alert('Đã xảy ra lỗi kết nối!');
    }
  };

  const handleEdit = (c) => {
    setEditingCinema(c);
    setFormData({ name: c.name, address: c.address, contactEmail: c.contactEmail, contactPhone: c.contactPhone });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc muốn ngưng hoạt động rạp này?')) {
      await fetch(`http://localhost:5000/api/cinemas/${id}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      fetchCinemas();
    }
  };

  const handleHardDelete = async (id) => {
    if (confirm('CẢNH BÁO: Thao tác này sẽ xóa vĩnh viễn rạp khỏi cơ sở dữ liệu và không thể khôi phục! Bạn có chắc chắn?')) {
      try {
        const response = await fetch(`http://localhost:5000/api/cinemas/${id}/permanent`, { 
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        
        if (!response.ok) {
          const data = await response.json();
          alert(' LỖI: ' + data.error);
        } else {
          fetchCinemas();
        }
      } catch (err) {
        console.error(err);
        alert('Đã xảy ra lỗi khi kết nối tới máy chủ!');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-display font-bold text-white">Quản lý Cụm Rạp</h1>
        <button onClick={() => { setEditingCinema(null); setFormData({ name: '', address: '', contactEmail: '', contactPhone: '' }); setShowModal(true); }} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus className="w-5 h-5" /> Thêm Rạp Mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? <p className="text-gray-400">Đang tải...</p> : cinemas.map(c => (
          <div key={c.id} className={`glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden transition-all duration-300 hover:border-white/20 ${c.status === 'Disabled' ? 'opacity-50 grayscale hover:opacity-100 hover:grayscale-0' : ''}`}>
            {c.status === 'Disabled' && <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded-bl-lg font-bold">Ngưng hoạt động</div>}
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> {c.name}</h3>
            <p className="text-gray-400 text-sm mb-1 truncate" title={c.address}>📍 {c.address}</p>
            <p className="text-gray-400 text-sm mb-1">✉️ {c.contactEmail}</p>
            <p className="text-gray-400 text-sm mb-4">📞 {c.contactPhone}</p>
            
            <div className="flex justify-between items-center pt-4 border-t border-white/10">
              <Link to={`/admin/cinemas/${c.id}/rooms`} className="text-sm flex items-center gap-1.5 text-blue-400 hover:text-blue-300 bg-blue-400/10 px-3 py-1.5 rounded-lg transition-colors">
                <Monitor className="w-4 h-4" /> Phòng chiếu
              </Link>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(c)} className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                {c.status !== 'Disabled' ? (
                  <button onClick={() => handleDelete(c.id)} className="p-2 text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 rounded-lg transition-colors" title="Ngưng hoạt động"><Trash2 className="w-4 h-4" /></button>
                ) : (
                  <button onClick={() => handleHardDelete(c.id)} className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-[0_0_10px_rgba(220,38,38,0.5)]" title="Xóa vĩnh viễn khỏi Database"><XOctagon className="w-4 h-4" /></button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-md border border-white/10 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
            <h2 className="text-2xl font-bold mb-6">{editingCinema ? 'Cập nhật Rạp' : 'Thêm Rạp Mới'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm text-gray-400 mb-1">Tên Rạp</label><input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Địa chỉ</label><input required type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Email</label><input required type="email" placeholder="example@cinemahub.vn" value={formData.contactEmail} onChange={e => setFormData({...formData, contactEmail: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Số điện thoại</label><input required type="text" placeholder="0987654321" value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none" /></div>
              <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-lg font-bold mt-4 transition-colors">Lưu thông tin</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default CinemaManagement;
