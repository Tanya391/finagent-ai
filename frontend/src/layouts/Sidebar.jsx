import { motion, AnimatePresence } from 'framer-motion';
import useUIStore from '../store/useUIStore';
import useAuthStore from '../store/useAuthStore';
import { authService } from '../services/api';

const NAV_ITEMS = [
  {
    id: 'overview', label: 'Overview',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    id: 'analytics', label: 'Analytics',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'chat', label: 'AI Assistant',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    id: 'transactions', label: 'Transactions',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    id: 'anomalies', label: 'Anomalies',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    id: 'history', label: 'Query History',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const { sidebarOpen, activePage, setActivePage } = useUIStore();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    await authService.logout();
    logout();
  };

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.aside
          initial={{ x: -240, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -240, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="fixed left-0 top-0 h-full w-60 z-40 flex flex-col
            bg-white dark:bg-[#0d0d1a]
            border-r border-slate-200 dark:border-[#1e1e30]
            shadow-xl shadow-black/5 dark:shadow-black/40"
        >
          {/* Logo */}
          <div className="px-5 py-5 border-b border-slate-100 dark:border-[#1e1e30]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 gradient-brand rounded-xl flex items-center justify-center glow-violet">
                <span className="text-white font-black text-xs">FA</span>
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight">FinAgent AI</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-medium">Intelligence</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest px-3 py-2">Navigation</p>
            {NAV_ITEMS.map((item) => {
              const active = activePage === item.id;
              return (
                <motion.button
                  key={item.id}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActivePage(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                    active
                      ? 'bg-violet-500/10 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1a1a2e] hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-500 rounded-full"
                    />
                  )}
                  <span className={active ? 'text-violet-500 dark:text-violet-400' : ''}>{item.icon}</span>
                  {item.label}
                </motion.button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-slate-100 dark:border-[#1e1e30]">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
