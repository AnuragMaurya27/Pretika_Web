import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { walletAPI, notificationsAPI } from '../api/index';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { user } = useAuth();
  const [walletBalance, setWalletBalance] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshWallet = useCallback(async () => {
    if (!user) return;
    try {
      const res = await walletAPI.getWallet();
      setWalletBalance(res.data.data?.coin_balance ?? 0);
    } catch { /* ignore */ }
  }, [user]);

  const refreshUnread = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationsAPI.getUnreadCount();
      setUnreadCount(res.data.data?.unread_count ?? 0);
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshWallet();
      refreshUnread();
      const interval = setInterval(refreshUnread, 30000);
      return () => clearInterval(interval);
    } else {
      setWalletBalance(0);
      setUnreadCount(0);
    }
  }, [user, refreshWallet, refreshUnread]);

  return (
    <AppContext.Provider value={{ walletBalance, unreadCount, refreshWallet, refreshUnread, setUnreadCount }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
