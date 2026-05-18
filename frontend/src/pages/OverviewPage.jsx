import { motion } from 'framer-motion';
import KPICard from '../components/ui/KPICard';
import { SkeletonStat } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import MonthlyAreaChart from '../charts/MonthlyAreaChart';
import NetCashflowLine from '../charts/NetCashflowLine';
import { useCashflow, useMonthlySummary, useCategoryBreakdown, useTopMerchants, useSubscriptions } from '../hooks/useAnalytics';

const IconIncome = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconExpense = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);
const IconSavings = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);
const IconSub = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);
const IconTag = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);
const IconStore = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);
const IconList = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

function ChartCard({ title, badge, children }) {
  return (
    <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-slate-200 dark:border-[#1e1e30] p-5">
      <div className="flex items-center gap-2 mb-5">
        {badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 uppercase tracking-wide">
            {badge}
          </span>
        )}
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function OverviewPage() {
  const { data: cashflow, isLoading: cfLoading, error: cfError, refetch: cfRefetch } = useCashflow();
  const { data: monthly = [], isLoading: mLoading } = useMonthlySummary();
  const { data: categories = [] } = useCategoryBreakdown();
  const { data: merchants = [] } = useTopMerchants(5);
  const { data: subs = [] } = useSubscriptions();

  const thisMonth = monthly[monthly.length - 1];
  const lastMonth = monthly[monthly.length - 2];
  const savingsRate = cashflow?.income > 0
    ? Math.round(((cashflow.income - cashflow.expense) / cashflow.income) * 100)
    : null;
  const topCategory = categories[0];
  const topMerchant = merchants[0];
  const expenseTrend = thisMonth && lastMonth && lastMonth.expense > 0
    ? Math.round(((thisMonth.expense - lastMonth.expense) / lastMonth.expense) * 100)
    : null;

  return (
    <div className="space-y-6">
      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cfLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)
          : cfError
          ? <div className="col-span-4"><ErrorState message={cfError.message} onRetry={cfRefetch} /></div>
          : <>
              <KPICard label="Monthly Income"  value={`₹${Number(cashflow?.income  || 0).toLocaleString('en-IN')}`} sub={`${cashflow?.income_count  || 0} credits`} color="text-emerald-500" icon={<IconIncome />}  delay={0}    />
              <KPICard label="Monthly Expense" value={`₹${Number(cashflow?.expense || 0).toLocaleString('en-IN')}`} sub={`${cashflow?.expense_count || 0} debits`}  color="text-red-400"    icon={<IconExpense />} delay={0.05} trend={expenseTrend} />
              <KPICard label="Net Savings"     value={`₹${Number(cashflow?.net     || 0).toLocaleString('en-IN')}`} sub={savingsRate != null ? `${savingsRate}% rate` : ''} color={cashflow?.net >= 0 ? 'text-emerald-500' : 'text-red-400'} icon={<IconSavings />} delay={0.1} />
              <KPICard label="Subscriptions"   value={subs.length} sub={subs.length > 0 ? `₹${subs.reduce((a, s) => a + s.avg_amount, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo` : 'None detected'} icon={<IconSub />} delay={0.15} />
            </>
        }
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard label="Top Category"   value={topCategory  ? topCategory.category.replace(/_/g, ' ')   : '—'} sub={topCategory  ? `₹${Number(topCategory.total).toLocaleString('en-IN')}`  : 'No data'} icon={<IconTag />}   delay={0.2} />
        <KPICard label="Top Merchant"   value={topMerchant  ? topMerchant.merchant.replace(/_/g, ' ')   : '—'} sub={topMerchant  ? `₹${Number(topMerchant.total).toLocaleString('en-IN')}`  : 'No data'} icon={<IconStore />} delay={0.25} />
        <KPICard label="Transactions"   value={thisMonth?.count || 0} sub={thisMonth ? thisMonth.month : 'No data'} icon={<IconList />}  delay={0.3} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Income vs Expense" badge="TRENDS">
          {mLoading
            ? <div className="h-60 animate-pulse bg-slate-100 dark:bg-[#1e1e30] rounded-xl" />
            : <MonthlyAreaChart data={monthly.slice(-6)} />}
        </ChartCard>
        <ChartCard title="Net Cashflow" badge="MONTHLY">
          {mLoading
            ? <div className="h-48 animate-pulse bg-slate-100 dark:bg-[#1e1e30] rounded-xl" />
            : <NetCashflowLine data={monthly.slice(-6)} />}
        </ChartCard>
      </div>
    </div>
  );
}
