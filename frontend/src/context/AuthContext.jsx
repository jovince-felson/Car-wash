import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api';
import { getSocket, disconnectSocket } from '../api/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [notifications, setNotifications] = useState([]);

  // Boot: verify stored token
  useEffect(() => {
    const token = localStorage.getItem('sw_token');
    if (!token) { setLoading(false); return; }
    authApi.me()
      .then(res => setUser(res.user))
      .catch(() => localStorage.removeItem('sw_token'))
      .finally(() => setLoading(false));
  }, []);

  // Wire socket notifications once user is known
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('sw_token');
    const socket = getSocket(token); // pass JWT to socket

    const handlers = {
      'notification':     (d) => addNotification(d),
      'booking:new':      (d) => addNotification({ type: 'info',    message: `New booking from ${d.booking?.customerName}` }),
      'booking:completed':(d) => addNotification({ type: 'success', message: `Booking completed — ₹${d.amount} collected` }),
      'inventory:low':    (d) => addNotification({ type: 'warning', message: `Low stock: ${d.item} (${d.quantity} left)` }),
      'geofence:arrived': (d) => addNotification({ type: 'success', message: d.message }),
    };

    Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn));
    return () => Object.entries(handlers).forEach(([ev, fn]) => socket.off(ev, fn));
  }, [user]);

  const addNotification = useCallback((n) => {
    setNotifications(prev => [{ ...n, id: Date.now() + Math.random(), time: new Date().toISOString() }, ...prev].slice(0, 50));
  }, []);

  async function login(creds) {
    const res = await authApi.login(creds);
    localStorage.setItem('sw_token', res.token);
    setUser(res.user);
    return res;
  }

  function logout() {
    localStorage.removeItem('sw_token');
    setUser(null);
    setNotifications([]);
    disconnectSocket();
  }

  function clearNotifications() { setNotifications([]); }

  return (
    <AuthContext.Provider value={{ user, loading, notifications, login, logout, clearNotifications, addNotification }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be within AuthProvider');
  return ctx;
}
