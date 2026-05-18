import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-700 rounded-xl px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-zinc-700 dark:text-zinc-300">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: ₹{Number(p.value).toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  );
};

export default function MonthlyAreaChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" strokeOpacity={0.5} />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<CustomTooltip />} />
        <Legend formatter={(v) => <span className="text-xs text-zinc-500 capitalize">{v}</span>} />
        <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} fill="url(#incomeGrad)" />
        <Area type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" strokeWidth={2} fill="url(#expenseGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
