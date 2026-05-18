import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const COLORS = ['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe','#ede9fe','#f5f3ff','#6366f1','#818cf8','#a5b4fc'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-700 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-zinc-800 dark:text-zinc-200 capitalize mb-1">{label?.replace(/_/g, ' ')}</p>
      <p className="text-indigo-500">₹{Number(payload[0].value).toLocaleString('en-IN')}</p>
    </div>
  );
};

export default function MerchantBarChart({ data = [] }) {
  const formatted = data.map((d) => ({ name: d.merchant, value: d.total }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={formatted} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" strokeOpacity={0.5} />
        <XAxis type="number" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false}
          width={72} tickFormatter={(v) => v?.replace(/_/g, ' ')?.slice(0, 10)} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {formatted.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
