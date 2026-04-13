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

interface DashboardData {
  metrics: DailyMetric[];
  recent: {
    number: string;
    total: number;
    first_name: string;
    last_name: string;
    status: string;
    created_at: string;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
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
  const metrics = data?.metrics || [];
  const totalOrders = metrics.reduce((s, d) => s + d.count, 0);
  const totalRevenue = metrics.reduce((s, d) => s + d.revenue, 0);
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
          {loading ? <ChartSkeleton /> : <OrdersChart data={data?.metrics || []} />}
        </div>

        {/* Recent Orders List */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Recent Orders
          </h2>
          {loading ? (
            <div className="animate-pulse space-y-4">
               {[...Array(5)].map((_, i) => (
                 <div key={i} className="h-12 rounded-lg bg-white/5 w-full"></div>
               ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="border-b border-white/10 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data?.recent.map((order) => (
                    <tr key={order.number} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-medium text-blue-400">
                        {order.number}
                      </td>
                      <td className="px-4 py-3">
                        {order.first_name} {order.last_name}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(order.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400 border border-blue-500/20">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-white">
                        {Number(order.total).toLocaleString('ru-RU')} ₸
                      </td>
                    </tr>
                  ))}
                  {data?.recent.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                        No orders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
