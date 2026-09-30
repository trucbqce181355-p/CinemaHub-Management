import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return null;

      const parsedUser = JSON.parse(storedUser);
      // Kiểm tra token còn hạn hay không trước khi khởi tạo
      if (parsedUser?.token) {
        const payload = JSON.parse(atob(parsedUser.token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          return parsedUser;
        }
        localStorage.removeItem('user');
      }
      return null;
    } catch (e) {
      console.error('Error reading/validating user from localStorage', e);
      localStorage.removeItem('user');
      return null;
    }
  });

  const [isSessionExpired, setIsSessionExpired] = useState(false);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  useEffect(() => {
    // Tự động kiểm tra hạn token định kỳ mỗi giây khi user đăng nhập
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
    </AuthContext.Provider>
  );
};