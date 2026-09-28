import { useState, useEffect } from 'react';
import { Monitor, Plus, Edit, Trash2, ArrowLeft, X, XOctagon } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';

const ScreenRoomManagement = () => {
  const { cinemaId } = useParams();
  const [cinema, setCinema] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({ name: '', capacity: 50, screenType: '2D' });

  const getAuthHeaders = () => {
    const userStr = localStorage.getItem('user');
    const token = userStr ? JSON.parse(userStr).token : '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchData = async () => {
    try {
      const cinemaRes = await fetch(`http://localhost:5000/api/cinemas/${cinemaId}`, { headers: getAuthHeaders() });
      if (cinemaRes.ok) setCinema(await cinemaRes.json());

      const roomsRes = await fetch(`http://localhost:5000/api/cinemas/${cinemaId}/rooms`, { headers: getAuthHeaders() });
      if (roomsRes.ok) setRooms(await roomsRes.json());
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [cinemaId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingRoom
      ? `http://localhost:5000/api/cinemas/${cinemaId}/rooms/${editingRoom.id}`
      : `http://localhost:5000/api/cinemas/${cinemaId}/rooms`;
    const method = editingRoom ? 'PUT' : 'POST';

    try {
      await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...formData, capacity: parseInt(formData.capacity) })
      });
      setShowModal(false);
      setEditingRoom(null);
      setFormData({ name: '', capacity: 50, screenType: '2D' });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleEdit = (r) => {
    setEditingRoom(r);
    setFormData({ name: r.name, capacity: r.capacity, screenType: r.screenType });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc muốn ngưng hoạt động phòng chiếu này?')) {
      await fetch(`http://localhost:5000/api/cinemas/${cinemaId}/rooms/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      fetchData();
    }
  };

  const handleHardDelete = async (id) => {
    if (confirm('CẢNH BÁO: Thao tác này sẽ xóa vĩnh viễn phòng chiếu khỏi cơ sở dữ liệu. Bạn có chắc chắn?')) {
      await fetch(`http://localhost:5000/api/cinemas/${cinemaId}/rooms/${id}/permanent`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link to="/admin/cinemas" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-display font-bold text-white">
          Phòng chiếu {cinema ? `- ${cinema.name}` : ''}
        </h1>
      </div>

      <div className="flex justify-end">
        <button onClick={() => { setEditingRoom(null); setFormData({ name: '', capacity: 50, screenType: '2D' }); setShowModal(true); }} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Plus className="w-5 h-5" /> Thêm Phòng
        </button>
      </div>

      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden bg-surface">
        {loading ? <div className="p-8 text-center text-gray-400">Đang tải...</div> : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-sm">
                <th className="p-4 font-medium">Tên Phòng</th>
                <th className="p-4 font-medium">Số Lượng</th>
                <th className="p-4 font-medium">Loại Màn hình</th>
                <th className="p-4 font-medium">Trạng thái</th>
                <th className="p-4 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rooms.length === 0 ? <tr><td colSpan="5" className="p-8 text-center text-gray-400">Chưa có phòng chiếu nào.</td></tr> :
                rooms.map(r => (
                  <tr key={r.id} className={`border-b border-white/5 transition-all duration-300 hover:bg-white/5 ${r.status === 'Disabled' ? 'opacity-50 grayscale hover:opacity-100 hover:grayscale-0' : ''}`}>
                    <td className="p-4 font-bold flex items-center gap-2"><Monitor className="w-4 h-4 text-primary" /> {r.name}</td>
                    <td className="p-4">{r.capacity} ghế</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold tracking-wider ${r.screenType === 'IMAX' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/10 text-white'}`}>
                        {r.screenType}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${r.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {r.status === 'Active' ? 'Đang HĐ' : 'Bảo trì'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(r)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                        {r.status !== 'Disabled' ? (
                          <button onClick={() => handleDelete(r.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="Tạm ngưng"><Trash2 className="w-4 h-4" /></button>
                        ) : (
                          <button onClick={() => handleHardDelete(r.id)} className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-[0_0_10px_rgba(220,38,38,0.5)]" title="Xóa vĩnh viễn khỏi Database"><XOctagon className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-md border border-white/10 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
            <h2 className="text-2xl font-bold mb-6">{editingRoom ? 'Cập nhật Phòng' : 'Thêm Phòng Mới'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm text-gray-400 mb-1">Tên Phòng</label><input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Số Lượng</label><input required type="number" min="10" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Loại Màn Hình</label>
                <select value={formData.screenType} onChange={e => setFormData({ ...formData, screenType: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none">
                  <option value="2D">2D Tiêu chuẩn</option>
                  <option value="3D">3D Nổi</option>
                  <option value="IMAX">IMAX Cực đại</option>
                  <option value="4DX">4DX Chuyển động</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-lg font-bold mt-4 transition-colors">Lưu thông tin</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ScreenRoomManagement;
