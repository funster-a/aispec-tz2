'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { DailyMetric } from '@/app/api/orders/route';

interface OrdersChartProps {
  data: DailyMetric[];
}

function formatDateLabel(dateStr: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = new Date(dateStr + 'T00:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  return `${day} ${months[d.getMonth()]}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-gray-900 p-3 shadow-xl text-sm">
      <p className="mb-2 font-semibold text-white">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }} className="leading-6">
          {entry.name === 'Revenue'
            ? `💰 Revenue: ${Number(entry.value).toLocaleString('ru-RU')} ₸`
            : `📦 Orders: ${entry.value}`}
        </p>
      ))}
    </div>
  );
};

export default function OrdersChart({ data }: OrdersChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: formatDateLabel(d.date),
  }));

  return (
    <ResponsiveContainer width="100%" height={380}>
      <ComposedChart data={formatted} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />

        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          dy={8}
        />

        {/* Left Y axis – order count */}
        <YAxis
          yAxisId="left"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          allowDecimals={false}
        />

        {/* Right Y axis – revenue */}
        <YAxis
          yAxisId="right"
          orientation="right"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />

        <Tooltip content={<CustomTooltip />} />

        <Legend
          wrapperStyle={{ paddingTop: '1.5rem', color: '#9ca3af', fontSize: 13 }}
        />

        <Bar
          yAxisId="left"
          dataKey="count"
          name="Orders"
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />

        <Line
          yAxisId="right"
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
