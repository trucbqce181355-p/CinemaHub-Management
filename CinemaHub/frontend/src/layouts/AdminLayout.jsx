import { Outlet, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Clapperboard, Users, Film, Calendar, LogOut, LayoutDashboard, Settings } from 'lucide-react';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user || !['Admin', 'Manager', 'Staff'].includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavItems = () => {
    const items = [{ name: 'Tổng quan', path: '/admin', icon: <LayoutDashboard className="w-5 h-5" /> }];
    
    if (user.role === 'Admin') {
      items.push({ name: 'Người dùng', path: '/admin/users', icon: <Users className="w-5 h-5" /> });
      items.push({ name: 'Cài đặt', path: '/admin/settings', icon: <Settings className="w-5 h-5" /> });
    }
    
    if (user.role === 'Admin' || user.role === 'Manager') {
      items.push({ name: 'Phim', path: '/admin/movies', icon: <Film className="w-5 h-5" /> });
    }
    
    if (user.role === 'Admin' || user.role === 'Manager' || user.role === 'Staff') {
      items.push({ name: 'Lịch chiếu', path: '/admin/showtimes', icon: <Calendar className="w-5 h-5" /> });
    }
    
    // Sắp xếp lại thứ tự cho đẹp
    const order = ['/admin', '/admin/users', '/admin/movies', '/admin/showtimes', '/admin/settings'];
    items.sort((a, b) => order.indexOf(a.path) - order.indexOf(b.path));
    
    return items;
  };

  const navItems = getNavItems();

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-white/5 flex flex-col hidden md:flex">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-primary p-2 rounded-lg group-hover:shadow-[0_0_15px_rgba(229,9,20,0.8)] transition-all duration-300">
              <Clapperboard className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-display font-bold tracking-wider">
              {user.role}<span className="text-primary">Panel</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item, idx) => (
            <Link
              key={idx}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/admin')
                  ? 'bg-primary/20 text-primary font-medium border border-primary/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-4 px-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-orange-500 flex items-center justify-center shadow-lg text-white font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-primary">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Topbar for mobile */}
        <header className="md:hidden flex items-center justify-between p-4 bg-surface border-b border-white/5">
           <span className="text-xl font-display font-bold">Admin<span className="text-primary">Panel</span></span>
           <button onClick={handleLogout} className="text-gray-400"><LogOut className="w-5 h-5" /></button>
        </header>

        <div className="flex-1 overflow-auto p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
