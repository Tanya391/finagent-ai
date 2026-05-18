import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-700 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-zinc-800 dark:text-zinc-200 capitalize">{name?.replace(/_/g, ' ')}</p>
      <p className="text-zinc-500 dark:text-zinc-400">₹{Number(value).toLocaleString('en-IN')}</p>
    </div>
  );
};

export default function CategoryPieChart({ data = [] }) {
  const formatted = data.map((d) => ({ name: d.category, value: d.total }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={formatted}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
        >
          {formatted.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span className="text-xs text-zinc-600 dark:text-zinc-400 capitalize">{value.replace(/_/g, ' ')}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
