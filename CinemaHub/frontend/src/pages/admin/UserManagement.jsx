import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Lock, Unlock, UserPlus, Mail, User, Shield, X, Key, CheckSquare } from 'lucide-react';

const UserManagement = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('All');
  
  // Permission Modal State
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [selectedPermUser, setSelectedPermUser] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  const AVAILABLE_PERMISSIONS = [
    { id: 'manage_movies', label: 'Quản lý Phim (Thêm, Sửa, Xóa phim)' },
    { id: 'manage_showtimes', label: 'Quản lý Suất chiếu (Lên lịch chiếu)' },
    { id: 'manage_bookings', label: 'Quản lý Đặt vé (Xem/Hủy vé)' },
    { id: 'manage_users', label: 'Quản lý Người dùng (Khóa/Phân quyền)' },
    { id: 'view_reports', label: 'Xem Báo cáo Doanh thu' }
  ];

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'Customer'
  });
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Edit User State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editUserData, setEditUserData] = useState({
    _id: '',
    username: '',
    email: '',
    password: ''
  });
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Session Expiry Modal
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/users', {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
      } else {
        console.error('API Error:', data);
        setUsers([]); // Prevent crash if data is an object
        if (res.status === 401) {
           setIsSessionExpired(true);
           return;
        }
      }
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    
    // Auto-check token expiration every second
    const interval = setInterval(() => {
      if (user && user.token) {
        try {
          const payload = JSON.parse(atob(user.token.split('.')[1]));
          if (payload.exp * 1000 < Date.now()) {
            setIsSessionExpired(true);
          }
        } catch (e) {
          console.error('Invalid token format');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user]);

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'Active' ? 'Locked' : 'Active';
      const res = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.status === 401) { setIsSessionExpired(true); return; }
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    try {
      // Rotate Role: Customer -> Staff -> Admin -> Customer
      const roles = ['Customer', 'Staff', 'Admin'];
      const nextRole = roles[(roles.indexOf(currentRole) + 1) % roles.length];

      const res = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ role: nextRole }),
      });
      if (res.status === 401) { setIsSessionExpired(true); return; }
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      if (res.status === 401) { setIsSessionExpired(true); return; }
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddLoading(true);
    
    try {
      const res = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(newUserData),
      });
      
      if (res.status === 401) { setIsSessionExpired(true); return; }

      const data = await res.json();
      
      if (res.ok) {
        setIsAddModalOpen(false);
        setNewUserData({ username: '', email: '', password: '', role: 'Customer' });
        fetchUsers();
      } else {
        setAddError(data.message || 'Thêm người dùng thất bại');
      }
    } catch (err) {
      setAddError('Lỗi kết nối máy chủ');
    } finally {
      setAddLoading(false);
    }
  };

  const openEditModal = (u) => {
    setEditError('');
    setEditUserData({
      _id: u._id,
      username: u.username,
      email: u.email,
      phoneNumber: u.phoneNumber || '',
      role: u.role,
      status: u.status,
      createdAt: u.createdAt
    });
    setIsEditModalOpen(true);
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditLoading(true);
    
    try {
      const payload = {
        username: editUserData.username,
        email: editUserData.email,
        phoneNumber: editUserData.phoneNumber,
      };

      const res = await fetch(`http://localhost:5000/api/users/${editUserData._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(payload),
      });
      
      if (res.status === 401) { setIsSessionExpired(true); return; }

      const data = await res.json();
      
      if (res.ok) {
        setIsEditModalOpen(false);
        fetchUsers();
      } else {
        setEditError(data.message || 'Cập nhật người dùng thất bại');
      }
    } catch (err) {
      setEditError('Lỗi kết nối máy chủ');
    } finally {
      setEditLoading(false);
    }
  };

  const handleSavePermissions = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/users/${selectedPermUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ permissions: selectedPermissions }),
      });
      if (res.status === 401) { setIsSessionExpired(true); return; }
      if (res.ok) {
        setIsPermModalOpen(false);
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Admin authorization is now handled entirely by AdminLayout
  // So we just render the content directly

  return (
    <div className="h-full">
      <div className="max-w-6xl">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <h1 className="text-3xl font-display font-bold text-white">Quản lý người dùng</h1>
          <div className="flex items-center gap-3">
            {/* Dropdown Filter */}
            <div className="relative group min-w-[200px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-9 pr-8 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
              >
                <option value="All">Tất cả chức vụ</option>
                <option value="Customer">Khách hàng</option>
                <option value="Staff">Nhân viên</option>
                <option value="Admin">Quản trị viên</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary flex items-center gap-2 py-2.5"
            >
              <UserPlus className="w-4 h-4" /> Thêm người dùng
            </button>
          </div>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-gray-300">
                  <th className="p-4 font-medium">Username</th>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium">Vai trò</th>
                  <th className="p-4 font-medium">Trạng thái</th>
                  <th className="p-4 font-medium text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-400">Đang tải...</td>
                  </tr>
                ) : users.filter(u => filterRole === 'All' || u.role === filterRole).length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-3">
                        <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                        <p>Không tìm thấy người dùng nào trong nhóm này.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.filter(u => filterRole === 'All' || u.role === filterRole).map((u) => (
                    <tr key={u._id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-white">{u.username}</div>
                        <div className="text-xs text-gray-500">{u._id}</div>
                      </td>
                      <td className="p-4 text-gray-300">{u.email}</td>
                      <td className="p-4">
                        <button 
                          onClick={() => handleToggleRole(u._id, u.role)}
                          disabled={u.email === 'admin@cinemahub.com'}
                          className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                            u.role === 'Admin' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 
                            u.role === 'Staff' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 
                            'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          } ${u.email === 'admin@cinemahub.com' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {u.role}
                        </button>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full font-medium ${
                          u.status === 'Active' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 
                          'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                          {u.status === 'Active' ? 'Hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleToggleStatus(u._id, u.status)}
                            disabled={u.email === 'admin@cinemahub.com'}
                            title={u.status === 'Active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                            className={`p-2 rounded-lg transition-colors ${
                              u.status === 'Active' ? 'text-orange-400 hover:bg-orange-400/20' : 'text-green-400 hover:bg-green-400/20'
                            } ${u.email === 'admin@cinemahub.com' ? 'opacity-30 cursor-not-allowed' : ''}`}
                          >
                            {u.status === 'Active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => openEditModal(u)}
                            title="Chỉnh sửa"
                            className="p-2 text-blue-400 hover:bg-blue-400/20 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPermUser(u);
                              setSelectedPermissions(u.permissions || []);
                              setIsPermModalOpen(true);
                            }}
                            disabled={u.email === 'admin@cinemahub.com'}
                            className={`p-2 rounded-lg transition-colors ${
                              u.email === 'admin@cinemahub.com'
                                ? 'text-purple-400/30 cursor-not-allowed'
                                : 'text-purple-400 hover:bg-purple-400/20'
                            }`}
                            title="Phân quyền chi tiết"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(u._id)}
                            disabled={u.email === 'admin@cinemahub.com'}
                            title="Xóa tài khoản"
                            className={`p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors ${u.email === 'admin@cinemahub.com' ? 'opacity-30 cursor-not-allowed' : ''}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-md bg-[#121212] p-8 rounded-3xl border border-white/10 relative shadow-[0_0_50px_rgba(0,0,0,0.5)] transform animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/20 rounded-xl text-primary">
                <UserPlus className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-display font-bold text-white">Thêm thành viên</h2>
            </div>
            
            {addError && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                {addError}
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-400 pl-1">Tên hiển thị</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-primary transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={newUserData.username}
                    onChange={(e) => setNewUserData({...newUserData, username: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-gray-600"
                    placeholder="Nhập tên người dùng"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-400 pl-1">Địa chỉ Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-primary transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-gray-600"
                    placeholder="example@gmail.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-400 pl-1">Mật khẩu</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-primary transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-gray-600"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-400 pl-1">Phân quyền</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-primary transition-colors">
                    <Shield className="w-5 h-5" />
                  </div>
                  <select
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value="Customer">Khách hàng (Customer)</option>
                    <option value="Staff">Nhân viên (Staff)</option>
                    <option value="Admin">Quản trị viên (Admin)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={addLoading}
                  className="w-full py-4 px-4 bg-primary hover:bg-red-700 text-white rounded-2xl font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(229,9,20,0.2)] hover:shadow-[0_0_30px_rgba(229,9,20,0.4)] disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {addLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    'Xác nhận tạo tài khoản'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-4xl bg-[#121212] rounded-3xl border border-white/10 relative shadow-[0_0_50px_rgba(0,0,0,0.5)] transform animate-in fade-in zoom-in duration-200 overflow-hidden flex flex-col md:flex-row">
            
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Left Side: Profile View */}
            <div className="w-full md:w-5/12 bg-surface p-8 border-r border-white/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {editUserData.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{editUserData.username}</h3>
                    <p className="text-sm text-gray-400">{editUserData.role}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-gray-500 mb-1">User ID</p>
                    <p className="text-sm text-gray-300 font-mono break-all">{editUserData._id}</p>
                  </div>
                  <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-gray-500 mb-1">Trạng thái tài khoản</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${editUserData.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <p className={`text-sm font-medium ${editUserData.status === 'Active' ? 'text-green-400' : 'text-red-400'}`}>
                        {editUserData.status === 'Active' ? 'Đang hoạt động' : 'Bị cấm (Banned)'}
                      </p>
                    </div>
                  </div>
                  <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-gray-500 mb-1">Ngày tham gia</p>
                    <p className="text-sm text-gray-300">
                      {editUserData.createdAt ? new Date(editUserData.createdAt).toLocaleDateString('vi-VN', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      }) : 'Không rõ'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <button
                  onClick={async () => {
                    await handleToggleStatus(editUserData._id, editUserData.status);
                    setIsEditModalOpen(false);
                  }}
                  disabled={editUserData.email === 'admin@cinemahub.com'}
                  className={`w-full py-3 px-4 rounded-xl font-bold transition-all flex justify-center items-center gap-2 ${
                    editUserData.status === 'Active' 
                    ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20' 
                    : 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/20'
                  } ${editUserData.email === 'admin@cinemahub.com' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {editUserData.status === 'Active' ? (
                    <><Lock className="w-5 h-5" /> Ban User (Khóa tài khoản)</>
                  ) : (
                    <><Unlock className="w-5 h-5" /> Unban (Mở khóa tài khoản)</>
                  )}
                </button>
              </div>
            </div>

            {/* Right Side: Edit Form */}
            <div className="w-full md:w-7/12 p-8 bg-[#121212]">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
                  <Edit2 className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-display font-bold text-white">Chỉnh sửa thông tin</h2>
              </div>
              
              {editError && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                  {editError}
                </div>
              )}

              <form onSubmit={handleEditUser} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-400 pl-1">Tên hiển thị</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-400 transition-colors">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={editUserData.username}
                      onChange={(e) => setEditUserData({...editUserData, username: e.target.value})}
                      className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                      placeholder="Nhập tên người dùng"
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-400 pl-1">Địa chỉ Email</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-400 transition-colors">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      required
                      value={editUserData.email}
                      onChange={(e) => setEditUserData({...editUserData, email: e.target.value})}
                      className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                      placeholder="example@gmail.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-400 pl-1">Số điện thoại</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-400 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                    </div>
                    <input
                      type="text"
                      value={editUserData.phoneNumber}
                      onChange={(e) => setEditUserData({...editUserData, phoneNumber: e.target.value})}
                      className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                      placeholder="Chưa cập nhật"
                    />
                  </div>
                </div>

                <div className="pt-8">
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {editLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      'Lưu thay đổi hồ sơ'
                    )}
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* Session Expired Modal */}
      {isSessionExpired && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md transition-all duration-300">
          <div className="w-full max-w-sm bg-[#121212] p-8 rounded-3xl border border-red-500/30 relative shadow-[0_0_50px_rgba(229,9,20,0.3)] transform animate-in fade-in zoom-in duration-300 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <Lock className="w-10 h-10 text-red-500" />
            </div>
            
            <h2 className="text-2xl font-display font-bold text-white mb-3">Hết phiên đăng nhập</h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Vì lý do bảo mật, phiên làm việc của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục sử dụng hệ thống.
            </p>
            
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="w-full py-3.5 px-4 bg-primary hover:bg-red-700 text-white rounded-2xl font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(229,9,20,0.4)] hover:shadow-[0_0_30px_rgba(229,9,20,0.6)] flex justify-center items-center gap-2"
            >
              Đăng nhập lại ngay
            </button>
          </div>
        </div>
      )}

      {/* Permission Modal */}
      {isPermModalOpen && selectedPermUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#18181b] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl transform transition-all">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-[#1f1f23]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-white">Phân quyền chi tiết</h2>
                  <p className="text-xs text-gray-400">User: <span className="text-purple-400">{selectedPermUser.username}</span></p>
                </div>
              </div>
              <button 
                onClick={() => setIsPermModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {AVAILABLE_PERMISSIONS.map((perm) => (
                  <label 
                    key={perm.id} 
                    className="flex items-start gap-4 p-4 rounded-2xl border border-gray-800 bg-[#121212] cursor-pointer hover:border-purple-500/50 transition-colors group"
                  >
                    <div className="relative flex items-center mt-0.5">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(perm.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPermissions([...selectedPermissions, perm.id]);
                          } else {
                            setSelectedPermissions(selectedPermissions.filter(id => id !== perm.id));
                          }
                        }}
                        className="w-5 h-5 appearance-none rounded-md border-2 border-gray-600 checked:border-purple-500 checked:bg-purple-500 transition-all cursor-pointer peer"
                      />
                      <CheckSquare className="w-3.5 h-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex-1">
                      <span className="block text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                        {perm.label}
                      </span>
                      <span className="block text-xs text-gray-500 mt-1 font-mono">
                        {perm.id}
                      </span>
                    </div>
                  </label>
                ))}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPermModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-500 transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_25px_rgba(147,51,234,0.5)]"
                >
                  Lưu Quyền
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permission Modal */}
      {isPermModalOpen && selectedPermUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#18181b] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl transform transition-all">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-[#1f1f23]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-white">Phân quyền chi tiết</h2>
                  <p className="text-xs text-gray-400">User: <span className="text-purple-400">{selectedPermUser.username}</span></p>
                </div>
              </div>
              <button 
                onClick={() => setIsPermModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {AVAILABLE_PERMISSIONS.map((perm) => (
                  <label 
                    key={perm.id} 
                    className="flex items-start gap-4 p-4 rounded-2xl border border-gray-800 bg-[#121212] cursor-pointer hover:border-purple-500/50 transition-colors group"
                  >
                    <div className="relative flex items-center mt-0.5">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(perm.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPermissions([...selectedPermissions, perm.id]);
                          } else {
                            setSelectedPermissions(selectedPermissions.filter(id => id !== perm.id));
                          }
                        }}
                        className="w-5 h-5 appearance-none rounded-md border-2 border-gray-600 checked:border-purple-500 checked:bg-purple-500 transition-all cursor-pointer peer"
                      />
                      <CheckSquare className="w-3.5 h-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex-1">
                      <span className="block text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                        {perm.label}
                      </span>
                      <span className="block text-xs text-gray-500 mt-1 font-mono">
                        {perm.id}
                      </span>
                    </div>
                  </label>
                ))}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPermModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-500 transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_25px_rgba(147,51,234,0.5)]"
                >
                  Lưu Quyền
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
