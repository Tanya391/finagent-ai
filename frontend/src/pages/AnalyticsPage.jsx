import { motion } from 'framer-motion';
import CategoryPieChart from '../charts/CategoryPieChart';
import MerchantBarChart from '../charts/MerchantBarChart';
import MonthlyAreaChart from '../charts/MonthlyAreaChart';
import { SkeletonCard } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import { useCategoryBreakdown, useTopMerchants, useMonthlySummary, useSubscriptions } from '../hooks/useAnalytics';

function Panel({ title, badge, children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`bg-white dark:bg-[#13131f] rounded-2xl border border-slate-200 dark:border-[#1e1e30] p-5 ${className}`}
    >
      <div className="flex items-center gap-2 mb-5">
        {badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 uppercase tracking-wide">
            {badge}
          </span>
        )}
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

const BAR_COLORS = [
  'bg-violet-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500',   'bg-sky-500',  'bg-fuchsia-500', 'bg-lime-500',
];

function ProgressBar({ label, value, max, count, colorClass }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">{label.replace(/_/g, ' ')}</span>
        <span className="text-slate-400 dark:text-slate-500">₹{Number(value).toLocaleString('en-IN')} · {count}</span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-[#1e1e30] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className={`h-1.5 ${colorClass} rounded-full`}
        />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: categories = [], isLoading: catLoading, error: catError, refetch: catRefetch } = useCategoryBreakdown();
  const { data: merchants  = [], isLoading: merLoading } = useTopMerchants(8);
  const { data: monthly    = [], isLoading: monLoading } = useMonthlySummary();
  const { data: subs       = [], isLoading: subLoading } = useSubscriptions();

  const maxCat = categories.length > 0 ? Math.max(...categories.map((d) => d.total)) : 1;

  return (
    <div className="space-y-6">

      {/* Category row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Spending by Category" badge="PIE CHART">
          {catLoading
            ? <div className="h-64 animate-pulse bg-slate-100 dark:bg-[#1e1e30] rounded-xl" />
            : catError
            ? <ErrorState message={catError.message} onRetry={catRefetch} />
            : <CategoryPieChart data={categories} />}
        </Panel>

        <Panel title="Category Breakdown" badge="RANKED">
          {catLoading
            ? <SkeletonCard lines={6} />
            : (
              <div className="space-y-3">
                {categories.slice(0, 8).map((row, i) => (
                  <ProgressBar
                    key={row.category}
                    label={row.category}
                    value={row.total}
                    max={maxCat}
                    count={row.count}
                    colorClass={BAR_COLORS[i % BAR_COLORS.length]}
                  />
                ))}
              </div>
            )}
        </Panel>
      </div>

      {/* Monthly trends */}
      <Panel title="Monthly Income vs Expense" badge="AREA CHART">
        {monLoading
          ? <div className="h-56 animate-pulse bg-slate-100 dark:bg-[#1e1e30] rounded-xl" />
          : <MonthlyAreaChart data={monthly} />}
      </Panel>

      {/* Merchants row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Top Merchants" badge="BAR CHART">
          {merLoading
            ? <div className="h-56 animate-pulse bg-slate-100 dark:bg-[#1e1e30] rounded-xl" />
            : <MerchantBarChart data={merchants} />}
        </Panel>

        <Panel title="Merchant Leaderboard" badge="TOP 8">
          {merLoading
            ? <SkeletonCard lines={8} />
            : (
              <div className="space-y-1.5">
                {merchants.map((row, idx) => (
                  <div
                    key={row.merchant}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1a1a2e] hover:bg-violet-50 dark:hover:bg-violet-500/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-300 dark:text-slate-600 w-4 text-right">{idx + 1}</span>
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 capitalize">
                        {row.merchant.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">₹{Number(row.total).toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-slate-400">{row.count} txns</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </Panel>
      </div>

      {/* Subscriptions */}
      <Panel title="Recurring Subscriptions" badge="DETECTED">
        {subLoading
          ? <SkeletonCard lines={4} />
          : subs.length === 0
          ? <p className="text-sm text-slate-400 italic py-6 text-center">No recurring charges detected yet.</p>
          : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {subs.map((row) => (
                <div
                  key={row.merchant}
                  className="p-4 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20"
                >
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize mb-2">
                    {row.merchant.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xl font-bold text-violet-600 dark:text-violet-400">
                    ₹{Number(row.avg_amount).toLocaleString('en-IN')}
                    <span className="text-xs font-normal text-slate-400 ml-1">/mo</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    {row.occurrences}× · ₹{Number(row.total_charged).toLocaleString('en-IN')} total
                  </p>
                </div>
              ))}
            </div>
          )}
      </Panel>
    </div>
  );
}
