import { motion } from 'framer-motion';
import useUIStore from '../store/useUIStore';
import { useServerStatus } from '../hooks/useAnalytics';

const PAGE_TITLES = {
  overview:     'Overview',
  analytics:    'Spending Analytics',
  chat:         'AI Assistant',
  transactions: 'Transaction Explorer',
  anomalies:    'Anomaly Detection',
  history:      'Query History',
};

export default function Topbar() {
  const { isDarkMode, toggleTheme, toggleSidebar, activePage } = useUIStore();
  const { data: statusData } = useServerStatus();
  const isOnline = statusData?.status === 'ok';

  return (
    <header className="h-14 flex items-center px-4 gap-4 sticky top-0 z-30
      bg-white/80 dark:bg-[#0d0d1a]/80 backdrop-blur-xl
      border-b border-slate-200 dark:border-[#1e1e30]">

      {/* Sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1a1a2e] hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        aria-label="Toggle sidebar"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Page title */}
      <motion.h1
        key={activePage}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="font-semibold text-slate-900 dark:text-white text-sm"
      >
        {PAGE_TITLES[activePage] || 'FinAgent AI'}
      </motion.h1>

      <div className="flex-1" />

      {/* Server status */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#1a1a2e]">
        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:block">
          {isOnline ? 'Connected' : 'Offline'}
        </span>
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1a1a2e] hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        aria-label="Toggle theme"
      >
        {isDarkMode ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>
    </header>
  );
}
