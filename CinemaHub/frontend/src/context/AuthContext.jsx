import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check localStorage on load
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // Verify token hasn't expired before auto-login
      if (parsedUser.token) {
        try {
          const payload = JSON.parse(atob(parsedUser.token.split('.')[1]));
          if (payload.exp * 1000 > Date.now()) {
            setUser(parsedUser);
          } else {
            localStorage.removeItem('user');
          }
        } catch (e) {
          localStorage.removeItem('user');
        }
      }
    }
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const [isSessionExpired, setIsSessionExpired] = useState(false);

  useEffect(() => {
    // Auto-check token expiration every second for ALL accounts
    const interval = setInterval(() => {
      if (user && user.token) {
        try {
          const payload = JSON.parse(atob(user.token.split('.')[1]));
          if (payload.exp * 1000 < Date.now()) {
            setIsSessionExpired(true);
            logout();
          }
        } catch (e) {
          console.error('Invalid token format');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, isSessionExpired, setIsSessionExpired }}>
      {children}
      
      {/* Global Session Expired Modal */}
      {isSessionExpired && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md transition-all duration-300">
          <div className="w-full max-w-sm bg-[#121212] p-8 rounded-3xl border border-red-500/30 relative shadow-[0_0_50px_rgba(229,9,20,0.3)] transform animate-in fade-in zoom-in duration-300 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <svg className="w-10 h-10 text-red-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-3">Hết phiên đăng nhập</h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Vì lý do bảo mật, phiên làm việc của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục sử dụng hệ thống.
            </p>
            
            <button
              onClick={() => {
                setIsSessionExpired(false);
                window.location.href = '/login';
              }}
              className="w-full py-3.5 px-4 bg-[#e31837] hover:bg-red-700 text-white rounded-xl font-bold tracking-wide transition-all shadow-lg shadow-red-500/20"
            >
              Đăng nhập lại
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};
