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
    </AuthContext.Provider>
  );
};
