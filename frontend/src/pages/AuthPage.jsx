import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../services/api';
import useAuthStore from '../store/useAuthStore';
import useUIStore from '../store/useUIStore';

// ---------------------------------------------------------------------------
// Password strength meter
// ---------------------------------------------------------------------------
function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const barColors = ['', 'bg-red-500', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-400'];
  const textColors = ['', 'text-red-400', 'text-amber-400', 'text-blue-400', 'text-emerald-400'];

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${i <= score ? barColors[score] : 'bg-slate-200 dark:bg-slate-700'}`}
          />
        ))}
      </div>
      <p className={`text-[11px] font-medium ${textColors[score]}`}>{labels[score]}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared input
// ---------------------------------------------------------------------------
function Field({ label, type = 'text', value, onChange, autoComplete, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 tracking-wide uppercase">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-[#1a1a2e] border border-slate-200 dark:border-[#2a2a42] text-slate-900 dark:text-slate-100 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 dark:focus:border-violet-400 transition-all"
      />
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
function LoginForm({ onSwitch }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setLoggedIn = useAuthStore((s) => s.setLoggedIn);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authService.login({ username, password });
      setLoggedIn(true);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      key="login"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25 }}
      className="w-full"
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Sign in</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Access your financial intelligence dashboard</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-xl">
                {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 gradient-brand text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 glow-violet mt-2"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
        No account?{' '}
        <button onClick={onSwitch} className="text-violet-500 dark:text-violet-400 font-semibold hover:underline">
          Create one
        </button>
      </p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------
function RegisterForm({ onSwitch }) {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authService.register(form);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full text-center py-8"
      >
        <div className="w-12 h-12 gradient-brand rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Account created</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">You can now sign in with your credentials.</p>
        <button
          onClick={onSwitch}
          className="px-6 py-2.5 gradient-brand text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity glow-violet"
        >
          Sign in
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="register"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="w-full"
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Create account</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Start your financial intelligence journey</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Username" value={form.username} onChange={set('username')} autoComplete="username" required />
        <Field label="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
        <Field label="Password" type="password" value={form.password} onChange={set('password')} autoComplete="new-password" required>
          <PasswordStrength password={form.password} />
        </Field>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-xl">
                {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 gradient-brand text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 glow-violet mt-2"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
        Already have an account?{' '}
        <button onClick={onSwitch} className="text-violet-500 dark:text-violet-400 font-semibold hover:underline">
          Sign in
        </button>
      </p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Auth page shell — split panel
// ---------------------------------------------------------------------------
export default function AuthPage() {
  const [showRegister, setShowRegister] = useState(false);
  const { isDarkMode, toggleTheme } = useUIStore();

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0a0a14]">

      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-brand relative overflow-hidden flex-col justify-between p-12">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-cyan-300/20 rounded-full blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-sm">FA</span>
            </div>
            <span className="text-white font-bold text-lg">FinAgent AI</span>
          </div>

          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Financial intelligence,<br />powered by AI
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-sm">
            Query your transactions in plain English. Get grounded, deterministic answers backed by real data — not hallucinations.
          </p>
        </div>

        <div className="relative space-y-3">
          {[
            { label: 'Semantic search', desc: 'Find transactions by meaning, not just keywords' },
            { label: 'Grounded RAG', desc: 'Every answer cites real transaction sources' },
            { label: 'Anomaly detection', desc: 'Spot unusual spending automatically' },
          ].map((f) => (
            <div key={f.label} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{f.label}</p>
                <p className="text-white/60 text-xs">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex justify-between items-center px-8 py-5">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-7 h-7 gradient-brand rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs">FA</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-white text-sm">FinAgent AI</span>
          </div>
          <div className="lg:ml-auto">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1a1a2e] transition-colors"
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
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-8 py-8">
          <div className="w-full max-w-sm">
            <AnimatePresence mode="wait">
              {showRegister
                ? <RegisterForm key="reg" onSwitch={() => setShowRegister(false)} />
                : <LoginForm key="log" onSwitch={() => setShowRegister(true)} />
              }
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
