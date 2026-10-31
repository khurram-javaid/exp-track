import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import AuthContext from './AuthContext';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in on mount
    const checkAuth = async () => {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
      } catch (error) {
        if (error.response?.status !== 401) {
          console.error('Could not verify the current session:', error.message);
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const register = async (userData) => {
    const response = await api.post('/auth/register', userData);
    setUser(response.data.user);
    return response.data;
  };

  const login = async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    setUser(response.data.user);
    return response.data;
  };

  const updateCurrency = useCallback(async currency => {
    const response = await api.patch('/auth/currency', { currency });
    setUser(response.data.user);
    return response.data.user;
  }, []);

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    navigate('/login');
  };

  const value = {
    user,
    loading,
    register,
    login,
    updateCurrency,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="loading-state auth-loading" role="status">
          <span className="loading-spinner" />
          Checking your session…
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};