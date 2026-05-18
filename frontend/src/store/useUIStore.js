import { create } from 'zustand';

const useUIStore = create((set) => ({
  // Theme
  isDarkMode: (() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  })(),

  toggleTheme: () =>
    set((state) => {
      const next = !state.isDarkMode;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', next);
      return { isDarkMode: next };
    }),

  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Active nav page
  activePage: 'overview',
  setActivePage: (page) => set({ activePage: page }),

  // Global filters
  filters: {
    dateFrom: '',
    dateTo: '',
    category: '',
    transactionType: '',
  },
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: { dateFrom: '', dateTo: '', category: '', transactionType: '' } }),
}));

// Apply initial theme
const { isDarkMode } = useUIStore.getState();
document.documentElement.classList.toggle('dark', isDarkMode);

export default useUIStore;
