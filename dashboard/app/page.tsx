'use client';

import { useEffect, useState } from 'react';
import type { DailyMetric } from '@/app/api/orders/route';
import OrdersChart from '@/components/OrdersChart';

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <p className="mb-1 text-sm font-medium text-gray-400">{label}</p>
      {loading ? (
        <div className="mt-2 h-8 w-32 animate-pulse rounded-lg bg-white/10" />
      ) : (
        <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
      )}
    </div>
  );
}

// ─── Chart Skeleton ──────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="flex h-[380px] items-end gap-3 px-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 animate-pulse rounded-t-md bg-white/10"
          style={{ height: `${30 + Math.random() * 60}%` }}
        />
      ))}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DailyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/orders')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Aggregates
  const totalOrders = data.reduce((s, d) => s + d.count, 0);
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const averageOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₸';

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Orders Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Real-time analytics from your RetailCRM data.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-900/20 p-4 text-sm text-red-400">
            ⚠️ Failed to load data: {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            label="Total Orders"
            value={loading ? '' : String(totalOrders)}
            loading={loading}
          />
          <KpiCard
            label="Total Revenue"
            value={loading ? '' : fmt(totalRevenue)}
            loading={loading}
          />
          <KpiCard
            label="Average Order"
            value={loading ? '' : fmt(averageOrder)}
            loading={loading}
          />
        </div>

        {/* Chart */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">
              Orders &amp; Revenue by Day
            </h2>
            <p className="text-sm text-gray-400">
              Bar = order count (left axis) · Line = revenue in ₸ (right axis)
            </p>
          </div>
          {loading ? <ChartSkeleton /> : <OrdersChart data={data} />}
        </div>

      </div>
    </main>
  );
}
