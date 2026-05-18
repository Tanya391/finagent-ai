import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import useUIStore from '../store/useUIStore';

export default function AppShell({ children }) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a14] text-slate-900 dark:text-slate-100 font-sans">
      <Sidebar />
      <motion.div
        animate={{ marginLeft: sidebarOpen ? 240 : 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="flex flex-col min-h-screen"
      >
        <Topbar />
        <main className="flex-1 p-4 sm:p-6 max-w-screen-2xl mx-auto w-full">
          {children}
        </main>
      </motion.div>
    </div>
  );
}
