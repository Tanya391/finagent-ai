import { motion } from 'framer-motion';
import { useAnomalies, useSubscriptions } from '../hooks/useAnalytics';
import { SkeletonCard } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';

function SeverityBadge({ z }) {
  if (z >= 4) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 uppercase">Critical</span>;
  if (z >= 3) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-500 uppercase">High</span>;
  return       <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 uppercase">Medium</span>;
}

function Panel({ title, badge, badgeCls = 'bg-violet-500/10 text-violet-600 dark:text-violet-400', children }) {
  return (
    <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-slate-200 dark:border-[#1e1e30] p-5">
      <div className="flex items-center gap-2 mb-5">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${badgeCls}`}>{badge}</span>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function AnomaliesPage() {
  const { data: anomalies = [], isLoading, error, refetch } = useAnomalies();
  const { data: subs = [], isLoading: subLoading } = useSubscriptions();

  return (
    <div className="space-y-6">
      {/* Anomalies */}
      <Panel title="Unusual Spending Detected" badge="Anomalies" badgeCls="bg-red-500/10 text-red-500">
        {isLoading && <SkeletonCard lines={5} />}
        {error && <ErrorState message={error.message} onRetry={refetch} />}

        {!isLoading && !error && anomalies.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No unusual spending detected</p>
            <p className="text-xs text-slate-400 mt-1">Your spending patterns look normal.</p>
          </div>
        )}

        <div className="space-y-3">
          {anomalies.map((row, i) => (
            <motion.div
              key={row.transaction_id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between p-4 bg-red-500/5 rounded-xl border border-red-500/15"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize truncate">
                    {(row.normalized_merchant || row.receiver || '').replace(/_/g, ' ')}
                  </p>
                  <SeverityBadge z={row.z_score} />
                </div>
                <p className="text-xs text-slate-400">{row.date} · {row.category} · z-score: {row.z_score}</p>
                <p className="text-xs text-slate-400 mt-0.5">Category avg: ₹{Number(row.category_mean).toLocaleString('en-IN')}</p>
              </div>
              <div className="text-right ml-4 shrink-0">
                <p className="text-base font-bold text-red-500">₹{Number(row.amount).toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-red-400">{Math.round((row.amount / row.category_mean - 1) * 100)}% above avg</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Panel>

      {/* Subscriptions */}
      <Panel title="Subscription Charges" badge="Recurring" badgeCls="bg-violet-500/10 text-violet-600 dark:text-violet-400">
        {subLoading && <SkeletonCard lines={4} />}

        {!subLoading && subs.length === 0 && (
          <p className="text-sm text-slate-400 italic text-center py-8">No recurring charges detected yet.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {subs.map((row, i) => (
            <motion.div
              key={row.merchant}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/15"
            >
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize mb-2">
                {row.merchant.replace(/_/g, ' ')}
              </p>
              <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                ₹{Number(row.avg_amount).toLocaleString('en-IN')}
                <span className="text-xs font-normal text-slate-400 ml-1">/mo</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1.5">
                {row.occurrences} charges · ₹{Number(row.total_charged).toLocaleString('en-IN')} total
              </p>
              {row.last_date && <p className="text-[10px] text-slate-400">Last: {row.last_date}</p>}
            </motion.div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
