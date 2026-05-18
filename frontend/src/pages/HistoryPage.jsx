import { motion } from 'framer-motion';
import useChatStore from '../store/useChatStore';
import useUIStore from '../store/useUIStore';

const ROUTE_BADGE = {
  analytics: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  retrieval: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  rag:       'bg-violet-500/10 text-violet-600 dark:text-violet-400',
};

export default function HistoryPage() {
  const { queryHistory, clearChat } = useChatStore();
  const setActivePage = useUIStore((s) => s.setActivePage);

  const rerun = (question) => {
    setActivePage('chat');
    window.__pendingChatQuestion = question;
  };

  if (queryHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-12 h-12 bg-slate-100 dark:bg-[#1e1e30] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">No query history yet</p>
        <p className="text-xs text-slate-400">Your AI assistant queries will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-slate-400">{queryHistory.length} queries</p>
      </div>

      {queryHistory.map((entry, i) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="bg-white dark:bg-[#13131f] rounded-xl border border-slate-200 dark:border-[#1e1e30] p-4 flex items-center justify-between gap-4 hover:border-violet-200 dark:hover:border-violet-500/30 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{entry.question}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <p className="text-[10px] text-slate-400 font-mono">{new Date(entry.timestamp).toLocaleString()}</p>
              {entry.intent && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-[#1e1e30] text-slate-500 dark:text-slate-400 uppercase">
                  {entry.intent}
                </span>
              )}
              {entry.route && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase ${ROUTE_BADGE[entry.route] || ''}`}>
                  {entry.route}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => rerun(entry.question)}
            className="shrink-0 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 transition-colors flex items-center gap-1"
          >
            Re-run
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </motion.div>
      ))}
    </div>
  );
}
