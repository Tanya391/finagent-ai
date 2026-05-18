import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-700 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">{label}</p>
      <p className={val >= 0 ? 'text-emerald-500' : 'text-red-500'}>
        Net: ₹{Number(val).toLocaleString('en-IN')}
      </p>
    </div>
  );
};

export default function NetCashflowLine({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" strokeOpacity={0.5} />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke="#a1a1aa" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="net"
          stroke="#6366f1"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#6366f1' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
