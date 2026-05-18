import { motion } from 'framer-motion';

export default function KPICard({ label, value, sub, trend, color = '', icon, delay = 0 }) {
  const trendUp = trend > 0;
  const trendDown = trend < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="p-5 rounded-2xl border transition-shadow hover:shadow-lg
        bg-white dark:bg-[#13131f]
        border-slate-200 dark:border-[#1e1e30]
        hover:shadow-violet-500/5 dark:hover:shadow-violet-500/10"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 dark:bg-violet-500/15 flex items-center justify-center text-violet-500 dark:text-violet-400">
            {icon}
          </div>
        )}
      </div>
      <p className={`text-2xl font-bold ${color || 'text-slate-900 dark:text-white'}`}>{value}</p>
      <div className="flex items-center gap-2 mt-1.5">
        {sub && <p className="text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
        {trend != null && (
          <span className={`text-xs font-semibold ${trendUp ? 'text-red-400' : trendDown ? 'text-emerald-400' : 'text-slate-400'}`}>
            {trendUp ? '▲' : trendDown ? '▼' : '—'} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </motion.div>
  );
}
