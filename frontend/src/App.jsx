import { lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useAuthStore from './store/useAuthStore';
import useUIStore from './store/useUIStore';
import AppShell from './layouts/AppShell';
import AuthPage from './pages/AuthPage';
import { SkeletonCard } from './components/ui/Skeleton';

// Lazy-loaded pages for route splitting
const OverviewPage     = lazy(() => import('./pages/OverviewPage'));
const AnalyticsPage    = lazy(() => import('./pages/AnalyticsPage'));
const ChatPage         = lazy(() => import('./pages/ChatPage'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const AnomaliesPage    = lazy(() => import('./pages/AnomaliesPage'));
const HistoryPage      = lazy(() => import('./pages/HistoryPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PAGE_MAP = {
  overview:     <OverviewPage />,
  analytics:    <AnalyticsPage />,
  chat:         <ChatPage />,
  transactions: <TransactionsPage />,
  anomalies:    <AnomaliesPage />,
  history:      <HistoryPage />,
};

function PageFallback() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={4} />)}
    </div>
  );
}

function Dashboard() {
  const activePage = useUIStore((s) => s.activePage);

  return (
    <AppShell>
      <Suspense fallback={<PageFallback />}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {PAGE_MAP[activePage] || <OverviewPage />}
          </motion.div>
        </AnimatePresence>
      </Suspense>
    </AppShell>
  );
}

export default function App() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  return (
    <QueryClientProvider client={queryClient}>
      <AnimatePresence mode="wait">
        {isLoggedIn ? (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Dashboard />
          </motion.div>
        ) : (
          <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AuthPage />
          </motion.div>
        )}
      </AnimatePresence>
    </QueryClientProvider>
  );
}
