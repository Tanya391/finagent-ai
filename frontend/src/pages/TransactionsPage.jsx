import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiService } from '../services/api';

const TYPE_PILL = {
  debit:  'bg-red-500/10 text-red-500 dark:text-red-400',
  credit: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

function TransactionRow({ tx, expanded, onToggle }) {
  return (
    <motion.div
      layout
      className="bg-white dark:bg-[#13131f] rounded-xl border border-slate-200 dark:border-[#1e1e30] overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 dark:hover:bg-[#1a1a2e] transition-colors"
      >
        {/* Amount */}
        <div className="shrink-0 w-28 text-right">
          <p className={`text-sm font-bold ${tx.transaction_type === 'credit' ? 'text-emerald-500' : 'text-red-400'}`}>
            {tx.transaction_type === 'credit' ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
          </p>
        </div>

        {/* Merchant */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate capitalize">
            {(tx.normalized_merchant || tx.receiver || '').replace(/_/g, ' ')}
          </p>
          <p className="text-xs text-slate-400 truncate">{tx.description}</p>
        </div>

        {/* Date */}
        <p className="text-xs text-slate-400 shrink-0 hidden sm:block font-mono">{tx.date}</p>

        {/* Type pill */}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0 ${TYPE_PILL[tx.transaction_type] || ''}`}>
          {tx.transaction_type}
        </span>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-[#1e1e30] grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                ['Category',  tx.category?.replace(/_/g, ' ')],
                ['Merchant',  tx.normalized_merchant?.replace(/_/g, ' ')],
                ['Date',      tx.date],
                ['Score',     tx.final_score?.toFixed(3) ?? '—'],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5 tracking-wide">{label}</p>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 capitalize">{val || '—'}</p>
                </div>
              ))}
              <div className="col-span-2 sm:col-span-4">
                <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5 tracking-wide">Transaction ID</p>
                <p className="text-[10px] font-mono text-slate-400 break-all">{tx.transaction_id}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const QUICK_FILTERS = ['groceries', 'food delivery', 'subscriptions', 'travel', 'salary', 'amazon'];

export default function TransactionsPage() {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(20);
  const [results, setResults] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setHasSearched(true);
    try {
      const data = await aiService.retrieve(query, topK);
      setResults(Array.isArray(data?.results) ? data.results : []);
      setMeta({ intent: data?.parsed_intent, count: data?.count });
    } catch (err) {
      setError(err.message || 'Retrieval failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-5">
      {/* Search panel */}
      <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-slate-200 dark:border-[#1e1e30] p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Semantic Transaction Search</h2>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g. "food spending", "amazon purchases", "travel last month"'
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1a1a2e] border border-slate-200 dark:border-[#1e1e30] text-slate-900 dark:text-slate-100 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
          />
          <div className="flex gap-2 shrink-0">
            <select
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1a1a2e] border border-slate-200 dark:border-[#1e1e30] text-slate-700 dark:text-slate-300 text-sm focus:outline-none"
            >
              {[10, 20, 50].map((n) => <option key={n} value={n}>Top {n}</option>)}
            </select>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-5 py-2.5 gradient-brand text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 glow-violet"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {/* Quick filters */}
        <div className="flex flex-wrap gap-2 mt-3">
          {QUICK_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setQuery(s)}
              className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-[#1a1a2e] text-slate-500 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-300 border border-transparent hover:border-violet-200 dark:hover:border-violet-500/30 transition-all capitalize"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Meta */}
      {meta && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">Intent:</span>
          <span className="text-xs font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-md">{meta.intent}</span>
          <span className="text-xs text-slate-400">{meta.count} result{meta.count !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse bg-slate-100 dark:bg-[#1e1e30] rounded-xl" />
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((tx, idx) => (
            <TransactionRow
              key={tx.transaction_id || idx}
              tx={tx}
              expanded={expandedId === (tx.transaction_id || idx)}
              onToggle={() => toggleExpand(tx.transaction_id || idx)}
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && hasSearched && results.length === 0 && !error && (
        <div className="text-center py-16">
          <div className="w-12 h-12 bg-slate-100 dark:bg-[#1e1e30] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-sm text-slate-400">No matching transactions found.</p>
        </div>
      )}
    </div>
  );
}
