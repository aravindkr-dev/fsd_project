import { createContext, useContext, useState } from 'react';
import api, { loadAuth, saveAuth } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadAuth);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    saveAuth(data);
    setAuth(data);
    return data.user;
  };
  const logout = () => {
    saveAuth(null);
    setAuth(null);
  };

  return <AuthContext.Provider value={{ user: auth?.user ?? null, login, logout }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
