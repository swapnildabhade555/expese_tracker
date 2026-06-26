import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Simulate Login
  const login = async (userData) => {
    setIsLoading(true);
    setError(null);
    try {
      // API Call Simulation
      await new Promise(resolve => setTimeout(resolve, 1000));
      const fakeUser = { name: 'Test User', token: '12345', email: userData.email };
      setUser(fakeUser);
    } catch (err) {
      setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom Hook for easier usage
export const useAuth = () => useContext(AuthContext);
