import { create } from 'zustand';
import { getToken, clearToken } from '../services/api';

const useAuthStore = create((set) => ({
  isLoggedIn: !!getToken(),
  isLoading: false,

  setLoggedIn: (val) => set({ isLoggedIn: val }),
  setLoading: (val) => set({ isLoading: val }),

  logout: () => {
    clearToken();
    set({ isLoggedIn: false });
  },
}));

// Sync with storage events (multi-tab support)
window.addEventListener('auth-change', () => {
  useAuthStore.getState().setLoggedIn(!!getToken());
});

export default useAuthStore;
