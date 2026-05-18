import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useChatStore from '../store/useChatStore';
import { aiService } from '../services/api';

const SUGGESTIONS = [
  'How much did I spend last month?',
  'What are my top spending categories?',
  'Show my subscription charges',
  'Any unusual spending this month?',
  'Compare this month vs last month',
  'What did I spend on food?',
];

const ROUTE_BADGE = {
  analytics: { label: 'Analytics Engine', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  retrieval: { label: 'Retrieval',         cls: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
  rag:       { label: 'RAG + LLM',         cls: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
};

// ---------------------------------------------------------------------------
// Source row
// ---------------------------------------------------------------------------
function SourceRow({ tx }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-[#1e1e30] last:border-0">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate capitalize">
          {(tx.normalized_merchant || tx.receiver || '').replace(/_/g, ' ')}
        </p>
        <p className="text-[10px] text-slate-400">{tx.date} · {tx.category}</p>
      </div>
      <p className={`text-xs font-bold ml-3 shrink-0 ${tx.transaction_type === 'credit' ? 'text-emerald-500' : 'text-red-400'}`}>
        {tx.transaction_type === 'credit' ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analytics data block
// ---------------------------------------------------------------------------
function AnalyticsBlock({ data, intent }) {
  if (!data) return null;

  if (intent === 'sum_expenses' && data.total != null) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[['Total', `₹${Number(data.total).toLocaleString('en-IN')}`], ['Count', data.count]].map(([l, v]) => (
          <div key={l} className="p-3 bg-slate-50 dark:bg-[#1a1a2e] rounded-xl text-center border border-slate-100 dark:border-[#1e1e30]">
            <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">{l}</p>
            <p className="text-base font-bold text-slate-900 dark:text-white">{v}</p>
          </div>
        ))}
      </div>
    );
  }

  if (intent === 'cashflow' && data.income != null) {
    return (
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[['Income', data.income, 'text-emerald-500'], ['Expense', data.expense, 'text-red-400'], ['Net', data.net, data.net >= 0 ? 'text-emerald-500' : 'text-red-400']].map(([l, v, c]) => (
          <div key={l} className="p-2 bg-slate-50 dark:bg-[#1a1a2e] rounded-xl text-center border border-slate-100 dark:border-[#1e1e30]">
            <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">{l}</p>
            <p className={`text-sm font-bold ${c}`}>₹{Number(v).toLocaleString('en-IN')}</p>
          </div>
        ))}
      </div>
    );
  }

  if (intent === 'compare_periods' && data.period_a) {
    const dir = data.direction;
    const pct = data.pct_change;
    return (
      <div className="mt-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-slate-50 dark:bg-[#1a1a2e] rounded-xl text-center border border-slate-100 dark:border-[#1e1e30]">
            <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Previous Period</p>
            <p className="text-base font-bold text-slate-900 dark:text-white">₹{Number(data.period_a.total).toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{data.period_a.count} txns</p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-[#1a1a2e] rounded-xl text-center border border-slate-100 dark:border-[#1e1e30]">
            <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Current Period</p>
            <p className="text-base font-bold text-slate-900 dark:text-white">₹{Number(data.period_b.total).toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{data.period_b.count} txns</p>
          </div>
        </div>
        <div className={`p-2 rounded-xl text-center text-sm font-bold border ${
          dir === 'increase'
            ? 'bg-red-500/5 border-red-500/20 text-red-400'
            : dir === 'decrease'
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
            : 'bg-slate-50 dark:bg-[#1a1a2e] border-slate-100 dark:border-[#1e1e30] text-slate-400'
        }`}>
          {dir === 'increase' ? '▲' : dir === 'decrease' ? '▼' : '—'}
          {pct != null ? ` ${Math.abs(pct)}%` : ''} {dir?.replace('_', ' ')}
          {data.change != null && (
            <span className="text-xs font-normal ml-2 opacity-70">
              (₹{Math.abs(Number(data.change)).toLocaleString('en-IN')})
            </span>
          )}
        </div>
      </div>
    );
  }

  if (intent === 'trend_analysis' && Array.isArray(data)) {
    return (
      <div className="mt-3 space-y-1.5">
        {data.map((row) => (
          <div key={row.month} className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-[#1a1a2e] rounded-lg border border-slate-100 dark:border-[#1e1e30]">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{row.month}</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">₹{Number(row.total).toLocaleString('en-IN')}</span>
          </div>
        ))}
      </div>
    );
  }

  if ((intent === 'subscription_check') && Array.isArray(data)) {
    if (data.length === 0) return <p className="mt-2 text-xs text-slate-400 italic">No recurring charges detected.</p>;
    return (
      <div className="mt-3 space-y-1.5">
        {data.map((row) => (
          <div key={row.merchant} className="flex items-center justify-between px-3 py-2 bg-violet-500/5 rounded-lg border border-violet-500/15">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 capitalize">{row.merchant.replace(/_/g, ' ')}</span>
            <span className="text-xs font-bold text-violet-500">₹{Number(row.avg_amount).toLocaleString('en-IN')}/mo</span>
          </div>
        ))}
      </div>
    );
  }

  if (intent === 'anomaly_check' && Array.isArray(data)) {
    if (data.length === 0) return <p className="mt-2 text-xs text-slate-400 italic">No unusual spending detected.</p>;
    return (
      <div className="mt-3 space-y-1.5">
        {data.slice(0, 5).map((row) => (
          <div key={row.transaction_id} className="flex items-center justify-between px-3 py-2 bg-red-500/5 rounded-lg border border-red-500/15">
            <div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 capitalize">{(row.normalized_merchant || row.receiver || '').replace(/_/g, ' ')}</span>
              <p className="text-[10px] text-slate-400">{row.date} · z={row.z_score}</p>
            </div>
            <span className="text-xs font-bold text-red-400">₹{Number(row.amount).toLocaleString('en-IN')}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------
function MessageBubble({ msg }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);

  if (msg.role === 'user') {
    return (
      <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="flex justify-end">
        <div className="max-w-[75%] px-4 py-2.5 gradient-brand text-white rounded-2xl rounded-tr-sm text-sm leading-relaxed shadow-sm glow-violet">
          {msg.content}
        </div>
      </motion.div>
    );
  }

  // Loading
  if (msg.isLoading) {
    return (
      <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3">
        <div className="w-7 h-7 rounded-xl gradient-brand flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">AI</div>
        <div className="px-4 py-3 bg-white dark:bg-[#13131f] rounded-2xl rounded-tl-sm border border-slate-200 dark:border-[#1e1e30]">
          <div className="flex items-center gap-2">
            {[0, 0.15, 0.3].map((d) => (
              <motion.div
                key={d}
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 0.7, delay: d }}
                className="w-1.5 h-1.5 rounded-full bg-violet-400"
              />
            ))}
            <span className="text-xs text-slate-400 ml-1">Analyzing transactions...</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Error
  if (msg.error) {
    return (
      <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3">
        <div className="w-7 h-7 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
          <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div className="px-4 py-3 bg-red-500/5 rounded-2xl rounded-tl-sm border border-red-500/20">
          <p className="text-sm text-red-400">{msg.error}</p>
        </div>
      </motion.div>
    );
  }

  const badge = ROUTE_BADGE[msg.route];

  return (
    <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3">
      <div className="w-7 h-7 rounded-xl gradient-brand flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">AI</div>
      <div className="flex-1 max-w-[82%] space-y-2">
        {/* Main bubble */}
        <div className="px-4 py-3.5 bg-white dark:bg-[#13131f] rounded-2xl rounded-tl-sm border border-slate-200 dark:border-[#1e1e30] shadow-sm">
          {/* Badges row */}
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {badge && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${badge.cls}`}>
                {badge.label}
              </span>
            )}
            {msg.provider && !['analytics_engine', 'retrieval_engine'].includes(msg.provider) && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1e1e30] text-slate-500 dark:text-slate-400 uppercase">
                via {msg.provider}
              </span>
            )}
            {msg.source_count > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 uppercase">
                {msg.source_count} sources
              </span>
            )}
          </div>

          {/* Answer text */}
          {msg.content && (
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">{msg.content}</p>
          )}

          {/* Analytics data */}
          <AnalyticsBlock data={msg.data} intent={msg.intent} />

          {/* Grounded note */}
          {msg.source_count > 0 && (
            <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
              <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Generated using {msg.source_count} verified transaction{msg.source_count !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Sources toggle */}
        {msg.sources?.length > 0 && (
          <div>
            <button
              onClick={() => setSourcesOpen((v) => !v)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium flex items-center gap-1.5 transition-colors px-1"
            >
              <svg className={`w-3 h-3 transition-transform ${sourcesOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              {sourcesOpen ? 'Hide' : 'View'} {msg.sources.length} source transaction{msg.sources.length !== 1 ? 's' : ''}
            </button>
            <AnimatePresence>
              {sourcesOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 p-3 bg-white dark:bg-[#13131f] rounded-xl border border-slate-200 dark:border-[#1e1e30]">
                    {msg.sources.map((tx, i) => <SourceRow key={tx.transaction_id || i} tx={tx} />)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Timestamp */}
        <p className="text-[10px] text-slate-300 dark:text-slate-700 px-1">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function ChatPage() {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const { messages, addUserMessage, addLoadingMessage, resolveMessage, setMessageError, addToHistory, clearChat } = useChatStore();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const submit = async (question) => {
    if (!question.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setInput('');
    addUserMessage(question);
    const loadingId = addLoadingMessage();
    try {
      const data = await aiService.ask(question);
      resolveMessage(loadingId, {
        content: data.answer || '',
        data: data.data,
        sources: data.sources || [],
        source_count: data.source_count || 0,
        provider: data.provider,
        route: data.route,
        intent: data.intent,
        confidence: data.confidence,
      });
      addToHistory({ id: loadingId, question, timestamp: new Date().toISOString(), intent: data.intent, route: data.route });
    } catch (err) {
      const msg = err.message || 'Request failed';
      // Token expired — the api client already clears the token and fires auth-change
      // Just show a friendly message
      const isAuthError = msg.toLowerCase().includes('token') || msg.toLowerCase().includes('not valid') || msg.toLowerCase().includes('unauthorized');
      setMessageError(loadingId, isAuthError ? 'Session expired. Please log in again.' : msg);
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center py-12"
          >
            <div className="w-14 h-14 gradient-brand rounded-2xl flex items-center justify-center mb-5 glow-violet">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Ask about your finances</h2>
            <p className="text-sm text-slate-400 mb-8 max-w-sm leading-relaxed">
              Get grounded answers from your actual transaction data — no hallucinations, every answer cites real sources.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="px-4 py-2.5 text-left text-sm bg-white dark:bg-[#13131f] border border-slate-200 dark:border-[#1e1e30] rounded-xl text-slate-600 dark:text-slate-400 hover:border-violet-300 dark:hover:border-violet-500/50 hover:text-slate-900 dark:hover:text-slate-100 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
        {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-3 border-t border-slate-200 dark:border-[#1e1e30]">
        {messages.length > 0 && (
          <div className="flex justify-end mb-2">
            <button onClick={clearChat} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              Clear chat
            </button>
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); submit(input); }} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your transactions..."
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-[#13131f] border border-slate-200 dark:border-[#1e1e30] text-slate-900 dark:text-slate-100 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isSubmitting || !input.trim()}
            className="px-5 py-3 gradient-brand text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0 glow-violet"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
